<!-- TimeRange Card to display time range configuration -->
<template>
    <div class="time-range-card">
      
      <!-- Display Date -->
      <div v-if='timeRange?.config === undefined' class="time-range-config-name">
          {{ (name && name!=='') ? name : timeRange.name }} 
      </div>
      
        
      <!-- Single Date -->
      <div class="time-range-single" v-if="timeRange.config && timeRange.config.type==='single'">
        <div class="time-range-config-name">
          {{ (new Date(timeRange.config.singleDate)).toLocaleDateString(undefined, { timeZone: 'UTC'})}}
        </div>
      </div>
      
      
      <!-- Multiple Date -->
      <div class="time-range-multiple" v-if="timeRange.config && timeRange.config.type==='multiple'">
        <!-- Name -->
        <div class="time-range-config-name">
          {{ timeRange.name}}
        </div>
      
        <v-expand-transition>
          <div v-if="showDetails" @click="onShowClick">
            <!-- Date Range -->
            <div class="time-range-config-item">
              <strong>Date Range:</strong> 
              {{ formatDate(timeRange.config.dateRange.start) }} - {{ formatDate(timeRange.config.dateRange.end) }}
            </div>
            
            <!-- Years -->
            <div v-if="timeRange.config.years" class="time-range-config-item">
              <strong>Years:</strong> {{ timeRange.config.years.join(', ') }}
            </div>
            
            <!-- Months -->
            <div v-if="timeRange.config.months" class="time-range-config-item">
              <strong>Months:</strong> {{ timeRange.config.months.map(s => s.slice(0,3)).join(', ') }} 
            </div>
            
            <!-- Weekdays -->
            <div v-if="timeRange.config.weekdays" class="time-range-config-item">
              <strong>Weekdays:</strong> {{ timeRange.config.weekdays.map(s => s.slice(0,3)).join(', ') }} 
            </div>
            
            <!-- Actual Time ranges -->
            <div v-if="timeRange.config.times" class="time-range-config-item">
              <strong>Times:</strong> {{ timeRange.config.times.join(', ') }}
            </div>
          </div>
        </v-expand-transition>
        <v-expand-transition>
          <div class="time-range-show-details" v-if="isHovering" @click="onShowClick">
            Click to {{ showDetails ? 'hide' : 'show' }} details
          </div>
        </v-expand-transition>
        
        
      </div>
    </div>
</template>

<script setup lang="ts">
import {  ref, watch } from 'vue';
import type { TimeRange } from '@/types';

const formatDate = (date: Date): string => {
  try {
    return (new Date(date)).toLocaleDateString(undefined, { timeZone: 'UTC' });
  } catch (e) {
    console.error('Format Date in TimeRangeCard', date);
    return String(date);
  }
};

const props = defineProps<{
  name?: string;
  timeRange: TimeRange;
  isHovering?: boolean;
  show: boolean;
}>();
// console.log('TimeRangeCard props:', props.timeRange.config);

const showDetails = ref(false);
function onShowClick() {
  showDetails.value = !showDetails.value;
}

watch(() => props.show, (newVal) => {
  showDetails.value = newVal;
});
</script>
    

<style land="less" scoped>
.time-range-card {
  padding: 0px;
  height: fit-content;
}

.time-range-config-name {
  font-weight: normal;
  margin: 0;
  display: none;
}

.time-range-config-item {
  margin-bottom: 2px;
  font-size: 0.8em;
}

.time-range-show-details {
  font-size: 0.7em;
  background-color: cadetblue;
  border-radius: 4px;
}
</style>