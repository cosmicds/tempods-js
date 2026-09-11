import { defineStore, type StateTree } from "pinia";
import { computed, ref, watch, toRaw } from "vue";
import { v4 } from "uuid";
import type { Map } from "maplibre-gl";
import { isComputedRef } from "@/utils/vue";
import * as zipson from "zipson";

import type { AggValue, InitMapOptions, LatLngPair, LayerReadiness, LayerStatus, MappingBackends, SelectionType, TimeRange, UnifiedRegion, UserDataset } from "@/types";
import { moleculeServiceConfigs, MoleculeType } from "@/esri/utils";
import { TempoDataService, FetchOptions, summaryError } from "@/esri/services/TempoDataService";
import { useUniqueTimeSelection } from "@/composables/useUniqueTimeSelection";
import { useTimezone, type Timezone } from "@/composables/useTimezone";
import { atleast1d } from "@/utils/atleast1d";
import { formatSingleRange, rangeForSingleDay } from "@/utils/timeRange";

const createTempoStore = (backend: MappingBackends) => defineStore("tempods", () => {
  const debugMode = ref(false);
  const timeRanges = ref<TimeRange[]>([]);
  const regions = ref<UnifiedRegion[]>([]);
  const datasets = ref<UserDataset[]>([]);
  const timestamps = ref<number[]>([]);
  const timestampsLoaded = ref(false);
  const tempoDataServices: Record<MoleculeType, TempoDataService> | object = {};
  const backendRef = ref<MappingBackends>(backend);
  const maxSampleCount = ref(50);
  const sampleErrors = ref<Record<string, string | null>>({});
  const regionsCreatedCount = ref(0);
  const userSelectedCalendarDates: number[] = [];
  const userSelectedTimezones: string[] = [];
  const userSelectedLocations: string[] = [];
  const userSelectedNotableEvents: [string, string][] = [];
  const shareButtonClickedCount = ref(0);
  const playButtonClickedCount = ref(0);
  const timeSliderUsedCount = ref(0);
  const opacitySliderUsedCount = ref(0);

  const maps = ref<Map[]>([]);

  const datasetControlsOpen = ref(false);
  const layerControlsOpen = ref(true);

  const selectionActive = ref<SelectionType>(null);
  const focusRegion = ref<UnifiedRegion | null>(null);
  const regionOpacity = ref(0.7);
  const regionVisibility = ref(true);

  const showFieldOfRegard = ref(false);
  const showRoads = ref(true);
  const showSamplingPreviewMarkers = ref(false);
  
  const showAdvancedLayers = ref(false);
  const showRGBMode = ref(false);

  const globalWarning = ref("");
  const showTourHint = ref(false);

  const showAggregationControls = ref(false);

  const selectedTimezone = ref<Timezone>("US/Eastern");
  const { isDST, timezoneOptions: tzOptions } = useTimezone(selectedTimezone);

  const dateIsDST = computed(() => isDST(singleDateSelected.value));
  const timezoneOptions = computed(() => tzOptions(singleDateSelected.value));
  
  const shownLayers = ref<string[]>([]);
  const layersReady = ref<globalThis.Map<string, LayerReadiness>>(new globalThis.Map<string, LayerReadiness>());

  // probably should be a map of some sort, but for now it is only used with hms-fire layer which is prone to breaking
  const layerAction = ref<{ layerId: string; action: string } | null>(null);

  // This part is still assuming that multiple maps will be temporally linked
  // If/when we want to make that not the case, we'll need to rethink this
  // and some of the consuming components
  const {
    timeIndex,
    timestamp,
    date,
    singleDateSelected,
    maxIndex,
    minIndex,
    uniqueDays,
    uniqueDaysIndex,
    setNearestDate,
    moveBackwardOneDay,
    moveForwardOneDay,
    nearestDateIndex,
    setNearestTime,
  } = useUniqueTimeSelection(timestamps);


  const accentColor = ref("#068ede");
  const accentColor2 = ref("#ffcc33");
  const tempoRed = ref("#b60e32");

  function getTempoDataService(molecule: MoleculeType): TempoDataService {
    if (molecule in tempoDataServices) {
      return tempoDataServices[molecule];
    }
    // get urls for for this molecule
    const configs = moleculeServiceConfigs(molecule);
    const tds = new TempoDataService(configs.map(c => c.url), configs[configs.length - 1].variable);
    tempoDataServices[molecule] = tds;
    return tds;
  }

  function addTimeRange(range: TimeRange) {
    timeRanges.value.push(range);
  }

  function deleteTimeRange(range: TimeRange) {
    const index = timeRanges.value.findIndex(r => r.id === range.id);
    if (index < 0) {
      return;
    }
    timeRanges.value.splice(index, 1);
  }

  watch(singleDateSelected, (_newDate, oldDate) => {
    const oldRange = rangeForSingleDay(oldDate, selectedTimezone.value);
    const displayedDateSelections = datasets.value.filter(sel => {
      const range = sel.timeRange.range;
      return !Array.isArray(range) &&
             range.start === oldRange.start &&
             range.end === oldRange.end;
    });
    if (displayedDateSelections.length === 0) {
      return;
    }
  
    const index = timeRanges.value.findIndex(timeRange => {
      const range = timeRange.range;
      return !Array.isArray(range) &&
             range.start === oldRange.start &&
             range.end === oldRange.end &&
             timeRange.id !== "displayed-day";
    });
    if (index < 0) {
      const formatted = formatSingleRange(oldRange);
      const oldTimeRange: TimeRange = {
        id: v4(),
        name: formatted,
        description: formatted,
        range: oldRange,
        type: 'single'
      };
      timeRanges.value.push(oldTimeRange);
    }
  });


  const zoomScale = 0.5; // for matplibre-gl
  const urlParams = new URLSearchParams(window.location.search);
  const initLat = parseFloat(urlParams.get("lat") || '40.044');
  const initLon = parseFloat(urlParams.get("lon") || '-98.789');
  const initZoom = parseFloat(urlParams.get("zoom") || `${4 * zoomScale}`); // 4 is the default zoom level for the map, multiplied by zoomScale for maplibre
  const initTime = urlParams.get("t");
  const initState = ref<InitMapOptions>({
    loc: [initLat, initLon] as LatLngPair,
    zoom: initZoom,
    t: initTime ? +initTime : null
  });
  
  const homeLat = 40.044;
  const homeLon = -98.789;
  const homeZoom = 4 * zoomScale; // 4 is the default zoom level for the map, multiplied by zoomScale for maplibre
  const homeState = ref({
    loc: [homeLat, homeLon] as LatLngPair,
    zoom: homeZoom,
    t: null as number | null
  });

  watch(timestampsLoaded, (loaded: boolean) => {
    if (loaded) {
      console.log('timestamps loaded');
      if (initState.value.t) {
        let index = uniqueDaysIndex(initState.value.t);
        if (index == -1) {
          return;
        }
        console.log('set the date');
        singleDateSelected.value = uniqueDays.value[index];
        index = nearestDateIndex(new Date(initState.value.t));
        if (index == -1) {
          return;
        }
        timeIndex.value = index;
        // FIXME if needed. if we find the time is not being set, use nextTick
        // this.$nextTick(() => { this.timeIndex = index;});
      }
    }
  });

  watch(timestamps, () => {
    if (uniqueDays.value.length === 0) {
      return;
    }
    singleDateSelected.value = uniqueDays.value[uniqueDays.value.length - 1];
  });

  function addRegion(region: UnifiedRegion) {
    // TODO: Fix the typing here
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    regions.value.push(region);
  }

  function deleteDataset(dataset: UserDataset) {
    const index = datasets.value.findIndex(s => s.id == dataset.id);
    if (index < 0) {
      return;
    }
    datasets.value.splice(index, 1);
  }

  function addDataset(dataset: UserDataset, fetch=true, onProgress?: FetchOptions["onProgress"]) {
    datasets.value.push(dataset);
    if (fetch) {
      fetchDataForDataset(dataset, onProgress);
    }
    return dataset;
  }

  function markDatasetUpdated(dataset: UserDataset) {
    const index = datasets.value.findIndex(ds => ds.id === dataset.id);
    if (index >= 0) {
      datasets.value[index] = { ...dataset };
    }
  }

  function setLayerReady(layerName: string, serviceReady: boolean[], status?: LayerStatus) {
    const next = new globalThis.Map(layersReady.value);
    next.set(layerName, {
      status: status?.status ?? 'ready',
      statusMsg: status?.statusMsg ?? [],
      ready: [...serviceReady],
    });
    layersReady.value = next;
  }

  function doLayerAction(layerId: string, action: string) {
    layerAction.value = { layerId, action };
  }

  function clearLayerReady(layerName: string) {
    if (!layersReady.value.has(layerName)) {
      return;
    }
    const next = new globalThis.Map(layersReady.value);
    next.delete(layerName);
    layersReady.value = next;
  }

  function setRegionName(region: UnifiedRegion, newName: string) {
    if (newName.trim() === '') {
      console.error("Region name cannot be empty.");
      return;
    }
    // eslint-disable-next-line
    // @ts-ignore it is not actually deep
    const existing = (regions.value as UnifiedRegion[]).find(r => r.name === newName && r.id !== region.id);
    if (existing) {
      console.error(`A region with the name "${newName}" already exists.`);
      return;
    }
    region.name = newName;
    console.log(`Renamed ${region.geometryType} region to: ${newName}`);
    
    // check for any datasets using this region and update the region name
    datasets.value.forEach(ds => {
      if (ds.region.id === region.id) {
        ds.region.name = region.name;
      }
    });
  }
  
  function setRegionColor(region: UnifiedRegion, newColor: string) {
    if (newColor.trim() === '') {
      console.error("Region color cannot be empty.");
      return;
    }
    region.color = newColor;
    console.log(`Changed ${region.geometryType} region color to: ${newColor}`);
    if (maps.value.length > 0) {
      const map = maps.value[0];

      // this is setup so that the region id is the same as the id of the main filled layer
      if (map.getLayer(region.id)) {
        if (region.geometryType === 'rectangle') {
          map.setPaintProperty(region.id, "fill-color", newColor);

        } else if (region.geometryType === 'point') {
          map.setPaintProperty(region.id, "circle-color", newColor);

        }
      }
    }
    
    // check for any datasets using this region and update the region color
    datasets.value.forEach(ds => {
      if (ds.region.id === region.id) {
        ds.region.color = region.color;
      }
    });
  }

  function setTimeRangeName(timeRange: TimeRange, newName: string) {
    if (newName.trim() === '') {
      console.error("Time range name cannot be empty.");
      return;
    }
    const existing = timeRanges.value.find(tr => tr.name === newName && tr.id !== timeRange.id);
    if (existing) {
      console.error(`A time range with the name "${newName}" already exists.`);
      return;
    }
    timeRange.name = newName;
    console.log(`Renamed time range to: ${newName}`);
    
    // Update the name in any datasets using this time range
    datasets.value.forEach(ds => {
      if (ds.timeRange.id === timeRange.id) {
        ds.timeRange.name = timeRange.name;
      }
    });
  }

  async function fetchDataForDataset(dataset: UserDataset, onProgress?: FetchOptions["onProgress"]) {
    dataset.loading = true;

    // loadingSamples.value = sel.id;
    sampleErrors.value[dataset.id] = null;

    const timeRanges = atleast1d(dataset.timeRange.range);
    
    try {
      const tds = getTempoDataService(dataset.molecule);
      // Use this service's own timesteps rather than the app-wide timestamps.value. Not every
      // tempo molecule covers the whole timeline (o3trop is V04-only), and we don't want to send bogus requests
      tds.setAvailableTimestamps(await tds.getMergedTimesteps());
      const data = await tds.fetchTimeseriesData(dataset.region.geometryInfo, timeRanges, {onProgress});
      dataset.samples = data.values;
      dataset.errors = data.errors;
      dataset.summary = data.summary;
      // fetchSamples catches per-range failures, so we only get the summary. 
      // something to fix for the future perhaps
      sampleErrors.value[dataset.id] = summaryError(data.summary);
      // loadingSamples.value = "finished";
      console.log(`Fetched data for ${timeRanges.length} time range(s)`);
    } catch (error) {
      sampleErrors.value[dataset.id] = error instanceof Error ? error.message : String(error);
      // loadingSamples.value = "error";
    }
  
    dataset.loading = false;
  
    markDatasetUpdated(dataset);
  }

  async function fetchCenterPointDataForDataset(dataset: UserDataset) {
    sampleErrors.value[dataset.id] = null;

    const tds = getTempoDataService(dataset.molecule);
    const timeRanges = atleast1d(dataset.timeRange.range);

    
    try {
      tds.setAvailableTimestamps(await tds.getMergedTimesteps());
      const data = await tds.fetchCenterPointData(
        dataset.region.geometryInfo,
        timeRanges,
        { sampleCount: maxSampleCount.value },
      );
      if (data) {
        dataset.samples = data.values;
        dataset.locations = data.locations;
        dataset.summary = data.summary;
        sampleErrors.value[dataset.id] = summaryError(data.summary);
        console.log(`Fetched center point data for ${timeRanges.length} time range(s)`);
      }
    } catch (error) {
      sampleErrors.value[dataset.id] = error instanceof Error ? error.message : String(error);
    }
  }

  function datasetHasSamples(dataset: UserDataset): boolean {
    return (dataset.samples !== undefined) && Object.keys(dataset.samples).length > 0;
  }

  function regionHasDatasets(region: UnifiedRegion): boolean {
    const sel = datasets.value.find(ds => ds.region.id === region.id);
    return sel !== undefined;
  }

  function deleteRegion(region: UnifiedRegion) {
    const index = regions.value.findIndex(r => r.id === region.id);
    if (index < 0) {
      return;
    }
    regions.value.splice(index, 1);
  }

  function registerMap(map: Map) {
    maps.value.push(map);
  }

  function deregisterMap(map: Map) {
    const index = maps.value.findIndex(m => m === map);
    if (index > -1) {
      maps.value.splice(index);
    }
  }

  function reset() {
    regions.value = [];
    regionsCreatedCount.value = 0;
    timeRanges.value = [];
    datasets.value = [];
  }

  return {
    debugMode,
    globalWarning,
    showTourHint,

    accentColor,
    accentColor2,
    tempoRed,

    selectedTimezone,
    dateIsDST,
    timezoneOptions,

    selectionActive,
    focusRegion,
    regionOpacity,
    regionVisibility,

    showFieldOfRegard,
    showRoads,
    showSamplingPreviewMarkers,
    showAdvancedLayers,
    showRGBMode,

    showAggregationControls,

    datasetControlsOpen,
    layerControlsOpen,

    homeState,
    initState,

    maps,
    registerMap,
    deregisterMap,

    regions,
    regionsCreatedCount,
    timeRanges,
    backend: backendRef,
    maxSampleCount,
    getTempoDataService,
    tempoDataServices,
    datasets,
    timestamps,
    timestampsLoaded,

    addTimeRange,
    addRegion,
    addDataset,
    fetchDataForDataset,
    fetchCenterPointDataForDataset,
    sampleErrors,
    markDatasetUpdated,
    datasetHasSamples,
    regionHasDatasets,
    setRegionName,
    setRegionColor,
    setTimeRangeName,

    deleteTimeRange,
    deleteRegion,
    deleteDataset,

    userSelectedLocations,
    userSelectedTimezones,
    userSelectedCalendarDates,
    userSelectedNotableEvents,
    shareButtonClickedCount,
    playButtonClickedCount,
    timeSliderUsedCount,
    opacitySliderUsedCount,

    timeIndex,
    timestamp,
    date,
    singleDateSelected,
    maxIndex,
    minIndex,
    uniqueDays,
    uniqueDaysIndex,
    setNearestDate,
    moveBackwardOneDay,
    moveForwardOneDay,
    nearestDateIndex,
    setNearestTime,
    
    shownLayers,
    layersReady,
    setLayerReady,
    clearLayerReady,
    layerAction,
    doLayerAction,

    reset,
  };
});

export const useTempoStore = createTempoStore("maplibre");

export type TempoStore = ReturnType<typeof useTempoStore>;

function isDateLikeString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

export function deserializeTempoStore(value: string, compressed: boolean): StateTree {
  if (!value) {
    return {};
  }
  const parser = compressed ? zipson.parse : JSON.parse;
  const parsed = parser(value);
  parsed.singleDateSelected = new Date(parsed.singleDateSelected);
  for (const dataset of parsed.datasets) {
    const samples = dataset.samples as Record<number, AggValue>;
    if (samples) {
      for (const entry of Object.values(samples)) {
        entry.date = new Date(entry.date);
      }
    }

    // Convert dates in plotlyDatasets if they exist
    if (dataset.plotlyDatasets) {
      for (const plotlyDataset of dataset.plotlyDatasets) {
        if (plotlyDataset.datasetOptions?.customdata) {
          plotlyDataset.datasetOptions.customdata = plotlyDataset.datasetOptions.customdata.map(d => d ? new Date(d) : d);
        }
        
        // Convert strings in x array if they are dates
        if (plotlyDataset.x?.[0] && typeof plotlyDataset.x[0] === 'string' && isDateLikeString(plotlyDataset.x[0])) {
          plotlyDataset.x = plotlyDataset.x.map(d => d ? new Date(d) : d);
        }
      }
    }
  }
  return parsed;
}

const OMIT = new Set(["debugMode", "selectionActive", "maps", "layersReady", "globalWarning", "layerAction", "showTourHint"]);
export function serializeTempoStore(store: TempoStore, compress: boolean): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const state: Record<string, any> = {};
  for (const [key, value] of Object.entries(store.$state)) {
    if (OMIT.has(key) || isComputedRef(value)) {
      continue;
    }
    state[key] = toRaw(value);
  }
  state.regions = state.regions.map(r => {
    const s = { ...r };
    delete s.layer;
    return s;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializer = compress ? zipson.stringify : (obj: any) => JSON.stringify(obj, null, 2);
  const stringified = serializer(state);
  return stringified;
}

export function postDeserializeTempoStore(store: TempoStore) {
  for (const dataset of store.datasets) {
    if (dataset.loading) {
      store.fetchDataForDataset(dataset);
    }
  }
}

export function updateStoreFromJSON(store: TempoStore, json: string, compressed: boolean): boolean {
  try {
    const state = deserializeTempoStore(json, compressed);
    if (store.timestampsLoaded) {
      delete state.timestamps;
    }
    store.$patch(state);
    postDeserializeTempoStore(store);
    return true;
  } catch (error) {
    return false;
  }
}
