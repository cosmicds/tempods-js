<template>
  <div class="map-container">
    <v-card class="map-contents" style="width:100%; height: 100%;">
      <v-toolbar
        density="compact"
        color="var(--info-background)"
      >
        <v-toolbar-title text="TEMPO Data Viewer"></v-toolbar-title>
        <v-tooltip text="Save map as image">
          <template #activator="{ props }">
            <MaplibreDownloadButton
              v-bind="props"
              :map="map as Map | null" 
              filename="tempo-lab"
              />
          </template>
        </v-tooltip>
      </v-toolbar>
      <EsriMap
        :mapID="mapID"
        :initial="initState"
        :home="homeState"
        :show-roads="showRoads"
        :events="{
          'moveend': updateURL,
          'zoomend': updateURL,
        }"
        :timestamp="timestamp"
        molecule="no2"
        :opacity="opacity"
        :show-field-of-regard="showFieldOfRegard"
        @zoomhome="onZoomhome"
        @ready="onMapReady"
        @esri-layer="(no2Layer as unknown as UseEsriTempoLayer) = $event"
        @esri-timesteps-loaded="onEsriTimestepsLoaded"
        ref="maplibreMap"
        width="100%"
        height="100%"
        maplibre-layer-name="tempo-no2"
      />

      <div v-if="showFieldOfRegard" class="map-legend"><hr class="line-legend">TEMPO Field of Regard</div>
      <!-- show hide cloud data, disable if none is available -->

      <div class="location-and-sharing">
        <location-search
          v-model="searchOpen"
          small
          stay-open
          buttonSize="xl"
          persist-selected
          :search-provider="geocodingInfoForSearchLimited"
          @set-location="setLocationFromSearch"
          @error="(error: string) => searchErrorMessage = error"
        ></location-search>
      </div>
    </v-card>
    <div class="slider-row mx-16 mt-12">
      <v-slider
        class="time-slider"
        v-model="timeIndex"
        :min="minIndex"
        :max="maxIndex"
        :step="1"
        color="#068ede95"
        thumb-label="always"
        :track-size="10"
        show-ticks="always"
        hide-details
        @end="() => {
          timeSliderUsedCount += 1;
          // if (map) {
          //   setLayerVisibility(map as Map, activeLayer, true);
          // }
        }"
      >
        <template v-slot:thumb-label>
          <div class="thumb-label">
            {{ thumbLabel }}
          </div>
        </template>
      </v-slider>
      <icon-button
        class="play-pause"
        :fa-icon="playing ? 'pause' : 'play'"
        fa-size="sm"
        @activate="playing = !playing"
      ></icon-button>
    </div>
    <div class="d-flex flex-row">
      <map-controls
        class="flex-grow-1"
        @molecule="(mol: MoleculeType) => {
          molecule = mol;
          // if (map) {
          //   setLayerVisibility(map as Map, activeLayer, true);
          // }
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { computed, ref, shallowRef, toRaw, useTemplateRef, watch, type Ref, type WritableComputedRef } from "vue";
import { useDisplay } from 'vuetify';
import { storeToRefs } from "pinia";
import { MapBoxFeature, MapBoxFeatureCollection, MapBoxFeatureType, MapBoxForwardGeocodingOptions, geocodingInfoForSearch } from "@cosmicds/vue-toolkit";
import { Map, GeoJSONSource, type StyleLayer } from "maplibre-gl";
import { getTimezoneOffset } from "date-fns-tz";
import { v4 } from "uuid";

import type { LatLngPair, LayerStatus, PointSelectionInfo, RectangleSelectionInfo, SelectionType } from "@/types";
import { featureStatus } from "@/datasets/layerStatus";
import { type MoleculeType, MOLECULE_OPTIONS, moleculeVariable } from "@/esri/utils";
import { colorbarOptions } from "@/esri/ImageLayerConfig";
import { useTempoStore } from "@/stores/app";
import { useLocationMarker } from "@/composables/maplibre/useMarker";
import { useRectangleSelection } from "@/composables/maplibre/useRectangleSelection";
import { addRectangleLayer, addPointLayer, regionBounds, fitBounds, removeRectangleLayer, removePointLayer } from "@/composables/maplibre/utils";
import { usePointSelection } from "@/composables/maplibre/usePointSelection";
import { COLORS } from "@/utils/color";
import { EsriSampler } from "@/esri/services/sampling";
import { useMultiMarker } from '@/composables/maplibre/useMultiMarker';

import { setLayerOpacity, setLayerVisibility } from "@/maplibre_controls";

import EsriMap from "@/components/EsriMap.vue";
import MapColorbarWrap from "@/components/MapColorbarWrap.vue";
import MaplibreDownloadButton from "@/components/MaplibreDownloadButton.vue";

type MapType = Map | null;
type MapTypeRef = Ref<MapType>;
const maplibreMap = useTemplateRef<InstanceType<typeof EsriMap>>("maplibreMap");
const map = shallowRef<MapType>(null);

type Timeout = ReturnType<typeof setTimeout>;

const mapID = `map-${v4().replace("-", "")}`;

const store = useTempoStore();
const {
  regions,
  regionOpacity,
  regionVisibility,
  timestamp,
  timeIndex,
  minIndex,
  maxIndex,
  date,
  selectedTimezone,
  timeSliderUsedCount,
  playButtonClickedCount,
  timestamps,
  timestampsLoaded,
  selectionActive,
  regionsCreatedCount,
  maxSampleCount,
  focusRegion,
  initState,
  homeState,
  showFieldOfRegard,
  showRoads,
  showSamplingPreviewMarkers,
  singleDateSelected,
  showAdvancedLayers,
  showRGBMode,
} = storeToRefs(store);

const molecule = ref<MoleculeType>("no2");
const currentTempoDataService = computed(() => store.getTempoDataService(molecule.value));

function createSelectionComputed(selection: SelectionType): WritableComputedRef<boolean> {
  return computed({
    get() {
      return selectionActive.value === selection;
    },
    set(value: boolean) {
      if (value === (selectionActive.value !== selection)) {
        selectionActive.value = value ? selection : null;
      }
    },
  });
}

const pointSelectionActive = createSelectionComputed("point");
const rectangleSelectionActive = createSelectionComputed("rectangle");

const { selectionInfo: rectangleInfo } = useRectangleSelection(map as MapTypeRef, "red", rectangleSelectionActive);
const { selectionInfo: pointInfo } = usePointSelection(map as MapTypeRef, pointSelectionActive);

type UnifiedRegionType = typeof regions.value[number];

const display = useDisplay();

import { addPowerPlants } from "@/datasets/addPowerPlants";
import { addHMSFire } from "@/datasets/addHMSFire";

const pp = addPowerPlants(map as Ref<Map | null> | null, false);
import { addAQI } from '@/datasets/addAQI';

// base it of singleDateSelected
const airQualityUrl = computed(() => {
  const date = store.singleDateSelected;
  if (!date) {
    return 'https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/2025/20250914/KMLPointMaps_PM2.5-24hr.kml';
  }

  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/${year}/${year}${month}${day}/KMLPointMaps_PM2.5-24hr.kml`;
});
const aqiLayer = addAQI(airQualityUrl.value, { 
  propertyToShow: 'aqi', 
  labelMinZoom: 5, 
  layerName: 'aqi', 
  visible: false,
  showLabel: true, 
  showPopup: true
});

// Ensure date/url changes trigger a reload, even if initial load failed
watch(airQualityUrl, (newUrl) => {
  aqiLayer.setUrl(newUrl).catch(() => {/* ignore */});
});


import { addPopulationDensityLayer } from '@/datasets/addPopulationDensity';
const popLayer = addPopulationDensityLayer();

import { addLandUseLayer } from "@/datasets/addLandUse";
const sentinalLandUseLayer = addLandUseLayer();

import { addAsthmaLayer } from "@/datasets/addAsthma";
const asthmaCounties = addAsthmaLayer('places-asthma-counties', 2);
// asthma tracts disabled
// const asthmaTracts = addAsthmaLayer('places-asthma-tracts', 3);

function syncAsthmaStatus(layer: ReturnType<typeof addAsthmaLayer>) {
  watch(() => layer.status.value, (s) => {
    store.setLayerReady(layer.layerId, [s !== 'zoom-in'], featureStatus(s));
  }, { immediate: true });
}
syncAsthmaStatus(asthmaCounties);
// syncAsthmaStatus(asthmaTracts);

const hmsFire = addHMSFire(singleDateSelected, {
  layerName: 'hms-fire',
  visible: false,
  showPopup: true,
  showLabel: false,
  showClusters: true,
});

// for now we only handle the hms-fire actions
watch(() => store.layerAction, (action) => {
  if (action?.layerId === 'hms-fire' && action.action === 'retry') {
    hmsFire.retry();
  }
}, { deep: true });

import { type UseEsriTempoLayer, useTempoLayer } from "@/esri/maplibre/useTempoImageLayer";
// just use the hcho layer for now
const hchoLayer = useTempoLayer({
  initialMolecule: "hcho",
  timestamp,
  opacity: 1,
  fetchOnMount: true,
  layerName: "tempo-hcho",
  initVisible: false,
  initRGB: showRGBMode.value,
});
const ozoneLayer = useTempoLayer({
  initialMolecule: "o3",
  timestamp,
  opacity: 1,
  fetchOnMount: true,
  layerName: "tempo-o3",
  initVisible: false,
  initRGB: showRGBMode.value,
});
const o3tropLayer = useTempoLayer({
  initialMolecule: "o3trop",
  timestamp,
  opacity: 1,
  fetchOnMount: true,
  layerName: "tempo-o3trop",
  initVisible: false,
  initRGB: showRGBMode.value,
});
const no2Layer = ref<UseEsriTempoLayer | null>(null);
  
import { useTempoLiteImages } from "@/composables/tempo-lite/TempoLite";
const tempoLite = useTempoLiteImages();

function syncLayerReady(layerName: string, serviceReady: boolean[] | undefined, status?: LayerStatus) {
  if (!serviceReady || serviceReady.length === 0) {
    store.clearLayerReady(layerName);
    return;
  }
  store.setLayerReady(layerName, serviceReady, status);
}

function addAdvancedLayers(m: Map | null) {
  if (m === null) {
    console.warn('Tried to addAdvancedLayers but map was null');
    return;
  }
  
  // let each of these fail without preventing the rest of the layers from loading
  const tryCatch = (label: string, cb: () => void) => {
    // tryCatch util
    try {
      cb();
    } catch (error) {
      console.error(`[${label}] Failed to add layer`, error);
    }
  };
  // pp.addheatmapLayer();
  // pp.togglePowerPlants(false);
  tryCatch('aqi-layer-aqi', () => aqiLayer.addToMap(m));
  tryCatch('pop-dens', () => popLayer.addEsriSource(m));
  tryCatch('land-use', () => sentinalLandUseLayer.addEsriSource(m));
  tryCatch('hms-fire', () => hmsFire.addToMap(m));
  tryCatch('tempo-hcho', () => hchoLayer.addEsriSource(m));
  tryCatch('tempo-o3', () => ozoneLayer.addEsriSource(m));
  tryCatch('tempo-o3trop', () => o3tropLayer.addEsriSource(m));
  syncLayerReady('tempo-hcho', hchoLayer.serviceReady.value, hchoLayer.status.value);
  syncLayerReady('tempo-o3', ozoneLayer.serviceReady.value, ozoneLayer.status.value);
  syncLayerReady('tempo-o3trop', o3tropLayer.serviceReady.value, o3tropLayer.status.value);
  syncLayerReady('pop-dens', popLayer.serviceReady.value, popLayer.status.value);
  syncLayerReady('land-use', sentinalLandUseLayer.serviceReady.value, sentinalLandUseLayer.status.value);
  syncLayerReady('hms-fire', [hmsFire.loading.value], hmsFire.status.value);
  
  tryCatch('power-plants-layer', () => pp.addLayer());
  // pp.togglePowerPlants(false);
  tryCatch(asthmaCounties.layerId, () => asthmaCounties.addToMap(m));
  // asthma tracts disabled
  // tryCatch(asthmaTracts.layerId, () => asthmaTracts.addToMap(m));
}

function removeAdvancedLayers(m: Map | null) {
  if (m === null) {
    console.warn('Tried to removeAdvancedLayers but map was null');
    return;
  }
  // tempoLite.removeFromMap();
  aqiLayer.removeFromMap(m);
  popLayer.removeEsriSource();
  sentinalLandUseLayer.removeEsriSource();
  hmsFire.removeFromMap(m);
  hchoLayer.removeEsriSource();
  ozoneLayer.removeEsriSource();
  o3tropLayer.removeEsriSource();
  pp.removeLayer();
  asthmaCounties.removeFromMap(m);
  // asthma tracts disabled
  // asthmaTracts.removeFromMap(m);
  store.clearLayerReady('tempo-hcho');
  store.clearLayerReady('tempo-o3');
  store.clearLayerReady('tempo-o3trop');
  store.clearLayerReady('pop-dens');
  store.clearLayerReady('land-use');
  store.clearLayerReady('places-asthma-counties');
  // store.clearLayerReady('places-asthma-tracts');
}

const onMapReady = (m: Map) => {
  map.value = m; // ESRI source already added by EsriMap
  syncLayerReady('tempo-no2', no2Layer.value?.serviceReady, no2Layer.value?.status); // needs to be done early
  tempoLite.addTo(m);
  tempoLite.setVisibility(false);
  if (showAdvancedLayers.value) addAdvancedLayers(m);
  updateRegionLayers(regions.value);
  m.resize();
};

watch(showAdvancedLayers, (value) => {
  if (value) {
    addAdvancedLayers(map.value);
    return;
  }
  removeAdvancedLayers(map.value);
  
  
});

watch(molecule, (newMolecule) => {
  if (map.value) {
    hchoLayer.setVisibility(newMolecule === 'hcho');
    ozoneLayer.setVisibility(newMolecule === 'o3');
    o3tropLayer.setVisibility(newMolecule === 'o3trop');
    no2Layer.value?.setVisibility(newMolecule === 'no2');
    // map.value.moveLayer(`tempo-${newMolecule}`, 'tempo-no2');
  }
});

const activeLayer = computed(() => `tempo-${molecule.value}`);



// check if a service failed (empty arrays are still checking)
function serviceFailed(readyArray: boolean[] | undefined): boolean {
  return Array.isArray(readyArray) && readyArray.length > 0 && !readyArray.some(x => x);
}

watch(() => [
  no2Layer.value?.serviceReady,
  hchoLayer.serviceReady.value,
  ozoneLayer.serviceReady.value,
  o3tropLayer.serviceReady.value,
  popLayer.serviceReady.value,
  sentinalLandUseLayer.serviceReady.value,
  [hmsFire.loading.value],
], ([no2Ready, hchoReady, ozoneReady, o3tropReady, popReady, landUseReady]) => {
  syncLayerReady('tempo-no2', no2Ready, no2Layer.value?.status);


  // Only take over with tempo-lite once the no2 service has actually failed
  if (serviceFailed(no2Ready)) {
    tempoLite.setVisibility(true);
    tempoLite.forceLiteTimestamps();
    no2Layer.value?.setVisibility(false);
  }

  const no2Working = Array.isArray(no2Ready) && no2Ready.some(x => x);
  if (no2Working) {
    tempoLite.removeFromMap();
  }



  if (showAdvancedLayers.value) {
    syncLayerReady('tempo-hcho', hchoReady, hchoLayer.status.value);
    syncLayerReady('tempo-o3', ozoneReady, ozoneLayer.status.value);
    syncLayerReady('tempo-o3trop', o3tropReady, o3tropLayer.status.value);
    syncLayerReady('pop-dens', popReady, popLayer.status.value);
    syncLayerReady('land-use', landUseReady, sentinalLandUseLayer.status.value);
    syncLayerReady('hms-fire', [hmsFire.loading.value], hmsFire.status.value);
    return;
  }

  store.clearLayerReady('tempo-hcho');
  store.clearLayerReady('tempo-o3');
  store.clearLayerReady('tempo-o3trop');
  store.clearLayerReady('pop-dens');
  store.clearLayerReady('land-use');
  store.clearLayerReady('hms-fire');
}, { deep: true, immediate: true });

import { stretches, colorramps, rgbstretches, rgbcolorramps, type ColorRamps } from "@/esri/ImageLayerConfig";
  
watch(showRGBMode, (cMode) => {

  const colormapsToUse = cMode ? rgbcolorramps : colorramps;
  hchoLayer.renderOptions.value.colormap = colormapsToUse['HCHO'];
  ozoneLayer.renderOptions.value.colormap = colormapsToUse['Ozone_Column_Amount'];
  o3tropLayer.renderOptions.value.colormap = colormapsToUse['0-2_km_Column_Ozone'];
  if (no2Layer.value) {
    no2Layer.value.renderOptions.colormap = colormapsToUse['NO2_Troposphere'];
  }

  const stretchesToUse = cMode ? rgbstretches : stretches;
  hchoLayer.renderOptions.value.range = stretchesToUse['HCHO'];
  ozoneLayer.renderOptions.value.range = stretchesToUse['Ozone_Column_Amount'];
  o3tropLayer.renderOptions.value.range = stretchesToUse['0-2_km_Column_Ozone'];
  if (no2Layer.value) {
    no2Layer.value.renderOptions.range = stretchesToUse['NO2_Troposphere'];
  }

});

const showLocationMarker = ref(true);
const {
  setMarker,
  removeMarker,
  locationMarker,
} = useLocationMarker(map as Ref<Map | null>, showLocationMarker.value);

const opacity = ref(0.9);
const playing = ref(false);
const playInterval = ref<Timeout | null>(null);


const searchOpen = ref(true);
const searchErrorMessage = ref<string | null>(null);
function activateRectangleSelectionMode() {
  rectangleSelectionActive.value = !rectangleSelectionActive.value;
}

function activatePointSelectionMode() {
  pointSelectionActive.value = !pointSelectionActive.value;
}

const regionLayers: Record<string, GeoJSONSource> = {};

// const colorMap = computed(() => colorbarOptions[molecule.value].colormap.toLowerCase());
const colorMap = computed(() => {
  const mol = moleculeVariable(molecule.value);
  return showRGBMode.value ? rgbcolorramps[mol].toLowerCase() : colorramps[mol].toLowerCase();
});

type ColorbarOptionsKey = keyof typeof colorbarOptions;
const currentColorbarOptions = computed<typeof colorbarOptions[ColorbarOptionsKey]>(() => {
  const mol = moleculeVariable(molecule.value);
  return {
    ...colorbarOptions[molecule.value],
    colormap: showRGBMode.value ? rgbcolorramps[mol] : colorramps[mol],
    stretch: showRGBMode.value ? rgbstretches[mol] : stretches[mol],
  };
});

// watch(currentColorbarOptions, (cc) => {
//   console.log('current colorbar options changed to', cc);
// });

// watch(colorMap, (value) => {
//   console.log('color map changed to', value);
// });


// TODO: Maybe there's a built-in Date function to get this formatting?
const thumbLabel = computed(() => {
  if (date.value === null || timestamp.value === null) {
    return '';
  }
  const offset = getTimezoneOffset(selectedTimezone.value, date.value);
  const dateObj = new Date(timestamp.value + offset);
  const hours = dateObj.getUTCHours();
  const amPm = hours >= 12 ? "PM" : "AM";
  let hourValue = hours % 12;
  if (hourValue === 0) {
    hourValue = 12;
  }
  return `${date.value.getUTCMonth() + 1}/${dateObj.getUTCDate()}/${dateObj.getUTCFullYear()} ${hourValue}:${dateObj.getUTCMinutes().toString().padStart(2, '0')} ${amPm}`;
});

const defaultMapboxOptions = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  types: ["place", "postcode"] as MapBoxFeatureType[],
  countries: ["US", "CA", "MX", "CU", "BM", "HT", "DO"],
  limit: 5,
};
async function geocodingInfoForSearchLimited(searchText: string, options?: MapBoxForwardGeocodingOptions): Promise<MapBoxFeatureCollection | null> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const token = process.env.VUE_APP_MAPBOX_ACCESS_TOKEN;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const opts = options ?? { ...defaultMapboxOptions, access_token: token ?? "" };
  return geocodingInfoForSearch(searchText, opts).catch(_err => null);
}

function setLocationFromSearch(items: [MapBoxFeature | null, string]) {
  const [feature, text] = items;
  if (feature !== null) {
    // Latitude, Longitude order
    const coordinates: LatLngPair = [feature.center[1], feature.center[0]] as LatLngPair;
    maplibreMap.value?.setView(coordinates, 12);
    setMarker(coordinates);
    store.userSelectedLocations.push(text);
  }
}

function onZoomhome() {
  if (locationMarker.value !== null) {
    removeMarker();
  }
}

const currentUrl = ref(window.location.href);
function updateURL() {
  if (map.value) {
    const center = map.value.getCenter();
    let stateObj = null as Record<string, string> | null;
    stateObj = {
      lat: `${center.lat.toFixed(4)}`,
      lon: `${center.lng.toFixed(4)}`,
      zoom: `${map.value.getZoom()}`,
      t: `${timestamp.value}`
    };
    const url = new URL(location.origin);
    const searchParams = new URLSearchParams(stateObj ?? {});
    // const hash = window.location.hash;
    // url.hash = hash;
    url.pathname = location.pathname;
    window.history.replaceState(null, '', url.toString());
    url.search = searchParams.toString();
    currentUrl.value = url.toString();
    // window.history.replaceState(stateObj, '', url);
  }
}

// ESRI timesteps arrive from EsriMap component; store directly in timestamps
function onEsriTimestepsLoaded(steps: number[]) {
  if (!Array.isArray(steps) || steps.length === 0) return;
  console.log(`%c[EsriMap] onEsriTimestepsLoaded: received ${steps.length} steps`, 'color: purple');
  const sorted = steps.slice().sort();
  timestamps.value = sorted;
  if (timeIndex.value >= sorted.length) {
    timeIndex.value = 0;
  }
  timestampsLoaded.value = true;
}

watch(playing, (val: boolean) => {
  if (val) {
    play();
    playButtonClickedCount.value += 1;
  } else {
    pause();
  }
});

function play() {
  playInterval.value = setInterval(() => {
    if (timeIndex.value >= maxIndex.value) {
      if (playInterval.value) {
        // clearInterval(this.playInterval);
        // this.playInterval = null;
        // let it loop
        timeIndex.value = minIndex.value;
      }
    } else {
      timeIndex.value += 1;
    }
  }, 1000);
}


function pause() {
  if (playInterval.value) {
    clearInterval(playInterval.value);
  }
}

function rectangleIsDegenerate(info: RectangleSelectionInfo): boolean {
  return info.xmax === info.xmin || info.ymax === info.ymin;
}

function addLayer(
  info: RectangleSelectionInfo | PointSelectionInfo,
  geometryType: "rectangle" | "point",
  color: string,
): { layer: GeoJSONSource } {
  const isRect = geometryType === 'rectangle';
  const layerInfo = isRect ?
    addRectangleLayer((map.value)!, info as RectangleSelectionInfo, color, regionOpacity.value, regionVisibility.value) :
    addPointLayer((map.value)!, info as PointSelectionInfo, color, regionVisibility.value);
  map.value?.moveLayer(layerInfo.layer.id);
  return layerInfo;
}

function removeLayer(
  layer: StyleLayer,
  geometryType: "rectangle" | "point",
) {
  const isRect = geometryType === 'rectangle';
  if (isRect) {
    removeRectangleLayer((map.value)!, layer);
  } else {
    removePointLayer((map.value)!, layer);
  }
}

function createRegion(info: RectangleSelectionInfo | PointSelectionInfo, geometryType: "rectangle" | "point"): UnifiedRegionType {
  const color = COLORS[regionsCreatedCount.value % COLORS.length];
  regionsCreatedCount.value += 1;

  const id = v4();
  const { layer } = addLayer(info, geometryType, color);
  regionLayers[id] = layer;
  return {
    id,
    name: `${geometryType === "rectangle" ? 'Region' : 'Point'} ${regionsCreatedCount.value}`,
    geometryInfo: toRaw(info),
    geometryType: geometryType,
    color,
  } as UnifiedRegionType;
}

function getRegionsDifference(arr1: UnifiedRegionType[], arr2: UnifiedRegionType[]): UnifiedRegionType[] {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const ids2 = arr2.map(r => r.id);
  return arr1.filter(element => !ids2.includes(element.id));
}

let existingRegions: UnifiedRegionType[] = [];
function updateRegionLayers(newRegions: UnifiedRegionType[]) {
  const added = getRegionsDifference(newRegions, existingRegions);
  const removed = getRegionsDifference(existingRegions, newRegions);
  added.forEach(region => {
    if (map.value && !regionLayers[region.id]) {
      const { layer } = addLayer(region.geometryInfo, region.geometryType, region.color);
      regionLayers[region.id] = layer;
    }
  });

  removed.forEach(region => {
    if (map.value && regionLayers[region.id]) {
      removeLayer(regionLayers[region.id] as unknown as StyleLayer, region.geometryType);
      delete regionLayers[region.id];
    }
  });
  existingRegions = [...newRegions];
}

watch(regions, updateRegionLayers, { deep: true });

watch(regionOpacity, (opacity: number) => {
  if (map.value !== null) {
    Object.values(regionLayers).forEach(layer => {
      setLayerOpacity(map.value!, layer.id, opacity);
    });
    setLayerOpacity(map.value, "predicted-samples-locations-layer", opacity);
  }
});

watch(regionVisibility, (visible: boolean) => {
  if (map.value !== null) {
    Object.values(regionLayers).forEach(layer => {
      setLayerVisibility(map.value!, layer.id, visible);
    });
    setLayerVisibility(map.value, "predicted-samples-locations-layer", visible);
  }
});

watch(rectangleInfo, (info: RectangleSelectionInfo | null) => {
  if (info === null || map.value === null) {
    rectangleSelectionActive.value = false;
    return;
  }
  if (rectangleIsDegenerate(info)) {
    // make it a point selection instead
    // TODO: only implement when we have a solution to only do this on a double-click
    // pointInfo.value = {
    //   x: info.xmin,
    //   y: info.ymin
    // };
    rectangleSelectionActive.value = false;
    return;
  }

  const newRegion = createRegion(info, "rectangle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store.addRegion(newRegion as any);
  rectangleSelectionActive.value = false;
  
  // do not permit editing a region on a selection
  // handleSelectionRegionEdit(info);
  

});

// Add watcher for point selection
watch(pointInfo, (info: PointSelectionInfo | null) => {
  if (info === null || map.value === null) {
    pointSelectionActive.value = false;
    return;
  }
  const newRegion = createRegion(info, "point"); 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store.addRegion(newRegion as any);
  pointSelectionActive.value = false;
});

const samplingPreviewMarkers = useMultiMarker(map as MapTypeRef , {
  shape: 'circle',
  color: '#0000ff',
  fillColor: '#0000ff',
  fillOpacity: 0.5,
  opacity: regionOpacity.value,
  radius: 0.02 / 2, // degrees
  scale: 'world',
  outlineColor: '#0000ff',
  label: 'predicted-samples-locations'
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const sampler = ref<EsriSampler>(null);
currentTempoDataService.value.withMetadataCache().then(meta => {
  sampler.value = new EsriSampler(meta);
}).catch((error) => {
  console.log("could not create sampler because there is no metada");
});

watch([showSamplingPreviewMarkers, regions, ()=> regions.value.length], (newVal) => {
  const tempoDataService = currentTempoDataService.value;
  const show = newVal[0];
  const regs = newVal[1];
  samplingPreviewMarkers.clearMarkers();
  let locations: {x: number, y:number}[] = [];
  if (sampler.value && show && regs.length > 0) {
    regs.forEach(r => {
      if (r.geometryType === 'rectangle') {
        sampler.value.setGeometry(r.geometryInfo);
        if (tempoDataService.meta) {
          sampler.value.setMetadata(tempoDataService.meta);
        }
        locations = [...locations, ...sampler.value.getSampleLocationsGrid(maxSampleCount.value)];
        // samplingPreviewMarkers.addMarkers(locations);
      }
    });
    samplingPreviewMarkers.addMarkers(locations);
  }
});

// TODO: This may need to be revisited when there are two maps
watch(focusRegion, region => {
  if (region !== null) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const bounds = regionBounds(region);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    fitBounds(map.value, bounds, true);
    focusRegion.value = null;
  }
});

</script>

<style lang="less">
.map-container {
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  padding-inline: 8px;

  .location-and-sharing {
    position: absolute;
    bottom: 0;
    z-index: 1000;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    width: fit-content;
  }

  .forward-geocoding-container {
    width: 250px;
    border: 2px solid black;
  }

  .map-show-hide-controls {
    z-index: 1000;
    position: absolute;
    top: calc(48px + 1rem);
    right: 80px;
  }

  .map-legend {
    position: absolute;
    top: 48px;
    right: 80px;
    width: fit-content;
    z-index: 1000;

    display: flex;
    align-items: center;
    gap: 0.5rem;

    color: black;
    background-color: #fff5;
    padding-left: 0.5rem;
    padding-right: 0.25rem;

    backdrop-filter: blur(5px);

    hr.line-legend {
      display: inline-block;
      border: 0.5px solid #c10124;
      width: 3rem;
    }
  }

  .controls-card {
    padding: 1rem;
    border: 1px solid #068ede;
  }

  .slider-row {
    display: flex;
    flex-direction: row;
    padding-left: 0;
  }

  >.play-pause {
    height: fit-content;
    align-self: center;
    padding-inline: 0.5rem;
    margin-left: 0.75rem;
    width: 2.5rem;
    color: var(--accent-color);
    border: 2px solid var(--accent-color);
  }

  .play-pause[disabled] {
    filter: grayscale(100%);
    cursor: progress;
    cursor: not-allowed;
  }

  .icon-wrapper {
    padding-inline: 0.5rem !important;
  }
}

.time-slider {

  .v-slider-thumb {

    .v-slider-thumb__surface::after {
      background-image: url("@/assets/smithsonian.png");
      background-size: 30px 30px;
      height: 30px;
      width: 30px;
    }

    .v-slider-thumb__label {
      background-color: var(--accent-color-2);
      border: 0.25rem solid var(--accent-color);
      width: max-content;
      height: 2.5rem;
      font-size: 1rem;

      &::before {
        color: var(--accent-color);
      }
    }
  }

  .v-slider-track__tick {
    background-color: var(--accent-color);
    /* Change color */
    height: 15px;
    /* Change size */
    width: 4px;
    margin-top: 0 !important;
    // top: -10%;
  }

  .v-slider {

    .v-slider.v-input--horizontal {
      grid-template-rows: auto 0px;
    }

    .v-slider.v-input--horizontal .v-slider-thumb__label {
      // top: calc(var(--v-slider-thumb-size) * 1.5);
      z-index: 2000;
    }

    .v-slider.v-input--horizontal .v-slider-thumb__label::before {
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-top: 6px solid currentColor;
      bottom: -15px;
    }
  }
}

#opacity-slider-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-left: 7%;
  padding-right: 7%;
  gap: 2px;

  .v-slider {
    margin-right: 0;
    width: 100%;
  }

  #opacity-slider-label {
    opacity: 0.7;
    width: fit-content;
  }
}

.hms-popup {
  font-size: 14px;
  line-height: 1.4;
  max-width: 200px;
  color: black;
}

@import "@/styles/maplibre-layer-control.css";
</style>
