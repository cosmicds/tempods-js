export interface TimeSlot {
  hour: number;
  minute: number;
}

export interface WeekdaySelection {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  timeSlot: TimeSlot;
  instancesBack: number; // How many instances to go back
  startDate?: Date; // For daterange selection
  endDate?: Date; // For daterange selection
}

export interface DateRangeSelection {
  startDate: Date;
  endDate: Date;
}

export type TimeRangeSelectionType = 'weekday' | 'singledate' | 'daterange' | 'pattern';

export interface DateTimeSelection {
  type: TimeRangeSelectionType;
  weekdaySelection?: WeekdaySelection;
  dateRangeSelection?: DateRangeSelection;
  startDate?: Date; // For daterange selection
  endDate?: Date; // For daterange selection
}

export type { MillisecondRange } from '../types';