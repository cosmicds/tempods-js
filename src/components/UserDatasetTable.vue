<template>
  <div id="user-dataset-table-container">
    <!-- Loading state -->
    <div v-if="isLoading" class="utdc--loading">
      <v-progress-circular indeterminate color="primary" />
      <span class="ml-4">Creating table...</span>
    </div>
    <div v-else>
      <div v-if="samples && Object.keys(samples).length > 0" id="utdc--samples">
        <!-- must pass '\t' and '\n' as javascript, otherwise it will be interpreted literally -->
        <save-csv 
          :json="jsonData"
          :clipboard-options="clipboardOptions"
          :file-options="fileOptions"
          :dataset-name="dataset.name"
          />
        <v-data-table
          class="utdc--data-table utdc--sampples-table"
          :items="samplesItems"
          :headers="sampleHeaders"
          @click:row="emits('rowClick', $event.item)"
        />
      </div>
      <div v-else-if="folded" id="utdc--folded">
        <save-csv 
          :json="jsonData" 
          :clipboard-options="clipboardOptions"
          :file-options="fileOptions"
          :dataset-name="dataset.name"
        />
        <v-data-table
          class="utdc--data-table utdc--folded-table"
          :headers="foldedHeaders"
          :items="foldedItems"
          @click:row="emits('rowClick', $event.item)"
        />
        <p class="utdc--uncertainty-note">
          * The uncertainty for this value is the {{ errorTypeStrinc }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { computed, ref, onMounted, nextTick } from 'vue';
import type { Prettify, UserDataset, UnifiedRegion } from '@/types';
import type { FoldedTimeSeriesData, } from '@/esri/services/aggregation';
import type { TimeBinOptions, FoldingPeriodOptions } from '@/utils/foldingValidation';
import { regionCenter } from '@/utils/data_converters';


import { samplesToJSON, foldedSamplesToJSON, type SampleCSVJsonOutput } from '@/utils/data_converters';
import tz_lookup from '@photostructure/tz-lookup';
import SaveCsv, {type OutputOptions} from './SaveCSV.vue';
import { formatFoldedBinValue } from '@/utils/folded_bin_processor';


const FILE_DELIMITER = ',';
const FIXED_WIDTH_DELIMITER = ','; // fixed width files use tabs
const DOWNLOAD_FILE_FIXED_WIDTH = true;
const CLIPBOARD_DELIMITER = '\t'; // a tab break is intepreted by google sheets as a column break

const clipboardOptions: OutputOptions = {
  delimiter: CLIPBOARD_DELIMITER,
  includeHeaders: true,
  includeMeta: true, // codap formatted meta, includes units
  includeUnits: true, // unit row not seen by codap, but probably useful in a spreadsheet, so keep it. to exclude it, set <<<< this to false.
  fixedWidth: true, // doesn't have to be fixed width. but we'll keep it consistent with file download
};

const fileOptions: OutputOptions = {
  delimiter: DOWNLOAD_FILE_FIXED_WIDTH ? FIXED_WIDTH_DELIMITER : FILE_DELIMITER,
  includeHeaders: true,
  includeMeta: true,
  includeUnits: true,
  fixedWidth: DOWNLOAD_FILE_FIXED_WIDTH,
};

const props = defineProps<{
  dataset: Prettify<UserDataset>;
}>();

const isLoading = ref(true);

const samples = props.dataset.samples;
const errors = props.dataset.errors;
const center = regionCenter(props.dataset.region);
const tz = tz_lookup(center.lat, center.lon);

const errorMessage = computed(() => {
  if (samples === undefined) {
    return 'No samples available in this dataset.';
  }
  if (Object.keys(samples).length === 0) {
    return 'Samples has length 0 for this dataset';
  }
  return null;
});

const toDate = (date: Date) => date.toLocaleDateString(undefined, {
  "year": "numeric",
  "month": "short",
  "day": "numeric"
});
const toTime = (date: Date) => date.toLocaleTimeString(undefined, {
  hour12:true, hour:'numeric', minute: '2-digit', second:'2-digit',
  timeZone: tz,
});
const toDateTime = (date: Date) => date.toLocaleString(undefined, {
  "year": "numeric",
  "month": "short",
  "day": "numeric",
  "hour": "numeric",
  "minute": "numeric",
  "hour12": true,
  timeZone: tz,
});


function formatValue(value: number | undefined | null): string {
  if (value === undefined || value === null) { return 'N/A'; }
  if (props.dataset.molecule.startsWith('o3')) { return value.toFixed(2); }
  return (value / 1e14).toFixed(2);
}

function formatError(error: number | undefined | null): string {
  if (error === undefined || error === null) { return 'N/A'; }
  if (props.dataset.molecule.startsWith('o3')) { return error.toFixed(2); }
  return (error / 1e14).toFixed(2);
}

function formatValueError(value: number | undefined | null, error: number | undefined | null): string {
  if (!value && !error) {
    return '';
  }
  const valStr = formatValue(value);
  const errStr = formatError(error);
  return `${valStr} (${errStr})`;
}

const sampleHeaders = [
  { 
    title: 'Date' , 
    key: 'date',
    value: item => toDate(item.date),
  },
  { 
    title: 'Local Time', 
    key: 'localTime',
    value: item => toTime(item.date) 
  },
  { 
    title: 'Column Density',
    children: [{
      title:  props.dataset.molecule.startsWith('o3') ? 'Dobson Units' : '10¹⁴ molecules/cm²',
      key: 'columnDensity',
      value: item => formatValue(item.value),
    }]
  },
  {
    title: 'Uncertainty*',
    children: [{
      title:  props.dataset.molecule.startsWith('o3') ? 'Dobson Units' : '10¹⁴ molecules/cm²',
      key: 'uncertainty',
      value: item => formatError(item.error),
    }]
  },
];

type DataTableItem = {
  date: Date | number | string;
  value: number | null;
  error?: number;
};
const samplesItems = ref<DataTableItem[]>([]);

const getSamplesItems = () => {
  if (!samples) {
    return [];
  }
  return Object.entries(samples).map(([key, value]) => ({
    date: value.date,
    value: value.value,
    error: errors ? errors[key]?.upper : undefined,
  }));
};


const folded = props.dataset.folded;
const timeBin = props.dataset.folded?.timeBin as TimeBinOptions | undefined; 
const foldPeriod = props.dataset.folded?.foldPeriod as FoldingPeriodOptions | undefined;
const foldedData = props.dataset.folded?.raw as FoldedTimeSeriesData | undefined;

import { foldTypeToLabel } from '@/utils/folded_bin_processor';

const errorTypeStrinc = (!folded || (folded && folded.useSEM)) ? 'standard error of mean' : 'standard deviation';

const foldedHeaders = [
  { 
    title: foldTypeToLabel(folded?.foldType || 'none'),
    key: 'date',
  },
  { 
    title: 'Column Density',
    children: [{
      title: props.dataset.molecule.startsWith('o3') ? 'Dobson Units' : '10¹⁴ molecules/cm²',
      key: 'columnDensity',
      value: item => formatValue(item.value)
    }]
  },
  {
    title: 'Uncertainty*',
    children: [{
      title:  props.dataset.molecule.startsWith('o3') ? 'Dobson Units' : '10¹⁴ molecules/cm²',
      key: 'uncertainty',
      value: item => formatError(item.error),
    }]
  }
];
const foldedItems = ref<DataTableItem[]>([]);
const getfFoldedItems = () => {
  if (!foldedData) {
    return [];
  }
  // ok, so when use a noneOfxxxx fold type, we need to account to the values with different phases
  return Object.entries(foldedData.values)
    .sort(([_keyA, valueA], [_keyB, valueB]) => valueA.bin - valueB.bin)
    .map(([key, value]) => ({
    
      date: foldedData.foldType.toLowerCase().endsWith('none') ? toDateTime(new Date(value.bin)).replace(', 12:00 AM', '') : formatFoldedBinValue(folded.foldType, value.bin),
      // date: formatFoldedBinValue(folded.foldType, value.bin),
      value: value.value,
      error: foldedData.errors ? foldedData.errors[key]?.upper : undefined,
    }));
};

const jsonData = ref<SampleCSVJsonOutput | undefined>(undefined);
// Compute JSON data once for CSV export
const getJsonData = () => {
  if (samples && Object.keys(samples).length > 0) {
    return samplesToJSON(props.dataset, true, true);
  } else if (folded) {
    return foldedSamplesToJSON(props.dataset, true, true);
  }
  return undefined;
};

onMounted(() => {
  if (!samples && !folded) {
    return;
  }

  // Use requestIdleCallback to avoid blocking the UI
  const processData = () => {
    samplesItems.value = getSamplesItems();
    foldedItems.value = getfFoldedItems();
    jsonData.value = getJsonData();
    isLoading.value = false;
  };

  // this won't work on Safari, so we fallback, but waiting for idle
  // makes the ui more responsive
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(processData);
  } else {
    processData();
  }
});


const emits = defineEmits<{
  (event: 'rowClick', value: { date: Date | number; value: number; error?: number }): void;
}>();
</script>

<style>
p.utdc--uncertainty-note {
  border-top: 1px solid wheat;
  margin-top: 8px;
  font-size: 0.8em;
  font-style: italic;
}


.utdc--data-table {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
