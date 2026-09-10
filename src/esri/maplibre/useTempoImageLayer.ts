import { ref, watch, Ref, MaybeRef, toRef, nextTick, computed, shallowRef, type ComputedRef } from 'vue';
import { renderingRule, stretches, colorramps, rgbcolorramps, RenderingRuleOptions, ColorRamps } from '../ImageLayerConfig';
import { type Map, type MapSourceDataEvent } from 'maplibre-gl';
import { validate as uuidValidate } from "uuid";

import { ImageService } from '@/esri/frontier_ImageServiceLayer/ImageService';
import { useEsriTimesteps } from '@/esri/useEsriTimesteps';
import { MoleculeType } from '../utils';
import { useTempoStore } from '@/stores/app';
import { serviceStatus } from '@/datasets/layerStatus';
import type { LayerStatus } from '@/types';


export interface UseEsriTempoLayer {
  esriImageSource: Ref<maplibregl.RasterTileSource | null>;
  opacity: Ref<number>;
  noEsriData: Ref<boolean>;
  loadingEsriTimeSteps: Ref<boolean>;
  esriTimesteps: Ref<number[]>;
  updateEsriOpacity: (value?: number | null | undefined) => void;
  updateEsriTimeRange: () => void;
  addEsriSource: (map: Map) => void;
  removeEsriSource: () => void;
  setVisibility: (visible: boolean) => void;
  renderOptions: Ref<RenderingRuleOptions>;
  serviceReady: Ref<boolean[]>
  status: ComputedRef<LayerStatus>;
}

export interface UseEsriTempoLayerOptions {
  initialMolecule: MaybeRef<MoleculeType>;
  timestamp: Ref<number | null>;
  opacity: MaybeRef<number>;
  fetchOnMount?: boolean;
  layerName?: string;
  initVisible?: boolean;
  initRGB?: boolean;
}

export function useTempoLayer(esriLayerOptions: UseEsriTempoLayerOptions): UseEsriTempoLayer {

  const esriLayerId = esriLayerOptions.layerName ?? 'esri-source';
  const esriImageSource = ref<maplibregl.RasterTileSource | null>(null);
  const map = shallowRef<Map | null>(null);
  const molecule = toRef(esriLayerOptions.initialMolecule);
  const store = useTempoStore();

  const { esriTimesteps } = useEsriTimesteps(molecule, esriLayerOptions.fetchOnMount);
  const tds = computed(() => store.getTempoDataService(molecule.value));
  const variable = computed(() => tds.value.getVariable());

  const timestamp = esriLayerOptions.timestamp;

  const opacityRef = toRef(esriLayerOptions.opacity);
  const noEsriData = ref(false);
  const loadingEsriTimeSteps = ref(false);
  const initRGB = esriLayerOptions.initRGB ?? false;
  const ramps = initRGB ? rgbcolorramps : colorramps;
  const renderOptions = ref<RenderingRuleOptions>({
    range: stretches[variable.value],
    colormap: ramps[variable.value],
  });
  
  const serviceReady = ref<boolean[]>([]);
  tds.value.serviceStatusReady().then((ready) => {
    const servicesReady: boolean[] = [];
    for (const kv of ready) {
      servicesReady.push(kv[1]);
    }
    serviceReady.value = servicesReady;
  });

  const status = computed<LayerStatus>(() => serviceStatus(esriLayerId, serviceReady.value));

  const options = computed(() => {
    return  {
      'format': 'jpgpng',
      'pixelType': 'U8',
      'size': '256,256',
      'transparent': true,
      'bboxSR': 3857,
      'imageSR': 3857,
      'bbox': '{bbox-epsg-3857}',
      'interpolation': 'RSP_NearestNeighbor',
      'renderingRule': renderingRule(renderOptions.value.range, renderOptions.value.colormap),
    };
  });
  // const _esriImageOptions = Object.entries(options).map(([key, value]) => `${key}=${value}`).join('&');
  
  function addLayer(map: Map | null | undefined) {

    if (map && !map.getLayer(esriLayerId)) {
      map.addLayer({
        id: esriLayerId,
        type: 'raster',
        source: esriLayerId,
        layout: {
          visibility: esriLayerOptions.initVisible === false ? 'none' : 'visible',
        },
        paint: {
          'raster-resampling': 'nearest',
          'raster-opacity': opacityRef.value ?? 0.8,
        },
      });
      let index = -1;
      for (const [idx, layer] of Object.entries(map.getStyle().layers)) {
        if (uuidValidate(layer.id)) {
          index = Number(idx) - 1;
        }
      }
      if (index >= 0) {
        map.moveLayer(esriLayerId, map.getStyle().layers[index].id);
      }
    }
  }
  
  function removeLayer(map: Map | null | undefined) {
    if (map && map.getLayer(esriLayerId)) {
      map.removeLayer(esriLayerId);
    }
  }
  
  const dynamicMapService = ref<ImageService | null>(null);
  
  function onSourceLoad(e: MapSourceDataEvent) {
    // console.log(`sourcedate event for ${esriLayerId}: `);
    if (e.sourceId === esriLayerId && e.isSourceLoaded && map.value?.getSource(esriLayerId)) {
      console.log(`[${esriLayerId}] ESRI source loaded with time`, timestamp.value ? new Date(timestamp.value ) : null);
      esriImageSource.value = map.value?.getSource(esriLayerId) as maplibregl.RasterTileSource;
      updateEsriOpacity();
      updateEsriTimeRange();
      map.value?.off('sourcedata', onSourceLoad);
    } 
  }
  
  function setVisibility(visible: boolean) {
    if (map.value && map.value.getLayer(esriLayerId)) {
      map.value.setLayoutProperty(
        esriLayerId, 
        'visibility', 
        visible ? 'visible' : 'none'
      );
    }
  }
  
  function createImageService(map: Map, url: string, options) {
    return new ImageService(
      esriLayerId,
      map,
      {
        url: url,
        ...options
      },
      {
        tileSize: 256,
      }
    );
    
  }

  function addEsriSource(mMap: Map) {
    if (!mMap) return;
    map.value = mMap;

    const svc = tds.value;
    const url = timestamp.value !== null
      ? svc.selectBaseUrlForTimestamp(timestamp.value)
      : svc.baseUrlArray[svc.baseUrlArray.length - 1];

    dynamicMapService.value = createImageService(mMap, url, options.value);

    addLayer(mMap);
    // this event will run until the source is loaded
    console.log(`[${esriLayerId}] Adding ESRI source to map`);
    mMap.on('sourcedata', onSourceLoad);
  }
  
  function removeEsriSource() {
    if (map.value) {
      if (map.value.getLayer(esriLayerId)) {
        map.value.removeLayer(esriLayerId);
      }
      if (map.value.getSource(esriLayerId)) {
        map.value.removeSource(esriLayerId);
      }
    }
  }
  
  function hasEsriSource() {
    return map.value?.getSource(esriLayerId) !== undefined;
  }

  function setDynamicMapServiceDate(nearest: number) {
    if (!dynamicMapService.value) {
      console.error(`[${esriLayerId}] Dynamic Map Service is not initialized`);
      return;
    }

    const svc = tds.value;
    const url = svc.selectBaseUrlForTimestamp(nearest);

    const currentUrl = dynamicMapService.value.esriServiceOptions.url;
    if (currentUrl !== url) {
      console.log(`[${esriLayerId}] Switching TEMPO ESRI version to ${url}`);
      dynamicMapService.value.esriServiceOptions.url = url;
      dynamicMapService.value.setRenderingRule(renderingRule(renderOptions.value.range, renderOptions.value.colormap));
    }

    dynamicMapService.value.setDate(new Date(nearest), new Date(nearest * 2));
  }
  
  function updateEsriTimeRange() {
    if (!map.value) return;
    if (timestamp.value === null) return;
    const time = timestamp.value;

    const nearest = esriTimesteps.value.length > 0 
      ? esriTimesteps.value.reduce((a, b) => Math.abs(b - time) < Math.abs(a - time) ? b : a)
      : time - 1000 * 60 * 15; 
    noEsriData.value = Math.abs((nearest - time) / (1000 * 60)) > 60;
    // noEsriData.value = nearest > 1752595200000; // Example condition (July 15, 2025 12pm ET for testing)
    if (noEsriData.value) {
      console.error(`[${esriLayerId}] No ESRI data available for the selected time`);
    }

    if (!dynamicMapService.value) {
      console.error(`[${esriLayerId}] Dynamic Map Service is not initialized`);
      return;
    }

    setDynamicMapServiceDate(nearest);
  }

  watch(esriTimesteps, _timesteps => {
    nextTick(updateEsriTimeRange);
  });


  watch(timestamp, (_value) => {
    console.log(`[${esriLayerId}] esri imageset timestamp set to `, _value ? new Date(_value) : null);
    if ( hasEsriSource() ) {
      updateEsriTimeRange();
    } else {
      console.error(`[${esriLayerId}] ESRI source not yet available`);
    }
  });
  
  
  function updateEsriOpacity(value: number | null | undefined = undefined) {
    if (map.value) {
      map.value.setPaintProperty(esriLayerId, 'raster-opacity', value ?? opacityRef.value ?? 0.8);
    }
  }

  watch(molecule, (_newMol: MoleculeType) => {
    // refresh() already handled by useEsriTimesteps watch
    const svc = tds.value;
    const url = timestamp.value !== null
      ? svc.selectBaseUrlForTimestamp(timestamp.value)
      : svc.baseUrlArray[svc.baseUrlArray.length - 1];
    
    if (dynamicMapService.value) {
      dynamicMapService.value.esriServiceOptions.url = url;
      dynamicMapService.value.setRenderingRule(renderingRule(renderOptions.value.range, renderOptions.value.colormap));
    }
  });
  
  function updateStretch(vmin: number, vmax: number) {
    if (dynamicMapService.value) {
      dynamicMapService.value.setRenderingRule(renderingRule([vmin, vmax], renderOptions.value.colormap));
    }
  }
  
  function updateColormap(colormap: ColorRamps) {
    if (dynamicMapService.value) {
      dynamicMapService.value.setRenderingRule(renderingRule(renderOptions.value.range, colormap));
    }
  }
  
  watch(() => renderOptions.value.range, (newRange) => {
    console.log(`[${esriLayerId}] Range changed to `, newRange);
    updateStretch(newRange[0], newRange[1]);
  });
  watch(() => renderOptions.value.colormap, (newColormap) => {
    console.log(`[${esriLayerId}] Colormap changed to `, newColormap);
    updateColormap(newColormap);
  });
  
  watch(variable, () => {
    renderOptions.value.range = stretches[variable.value];
    renderOptions.value.colormap = colorramps[variable.value];
  });

  watch(opacityRef, (_value: number) => {
    updateEsriOpacity(_value);
  });

  watch(noEsriData, (value: boolean) => {
    if (value) {
      updateEsriOpacity(0);
      removeLayer(map.value);
    } else {
      addLayer(map.value);
    }
  });

  return {
    esriImageSource,
    opacity: opacityRef,
    noEsriData,
    esriTimesteps,
    loadingEsriTimeSteps,
    updateEsriOpacity,
    updateEsriTimeRange,
    addEsriSource,
    removeEsriSource,
    renderOptions,
    setVisibility,
    serviceReady,
    status,
  } as UseEsriTempoLayer;
}
