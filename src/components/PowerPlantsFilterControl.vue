<template>
  <v-expansion-panels
    id="power-plant-filter-controls"
    multiple
    v-model="openPanels"
    :style="cssVars"
    color="#555"
    variant="accordion"
  >
    <div class="global-filters">
      <div>Power Plant Filters</div>
      <span>
      <v-btn
        size="small"
        :active="globalState === 'all'"
        @click="() => {
          openAllPanels();
          handleGlobalSelect(true);
        }"
      >All</v-btn>
      <v-btn
        size="small"
        :active="globalState === 'none'"
        @click="() => {
          openAllPanels();
          handleGlobalSelect(false);
        }"
      >None</v-btn>
      </span>
    </div>
    <v-expansion-panel
      v-for="(category, index) in PLANT_CATEGORIES"
      :key="index"
    >
      <v-expansion-panel-title class="expansion-panel-title">
          <div class="d-flex flex-wrap ga-2">
          <span>{{ category }}</span>
          <span class="d-flex ga-2">
            <v-btn
              size="small"
              :active="categoryState(category) === 'all'"
              @click.stop="() => {
                openPanel(index);
                handleCategoryGlobalSelect(category, true);
              }"
            >All</v-btn>
            <v-btn
              size="small"
              :active="categoryState(category) === 'none'"
              @click.stop="() => {
                openPanel(index);
                handleCategoryGlobalSelect(category, false);
              }"
            >None</v-btn>
            </span>
          </div>
      </v-expansion-panel-title>
        <v-expansion-panel-text class="expansion-panel-text">
          <icon-checkbox
            v-for="source in SOURCES_BY_CATEGORY[category]"
            :key="source"
            :label="source"
            :value="source"
            :on-icon="icons[source]"
            :off-icon="icons[source]"
            :on-color="POWER_PLANT_COLORS[source]"
            off-color="gray"
            v-model="selectedSources"
            density="compact"
            hide-details
            hide-icon
          >
          </icon-checkbox>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import type { LayerSpecification, Map } from "maplibre-gl";

import { 
  PrimSource,
  RenewableSources,
  TraditionalSources,
} from "@/assets/power_plants";

import { POWER_PLANT_COLORS } from "@/datasets/addPowerPlants";

import { setLayerVisibility } from "@/maplibre_controls";

interface Props {
  map: Map;
}

const props = defineProps<Props>();

const openPanels = ref<number[]>([]);
const columns = ref(2);
const minColumnWidthPx = 170;

const cssVars = computed(() => ({
  "--column-count": columns.value, 
}));

const PLANT_CATEGORIES = ["Renewables", "Fossil Fuels", "Other"] as const;
type PlantCategory = typeof PLANT_CATEGORIES[number];

const selectedSources = ref<PrimSource[]>(Object.values(PrimSource));

const SOURCES_BY_CATEGORY: Record<PlantCategory, readonly PrimSource[]> = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Renewables: RenewableSources,
  "Fossil Fuels": TraditionalSources,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Other: Object.values(PrimSource).filter(source => 
    !((RenewableSources as unknown as PrimSource[]).includes(source) || 
      (TraditionalSources as unknown as PrimSource[]).includes(source))
  ),
};

const icons: Record<PrimSource, string> = {
  batteries: "mdi-battery-charging",
  biomass: "mdi-campfire",
  coal: "mdi-grill",
  geothermal: "fa-earth-americas",
  hydroelectric: "fa-droplet",
  "natural gas": "mdi-gas-burner",
  nuclear: "fa-atom",
  other: "mdi-circle",
  petroleum: "mdi-gas-station",
  "pumped storage": "mdi-water-pump",
  solar: "fa-solar-panel",
  wind: "mdi-wind-power",
};

type SelectState = "all" | "none" | "some";

const globalState = computed<SelectState>(() => {
  const count = selectedSources.value.length;
  if (count === 0) { 
    return "none"; 
  }
  if (count === Object.values(PrimSource).length) { 
    return "all"; 
  }
  return "some";
});

function categoryState(category: PlantCategory): SelectState {
  const sources = SOURCES_BY_CATEGORY[category];
  const count = sources.filter(source => selectedSources.value.includes(source)).length;
  if (count === 0) { 
    return "none"; 
  }
  if (count === sources.length) { 
    return "all"; 
  }
  return "some";
}

function openPanel(index: number) {
  if (!openPanels.value.includes(index)) {
    openPanels.value.push(index);
  }
}

function openAllPanels() {
  openPanels.value = [...PLANT_CATEGORIES.keys()];
}

// function updateSelectedSources(source: PrimSource, value: boolean) {
//   console.log("updating");
//   const index = selectedSources.value.indexOf(source);
//   if (value && index === -1) {
//     selectedSources.value = [...selectedSources.value, source];
//   } else if (!value && index >= 0) {
//     selectedSources.value = selectedSources.value.slice(0, index).concat(selectedSources.value.slice(index + 1));
//   }
// }

function turnOnPowerPlants() {
  setLayerVisibility(props.map, "power-plants-layer", true);
}

function handleGlobalSelect(value: boolean) {
  selectedSources.value = value ? [...Object.values(PrimSource)] : [];
  turnOnPowerPlants();
}

function handleCategoryGlobalSelect(category: PlantCategory, value: boolean) {
  if (value) {
    // We could update the ref directly and use a deep watcher, but we don't need
    // to trigger UI updates on each push here - better to do it all at the end
    const sources = [...selectedSources.value];
    SOURCES_BY_CATEGORY[category].forEach(source => {
      if (!sources.includes(source)) {
        sources.push(source);
      }
    });
    selectedSources.value = sources;
  } else {
    selectedSources.value = selectedSources.value.filter(item => !SOURCES_BY_CATEGORY[category].includes(item));
  }
  turnOnPowerPlants();
}

let layers: LayerSpecification[] = [];

function onLayersChanged(newLayers: LayerSpecification[]) {
  layers = newLayers;
  applyPrimSourceFilter(selectedSources.value);
}

function updateColumnCount() {
  const container = document.querySelector("#power-plant-filter-controls");
  if (container) {
    columns.value = Math.max(Math.floor(container.clientWidth / minColumnWidthPx), 1);
  }
}


onMounted(() => {

  updateColumnCount();
  const container = document.querySelector("#power-plant-filter-controls");
  if (container) {
    const observer = new ResizeObserver(_entries => updateColumnCount());
    observer.observe(container);
  }

  props.map.on("styledata", () => {
    // check if layers changed
    // console.log('Style data event received');
    const newLayerIds = new Set((props.map.getStyle().layers || []).map(l => l.id));
    const oldLayerIds = new Set(layers.map(l => l.id));
    const hasNewLayers = newLayerIds.size !== oldLayerIds.size || [...newLayerIds].some(id => !oldLayerIds.has(id));
    if (hasNewLayers) {
      // console.log('Style data changed, updating layer list');
      onLayersChanged(props.map.getStyle().layers || []);
    }
    // check layer visibility changes
    const visibilityChanged = layers.some(oldLayer => {
      const newLayer = props.map.getStyle().layers?.find(l => l.id === oldLayer.id);
      return newLayer && oldLayer.layout?.visibility !== newLayer.layout?.visibility;
    });
    if (visibilityChanged) {
      onLayersChanged(props.map.getStyle().layers || []);
    }
  });

  applyPrimSourceFilter(selectedSources.value);
});

watch(selectedSources, (sources: PrimSource[]) => {
  applyPrimSourceFilter(sources);
  turnOnPowerPlants();
});

function applyPrimSourceFilter(sources: PrimSource[]) {
  const layerIds = ["power-plants-layer", "power-plants-heatmap"];
  layerIds.forEach(id => {
    if (!props.map.getLayer(id)) { return; }
  
    if (sources.length === 0) {
      props.map.setFilter(id, false);
    } else if (sources.length === Object.values(PrimSource).length) {
      props.map.setFilter(id, null);
    } else {
      props.map.setFilter(id, ["in", ["get", "PrimSource"], ["literal", sources]]);
    }
  });
}
</script>

<style lang="less">
#power-plant-filter-controls {
  border-radius: 5px;
  margin: 5px;
  width: unset;


.global-filters {
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  border-radius: 5px;
  text-transform: uppercase;
}



.v-expansion-panel-title.expansion-panel-title {
  // display: flex;
  // align-items: center;
  // flex-direction: row;
  // flex-wrap: wrap;
  // gap: 5px;
  padding: 8px 12px;
}



.v-expansion-panel-text.expansion-panel-text > .v-expansion-panel-text__wrapper {
  display: grid;
  grid-template-columns: repeat(var(--column-count), 1fr);
}

}
</style>
