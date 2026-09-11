<template>    
    <div class="multi-plot-container scroll-y">
      <div class="multi-plot-container__plot"  v-for="(group, index) in datasetsGroupedByMolecule" :key="group[0]">
        <MultiDatasetPlot
          :datasets="group[1]"
          :open="false"
          :first-open="index === 0"
          :show-errors="true"
          :data-options="[{mode: 'markers'}]"
          :layout-options="commonLayoutOptions"
          :config-options="commonConfigOptions"
          @plot-click="(value) => emit('plot-click', value)"
        />
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { UserDataset } from '@/types';
import type { Config, Layout } from 'plotly.js-dist-min';
import MultiDatasetPlot from './MultiDatasetPlot.vue';
import { DEFAULT_PLOT_CONFIG, DEFAULT_PLOT_LAYOUT } from "@/components/plotly/defaults";
import { deepMerge } from './plotly_styles';

interface MultiPlotProps {
  datasets: UserDataset[];
}



const { datasets } = defineProps<MultiPlotProps>();
  
const emit = defineEmits<{
  (event: "plot-click", value: {x: number | string | Date | null, y: number, customdata: unknown}): void;
}>();

const _showErrorBands = ref(datasets.map((d) => d.folded ? true : false));

// Common layout options for all plots
const commonLayoutOptions: Partial<Layout> = deepMerge(
  DEFAULT_PLOT_LAYOUT,
  {
    autosize: false,
    height: 350,
    width: Math.floor(700 * 350 / 400),
    margin: { t: 10, r: 30, b: 60, l: 80 },
    xaxis: {
      automargin: false,
      gridcolor: 'rgba(128, 128, 128, 0.3)',
      title: {
        standoff: 22,
      },
    },
    yaxis: {
      automargin: true,
      gridcolor: 'rgba(128, 128, 128, 0.3)',
      title: {
        standoff: 10,
      },
    },
  });

// Common config options for all plots
const commonConfigOptions: Partial<Config> = {
  ...DEFAULT_PLOT_CONFIG,
  responsive: true,
};

// const groupByMolecule = ref(false);

const datasetsGroupedByMolecule = computed(() => {
  const groups = new Map<string, UserDataset[]>();
  datasets.forEach((dataset) => {
    const molecule = dataset.molecule || 'Unknown Molecule';
    if (!groups.has(molecule)) {
      groups.set(molecule, []);
    }
    groups.get(molecule)!.push(dataset);
  });
  return groups;
});


</script>

<style>
div.multi-plot-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  max-height: calc(90vh - 100px);
  align-items: center;
  width: 100%;
}

div.multi-plot-container__plot {
  width: 600px;
  display: flex;
  flex-direction: column;
  min-width: 438px;
}

</style>
