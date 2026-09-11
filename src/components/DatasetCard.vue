<template>
  <v-list density="compact">
    <!-- <v-hover
      v-slot="{ isHovering, props }"
      v-for="(dataset, num) in datesetsWithNotFoldedFisrt"
      :key="dataset.id"
    >  -->
      <!-- create a checkbox input that will -->
    
      <v-list-item
      v-for="(dataset, num) in datesetsWithNotFoldedFisrt"
        :key="dataset.id"
        :ref="(el) => datasetRowRefs[dataset.id] = el"
        class="selection-item my-2 rounded-lg px-2"
        :style="{ 'background-color': isFolded(dataset) ? '#333' : '#999', 'color': isFolded(dataset) ? '#fff' : '#000' }"
        :ripple="touchscreen"
        density="compact"
        slim
        @click="showDetails[num] = !showDetails[num]"
      >
        <template v-slot:prepend v-if="turnOnSelection">
          <v-checkbox
            v-model="selectedDatasets"
            :value="dataset.id"
            @click.stop
            hide-details
            density="compact"
          />
        </template>
        <template #default>
          <div>
            <v-chip
              class="dataset-name-chip my-1"
              size="small" 
              variant="flat"
              elevation="1"
              :color="dataset.customColor ?? dataset.region.color"
              @click="emit('editRegion', dataset)"
              :title="dataset.name ?? dataset.region.name"
              >
              {{ dataset.name ?? dataset.region.name }}
            </v-chip>
            <!-- add show/hide details button -->
            <v-btn
              class="float-right"
              :icon="showDetails[num] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              variant="text"
              density="compact"
              v-tooltip:top="showDetails[num] ? 'Hide Details' : 'Show details'"
              @click.stop="showDetails[num] = !showDetails[num]"
            >
            </v-btn>
            <v-expand-transition>
              <!-- add || isHovering to put back hover behavior -->
              <div v-if="showDetails[num]" class="d-flex flex-wrap align-center ga-1 mb-1">
                <v-chip 
                  label
                  size="small" 
                  variant="flat"  
                  :color="dataset.region.color"
                  >
                  {{ dataset.region.name }}
                </v-chip>
                
                <v-chip label size="small" >
                  <span class="molecule-label">
                    {{ moleculeName(dataset.molecule) }}
                  </span>
                </v-chip>
                
                <v-tooltip :text="dataset.timeRange.description">
                  <template #activator="{props}">
                    <v-chip 
                      v-bind="props" 
                      label 
                      size="small"
                      >
                      {{ dataset.timeRange.name }}
                    </v-chip> 
                  </template>
                </v-tooltip>
                <!-- <div class="d-inline-block text-caption dataset-patttern-chip"
                  v-if="dataset.timeRange" 
                  >
                  <span>{{ dataset.timeRange.name }}</span>
                </div> -->
              </div>
            </v-expand-transition>
          </div>
          <!-- this is where the actions will go -->
          <slot name="action-row" :isHovering="true" :dataset="dataset">
          </slot>
        </template>
      </v-list-item>
    <!-- </v-hover> -->
  </v-list>


</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { supportsTouchscreen } from "@cosmicds/vue-toolkit";
import type { UserDataset } from "../types";
import { useTempoStore } from "../stores/app";
import { moleculeName } from "../esri/utils";


const store = useTempoStore();

interface DatasetCardProps {
  datasets: UserDataset[];
  turnOnSelection?: boolean;
}
const { datasets, turnOnSelection } = defineProps<DatasetCardProps>();

// create a selectedDatasets model, to hold selectedDatsets use (defineModel). should just store the dataset.id values
const selectedDatasets = defineModel<string[]>('selectedDatasets', {
  type: Array as () => string[],
  default: () => [],
});

const emit = defineEmits<{
  (event: 'editRegion', value: UserDataset): void;
}>();

const touchscreen = supportsTouchscreen();


const openGraphs = ref<Record<string,boolean>>({});



const datasetRowRefs = ref({});

function isFolded(dataset: UserDataset): boolean {
  return !!(dataset.timeRange && dataset.timeRange.type === 'folded');
}


const datesetsWithNotFoldedFisrt = computed(() => {
  return [...datasets].sort((a, b) => {
    const aFolded = isFolded(a) ? 1 : 0;
    const bFolded = isFolded(b) ? 1 : 0;
    return aFolded - bFolded;
  });
});


function _removeDataset(dataset: UserDataset) {
  store.deleteDataset(dataset);

  delete openGraphs[dataset.id];
  delete datasetRowRefs[dataset.id];
}

const showDetails = ref([...datasets.map(() => false)]);
</script>

<style scoped lang="less">
.dataset-patttern-chip {
  text-wrap: auto;
  background-color: #878787;
  border-radius: 4px;
  padding: 2px 6px;
}
.dataset-patttern-chip > span {
  opacity: 1;
  color: black;
}

.dataset-name-chip {
  cursor:text;
}

.dataset-name-chip > :deep(.v-chip__content) {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

.v-list-item--density-compact.v-list-item--one-line {
  min-height: unset;
}

.mol-label {
  --size: 3em;
  width: var(--size);
  height: var(--size);
}


</style>
