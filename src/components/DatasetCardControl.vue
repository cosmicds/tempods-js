<template>
	<dataset-card
  :datasets="datasets"
  :turn-on-selection="turnOnSelection"
  v-model:selected-datasets="selectedDatasets"
  @edit-region="(dataset: UserDataset) => emit('edit-dataset', dataset)"
  >
  <template #action-row="{ dataset }">
        <div
          v-if="(dataset.loading || datasetFailed(dataset))  && !(dataset.timeRange?.type === 'folded' && dataset.plotlyDatasets)"
          class="dataset-loading"
        >
          <hr/>
          <v-progress-linear
            :class="['dataset-loading-progress', datasetFailed(dataset) ? 'dataset-loading-failed' : '']"
            :active="dataset.loading || datasetFailed(dataset)"
            :color="dataset.loading ? 'primary' : 'red'"
            :indeterminate="dataset.loading"
            :value="!dataset.loading ? 100 : 0"
            :striped="!dataset.loading"
            bottom
            rounded
            height="20"
          >
            <template #default>
              <span class="text-subtitle-2">
                {{ dataset.loading ? 'Data Loading' : (datasetFailed(dataset) ? 'Error Loading Data' : '') }}
              </span>
            </template>
          </v-progress-linear>

          <v-tooltip
            v-if="datasetFailed(dataset)"
            text="Remove selection"
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-if="dataset.summary && dataset.summary.successCount === 0"
                v-bind="props"
                size="x-small"
                icon="mdi-trash-can"
                variant="plain"
                @click.stop="() => emit('remove-dataset', dataset)"
              ></v-btn>
            </template>
          </v-tooltip>

          <div v-if="!dataset.loading && datasetFailed(dataset) && !dataset.plotlyDatasets">
            <v-tooltip
              text="Failure info"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="small"
                  icon="mdi-alert"
                  color="red"
                  variant="text"
                  @click.stop="() => sampleErrorId = dataset.id"
                ></v-btn>
              </template>
            </v-tooltip>
          </div>
        </div>

        <v-expand-transition>
          <div
            v-if="!datasetFailed(dataset) || (dataset.summary.successCount > 0)"
            class="selection-icons"
            v-show="(dataset.samples || dataset.plotlyDatasets) && (touchscreen ? openSelection == dataset.id : true)"
          >
            <v-tooltip
              v-if="dataset.timeRange.type === 'single' || dataset.folded"
              text="Show graph"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="x-small"
                  icon="mdi-chart-line"
                  :disabled="!(dataset.samples || dataset.plotlyDatasets)"
                  variant="plain"
                  @click.stop="() => openGraphs[dataset.id] = true"
                ></v-btn>
              </template>
            </v-tooltip>
            <v-tooltip
              v-else
              text="Graph Data"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="x-small"
                  icon="mdi-chart-line"
                  :disabled="!dataset.samples"
                  variant="plain"
                  @click.stop="() => emit('aggregate-dataset', dataset)"
                ></v-btn>
              </template>
            </v-tooltip>
            <v-tooltip
              text="Show table"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="x-small"
                  icon="mdi-table"
                  :disabled="!dataset.samples && !dataset.folded"
                  variant="plain"
                  @click.stop="() => tableSelection = dataset"
                ></v-btn>
              </template>
            </v-tooltip>

            <v-tooltip
              text="Edit Dataset Name / Color"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="x-small"
                  icon="mdi-pencil"
                  variant="plain"
                  @click.stop="() => emit('edit-dataset', dataset)"
                ></v-btn>
              </template>
            </v-tooltip>
            <v-spacer ></v-spacer>
            <v-tooltip
              text="Try loading this data again"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-if="datasetFailed(dataset)"
                  v-bind="props"
                  size="x-small"
                  icon="mdi-refresh"
                  variant="plain"
                  @click.stop="() => emit('retry-dataset', dataset)"
                ></v-btn>
              </template>
            </v-tooltip>
            <v-tooltip
              text="Remove selection"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="x-small"
                  icon="mdi-trash-can"
                  variant="plain"
                  @click.stop="() => emit('remove-dataset', dataset)"
                ></v-btn>
              </template>
            </v-tooltip>
          </div>
          <div v-else class="selection-icons">
            <v-spacer></v-spacer>
            <v-tooltip
              text="Try loading this data again"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-refresh"
                  variant="plain"
                  density="compact"
                  @click.stop="() => emit('retry-dataset', dataset)"
                ></v-btn>
              </template>
            </v-tooltip>
            <v-tooltip
              text="Remove selection"
              location="top"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-trash-can"
                  variant="plain"
                  density="compact"
                  @click.stop="() => emit('remove-dataset', dataset)"
                ></v-btn>
              </template>
            </v-tooltip>
          </div>
        </v-expand-transition>

        <cds-dialog
          :title="`${moleculeDescriptor(dataset.molecule).shortName.text} Quantity vs. Time`"
          v-model="openGraphs[dataset.id]"
          title-color="var(--info-background)"
          draggable
          persistent
          :scrim="false"
          :modal="false"
          max-height="fit-content"
          height="fit-content"
          :drag-predicate="titleBarPredicate"
        >

        <template v-if="(dataset.timeRange.type === 'folded' && dataset.plotlyDatasets) || (dataset.timeRange.type === 'single')">
            <user-dataset-plot
              :dataset="dataset"
              :show-errors="showErrorBands"
              :colors="[dataset.customColor ?? dataset.region.color, '#333']"
              :data-options="[{mode: 'markers'}, {mode: 'markers'}]"
              :names="[`Original Data`, `Binned`]"
              :layout-options="{
                width: 600,
                height: 400,
                autosize: false,
                ...(dataset.folded ? {} : { xaxis: {title: {text: 'Local Time for Region'}}}),
              }"
              :fold-type="dataset.folded?.foldType"
              :timezones="dataset.folded?.timezone"
              :config-options="{responsive: false}"
              @plot-click="(value) => emit('plot-click', {...value, molecule: dataset.molecule, region: dataset.region})"
            />
          </template>
        </cds-dialog>
      </template>
    </dataset-card>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { supportsTouchscreen } from "@cosmicds/vue-toolkit";

import type { UserDataset, MoleculeType, UnifiedRegion } from "../types";
import { moleculeDescriptor } from "../esri/utils";
import { titleBarPredicate } from "../utils/draggable";
import { useTempoStore } from "../stores/app";

import DatasetCard from "./DatasetCard.vue";
import UserDatasetPlot from "./plotly/UserDatasetPlot.vue";

interface DatasetCardControlProps {
  datasets: UserDataset[];
  /** Show the per-dataset selection checkboxes */
  turnOnSelection?: boolean;
  showErrorBands?: boolean;
}

withDefaults(defineProps<DatasetCardControlProps>(), {
  turnOnSelection: false,
  showErrorBands: true,
});

const emit = defineEmits<{
  (event: "edit-dataset", dataset: UserDataset): void;
  (event: "remove-dataset", dataset: UserDataset): void;
  (event: "retry-dataset", dataset: UserDataset): void;
  (event: "aggregate-dataset", dataset: UserDataset): void;
  (event: "plot-click", value: {x: number | string | Date | null, y: number, customdata: unknown, molecule: MoleculeType, region: UnifiedRegion}): void;
}>();


const selectedDatasets = defineModel<string[]>("selectedDatasets", { default: () => [] });
/** id of the dataset whose error dialog should be shown (just a generic dialog for now */
const sampleErrorId = defineModel<string | null>("sampleErrorId", { default: null });
/** on touchscreens, id of the dataset whose action row is expanded */
const openSelection = defineModel<string | null>("openSelection", { default: null });
/** dataset shown in the table dialog */
const tableSelection = defineModel<UserDataset | null>("tableSelection", { default: null });

const touchscreen = supportsTouchscreen();

const store = useTempoStore();

/** a dataset that came back empty is only a failure if the fetch actually reported errors */
function datasetFailed(dataset: UserDataset): boolean {
  console.log("datasetFailed", dataset.id, store.sampleErrors[dataset.id], dataset.summary);
  return !!store.sampleErrors[dataset.id];
}

/** per-dataset graph dialog state, keyed by dataset id */
const openGraphs = ref<Record<string, boolean>>({});
</script>

<style scoped lang="less">
.selection-icons {
  display: flex;
}

.dataset-loading {
  display: flex;
  align-items: center;
}
</style>
