<template>
  <div class="about-data">
    <div
      v-for="layerId in Object.keys(layerNames)"
      :key="layerId"
      class="about-data-item"
    >
      <h3 v-html="layerInfo[layerId].title"></h3>
      <p v-html="layerInfo[layerId].description"></p>
      <p class="mt-1" v-html="layerInfo[layerId].source"></p>
      <p v-html="layerInfo[layerId].da"></p>
    </div>
  </div>
</template>

<script setup lang="ts">

import { layerInfo } from '@/datasets/layerData';

const layerNames: Record<string, string | undefined> = {
  "tempo-no2": "TEMPO NO2",
  'tempo-hcho': "TEMPO HCHO",
  'tempo-o3': "TEMPO Ozone, Total Column",
  'tempo-o3trop': "TEMPO Ozone, 0–2 km (BETA)",
  "aqi-layer-aqi": "Air Quality Index",
  "power-plants-layer": "Power Plants",
  "pop-dens": "Population Density",
  "land-use": "Land Use",
  "hms-fire": "Fire Detections",
  "places-asthma-counties": "Asthma Prevalence",
  "tempo-lite": "TEMPO NO2 (alt)",
};


</script>

<style scoped>
.about-data {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}

.about-data-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  padding-bottom: 1.5rem;
}

.about-data-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.layer-name {
  margin-bottom: 0.5rem;
}
</style>
