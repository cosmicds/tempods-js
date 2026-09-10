<template>
  <MaplibreMap
    :mapID="mapID"
    :home="home"
    :initial="initial"
    :show-roads="showRoads"
    :events="events"
    :width="width"
    :height="height"
    :latitude="latitude"
    :longitude="longitude"
    :zoom="zoom"
    @update:latitude="(v:number)=> latitude = v"
    @update:longitude="(v:number)=> longitude = v"
    @update:zoom="(v:number)=> zoom = v"
    ref="innerMap"
    @ready="onInnerMapReady"
    @zoomhome="$emit('zoomhome')"
  >
    <!-- Loading overlay while fetching ESRI time steps -->
    <v-overlay
      :model-value="loadingEsriTimeSteps"
      style="z-index: 1000;"
      class="align-center justify-center"
      contained
      opacity=".8"
    >
      <div class="d-flex flex-column align-center justify-center ga-2">
        <label class="text-white">Fetching time steps from NASA Earthdata GIS service...</label>
        <v-progress-circular
          :size="80"
          :width="12"
          :indeterminate="loadingEsriTimeSteps"
          color="#092088"
        />
      </div>
    </v-overlay>
    <slot />
  </MaplibreMap>
</template>

<script setup lang="ts">
import { ref, watch, toRef, computed, type Ref, useTemplateRef, onMounted, shallowRef } from 'vue';
import type { PropType } from 'vue';
import { storeToRefs } from "pinia";
import type { Map } from 'maplibre-gl';
import MaplibreMap from './MaplibreMap.vue';
import { useTempoLayer } from '@/esri/maplibre/useTempoImageLayer';
import { useFieldOfRegard } from '@/composables/maplibre/useFieldOfRegard';
import { type MoleculeType } from '@/esri/utils';
import type { InitMapOptions, LatLngPair } from '@/types';
import type { MapEventType, Listener } from 'maplibre-gl';
import type { AvailableColorMaps } from "@/colormaps";

import { useTempoStore } from "@/stores/app";

const store = useTempoStore();

const { showRGBMode } = storeToRefs(store);

const props = defineProps({
  mapID: { type: String, required: true },
  home: {
    type: Object as PropType<InitMapOptions>,
    required: false,
    default: () => {
      return {
        loc: [39.8283, -98.5795] as LatLngPair, 
        zoom: 4, 
        t: null
      };
    }
  },
  initial: {
    type: Object as PropType<InitMapOptions | null>,
    required: false,
    default: null
  },
  showRoads: {
    type: Boolean,
    required: false,
    default: true
  },
  // events: { moveend: handler, zoomend: handler, click: handler, etc. }
  events: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: Object as PropType<Record<keyof MapEventType | string, Listener>>,
    required: false,
    default: () => ({})
  },
  // width and height, default to 100%
  width: {
    type: String,
    required: false,
    default: '100%'
  },
  height: {
    type: String,
    required: false,
    default: '100%'
  },
  // ESRI-specific props
  timestamp: { 
    type: Number as PropType<number | null>, 
    required: false, 
    default: null 
  },
  molecule: { 
    type: String as PropType<MoleculeType>, 
    required: true 
  },
  opacity: { 
    type: Number, 
    required: false, 
    default: 0.9 
  },
  showFieldOfRegard: { 
    type: Boolean, 
    required: false, 
    default: true 
  },
  maplibreLayerName: {
    type: String || undefined,
    required: false,
    default: undefined
  }
});

const emit = defineEmits<{
  // Single, simplified ready event: base map (Maplibre) is ready.
  (e:'ready', map: Map): void; 
  (e:'zoomhome'): void; 
  (e: 'colormap', colormap: AvailableColorMaps): void;
  // Timesteps loaded (can fire multiple times e.g., molecule switch)
  (e:'esri-timesteps-loaded', steps: number[]): void;
  (e: 'esri-layer', esriLayer: ReturnType<typeof useTempoLayer>)
}>();

// Reference to inner MaplibreMap exposed API
const innerMap = useTemplateRef<InstanceType<typeof MaplibreMap> | null>("innerMap");
const map = shallowRef<Map | null>(null);

// Pass-through models for view state
const latitude = defineModel<number>('latitude', { default: 0 });
const longitude = defineModel<number>('longitude', { default: 0 });
const zoom = defineModel<number>('zoom', { default: 0 });

// add a watcher to console log the lat/long/zoom changes
watch([latitude, longitude, zoom], ([newLat, newLng, newZoom]) => {
  console.log(`Map view changed: lat=${newLat}, lng=${newLng}, zoom=${newZoom}`);
});

// Internal readiness tracking: single concept (base map ready)
const mapReady = ref(false);              // Underlying Maplibre map style loaded
let promiseResolve: (value: Map) => void;
const onReady: Promise<Map> = new Promise((resolve) => { promiseResolve = resolve; });

const molecule = computed(() => props.molecule);

//https://vuejs.org/api/reactivity-utilities#toref (two-way)
// can also do toRef(()=>props.timestamp) in v 3.3+
const timestampRef = toRef(props, 'timestamp');
const opacityRef = toRef(props, 'opacity');

// ESRI layer composable
const theEsriLayer = useTempoLayer({
  initialMolecule: molecule,
  timestamp: timestampRef,
  opacity: opacityRef,
  fetchOnMount: true,
  layerName: props.maplibreLayerName,
  initVisible: true,
  initRGB: showRGBMode.value,
});

const { loadingEsriTimeSteps, addEsriSource, esriTimesteps, renderOptions } = theEsriLayer;

watch(esriTimesteps, (newSteps, old) => {
  if (newSteps.length > 0 && newSteps !== old) {
    emit('esri-timesteps-loaded', newSteps);
  }
});

watch(() => renderOptions.value.colormap, cmap => emit("colormap", cmap as AvailableColorMaps));


watch(theEsriLayer.serviceReady, (ready) => {
  const somewhatReady = ready.some(x => x);
  if (!somewhatReady) {
    theEsriLayer.setVisibility(false);
  }
});

watch(map, (newMap, oldMap) => {
  if (oldMap) {
    store.deregisterMap(oldMap as unknown as Map);
  }
  if (newMap) {
    store.registerMap(newMap as unknown as Map);
  }
});

const singleDateSelected = computed(() => {
  // a date object with the current day
  if (props.timestamp) {
    const dt = new Date(props.timestamp);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }
  return null;
});
// Field of Regard handling
const { 
  addFieldOfRegard, 
  showFieldOfRegard: internalShowFieldOfRegard, 
  updateFieldOfRegard 
} = useFieldOfRegard(singleDateSelected, map as Ref<Map | null>);
  
internalShowFieldOfRegard.value = props.showFieldOfRegard;
watch(() => props.showFieldOfRegard, (val) => {
  internalShowFieldOfRegard.value = val;
});

function onInnerMapReady(m: Map) {
  // Resolve base map readiness immediately
  mapReady.value = true;
  promiseResolve(m);
  map.value = m;
  // Attach ESRI source right after base readiness (microtask keeps UI snappy)
  addEsriSource(m);
  emit('esri-layer', theEsriLayer);
  emit('ready', m);
}

onMounted(() => {
  if (internalShowFieldOfRegard.value) {
    updateFieldOfRegard();
    addFieldOfRegard();
  }
});

// Forward selected parts of inner MaplibreMap API after it's ready
const exposedApi = {
  map,
  mapReady,
  onReady, // Promise resolves when base map ready
  // Forwarded methods
  setView: (center: LatLngPair, zoom: number) => innerMap.value?.setView(center, zoom),
  resetView: () => innerMap.value?.resetView(),
  getCenter: () => innerMap.value?.getCenter(),
  on: (type: keyof MapEventType | string, listener: Listener) => innerMap.value?.on(type, listener),
  off: (type: keyof MapEventType | string, listener: Listener) => innerMap.value?.off(type, listener),
  once: (type: keyof MapEventType | string, listener: Listener) => innerMap.value?.once(type, listener),
  // ESRI specifics
  esriTimesteps,
  loadingEsriTimeSteps,
  renderOptions,
};

defineExpose(exposedApi);

</script>

<style scoped lang="less">
#map-legend {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(255,255,255,0.85);
  padding: 4px 8px;
  font-size: 0.8rem;
  border-radius: 4px;
  z-index: 500;
  pointer-events: none;
}
.line-legend {
  border: none;
  border-top: 2px solid #c10124;
  margin: 0 0 2px 0;
}
</style>
