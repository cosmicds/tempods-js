<template>
  <v-card class="datetime-range-selector" elevation="2">
    <!-- Header -->
    <v-card-title>
      <v-icon>mdi-clock-outline</v-icon>
      DateTime Range Selector
    </v-card-title>

    <v-card-text>
      <!-- Update Custom Range Button -->
      <v-btn
        color="primary"
        variant="elevated"
        class="mb-4"
        @click="updateCustomRange"
      >
        <v-icon class="mr-2">mdi-update</v-icon>
        Add Custom Range
      </v-btn>

      <!-- Selection Type Radio Buttons -->
      <v-radio-group 
        v-model="selectionType" 
        row 
        density="compact"
      >
        <v-radio 
          label="Weekday Pattern" 
          value="weekday"
          density="compact"
        />
        <v-radio 
          label="Date Range" 
          value="daterange"
          density="compact"
        />
        <v-radio 
          label="Single Date" 
            value="singledate"
          density="compact"
        />
      </v-radio-group>

      <!-- Weekday Pattern Section -->
      <v-expand-transition>
        <div v-if="selectionType === 'weekday'" class="weekday-pattern-section">
          <!-- Reference Date -->
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">Reference Date</label>
            <date-picker
              ref="weekdayCalendar"
              :model-value="weekdayStartDateObj"
              @internal-model-change="handleWeekdayDateChange"
              :allowed-dates="allowedDates"
              :format="formatDateDisplay"
              :preview-format="formatDateDisplay"
              :clearable="false"
              text-input
              :teleport="true"
              dark
            />
          </div>

          <!-- Day of Week Selection -->
          <div class="mb-4">
            <v-select
              v-model="selectedDayOfWeek"
              :items="dayOptions"
              label="Day of Week"
              prepend-inner-icon="mdi-calendar-week"
              density="compact"
              variant="outlined"
              hide-details
            />
          </div>

          <!-- Time Selection -->
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">Time</label>
            <div class="d-flex align-center ga-2">
              <input
                v-model="selectedTime"
                type="time"
                class="time-input"
              />
              <v-chip size="small" color="primary" variant="tonal">
                {{ selectedTimezone }}
              </v-chip>
              <!-- add time plus minus number input. use +- icon and should step in .5 hour increments -->
              
              <input 
                v-model="timePlusMinus"
                type="number"
                min="-12"
                max="12"
                step="0.5"
                class="time-input"
                style="width: 80px;"
                placeholder="± hours"
              />
            </div>
          </div>

          <!-- Number of Instances -->
          <div class="mb-4">
            <v-number-input
              v-model="instancesBack"
              label="Number of Instances"
              :rules="instanceRules"
              :min="1"
              :max="10"
              density="compact"
              variant="outlined"
              control-variant="split"
            />
          </div>
        </div>
      </v-expand-transition>

      <!-- Date Range Section -->
      <v-expand-transition>
        <div v-if="selectionType === 'daterange'" class="date-range-section">
          <!-- Start Date -->
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">Start Date</label>
            <date-picker
              ref="startDateCalendar"
              :model-value="startDateObj"
              @internal-model-change="handleStartDateChange"
              :allowed-dates="allowedDates"
              :max-date="endDateObj ?? new Date()"
              :format="formatDateDisplay"
              :preview-format="formatDateDisplay"
              text-input
              :teleport="true"
              dark
            />
          </div>

          <!-- End Date -->
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">End Date</label>
            <date-picker
              ref="endDateCalendar"
              :model-value="endDateObj"
              @internal-model-change="handleEndDateChange"
              :allowed-dates="allowedDates"
              :min-date="startDateObj ?? new Date(0)"
              :format="formatDateDisplay"
              :preview-format="formatDateDisplay"
              text-input
              :teleport="true"
              dark
            />
          </div>
        </div>
      </v-expand-transition>

      <!-- Single Date Section -->
      <v-expand-transition>
        <div v-if="selectionType === 'singledate'" class="single-date-section">
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">Date</label>
            <date-picker
              ref="singleDateCalendar"
              :model-value="singleDateObj"
              @internal-model-change="handleSingleDateChange"
              :allowed-dates="allowedDates"
              :format="formatDateDisplay"
              :preview-format="formatDateDisplay"
              :clearable="false"
              text-input
              :teleport="true"
              dark
            />
          </div>
        </div>
      </v-expand-transition>

      <!-- Timeline Visualization -->
      <!-- <v-divider class="my-4" />
      
      <TimelineVisualization
        :ranges="ranges"
        :selected-timezone="selectedTimezone"
        :mode="selectionType"
      /> -->
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
// === IMPORTS ===
import { watch, computed, ref, onMounted } from 'vue';
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useTimezone } from './useTimezone';
import { useDateTimeSelector } from './useDateTimeSelector';
import type { MillisecondRange } from '../types/datetime';

// === INTERFACES === 
// === PROPS ===
const props = defineProps<{
  currentDate: Date;
  selectedTimezone: string;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
  allowedDates?: Date[];
  validTimes?: string[];
}>();

// === EMITS ===
const emit = defineEmits<{
  'ranges-change': [ranges: MillisecondRange[], selectionType: string]
}>();

// === COMPOSABLE SETUP ===
// Create refs for the current date and timezone to pass to the composable
const currentDateRef = ref(props.currentDate);
const timezoneRef = ref(props.selectedTimezone);

// Initialize timezone handling
const { setToMidnight, setToEndOfDay, formatDateDisplay } = useTimezone(timezoneRef);

// Initialize the datetime selector composable with optional parameters
const {
  selectionType,
  selectedDayOfWeek,
  selectedTime,
  instancesBack,
  timePlusMinus,
  weekdayStartDate,
  startDate,
  endDate,
  setWeekdayStartTimestamp,
  setStartTimestamp: setStartTimestampInternal,
  setEndTimestamp: setEndTimestampInternal,
  dayNames,
  generateMillisecondRanges,
  // single date additions
  singleDate,
  setSingleDateTimestamp,
  generateSingleDateRange
} = useDateTimeSelector({
  currentDate: currentDateRef,
  selectedTimezone: timezoneRef
});

// === REFS ===
const weekdayCalendar = ref();
const startDateCalendar = ref();
const endDateCalendar = ref();
const singleDateCalendar = ref();

// === PICKER STATE ===
// Direct date objects for date pickers - no unnecessary timestamp conversion
const weekdayStartDateObj = ref<Date | null>(null);
const startDateObj = ref<Date | null>(null);
const endDateObj = ref<Date | null>(null);
const singleDateObj = ref<Date | null>(null);

// Day options for v-select
const dayOptions = computed(() => 
  dayNames.map((day, index) => ({ title: day, value: index }))
);

// Generate ranges for visualization
// const ranges = computed(() => {
//   return generateMillisecondRanges();
// });

// Validation rules
const instanceRules = computed(() => [
  (v: number) => v >= 1 && v <= 10 || 'Must be between 1 and 10'
]);

// === METHODS ===
// Update custom range button handler
function updateCustomRange() {
  const currentRanges = selectionType.value === 'singledate'
    ? generateSingleDateRange()
    : generateMillisecondRanges();
  emit('ranges-change', currentRanges, selectionType.value);
}

// Date change handlers
function handleWeekdayDateChange(value: Date) {
  if (value != null) {
    if (value.getTime() !== weekdayStartDateObj.value?.getTime()) {
      weekdayStartDateObj.value = value;
      // Update composable state directly
      setWeekdayStartTimestamp(value.getTime());
      weekdayCalendar.value?.closeMenu();
    }
  }
}

function handleStartDateChange(value: Date) {
  if (value != null) {
    if (value.getTime() !== startDateObj.value?.getTime()) {
      startDateObj.value = value;
      // Convert to timestamp and update composable
      const timestamp = setToMidnight(value);
      setStartTimestampInternal(timestamp);
      startDateCalendar.value?.closeMenu();
    }
  }
}

function handleEndDateChange(value: Date) {
  if (value != null) {
    if (value.getTime() !== endDateObj.value?.getTime()) {
      endDateObj.value = value;
      // Convert to timestamp and update composable
      const timestamp = setToEndOfDay(value);
      setEndTimestampInternal(timestamp);
      endDateCalendar.value?.closeMenu();
    }
  }
}

function handleSingleDateChange(value: Date) {
  if (value && value.getTime() !== singleDateObj.value?.getTime()) {
    singleDateObj.value = value;
    setSingleDateTimestamp(value.getTime());
    singleDateCalendar.value?.closeMenu();
  }
}

// Formatting functions
// Formatting functions moved to useTimezone composable

// === LIFECYCLE HOOKS ===
onMounted(() => {
  // Initialize default dates
  if (props.defaultStartDate) {
    startDateObj.value = props.defaultStartDate;
    const timestamp = setToMidnight(props.defaultStartDate);
    setStartTimestampInternal(timestamp);
  }
  if (props.defaultEndDate) {
    endDateObj.value = props.defaultEndDate;
    const timestamp = setToEndOfDay(props.defaultEndDate);
    setEndTimestampInternal(timestamp);
  } else {
    // Default end date to today
    const today = new Date();
    endDateObj.value = today;
    const timestamp = setToEndOfDay(today);
    setEndTimestampInternal(timestamp);
  }
  
  // Initialize weekday start date
  if (weekdayStartDate.value) {
    weekdayStartDateObj.value = new Date(weekdayStartDate.value + 'T00:00:00');
  }

  if (singleDate.value > 0 && !singleDateObj.value) {
    singleDateObj.value = new Date(singleDate.value);
  }
});

// === WATCHERS ===
// Watch for prop changes and update refs
watch(() => props.currentDate, (newDate) => {
  currentDateRef.value = newDate;
});

watch(() => props.selectedTimezone, (newTimezone) => {
  timezoneRef.value = newTimezone;
});

// Keep weekdayStartDateObj in sync with the composable's weekdayStartDate
watch(() => weekdayStartDate.value, (newDateString) => {
  const newDate = newDateString ? new Date(newDateString + 'T00:00:00') : null;
  if (newDate?.getTime() !== weekdayStartDateObj.value?.getTime()) {
    weekdayStartDateObj.value = newDate;
  }
});

// Keep singleDateObj in sync with the composable's singleDate
watch(() => singleDate.value, (newTs) => {
  if (newTs > 0) {
    const newDate = new Date(newTs);
    if (newDate.getTime() !== singleDateObj.value?.getTime()) {
      singleDateObj.value = newDate;
    }
  } else {
    singleDateObj.value = null;
  }
});

// Sync date objects with composable timestamps (one-way: composable → UI)
watch(() => startDate.value, (newTimestamp) => {
  const newDate = newTimestamp > 0 ? new Date(newTimestamp) : null;
  if (newDate?.getTime() !== startDateObj.value?.getTime()) {
    startDateObj.value = newDate;
  }
});

watch(() => endDate.value, (newTimestamp) => {
  const newDate = newTimestamp > 0 ? new Date(newTimestamp) : null;
  if (newDate?.getTime() !== endDateObj.value?.getTime()) {
    endDateObj.value = newDate;
  }
});

// Ranges are now only emitted when the Update Custom Range button is clicked
</script>

<style scoped>
/* === COMPONENT STYLES === */
.datetime-range-selector {
  /* Component-specific styles can be added here */
}

/* === SECTION STYLES === */
.weekday-pattern-section,
.date-range-section,
.single-date-section {
  /* Section-specific styles */
}


/* === INPUT STYLES === */
.time-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.23);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.time-input:focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

</style>
