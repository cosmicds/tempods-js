<template>
  <div id="dataset-sections" :style="cssVars">
    <div id="add-region-time">
      <p>
        Select a Region, Time Range, and Molecule to create a dataset of your choice!
      </p>
    <v-dialog
      v-model="showConfirmReset"
      max-width="35%"
    >
      <v-card class="popup-card--outline">
        <v-card-text>
          Are you sure you want to delete all of your selections? 
          This will remove all of your regions, time ranges, 
          and datasets, and cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="error"
            @click.stop="showConfirmReset = false"
          >
            No
          </v-btn>
          <v-btn
            color="success"
            @click.stop="() => {
              store.reset();
              serializeTempoStore(store);
              showConfirmReset = false;
            }"
          >
            Yes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
      <v-expansion-panels
        v-model="openPanels"
        variant="accordion"
        id="user-options-panels"
        multiple
      > 
        <v-expansion-panel
          title="Regions"
          class="mt-3 h3-panel-titles"
        >
          <template #title>
            My  Regions
            <popup-info-button
                info-text="Click the region card to go to that region on the map. Click the pen to rename a region. Click the trash can to delete a region. If an existing dataset is using a region, it cannot be deleted."
                :width="popupCardWidth"
              >
              </popup-info-button>
          </template>
          <template #text>
            <div id="add-region-buttons">
              <v-btn
                size="small"
                :active="selectionActive === 'rectangle'"
                :disabled="selectionActive === 'point'"
                :color="accentColor2"
                @click.stop="() => {
                  selectionActive = (selectionActive === 'rectangle') ? null : 'rectangle';
                }"
              >
                <template #prepend>
                  <v-icon v-if="selectionActive !== 'rectangle'" icon="mdi-plus"></v-icon>
                </template>
                {{ selectionActive === 'rectangle' ? "Cancel" : "New Region" }}
              </v-btn>
              <popup-info-button
                info-text="To select a region, click and drag a rectangle across the map. "
                :width="popupCardWidth"
              >
              </popup-info-button>
            </div>
            <v-checkbox
              v-model="showSamplingPreviewMarkers"
              class="show-sample-points-toggle"
              label="Show sample points"
              density="compact"
              hide-details
            >
              <template #append>
                <popup-info-button
                  info-html="Checking this box will display the pixels of your selected region where data will be requested from the server. <p> When a large region is selected, we sample an evenly-spaced subset of approximately 30 pixels to shorten the data loading time. For each available time step, all the sampled data across the region will be averaged together.</p>"
                  :width="popupCardWidth"
                >
                </popup-info-button>
              </template>
            </v-checkbox>
            <div class="my-selections" v-if="regions.length>0" style="margin-top: 1em;">                 
              <v-slider
                v-model="regionOpacity"
                :min="0"
                :max="1"
                :step="0.01"
                label="Region Opacity"
                :color="tempoRed"
                density="compact"
                hide-details
                :thumb-size="12"
                :track-size="3"
              >
              </v-slider>
              <v-checkbox
                v-model="regionVisibility"
                label="Show regions"
                density="compact"
                hide-details
              >
              </v-checkbox>
              <v-list>
                <v-list-item
                  v-for="(region, index) in regions"
                  :class="` my-2 rounded-lg region-list-item region-list-item-${index}`"
                  :key="index"
                  :title="region.name"
                  :style="{ 'background-color': region.color, color: contrastingColor(region.color) }"
                  @click.stop="() => focusRegion = region"
                  density="compact"
                  slim
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
                    <div class="datset-controls-action-buttons region-action-buttons">
                    <v-btn
                      variant="plain"
                      v-tooltip="'Edit Name'"
                      icon="mdi-pencil"
                      color="white"
                      size="small"
                      density="compact"
                      @click.stop="(event: MouseEvent | KeyboardEvent) => {
                        editRegionName(region as UnifiedRegionType);
                      }"
                    ></v-btn>
                    <v-btn
                      v-if="!store.regionHasDatasets(region as UnifiedRegionType)"
                      variant="plain"
                      v-tooltip="'Delete'"
                      icon="mdi-delete"
                      color="white"
                      size="small"
                      density="compact"
                      @click.stop="(event: MouseEvent | KeyboardEvent) => {
                        store.deleteRegion(region as UnifiedRegionType);
                      }"
                    ></v-btn>
                    </div>
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
          title="My Time Ranges"
          class="mt-3 h3-panel-titles"
        >
          <template #text>
            <v-btn
              size="small"
              :active="createTimeRangeActive"
              :color="accentColor2"
              @click.stop="createTimeRangeActive = !createTimeRangeActive"
            >
              <template #prepend>
                <v-icon v-if="!createTimeRangeActive" icon="mdi-plus"></v-icon>
              </template>
              {{ createTimeRangeActive ? "Cancel" : "New Time Range" }}
            </v-btn>
            <date-time-range-selection
              v-show="createTimeRangeActive"
              :current-date="singleDateSelected"
              :allowed-dates="uniqueDays"
              @ranges-change="handleDateTimeRangeSelectionChange"
            />
            <div class="my-selections" v-if="timeRanges.length>0" style="margin-top: 1em;">

              <v-list>
                <v-hover
                  v-for="(timeRange, index) in timeRanges"
                  :key="index" v-slot="{ isHovering, props }"
                  close-delay="50"
                  open-delay="250"
                  >
                <v-list-item
                  class="my-2 rounded-lg time-range-v-list-item"
                  v-bind="props"
                  density="compact"
                  slim
                  :title="timeRange.name === 'Displayed Day' ? `Displayed Day: ${ formatTimeRange(timeRange.range) }` : (timeRange.name ?? formatTimeRange(timeRange.range))"
                >
                  
                  <template #default>
                    <TimeRangeCard 
                    :name="timeRange.name === 'Displayed Day' ? `Displayed Day: ${ formatTimeRange(timeRange.range) }` : (timeRange.name ?? formatTimeRange(timeRange.range))"
                    :time-range="timeRange" 
                    :is-hovering="isHovering ?? false"  
                    />
                  </template>
                  <template #append>
                  <div class="datset-controls-action-buttons time-range-action-buttons">
                    <v-btn
                      v-if="timeRange.id !== 'displayed-day'"
                      variant="plain"
                      size="small"
                      density="compact"
                      v-tooltip="'Edit Name'"
                      icon="mdi-pencil"
                      color="white"
                      @click.stop="(event) => {
                        editTimeRangeName(timeRange);
                        event.stopPropagation();
                      }"
                    ></v-btn>
                    <v-btn
                      v-if="timeRange.id !== 'displayed-day' && !datasets.some(s => areEquivalentTimeRanges(s.timeRange, timeRange))"
                      variant="plain"
                      size="small"
                      density="compact"
                      v-tooltip="'Delete'"
                      icon="mdi-delete"
                      color="white"
                      @click.stop="() => store.deleteTimeRange(timeRange)"
                    >
                    </v-btn>
                  </div>
                  </template>
                </v-list-item>
                </v-hover>
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
          title="My Datasets"
          class="mt-3 h3-panel-titles"
        >
        <template #text>
          <v-btn
            size="small"
            :active="createDatasetActive"
            :color="accentColor2"                    
            @click.stop="createDatasetActive = !createDatasetActive"
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
            :molecule-ready="moleculeReady"
            :disabled="{ region: regions.length === 0, point: selectionActive === 'point', timeRange: timeRanges.length === 0 }"
            @create="handleDatasetCreated"
          >
          </selection-composer>
          <div class="my-selections" v-if="datasets.length>0" style="margin-top: 1em;">


            
            <dataset-card
              :datasets="datasets"
              :turn-on-selection="allDatasetSelection"
              v-model:selected-datasets="selectedDatasets"
              @edit-region="(e) => handleEditDataset(e)"
            >
              <template #action-row="{ dataset }">
                    <div
                      v-if="(dataset.loading || !dataset.samples)  && !(dataset.timeRange?.type === 'folded' && dataset.plotlyDatasets)"
                      class="dataset-loading"
                    >
                      <hr/>
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
                            @click.stop="() => removeDataset(dataset)"
                          ></v-btn>
                        </template>
                      </v-tooltip>
                      
                      <div v-if="!(dataset.loading || dataset.samples || dataset.plotlyDatasets)">
                        <hr/>
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
                              @click.stop="() => sampleErrorID = dataset.id"
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
                              @click.stop="() => removeDataset(dataset)"
                            ></v-btn>
                          </template>
                        </v-tooltip>
                      </div>
                    </div>

                    <v-expand-transition>
                      <div
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
                              @click.stop="() => openAggregationDialog(dataset)"
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
                          text="Edit Dataset Name/Color"
                          location="top"
                        >
                          <template #activator="{ props }">
                            <v-btn
                              v-bind="props"
                              size="x-small"
                              icon="mdi-pencil"
                              variant="plain"
                              @click.stop="() => handleEditDataset(dataset)"
                            ></v-btn>
                          </template>
                        </v-tooltip>
                        <v-spacer ></v-spacer>
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
                              @click.stop="() => removeDataset(dataset)"
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
                          @plot-click="(value) => handlePlotClick({...value, molecule: dataset.molecule, region: dataset.region})"
                        />
                      </template>
                    </cds-dialog>
                  </template>
                </dataset-card>
              </div>
              <div v-if="allDatasetSelection" class="dataset-select-all-none">
                <v-btn
                  variant="outlined"
                  size="small"
                  @click.stop="selectedDatasets = datasets.map(d => d.id)"
                >
                  <template #prepend>
                    <v-icon icon="mdi-check-circle" color="success"/>
                  </template>
                  All
                </v-btn>
                <v-btn
                  variant="outlined"
                  size="small"
                  class="ml-2"
                  @click.stop="selectedDatasets = []"
                >
                  <template #prepend>
                    <v-icon icon="mdi-close-circle" color="error"/>
                  </template>
                  Clear
                </v-btn>
              </div>
              <div class="d-flex flex-column align-items-center justify-space-between ga-2">
                <v-btn 
                v-if="datasets.length > 1"
                :disabled="datasets.length === 0 || !datasets.every(d => d.samples || d.plotlyDatasets)"
                color="#ffcc33" size="small" :block="false" @click.stop="allDatasetSelection = !allDatasetSelection">
                {{ allDatasetSelection ? 'Cancel Selection' : 'Select Datasets to Graph' }}
              </v-btn>
              <v-btn 
              v-if="datasets.length > 1"
              :color="accentColor2"
              :disabled="selectedDatasets.length == 0"
              :variant="selectedDatasets.length > 0 ? 'flat' : 'outlined'"
              size="small"
              @click.stop="showMultiPlot = true">
              Graph Selected Datasets
            </v-btn>
          </div>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
  
  <div class="d-flex flex-wrap flex-row align-center justify-center ga-1">
    
    
    
    <!--  -->
    <hr class="ma-2" style="width: 100%;"/>
    <v-btn
    v-if="regions.length > 0 || timeRanges.length > 1"
      color="#a63a3f"
      @click.stop="showConfirmReset = true"
      >
      Delete ALL selections
    </v-btn>
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
      
    <v-dialog
      :model-value="sampleErrorID !== null"
      max-width="50%"
    >
      <v-card class="popup-card--outline">
        <v-toolbar
          density="compact"
        >
          <v-toolbar-title text="Error Loading Data"></v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            @click.stop="sampleErrorID = null"
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
    
    <v-dialog
      v-model="showEditTimeRangeNameDialog"
    >
      <!-- text field that requires a confirmation -->
        <c-text-field
          label="Time Range Name"
          title="Enter a new name for this time range"
          hide-details
          dense
          :button-color="accentColor"
          @confirm="(name: string) => {
            if (timeRangeBeingEdited) {
              store.setTimeRangeName(timeRangeBeingEdited, name);
              showEditTimeRangeNameDialog = false;
            }
          }"
          @cancel="() => {
            showEditTimeRangeNameDialog = false;
            timeRangeBeingEdited = null;
          }"
        ></c-text-field>
    </v-dialog>
        
    <v-dialog
      v-model="showDatasetEditor"
    >
      <user-dataset-editor
        v-if="currentlyEditingDataset !== null"
        v-model="currentlyEditingDataset" 
        :name-only="datasetEditorNameOnly"
        @complete="() => {
          showDatasetEditor = false;
          currentlyEditingDataset = null;
        }"
        />
    </v-dialog>
        
    <!-- Data Aggregation Dialog -->
    <advanced-operations
      v-model="showAggregationDialog"
      :selection="aggregationDataset"
      @save="handleAggregationSaved"
      @plot-click="handlePlotClick"
    />
    
    <v-dialog
      v-model="showUserDatasetTable"
      max-width="800px"
      persistent
    >
      <v-card class="popup-card--outline">
        <v-toolbar
          density="compact"
        >
          <v-toolbar-title text="Dataset Table View"></v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            @click.stop="showUserDatasetTable = false; tableSelection = null"
          >
          </v-btn>
        </v-toolbar>
        <v-card-text>
          <user-dataset-table
            v-if="tableSelection !== null"
            :dataset="tableSelection"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
    
    <local-scope
      :datasets="datasets.filter(d => (d.samples || d.plotlyDatasets) && selectedDatasets.includes(d.id) )"
    >
      <template #default="{ datasets }">
        <cds-dialog
          :title="`Graph${new Set(datasets.map(ds => ds.molecule)).size > 1 ? 's' : ''} of Quantity vs Time`"
          title-color="var(--info-background)"
          v-model="showMultiPlot"
          persistent
          draggable
          max-height="90vh"
          max-width="90vw"
          :scrim="true"
          :drag-predicate="titleBarPredicate"
        >
          <multi-plot
            :datasets="datasets"
          />
        </cds-dialog>
      </template>
    </local-scope>

  </div>

</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { v4 } from "uuid";
import { supportsTouchscreen } from "@cosmicds/vue-toolkit";

import type { MillisecondRange, TimeRange, UserDataset, UnifiedRegion, MoleculeType } from "../types";
import type { TimeRangeConfig } from "@/date_time_range_selection/date_time_range_generators";
import { serializeTempoStore, useTempoStore } from "../stores/app";
import { MOLECULE_OPTIONS, moleculeDescriptor } from "../esri/utils";
import { areEquivalentTimeRanges, formatTimeRange } from "../utils/timeRange";
import { atleast1d } from "../utils/atleast1d";
import { titleBarPredicate } from "../utils/draggable";

import DateTimeRangeSelection from "../date_time_range_selection/DateTimeRangeSelection.vue";
import AdvancedOperations from "./AdvancedOperations.vue";
import { TimeRangeSelectionType } from "@/types/datetime";
// import PlotlyGraph from "./plotly/PlotlyGraph.vue";
// import FoldedPlotlyGraph from "./FoldedPlotlyGraph.vue";
import CTextField from "./CTextField.vue";
import DatasetCard from "./DatasetCard.vue";
import { toZonedTime } from "date-fns-tz";
// import { userDatasetToPlotly } from "@/utils/data_converters";
import UserDatasetTable from "./UserDatasetTable.vue";
import TimeRangeCard from "@/date_time_range_selection/TimeRangeCard.vue";
import MultiPlot from "./plotly/MultiMoleculePlot.vue";
import UserDatasetPlot from "./plotly/UserDatasetPlot.vue";

type UnifiedRegionType = UnifiedRegion;

const store = useTempoStore();
const {
  accentColor,
  accentColor2,
  backend,
  regions,
  datasets,
  timeRanges,
  singleDateSelected,
  uniqueDays,
  selectionActive,
  focusRegion,
  showSamplingPreviewMarkers,
  regionOpacity,
  regionVisibility,
  tempoRed,
  layersReady,
} = storeToRefs(store);

const moleculeReady = computed(() => {
  const ready = new Map<string, boolean[] | undefined>();
  MOLECULE_OPTIONS.forEach( v => {
    const layername = `tempo-${v.value}`;
    ready.set(v.value,layersReady.value.get(layername)?.ready);
  });
  return ready;
});

const cssVars = computed(() => {
  return {
    '--accent-color': accentColor.value,
    '--accent-color-2': accentColor2.value,
  };
});

const touchscreen = supportsTouchscreen();

const openPanels = ref<number[]>([0, 1, 2]);
const openGraphs = ref<Record<string,boolean>>({});
watch(openGraphs, (og) => {
  console.log(og);
}, {deep: true, immediate: true});
const openSelection = ref<string | null>(null);
const tableSelection = ref<UserDataset | null>(null);
const currentlyEditingDataset = ref<UserDataset | null>(null);
const showConfirmReset = ref(false);
const showMultiPlot = ref(false);

const createTimeRangeActive = ref(false);
const createDatasetActive = ref(false);
const datasetRowRefs = ref({});
const sampleErrorID = ref<string | null>(null);

const showEditRegionNameDialog = ref(false);
const regionBeingEdited = ref<UnifiedRegionType | null>(null);

const showEditTimeRangeNameDialog = ref(false);
const timeRangeBeingEdited = ref<TimeRange | null>(null);

const popupCardWidth = 300;

const aggregationDataset = ref<UserDataset | null>(null);
const showAggregationDialog = ref(false);
function openAggregationDialog(selection: UserDataset) {
  aggregationDataset.value = selection;
  showAggregationDialog.value = true;
}
function handleAggregationSaved(aggregatedSelection: UserDataset) {
  const n = datasets.value
    .filter(d => !!d.folded) // only count folded datasets
    .filter(d => {
      // make sure they all have the same parent
      if (d.folded.parent && aggregatedSelection.folded.parent) {
        // check the id (this is stable and always unique)
        return (aggregatedSelection.folded.parent as UserDataset).id === (d.folded.parent as UserDataset).id;
      }
      return false;
    }).length;
  // aggregatedSelection.name = `${aggregatedSelection.name} ${String.fromCharCode(97 + n)}`; // a, b, c, ...
  aggregatedSelection.name = (aggregatedSelection.name ?? '(Aggregation)').replace('Aggregation', `Aggregation ${String.fromCharCode(97 + n)}`); // a, b, c, ...
  if (aggregatedSelection.plotlyDatasets) {
    for (let i = 0; i < aggregatedSelection.plotlyDatasets.length; i++) {
      aggregatedSelection.plotlyDatasets[i].name = aggregatedSelection.name;
    }
  }
  store.addDataset(aggregatedSelection, false); // no need to fetch anything
  showAggregationDialog.value = false;
  aggregationDataset.value = null;
}

import { RequestStats, FetchOptions } from "@/esri/services/TempoDataService";
function handleDatasetCreated(dataset: UserDataset) {
  dataset.name = `Dataset ${datasets.value.length + 1}`; // give it a default name
  const onProgress: FetchOptions["onProgress"] = (_stats: RequestStats, completed: number, total: number) => {
    console.log(`Dataset ${dataset.name} loading progress: ${completed}/${total} requests completed.`, _stats);
  };
  store.addDataset(dataset, true, onProgress);
  createDatasetActive.value = false;
}

import UserDatasetEditor from "./UserDatasetEditor.vue";
import { contrastingColor } from "@/utils/color";
const showDatasetEditor = ref(false);
const datasetEditorNameOnly = ref(false);
function handleEditDataset(dataset: UserDataset, nameOnly = false) {
  datasetEditorNameOnly.value = nameOnly;
  currentlyEditingDataset.value = dataset;
  showDatasetEditor.value = true;
}

function removeDataset(dataset: UserDataset) {
  store.deleteDataset(dataset);

  delete openGraphs[dataset.id];
  delete datasetRowRefs[dataset.id];
}

function handleDateTimeRangeSelectionChange(
  timeRanges: MillisecondRange[], 
  selectionType: TimeRangeSelectionType, 
  customName: string, 
  config: TimeRangeConfig,
) {
  if (!Array.isArray(timeRanges) || timeRanges.length === 0) {
    console.error('No time ranges received from DateTimeRangeSelection');
    return;
  }
  // console.log(`Received ${timeRanges.length} time ranges of type ${selectionType} and name ${customName}`);
  const normalized = atleast1d(timeRanges);
  const countTimeRanges = store.timeRanges.length;
  let name = `Time Range ${countTimeRanges + 1}`;
  if (selectionType === 'single') {
    name = customName;
  }
  // No dedup tracking now
  const tr: TimeRange = {
    id: v4(),
    name: name,
    description: customName,
    range: normalized.length === 1 ? normalized[0] : normalized,
    type: selectionType,
    config: config,
  };
  store.addTimeRange(tr);

  createTimeRangeActive.value = false;
  // console.log(`Registered ${tr.name}: ${tr.description}`);
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

function editTimeRangeName(timeRange: TimeRange) {
  console.log(`Editing time range: ${timeRange.name}`);
  
  const existing = timeRanges.value.find(tr => tr.id === timeRange.id);
  if (!existing) {
    console.error(`Time range with ID ${timeRange.id} not found.`);
    return;
  }
  timeRangeBeingEdited.value = timeRange;
  // Open dialog for renaming
  showEditTimeRangeNameDialog.value = true;
}

function _graphTitle(dataset: UserDataset): string {
  const molecule = dataset.molecule;
  const molTitle = MOLECULE_OPTIONS.find(m => m.value === molecule)?.title || '';
  return dataset.name ?? `${molTitle} Time Series for ${dataset.region.name}`;
}




function _toZonedTime(date: number | Date | string, timezone): number | Date {
  if (typeof date === 'number') {
    date = new Date(date);
  } else if (typeof date === 'string') {
    date = new Date(date);
  }
  return toZonedTime(date, timezone);
}

const allDatasetSelection = ref(false);
const selectedDatasets = ref<string[]>([]);
watch(allDatasetSelection, (newVal) => {
  if (!newVal) {
    selectedDatasets.value = [];
  }
});
// watch(selectedDatasets, (newVal) => {
//   console.log('Selected datasets changed:', newVal);
// });




const showErrorBands = ref(true);

const showUserDatasetTable = ref(false);
watch(tableSelection, (newVal) => {
  if (newVal) {
    showUserDatasetTable.value = true;
  }
});


/** handle plot click should set the time and molecule and zoom into the region */
function handlePlotClick(value: {x: number | string | Date | null, y: number, customdata: unknown, molecule: MoleculeType, region: UnifiedRegion}): void {
  if (value.x === null) return;
  console.log('Plot clicked at:', value);
  // store.setNearestTime(new Date(value.x));
  focusRegion.value = value.region;
  
}

</script>

<style scoped lang="less">
#dataset-sections {
  font-size: 11pt !important;
  min-width: 250px;
  overflow-y: auto;
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

.selection-icons {
  display: flex;
}

.h3-panel-titles {
  font-size: 1.17em;
  font-weight: bold;
}

.explainer-text {
  border-radius: 5px;
  padding: 5px;
  padding-inline-start: 10px;
  background-color: rgb(var(--v-theme-background));
  font-size: 0.8em;
  color: rgb(var(--v-theme-on-surface));
  
}

.error-explainer-text {
  border-radius: 5px;
  padding: 5px;
  padding-inline-start: 10px;
  background-color: rgba(255, 0, 0, 0.4);
  font-size: 0.8em;
  color: white;
  font-weight: bold;
}

.explainer-text hr {
  border: none;
  border-top: 1px solid rgb(var(--v-theme-on-surface-light));
  margin-inline: 0;
  margin-block: 1em;
}

.explainer-text dt {
  font-weight: bold;
}

.explainer-text dd {
  margin-left: 0;
  margin-bottom: 8px;
}

.dataset-loading {
  display: flex;
  align-items: center;
}

.datset-controls-action-buttons {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
.time-range-action-buttons {
  text-align: right;
}

.time-range-v-list-item:nth-child(odd) {
  background-color: #444444;
}
.time-range-v-list-item:nth-child(even) {
  background-color: #656565;
}

:deep(.v-checkbox .v-label),
:deep(.v-slider__label),
:deep(.v-list-item-title)
{
  font-size: 10pt;
}

.show-sample-points-toggle {
  width: fit-content;
}

:deep(.info-button) {
  padding-left: 5px;
}

:deep(.show-sample-points-toggle .v-input__append) {
  margin: 0;
}

.dataset-select-all-none {
  display: flex;
  margin-bottom: 1em;
  flex-direction: row;
}

.dataset-select-all-none > button {
  flex-grow: 1;
}

#user-options-panels :deep(.v-expansion-panel-text__wrapper) {
    padding: 0px 0.5em;
}



</style>
