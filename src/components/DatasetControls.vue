<template>
  <div id="dataset-sections">
    <h2>Investigate Patterns with Time</h2>
    <div id="add-region-time">
      <v-expansion-panels
        v-model="openPanels"
        variant="accordion"
        id="user-options-panels"
        multiple
        class="pl-3"
      >
        <v-expansion-panel
          title="Time Ranges"
          class="mt-3 h3-panel-titles"
        >
          <template #text>
            <v-btn
              size="small"
              :active="createTimeRangeActive"
              :color="accentColor2"
              @click="createTimeRangeActive = !createTimeRangeActive"
            >
              <template #prepend>
                <v-icon v-if="!createTimeRangeActive" icon="mdi-plus"></v-icon>
              </template>
              {{ createTimeRangeActive ? "Cancel" : "New Time Range" }}
            </v-btn>
            <date-time-range-selection
              v-if="createTimeRangeActive"
              :current-date="singleDateSelected"
              :selected-timezone="selectedTimezone"
              :allowed-dates="uniqueDays"
              @ranges-change="handleDateTimeRangeSelectionChange"
            />
            <div class="my-selections" v-if="timeRanges.length>0" style="margin-top: 1em;">
              <h4>My Time Ranges</h4>
              <v-list>
                <v-list-item
                  v-for="(timeRange, index) in timeRanges"
                  :key="index"
                  :title="timeRange.name === 'Displayed Day' ? `Displayed Day: ${ formatTimeRange(timeRange.range) }`  : formatTimeRange(timeRange.range)"
                  style="background-color: #444444"
                >

                  <template #append>
                    <v-btn
                      v-if="timeRange.id !== 'displayed-day' && !datasets.some(s => areEquivalentTimeRanges(s.timeRange, timeRange))"
                      variant="plain"
                      v-tooltip="'Delete'"
                      icon="mdi-delete"
                      color="white"
                      @click="() => store.deleteTimeRange(timeRange)"
                    >
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </template>
        </v-expansion-panel>
        <v-expansion-panel
          title="Regions"
          class="mt-3 h3-panel-titles"
        >
          <template #text>
            <div id="add-region-buttons">
              <v-btn
                size="small"
                :active="selectionActive === 'rectangle'"
                :disabled="selectionActive === 'point'"
                :color="accentColor2"
                @click="() => {
                  selectionActive = (selectionActive === 'rectangle') ? null : 'rectangle';
                }"
              >
                <template #prepend>
                  <v-icon v-if="selectionActive !== 'rectangle'" icon="mdi-plus"></v-icon>
                </template>
                {{ selectionActive === 'rectangle' ? "Cancel" : "New Region" }}
              </v-btn>
            </div>
            <div class="my-selections" v-if="regions.length>0" style="margin-top: 1em;">
            <h4>My Regions</h4>                   
              <v-list>
                <v-list-item
                  v-for="(region, index) in regions"
                  :key="index"
                  :title="region.name"
                  :style="{ 'background-color': region.color }"
                  @click="() => lastFocusedRegion = region"
                >
                  <template #append>
                    <!-- New: Edit Geometry button (disabled if any selection using region has samples) -->
                    <!-- <v-btn
                      variant="plain"
                      :icon="region.geometryType === 'rectangle' ? 'mdi-select' : 'mdi-plus'"
                      color="white"
                      :disabled="regionHasSamples(region as UnifiedRegionType)"
                      v-tooltip="regionHasSamples(region as UnifiedRegionType) ? 'Cannot edit geometry after samples are fetched for a selection using this region' : 'Edit Geometry'"
                      @click="() => editRegionGeometry(region as UnifiedRegionType)"
                    ></v-btn> -->
                    <v-btn
                      variant="plain"
                      v-tooltip="'Edit Name'"
                      icon="mdi-pencil"
                      color="white"
                      @click="() => editRegionName(region as UnifiedRegionType)"
                    ></v-btn>
                    <v-btn
                      v-if="!store.regionHasDatasets(region as UnifiedRegionType)"
                      variant="plain"
                      v-tooltip="'Delete'"
                      icon="mdi-delete"
                      color="white"
                      @click="() => store.deleteRegion(region as UnifiedRegionType)"
                    ></v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </template>
        </v-expansion-panel>

        <v-divider
          class="mt-3"
          opacity="1"
        >
        </v-divider>

        <v-expansion-panel
          title="Datasets"
          class="mt-3 h3-panel-titles"
        >
        <template #text>
          <v-btn
            size="small"
            :active="createDatasetActive"
            :color="accentColor2"                    
            @click="createDatasetActive = !createDatasetActive"
            class="mt-3"
          >
            <template #prepend>
              <v-icon v-if="!createDatasetActive" icon="mdi-plus"></v-icon>
            </template>
            {{ createDatasetActive ? "Cancel" : "New Dataset" }}
          </v-btn>
          <selection-composer
            v-show="createDatasetActive"
            :backend="backend"
            :time-ranges="timeRanges"
            :regions="regions"
            :disabled="{ region: selectionActive === 'rectangle', point: selectionActive === 'point', timeRange: createTimeRangeActive }"
            @create="handleDatasetCreated"
          >
          </selection-composer>
          <div class="my-selections" v-if="datasets.length>0" style="margin-top: 1em;">

            <h4>My Datasets</h4>
            <v-list>
              <v-hover
                v-slot="{ isHovering, props }"
                v-for="dataset in datasets"
                :key="dataset.id"
              >
                <v-list-item
                  v-bind="props"
                  :ref="(el) => datasetRowRefs[dataset.id] = el"
                  class="selection-item my-2"
                  :style="{ 'background-color': dataset.region.color }"
                  :ripple="touchscreen"
                  @click="() => {
                    if (touchscreen) {
                      openSelection = (openSelection == dataset.id) ? null : dataset.id;
                    }
                  }"
                  lines="two"
                >
                  <template #default>
                    <div>
                      <v-chip size="small">{{ dataset.region.name }}</v-chip>
                      <v-chip size="small">{{ moleculeName(dataset.molecule) }}</v-chip>
                      <v-chip v-if="dataset.timeRange" size="small" class="text-caption">
                        {{ dataset.timeRange.description }}
                      </v-chip>
                      <v-chip v-if="dataset.timeRange" size="small" class="text-caption">
                        {{ dataset.timeRange?.type ?? 'no type' }}
                      </v-chip>
                    </div>
                    <div
                      v-if="(dataset.loading || !dataset.samples)  && !(dataset.timeRange?.type === 'folded' && dataset.plotlyDatasets)"
                      class="dataset-loading"
                    >
                      <v-progress-linear
                        :class="['dataset-loading-progress', !(dataset.loading && dataset.samples) ? 'dataset-loading-failed' : '']"
                        :active="dataset.loading || !dataset.samples"
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
                            {{ dataset.loading ? 'Data Loading' : (!dataset.samples ? 'Error Loading Data' : '') }}
                          </span>
                        </template>
                      </v-progress-linear>
                      <div v-if="!(dataset.loading || dataset.samples || dataset.plotlyDatasets)">
                        <v-tooltip
                          text="Failure info"
                          location="top"
                        >
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              size="x-small"
                              icon="mdi-help-circle"
                              variant="plain"
                              @click="() => sampleErrorID = dataset.id"
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
                              @click="() => removeDataset(dataset)"
                            ></v-btn>
                          </template>
                        </v-tooltip>
                      </div>
                    </div>

                    <v-expand-transition>
                      <div
                        class="selection-icons"
                        v-show="(dataset.samples || dataset.plotlyDatasets) && (touchscreen ? openSelection == dataset.id : isHovering)"
                      >
                        <v-tooltip
                          text="Get Center Point Sample"
                          location="top"
                        >
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              size="x-small"
                              :loading="loadingPointSample === dataset.id"
                              icon="mdi-image-filter-center-focus"
                              variant="plain"
                              @click="() => store.fetchCenterPointDataForDataset(dataset)"
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
                              :disabled="!dataset.samples"
                              variant="plain"
                              @click="() => tableSelection = dataset"
                            ></v-btn>
                          </template>
                        </v-tooltip>
                        <v-tooltip
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
                              @click="() => openGraphs[dataset.id] = true"
                            ></v-btn>
                          </template>
                        </v-tooltip>
                        <v-tooltip
                          v-if="dataset.timeRange.type === 'pattern' || dataset.timeRange.type === 'daterange'"
                          text="Aggregate Data"
                          location="top"
                        >
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              size="x-small"
                              icon="mdi-chart-box"
                              :disabled="!dataset.samples"
                              variant="plain"
                              @click="() => openAggregationDialog(dataset)"
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
                              @click="() => removeDataset(dataset)"
                            ></v-btn>
                          </template>
                        </v-tooltip>
                      </div>
                    </v-expand-transition>
                    <cds-dialog
                      :title="graphTitle(dataset)"
                      v-model="openGraphs[dataset.id]"
                      title-color="#F44336"
                      draggable
                      persistent
                      :scrim="false"
                      :modal="false"
                      :drag-predicate="plotlyDragPredicate"
                    >
                      <v-checkbox
                        v-model="showErrorBands"
                        label="Show Errors"
                        density="compact"
                        hide-details
                      >
                      </v-checkbox>
                      <template v-if="dataset.timeRange.type === 'folded' && dataset.plotlyDatasets">
                        <plotly-graph
                          :datasets="dataset.plotlyDatasets"
                          :show-errors="showErrorBands"
                          :colors="[dataset.region.color, '#333']"
                          :data-options="[{mode: 'markers'}, {mode: 'lines+markers'}]"
                        />
                      </template>
                      <template v-else>
                        <timeseries-graph
                          :data="dataset ? [dataset] : []"
                          :show-errors="showErrorBands"
                        />
                      </template>
                    </cds-dialog>
                    <v-dialog
                      :model-value="sampleErrorID !== null"
                      max-width="50%"
                    >
                      <v-card>
                        <v-toolbar
                          density="compact"
                        >
                          <v-toolbar-title text="Error Loading Data"></v-toolbar-title>
                          <v-spacer></v-spacer>
                          <v-btn
                            icon="mdi-close"
                            @click="sampleErrorID = null"
                          >
                          </v-btn>
                        </v-toolbar>
                        <v-card-text>
                          There was an error loading data for this selection. Either there is no data for the
                          region/time range/molecule combination that you selected, or there was an error loading
                          data from the server. You can delete this selection and try making a new one.
                        </v-card-text>
                      </v-card>
                    </v-dialog>
                  </template>
                </v-list-item>
              </v-hover>
            </v-list>
          </div>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
    </div>

    <div class="d-flex flex-wrap flex-row ma-2 align-center justify-center ga-1">
    <v-btn v-if="no2GraphData.length > 0" @click="showNO2Graph = true">
      Show NO₂ Graph
    </v-btn>
    <cds-dialog
      title="Nitrogen Dioxide Data"
      v-model="showNO2Graph"
      draggable
      persistent
      :modal="false"
      :scrim="false"
      :drag-predicate="plotlyDragPredicate"
    >
      <v-checkbox
        v-model="showErrorBands"
        label="Show Errors"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <timeseries-graph
        :data="no2GraphData.length > 0 ? no2GraphData : []"
        :show-errors="showErrorBands"
      />
    </cds-dialog>

    <v-btn v-if="o3GraphData.length > 0" @click="showO3Graph = true">
      Show Ozone Graph
    </v-btn>
    <cds-dialog
      title="Ozone Data"
      v-model="showO3Graph"
      draggable
      persistent
      :modal="false"
      :scrim="false"
      :drag-predicate="plotlyDragPredicate"
    >
      <v-checkbox
        v-model="showErrorBands"
        label="Show Errors"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <timeseries-graph
        :data="o3GraphData.length > 0 ? o3GraphData : []"
        :show-errors="showErrorBands"
      />
    </cds-dialog>
    
    <v-btn v-if="hchoGraphData.length > 0" @click="showHCHOGraph = true">
      Show Formaldehyde Graph
    </v-btn>
    <cds-dialog
      title="Formaldehyde Data"
      v-model="showHCHOGraph"
      draggable
      persistent
      :modal="false"
      :scrim="false"
      :drag-predicate="plotlyDragPredicate"
    >
      <v-checkbox
        v-model="showErrorBands"
        label="Show Errors"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <timeseries-graph
        :data="hchoGraphData.length > 0 ? hchoGraphData : []"
        :show-errors="showErrorBands"
      />
    </cds-dialog>
    
    <v-btn v-if="no2foldedGraphData.length > 0" @click="showfoldedNO2Graph = true">
      Show Folded NO₂ Data
    </v-btn>
    <cds-dialog
      title="Nitrogen Dioxide Data"
      v-model="showfoldedNO2Graph"
      draggable
      persistent
      :modal="false"
      :scrim="false"
      :drag-predicate="plotlyDragPredicate"
    >
      <v-checkbox
        v-model="showErrorBands"
        label="Show Errors"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <plotly-graph
        :datasets="no2foldedGraphData.length > 0 ? no2foldedGraphData : []"
        :show-errors="showErrorBands"
        :colors="['#FF5733', '#333']"
        :data-options="[{mode: 'markers'}, {mode: 'lines+markers'}]"
      />
    </cds-dialog>

    <v-btn v-if="o3foldedGraphData.length > 0" @click="showfoldedO3Graph = true">
      Show Folded O₃ Data
    </v-btn>
    <cds-dialog
      title="Ozone Data"
      v-model="showfoldedO3Graph"
      draggable
      persistent
      :modal="false"
      :scrim="false"
      :drag-predicate="plotlyDragPredicate"
    >
      <v-checkbox
        v-model="showErrorBands"
        label="Show Errors"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <plotly-graph
        :datasets="o3foldedGraphData.length > 0 ? o3foldedGraphData : []"
        :show-errors="showErrorBands"
        :colors="['#FF5733', '#333']"
        :data-options="[{mode: 'markers'}, {mode: 'lines+markers'}]"
      />
    </cds-dialog>

    <v-btn v-if="hchofoldedGraphData.length > 0" @click="showfoldedHCHOGraph = true">
      Show Folded HCHO Data
    </v-btn>
    <cds-dialog
      title="Formaldehyde Data"
      v-model="showfoldedHCHOGraph"
      draggable
      persistent
      :modal="false"
      :scrim="false"
      :drag-predicate="plotlyDragPredicate"
    >
      <v-checkbox
        v-model="showErrorBands"
        label="Show Errors"
        density="compact"
        hide-details
      >
      </v-checkbox>
      <plotly-graph
        :datasets="hchofoldedGraphData.length > 0 ? hchofoldedGraphData : []"
        :show-errors="showErrorBands"
        :colors="['#FF5733', '#333']"
        :data-options="[{mode: 'markers'}, {mode: 'lines+markers'}]"
      />
    </cds-dialog>
    </div>

    <v-dialog
      v-model="showEditRegionNameDialog"
    >
      <!-- text field that requires a confirmation -->
        <c-text-field
          label="Region Name"
          title="Enter a new name for this region"
          hide-details
          dense
          :button-color="accentColor"
          @confirm="(name: string) => {
            if (regionBeingEdited) {
              store.setRegionName(regionBeingEdited as UnifiedRegionType, name);
              showEditRegionNameDialog = false;
            }
          }"
          @cancel="() => {
            showEditRegionNameDialog = false;
            regionBeingEdited = null;
          }"
        ></c-text-field>

        </v-dialog>
        
    <!-- Data Aggregation Dialog -->
    <advanced-operations
      v-model="showAggregationDialog"
      :selection="aggregationDataset"
      @save="handleAggregationSaved"
    />

  </div>

</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { v4 } from "uuid";
import { supportsTouchscreen } from "@cosmicds/vue-toolkit";

import type { MillisecondRange, TimeRange, UserDataset, UnifiedRegion } from "../types";
import { useTempoStore } from "../stores/app";
import { moleculeName, MOLECULE_OPTIONS } from "../esri/utils";
import { areEquivalentTimeRanges, formatTimeRange } from "../utils/timeRange";
import { atleast1d } from "../utils/atleast1d";

import DateTimeRangeSelection from "../date_time_range_selection/DateTimeRangeSelection.vue";
import AdvancedOperations from "./AdvancedOperations.vue";
import { TimeRangeSelectionType } from "@/types/datetime";
import PlotlyGraph from "./PlotlyGraph.vue";
import CTextField from "./CTextField.vue";

type UnifiedRegionType = UnifiedRegion<typeof backend.value>;

const store = useTempoStore();
const {
  accentColor,
  accentColor2,
  backend,
  regions,
  datasets,
  timeRanges,
  singleDateSelected,
  selectedTimezone,
  uniqueDays,
  selectionActive,
  lastFocusedRegion,
} = storeToRefs(store);

function plotlyDragPredicate(element: HTMLElement): boolean {
  return element.closest(".plotly") === null;
}

const touchscreen = supportsTouchscreen();

const openPanels = ref<number[]>([]);
const openGraphs = ref<Record<string,boolean>>({});
const openSelection = ref<string | null>(null);
const tableSelection = ref<UserDataset | null>(null);

const createTimeRangeActive = ref(false);
const createDatasetActive = ref(false);
const datasetRowRefs = ref({});
const sampleErrorID = ref<string | null>(null);
const loadingPointSample = ref<string | false>(false);

const showEditRegionNameDialog = ref(false);
const regionBeingEdited = ref<UnifiedRegionType | null>(null);

const aggregationDataset = ref<UserDataset | null>(null);
const showAggregationDialog = ref(false);
function openAggregationDialog(selection: UserDataset) {
  aggregationDataset.value = selection;
  showAggregationDialog.value = true;
}
function handleAggregationSaved(aggregatedSelection: UserDataset) {
  store.addDataset(aggregatedSelection, false); // no need to fetch anything
  showAggregationDialog.value = false;
  aggregationDataset.value = null;
}

function handleDatasetCreated(dataset: UserDataset) {
  store.addDataset(dataset);
  createDatasetActive.value = false;
}

function removeDataset(dataset: UserDataset) {
  store.deleteDataset(dataset);

  delete openGraphs[dataset.id];
  delete datasetRowRefs[dataset.id];
}

function handleDateTimeRangeSelectionChange(timeRanges: MillisecondRange[], selectionType: TimeRangeSelectionType) {
  if (!Array.isArray(timeRanges) || timeRanges.length === 0) {
    console.error('No time ranges received from DateTimeRangeSelection');
    return;
  }
  const normalized = atleast1d(timeRanges);
  // No dedup tracking now
  // Build description based on selection type
  let descriptionBase = 'Custom';
  switch (selectionType) {
  case 'weekday':
    descriptionBase = 'Weekday Pattern';
    break;
  case 'daterange':
    descriptionBase = 'Date Range';
    break;
  case 'singledate':
    descriptionBase = 'Single Date';
    break;
  case 'pattern':
    descriptionBase = 'Pattern';
    break;
  }
  const formatted = formatTimeRange(normalized);
  const description = `${descriptionBase} (${formatted})`;
  const tr: TimeRange = {
    id: v4(),
    name: formatted,
    description,
    range: normalized.length === 1 ? normalized[0] : normalized,
    type: selectionType,
  };
  store.addTimeRange(tr);

  createTimeRangeActive.value = false;
  console.log(`Registered ${tr.name}: ${tr.description}`);
}

function editRegionName(region: UnifiedRegionType) {
  console.log(`Editing ${region.geometryType}: ${region.name}`);
  // Set the region to edit

  // eslint-disable-next-line
  // @ts-ignore it is not actually deep
  const existing = (regions.value as UnifiedRegionType[]).find(r => r.id === region.id);
  if (!existing) {
    console.error(`Region with ID ${region.id} not found.`);
    return;
  }
  regionBeingEdited.value = region;
  // Open dialog for renaming
  showEditRegionNameDialog.value = true;
}

function graphTitle(dataset: UserDataset): string {
  const molecule = dataset.molecule;
  const molTitle = MOLECULE_OPTIONS.find(m => m.value === molecule)?.title || '';
  return `${molTitle} Time Series for ${dataset.region.name}`;
}

const showNO2Graph = ref(false);
const no2GraphData = computed(() =>{
  return datasets.value.filter(s => s.molecule.includes('no2') && store.datasetHasSamples(s));
});

// ozone version
const showO3Graph = ref(false);
const o3GraphData = computed(() =>{
  return datasets.value.filter(s => s.molecule.includes('o3') && store.datasetHasSamples(s));
});


// formaldehyde version
const showHCHOGraph = ref(false);
const hchoGraphData = computed(() =>{
  return datasets.value.filter(s => s.molecule.includes('hcho') && store.datasetHasSamples(s));
});


const showfoldedNO2Graph = ref(false);
const no2foldedGraphData = computed(() =>{
  const validFoldedDatasets = datasets.value
    .filter(
      s => s.molecule.includes('no2') && 
      s.timeRange?.type === 'folded' && 
      s.plotlyDatasets && 
      s.plotlyDatasets.length > 0
    );
  return validFoldedDatasets.map(s => s.plotlyDatasets![1]); // "!" tells TS that we know it's not undefined
});

const showfoldedO3Graph = ref(false);
const o3foldedGraphData = computed(() =>{
  const validFoldedDatasets = datasets.value
    .filter(
      s => s.molecule.includes('o3') && 
      s.timeRange?.type === 'folded' && 
      s.plotlyDatasets && 
      s.plotlyDatasets.length > 0
    );
  return validFoldedDatasets.map(s => s.plotlyDatasets![1]); // "!" tells TS that we know it's not undefined
}); 

const showfoldedHCHOGraph = ref(false);
const hchofoldedGraphData = computed(() =>{
  const validFoldedDatasets = datasets.value
    .filter(
      s => s.molecule.includes('hcho') && 
      s.timeRange?.type === 'folded' && 
      s.plotlyDatasets && 
      s.plotlyDatasets.length > 0
    );
  return validFoldedDatasets.map(s => s.plotlyDatasets![1]); // "!" tells TS that we know it's not undefined
}); 

const showErrorBands = ref(true);
</script>

<style scoped lang="less">
#dataset-sections {
  padding: 0.5rem 1rem;
  border: 5px solid var(--tempo-red);
  border-radius: 10px;
  margin: 10px;
}

// prevent overflows of the content
#add-region-time {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 5px;
}

.my-selections {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 5px;
  padding: 0.5rem;
  border-radius: 10px;
  // background-color: #555555;
}

.h3-panel-titles .v-expansion-panel-title {
  font-size: 1.17em;
  font-weight: bold;
}
</style>
