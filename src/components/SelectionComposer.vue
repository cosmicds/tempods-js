<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between">
      <v-chip size="x-small" color="primary" variant="tonal">{{ creationProgress.count }}/3</v-chip>
    </v-card-title>
    <v-card-text class="d-flex flex-column ga-3">
      <!-- Region Picker -->
      <v-select
        :items="regions.map(r => ({ title: r.name, value: r }))"
        :model-value="draftUserSelection.region"
        @update:model-value="setDraftSelectionRegion($event as RectangleSelectionType)"
        label="Region"
        :disabled="disabled?.region"
        item-title="title"
        item-value="value"
        density="compact"
        hide-details
        variant="outlined"
      />

      <!-- Time Range Picker: offer Effective (current day/custom) and any active custom ranges -->
      <v-select
        :items="timeRanges"
        v-model="selectedTimeRange"
        label="Time Range"
        :disabled="disabled?.timeRange"
        item-title="name"
        density="compact"
        hide-details
        variant="outlined"
        return-object
        >
      </v-select>

      <!-- Molecule Picker -->
      <v-select
        :items="availableMolecules.map(m => ({ title: m.title, value: m.key }))"
        :model-value="draftUserSelection.molecule"
        @update:model-value="setDraftSelectionMolecule($event)"
        label="Molecule"
        :disabled="disabled?.molecule"
        item-title="title"
        item-value="value"
        density="compact"
        hide-details
        variant="outlined"
      />

      <v-progress-linear :model-value="creationProgress.percent" height="6" color="primary" rounded></v-progress-linear>

      <div class="d-flex ga-2">
        <v-btn
          color="primary"
          :disabled="creationProgress.count < 3"
          @click="composeSelection"
          size="small"
          :loading="loading"
        >
          <template #loader>
            <v-progress-linear
              indeterminate
            ></v-progress-linear>
          </template>
          Get Data
        </v-btn>
        <v-btn
          color="secondary"
          variant="tonal"
          size="small"
          @click="reset"
        >
          Reset
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { v4 } from "uuid";

import type { MappingBackends, RectangleSelection, TimeRange, UserSelection } from "../types";
import type { MillisecondRange } from "../types/datetime";
import type { TempoDataService } from "../esri/services/TempoDataService";
import { type MoleculeType, ESRI_URLS, MOLECULE_OPTIONS } from "../esri/utils";
import { atleast1d } from "../utils/atleast1d";
import { formatTimeRange } from "../utils/timeRange";

let selectionCount = 0; // for naming selections
const selectedTimeRange = ref<TimeRange | null>(null);

interface SelectionComposerProps {
  backend: MappingBackends;
  timeRanges: TimeRange[];
  regions: RectangleSelectionType[];
  disabled?: { region?: boolean; timeRange?: boolean; molecule?: boolean };
  tempoDataService: TempoDataService;
}

const props = defineProps<SelectionComposerProps>();

const emit = defineEmits<{
  (event: "create", selection: UserSelection): void;
}>();

const loading = ref(false);
const error = ref<string | null>(null);

type RectangleSelectionType = RectangleSelection<typeof props.backend>;

interface DraftUserSelection {
  region?: RectangleSelectionType | null;
  timeRange?: MillisecondRange | MillisecondRange[] | null;
  molecule?: MoleculeType | null;
}
const draftUserSelection = ref<DraftUserSelection>({ region: null, timeRange: null, molecule: null });
const availableMolecules = computed(() => MOLECULE_OPTIONS.map(o => ({ key: o.value as MoleculeType, title: o.title })));

// Public composition progress
const creationProgress = computed(() => {
  let count = 0;
  if (draftUserSelection.value.region) count += 1;
  if (draftUserSelection.value.timeRange) count += 1;
  if (draftUserSelection.value.molecule) count += 1;
  return { count, percent: (count / 3) * 100 };
});

function setDraftSelectionRegion(region: RectangleSelectionType | null) {
  (draftUserSelection.value.region as RectangleSelectionType | null) = region || null;
}

function setDraftSelectionMolecule(molecule: MoleculeType | null) {
  draftUserSelection.value.molecule = molecule || null;
}

function setDraftSelectionTimeRange(range: MillisecondRange | MillisecondRange[] | null) {
  draftUserSelection.value.timeRange = range || null;
}

async function composeSelection(): Promise<UserSelection | null> {
  // const color = COLORS[selectionCount % COLORS.length]; // we will use the color from the region
  
  const draft = draftUserSelection.value;
  if (!draft.region || !draft.timeRange || !draft.molecule) {
    console.error('Draft selection incomplete');
    return null;
  }
  
  selectionCount += 1;
  
  const timeRanges = atleast1d(draft.timeRange);
  // Add to available list if new custom
  const timeRange: TimeRange = { id: v4(), name: 'Selection Range', description: formatTimeRange(timeRanges), range: timeRanges.length === 1 ? timeRanges[0] : timeRanges };
  const sel: UserSelection = {
    id: v4(),
    region: draft.region, // as { id: string; name: string; rectangle: RectangleSelectionInfo; color: string; layer?: unknown },
    timeRange,
    molecule: draft.molecule as MoleculeType,
    name: `Selection ${selectionCount}`
  };
  await fetchDataForSelection(sel);
  if (error.value === null) {
    emit("create", sel);
  }
  return sel;
}

async function fetchDataForSelection(sel: UserSelection) {
  const timeRanges = atleast1d(sel.timeRange.range);
  
  try {
    props.tempoDataService.setBaseUrl(ESRI_URLS[sel.molecule].url);
    error.value = null;
    loading.value = true;
    const data = await props.tempoDataService.fetchTimeseriesData(sel.region.geometryInfo, timeRanges);
    sel.samples = data.values;
    sel.errors = data.errors;
    console.log(`Fetched data for ${timeRanges.length} time range(s)`);
  } catch (err) {
    error.value = "error";
  }
  loading.value = false;
}

function reset() {
  draftUserSelection.value = { region: null, timeRange: null, molecule: null };
  selectedTimeRange.value = null;
}

watch(selectedTimeRange, (timeRange: TimeRange | null) => {
  setDraftSelectionTimeRange(timeRange?.range ?? null);
});

// just watch the id's. using a 'deep' watch caused a significant performance hit
watch(() => props.regions.map(r => r.id), (newRegions) => {
  if (draftUserSelection.value.region) {
    const exists = newRegions.find(rid => rid === draftUserSelection.value.region?.id);
    if (!exists) {
      draftUserSelection.value.region = null;
    }
  }
});
</script>

<style scoped>
.v-progress-linear {
  width: 80%;
}
</style>
