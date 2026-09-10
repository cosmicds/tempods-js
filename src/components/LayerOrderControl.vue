<template>
  <draggable 
    v-model="displayOrder" 
    handle=".drag-handle"
    class="layer-order"
    :item-key="(item) => item"
  >
    <template #item="{ element }">
      <div class="layer-order-row">
        <div class="drag-handle">
          <v-icon size="x-small">mdi-menu</v-icon>
        </div>
        <layer-control-item
          :map="mapRef"
          :layer-id="element"
          :display-name="displayNameTransform(element)"
          :synced-items="getConnectedItems(element)"
        >
          <template #warning
            v-if="layerMessage(element)"
          >
            <v-tooltip :text="layerMessage(element)!">
              <template #activator="{ props }">
                <v-icon v-if="layerErrorType(element) === 'error'" v-bind="props" color="red">mdi-alert-octagon</v-icon>
                <v-icon v-else v-bind="props" color="yellow">mdi-alert</v-icon>
              </template>
            </v-tooltip>
          </template>
          <template #info
            v-if="layerInfo[element]"
          >
            <h3 v-html="layerInfo[element].title"></h3>
            <p v-html="layerInfo[element].description"></p>
            <p v-if="layerInfo[element].timescale" class="mt-2">Timescale:<span v-html="layerInfo[element].timescale"></span></p>
            <p class="mt-1 text-caption" v-html="layerInfo[element].source"></p>
          </template>
          <template #extras="{ visible }"
          >
            <local-scope
              v-if="element.startsWith(tempoPrefix)"
              :cbar="colorbarOptions[element.slice(tempoPrefix.length)]"
            >
              <template #default="{ cbar }">
                <colorbar-horizontal
                  v-show="visible"
                  :cmap-name="showRGBMode ? cbar.rgbcolormap : cbar.colormap"
                  :cmap="colormapFunction(showRGBMode ? cbar.rgbcolormap : cbar.colormap)"
                  background-color="transparent"
                  height="15px"
                  font-size="9pt"
                  :nsteps="255"
                  :start-value="String((showRGBMode ? cbar.rgbstretch : cbar.stretch)[0] / cbar.cbarScale)"
                  :end-value="String((showRGBMode ? cbar.rgbstretch : cbar.stretch)[1] / cbar.cbarScale)"
                  :extend="false"
                >
                  <template #label>
                    <span v-html="cbarLabel(cbar.cbarScale, cbar.unit)"></span>
                  </template>
                </colorbar-horizontal>
              </template>
            </local-scope>
            <colorbar-horizontal
              v-else-if="element.includes('asthma')"
              v-show="visible"
              :cmap-name="asthmaColorbar.colormap"
              :cmap="colormapFunction(asthmaColorbar.colormap)"
              background-color="transparent"
              height="15px"
              font-size="9pt"
              :nsteps="255"
              :start-value="String(asthmaColorbar.min)"
              :end-value="String(asthmaColorbar.max)"
              :extend="true"
            >
              <template #label>{{ asthmaColorbar.label }}</template>
            </colorbar-horizontal>

            <!-- Loading bar -->
             <v-progress-linear v-if="layerErrorType(element) === 'loading'" indeterminate />

            <!-- Retry but only for hms-fire right now -->
            <v-btn
              v-if="layerErrorType(element) === 'error' && element === 'hms-fire'"
              size="x-small"
              variant="tonal"
              color="red"
              prepend-icon="mdi-refresh"
              @click="store.doLayerAction(element, 'retry')"
            >Try again</v-btn>
            <!-- Legend -->

            <NarrowExpansionPanel v-show="visible" :item="element" v-if="hasLegend.includes(element)">
              <template #summary="{ isOpen }">
                {{ element==='power-plants-layer' ? `${isOpen ? 'Hide' : 'Show'} Filter` : `${isOpen ? 'Hide' : 'Show'} Legend` }}
              </template>
              <land-use-legend  v-if="element === 'land-use'"  />
              <AQILegend v-if="element === 'aqi-layer-aqi'" />
              <power-plants-filter-control :map="mapRef" v-if="element === 'power-plants-layer'"/>
              <pop-dens-legend v-if="element === 'pop-dens'" mini/>
            </NarrowExpansionPanel>

          </template>
        </layer-control-item>
      </div>
    </template>
  </draggable>
</template>


<script setup lang="ts">
import { computed, type MaybeRef,  toValue, toRef, watch } from 'vue';
import { storeToRefs } from "pinia";
import draggable from 'vuedraggable';
import M from 'maplibre-gl';

import { useMaplibreLayerOrderControl } from "@/composables/useMaplibreLayerOrderControl";
import { capitalizeWords } from "@/utils/names";
import { colorbarOptions } from "@/esri/ImageLayerConfig";
import { colormapFunction } from "@/colormaps/utils";
import { useTempoStore } from "@/stores/app";
import type { LayerErrorType } from "@/types";
import { layerNames, layerInfo } from "@/datasets/layerData";
import { asthmaColorbar } from "@/datasets/addAsthma";
import NarrowExpansionPanel from './NarrowExpansionPanel.vue';
import LandUseLegend from './LandUseLegend.vue';
import AQILegend from './AQILegend.vue';
import PopDensLegend from './PopDensLegend.vue';


const store = useTempoStore();
const { showRGBMode, layersReady, globalWarning } = storeToRefs(store);

interface Props {
  mapRef: M.Map | null;
  order: MaybeRef<string[]>;
}

const props = defineProps<Props>();
const mapRef = toRef(() => props.mapRef);

// https://vuejs.org/guide/typescript/composition-api.html#typing-component-emits

interface Emits {
  (e: 'change', newOrder: string[]): void;
}
const _emit = defineEmits<Emits>();

  
const connections = {
  'stamen-toner-lines': ['coastline-custom', 'states-custom', 'stamen-toner-lines'],
  'aqi-layer-aqi': ['aqi-layer-aqi','aqi-layer-aqi-label'], // colored dot on bottom, label on top
  'places-asthma-tracts': ['places-asthma-tracts-outline'],
  'places-asthma-counties': ['places-asthma-counties-outline'],
  'hms-fire': ['hms-fire-circle', 'hms-fire-clustered']
};
const getConnectedItems = (layer: string): string[] => {
  return connections[layer] ?? [];
};


const {
  currentOrder,
  controller
} = useMaplibreLayerOrderControl(
  mapRef, 
  toValue(props.order),
  false,
  Object.entries(connections).map(([key, value]) => [key, value])
  
);

const tempoPrefix = "tempo-";

const displayOrder = computed({
  get(): string[] {
    const reversed = currentOrder.value.slice().reverse();
    // Push not ready layers to the bottom, still in order though
    const ready = reversed.filter(id => layerErrorType(id) !== 'error');
    const notReady = reversed.filter(id => layerErrorType(id) === 'error');
    return [...ready, ...notReady];
  },
  set(value: string[]) {
    controller?.setManagedOrder(value.slice().reverse());
  }
});


const hasLegend = ['land-use', 'aqi-layer-aqi', 'power-plants-layer', 'pop-dens'];

function displayNameTransform(layerId: string): string {
  return layerNames[layerId] ?? capitalizeWords(layerId.replace(/-/g, " "));
}

function layerErrorType(layerId: string): LayerErrorType {
  return layersReady.value.get(layerId)?.status ?? 'ready';
}

function layerMessage(layerId: string): string | null {
  const msgs = layersReady.value.get(layerId)?.statusMsg;
  return msgs && msgs.length > 0 ? msgs.join(' ') : null;
}

watch(layersReady, () => {
  const notReadyTempoLayers = Array.from(layersReady.value).map(([layerId, entry]) => {
    if (layerId.startsWith('tempo') && entry.status === 'error') {
      return true;
    }
    return false;
  });
  if (notReadyTempoLayers.some(e => e)) {
    globalWarning.value = `The NASA Earthdata GIS service that this app relies on (at <a style="color:currentColor;" href="https://gis.earthdata.nasa.gov/" target="_blank">https://gis.earthdata.nasa.gov/</a>) is currently down. Certain TEMPO and Population Density data may not be available.<br/><br/>
    An alternate version of TEMPO's NO<sub>2</sub> data layer is displayed here instead.`;
  } else {
    globalWarning.value = '';
  }
}, { deep: true });


function cbarLabel(cbarScale: number, unit: string) {
  const power = cbarScale > 1 ? `10<sup>${Math.round(Math.log10(cbarScale))}</sup>` : "";
  return `${power} ${unit}`;
}
</script>


<style scoped>
ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
  margin-left: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  height: fit-content;
}

li {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  cursor: move;
  margin: 10px 0;
}

.drag-handle {
  font-size: 20pt;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  &:hover {
    cursor: grab;
  }
}

.layer-order {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.layer-order-row {
  background: #404040;
  border: 1px solid white;
  border-radius: 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
}

.mlc-layer-item {
  border-left: 1px solid white;
  padding: 2px;
}

#power-plant-filter-controls {
  box-sizing: border-box;
}
</style>
