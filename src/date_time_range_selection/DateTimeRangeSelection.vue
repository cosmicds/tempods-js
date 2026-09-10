<template>
  <div ref="dtrs-root" class="datetime-range-selector my-4" elevation="4" color="surface">
    <h4>Select Date(s)</h4>

      <!-- Selection Type Radio Buttons -->
      <v-radio-group 
        v-model="timeSelectionRadio" 
        class="mb-4"
        direction="horizontal" 
        density="comfortable"
        hide-details
      >
        <v-radio 
          :label="`Date Shown On Map: ${currentDateString}`" 
            value="tracked"
        />    
        <v-radio 
          label="1 Day" 
            value="single"
        >    
        <template #label>
          <span class="mr-2" style="text-wrap:nowrap">Single Day</span>
          <date-picker
                v-if="timeSelectionRadio === 'single' && containerSize.width > 450"
                class="mx-2 cds__date-picker"
                ref="singleDateCalendar"
                :model-value="singleDateObj"
                @internal-model-change="handleSingleDateChange"
                :allowed-dates="allowedDates"
                :formats="{input: formatDateDisplay, preview: formatDateDisplay}"
                :input-atters="{ clearable: false }"
                :teleport="true"
                dark
                :year-range="datePickerYearRange"
                :week-start="0"
                six-weeks
                :time-config="{ enableTimePicker: false }"
              >
              <template #action-buttons>
                <button
                  class="dp__action_button dp__action-latest"
                  @click="() => allowedDates ? handleSingleDateChange(allowedDates[allowedDates.length - 1]) : null"
                  @keyup.enter="() => allowedDates ? handleSingleDateChange(allowedDates[allowedDates.length - 1]) : null"
                  :disabled="!allowedDates"
                  elevation="0"
                  size="sm"
                >
                  Latest
                </button>
              </template>
          </date-picker>
        </template>
      </v-radio>
        <v-expand-transition title="Select a Single Date">
        <div v-if="timeSelectionRadio === 'single' && containerSize.width <= 450" class="single-date-section">
            <div class="my-4">
              <date-picker
                class="mx-2 cds__date-picker"
                ref="singleDateCalendar"
                :model-value="singleDateObj"
                @internal-model-change="handleSingleDateChange"
                :allowed-dates="allowedDates"
                :formats="{input: formatDateDisplay, preview: formatDateDisplay}"
                :input-atters="{ clearable: false }"
                :teleport="true"
                dark
                :year-range="datePickerYearRange"
                :week-start="0"
                six-weeks
                :time-config="{ enableTimePicker: false }"
              >
              <template #action-buttons>
                <button
                  class="dp__action_button dp__action-latest"
                  @click="() => allowedDates ? handleSingleDateChange(allowedDates[allowedDates.length - 1]) : null"
                  @keyup.enter="() => allowedDates ? handleSingleDateChange(allowedDates[allowedDates.length - 1]) : null"
                  :disabled="!allowedDates"
                  elevation="0"
                  size="sm"
                >
                  Latest
                </button>
              </template>
          </date-picker>
            </div>
          </div>
        </v-expand-transition>

        <v-radio 
          label="More than 1 Day" 
          value="multiple"
        />
      </v-radio-group>

        

        <v-expand-transition title="Select Multiple Dates">
          <div v-if="timeSelectionRadio === 'multiple'" class="multiple-dates-section">
            <!-- <v-tabs
              v-if="glContainerSize.width >= 500"
              v-model="tab"
              id="dtrs-tabs"
              color="var(--info-background)"
              density="comfortable"
              >
              <v-tab 
                :variant="tab == 'daterange' ? 'flat' : 'tonal'" 
                value="daterange">Custom Range</v-tab>
              <v-tab 
              :variant="tab == 'monthrange' ? 'flat' : 'tonal'" 
              value="monthrange">Quick Select</v-tab>
            </v-tabs> -->
            
            <div class="ml-4 mb-4 pl-4 dtr-select-by-div">
              <v-radio-group
                id="dtr-select-by-group"
                v-model="tab"
                mandatory
                label="Select days by"
              >
                <v-radio 
                  class="daterange-btn"
                  value="daterange" 
                  label="Date Range"
                >
                </v-radio>
                <v-radio 
                  class="monthrange-btn"
                  value="monthrange" 
                  label="Month / Year"
                >
                  
                </v-radio>
              </v-radio-group>
            
            
            <v-tabs-window
              v-model="tab"
              crossfade
              >
              <v-tabs-window-item 
              selected-class="dtrs-tab-window-selected" 
              class="dtrs-tab-window" 
              value="daterange">
                <DateRangePicker
                  v-model:start-date="startDateObj"
                  v-model:end-date="endDateObj"
                  :allowed-dates="allowedDates"
                  :format-function="formatDateDisplay"
                  :clearable="false"
                  :text-input="false"
                  :teleport="true"
                  :dark="true"
                  :year-range="datePickerYearRange"
                />
              </v-tabs-window-item>
              <v-tabs-window-item 
              selected-class="dtrs-tab-window-selected" 
              class="dtrs-tab-window" 
              value="monthrange">
              
                <div class="mb-4">
                  <YearsPicker
                    v-model="selectedYears"
                    :possible-years="possibleYears"
                    show-error-for-empty
                  />
                </div>
                
                <div class="mb-4">
                  <MonthsPicker
                    v-model="selectedMonths"
                    show-error-for-empty
                  />
                </div>
                
              </v-tabs-window-item>
            </v-tabs-window>
                
            
            
            <!-- Pattern Section (Multi-day) -->
            <v-expansion-panels 
              class="mb-2"
              variant="default"
              focusable
              color="var(--info-background)"
              expand-icon="mdi-filter-menu"
              collapse-icon="mdi-chevron-up"
            >
              <v-expansion-panel 
                value="filter-days" 
                bg-color="surface"
              >
                <v-expansion-panel-title class="d-flex flex-wrap ga-2">
                  <div>Filter Days: </div>
                  <div><DaysPreview :days="selectedDays" /></div>
                </v-expansion-panel-title>
                <v-expansion-panel-text  class="pattern-section">
                  <div class="mb-4">
                    <DaysPicker
                      v-model="selectedDays"
                      show-error-for-empty
                    />
                  </div>
                    <DayPatterns
                      v-model="selectedDays"
                    />
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
            
            <!-- Pattern Section (Multi-time) -->
            <v-expansion-panels 
              class="mb-4"
              variant="default"
              focusable 
              color="var(--info-background)"
              expand-icon="mdi-filter-menu"
              collapse-icon="mdi-chevron-up"
            >
              <v-expansion-panel 
                value="filter-times" 
                bg-color="surface"
              >
                <v-expansion-panel-title class="d-flex flex-wrap ga-2">
                  <div>Filter Times: </div>
                  <div>
                    (<span v-if="allDay">All Day</span>
                    <span v-else-if="selectedTimes.length === 0">No Times Selected</span>
                    <span v-else>{{selectedTimes.join(',')}}</span>)
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text  class="pattern-section">
                  <!-- Times Multi-select -->
                  <div class="mb-4">
                    <SpecificTimesSelector
                      v-model="selectedTimes"
                      v-model:timePlusMinus="timePlusMinus"
                    />
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
            </div>
          </div>
      </v-expand-transition>


      <!-- Update Custom Range Button -->
      <v-btn
        color="primary"
        :disabled="invalidConfig"
        variant="elevated"
        class="mb-4 mx-auto d-block"
        @click="updateCustomRange"
      >
        <v-icon class="mr-2">mdi-update</v-icon>
        Confirm Selection 
      </v-btn>
      <div v-show="invalidConfig" class="my-4 mx-auto pa-4 dtrs-invalid-config-warning">
        The current time range selections are invalid and result in no possible times. Please adjust your selections.
      </div>
      <div v-show="submissionTried && currentTimeRanges.length===0" class="my-4 mx-auto pa-4 dtrs-invalid-config-warning">
        <!-- This should be incredibly rare to see except for contrived cases. 
        Ex: Select 8/7/2024 - 8/22/2024 and remove Wed/Thu and select a specific time -->
        There is no TEMPO data available for the time range selected. Please adjust your selections. 
      </div>


    <!-- validate time range button -->
    <v-btn
      v-if="validate"
      color="info"
      variant="outlined"
      class="mb-4 mx-4"
      @click="() =>updateCustomRange(false)"
    >
      <v-icon class="mr-2">mdi-help-circle</v-icon>
      Validate Time Range
    </v-btn>  
    <TimelineVisualization
      v-if="validate"
      :ranges="currentTimeRanges"
      :config="timeRangeConfig"
      :allowed-dates="allowedDates"
    />
  </div>
</template>

<script setup lang="ts">
// no unused vars
// === IMPORTS ===
import { watch, computed, ref, onMounted, useTemplateRef } from 'vue';
import type { MillisecondRange } from '../types/datetime';
import DateRangePicker from './DateRangePicker.vue';
import DaysPicker from './DaysPicker.vue';
import DayPatterns from './DayPatterns.vue';
import MonthsPicker from './MonthsPicker.vue';
import YearsPicker from './YearsPicker.vue';
import DaysPreview from './DaysPreview.vue';
import SpecificTimesSelector from './SpecificTimesSelector.vue';
import TimelineVisualization from './TimelineVisualization.vue';
import { DAYS, MONTHS, generateTimeRanges, DEFAULT_TOLERANCE, ALL_DAY_TOLERANCE } from './date_time_range_generators';
import type { TimeRangeConfig, TimeRangeCreationMode, DayType, MonthType, TimeRangeConfigMultiple, TimeRangeConfigSingle } from './date_time_range_generators';
// === INTERFACES === 
// === PROPS ===
const props = defineProps<{
  currentDate: Date;
  allowedDates?: Date[];
  validTimes?: number[]; // timestamps
  validate?: boolean; // Whether to show the timeline visualization for validation
  enableParceling?: boolean; // Whether to enable parceling of long ranges
  parcelSizeMs?: number; // Maximum parcel size in milliseconds
}>();

// === EMITS ===
const emit = defineEmits<{
  'ranges-change': [ranges: MillisecondRange[], selectionType: TimeRangeCreationMode, customName: string, config: TimeRangeConfig];
}>();



const tab = ref<'daterange' | 'monthrange'>('daterange');

// === COMPOSABLE SETUP ===
// Create refs for the current date to pass to the composable
const currentDateRef = ref(props.currentDate);

// === REFS ===
const singleDateCalendar = ref();
// === PICKER STATE ===
// Direct date objects for date pickers - no unnecessary timestamp conversion
const timeSelectionRadio = ref<TimeRangeCreationMode | 'tracked'>('tracked');
const startDateObj = ref<Date | null>(null);
const endDateObj = ref<Date | null>(null);
const singleDateObj = ref<Date | null>(currentDateRef.value);


watch(() => props.currentDate, (newDate) => {
  if (timeSelectionRadio.value === 'tracked') {
    currentDateRef.value = newDate;
  }
});



const datePickerYearRange = computed<[number, number]>(() => {
  if (!props.allowedDates || props.allowedDates.length === 0) {
    return [2023, new Date().getFullYear()];
  }
  const minYear = props.allowedDates ? props.allowedDates[0].getFullYear() : 2023;
  
  const maxYear = props.allowedDates 
    ? props.allowedDates[props.allowedDates.length - 1].getFullYear() 
    : new Date().getFullYear();
    
  return [minYear, maxYear];
});

const possibleYears = computed(() => {
  const dates = props.allowedDates ?? [2024];
  if (dates.length === 0) return [2023, new Date().getFullYear()];
  const years = dates.map(d => d.getFullYear());
  // Deduplicate and sort
  return [...new Set(years)].sort((a, b) => a - b);
});


function formatDateDisplay(date: Date | null): string {  
  return date?.toLocaleDateString() || '';
}
function formatDateDisplayLong(date: Date | null): string {  
  return date?.toLocaleDateString(undefined, {month: 'short', day:'numeric', year: 'numeric'}) || '';
}


const currentDateString = computed((): string => {
  return currentDateRef.value.toLocaleDateString(undefined, 
    { year:'2-digit', month: 'numeric', day: 'numeric', timeZone: 'UTC' }
  );
});

const timeSelectionMode = ref<TimeRangeCreationMode>(timeSelectionRadio.value === 'tracked' ? 'single' : timeSelectionRadio.value);
watch(timeSelectionRadio, (newVal) => {
  if (newVal === 'tracked') {
    timeSelectionMode.value = 'single';
  } else {
    timeSelectionMode.value = newVal;
  }
});
const selectedMonths = ref<MonthType[]>([...MONTHS]);
const selectedYears = ref<number[]>([...possibleYears.value]);
const selectedTimes = ref<string[]>([]);
const selectedDays = ref<DayType[]>([...DAYS]);
const timePlusMinus = ref<[number, number]>([...ALL_DAY_TOLERANCE]);
const allDay = computed(() => timePlusMinus.value[0] === ALL_DAY_TOLERANCE[0] && timePlusMinus.value[1] === ALL_DAY_TOLERANCE[1]);
const dayNames = DAYS as unknown as DayType[];
const monthNames = MONTHS as unknown as MonthType[];

const timeRangeStart = computed<Date | null>(() => {
  if (tab.value === 'monthrange') {
    // For month range, start from Jan 1 of the earliest selected year and month
    const year = selectedYears.value.length > 0 ? Math.min(...selectedYears.value) : new Date().getFullYear();
    const minMonth = selectedMonths.value.reduce((min, month) => {
      const monthIndex = MONTHS.indexOf(month);
      return monthIndex < min ? monthIndex : min;
    }, 11);
    const month = selectedMonths.value.length > 0 ? minMonth : 0;
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }
  if (!startDateObj.value) return null;
  const utc = Date.UTC(
    startDateObj.value.getUTCFullYear(), 
    startDateObj.value.getUTCMonth(),
    startDateObj.value.getDate(),
    0, 0, 0, 0
  );
  return new Date(utc);
});

const timeRangeEnd = computed<Date | null>(() => {
  if (tab.value === 'monthrange') {
    // For month range, end at Dec 31 of the latest selected year and month
    const year = selectedYears.value.length > 0 ? Math.max(...selectedYears.value) : new Date().getFullYear();
    const maxMonth = selectedMonths.value.reduce((max, month) => {
      const monthIndex = MONTHS.indexOf(month);
      return monthIndex > max ? monthIndex : max;
    }, 0);
    const month = selectedMonths.value.length > 0 ? maxMonth : 11;
    // Get last day of month
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999));
  }
  if (!endDateObj.value) return null;
  const utc = Date.UTC(
    endDateObj.value.getUTCFullYear(), 
    endDateObj.value.getUTCMonth(),
    endDateObj.value.getDate(),
    23, 59, 59, 999
  );
  return new Date(utc);
});

const timeRangeSelectedMonths = computed<MonthType[] | undefined>(() => {
  if (tab.value === 'monthrange') {
    if (selectedMonths.value.length === MONTHS.length) {
      return undefined;
    }
    return selectedMonths.value;
  }
  return undefined;
});

const timeRangeSelectedYears = computed<number[] | undefined>(() => {
  if (tab.value === 'monthrange') {
    if (selectedYears.value.length === possibleYears.value.length) {
      return undefined;
    }
    return selectedYears.value;
  }
  return undefined;
});

const timeRangeConfig = computed<TimeRangeConfig>(() => {
  if (timeSelectionRadio.value === 'single' || timeSelectionRadio.value === 'tracked') {
    return {
      type: 'single',
      singleDate: timeSelectionRadio.value === 'tracked'? currentDateRef.value : singleDateObj.value,
    } as TimeRangeConfigSingle;
  } else {
    const patternConfig: TimeRangeConfigMultiple = {
      type: 'multiple',
      dateRange: {
        start: timeRangeStart.value ?? new Date(),
        end: timeRangeEnd.value ?? new Date(),
      },
      // years needs to send undefined for all years selected
      years: timeRangeSelectedYears.value,
      // months: (selectedMonths.value.length === 0 || allMonthsSelected.value) ? undefined : selectedMonths.value,
      // weekdays: (selectedDays.value.length === 0 || allDaysSelected.value) ? undefined : selectedDays.value,
      // times: ((selectedTimes.value.length > 0) && !allDay.value) ? selectedTimes.value : undefined,
      months: timeRangeSelectedMonths.value,
      weekdays: selectedDays.value.length === DAYS.length ? undefined : selectedDays.value,
      times: allDay.value ? undefined : selectedTimes.value,
      toleranceHours: allDay.value ? [...ALL_DAY_TOLERANCE] : [...DEFAULT_TOLERANCE],
      parcel: props.enableParceling ?? false,
      parcelSize: props.parcelSizeMs,
    };
    return patternConfig as TimeRangeConfig;
  }
});

const invalidConfig = computed<boolean>(() => {
  const config = timeRangeConfig.value;
  if (config.type === 'single') {
    return config.singleDate === null;
  } else {
    if (config.years !== undefined && config.years.length === 0) {
      return true;
    }
    if (config.months !== undefined && config.months.length === 0) {
      return true;
    }
    if (config.weekdays !== undefined && config.weekdays.length === 0) {
      return true;
    } 
    if (config.times !== undefined && config.times.length === 0) {
      return true;
    }
  }
  return false;
});


import { isRingConsecutive } from '@/utils/array_operations/cyclic';
function asRangeOrList<T extends string>(arr: T[], order: T[]): string {
  if (arr.length === 0) return '';  
  if (arr.length <= 2) {
    return arr.map(s => s.slice(0,3)).join(', ');
  }
  const sortedArrr = arr.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const isConsecutive = isRingConsecutive(sortedArrr,  order, true);
  if (isConsecutive.consecutive && sortedArrr.length > 2) {
    return `${isConsecutive.start.slice(0,3)}-${isConsecutive.end.slice(0,3)}`;
  }
  return arr.map(s => s.slice(0,3)).join(', ');
}
  

const customTimeRangeName = computed((): string => {
  
  if (timeSelectionMode.value === 'single') {
    // the "tracked" option should track the currentDateRef (which is current with the currentDate prop)
    const singleDate = timeSelectionRadio.value === 'tracked' ? currentDateRef.value : singleDateObj.value;
    return `${singleDate ? formatDateDisplayLong(singleDate) : 'No date selected'}`;
  }
  console.error(timeSelectionMode.value);
    
  let dateRangeString = '';
  let monthsString = '';
  let yearsString = '';
  let daysString = '';
  let timesString = '';
  if (startDateObj.value && endDateObj.value) {
    dateRangeString = `${formatDateDisplay(startDateObj.value)} - ${formatDateDisplay(endDateObj.value)}`;
  } else {
    // we shouldn't be able to reach this, so just throw an error
    throw new Error('Start date or end date is null');
  }
  
  if (selectedMonths.value.length > 0) {
    monthsString = `Months: ${asRangeOrList(selectedMonths.value, monthNames)}`;
  }
  if (selectedYears.value.length > 0) {
    yearsString = `Years: ${selectedYears.value.join(', ')}`;
  }
  if (selectedDays.value.length > 0) {
    daysString = `${asRangeOrList(selectedDays.value, dayNames)}`;
  }
  if (selectedTimes.value.length > 0 && !allDay.value) {
    timesString = `Times: ${selectedTimes.value.join(', ')}`;
  }
  if (tab.value === 'monthrange') {
    // For monthrange tab, omit date range string
    dateRangeString = '';
  }
  if (tab.value === 'daterange') {
    // For daterange tab, omit months and years string
    monthsString = '';
    yearsString = '';
  }
  
  return [dateRangeString, monthsString, yearsString, daysString, timesString]
    .filter(s => s !== '')
    .join(' | ');
    
});

import { filterForAllowedDates } from "./filter_ranges";

const currentTimeRanges = ref<MillisecondRange[]>([]);
const submissionTried = ref<boolean>(false);
// === METHODS ===
// Update custom range button handler
function updateCustomRange(doEmit=true) {
  let currentRanges: MillisecondRange[] = [];
  currentRanges = generateTimeRanges(timeRangeConfig.value, doEmit);
  
  // Filter ranges to only include those with allowed dates
  if (props.allowedDates && props.allowedDates.length > 0) {
    currentRanges = filterForAllowedDates(currentRanges, props.allowedDates);
  }
  
  currentTimeRanges.value = currentRanges;
  submissionTried.value = doEmit;
  if (doEmit) {
    emit('ranges-change', currentRanges, timeSelectionMode.value, customTimeRangeName.value, timeRangeConfig.value);
  }
}

watch(timeRangeConfig, () => {
  if (props.validTimes) updateCustomRange(false);
}, { immediate: true, deep: true });

function handleSingleDateChange(value: Date) {
  if (value && value.getTime() !== singleDateObj.value?.getTime()) {
    singleDateObj.value = value;
    singleDateCalendar.value?.closeMenu();
  }
}

const dtrsRoot = useTemplateRef('dtrs-root');
const containerSize = ref<{width: number; height: number}>({width: 0, height: 0});
import { watchContainerSize } from '@/utils/dom';


// === LIFECYCLE HOOKS ===
onMounted(() => {
  if (dtrsRoot.value) {
    // console.log(dtrsRoot.value);
    watchContainerSize(dtrsRoot.value as HTMLElement, ".panel", (size) => {
      containerSize.value = size;
    });
  }
  // Initialize default dates
  if (props.allowedDates && props.allowedDates.length > 0) {
    const end = new Date(props.allowedDates[props.allowedDates.length - 1]);
    const start = new Date(end);
    // set back by 1 week
    start.setDate(end.getDate() - 6);
    startDateObj.value = start;
    endDateObj.value = end;
  }
});
// watch(glContainerSize, (newSize) => {
//   console.log('DTRS Golden Layout container size changed:', newSize);
// });
// === WATCHERS ===
// Watch for prop changes and update refs
watch(() => props.currentDate, (newDate) => {
  currentDateRef.value = newDate;
});



// Ranges are now only emitted when the Update Custom Range button is clicked
</script>

<style>

#dtrs-tabs .v-slide-group__content {
  gap: 4px !important;
}
.dtrs-tab-window {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgb(var(--v-theme-surface-variant), 0.3);
  border-radius: 4px;
}

.dtrs-tab-window-selected {
}

.dtrs-invalid-config-warning {
  background-color: rgba(255, 0, 0, 0.25);
  font-weight: bold;
  border: 1px solid red;
  border-left: 4px solid red;
  border-radius: 8px;
}

.daterange-btn .v-btn__overlay {
  display: none;
}

.monthrange-btn .v-btn__overlay {
  display: none;
}

.dtr-select-by-div {
  border-left: 2px solid white;
  border-radius: 4px;
}

label#dtr-select-by-group {
  font-size: 1.17;
  font-weight: 700;
  margin-inline: 0;
  color: inherit;
  opacity: 1;
}
</style>
