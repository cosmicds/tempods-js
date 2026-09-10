<template>
  <div class="comparison-data-controls">
    <div class="my-3">
      Choose datasets to view with the TEMPO Data. 
      <ul class="cdc-instruction">
        <li>Drag cards to re-order data layers.</li>
        <li>Use slider to adjust layer opacity.</li>
      </ul>
    </div>
    <div
      v-for="(map, index) in maps"
      :key="index"
      class="mx-1"
    >
      <layer-order-control
        :mapRef="map"
        :order="['power-plants-layer', 'places-asthma-counties', 'places-asthma-tracts', 'aqi-layer-aqi', 'pop-dens', 'land-use','hms-fire', 'tempo-o3', 'tempo-o3trop', 'tempo-hcho', 'tempo-no2', 'tempo-lite', 'stamen-toner-lines', 'stamen-toner-labels']"
      >
      </layer-order-control>
      <!-- center with d-block mx-auto -->
      <v-btn
        class="my-2 d-block mx-auto"
        @click="showAdvancedLayers = !showAdvancedLayers"
        @keyup.enter="showAdvancedLayers = !showAdvancedLayers"
        :text="showAdvancedLayers ? 'Show me less' : 'Show me more!'"
        density="compact"
        hide-details
        :color="accentColor2"
      >
      </v-btn>
      <v-checkbox
        v-if="showAdvancedLayers"
        v-model="showRGBMode"
        label="Use single-color TEMPO layers"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <v-checkbox
        v-if="showAdvancedLayers"
        v-model="showFieldOfRegard"
        label="Show TEMPO field of regard"
        density="compact"
        hide-details
      >
      </v-checkbox>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useTempoStore } from "@/stores/app";


const store = useTempoStore();
const {
  maps,
  showFieldOfRegard,
  showAdvancedLayers,
  showRGBMode,
  accentColor2
} = storeToRefs(store);

</script>

<style scoped lang="less">
.comparison-data-controls {
  font-size: 11pt !important;
  min-width: 250px;
  overflow-y: auto;
}

:deep(.v-checkbox .v-label) {
  font-size: 10pt;
}

.comparison-data-controls ul.cdc-instruction {
  font-size: 0.8em;
  list-style-type: disc;
  list-style-position: outside;
  margin-left: 1.2em;
}
</style>
