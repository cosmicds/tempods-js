import type { 
  Prettify,
  UserDataset, 
  PlotlyGraphDataSet, 
  AggValue, 
  DataPointError, 
  UnifiedRegion
} from '@/types';
import { toZonedTime } from 'date-fns-tz';
import tz_lookup from '@photostructure/tz-lookup';
import { camelToSnake } from './text';
import { formatFoldedBinValue, foldedDataBinUnit } from './folded_bin_processor';

class PlotlyDatasetBuilder {
  private _x: Date[];
  private _y: (number | null)[];
  private _lower: (number | null)[] | undefined;
  private _upper: (number | null)[] | undefined;
  private _length: number = 0;
  private _size: number;
  private hasErrors: boolean;
  public cleanOutput: boolean;
  private _skippedPoints: number = 0;

  constructor(size: number, hasErrors: boolean, cleanOutput: boolean = false) {
    this._size = size;
    this._x = new Array(size);
    this._y = new Array(size);
    this.hasErrors = hasErrors;
    this.cleanOutput = cleanOutput;
    if (hasErrors) {
      this._lower = new Array(size);
      this._upper = new Array(size);
    }
  }
  
  private get index() {return this._length;}
  
  private _addPointWithError(value: AggValue, error: DataPointError) {
    
    if (this.cleanOutput && value.value === null) {
      this._skippedPoints++;
      return;
    }
    
    this._x[this.index] = value.date;
    this._y[this.index] = value.value;
    // use "definite assignment assertion" since we know hasErrors is true
    this._lower![this.index] = error.lower;
    this._upper![this.index] = error.upper;
    this._length++;
  }
  
  private _addPointNoError(value: AggValue) {
    
    if (this.cleanOutput && value.value === null) {
      this._skippedPoints++;
      return;
    }
    
    this._x[this.index] = value.date;
    this._y[this.index] = value.value;
    this._length++;
  }
  
  addPoint(value: AggValue, error?: DataPointError) {
    if (this.hasErrors && error) {
      this._addPointWithError(value, error);
    } else {
      this._addPointNoError(value);
    }
  }
  
  build(name: string, errorType: 'band' | 'bar' = 'bar'): PlotlyGraphDataSet {
    if (this._length !== (this._size - this._skippedPoints)) {
      throw new Error(`Data length mismatch: expected ${this._size}, got only ${this._length}`);
    }
    const isFull = this._length === this._size;
    
    if (this.hasErrors) {
      return {
        x: isFull ? this._x : this._x.slice(0, this._length),
        y: isFull ? this._y : this._y.slice(0, this._length),
        lower: isFull ? this._lower : this._lower!.slice(0, this._length),
        upper: isFull ? this._upper : this._upper!.slice(0, this._length),
        errorType: errorType,
        name
      };
    } else {
      return {
        x: this._x,
        y: this._y,
        name
      };
    }
  }
}

export function regionCenter(region: UnifiedRegion): { lat: number; lon: number } {
  if (region.geometryType === 'point') {
    return { lat: region.geometryInfo.y, lon: region.geometryInfo.x };
  } else {
    const lat = (region.geometryInfo.ymin + region.geometryInfo.ymax) / 2;
    const lon = (region.geometryInfo.xmin + region.geometryInfo.xmax) / 2;
    return { lat, lon };
  }
}

export function userDatasetToPlotly(selection: Prettify<UserDataset>, useLocalTime: boolean = false): PlotlyGraphDataSet {
  if (!selection.samples) {
    return { x: [], y: [], name: '' };
  }
  
  const data = selection.samples;
  const hasErrors = !!selection.errors;
  const errors = selection.errors ??  {}; // so errors[key] is valid or undefined instead of an error
  const length = Object.keys(data).length;
  
  const plotlyBuilder = new PlotlyDatasetBuilder(length, hasErrors);
  let useTz = (c) => c; // identity function if no timezone
  
  if (useLocalTime) {
    const { lat, lon } = regionCenter(selection.region);
    const tz = tz_lookup(lat, lon);
    useTz = (d: Date) => toZonedTime(d, tz);
  }
  
  Object.keys(data).sort((a, b) => +a - +b).forEach((key) => {
    if (useLocalTime) {
      const value = { ...data[+key], date: useTz(data[+key].date) };
      plotlyBuilder.addPoint(value, errors[+key]);
    } else {
      plotlyBuilder.addPoint(data[+key], errors[+key]);
    }
  });

  return plotlyBuilder.build(selection.name || 'Dataset', 'bar');
}
  

interface OutputTimeSeriesFormat {
  utcDateTime: string;
  localDateTime: string;
  localDate: string;
  localTime: string;
  columnDensity: number | null;
  uncertainty: number | null;
  timezone: string;
  utcOffsetHours: number;
}

const toDate = (date: Date, tz: string) => date.toLocaleDateString(undefined, {
  "year": "numeric",
  "month": "short",
  "day": "numeric", 
  timeZone: tz
}).replace(',', '');
const toTime = (date: Date, tz: string) => date.toLocaleTimeString(undefined, {
  hour12:true, hour:'numeric', minute: '2-digit', second:'2-digit',
  timeZone: tz,
});
function _dateToStrings(date: Date, tz: string) {
  const utcDateTime = toDate(date, 'UTC') + ' ' + toTime(date, 'UTC');
  const utcOffsetHours = -date.getTimezoneOffset() / 60;
  const localDate = toDate(date, tz);
  const localTime = toTime(date, tz);
  const localDateTime = `${localDate} ${localTime}`;
  return { 
    utcDateTime,
    localDateTime, 
    localDate, 
    localTime, 
    utcOffsetHours, 
  };
}

function dateToCODAPStrings(date: Date, tz: string) {
  // CODAP wants MM/DD/YYY, HH:MM:SS AM/PM in UTC, we'll still do utc and local
  const fmt = {
    "year": "numeric",
    "month": "numeric",
    "day": "numeric",
    "hour": "numeric",
    "minute": "numeric",
    "second": "numeric",
    "hour12": true
  } as Intl.DateTimeFormatOptions;
  const utcDateTime = date.toLocaleString('en-US', {
    ...fmt,
    timeZone: 'UTC',
  }).replace(',', '');
  const localDateTime = date.toLocaleString('en-US', {
    ...fmt,
    timeZone: tz, 
  }).replace(',', '');
  // const [localDate, localTime] = localDateTime.split(' ');
  const localDate = date.toLocaleDateString('en-US', {
    "year": "numeric",
    "month": "numeric",
    "day": "numeric",
    timeZone: tz, 
  });
  const localTime = date.toLocaleTimeString('en-US', {
    "hour": "numeric",
    "minute": "numeric",
    "second": "numeric",
    "hour12": true,
    timeZone: tz, 
  });
  const utcOffsetHours = -date.getTimezoneOffset() / 60;
  return { 
    utcDateTime,
    localDateTime, 
    localDate, 
    localTime, 
    utcOffsetHours, 
  };
}

export function createCODAPMeta(dataset: Prettify<UserDataset>): string[] {
  // check useSEM on folded dataset
  
  
  // const errShort = dataset.folded.useSEM ? 'SEM' : 'SD';
  
  
  const meta: string[] = [];
  
  
  // Basic info
  meta.push(`# name: ${dataset.name || 'Unnamed Dataset'}`);
  meta.push('# source: TEMPO-Lab Data Export');  
  
  // Attributes common to all datasets
  const unit = dataset.molecule.startsWith('o3') ? 'Dobson Units' : 'molecules per cm^2';
  meta.push(`# attribute -- name: column_density, description: column density of ${dataset.molecule}, type: numeric, unit: ${unit}, editable: false`);
  const errorMes = ((dataset.folded === undefined) || (dataset.folded && dataset.folded.useSEM)) 
    ? 'standard error of mean ' 
    : 'standard deviation';
  meta.push(`# attribute -- name: uncertainty, description: uncertainy (${errorMes}) in column density, unit: ${unit} , type: numeric, editable: false`);
  
  // Description common to all datasets
  const regionCenterCoords = regionCenter(dataset.region);
  const description = [
    `Dataset Name: ${dataset.name || 'Unnamed Dataset'}`,
    `Molecule: ${dataset.molecule}`,
    `Region Name: ${dataset.region.name || 'Unnamed Region'}`,
    `Region Center: (lat: ${regionCenterCoords.lat.toFixed(4)}, lon: ${regionCenterCoords.lon.toFixed(4)})`,
    `Time Range: ${(dataset.folded && dataset.timeRange.source) ? dataset.timeRange.source.description : dataset.timeRange.description}`,
  ];

  // Folded dataset specific info
  if (dataset.folded) {
    // folding description:
    // Data is folded by {foldingPeriod} by {timeBin}
    if (dataset.folded.foldingPeriod === 'none') {
      description.push(`Data is binned by ${dataset.folded.timeBin}`);
    } else if (dataset.folded.timeBin === 'none') {
      description.push(`Data is folded by ${dataset.folded.foldingPeriod}`);
    } else {
      description.push(`Data is folded by ${dataset.folded.foldingPeriod} and binned by ${dataset.folded.timeBin}`);
    }
    description.push(`Aggregation method: ${dataset.folded.method}`);
    const errorMes = dataset.folded.useSEM ? 'standard error of mean ' : 'standard deviation';
    description.push(`Uncertainty type: ${errorMes}`);
  }
  
  meta.push('# description: ' + description.join('&NewLine;'));
  // Time attributes for data with timestamps
  if (dataset.folded === undefined || (dataset.folded && dataset.folded.foldingPeriod === 'none')) {
    meta.push(`# attribute -- name: utc_date_time, description: date and time in UTC, type: date, editable: false`);
    meta.push(`# attribute -- name: local_date_time, description: date and time in local timezone (M/Y/D), type: date, editable: false`);
    meta.push(`# attribute -- name: local_date, description: date in local timezone (M/Y/D), type: date, editable: false`);
    meta.push(`# attribute -- name: local_time, description: time in local timezone, editable: false`); // no pure "time type" in CODAP
    meta.push(`# attribute -- name: utc_offset_hours, description: offset from UTC in hours, type: numeric, editable: false`);
    meta.push(`# attribute -- name: timezone, description: timezone of the region center, type: categorical, editable: false`);
    return meta;
  } 
  
  // Time attributes for folded data
  if (dataset.folded && dataset.folded.foldingPeriod !== 'none') {
    const foldType = dataset.folded.foldType;
    meta.push(`# attribute -- name: ${camelToSnake(foldType)}_numeric, description: numeric value for folded bin of type ${foldType}, type: numeric, unit: ${foldedDataBinUnit(foldType)}, editable: false`);
    meta.push(`# attribute -- name: ${camelToSnake(foldType)}_value, description: formatted label for folded bin of type ${foldType}, type: categorical, editable: false`);
    return meta;
  }
  
  // we should not reach here so add an error message
  meta.push('# Error: Unable to determine dataset time attributes for CODAP export');
  return meta;
}



export function convertSamplesToJson(dataset: Prettify<UserDataset>): OutputTimeSeriesFormat[] {
  if (!dataset.samples) {
    return [];
  }
  
  const samples = dataset.samples;
  const errors = dataset.errors;
  const center = regionCenter(dataset.region);
  const tz = tz_lookup(center.lat, center.lon);
  
  if (samples === undefined) {
    throw new Error('No samples in dataset');
  }
  
  return Object.entries(samples)
    .map( ([key, sample]) => ({  
      columnDensity: sample.value,
      uncertainty: errors && errors[+key] ? errors[+key]?.upper : null,
      timezone: tz,
      ...dateToCODAPStrings(sample.date, tz),
    }));
}

function _toSafeString(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  return `${val}`;
}


export interface Json2CsvOptions {
  delimiter?: string;
  headers?: string[];
  meta?: string[];
  units?: (string | null)[];
  // all inluded by default if present
  includeHeaders?: boolean;
  includeMeta?: boolean;
  includeUnits?: boolean;
}

/**
 * Convert JSON data to CSV format
 * @param jsonData Array of objects representing the data
 * @param options Options for CSV conversion
 * @returns CSV string
 * Explaination of options
 * - delimiter: Delimiter to use in the CSV (default is ',')
 * - headers: Headers to use (default is keys of the first object)
 * - meta: CODAP formatted meta lines to include at the top of the CSV (default is none)
 * - units: Units corresponding to the headers (default is none)
 * - includeHeaders: Whether to include the header row (default is true)
 * - includeMeta: Whether to include the meta lines (default is true)
 * - includeUnits: Whether to include the units row (default is true)
 */
export function json2Csv(jsonData: object[], options: Json2CsvOptions ): string {

  if (jsonData.length === 0) {
    return '';
  }
  
  if (options.includeHeaders === undefined) {
    options.includeHeaders = true;
  }
  if (options.includeMeta === undefined) {
    options.includeMeta = true;
  }
  if (options.includeUnits === undefined) {
    options.includeUnits = true;
  }
  
  const delimiter = options.delimiter || ',';
  
  let _headers = options.headers;
  if (!_headers) {
    _headers = Object.keys(jsonData[0]);
  }
  
  const rows = jsonData.map(row => _headers.map(h => _toSafeString(row[h])));
  
  const csvRows = [
    _headers.map(h => camelToSnake(h)).join(delimiter), // header row
    ...rows.map(r => r.join(delimiter)) // data rows
  ];
  
  if (!options.includeHeaders) {
    csvRows.shift();
  }
  
  if (options.units && options.includeUnits) {
    const unitRow = '#units ' + options.units.map(u => _toSafeString(u)).join(delimiter);
    // insert before first row or header
    csvRows.unshift(unitRow);
  }
  

  if (options.meta && options.includeMeta) {
    csvRows.unshift(...options.meta);
  }
  
  
  return csvRows.join('\n');
}

/**
 * Create a tab-separated fixed width string from CSV data
 * @param csvData CSV data as a string
 * @param csvDelimiter Delimiter used in the CSV data (default is ',')
 * @returns Fixed width string
 */
export function csv2FixedWidth(csvData: string, csvDelimiter = ',', fixedWidthDelimiter = '\t'): string {
  const lines = csvData.split('\n').map(line => {
    if (line.trim() === '') return [];
    if (line.startsWith('#') && !line.startsWith('#units')) {
      return [line]; // comment line, do not split
    }
    return line.split(csvDelimiter);
  });
  if (lines.length === 0) {
    console.error('No lines in CSV data');
    return '';
  }

  const colWidths: number[] = [];
  lines.forEach(row => {
    if (row.length === 0) return;
    if (row[0].startsWith('#') && !row[0].startsWith('#units')) return;
    
    row.forEach((cell, idx) => {
      if (!isNaN(cell.length)) {
        colWidths[idx] = Math.max(colWidths[idx] || 0, cell.length);
      }
    });
  });
  

  const fixedWidthLines = lines.map(row => {
    if (row.length === 0) return '';
    // comment line, do not pad, just reconstruct it
    if (row[0].startsWith('#') && !row[0].startsWith('#units')) return row[0]; 
      
    return row.map((cell, idx) => (idx>0 ?'  ':'') + `${cell.padEnd(colWidths[idx],' ')}`).join(fixedWidthDelimiter);
  }
  );

  return fixedWidthLines.join('\n');
}

export interface SampleCSVJsonOutput {
  data: object[];
  headers?: string[];
  meta?: string[];
  units?: (string | null)[];
}

export function samplesToJSON(dataset: Prettify<UserDataset>, includeMeta = true, includeUnits = true): SampleCSVJsonOutput {
  const jsonData = convertSamplesToJson(dataset);
  
  const headers = [
    'columnDensity',
    'uncertainty',
    'utcDateTime',
    'localDateTime',
    'localDate',
    'localTime',
    'timezone',
    'utcOffsetHours',
  ];

  return {
    data: jsonData, 
    headers, 
    meta: includeMeta ? createCODAPMeta(dataset) : undefined,
    units: includeUnits ? [
      dataset.molecule.startsWith('o3') ? 'Dobson Units' : 'molecules per cm^2', // columnDensity
      dataset.molecule.startsWith('o3') ? 'Dobson Units' : 'molecules per cm^2', // uncertainty
      '', // localDateTime
      '', // utcDateTime
      '', // localDate
      '', // localTime
      '', // timezone
      'hours', // utcOffsetHours
    ] : undefined,
  };
}





/*
So folded data may have a time column, if it was not folded
and only binned. so we will have to handle both cases.
*/
export function foldedSamplesToJSON(dataset: UserDataset, includeMeta = true, includeUnits = true): SampleCSVJsonOutput {
  if (!dataset.folded || !dataset.plotlyDatasets) {
    console.error('Dataset is not folded');
    return { data: [], headers: undefined, meta:  undefined, units: undefined };
  }
  
  const foldedDataSet = dataset.folded.raw;
  

  //   // if the data was not folded, then we will have timestamps in x, otherwise it will be indices
  const useTimes = dataset.folded.foldingPeriod === 'none';

  const center = regionCenter(dataset.region);
  const tz = tz_lookup(center.lat, center.lon);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonData: any[] = [];

  Object.keys(foldedDataSet.values).forEach((key) => {
    const columnDensity = foldedDataSet.values[key].value;
    const bin = foldedDataSet.values[key].bin;
    const error = foldedDataSet.errors[bin].upper;
    let o = {
      columnDensity,
      uncertainty: error,
      timezone: tz,
    };
    if (useTimes) {
      const timestamp = bin;
      const date = new Date(timestamp);
      o = {
        ...o,
        ...dateToCODAPStrings(date, tz),
      };
    } else {
      o[dataset.folded.foldType + '_numeric'] = bin;
      o[dataset.folded.foldType + '_value'] = formatFoldedBinValue(dataset.folded.foldType, bin);
      // o['time_unit'] = foldedDataBinUnit(dataset.folded.foldType);
    }
    jsonData.push(o);
  });
  
  const headers = useTimes ? [
    'columnDensity',
    'uncertainty',
    'utcDateTime',
    'localDateTime',
    'localDate',
    'localTime',
    'timezone',
    'utcOffsetHours',
  ] : [
    'columnDensity',
    'uncertainty',
    `${dataset.folded.foldType}_numeric`,
    `${dataset.folded.foldType}_value`,
  ];
  
  const units = useTimes ? [
    dataset.molecule.startsWith('o3') ? 'Dobson Units' : 'molecules per cm^2', // columnDensity
    dataset.molecule.startsWith('o3') ? 'Dobson Units' : 'molecules per cm^2', // uncertainty
    '', // utcDateTime
    '', // localDateTime
    '', // localDate
    '', // localTime
    '', // timezone
    'hours', // utcOffsetHours
  ] : [
    dataset.molecule.startsWith('o3') ? 'Dobson Units' : 'molecules per cm^2', // columnDensity
    dataset.molecule.startsWith('o3') ? 'Dobson Units' : 'molecules per cm^2', // uncertainty
    foldedDataBinUnit(dataset.folded.foldType), // folded bin numeric
    '', // folded bin value
  ];  
  
  
  return {
    data: jsonData, 
    headers: headers, 
    meta: includeMeta ? createCODAPMeta(dataset) : undefined,
    units: includeUnits ? units : undefined,
  };
}
