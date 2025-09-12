import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { v4 } from "uuid";

import type { InitMapOptions, LatLngPair, MappingBackends, SelectionType, TimeRange, UnifiedRegion, UserDataset } from "@/types";
import { ESRI_URLS, MoleculeType } from "@/esri/utils";
import { TempoDataService } from "@/esri/services/TempoDataService";
import { useUniqueTimeSelection } from "@/composables/useUniqueTimeSelection";
import { useTimezone, type Timezone } from "@/composables/useTimezone";
import { atleast1d } from "@/utils/atleast1d";
import { formatSingleRange, rangeForSingleDay } from "@/utils/timeRange";
import { colorbarOptions } from "@/esri/ImageLayerConfig";


const createTempoStore = <T extends MappingBackends>(backend: MappingBackends) => defineStore("tempods", () => {
  type UnifiedRegionType = UnifiedRegion<T>;

  const timeRanges = ref<TimeRange[]>([]);
  const regions = ref<UnifiedRegionType[]>([]);
  const datasets = ref<UserDataset[]>([]);
  const timestamps = ref<number[]>([]);
  const timestampsLoaded = ref(false);
  const tempoDataServices: Record<MoleculeType, TempoDataService> = {};
  const backendRef = ref<MappingBackends>(backend);
  const maxSampleCount = ref(50);
  const sampleErrors = ref<Record<string, string | null>>({});
  const molecule = ref<MoleculeType>('no2');
  const regionsCreatedCount = ref(0);
  const userSelectedCalendarDates: number[] = [];
  const userSelectedTimezones: string[] = [];
  const userSelectedLocations: string[] = [];
  const userSelectedNotableEvents: [string, string][] = [];
  const shareButtonClickedCount = ref(0);
  const playButtonClickedCount = ref(0);
  const timeSliderUsedCount = ref(0);
  const opacitySliderUsedCount = ref(0);

  const selectionActive = ref<SelectionType>(null);
  const lastFocusedRegion = ref<UnifiedRegionType | null>(null);

  const colorMap = computed(() => colorbarOptions[molecule.value].colormap.toLowerCase());

  const selectedTimezone = ref<Timezone>("US/Eastern");
  const { isDST, timezoneOptions: tzOptions } = useTimezone(selectedTimezone);

  const dateIsDST = computed(() => isDST(singleDateSelected.value));
  const timezoneOptions = computed(() => tzOptions(singleDateSelected.value));
     
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
    nearestDateIndex
  } = useUniqueTimeSelection(timestamps);

  const displayedDayTimeRange = computed<TimeRange>(() => {
    const range = rangeForSingleDay(singleDateSelected.value, selectedTimezone.value);
    return {
      id: 'displayed-day',
      name: 'Displayed Day',
      description: `Displayed Day (${new Date(range.start).toLocaleDateString()})`,
      range,
      type: 'singledate'
    };
  });

  const accentColor = ref("#068ede");
  const accentColor2 = ref("#ffcc33");


  function getTempoDataService(molecule: MoleculeType) {
    if (molecule in tempoDataServices) {
      return tempoDataServices[molecule];
    }
    const url = ESRI_URLS[molecule];
    const service = new TempoDataService(url.url, url.variable);
    tempoDataServices[molecule] = service;
    return service;
  }

  const currentTempoDataService = computed(() => getTempoDataService(molecule.value));

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
        type: 'singledate'
      };
      timeRanges.value.push(oldTimeRange);
    }
  });

  watch(displayedDayTimeRange, (val) => {
    if (!timeRanges.value.length) {
      timeRanges.value.push(val);
    } else {
      timeRanges.value[0] = val;
    }
  }, { immediate: true });

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

  function addRegion(region: UnifiedRegionType) {
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

  function addDataset(dataset: UserDataset, fetch=true) {
    datasets.value.push(dataset);
    if (fetch) {
      fetchDataForDataset(dataset);
    }
    return dataset;
  }

  function markDatasetUpdated(dataset: UserDataset) {
    const index = datasets.value.findIndex(ds => ds.id === dataset.id);
    if (index >= 0) {
      datasets.value[index] = { ...dataset };
    }
  }

  function setRegionName(region: UnifiedRegionType, newName: string) {
    if (newName.trim() === '') {
      console.error("Region name cannot be empty.");
      return;
    }
    // eslint-disable-next-line
    // @ts-ignore it is not actually deep
    const existing = (regions.value as UnifiedRegionType[]).find(r => r.name === newName && r.id !== region.id);
    if (existing) {
      console.error(`A region with the name "${newName}" already exists.`);
      return;
    }
    region.name = newName;
    console.log(`Renamed ${region.geometryType} region to: ${newName}`);
  }

  async function fetchDataForDataset(dataset: UserDataset) {
    dataset.loading = true;

    // loadingSamples.value = sel.id;
    // sampleErrors.value[sel.id] = null;
    
    const timeRanges = atleast1d(dataset.timeRange.range);
    
    try {
      const service = getTempoDataService(dataset.molecule);
      const data = await service.fetchTimeseriesData(dataset.region.geometryInfo, timeRanges);
      dataset.samples = data.values;
      dataset.errors = data.errors;
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

    const service = getTempoDataService(dataset.molecule);
    const timeRanges = atleast1d(dataset.timeRange.range);

    
    try {
      service.setBaseUrl(ESRI_URLS[dataset.molecule].url);
      const data = await service.fetchCenterPointData(
        dataset.region.geometryInfo,
        timeRanges,
        { sampleCount: maxSampleCount.value },
      );
      if (data) {
        dataset.samples = data.values;
        dataset.locations = data.locations;
        console.log(`Fetched center point data for ${timeRanges.length} time range(s)`);
      }
    } catch (error) {
      sampleErrors.value[dataset.id] = error instanceof Error ? error.message : String(error);
    }
  }

  function datasetHasSamples(dataset: UserDataset): boolean {
    return (dataset.samples !== undefined) && Object.keys(dataset.samples).length > 0;
  }

  function regionHasDatasets(region: UnifiedRegionType): boolean {
    const sel = datasets.value.find(ds => ds.region.id === region.id);
    return sel !== undefined;
  }

  function deleteRegion(region: UnifiedRegionType) {
    const index = regions.value.findIndex(r => r.id === region.id);
    if (index < 0) {
      return;
    }
    // if (map.value && region.layer) {
    //   if (isRectangleSelection(region)) {
    //     removeRectangleLayer(map.value as Map, region.layer as unknown as StyleLayer);
    //   } else if (isPointSelection(region)) {
    //     removePointLayer(map.value as Map, region.layer as unknown as StyleLayer);
    //   }
    // }
  }

  return {
    accentColor,
    accentColor2,

    selectedTimezone,
    dateIsDST,
    timezoneOptions,

    selectionActive,
    lastFocusedRegion,

    homeState,
    initState,

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
    molecule,
    displayedDayTimeRange,
    currentTempoDataService,
    colorMap,

    addTimeRange,
    addRegion,
    addDataset,
    fetchDataForDataset,
    fetchCenterPointDataForDataset,
    markDatasetUpdated,
    datasetHasSamples,
    regionHasDatasets,
    setRegionName,

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
  };
});

export const useTempoStore = createTempoStore("maplibre");
