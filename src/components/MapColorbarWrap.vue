<template>
  <div :class="[horizontal ? 'map-colorbar-wrap-horizontal' : 'map-colorbar-wrap']">
    <colorbar-horizontal
      v-if="horizontal"
      backgroundColor="transparent"
      :nsteps="255"
      :cmap="currentColormap"
      :cmapName="colorMap"
      :start-value="startValue"
      :end-value="endValue"
      :extend="true"
    >
      <template v-slot:label>
        <div v-if="scalePower !== 0" style="text-align: center;">
          Amount of <span v-html="moleculeLabel"></span>
          <span class="unit-label">(10<sup>{{ scalePower }}</sup> molecules/cm<sup>2</sup>)</span>
        </div>
        <div v-else style="text-align: center;">
          Amount of <span v-html="moleculeLabel"></span>
          <span class="unit-label"> molecules/cm<sup>2</sup></span>
        </div>
      </template>
    </colorbar-horizontal>

    <slot />

    <colorbar
      v-if="!horizontal"
      backgroundColor="transparent"
      :nsteps="255"
      :cmap="currentColormap"
      :cmapName="colorMap"
      :start-value="startValue"
      :end-value="endValue"
      :extend="true"
    >
      <template v-slot:label>
        <div v-if="scalePower !== 0" style="text-align: center;">
          Amount of <span v-html="moleculeLabel"></span>
          <span class="unit-label">(10<sup>{{ scalePower }}</sup> molecules/cm<sup>2</sup>)</span>
        </div>
        <div v-else style="text-align: center;">
          Amount of <span v-html="moleculeLabel"></span>
          <span class="unit-label">(molecules/cm<sup>2</sup>)</span>
        </div>
      </template>
    </colorbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  horizontal: boolean;
  currentColormap: (x: number) => string;
  colorMap: string;
  startValue: number;
  endValue: number;
  moleculeLabel: string; // can contain html
  cbarScale: number;
}
const props = defineProps<Props>();

const scalePower = computed(() => {
  const p = Math.log10(props.cbarScale);
  return Number.isFinite(p) ? p : 0;
});
</script>

<style lang="less">

// hopefully unobtrusive wrapper 😬
.map-colorbar-wrap {
  position: relative;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
}
.map-colorbar-wrap-horizontal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}


// the main colorbar containers
.colorbar-container {
  flex-grow: 0;
  flex-shrink: 1;

  .unit-label {
    font-size: .95em;
  }
}

.colorbar-container-horizontal {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  z-index: 5000;
  --height: 0.75rem;
}

// fix the sub/sup alignment in the colorbar labels
.colorbar-container sub {
  vertical-align: sub !important;
  line-height: 1.25 !important;
}

.colorbar-container sup {
  vertical-align: super !important;
  line-height: 1.25 !important;
}

.colorbar-container sub,
.colorbar-container sup {
  top: 0 !important;
}

</style>
