<template>
  <cds-dialog
    v-model="dialogOpen"
    :title="`${selection ? moleculeDescriptor(selection.molecule).shortName.text : 'Graph of'} Quantity vs. Time`"
    density="compact"
    title-color="var(--info-background)"
    max-width="90vw"
    max-height="90vh"
    height="fit-content"
    persistent
    draggable
    :scrim="false"
    :drag-predicate="titleBarPredicate"
  > 
    <new-data-generic-aggregation
      v-if="mode === 'new' && hasSamples"
      v-model="dialogOpen"
      v-model:show-controls="aggControlsVisible"
      :selection="selection"
      @save="saveFolded"
      @plot-click="handlePlotClick"
    />
    <div v-else>
      This dataset has no samples. 
      <br />
      Please create a new dataset by pressing <span class="pa-1" style="background-color: #ffcc33; color: black;">New Dataset</span> on the right.
    </div>
  </cds-dialog>

  
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { UserDataset, UnifiedRegion, MoleculeType} from '../types';
import NewDataGenericAggregation from './DataFoldingAndBinning.vue';
import { moleculeDescriptor } from '@/esri/utils';

import { titleBarPredicate } from "../utils/draggable";


interface DataAggregationProps {
  selection: UserDataset | null;
}

const { selection } = defineProps<DataAggregationProps>();
const dialogOpen = defineModel<boolean>('modelValue', { type: Boolean, required: true });
const aggControlsVisible = ref(false);

const mode = ref<'aggregate' | 'fold' | 'new'>('new');

const hasSamples = computed(() => Object.keys(selection?.samples ?? {}).length > 0);

const emit = defineEmits<{
  (event: 'save', aggregatedSelection: UserDataset): void;
  (event: "plot-click", value: {x: number | string | Date | null, y: number, customdata: unknown, molecule: MoleculeType, region: UnifiedRegion}): void;
}>();


function handlePlotClick(value: {x: number | string | Date | null, y: number, customdata: unknown, molecule: MoleculeType, region: UnifiedRegion}) {
  emit('plot-click', value);
}
// Save the aggregation
// function saveAggregation(selection: UserDataset) {
//   emit('save', selection);
// }

function saveFolded(selection: UserDataset) {
  // Reuse same save channel for folded selections
  emit('save', selection);
}



</script>

<style>


</style>
