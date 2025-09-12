/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-unused-vars */
/** A set of generic routines for aggregating data that comes from 
 * our Tempo Data Serivce
*/

import type { Prettify } from "@/types";
import type { RawSampleData } from "./TempoDataService";
import type { CEsriTimeseries } from "../types";
// import type { TimeSeriesData } from "./TempoDataService";
import type { AggValue, DataPointError } from "@/types";
import { 
  toZonedTime, // returns a Date object where the time is ajusted
  fromZonedTime, 
  format as formatTz,
  formatInTimeZone
} from 'date-fns-tz';
import {
  nan2null,
  nanmean,
  nanstandardError,
  nanstdev,
  nansum,
  nanmin,
  nanmax,
  nanRootMeanSquare,
} from "./array_math";
import { Period } from "vuetify/lib/components/VTimePicker/VTimePicker";


export interface TimeSeriesData {
  values: Record<number, AggValue>;
  errors: Record<number, DataPointError>;
  locations: Array<{ x: number; y: number }>;
  geometryType: 'rectangle' | 'point';
}

// a flexible aggregation
// aggregation options
// daily, multi-day, weekly

/** https://www.geeksforgeeks.org/javascript/calculate-current-week-number-in-javascript/
* getWeekoOfYear for Date object
* If you have a UTC/js timestamp, and want the day of week for a 
* specfic timezone
*/
function getWeekOfYear(date: Date) {
  const currentDate = 
    (typeof date === 'object') ? date : new Date();
  const januaryFirst = 
    new Date(currentDate.getFullYear(), 0, 1);
  const daysToNextMonday = 
    (januaryFirst.getDay() === 1) ? 0 : 
      (7 - januaryFirst.getDay()) % 7;
  const nextMonday = 
    new Date(currentDate.getFullYear(), 0, 
      januaryFirst.getDate() + daysToNextMonday);

  return (currentDate < nextMonday) ? 52 : 
    (currentDate > nextMonday ? Math.ceil(
      (currentDate.getTime() - nextMonday.getTime()) / (24 * 3600 * 1000) / 7) : 1);
}


function getBeginningOfWeek(date: Date, timezone?: string): Date {
  const zonedDate = timezone ? toZonedTime(date, timezone) : date;
  const day = zonedDate.getDay(); // 0 (Sun) to 6 (Sat)
  const weekStart = new Date(zonedDate);
  weekStart.setDate(zonedDate.getDate() - day); // move back to sunday
  weekStart.setHours(0, 0, 0, 0);
  // want this to return the UTC time (so we can use the timestamp if we want)
  return timezone ? fromZonedTime(weekStart, timezone) : weekStart;
}

function getEndOfWeek(date: Date, timezone?: string): Date {
  const zonedDate = timezone ? toZonedTime(date, timezone) : date;
  const day = zonedDate.getDay();
  const weekEnd = new Date(zonedDate);
  // Move to Saturday (day 6) then set end of day
  weekEnd.setDate(zonedDate.getDate() + (6 - day));
  weekEnd.setHours(23, 59, 59, 999);
  return timezone ? fromZonedTime(weekEnd, timezone) : weekEnd;
}


type Window = string ; // e.g, '1d', '3d', '1w' , 'weekly'

export type AggregationMethod = 'mean' | 'median' | 'sum' | 'min' | 'max';


export class TimeSeriesResampler {
  window: Window;
  timezone?: string;
  method: AggregationMethod;
  errorMethod: 'std' | 'sem' = 'sem'; // standard deviation or standard error of the mean
  includeCalibrationUncertainty = true; // whether to include calibration uncertainty in the error propagation

  constructor(
    window: Window, 
    timezone: string = 'UTC', 
    method: AggregationMethod = 'mean',
    errorMethod: 'std' | 'sem' = 'sem',
    includeCalibrationUncertainty = true
  ) {
    console.log("Creating Grouper with window:", window, "timezone:", timezone, "method:", method);
    this.window = window;
    this.timezone = timezone;
    this.method = method;
    this.errorMethod = errorMethod;
    this.includeCalibrationUncertainty = includeCalibrationUncertainty;
    if (includeCalibrationUncertainty) {
      console.error('This may not handle NaN values in the errors correctly which can lead to Zero values for errors');
    }
  }
  
  private _getZonedDate(date: Date): Date {
    return this.timezone ? toZonedTime(date, this.timezone) : date;
  }

  getGroupId(date: Date): string {
    const zonedDate = this._getZonedDate(date);
    const groupDate = new Date(zonedDate);
    
    // handle daily or multi-day
    if (this.window.endsWith('d')) {
      const days = parseInt(this.window.slice(0, -1));
      const day = zonedDate.getDate();
      const groupDay = Math.floor((day - 1) / days) * days + 1;
      groupDate.setDate(groupDay);
      groupDate.setHours(0, 0, 0, 0);
      
      // handle weekly
    } else if (this.window === '1w' || this.window === 'weekly') {
      const weekStart = getBeginningOfWeek(date, this.timezone);
      return String(weekStart.getTime());
      
      // handly monthly
    } else if (this.window === '1m' || this.window === 'monthly') {
      groupDate.setDate(1);
      groupDate.setHours(0, 0, 0, 0);
      
      // default to daily
    } else {
      groupDate.setHours(0, 0, 0, 0);
    }
    const utcMidnight = this.timezone ? fromZonedTime(groupDate, this.timezone) : groupDate;
    return String(utcMidnight.getTime());
  }
  
  groupData(timeseries: Prettify<TimeSeriesData>): TimeSeriesData {
    console.log("Grouping data with window:", this.window, "and method:", this.method);
    // the data and the error are in the same order
    const data = Object.values(timeseries.values); // AggValue[]
    const error = Object.values(timeseries.errors); // DataPointError[] | undefined
    
    // colate the data and errors into groups (bins)
    const groups: { [key: string]: { values: AggValue[]; errors: DataPointError[] } } = {};
    data.forEach((d, idx) => {
      const groupId = this.getGroupId(d.date);
      if (!groups[groupId]) {
        groups[groupId] = { values: [], errors: [] };
      }
      groups[groupId].values.push(d);
      if (error) {
        groups[groupId].errors.push(error[idx]);
      }
    });

    // these will be the time-aggregated values
    const values: Record<number, AggValue> = {};
    const errors: Record<number, DataPointError> = {};
    
    // loop over the groups
    for (const groupId in groups) {
      const groupData = groups[groupId];
      const timestamp = parseInt(groupId); // this is the UTC for the start of the group

      const groupValues = groupData.values.map(d => d.value);
      let aggregatedValue: number | null;
      
      switch (this.method) {
        case 'mean':
          aggregatedValue = nanmean(groupValues);
          break;
        case 'min':
          aggregatedValue = nanmin(groupValues);
          break;
        case 'max':
          aggregatedValue = nanmax(groupValues);
          break;
        default:
          aggregatedValue = nanmean(groupValues);
      }
      
      values[timestamp] = { value: aggregatedValue, date: new Date(timestamp) };
      
      const standardError = this.errorMethod === 'sem' ? nanstandardError(groupValues) : (nanstdev(groupValues) || 0);
      if (!standardError) {
        console.error(
          'Standard error is null for group', 
          formatInTimeZone(new Date(timestamp), this.timezone ?? 'UTC', "yyyy-mm-dd"), 
          'with values', groupValues);
      }

      if (this.includeCalibrationUncertainty && groupData.errors.length > 0) {
        const lowers = groupData.errors.map(e => e.lower).filter(v => v !== null) as number[];
        const uppers = groupData.errors.map(e => e.upper).filter(v => v !== null) as number[];
        
        const newLower = nanRootMeanSquare(lowers);
        const newUpper = nanRootMeanSquare(uppers);
        
        errors[timestamp] = {
          lower: nan2null(nanRootMeanSquare([standardError, newLower])),
          upper: nan2null(nanRootMeanSquare([standardError, newUpper]))
        };
      } else {
        errors[timestamp] = { lower: nan2null(standardError), upper: nan2null(standardError) };
      }
      // end of loop over groups
    }
    
    // DEBUG ONLY: this loop should never have to do anything
    for (const ts in errors) {
      if (errors[ts].lower !== null && isNaN(errors[ts].lower!)) {
        console.error('Error lower is NaN for timestamp. Setting to null.', ts, errors[ts]);
        errors[ts].lower = null;
      }
      if (errors[ts].upper !== null && isNaN(errors[ts].upper!)) {
        console.error('Error upper is NaN for timestamp. Setting to null.', ts, errors[ts]);
        errors[ts].upper = null;
      }
    }
    
    return {
      values,
      errors,
      locations: timeseries.locations,
      geometryType: timeseries.geometryType
    };
  }
}





export type FoldType = 
    'hourOfDay' | 
    'dayOfWeek' | 
    'hourOfWeek'|
    'weekdayWeekend';

export interface FoldBinContent {
  bin: number;
  timestamps: number[];          // original UTC timestamps of samples contributing
  binPhase: number[]
  lowers: (number | null)[];    // original lower error values (may include nulls)
  uppers: (number | null)[];    // original upper error values (may include nulls)
  rawValues: (number | null)[];  // raw numeric values (may include nulls)
}


// functino to sort folded bin content by timestamps
export function sortfoldBinContent(bin: FoldBinContent): FoldBinContent {
  const sorted = bin.binPhase
    .map((bp, idx) => ({ bp, idx }))
    .sort((a, b) =>a.bp - b.bp);
  
  const sortedIndices = sorted.map(item => item.idx);
  function applySort<T>(arr: T[]): T[] {
    return sortedIndices.map(i => arr[i]);
  }
  
  return {
    bin: bin.bin,
    timestamps: applySort(bin.timestamps),
    binPhase: sorted.map(item => item.bp),
    rawValues: applySort(bin.rawValues),
    lowers: applySort(bin.lowers),
    uppers: applySort(bin.uppers)
  };
}

export type Seasons = 'DJF' | 'MAM' | 'JJA' | 'SON'; // meteorological seasons

export interface FoldedAggValue {
  value: number | null;
  bin: number; // 0–23, 0–6, or 0–167 depending on fold
}

interface InternalBin {
      bin: number;
      timestamps: number[];
      rawValues: (number | null)[];
      numericValues: number[];           // non-null numeric values
      calibrationErrors: DataPointError[]; // original per-sample errors
    }

export interface FoldedTimeSeriesData {
  foldType: FoldType;
  values: Record<number, FoldedAggValue>;         // binIndex -> aggregated value
  errors: Record<number, DataPointError>;         // binIndex -> aggregated error
  bins: Record<number, FoldBinContent>;           // binIndex -> full raw bin content
  locations: Array<{ x: number; y: number }>;
  geometryType: 'rectangle' | 'point';
}

/** Class for folding data periodically 
 * We want to control the periodicity and resolution
*/
export class TimeSeriesFolder {
  foldType: FoldType;
  timezone: string;
  method: AggregationMethod;
  errorMethod: 'std' | 'sem';
  includeCalibrationUncertainty: boolean;

  constructor(
    foldType: FoldType,
    timezone: string = 'UTC',
    method: AggregationMethod = 'mean',
    errorMethod: 'std' | 'sem' = 'sem',
    includeCalibrationUncertainty = true
  ) {
    this.foldType = foldType;
    this.timezone = timezone;
    this.method = method;
    this.errorMethod = errorMethod;
    this.includeCalibrationUncertainty = includeCalibrationUncertainty;
  }
  
  private _getZonedDate(date: Date): Date {
    return this.timezone ? toZonedTime(date, this.timezone) : date;
  }

  // convenience to get the number of bins
  private _binCount(): number {
    switch (this.foldType) {
      case 'hourOfDay': return 24;
      case 'dayOfWeek': return 7;
      case 'hourOfWeek': return 24*7;
      case 'weekdayWeekend': return 2;
    }
  }
  
  // instead of a groupId we just need the bin index
  private _binIndex(date: Date): number {
    const z = this._getZonedDate(date);
    switch (this.foldType) {
      case 'hourOfDay': return z.getHours();                 // 0–23
      case 'dayOfWeek': return z.getDay();                   // 0–6
      case 'hourOfWeek': return z.getDay() * 24 + z.getHours(); // 0–167
      case 'weekdayWeekend': return (z.getDay() % 6 > 0) ? 1 : 0; // 1=weekday, 0=weekend
    }
  }
  
  private _binPhase(date: Date): number {
    const z = this._getZonedDate(date);
    switch (this.foldType) {
      case 'hourOfDay': return z.getMinutes() / 60 + z.getSeconds() / 3600; // fraction of hour
      case 'dayOfWeek': return (z.getHours() + z.getMinutes() / 60 + z.getSeconds() / 3600) / 24; // fraction of day
      case 'hourOfWeek': return (z.getMinutes() / 60 + z.getSeconds() / 3600) ; // fraction of hour
      case 'weekdayWeekend': return 0;  // this is a binary choice, no phase
    }
  }
  
  foldData(timeseries: Prettify<TimeSeriesData>): FoldedTimeSeriesData {
    
    // the data and the error are in the same order
    const data = Object.values(timeseries.values) as Prettify<AggValue>[]; // AggValue[]
    const error = Object.values(timeseries.errors); // DataPointError[] | undefined
    
    const binCount = this._binCount();
    const binsRecord: Record<number, InternalBin> = {};
    
    Object.entries(timeseries.values).forEach(([ts,d]) => {
      const binIndex = this._binIndex(d.date);
      console.log('Folding date', d.date, 'to bin index', binIndex, 'with fold type', this.foldType);
      if (binIndex == null || binIndex < 0 || binIndex >= binCount) {
        console.error('Invalid bin index', binIndex, 'for date', d.date, 'with fold type', this.foldType);
        return;
      }
      if (!binsRecord[binIndex]) {
        binsRecord[binIndex] = {
          bin: binIndex,
          timestamps: [],
          rawValues: [],
          numericValues: [],
          calibrationErrors: []
        };
      }
      
      const bin = binsRecord[binIndex];
      bin.timestamps.push(d.date.getTime());
      bin.rawValues.push(d.value);
      // get clean values
      if (d.value !== null && !isNaN(d.value)) {
        bin.numericValues.push(d.value);
      }
      
      const err = timeseries.errors[ts];
      if (err) {
        bin.calibrationErrors.push(err);
      } else {
        console.error('No error found for timestamp', ts);
      }
      
    });

    // these will be the time-aggregated values
    const values: Record<number, FoldedAggValue> = {};
    const errors: Record<number, DataPointError> = {};
    const publicBins: Record<number, FoldBinContent> = {};
    
    // loop over the groups
    Object.values(binsRecord).forEach(bin => {
      // const bin = binsRecord[binKey];
      const { bin: binIndex, numericValues, calibrationErrors, rawValues, timestamps } = bin;
      const groupValues = numericValues;
      
      let aggregatedValue: number | null;
      
      switch (this.method) {
        case 'mean':
          aggregatedValue = nanmean(groupValues);
          break;
        case 'min':
          aggregatedValue = nanmin(groupValues);
          break;
        case 'max':
          aggregatedValue = nanmax(groupValues);
          break;
        default:
          aggregatedValue = nanmean(groupValues);
      }
      
      // we just want to keep the bin index as the "timestamp"
      // so use obviously wrong date
      values[binIndex] = { value: aggregatedValue, bin: binIndex };
      
      const dispersionMeasure = this.errorMethod === 'sem' 
        ? nanstandardError(groupValues) 
        : (nanstdev(groupValues) || 0);
      
      if (this.includeCalibrationUncertainty && calibrationErrors.length > 0) {
        const lowers = calibrationErrors.map(e => e.lower).filter(v => v !== null) as number[];
        const uppers = calibrationErrors.map(e => e.upper).filter(v => v !== null) as number[];
        
        const newLower = nanRootMeanSquare(lowers);
        const newUpper = nanRootMeanSquare(uppers);
        
        errors[binIndex] = {
          lower: nan2null(nanRootMeanSquare([dispersionMeasure, newLower])),
          upper: nan2null(nanRootMeanSquare([dispersionMeasure, newUpper]))
        };
      } else {
        errors[binIndex] = { lower: nan2null(dispersionMeasure), upper: nan2null(dispersionMeasure) };
      }
      
      // DEBUG ONLY: this loop should never have to do anything
      for (const ts in errors) {
        if (errors[ts].lower !== null && isNaN(errors[ts].lower)) {
          console.error('Error lower is NaN for timestamp. Setting to null.', ts, errors[ts]);
          errors[ts].lower = null;
        }
        if (errors[ts].upper !== null && isNaN(errors[ts].upper)) {
          console.error('Error upper is NaN for timestamp. Setting to null.', ts, errors[ts]);
          errors[ts].upper = null;
        }
      }
      
      
      
      // expose the full bin contents
      publicBins[binIndex] = {
        bin: binIndex,
        timestamps: [...timestamps],
        binPhase: timestamps.map(t => this._binPhase(new Date(t))),
        rawValues: [...rawValues].map(v => nan2null(v)),
        lowers: calibrationErrors.map(e => e.lower).map(v => nan2null(v)),
        uppers: calibrationErrors.map(e => e.upper).map(v => nan2null(v))
      };
      
    });
    
    
    return {
      foldType: this.foldType,
      values,
      errors,
      bins: publicBins,
      locations: timeseries.locations,
      geometryType: timeseries.geometryType
    };
  }
}


export function hourOfWeekToDayHour(hourOfWeek: number): { day: number; hour: number } {
  const day = Math.floor(hourOfWeek / 24);
  const hour = hourOfWeek % 24;
  return { day, hour };
}