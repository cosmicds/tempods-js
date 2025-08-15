/* eslint-disable @typescript-eslint/naming-convention */
import { rectangleToGeometry, pointToGeometry } from '../geometry';
import type { RectBounds, PointBounds, EsriGeometryType } from '../geometry';
import type { 
  EsriGetSamplesReturn, 
  EsriGetSamplesReturnError, 
  EsriGetSamplesSample, 
  Variables, 
  EsriInterpolationMethod, 
  CEsriTimeseries 
} from '../types';
import type { AggValue, DataPointError, MillisecondRange } from "../../types";

// ============================================================================
// TYPES
// ============================================================================

export interface FetchOptions {
  sampleCount?: number;
  interpolation?: EsriInterpolationMethod;
  returnFirstValueOnly?: boolean;
  outFields?: string | string[];
  sliceID?: string | number;
}


export type TimeRanges = MillisecondRange | MillisecondRange[];

export interface RawSampleData {
  samples: CEsriTimeseries[];
  metadata: {
    totalSamples: number;
    timeRange: MillisecondRange | MillisecondRange[];
    geometry: RectBounds | PointBounds;
    geometryType: 'rectangle' | 'point';
  };
}

export interface TimeSeriesData {
  values: Record<number, AggValue>;
  errors: Record<number, DataPointError>;
  locations: Array<{ x: number; y: number }>;
  geometryType: 'rectangle' | 'point';
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function safeParseNumber(value: string | null | undefined): number | null {
  if (value === null || value === '' || value === undefined) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

function stringifyEsriGetSamplesParameters(params: {
  geometry: ReturnType<typeof rectangleToGeometry> | ReturnType<typeof pointToGeometry>;
  geometryType: EsriGeometryType;
  sampleDistance?: number;
  sampleCount?: number;
  mosaicRule?: string | Record<string, unknown>;
  pixelSize?: number;
  returnFirstValueOnly?: boolean;
  interpolation: EsriInterpolationMethod;
  outFields?: string | string[];
  sliceID?: string | number;
  time?: string | [number, number] | [Date, Date];
  f: 'pjson';
}): URLSearchParams {
  const {
    geometry,
    geometryType,
    sampleDistance,
    sampleCount,
    mosaicRule,
    pixelSize,
    returnFirstValueOnly,
    interpolation,
    outFields,
    sliceID,
    time,
  } = params;
  
  const options: Record<string, string> = {
    f: 'pjson',
    geometry: JSON.stringify(geometry),
    geometryType: geometryType,
    interpolation: interpolation,
  };

  if (sampleDistance) options.sampleDistance = sampleDistance.toString();
  if (sampleCount) options.sampleCount = sampleCount.toString();
  if (mosaicRule) options.mosaicRule = JSON.stringify(mosaicRule);
  if (pixelSize) options.pixelSize = pixelSize.toString();
  if (returnFirstValueOnly !== undefined) options.returnFirstValueOnly = returnFirstValueOnly.toString();
  if (outFields) options.outFields = Array.isArray(outFields) ? outFields.join(',') : outFields;
  if (sliceID !== undefined) options.sliceID = sliceID.toString();
  if (time) {
    const timeStr = Array.isArray(time)
      ? time.map((t) => (t instanceof Date ? t.getTime() : t)).join(',')
      : time;
    options.time = timeStr;
  }

  return new URLSearchParams(options);
}

// ============================================================================
// TEMPO DATA SERVICE
// ============================================================================

export class TempoDataService {
  private baseUrl: string;
  private variable: Variables;
  
  constructor(baseUrl: string, variable: Variables = "NO2_Troposphere") {
    this.baseUrl = baseUrl;
    this.variable = variable;
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  setVariable(variable: Variables): void {
    this.variable = variable;
  }

  getVariable(): Variables {
    return this.variable;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ============================================================================
  // CORE DATA FETCHING
  // ============================================================================
  /**
   * Fetch raw samples from the ESRI Image Server
   */
  async fetchSample(
    geometry: RectBounds | PointBounds,
    timeRange: MillisecondRange,
    options: FetchOptions = {}
  ): Promise<RawSampleData> {
    const esriGeometry = this.isRectBounds(geometry) 
      ? rectangleToGeometry(geometry as RectBounds)
      : pointToGeometry(geometry as PointBounds);

    const geometryType: EsriGeometryType = this.isRectBounds(geometry)
      ? 'esriGeometryPolygon'
      : 'esriGeometryPoint';

    // Handle multiple time ranges by combining them
    const timeString = `${timeRange.start},${timeRange.end}`;

    const params = {
      f: 'pjson' as const,
      interpolation: 'RSP_NearestNeighbor' as EsriInterpolationMethod,
      returnFirstValueOnly: false,
      geometry: esriGeometry,
      geometryType: geometryType,
      time: timeString,
      sampleCount: options.sampleCount || 30,
      ...options
    };

    const urlWithParams = `${this.baseUrl}/getSamples/?${stringifyEsriGetSamplesParameters(params).toString()}`;
    
    try {
      const response = await fetch(urlWithParams);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data: EsriGetSamplesReturn | EsriGetSamplesReturnError = await response.json();
      
      if ('error' in data) {
        throw new Error(`Error fetching samples (${data.error.code}): ${data.error.message} ${data.error.details}`);
      }

      const processedSamples = data.samples.map((sample: EsriGetSamplesSample) => ({
        x: sample.location.x,
        y: sample.location.y,
        time: sample.attributes.StdTime,
        date: new Date(sample.attributes.StdTime),
        variable: safeParseNumber(sample.attributes[this.variable] ?? ''),
        value: safeParseNumber(sample.value),
        locationId: sample.locationId,
        geometryType: this.isRectBounds(geometry) ? 'rectangle' : 'point' as 'rectangle' | 'point'
      })); // this is a CEsriTimeseries[]
      console.log(`Fetched ${processedSamples.length} samples for time range ${timeRange.start}-${timeRange.end}`);
      return {
        samples: processedSamples,
        metadata: {
          totalSamples: processedSamples.length,
          timeRange: timeRange,
          geometry,
          geometryType: this.isRectBounds(geometry) ? 'rectangle' : 'point'
        }
      };
    } catch (error) {
      console.error('Error in TempoDataService.fetchSamples:', error);
      throw error;
    }
  }
  
  /**
   * Fetch raw samples from the ESRI Image Server
   */
  async fetchSamples(
    geometry: RectBounds | PointBounds,
    timeRanges: TimeRanges,
    options: FetchOptions = {}
  ): Promise<RawSampleData> {
    
    if (!Array.isArray(timeRanges)) {
      return this.fetchSample(geometry, timeRanges, options);
    }
    
    const promises = timeRanges.map(async (tr) => {
      try {
        return await this.fetchSample(geometry, tr, options);
      } catch (error) {
        console.error(`Error fetching sample for time range ${tr.start}-${tr.end}:`, error);
        return null;
      }
    });

    return Promise.all(promises).then((results) => {
      const validResults = results.filter((result): result is RawSampleData => result !== null);
      const samples = validResults.map((result) => result.samples).flat();
      return {
        samples,
        metadata: {
          totalSamples: samples.length,
          timeRange: timeRanges,
          geometry: geometry,
          geometryType: this.isRectBounds(geometry) ? 'rectangle' : 'point',
        }
      } as RawSampleData;
    });
  }

  // ============================================================================
  // AGGREGATION METHODS
  // ============================================================================

  /**
   * Aggregate samples by time (for rectangle areas)
   */
  aggregateByTime(samples: CEsriTimeseries[]): TimeSeriesData {
    // Group samples by time
    const grouped = new Map<number, CEsriTimeseries[]>();
    samples.forEach((sample) => {
      if (!grouped.has(sample.time)) {
        grouped.set(sample.time, []);
      }
      grouped.get(sample.time)?.push(sample);
    });

    // Calculate aggregated values
    const values: Record<number, AggValue> = {};
    const errors: Record<number, DataPointError> = {};
    
    grouped.forEach((samples, time) => {
      const sampleValues = samples.map(s => s.value);
      values[time] = this.calculateMean(sampleValues, time);
      errors[time] = this.calculateError(sampleValues);
    });

    // Collect unique locations
    const seen = new Set<string>();
    const locations: Array<{ x: number; y: number }> = [];
    for (const sample of samples) {
      const key = `${sample.x},${sample.y}`;
      if (!seen.has(key)) {
        seen.add(key);
        locations.push({ x: sample.x, y: sample.y });
      }
    }

    return { values, errors, locations, geometryType: samples[0].geometryType };
  }

  /**
   * Get single point data (for center points or individual points)
   */
  // aggregatePoint(samples: CEsriTimeseries[]): TimeSeriesData | null {
  //   if (samples.length === 0) return null;
    
  //   // For point data, we typically expect one sample per time
  //   // Group by time and aggregate
  //   const grouped = new Map<number, CEsriTimeseries[]>();
  //   samples.forEach((sample) => {
  //     if (!grouped.has(sample.time)) {
  //       grouped.set(sample.time, []);
  //     }
  //     grouped.get(sample.time)?.push(sample);
  //   });

  //   // Calculate aggregated values
  //   const values: Record<number, AggValue> = {};
  //   const errors: Record<number, DataPointError> = {};
    
  //   grouped.forEach((samples, time) => {
  //     const sampleValues = samples.map(s => s.value);
  //     values[time] = this.calculateMean(sampleValues, time);
  //     errors[time] = this.calculateError(sampleValues);
  //   });

  //   // For point data, we expect only one location
  //   const locations: Array<{ x: number; y: number }> = [];
  //   if (samples.length > 0) {
  //     const sample = samples[0];
  //     locations.push({ x: sample.x, y: sample.y });
  //   }

  //   return { values, errors, locations };
  // }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  
  /**
   * Fetch and aggragate any valid geometry data (rectangle or point)
   */
  async fetchTimeseriesData(
    geometry: RectBounds | PointBounds,
    timeRanges: TimeRanges,
    options: FetchOptions = {}
  ): Promise<TimeSeriesData> {
    const rawData = await this.fetchSamples(geometry, timeRanges, options);
    return this.aggregateByTime(rawData.samples);
  }
  
  /**
   * Fetch and aggregate rectangle data (current fetchRectangleSamples equivalent)
   */
  // async fetchRectangleTimeseries(
  //   rectangle: RectBounds,
  //   timeRanges: TimeRanges,
  //   options: FetchOptions = {}
  // ): Promise<TimeSeriesData> {
  //   const rawData = await this.fetchSamples(rectangle, timeRanges, options);
  //   return this.aggregateByTime(rawData.samples);
  // }

  /**
   * Fetch and aggregate point data (current fetchCenterPointSample equivalent)
   */
  // async fetchPointTimeseries(
  //   point: PointBounds,
  //   timeRanges: TimeRanges,
  //   options: FetchOptions = {}
  // ): Promise<TimeSeriesData | null> {
  //   const rawData = await this.fetchSamples(point, timeRanges, options);
  //   return this.aggregatePoint(rawData.samples);
  // }

  /**
   * Get center point of rectangle and fetch data for it
   */
  async fetchCenterPointData(
    rectangle: RectBounds,
    timeRanges: TimeRanges,
    options: FetchOptions = {}
  ): Promise<TimeSeriesData | null> {
    const center: PointBounds = {
      x: (rectangle.xmin + rectangle.xmax) / 2,
      y: (rectangle.ymin + rectangle.ymax) / 2
    };
    
    return this.fetchTimeseriesData(center, timeRanges, options);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private isRectBounds(geometry: RectBounds | PointBounds): geometry is RectBounds {
    return 'xmin' in geometry && 'xmax' in geometry && 'ymin' in geometry && 'ymax' in geometry;
  }

  private calculateMean(samples: (number | null)[], time: number): AggValue {
    const validSamples = samples.filter((sample) => sample !== null);
    if (validSamples.length === 0) return { value: null, date: new Date(time) };
    const sum = validSamples.reduce((acc, val) => acc + (val ?? 0), 0);
    return { value: sum / validSamples.length, date: new Date(time) };
  }

  private calculateError(samples: (number | null)[]): DataPointError {
    const validSamples = samples.filter((sample) => sample !== null);
    if (validSamples.length === 0) return { lower: null, upper: null };
    
    const mean = validSamples.reduce((acc, val) => acc + (val ?? 0), 0) / validSamples.length;
    const squaredDiffs = validSamples.map((sample) => {
      if (sample === null) return 0;
      return Math.pow(sample - mean, 2);
    });
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / validSamples.length;
    
    return { lower: Math.sqrt(variance), upper: Math.sqrt(variance) };
  }
} 