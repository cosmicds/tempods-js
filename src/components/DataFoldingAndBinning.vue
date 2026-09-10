<template>
  <!-- <v-dialog
    v-model="dialogOpen"
    max-width="90vw"
    max-height="90vh"
    persistent
    scrollable
  > -->
        <v-row class="df__panel-container">
          <!-- Left Panel: Folding Options with collapsible drawer -->
          <div class="df__left-pane">
            <side-placeholder
              v-model:open="showAggregationControls"
              open-direction="right"
              icon="mdi-calculator"
              closed-tooltip-text="Show stacking and averaging controls controls"
              open-tooltip-text="Close stacking and averaging controls controls"
              open-arrow-color="surface-variant"
              closed-arrow-color="surface-variant"
              tooltips
              color="surface-variant"
            >
              <v-scroll-x-transition>
              <AggregationControls
                :foldingPeriodOptions="foldingPeriodOptions"
                :validFoldingForData="validFoldingForData"
                :timeBinOptions="timeBinOptions"
                :validTimeBinForData="validTimeBinForData"
                :isValidCombination="isValidCombination"
                v-model:useTzCenter="useTzCenter"
                v-model:tzCenter="tzCenter"
                v-model:selectedTimezone="selectedTimezone"
                :timezoneOptions="timezoneOptions"
                :methodOptions="methodOptions"
                v-model:showErrors="showErrors"
                v-model:useErrorBars="useErrorBars"
                v-model:useSEM="useSEM"
                v-model:alignDataToBinCenters="alignDataToBinCenters"
                v-model:disableIncludePhaseCheckbox="disableIncludePhaseCheckbox"
                v-model:alignToBinCenter="alignToBinCenter"
                v-model:disableBinCenterCheckbox="disableBinCenterCheckbox"
                :debugMode="debugMode"
                :originalDataPointCount="originalDataPointCount"
                v-model:foldedDataPointCount="foldedDataPointCount"
                v-model:selectedFoldType="selectedFoldType"
                v-model:canSave="canSave"
                @save="saveFolding"
                @cancel="closeDialog"
                v-model:selectedFoldingPeriod="selectedFoldingPeriod"
                v-model:selectedTimeBin="selectedTimeBin"
                v-model:selectedMethod="selectedMethod"
                v-model:foldedData="foldedData"
              />
              </v-scroll-x-transition>
            </side-placeholder>
          </div>
          
          <!-- Right Panel: Timeseries Graph -->
          <div class="df__right-pane">
            <v-card class="df__right-pane-card" style="height: 100%;" elevation="0">
              <local-scope
                :descriptor="selection?.molecule ? moleculeDescriptor(selection?.molecule) : null"
              >
              <template #default="{ descriptor }">
                <div  class="df__graph-container">
                  <folded-plotly-graph
                    :datasets="selectedFoldType === 'noneOfNone' ? [graphData[0]] : graphData"
                    :show-errors="showErrors"
                    :fold-type="selectedFoldType"
                    :colors="[theColor, '#333']"
                    :timezones="selectedTimezone"
                    :data-options="[
                      {mode: 'markers'}, // options for the original data
                      {mode: 'markers'} // options for the folded data
                      ]"
                    :error-bar-styles="[
                      {'thickness': 1, 'width': 0}, // original data error bar style
                      { 'thickness': 3, 'width': 0 } // folded data error bar style
                    ]"
                    :config-options="{responsive: false, modeBarButtonsToRemove: ['autoScale2d', 'sendDataToCloud','lasso2d', 'select2d'], displaylogo: false}"
                    @plot-click="handlePointClick"
                    :layout-options="withPlotlyDefaults({
                      margin: {t: 10, r: 20, b: 60, l: 90}, 
                      autosize: false, width: 700, height: 400,
                      xaxis: {
                        automargin: false,
                        gridcolor: 'rgba(128, 128, 128, 0.3)',
                        title: {
                          standoff: 10,
                        },
                      },
                      yaxis: {
                        automargin: true,
                        gridcolor: 'rgba(128, 128, 128, 0.3)',
                        title: {
                          standoff: 10,
                          text: descriptor ? moleculeYAxisTitle(descriptor) : 'Molecules / cm<sup>2</sup>',
                        },
                      }
                      })"
                  />
                </div>
                <div v-if="showAggregationControls" id="below-graph-stuff" class="mt-2 explainer-text">
                  <div v-if="aggregationWarning" id="aggregation-warning">
                    {{ aggregationWarning }}
                  </div>
                </div>
                <!-- no save folded data button when aggregation panel is closed -->
              </template>
            </local-scope>
            </v-card>
          </div>
        </v-row>
  <!-- </v-dialog> -->
</template>

<script setup lang="ts">
// eslint-disable @typescript-eslint/no-unused-vars */
import { ref, computed, watch, nextTick } from 'vue';
import { storeToRefs } from "pinia";
import { v4 } from 'uuid';
import { TimeSeriesFolder, sortfoldBinContent } from '../esri/services/aggregation';
import FoldedPlotlyGraph from './FoldedPlotlyGraph.vue';
import type { Prettify, UserDataset, PlotlyGraphDataSet, UnifiedRegion, MoleculeType } from '../types';
import type { TimeRangeSelectionType } from '@/types/datetime';
import type { AggregationMethod, TimeSeriesData, FoldedTimeSeriesData , FoldType, FoldBinContent} from '../esri/services/aggregation';
import tz_lookup from '@photostructure/tz-lookup';
import { toZonedTime } from 'date-fns-tz';
import { useTempoStore } from '@/stores/app';
import AggregationControls from './AggregationControls.vue';
import { moleculeDescriptor, moleculeYAxisTitle } from '@/esri/utils';
import { withPlotlyDefaults } from './plotly/plotly_styles';

const store = useTempoStore();
const {
  debugMode,
  showAggregationControls
} = storeToRefs(store);

import {
  TimeBinOptions,
  FoldingPeriodOptions,
  isValidCombination,
  getFirstValidTimeBin
} from '@/utils/foldingValidation';

interface DataFoldingProps {
  selection: UserDataset | null;
}

const props = defineProps<DataFoldingProps>();
  

const emit = defineEmits<{
  (event: 'save', foldedSelection: UserDataset): void;
  (event: 'controls-toggle', isOpen: boolean): void;
  (event: "plot-click", value: {x: number | string | Date | null, y: number, customdata: unknown, molecule: MoleculeType, region: UnifiedRegion}): void;
}>();


// Dialog state
const dialogOpen = defineModel<boolean>('modelValue', { type: Boolean, required: true });

const theColor = computed(() => {
  return props.selection?.customColor ?? (props.selection?.region.color ?? 'blue');
});


const MS_IN_HOUR = 3600000;
const MS_IN_DAY = MS_IN_HOUR * 24;
const MS_IN_WEEK = MS_IN_DAY * 7;
const MS_IN_MONTH = MS_IN_DAY * 28; // to avoid invalidating February
const MS_IN_YEAR = MS_IN_DAY * 365.25;

const timeBinDurations: Record<TimeBinOptions, number> = {
  'hour': MS_IN_HOUR,
  'day': MS_IN_DAY,
  'week': MS_IN_WEEK,
  'month': MS_IN_MONTH, 
  'none': 0,
};

const foldingPeriodDurations: Record<FoldingPeriodOptions, number> = {
  'day': MS_IN_DAY,
  'week': MS_IN_WEEK,
  'month' : MS_IN_MONTH,
  'year': MS_IN_YEAR,
  'weekdayWeekend': MS_IN_WEEK, // weekend is part of week
  'none': 0,
};

const dataDuration = computed(() => {
  if (!props.selection?.samples) return 0;
  const timestamps = Object.values(props.selection.samples).map(s => s.date.getTime());
  if (timestamps.length === 0) return 0;
  // single loop to find min and max on unsorted array
  // (but it may already be sorted, but we only need to do this once so it's fine)
  const minMax = timestamps.reduce((acc, t) => {
    return {
      min: Math.min(acc.min, t),
      max: Math.max(acc.max, t)
    };
  }, { min: Infinity, max: -Infinity });
  return minMax.max - minMax.min;
});

function validTimeBinForData(timeBin: TimeBinOptions): boolean {
  if (dataDuration.value === 0) return false;

  return dataDuration.value >= timeBinDurations[timeBin];
}

function validFoldingForData(foldType: FoldingPeriodOptions): boolean {
  if (dataDuration.value === 0) return false;
  if (foldType === 'weekdayWeekend') {
    return (props.selection?.samples && Object.values(props.selection?.samples).map(s => s.date.getDay()).some(d => d === 0 || d === 6)) as boolean; // has at least one weekend day
  }
  return dataDuration.value >= foldingPeriodDurations[foldType];
}

const aggregationWarning = ref('');


// Time bin and folding period options
const timeBinOptions: {title: string, value: TimeBinOptions}[] = [
  { title: 'None', value: 'none' },
  { title: 'Hour', value: 'hour' },
  { title: 'Day', value: 'day' },
  { title: 'Week', value: 'week' },
  { title: 'Month', value: 'month' }
];

const allFoldingPeriodOptions: {title: string, value: FoldingPeriodOptions}[] = [
  { title: 'None', value: 'none' },
  { title: 'Day', value: 'day' },
  { title: 'Week', value: 'week' },
  { title: 'Month', value: 'month' },
  { title: 'Year', value: 'year' },
  { title: 'Weekend/Weekday', value: 'weekdayWeekend' },
];



// Computed property to filter valid folding periods based on selected time bin
const foldingPeriodOptions = computed(() => {
  return allFoldingPeriodOptions;
});


const methodOptions = [
  { title: 'Mean', value: 'mean' },
  { title: 'Median', value: 'median' },
  { title: 'Min', value: 'min' },
  { title: 'Max', value: 'max' }
];

const timezoneOptions = [
  { title: 'US/Eastern', value: 'US/Eastern' },
  { title: 'US/Central', value: 'US/Central' },
  { title: 'US/Mountain', value: 'US/Mountain' },
  { title: 'US/Arizona', value: 'US/Arizona' },
  { title: 'US/Pacific', value: 'US/Pacific' },
  { title: 'UTC', value: 'UTC' }
];

// Reactive state
const selectedTimeBin = ref<TimeBinOptions>('none');
const selectedFoldingPeriod = ref<FoldingPeriodOptions>('none');
const selectedMethod = ref<AggregationMethod>('mean');
const selectedTimezone = ref('US/Eastern');
const showErrors = ref(true);
const useSEM = ref(true);
const useErrorBars = ref(false);

watch(selectedFoldingPeriod, (newPeriod) => {
  if (!isValidCombination(selectedTimeBin.value, newPeriod)) {
    // Set to first valid option
    const validTimeBin = getFirstValidTimeBin(newPeriod);
    if (validTimeBin && validTimeBinForData(validTimeBin)) {
      selectedTimeBin.value = validTimeBin;
    } else {
      selectedTimeBin.value = 'hour'; // default fallback
    }
  }
});

// Computed FoldType based on time bin and folding period selections
const selectedFoldType = computed<FoldType>(() => {
  // Map the combination to the appropriate FoldType
  const timeBin = selectedTimeBin.value;
  const period = selectedFoldingPeriod.value;
    
  const foldType = `${timeBin}Of${period.charAt(0).toUpperCase()}${period.slice(1)}` as FoldType;
  return foldType;
});




// Check if we're using a None-period fold type (no actual folding)
const isNonePeriod = computed(() => {
  return selectedFoldingPeriod.value === 'none';
});

// Check if we're using any hour-based fold type (which is always centered)
const isHourBinned = computed(() => {
  return selectedTimeBin.value === 'hour';
});

const isFoldWithNoBin = computed(() => {
  return selectedTimeBin.value === 'none' && selectedFoldingPeriod.value !== 'none';
});

const includeBinPhase = ref(true);
// const alignToBinCenter = ref(true);
const alignToBinCenter = computed(() => {
  if (isNonePeriod.value) return true;
  if (selectedFoldingPeriod.value === 'weekdayWeekend') return false;
  if (includeBinPhase.value === false) return false;
  if (isHourBinned.value) return true;
  if (selectedTimeBin.value === 'week' && selectedFoldingPeriod.value === 'year') return false;
  return true;
});

const alignDataToBinCenters = computed({
  get() {
    return !includeBinPhase.value;
  },
  set(value: boolean) {
    includeBinPhase.value = !value;
  }
});


const disableBinCenterCheckbox = computed(() => {
  return !isNonePeriod.value && includeBinPhase.value && !isHourBinned.value;
});

const disableIncludePhaseCheckbox = computed(() => {
  return !isNonePeriod.value;
});

// Watch to ensure selected folding period is valid when time bin changes
watch(selectedTimeBin, () => {
  const validPeriods = foldingPeriodOptions.value.map(opt => opt.value);
  if (!validPeriods.includes(selectedFoldingPeriod.value)) {
    // Set to first valid option
    if (validPeriods.length > 0) {
      selectedFoldingPeriod.value = validPeriods[0];
    }
  }
});

// Watch for None-period types and reset incompatible options
watch(isNonePeriod, (isNone) => {
  if (isNone) {
    includeBinPhase.value = true;
    // alignToBinCenter.value = true;
  }
});

const regionCenter = computed(() => {
  const region = props.selection?.region as UnifiedRegion;
  
  if (region && region.geometryType === 'point') {
    return { lat: region.geometryInfo.y, lon: region.geometryInfo.x };
  }
  
  if (region && region.geometryType === 'rectangle') {
    const { xmin, ymin, xmax, ymax } = region.geometryInfo;
    return { lat: (ymin + ymax) / 2, lon: (xmin + xmax) / 2 };
  }
  
  return { lat: 0, lon: 0 };
});



const useTzCenter = ref(true);
const tzCenter = tz_lookup(regionCenter.value.lat, regionCenter.value.lon);

if (regionCenter.value.lat !== 0 || regionCenter.value.lon !== 0) {
  const tz = tz_lookup(regionCenter.value.lat, regionCenter.value.lon);
  if (tz && useTzCenter.value) {
    selectedTimezone.value = tz;
  }
}

watch(useTzCenter, (newVal) => {
  if (newVal && regionCenter.value.lat !== 0 && regionCenter.value.lon !== 0) {
    const tz = tz_lookup(regionCenter.value.lat, regionCenter.value.lon);
    if (tz) {
      selectedTimezone.value = tz;
    }
  }
});

// Computed properties
const originalDataPointCount = computed(() => {
  if (!props.selection?.samples) return 0;
  return Object.keys(props.selection.samples).length;
});

const foldedDataPointCount = computed(() => {
  if (!foldedData.value) return 0;
  return Object.keys(foldedData.value.values).length;
});

const canSave = computed(() => {
  return !!(props.selection && foldedData.value && foldedDataPointCount.value > 0);
});

const foldedDatasetName = computed(() => {
  if (!props.selection?.name) return 'Stacked Data';
  return `${props.selection.name ?? props.selection.region.name} (Aggregation)`;// (${selectedTimeBin.value} of ${selectedFoldingPeriod.value}, ${selectedMethod.value})`;
});

// Aggregated data
const foldedData = ref<FoldedTimeSeriesData | null>(null);
const foldedSelection = ref<null>(null);
// Graph data for display - now a ref that gets manually updated
const graphData = ref<PlotlyGraphDataSet[]>([]);

watch(foldedData, (newvValue) => {
  // if there is only one bin present the user with an aggregation warning
  if (newvValue && newvValue.bins && Object.keys(newvValue.bins).length <= 1) {
    aggregationWarning.value = ("Warning: This combination of time bin and folding period results " +
      "in only one bin. Please select a smaller time bin " + 
      "or a different folding period if available. In most cases, it is recommend to select 'None' for the folding period.");
  } else {
    aggregationWarning.value = '';
  }
});


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function timeseriesToDataSet(timeseries: TimeSeriesData): Omit<PlotlyGraphDataSet, 'name'> {
  const x: PlotlyGraphDataSet['x'] = [];
  const y: PlotlyGraphDataSet['y'] = [];
  const lower: PlotlyGraphDataSet['lower'] = [];
  const upper: PlotlyGraphDataSet['upper'] = [];

  // tsa, tsb are the timestamps as strings
  const sortedEntries = Object.entries(timeseries.values).sort(([tsa, _a], [tsb, _b]) => parseInt(tsa) - parseInt(tsb));
  // get the first timestamp
  sortedEntries.forEach(([timestamp, aggValue]) => {
    y.push(aggValue.value);
    x.push(new Date(parseInt(timestamp)));
    const error = timeseries.errors[timestamp];
    lower.push(error?.lower ?? null);
    upper.push(error?.upper ?? null);
  });

  return { x, y, lower, upper, errorType: 'bar' };
}

function foldedTimesSeriesToDataSet(foldedTimeSeries: FoldedTimeSeriesData): Omit<PlotlyGraphDataSet, 'name'> {
  const x: (number | Date | null)[] = [];
  const y: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const upper: (number | null)[] = [];

  // Check if this is a None-period fold type
  const isNonePeriod = ['noneOfNone','hourOfNone', 'dayOfNone', 'weekOfNone', 'monthOfNone'].includes(foldedTimeSeries.foldType);

  const sortedEntries = Object.entries(foldedTimeSeries.bins).sort(([_keyA, binA], [_keyB, binB]) => binA.bin - binB.bin);

  sortedEntries.forEach(([binKey, _binContent]) => {
    const key = +binKey;
    // not indexing, values is Record<bin, value>
    const aggValue = foldedTimeSeries.values[key];
    if (!aggValue) return;
    
    // Use date if available (for None-period types), otherwise use bin index
    if (isNonePeriod && aggValue.date) {
      // For None-period types with dates, center bins by adding half the bin width
      if (alignToBinCenter.value) {
        const date = new Date(aggValue.date);
        switch (foldedTimeSeries.foldType) {
        case 'hourOfNone':
          date.setMinutes(30); // Center of hour
          break;
        case 'dayOfNone':
          date.setHours(date.getHours() + 12); // local Noon
          break;
        case 'weekOfNone':
          date.setDate(date.getDate() + 3); // Middle of week (approx)
          date.setHours(date.getHours() + 12);
          break;
        case 'monthOfNone':
          date.setDate(15); // Middle of month (approx)
          break;
        }
        x.push(date);
      } else {
        x.push(aggValue.date);
      }
    } else {
      if (foldedTimeSeries.foldType !== 'hourOfDay') {
        x.push(aggValue.bin + (alignToBinCenter.value ? 0.5 : 0));
      } else {
        x.push(aggValue.bin);
      }
    }
    
    y.push(aggValue.value);
    const error = foldedTimeSeries.errors[key];
    lower.push(error?.lower ?? null);
    upper.push(error?.upper ?? null);
  });

  return { x, y, lower, upper, errorType: useErrorBars.value ? 'bar' : 'band' };
}
  
function foldedTimeSeriesRawToDataSet(foldedTimeSeries: FoldedTimeSeriesData): Omit<PlotlyGraphDataSet, 'name'> {
  const x: (number | Date | null)[] = [];
  const y: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const customdata: Date[] = [];

  // Check if this is a None-period fold type
  const isNonePeriod = ['noneOfNone', 'hourOfNone', 'dayOfNone', 'weekOfNone', 'monthOfNone'].includes(foldedTimeSeries.foldType);

  const sortedEntries = Object.entries(foldedTimeSeries.bins).sort(([_keyA, binA], [_keyB, binB]) => binA.bin - binB.bin);

  sortedEntries.forEach(([_binIndex, binContent]) => {
    const sortedBinContent = sortfoldBinContent(binContent);
    const bins = sortedBinContent as Prettify<FoldBinContent>;
    
    bins.rawValues.forEach((rv, index) => {
      if (isNonePeriod) {
        // For None-period types, use the actual timestamp
        x.push(new Date(bins.timestamps[index]));
      } else {
        // For regular fold types, use bin index with optional phase
        x.push(bins.bin + (includeBinPhase.value ? bins.binPhase[index] : 0));
      }
      customdata.push(toZonedTime(new Date(bins.timestamps[index]), selectedTimezone.value));
      y.push(rv);
    });
    bins.lowers.forEach(low => {
      lower.push(low ?? null);
    });
    bins.uppers.forEach(up => {
      upper.push(up ?? null);
    });
  });
  // the ascii +- symbol is this characher: ±
  const hovertemplate = '%{customdata|%Y-%m-%d %H:%M}<br>%{y:0.2e}±%{error_y.array:0.2e}<extra></extra>';
  
  return { x, y, lower, upper, errorType: 'bar', datasetOptions: { customdata, hovertemplate } };
}

// Function to update graph data
function updateGraphData() {
  if (!props.selection) {
    graphData.value = [];
    return;
  }
  
  // const data = [timeseriesToDataSet(selectionToTimeseries(props.selection))]; // Original data
  const data: PlotlyGraphDataSet[] = [];
  
  if (foldedData.value) {
    const t = foldedTimeSeriesRawToDataSet(foldedData.value); // Raw folded data
    (t as PlotlyGraphDataSet).name = props.selection.name || 'Original Data';
    (t as PlotlyGraphDataSet).errorType = 'bar';
    data.push(t as PlotlyGraphDataSet); // Raw folded data
    if (!isFoldWithNoBin.value) { // we did I decide to do this.........
      const f = foldedTimesSeriesToDataSet(foldedData.value); // Summary folded data
      (f as PlotlyGraphDataSet).name = foldedDatasetName.value;
      data.push(f as PlotlyGraphDataSet); // Summary folded data
    }
  } else {
    // No folded data, just show original
    const original = timeseriesToDataSet(selectionToTimeseries(props.selection));
    (original as PlotlyGraphDataSet).name = props.selection.name || 'Original Data';
    data.push(original as PlotlyGraphDataSet);
  }
  graphData.value = data;
}

// Create a time range for the folded data
function createFoldedTimeRange() {
  if (!props.selection) {
    throw new Error('No selection available');
  }
  
  const originalRange = props.selection.timeRange.range;
  const ranges = Array.isArray(originalRange) ? originalRange : [originalRange];
  
  return {
    id: v4(),
    name: `Stacked (${selectedTimeBin.value} of ${selectedFoldingPeriod.value})`,
    description: `Stacked data (${selectedTimeBin.value} of ${selectedFoldingPeriod.value}) ${selectedMethod.value}`,
    range: ranges,
    type: 'folded' as TimeRangeSelectionType,
    source: props.selection.timeRange,
  };
}


// Only recalculate when data-affecting parameters change
watch([selectedTimeBin, selectedFoldingPeriod, selectedMethod, selectedTimezone, useSEM], 
  updateAggregatedData, { immediate: true });

// Handle display-only changes separately
watch([useErrorBars, alignToBinCenter, includeBinPhase], updateGraphData);

function selectionToTimeseries(selection: UserDataset): TimeSeriesData {
  return {
    values: selection.samples || {},
    errors: selection.errors || {},
    locations: selection.locations || [],
    geometryType: selection.region.geometryType || 'rectangle'
  };
}

// Update folded data when parameters change
function updateAggregatedData() {
  // console.log("Updating folded data with time bin:", selectedTimeBin.value, "folding period:", selectedFoldingPeriod.value, "fold type:", selectedFoldType.value, "method:", selectedMethod.value, "timezone:", selectedTimezone.value);
  if (!props.selection?.samples) {
    foldedData.value = null;
    return;
  }
  
  try {
    
    // Convert the selection data to TimeSeriesData format
    const timeSeriesData = selectionToTimeseries(props.selection);
    
    const grouper = new TimeSeriesFolder(
      selectedFoldType.value,
      selectedTimezone.value, 
      selectedMethod.value, 
      useSEM.value ? 'sem' : 'std', true);
    foldedData.value = grouper.foldData(timeSeriesData);
    
  } catch (error) {
    console.error('Error aggregating data:', error);
    foldedData.value = null;
    foldedSelection.value = null;
  }
  
  // Update graph data after folding
  updateGraphData();
}

function handlePointClick(value: {x: Plotly.Datum, y: number, customdata: unknown}) {
  // console.log("Point clicked:", value);
  // console.log("Custom data Date:", value.customdata ? value.customdata as Date: value.customdata);
  // the from timezoned time is what we want to to send work with if we go back to esri stuff
  // console.log("fromZonedTime", value.customdata ? fromZonedTime(value.customdata as Date, selectedTimezone.value) : value.customdata);
  emit('plot-click', {
    x: value.x,
    y: value.y,
    customdata: value.customdata,
    molecule: props.selection?.molecule as MoleculeType,
    region: props.selection?.region as UnifiedRegion
  });
  return;
}

// Save the folding
function saveFolding() {
  
  if (!canSave.value || !props.selection || !foldedData.value) return;
  
  // const rawDataset = foldedTimeSeriesRawToDataSet(foldedData.value);
  // (rawDataset as PlotlyGraphDataSet).name = props.selection.name || 'Original Data';
  // const summaryDataset = foldedTimesSeriesToDataSet(foldedData.value);
  // (summaryDataset as PlotlyGraphDataSet).name = foldedDatasetName.value;
  const secondPlotlyDataset = isFoldWithNoBin.value ? graphData.value[0] : graphData.value[1];
  const foldedSelection: UserDataset = {
    id: v4(),
    region: { ...props.selection.region, name: props.selection.region.name } as typeof props.selection.region,
    timeRange: createFoldedTimeRange(),
    molecule: props.selection.molecule,
    customColor: theColor.value,
    loading: false, // folded data is immediately available
    // samples/errors intentionally omitted for folded since bins are synthetic; rely on plotlyDatasets
    locations: foldedData.value.locations,
    name: foldedDatasetName.value,
    
    folded: {
      timeBin: selectedTimeBin.value,
      foldingPeriod: selectedFoldingPeriod.value,
      foldType: selectedFoldType.value,
      method: selectedMethod.value,
      timezone: selectedTimezone.value,
      useSEM: useSEM.value,
      includeBinPhase: includeBinPhase.value,
      alignToBinCenter: alignToBinCenter.value,
      useErrorBars: useErrorBars.value,
      raw: foldedData.value,
      parent: props.selection
    },
    plotlyDatasets: [
      {
        ...graphData.value[0],
        datasetOptions: {
          ...graphData.value[0].datasetOptions,
          mode: 'markers',
          // hovertemplate: '%{customdata|%Y-%m-%d %H:%M}<br>%{y:0.2e}±%{error_y.array:0.2e}<extra></extra>'
        }
      } as PlotlyGraphDataSet,
      {
        ...secondPlotlyDataset,
        datasetOptions: {
          ...secondPlotlyDataset.datasetOptions,
          mode: 'markers'
        }
      } as PlotlyGraphDataSet
    ]//.slice(0, isFoldWithNoBin.value ? 1 : 2) // only include summary if not fold-with-no-bin
  };
  emit('save', foldedSelection);

  closeDialog();
}

// Close dialog
function closeDialog() {
  dialogOpen.value = false;
  // Reset state
  nextTick(() => {
    foldedData.value = null;
  });
}

// Watch for selection changes
watch(() => props.selection, () => {
  if (props.selection) {
    updateAggregatedData();
  }
}, { immediate: true });
</script>

<style scoped>

#aggregation-warning {
  color: red;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.df__panel-container {
  flex-wrap: nowrap;
  overflow-x: auto;
}


.df__left-pane {
  min-width: min-content;
  max-width: fit-content;
}



.df__left-pane > .side-panel-control > .content-container {
  height: 100% !important;
  border: 1px solid red !important;
}

.df__right-pane {
  margin-inline: 1em;
  width: min-content;
}

.df__right-pane-card {
}
.df__graph-container {
  height: calc(100% - 40px);
}

</style>
