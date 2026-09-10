<template>
  <div class="save-csv">
    <a ref="csvDownloadLink"
      style="display: none;"
      href="#"
      :download="datasetName ?? 'download.csv'"
      ></a>
    <div v-if="isLoading" class="utdc--loading">
      <v-progress-circular indeterminate color="primary" />
      <span class="ml-4">Readying files...</span>
    </div>
    <div v-else>
    <v-btn
      class="save-csv__action"
      variant="text"
      density="compact"
      :disabled="json === undefined || url === ''"
      @click="downloadCsv"
      @keyup.enter="downloadCsv"
    >
      <v-icon v-if="url!==''" icon="mdi-table-arrow-down" color="#ffcc33" />
      <v-progress-circular
        v-else
        indeterminate
        size="16"
        width="2"
        color="#ffcc33"
      />
      <span class="save-csv__label">Download CSV</span>
    </v-btn>
    <use-clipboard v-slot="{ copy, isSupported }" :source="json">
      <v-btn
        class="save-csv__action"
        variant="text"
        density="compact"
        :disabled="!isSupported || json === undefined || clipboardCSV === ''"
        @click="() => copy(clipboardCSV)"
        @keyup.enter="() => copy(clipboardCSV)"
      >
        <v-icon icon="mdi-clipboard-check-multiple" color="#ffcc33" />
        <span class="save-csv__label">Copy to clipboard</span>
      </v-btn>
    </use-clipboard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef, onUnmounted, ref, nextTick, watch} from 'vue';
import { csv2FixedWidth, json2Csv, type SampleCSVJsonOutput } from '@/utils/data_converters';

const isLoading = ref(true);
const bothReady = ref([false, false]); // [fileCSV ready, clipboardCSV ready]
watch(bothReady, (newVal) => {
  if (newVal[0] && newVal[1]) {
    isLoading.value = false;
  }
}, { immediate: true, deep: true });
export interface OutputOptions {
  delimiter: string; // default ','
  includeHeaders: boolean; // default true
  includeUnits: boolean; // default true
  includeMeta: boolean; // default true
  fixedWidth: boolean; // default false
}
interface SaveCsvProps {
  json: SampleCSVJsonOutput | undefined;
  datasetName?: string;
  fileOptions?: OutputOptions;
  clipboardOptions?: OutputOptions;
}

const props = withDefaults(defineProps<SaveCsvProps>(), {
  fileOptions: () => ({
    delimiter: ',',
    includeHeaders: true,
    includeUnits: true,
    includeMeta: true,
    fixedWidth: false,
  }),
  clipboardOptions: () => ({
    delimiter: '\t',
    includeHeaders: true,
    includeUnits: false,
    includeMeta: true,
    fixedWidth: false,
  }),
});


const fileCSV = ref('');
const clipboardCSV = ref('');
const getfileCSV = async () => {
  if (props.json === undefined) return '';
  if (props.fileOptions.fixedWidth === true) {
    const csv = json2Csv(props.json.data, {...props.json, ...props.fileOptions, delimiter: '@@@@@',});
    return csv2FixedWidth(csv, '@@@@@', props.fileOptions.delimiter ?? '\t');
  }
  
  return json2Csv(
    props.json.data, 
    {...props.json, ...props.fileOptions}
  );
};

const getclipboardCSV = async () => {
  if (props.json === undefined) return '';
  if (props.fileOptions.fixedWidth === true) {
    const csv = json2Csv(props.json.data, {...props.json, ...props.clipboardOptions, delimiter: '@@@@@',});
    return csv2FixedWidth(csv, '@@@@@', props.clipboardOptions.delimiter ?? '\t');
  }
  return json2Csv(
    props.json.data, 
    {...props.json, ...props.clipboardOptions}
  );
};

const csvDownloadLink = useTemplateRef<HTMLAnchorElement>('csvDownloadLink');
const url = ref<string>('');
  
function setupFileAndUrls() {
  if (url.value !== '') {
    URL.revokeObjectURL(url.value);
    url.value = '';
  }
  isLoading.value = true;

  getfileCSV().then((csv) => {
    fileCSV.value = csv;
  }).then(() => {
    if (csvDownloadLink.value && props.json !== undefined) {
      const blob = new Blob([fileCSV.value], { type: 'text/csv;charset=utf-8;' });
      url.value = URL.createObjectURL(blob);
      csvDownloadLink.value.href = url.value;
      bothReady.value[0] = true;
    } else {
      console.error(`SaveCSV failed because csvDownloadLink or json is undefined`);
    }
  });
  
  getclipboardCSV().then((csv) => {
    clipboardCSV.value = csv;
    if (csv !== ''){
      bothReady.value[1] = true;
    }
  });
}
  
onMounted(() => {
  nextTick(setupFileAndUrls);
});

watch(() => props.json, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    console.log(`SaveCSV: json prop changed, regenerating CSV`);
    bothReady.value = [false, false];
    setupFileAndUrls();
  }
});


function downloadCsv() {
  if (csvDownloadLink.value) {
    csvDownloadLink.value.click();
  }
}

onUnmounted(() => {
  if (url.value !== '') {
    URL.revokeObjectURL(url.value);
  }
});


// function saveCsv() {
//   if (csv === undefined) return;
//   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//   const link = document.createElement('a');
//   const url = URL.createObjectURL(blob);
//   link.href = url;
//   link.download = `dataset_${new Date() .toLocaleString()}.csv`;
//   link.style.visibility = 'hidden';
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(url);
// }

</script>

<style scoped>
.save-csv {
  display: inline;
  flex-direction: column;
  gap: 0.25rem;
}

.save-csv__action {
  display: inline;
  text-decoration: none;
  text-transform: none;
  font-size: 1em;
}

.save-csv__label {
  white-space: nowrap;
}
</style>
