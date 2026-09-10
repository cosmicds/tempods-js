import { ref, type Ref, watch, computed } from "vue";
import type { Map, GeoJSONSource, LayerSpecification } from "maplibre-gl";
import { EsriFeatureLayer } from "@/esri/services/FeatureServer";
import { useMaplibreLayerVisibility } from "../../composables/useMaplibreLayerVisibility";

export type FeatureLayerStatus = "idle" | "loading" | "zoom-in" | "ready";

export interface UseEsriFeatureLayerOptions {
  sourceId: string;
  layers: LayerSpecification[]; // full layer style spec. ordered by bottom to top
  outFields: string[];
  where: string;
  attribution?: string;
  /** Fetch features for the visible viewport on each moveend (for very large layers). */
  viewportLoading?: boolean;
  /** Minimum zoom before viewport fetches fire. */
  minZoom?: number;
  /** Fields used to deduplicate features accumulated across viewport fetches. */
  idFields?: string[];
}

export function useEsriFeatureLayer(featureServiceUrl: string, layerIndex: number, options: UseEsriFeatureLayerOptions) {
  const {
    sourceId,
    layers,
    outFields,
    where,
    attribution,
    viewportLoading = false,
    minZoom = 0,
    idFields = [],
  } = options;
  
  const service = new EsriFeatureLayer(featureServiceUrl, layerIndex);
  // const layerUrl = service.serviceUrl;
  
  const primaryLayerId = layers[0]?.id ?? sourceId;
  const visibility: globalThis.Map<string, Ref<boolean>> = new globalThis.Map();
  const anyVisible = computed(() => {
    return Array.from(visibility.values()).some(v => v.value); // false if empty
  });
  let unwatch: ReturnType<typeof watch> | undefined;
  const connections = ref<string[]>([]);

  const loading: Ref<boolean> = ref(false);
  const error: Ref<Error | null> = ref(null);
  const status: Ref<FeatureLayerStatus> = ref("idle");

  let mapRef: Map | null = null;
  let moveEndHandler: (() => void) | null = null;
  let fetchController: AbortController | null = null;
  const loadedFeatures = new globalThis.Map<string, GeoJSON.Feature>();

  function getSource(): GeoJSONSource | undefined {
    return mapRef?.getSource(sourceId) as GeoJSONSource | undefined;
  }

  function featureKey(f: GeoJSON.Feature): string {
    return idFields.map(k => f.properties?.[k] ?? "").join("|");
  }

  async function loadViewport() {
    if (!mapRef) return;

    if (mapRef.getZoom() < minZoom) {
      status.value = "zoom-in";
      loadedFeatures.clear();
      getSource()?.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    // if it is not visible, do nothing
    if (!anyVisible.value) {
      status.value = 'idle';
      return;
    }

    if (fetchController) fetchController.abort();
    fetchController = new AbortController();

    status.value = "loading";
    loading.value = true;
    error.value = null;

    try {
      const b = mapRef.getBounds();
      const bounds: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      const fc = (await service.fetchFeaturesInBounds(outFields, where, bounds))!;

      if (fetchController.signal.aborted) return;

      for (const f of fc.features) {
        loadedFeatures.set(featureKey(f), f);
      }
      getSource()?.setData({ type: "FeatureCollection", features: Array.from(loadedFeatures.values()) });
      status.value = "ready";
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      error.value = err instanceof Error ? err : new Error(`${err}`);
      console.error(`[${primaryLayerId}] Failed to load features`, err);
      status.value = "ready";
    } finally {
      loading.value = false;
    }
  }

  async function loadAll() {
    if (!mapRef) return;
    status.value = "loading";
    loading.value = true;
    error.value = null;
    
    // don't care if it's visible or not, just get the data

    try {
      const fc = (await service.fetchAllFeatures(outFields, where))!;
      getSource()?.setData(fc);
      status.value = "ready";
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(`${err}`);
      console.error(`[${primaryLayerId}] Failed to load features`, err);
      status.value = "ready";
    } finally {
      loading.value = false;
    }
  }

  function addToMap(map: Map) {
    mapRef = map;
    error.value = null;
    
    
    // add the source with empty data to start
    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      ...(attribution ? { attribution } : {}),
    });
    
    // so that we can add the layers
    for (const layer of layers) {
      map.addLayer(layer);
      const v = useMaplibreLayerVisibility(map, layer.id);
      visibility.set(layer.id, v.visible);
      connections.value = [...connections.value, layer.id];
    }
    
    // and then load the data
    if (viewportLoading) {
      moveEndHandler = () => loadViewport();
      map.on("moveend", moveEndHandler);
      // https://vuejs.org/guide/essentials/watchers.html#stopping-a-watcher
      // i don't know if this is considered "snychronous", but it doesn't hurt to manually unwatch
      unwatch = watch(anyVisible, moveEndHandler);
      loadViewport();
    } else {
      loadAll();
    }
  }

  function removeFromMap(map: Map) {
    if (moveEndHandler) { map.off("moveend", moveEndHandler); moveEndHandler = null; }
    if (fetchController) { fetchController.abort(); fetchController = null; }
    try {
      for (const layer of layers) {
        if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      }
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch (err) {
      console.error(`[${primaryLayerId}] Failed to remove layer`, err);
    }
    mapRef = null;
    loadedFeatures.clear();
    status.value = "idle";
    visibility.clear();
    if (unwatch) {
      // https://github.com/vuejs/core/blob/c0606e91798c8dca4f33d101e1dd836d672592c1/packages/reactivity/src/watch.ts#L326
      unwatch(); // also has separate unwatch.pause(), .resume(), .stop(). .stop is just unwatch itself
    }
  }
  

  return { addToMap, removeFromMap, loading, error, status, layerId: primaryLayerId, connections };
}
