<template>
  <v-dialog
    v-model="dialogOpen"
    max-width="90vw"
    max-height="90vh"
    persistent
    scrollable
  > 
    <v-toolbar flat>
      <v-btn-toggle
        v-model="mode"
        class="ma-4"
        variant="outlined"
        density="compact"
      >
        <v-btn value="aggregate" >Aggregate Data</v-btn>
        <v-btn value="fold" >Fold Data</v-btn>
      </v-btn-toggle>
    </v-toolbar>
    <data-aggregation
      v-if="mode === 'aggregate'"
      v-model="dialogOpen"
      :selection="selection"
      @save="saveAggregation"
    />
      
    <data-folding
      v-if="mode === 'fold'"
      v-model="dialogOpen"
      :selection="selection"
      @save="saveFolded"
    />
  </v-dialog>

  
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { UserDataset } from '../types';

import DataAggregation from './DataAggregation.vue';
import DataFolding from './DataFolding.vue';

interface DataAggregationProps {
  selection: UserDataset | null;
}

const { selection } = defineProps<DataAggregationProps>();
const dialogOpen = defineModel<boolean>('modelValue', { type: Boolean, required: true });


const mode = ref<'aggregate' | 'fold'>('aggregate');

const emit = defineEmits<{
  (event: 'save', aggregatedSelection: UserDataset): void;
}>();

// Save the aggregation
function saveAggregation(selection: UserDataset) {
  emit('save', selection);
}

function saveFolded(selection: UserDataset) {
  // Reuse same save channel for folded selections
  emit('save', selection);
}



</script>

<style scoped>
.v-card {
  height: 100%;
}

.v-row {
  height: 100%;
}

.v-col {
  height: 100%;
}
</style>
