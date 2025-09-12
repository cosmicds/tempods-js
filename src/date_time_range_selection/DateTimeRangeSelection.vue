<template>
  <v-card class="datetime-range-selector" elevation="2">

    <v-card-text>
      <!-- Selection Type Radio Buttons -->
      <v-radio-group 
        v-model="selectionType" 
        row 
        density="compact"
      >
        <v-radio 
          label="Single Date" 
            value="singledate"
          density="compact"
        />    
        <v-radio 
          label="Date Range" 
          value="daterange"
          density="compact"
        />
        <v-radio 
          label="Weekday Pattern" 
          value="weekday"
          density="compact"
        />
        <v-radio 
          label="Pattern (Days × Times)" 
          value="pattern"
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
              :year-range="[allowedDates ? allowedDates[0].getFullYear() : 2023, allowedDates ? allowedDates[allowedDates.length - 1].getFullYear() : new Date().getFullYear()]"
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
              :max="104"
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
              :year-range="[allowedDates ? allowedDates[0].getFullYear() : 2023, allowedDates ? allowedDates[allowedDates.length - 1].getFullYear() : new Date().getFullYear()]"
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
              :year-range="[allowedDates ? allowedDates[0].getFullYear() : 2023, allowedDates ? allowedDates[allowedDates.length - 1].getFullYear() : new Date().getFullYear()]"
            />
          </div>
        </div>
      </v-expand-transition>

      <!-- Pattern Section (Multi-day, Multi-time) -->
      <v-expand-transition>
        <div v-if="selectionType === 'pattern'" class="pattern-section">
          <!-- Days of Week Multi-toggle -->
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">Days of Week</label>
            <!-- <v-btn-toggle
              v-model="selectedDays"
              multiple
              density="compact"
              class=""
            >
              <v-btn
                v-for="(day, idx) in dayOptions"
                :key="idx"
                :value="day.value"
                variant="tonal"
                size="small"
              >{{ day.title.slice(0,1) }}</v-btn>
            </v-btn-toggle> -->
            <!-- just do labeled checkboxes -->
            <label v-for="(day, idx) in dayOptions" :key="idx" class="mr-3" style="text-wrap: nowrap;">
              <input 
                type="checkbox" 
                :value="day.value" 
                v-model="selectedDays" 
              />
              <span class="ml-1">{{ day.title.slice(0,3) }}</span>
            </label>
          </div>

          <!-- Times Multi-select -->
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">Times</label>
            <v-combobox
              v-model="selectedTimes"
              :items="timeOptions"
              label="Add/select times"
              multiple
              chips
              closable-chips
              density="compact"
              variant="outlined"
              hide-details
              hint="24h format HH:MM (e.g., 09:00, 14:30)"
              persistent-hint
              @update:model-value="normalizeTimes"
            />
            <div class="mt-2">
              <v-chip size="small" color="primary" variant="tonal">
                {{ selectedTimezone }}
              </v-chip>
              <span class="ml-2 text-caption">± hours</span>
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

          <!-- Instances -->
          <div class="mb-4">
            <v-number-input
              v-model="instancesBack"
              label="Number of Instances"
              :rules="instanceRules"
              :min="1"
              :max="104"
              density="compact"
              variant="outlined"
              control-variant="split"
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
              :year-range="[allowedDates ? allowedDates[0].getFullYear() : 2023, allowedDates ? allowedDates[allowedDates.length - 1].getFullYear() : new Date().getFullYear()]"
            />
          </div>
        </div>
      </v-expand-transition>

      <!-- Update Custom Range Button -->
      <v-btn
        color="primary"
        variant="elevated"
        class="mb-4"
        @click="updateCustomRange"
      >
        <v-icon class="mr-2">mdi-update</v-icon>
        Confirm Selection 
      </v-btn>

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
import { useTimezone } from '../composables/useTimezone';
import { useDateTimeSelector } from './useDateTimeSelector';
import type { MillisecondRange, TimeRangeSelectionType } from '../types/datetime';

// === INTERFACES === 
// === PROPS ===
const props = defineProps<{
  currentDate: Date;
  selectedTimezone: string;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
  allowedDates?: Date[];
  validTimes?: number[]; // timestamps
}>();

// === EMITS ===
const emit = defineEmits<{
  'ranges-change': [ranges: MillisecondRange[], selectionType: TimeRangeSelectionType]
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
  generateSingleDateRange,
  // pattern additions
  selectedDays,
  selectedTimes,
  generatePatternRanges
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

// Pre-populated time options (every hour from 6am-9pm; user can add custom HH:MM)
const timeOptions = ref<string[]>(Array.from({ length: 15 }, (_, h) => `${String(h+6).padStart(2, '0')}:00`));
// // Compute available time options based on min/max hour in allowedDates in the selected timezone
// causes a bit a performance degredation and offers 6-9pm for all data, so hard cord it. 
// a better range would be from 9am - 5pm
// const minMaxHours = computed(() => {
//   const dates = props.validTimes ?? [];
//   if (dates.length === 0) return { min: 0, max: 23 };
//   const hours = dates.map(d => {
//     return toTimezone(d).getHours();
//   });
//   const min = Math.min(...hours);
//   const max = Math.max(...hours);
//   return { min, max };
// });

// const timeOptions = computed<string[]>(() => {
//   const { min, max } = minMaxHours.value;
//   const count = max - min + 1;
//   const hours = count > 0 ? Array.from({ length: count }, (_, i) => min + i) : Array.from({ length: 24 }, (_, i) => i);
//   return hours.map(h => `${String(h).padStart(2, '0')}:00`);
// });

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
  (v: number) => v >= 1 && v <= 104 || 'Must be between 1 and 104 (2 years)'
]);

// === METHODS ===
// Update custom range button handler
function updateCustomRange() {
  let currentRanges: MillisecondRange[] = [];
  if (selectionType.value === 'singledate') {
    currentRanges = generateSingleDateRange();
  } else if (selectionType.value === 'pattern') {
    currentRanges = generatePatternRanges();
  } else {
    currentRanges = generateMillisecondRanges();
  }
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

// Normalize entered times to HH:MM 24h (flexible entry via copilot)
function normalizeTimes(values: string[]) {
  const normalized = values
    .map(v => String(v).trim())
    .map(v => {
      // Accept HH, H, HH:MM, H:MM, also allow am/pm inputs like 9am, 2:30 PM
      const lower = v.toLowerCase().replace(/\s+/g, '');
      const ampmMatch = lower.match(/^(\d{1,2})(?::(\d{1,2}))?(am|pm)$/);
      if (ampmMatch) {
        let hour = parseInt(ampmMatch[1], 10);
        const minute = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
        const suffix = ampmMatch[3];
        if (suffix === 'pm' && hour < 12) hour += 12;
        if (suffix === 'am' && hour === 12) hour = 0;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      }
      const m = lower.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
      if (!m) return null;
      const h = parseInt(m[1], 10);
      const mm = m[2] ? parseInt(m[2], 10) : 0;
      if (isNaN(h) || h < 0 || h > 23) return null;
      if (isNaN(mm) || mm < 0 || mm > 59) return null;
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    })
    .filter((v): v is string => !!v);
  // Deduplicate
  const unique = Array.from(new Set(normalized));
  selectedTimes.value = unique;
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
