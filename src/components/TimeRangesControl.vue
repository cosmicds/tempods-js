<template>
  <v-list>
    <!-- hide vestigial hover for now -->
    <!-- <v-hover
      v-for="(timeRange, index) in timeRanges"
      :key="index" v-slot="{ props }"
      close-delay="50"
      open-delay="250"
      > -->
    <v-list-item
      v-for="(timeRange, index) in timeRanges"
      :key="index"
      class="my-2 rounded-lg time-range-v-list-item"
      density="compact"
      slim
    >
      <template #title>
        <div class="d-flex flex-row justify-space-between align-center">
          <span class="text-subtitle-2 font-weight-bold">
            {{ timeRange.name === 'Displayed Day' ? `Displayed Day: ${ formatTimeRange(timeRange.range) }` : (timeRange.name ?? formatTimeRange(timeRange.range)) }}
          </span>
          <v-btn
            class="float-right"
            :icon="showDetails[index] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            variant="text"
            density="compact"
            v-tooltip:top="showDetails[index] ? 'Hide Details' : 'Show details'"
            @click.stop="showDetails[index] = !showDetails[index]"
          >
          </v-btn>
        </div>
      </template>
      <template #default>
        <TimeRangeCard
        class="mb-1"
        :name="timeRange.name === 'Displayed Day' ? `Displayed Day: ${ formatTimeRange(timeRange.range) }` : (timeRange.name ?? formatTimeRange(timeRange.range))"
        :time-range="timeRange"
        :show="showDetails[index]"
        />
      <!-- </template> -->
      <!-- <template #append> -->
      <div class="datset-controls-action-buttons time-range-action-buttons justify-space-between">
        <v-btn
          v-if="timeRange.id !== 'displayed-day'"
          variant="plain"
          size="small"
          density="compact"
          v-tooltip:top="'Edit Name'"
          icon="mdi-pencil"
          color="white"
          @click.stop="() => emit('edit-time-range', timeRange)"
        ></v-btn>
        <v-tooltip
          :text="hasDatasets(timeRange) ? 'Cannot delete if used in a dataset' : 'Delete'"
          location="left"
        >
          <template #activator="{ props }">
            <div class="d-flex" v-bind="props">
              <v-btn
                variant="plain"
                :icon="hasDatasets(timeRange) ? 'mdi-delete-off' : 'mdi-trash-can'"
                color="white"
                size="small"
                density="compact"
                :disabled="hasDatasets(timeRange)"
                @click.stop="() => emit('delete-time-range', timeRange)"
              ></v-btn>
            </div>
          </template>
        </v-tooltip>
      </div>
      </template>
    </v-list-item>
    <!-- </v-hover> -->
  </v-list>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { TimeRange, UserDataset } from "../types";
import { areEquivalentTimeRanges, formatTimeRange } from "../utils/timeRange";

import TimeRangeCard from "@/date_time_range_selection/TimeRangeCard.vue";

interface TimeRangesControlProps {
  timeRanges: TimeRange[];
  /** only used to decide whether a time range is safe to delete */
  datasets: UserDataset[];
}

const props = defineProps<TimeRangesControlProps>();

const emit = defineEmits<{
  (event: "edit-time-range", timeRange: TimeRange): void;
  (event: "delete-time-range", timeRange: TimeRange): void;
}>();

function hasDatasets(timeRange: TimeRange): boolean {
  return props.datasets.some(d => areEquivalentTimeRanges(d.timeRange, timeRange));
}

const showDetails = ref(props.datasets.map(() => false));
</script>

<style scoped lang="less">
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

:deep(.v-list-item-title)
{
  font-size: 10pt;
}
</style>
