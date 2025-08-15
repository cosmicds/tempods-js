import { ref, computed, watch } from 'vue';
import type { Ref } from 'vue';
import { useTimezone } from './useTimezone';
import type { 
  MillisecondRange,
  SelectionType 
} from '@/types/datetime';

interface UseDateTimeSelectorOptions {
  currentDate?: Ref<Date>;
  selectedTimezone?: Ref<string>;
}

/**
 * Custom hook for date/time selection with optional configuration
 * @param options - Optional configuration object with currentDate and selectedTimezone refs
 */
export function useDateTimeSelector(
  options: UseDateTimeSelectorOptions = {}
) {
  const { currentDate, selectedTimezone: initialTimezone } = options;
  
  // Initialize timezone handling
  const selectedTimezone = initialTimezone || ref<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  
  const { 
    toTimezone, 
    fromTimezone, 
    setToMidnight, 
    setToEndOfDay,
    formatTime 
  } = useTimezone(selectedTimezone);
  
  // Extend selection type locally to include 'singledate' without altering global type
  const selectionType = ref<SelectionType | 'singledate'>('weekday');
  
  // Weekday selection state
  const selectedDayOfWeek = ref<number>(1); // Default to Monday
  const selectedTime = ref<string>('09:00');
  const instancesBack = ref<number>(4);
  const timePlusMinus = ref<number>(1); // +/- 1 hour for hour selection
  
  // Track if user has manually set the weekday start date
  const hasManualWeekdayStartDate = ref<boolean>(false);

  // Initialize weekdayStartDateTimestamp from currentDate option if provided
  const weekdayStartDateTimestamp = ref<number>(
    currentDate?.value?.getTime() || new Date().getTime()
  );
  const startDate = ref<number>(0);
  const endDate = ref<number>(0);
  
  // Computed properties for date picker integration (convert timestamps to/from date objects)
  const weekdayStartDate = computed({
    get: () => {
      if (hasManualWeekdayStartDate.value && weekdayStartDateTimestamp.value > 0) {
        return new Date(weekdayStartDateTimestamp.value).toISOString().split('T')[0];
      }
      return new Date(weekdayStartDateTimestamp.value).toISOString().split('T')[0];
    },
    set: (value: string) => {
      const date = new Date(value + 'T00:00:00');
      setWeekdayStartTimestamp(date.getTime());
    }
  });
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // New methods for direct timestamp manipulation
  function setWeekdayStartTimestamp(timestamp: number): void {
    weekdayStartDateTimestamp.value = timestamp;
    hasManualWeekdayStartDate.value = timestamp > 0;
  }
  
  // Generate millisecond ranges
  function generateMillisecondRanges(): MillisecondRange[] {
    if (selectionType.value === 'weekday') {
      return generateWeekdayRanges();
    } else if (selectionType.value === 'singledate') {
      return generateSingleDateRange();
    } else {
      return generateDateRangeRanges();
    }
  }
  
  // Parse time string into hour and minute
  const parsedTime = computed(() => {
    const [hour, minute] = selectedTime.value.split(':').map(Number);
    return { hour, minute };
  });
  
  function generateWeekdayRanges(): MillisecondRange[] {
    // Determine base timestamp: use manual timestamp if set, otherwise current date
    const baseTimestamp = hasManualWeekdayStartDate.value && weekdayStartDateTimestamp.value > 0
      ? weekdayStartDateTimestamp.value
      : weekdayStartDateTimestamp.value;
    
    // Create timezone-aware date for calculations  
    const baseDate = toTimezone(baseTimestamp);
    
    const targetDayOfWeek = selectedDayOfWeek.value;
    
    // Find the target day occurrence - use baseDate if it already matches, otherwise find the most recent occurrence
    const currentDate = new Date(baseDate);
    
    // Only search backwards if the base date doesn't already match the target day
    if (currentDate.getDay() !== targetDayOfWeek) {
      while (currentDate.getDay() !== targetDayOfWeek) {
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }
    
    // Generate ranges for the specified number of instances back
    const ranges = Array.from({ length: instancesBack.value }, (_, i) => {
      const rangeDate = new Date(currentDate);
      rangeDate.setDate(currentDate.getDate() - (i * 7)); // Go back by weeks
      
      // Set the specific time
      rangeDate.setHours(parsedTime.value.hour, parsedTime.value.minute, 0, 0);
      
      // Convert to UTC timestamp for the API
      const startTime = fromTimezone(rangeDate);
      const endTime = startTime + (timePlusMinus.value * 60 * 60 * 1000); // Add 1 hour
      
      return {
        start: startTime,
        end: endTime
      };
    });
    
    return ranges.sort((a, b) => - (a.start - b.start));
  }
  
  function generateDateRangeRanges(): MillisecondRange[] {
    if (startDate.value === 0 || endDate.value === 0) return [];
    
    // Use timestamps directly - they should already be set to appropriate times (midnight, end of day, etc.)
    const startMs = startDate.value;
    const endMs = endDate.value;
    
    return [{
      start: startMs,
      end: endMs
    }];
  }
  
  // Single date (timestamp at timezone-local midnight) state
  const singleDate = ref<number>(0);
  
  function setSingleDateTimestamp(ts: number) {
    // Normalize to midnight in the selected timezone
    const midnightTs = setToMidnight(new Date(ts));
    singleDate.value = midnightTs;
  }
  
  // Initialize singleDate from parent currentDate if not already set
  if (singleDate.value === 0) {
    const initialParentTs = currentDate?.value?.getTime();
    if (initialParentTs) {
      setSingleDateTimestamp(initialParentTs);
    }
  }
  
  function generateSingleDateRange(): MillisecondRange[] {
    if (singleDate.value === 0) return [];
    const start = singleDate.value;
    const end = setToEndOfDay(new Date(singleDate.value));
    return [{ start, end }];
  }

  // Watch for currentDate changes and update weekdayStartDateTimestamp if not manually set
  if (currentDate) {
    watch(currentDate, (newCurrentDate) => {
      if (!hasManualWeekdayStartDate.value) {
        weekdayStartDateTimestamp.value = newCurrentDate.getTime();
      }
      // If singleDate not manually set yet (still 0), default it from parent
      if (singleDate.value === 0) {
        setSingleDateTimestamp(newCurrentDate.getTime());
      }
    });
  }
  
  return {
    // State
    selectionType,
    selectedDayOfWeek,
    selectedTime,
    instancesBack,
    dayNames,
    timePlusMinus,
    singleDate,
    
    // Computed properties for date picker integration
    weekdayStartDate,
    startDate,
    endDate,
    
    // New timestamp methods
    setWeekdayStartTimestamp,
    setStartTimestamp: (timestamp: number) => { startDate.value = timestamp; },
    setEndTimestamp: (timestamp: number) => { endDate.value = timestamp; },
    setSingleDateTimestamp,
    
    // Timezone utilities
    setToMidnight,
    setToEndOfDay,
    
    // Utilities
    generateMillisecondRanges,
    formatTime,
    generateSingleDateRange
  };
}