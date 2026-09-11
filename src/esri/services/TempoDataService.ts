/* eslint-disable @typescript-eslint/naming-convention */
import { rectangleToGeometry, pointToGeometry } from '../geometry';
import type { RectBounds, PointBounds, EsriGeometryType } from '../geometry';
import type { 
  EsriGetSamplesReturn, 
  EsriGetSamplesReturnError, 
  EsriGetSamplesSample, 
  Variables, 
  EsriInterpolationMethod, 
  CEsriTimeseries, 
  EsriImageServiceSpec,
} from '../types';
import type { AggValue, DataPointError, MillisecondRange } from "../../types";
import {nanmean, diff} from '../../utils/array_operations/array_math';
import { EsriSampler } from './sampling';
import { parcelRanges } from '@/date_time_range_selection/date_time_range_generators';
import { getEsriTimesteps } from '../utils';

import { TimeRangeOffsetter } from './TimeRangeOffsetter';
import tz_lookup from '@photostructure/tz-lookup';


function _isRectBounds(geometry: RectBounds | PointBounds): geometry is RectBounds {
  return 'xmin' in geometry && 'xmax' in geometry && 'ymin' in geometry && 'ymax' in geometry;
}
  
// ============================================================================
// TYPES
// ============================================================================

export type ParcelingMode = 'none' | 'default' | 'smart';

export interface RequestSummary {
  totalRequests: number;
  successCount: number;
  failedCount: number;
  retrievedSamples?: number;
  timeseriesLength?: number;
  urlList?: string[];
}

/** Error message for a fetch's failed requests, or null. A clean fetch that returns no data is not an error. */
export function summaryError(summary: RequestSummary | undefined): string | null {
  if (!summary || summary.failedCount <= 0) {
    return null;
  }
  const { failedCount, totalRequests } = summary;
  if (failedCount >= totalRequests) {
    return `All ${totalRequests} data request(s) failed. The data service may be unavailable.`;
  }
  return `${failedCount} of ${totalRequests} data requests failed, so some data may be missing.`;
}

export interface RequestStats {
  // HTTP status
  httpStatus: 'success' | 'error';
  httpStatusCode: number;
  httpErrorMessage?: string; // HTTP error message if applicable
  // ESRI status
  status: 'success' | 'error';
  statusCode: number | null;
  errorMessage?: string; // Error message for debugging
  // Request details
  sampleCount: number; // number of samples returned
  
  retried: boolean; // Was this retried
  succeedAfter503?: boolean | null; // Track if this was a retried 503 that succeeded
  timestamp: number;
  timeRange: MillisecondRange;
  url: string;
}

export interface FetchOptions {
  sampleCount?: number;
  interpolation?: EsriInterpolationMethod;
  returnFirstValueOnly?: boolean;
  outFields?: string | string[];
  sliceID?: string | number;
  onProgress?: (stats: RequestStats, completed: number, total: number) => void;
  dryRun?: boolean; // Skip actual requests, just generate URLs
  numRetries?: number; // Override number of retries for this request
  wasRetried503?: boolean; // Track if this is a retry from a 503
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

export interface RawSampleDataWithStats extends RawSampleData {
  stats?: RequestStats; // Added for individual request tracking
  requestSummary?: RequestSummary; // Summary across multiple requests
  expectedTotalSamples?: number; // Added for smart parceling
  actualTotalSamples?: number; // Added for smart parceling
}

function emptyRawSampleData(
  geometry: RectBounds | PointBounds, 
  timeRange: MillisecondRange,
  url: string,
): RawSampleDataWithStats {
  return {
    samples: [],
    metadata: {
      totalSamples: 0,
      timeRange: timeRange,
      geometry,
      geometryType: _isRectBounds(geometry) ? 'rectangle' : 'point'
    },
    stats: {
      httpStatus: 'success',
      httpStatusCode: 200,
      status: 'success',
      statusCode: null,
      sampleCount: 0,
      retried: false,
      timestamp: Date.now(),
      timeRange: timeRange,
      url: url
    }
  };
}
  

export interface TimeSeriesData {
  values: Record<number, AggValue>;
  errors: Record<number, DataPointError>;
  locations: Array<{ x: number; y: number }>;
  geometryType: 'rectangle' | 'point';
}

export interface TimeSeriesDataWithStats extends TimeSeriesData {
  summary?: RequestSummary; // Simplified summary for production
  expectedTotalSamples?: number; // Expected total samples (for smart parceling)
  actualTotalSamples?: number; // Actual total samples fetched
}
  

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function abbrevSerivceUrl(url: string): string {
  return (new URL(url)).pathname.split('/').slice(-2).join('/');
}

function safeParseNumber(value: string | null | undefined): number | null {
  if (value === null || value === '' || value === undefined) return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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


class ImageServiceServiceMetadata {
  url: string;
  metadataCache: EsriImageServiceSpec | undefined;
  private _loadingMetadata: boolean = false;
  
  constructor(url: string) {
    this.url = url;
  }
  
  private async _getServiceMetadata(): Promise<EsriImageServiceSpec> {
    const url = `${this.url}?f=json`;
    return fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();
        if ('error' in json) {
          throw new Error(json['error']['message']);
        }
        return json;
      });
    // we will catch errors in updateMetadataCache
  }
  
  async updateMetadataCache() {
    // in general we really should invalidate the cache when the URL changes
    // however, we know that for this purpose, the grid is identical for all
    // the various services we may access, so ease of use, we will always have a metaDataCache
    // available. 
    // this.metadataCache = null; // Invalidate cache
    this._loadingMetadata = true;
    return this._getServiceMetadata()
      .then(metadata => {
        this.metadataCache = metadata;
        return metadata;
      })
      .catch(error => {
        this.metadataCache = undefined;
        throw error;
      })
      .finally(() => {
        this._loadingMetadata = false;
      });
  }
  
  getMetadata(): EsriImageServiceSpec {
    if (!this.metadataCache) {
      if (this._loadingMetadata) {
        throw new Error('Metadata is currently loading. Please wait and try again.');
      }
      throw new Error('Metadata not loaded yet. Call updateMetadataCache() first.');
    }
    return this.metadataCache;
  }
  

  
  async withMetadataCache(): Promise<EsriImageServiceSpec> {
    if (this.metadataCache) {
      return this.metadataCache;
    }
    if (this._loadingMetadata) {
      // Wait until loading is done. Check eveery 100ms
      while (this._loadingMetadata) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.metadataCache) {
        return this.metadataCache;
      } else {
        /* This error will be seen if withMetadataCache is called right after updateMetadataCache */
        throw new Error(`Called while attemping to load service metadata. Failed to load metadata for ${abbrevSerivceUrl(this.url)}`);
      }
    }
    return this.updateMetadataCache();
  }
  
  async waitForCache(): Promise<ImageServiceServiceMetadata> {
    await this.withMetadataCache();
    return this;
  }
  
  
  get timeRange(): [number, number] | null {
    if (this.metadataCache && this.metadataCache.timeInfo && this.metadataCache.timeInfo.timeExtent) {
      return [this.metadataCache.timeInfo.timeExtent[0], this.metadataCache.timeInfo.timeExtent[1]];
    }
    return null;
  }
  
  get extent(): RectBounds | null {
    if (this.metadataCache && this.metadataCache.extent) {
      return {
        xmin: this.metadataCache.extent.xmin,
        ymin: this.metadataCache.extent.ymin,
        xmax: this.metadataCache.extent.xmax,
        ymax: this.metadataCache.extent.ymax,
      };
    }
    return null;
  } 
  
  get spatialReference(): number | null {
    if (this.metadataCache && this.metadataCache.spatialReference) {
      return this.metadataCache.spatialReference.wkid || null;
    }
    return null;
  }
  
  clippedToTimeExtent(timeRange: MillisecondRange): [MillisecondRange, boolean] {
    const serviceTimeRange = this.timeRange;
    if (!serviceTimeRange) return [timeRange, false];
    const start = Math.max(timeRange.start, serviceTimeRange[0]);
    const end = Math.min(timeRange.end, serviceTimeRange[1]);
    const clipped = start !== timeRange.start || end !== timeRange.end;
    return [{ start, end }, clipped];
  }
  
  // 
}


// ============================================================================
// TEMPO DATA SERVICE
// ============================================================================

export class TempoDataService {
  private _baseUrls: string | string[] = [];
  private variable: Variables | string;
  private metas = new Map<string, ImageServiceServiceMetadata>();
  private rateLimitMs: number = 50; // Delay between requests in milliseconds
  private maxRetries503: number = 1; // Maximum number of retries for 503 errors
  
  // Smart parceling configuration
  private maxSamplesPerRequest: number = 5000; // ESRI service limit
  private safetyMargin: number = 0.9; // Use 90% of limit to avoid edge cases
  private parcelingMode: ParcelingMode = 'smart'; // Parceling mode: 'none', 'default', or 'smart'
  private defaultParcelSize: number = 7 * 24 * 60 * 60 * 1000; // Default parcel size (1 week in ms)
  private availableTimestamps: number[] = []; // Cached timestamps from service
  
  private dryRun: boolean = false; //  run mode
  private timestepsCache = new Map<string, number[]>();
  private _boundaries: Array<{ url: string; start: number; end: number }> | null = null; // Cached version boundaries
  private _serviceActive = new Map<string, boolean>(); // whether or not the serivce is avaialble. set when we check the cache
  
  constructor(baseUrl: string | string[], variable: Variables | string = "NO2_Troposphere", rateLimitMs: number = 50, maxRetries503: number = 1) {
    this._baseUrls = baseUrl;
    this.rateLimitMs = rateLimitMs;
    this.maxRetries503 = maxRetries503;
    
    this.variable = variable;
    this.updateMetadataCache();
    this.serviceStatusReady();
  }

  
  get baseUrlArray(): string[] {
    return Array.isArray(this._baseUrls) ? this._baseUrls : [this._baseUrls];
  }
  
  updateMetadataCache(): Promise<void> {
    // Load metadata for all URLs in parallel
    const metadataPromises = this.baseUrlArray.map(async (url) => {
      return this.metaForUrl(url)
        .then(m => {
          this._serviceActive.set(url, !!(m && m.metadataCache));
        })
        .catch(err => {
          console.warn(`Failed to load metadata for ${abbrevSerivceUrl(url)}:`, err);
          this._serviceActive.set(url, false); // if it fails, let us know
        });
    }
    );
    
    return Promise.all(metadataPromises) as unknown as Promise<void>;
  }
  
  async serviceStatusReady() {
    let i = 0;
    while (this._serviceActive.size < this.baseUrlArray.length && i < 1_000) {
      await new Promise((resolve) => setTimeout(() => {
        i = i + 1;
        resolve(null);
        return;
      }, 100));
    }
    for (const url of this.baseUrlArray) {
      if (this._serviceActive.has(url) && this._serviceActive.get(url)) {
        console.log(`%c service for ${abbrevSerivceUrl(url)} is active`, 'font-size: 10pt; color: white; background-color: green;');
      } else if (this._serviceActive.has(url) && !this._serviceActive.get(url)) {
        console.log(`%c service for ${abbrevSerivceUrl(url)} is not active`, 'font-size: 10pt; color: white; background-color: red;');
      } else {
        console.log(`%c something else for ${abbrevSerivceUrl(url)}`, 'font-size: 10pt; color: white; background-color: orange;');
      }
    }
    return this._serviceActive;
  }

  /**
   * Get cached version boundaries from all base URLs.
   * Boundaries are sorted by start time.
   */
  private async timeBoundaries(): Promise<Array<{ url: string; start: number; end: number }>> {
    if (this._boundaries !== null) {
      return this._boundaries;
    }

    const boundaries: Array<{ url: string; start: number; end: number }> = [];
    
    const promises = this.baseUrlArray.map(url => {
      // get the meta for the url. promi
      return this.metaForUrl(url)
        .then(meta => {
          if (!meta || !meta.metadataCache) {
            return;
          }
          const timeRange = meta.timeRange;
          if (timeRange) {
            boundaries.push({ url, start: timeRange[0], end: timeRange[1] });
          }
        });
    });
    await Promise.all(promises);
    // Sort boundaries by start time for easier processing
    boundaries.sort((a, b) => a.start - b.start);
    // only cache if we got both. if one service was down, then
    // we don't want to cache that state. force it to try again next time
    // it doesn't take too much time. 
    if (boundaries.length === this.baseUrlArray.length) {
      this._boundaries = boundaries;
    }
    return boundaries;
  }

  
  /**
   * This is where we are actually loading the service metadata
   */
  private metaForUrl(url: string): Promise<ImageServiceServiceMetadata | undefined> {
    if (!this.metas.has(url)) {
      this.metas.set(url, new ImageServiceServiceMetadata(url));
    }
    const meta = this.metas.get(url)!;
    return meta.waitForCache()
      .catch((error) => {
        console.error(`${error}`);
        return undefined;
      });
  }
  
  get meta(): EsriImageServiceSpec | undefined {
    for (const url of this.baseUrlArray) {
      const meta = this.metas.get(url);
      if (meta?.metadataCache) {
        return meta.metadataCache;
      }
    }
    return undefined;
  }

  private _metaForTimeRange(range: MillisecondRange): EsriImageServiceSpec | undefined {
    const url = this.selectBaseUrlForRange(range);
    const meta = this.metas.get(url);
    
    if (meta?.metadataCache) {
      return meta.metadataCache;
    }
    
    // Fallback to first available metadata
    for (const [, m] of this.metas) {
      if (m.metadataCache) {
        return m.metadataCache;
      }
    }
    
    return undefined;
  }

  selectBaseUrlForRange(range: MillisecondRange): string {
    for (const url of this.baseUrlArray) {
      const meta = this.metas.get(url);
      if (!meta?.metadataCache) {
        console.error(`Metadata not loaded for ${abbrevSerivceUrl(url)}, cannot select URL for range`);
        continue;
      }
      const timeRange = meta.timeRange;
      if (!timeRange) {
        console.error(`Missing timeInfo for ${abbrevSerivceUrl(url)}`);
        continue;
      }
      const [start, end] = timeRange;
      const overlaps = range.start <= end && range.end >= start;
      if (overlaps) {
        return url;
      }
    }
    return this.baseUrlArray[this.baseUrlArray.length - 1];
  }
  
  selectBaseUrlForTimestamp(timestamp: number): string {
    return this.selectBaseUrlForRange({ start: timestamp, end: timestamp });
  }
  
 
  private async fetchTimestepsForUrl(url: string): Promise<number[]> {
    if (this.timestepsCache.has(url)) {
      return this.timestepsCache.get(url)!;
    }
    const steps = await getEsriTimesteps(url, this.variable as Variables);
    this.timestepsCache.set(url, steps);
    return steps;
  }
      

  async getMergedTimesteps(): Promise<number[]> {
    const allTimesteps: number[][] = [];
    for (const url of this.baseUrlArray) {
      try {
        await this.metaForUrl(url); // Ensure metadata is loaded
        const steps = await this.fetchTimestepsForUrl(url);
        allTimesteps.push(steps);
      } catch (error) {
        console.error(error);
      }
    }
    return Array.from(new Set(allTimesteps.flat())).sort((a, b) => a - b);
  }


  /**
   * Ensure metadata is loaded and return it 
   * Really just to avoid changing with MapWithControls
   */
  async withMetadataCache(): Promise<EsriImageServiceSpec> {
    await this.updateMetadataCache();
    const urls = this.baseUrlArray;
    if (urls.length === 0) {
      throw new Error('No TEMPO service URLs configured');
    }

    // Prefer the first configured URL, but fall back to any available URL.
    const preferredMeta = this.metas.get(urls[0])?.metadataCache;
    if (preferredMeta) {
      return preferredMeta;
    }

    for (let i = 1; i < urls.length; i++) {
      const fallbackMeta = this.metas.get(urls[i])?.metadataCache;
      if (fallbackMeta) {
        return fallbackMeta;
      }
    }

    throw new Error('Failed to load metadata for TEMPO service');
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  setVariable(variable: Variables | string): void {
    this.variable = variable;
  }

  getVariable(): Variables | string {
    return this.variable;
  }

  setRateLimit(ms: number): void {
    this.rateLimitMs = Math.max(0, ms);
  }

  setRetryLimit(retries: number): void {
    this.maxRetries503 = Math.max(0, Math.floor(retries));
  }

  setMaxSamplesPerRequest(max: number): void {
    this.maxSamplesPerRequest = Math.max(1, Math.floor(max));
  }

  setSafetyMargin(margin: number): void {
    this.safetyMargin = Math.max(0.1, Math.min(1.0, margin));
  }

  setParcelingMode(mode: ParcelingMode): void {
    this.parcelingMode = mode;
  }

  getParcelingMode(): ParcelingMode {
    return this.parcelingMode;
  }

  setDefaultParcelSize(sizeMs: number): void {
    if (sizeMs <= 0) {
      console.warn('Default parcel size must be positive. Reverting to smart parceling mode.');
      this.setParcelingMode('smart');
    }
    this.defaultParcelSize = Math.max(1000, sizeMs); // Minimum 1 second
  }

  setAvailableTimestamps(timestamps: number[]): void {
    this.availableTimestamps = [...timestamps].sort((a, b) => a - b);
  }

  setDryRun(enabled: boolean): void {
    this.dryRun = enabled;
  }
  

  getDryRun(): boolean {
    return this.dryRun;
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
    options: FetchOptions = {},
  ): Promise<RawSampleDataWithStats> {
    const numRetries = options.numRetries ?? 0;
    const skipRetry = numRetries >= this.maxRetries503;
    const esriGeometry = this.isRectBounds(geometry) 
      ? rectangleToGeometry(geometry as RectBounds)
      : pointToGeometry(geometry as PointBounds);

    const geometryType: EsriGeometryType = this.isRectBounds(geometry)
      ? 'esriGeometryPolygon'
      : 'esriGeometryPoint';

    // Handle multiple time ranges by combining them
    const timeString = `${timeRange.start},${timeRange.end}`;


    const baseUrl = this.selectBaseUrlForRange(timeRange);

    const params = {
      f: 'pjson' as const,
      interpolation: 'RSP_NearestNeighbor' as EsriInterpolationMethod,
      returnFirstValueOnly: false,
      geometry: esriGeometry,
      geometryType: geometryType,
      time: timeString,
      sampleCount: options.sampleCount || 30, // 100 is the Esri default. 30 has been our default
      ...options
    };

    const urlWithParams = `${baseUrl}/getSamples/?${stringifyEsriGetSamplesParameters(params).toString()}`;
    
    
    // If dry run mode, return empty data immediately
    const isDryRun = this.dryRun || options.dryRun;
    if (isDryRun) {
      return emptyRawSampleData(geometry, timeRange, urlWithParams);
    }
    
    const stats: RequestStats = {
      httpStatus: 'success', // needs to be updated
      httpStatusCode: 0, // needs to be updated
      status: 'success', // needs to be updated
      statusCode: null, // needs to be updated
      sampleCount: 0,
      retried: numRetries > 0,
      succeedAfter503: false,
      timestamp: Date.now(),
      timeRange: timeRange,
      url: urlWithParams.replace('pjson', 'html'), // for easier debugging
    };
    
    try {
      const response = await fetch(urlWithParams);
      stats.httpStatusCode = response.status;
      stats.httpStatus = response.ok ? 'success' : 'error';
      
      // Handle HTTP errors
      if (!response.ok) {
        stats.httpErrorMessage = await response.text();
        throw new Error(stats.httpErrorMessage || `HTTP error! status: ${response.status}`);
      }
      
      const data: EsriGetSamplesReturn | EsriGetSamplesReturnError = await response.json();
      
      if ('error' in data) {
        stats.status = 'error';
        stats.statusCode = data.error.code;
        stats.errorMessage = `ESRI error: code: ${data.error.code} msg: ${data.error.message} details: ${data.error.details || ''}`.trim();
        
        if (data.error.code === 503 && !skipRetry) {
          console.warn(`Received 503 error for ${urlWithParams.replace('pjson', 'html')}, retrying after delay...`);
          await delay(1000); // Wait 1 second before retrying
          return this.fetchSample(geometry, timeRange, {...options, numRetries: (options.numRetries ?? 0) + 1, wasRetried503: true}); // Increment retry count
        }
        // if it is not a 503, then we are currently assuming the error is terminal
        throw new Error(stats.errorMessage);
      }

      const processedSamples = data.samples.map((sample: EsriGetSamplesSample) => {
        if (sample.attributes) {
          return {
            x: sample.location.x,
            y: sample.location.y,
            time: sample.attributes?.StdTime ?? timeRange[0],
            date: new Date(sample.attributes?.StdTime ?? timeRange[0] ),
            // variable: safeParseNumber(sample.attributes[this.variable] ?? ''),
            variable: safeParseNumber(this.variable in sample.attributes ? sample.attributes[this.variable] : ''),
            value: safeParseNumber(sample.value),
            locationId: sample.locationId,
            geometryType: this.isRectBounds(geometry) ? 'rectangle' : 'point' as 'rectangle' | 'point'
          };
        } else {
          return {
            x: sample.location.x,
            y: sample.location.y,
            time: timeRange[0],
            date: new Date(timeRange[0] ),
            // variable: safeParseNumber(sample.attributes[this.variable] ?? ''),
            variable: this.variable,
            value: safeParseNumber(sample.value),
            locationId: sample.locationId,
            geometryType: this.isRectBounds(geometry) ? 'rectangle' : 'point' as 'rectangle' | 'point'
          };
        }}); // this is a CEsriTimeseries[]
      
      // Update stats for successful request
      stats.status = 'success';
      // ESRI statusCode is only used when ESRI returns an error payload.
      stats.statusCode = null;
      stats.sampleCount = processedSamples.length;
      // if this was a retried request, note if it succeeded after 503
      if (options.wasRetried503) {
        stats.succeedAfter503 = true;
      } else {
        stats.succeedAfter503 = null;
      }
      return {
        samples: processedSamples,
        metadata: {
          totalSamples: processedSamples.length,
          timeRange: timeRange,
          geometry,
          geometryType: this.isRectBounds(geometry) ? 'rectangle' : 'point'
        },
        stats: stats
      };
    } catch (error) {
      // For network / unexpected failures, capture a generic error message.
      // Avoid duplicating HTTP error bodies into both httpErrorMessage and errorMessage.
      if (!stats.errorMessage && !stats.httpErrorMessage && error instanceof Error) {
        stats.status = 'error';
        stats.errorMessage = error.message;
      }

      // If fetch() threw before we had an HTTP response, mark HTTP status as error.
      if (stats.httpStatusCode === 0 && stats.httpStatus === 'success') {
        stats.httpStatus = 'error';
      }

      console.error('Error in TempoDataService.fetchSample:', params, error);
      // Still return the stats even on error, wrapped in the error
      const enhancedError = error as Error & { stats?: RequestStats };
      enhancedError.stats = stats;
      throw enhancedError;
    }
  }
  
  /**
   * Fetch raw samples from the ESRI Image Server
   */
  async fetchSamples(
    geometry: RectBounds | PointBounds,
    timeRanges: TimeRanges,
    options: FetchOptions = {}
  ): Promise<RawSampleDataWithStats> {
    
    if (!Array.isArray(timeRanges)) {
      return this.fetchSample(geometry, timeRanges, options);
    }
    
    // Apply parceling based on mode
    const sampleCount = options.sampleCount || 30;
    let parceledRanges: MillisecondRange[];
    let expectedTotalSamples: number | undefined;
    
    switch (this.parcelingMode) {
    case 'none':
      parceledRanges = timeRanges;
      break;
      
    case 'default':
      parceledRanges = parcelRanges(timeRanges, this.defaultParcelSize);
      break;
      
    case 'smart': {
      const smartResult = this.smartParcelTimeRanges(timeRanges, sampleCount);
      parceledRanges = smartResult.ranges;
      expectedTotalSamples = smartResult.expectedTotalSamples;
      break;
    }
    }
    
    // Split any parcels that straddle version boundaries
    parceledRanges = await this.splitParcelsAtVersionBoundaries(parceledRanges);
    
    const totalRanges = parceledRanges.length;
    let completedRanges = 0;

    
    // Skip rate limiting in dry run mode
    const isDryRun = this.dryRun || options.dryRun;
    
    const promises = parceledRanges.map((tr, index) => {
      const requestPromise = isDryRun
        ? this.fetchSample(geometry, tr, options)
        : delay(this.rateLimitMs * index).then(() => this.fetchSample(geometry, tr, options));

      return requestPromise
        .then((result) => {
        // Track progress
          completedRanges++;
          if (result.stats) {
            if (options.onProgress) {
              options.onProgress(result.stats, completedRanges, totalRanges);
            }
          }
          return result;
        })
        .catch((error) => {
          console.error(`Error fetching sample for time range ${tr.start}-${tr.end}:`, error);
        
          // Track progress even on error
          completedRanges++;
        
          // Collect stats from errors too
          const enhancedError = error as Error & { stats?: RequestStats };
          if (enhancedError.stats) {
            if (options.onProgress) {
              options.onProgress(enhancedError.stats, completedRanges, totalRanges);
            }

            // Return a structured empty result so we can compute summaries from stats
            // without maintaining an allStats array.
            return {
              samples: [],
              metadata: {
                totalSamples: 0,
                timeRange: tr,
                geometry: geometry,
                geometryType: this.isRectBounds(geometry) ? 'rectangle' : 'point',
              },
              stats: enhancedError.stats,
            };
          }

          return null;
        }
        );
    });

    return Promise.all(promises).then((results) => {
      const validResults = results.filter((result): result is RawSampleDataWithStats => result !== null);
      const samples = validResults.map((result) => result.samples).flat();
      console.log(`Total samples fetched across all time ranges: ${samples.length}`);

      const requestStats = validResults.map((r) => r.stats).filter((s): s is RequestStats => s !== undefined);

      const successCount = requestStats.filter((s) => s.status === 'success').length;
      const errorCountFromStats = requestStats.filter((s) => s.status === 'error').length;
      const missingStatsCount = Math.max(0, totalRanges - requestStats.length);
      const failedCount = errorCountFromStats + missingStatsCount;

      // Create a combined result with all stats
      const result: RawSampleDataWithStats = {
        samples,
        metadata: {
          totalSamples: samples.length,
          timeRange: parceledRanges,
          geometry: geometry,
          geometryType: this.isRectBounds(geometry) ? 'rectangle' : 'point',
        },
      };

      result.requestSummary = {
        totalRequests: totalRanges,
        successCount,
        failedCount,
        retrievedSamples: samples.length,
        urlList: validResults.map((r) => r.stats?.url || 'unknown'),
      };
      
      // Add expected total samples if available (from smart parceling)
      if (expectedTotalSamples !== undefined) {
        result.expectedTotalSamples = expectedTotalSamples;
      }
      result.actualTotalSamples = samples.length;
      
      return result;
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
    
    return { 
      values, 
      errors, 
      locations, 
      geometryType: samples[0]?.geometryType || 'rectangle',
    };
  }

  /**
   * Get single point data (for center points or individual points)
   */

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================
  
  getTimeSeriesStatistics(jsonData: RawSampleData) {
    const samples = jsonData.samples || [];
    
    const uniqueLocations = new Set();
    const uniqueLatitudes = new Set<number>();
    const uniqueLongitudes = new Set<number>();
    const valuesPerLocation = {};
    
    for (const sample of samples) {
      const location = {x: sample.x, y: sample.y};
      const locString = `${location.x},${location.y}`;
      if (location) {
        // Use a string representation for unique locations in the Set
        uniqueLocations.add(locString);
        uniqueLatitudes.add(location.y);
        uniqueLongitudes.add(location.x);
      }
      
      valuesPerLocation[locString] = (valuesPerLocation[locString] || 0) + 1;

    }
    
    const totalValues = samples.length;
    const numUniqueLocations = uniqueLocations.size;
    
    const latitudeSpacing = diff([...uniqueLatitudes].sort());
    const longitudeSpacing = diff([...uniqueLongitudes].sort());
    
    
    
    return {
      numUniqueLocations,
      totalValues,
      valuesPerLocation,
      latitudeSpacing: nanmean(latitudeSpacing),
      longitudeSpacing: nanmean(longitudeSpacing),
    };
  }
  
  getRegionCenter(geometry: RectBounds | PointBounds): { lat: number; lon: number } {
    if (this.isRectBounds(geometry)) {
      return {
        lat: (geometry.ymin + geometry.ymax) / 2,
        lon: (geometry.xmin + geometry.xmax) / 2
      };
    } else { // It's a point
      return {
        lat: geometry.y,
        lon: geometry.x
      };
    }
  }
  /**
   * Fetch and aggragate any valid geometry data (rectangle or point)
   */
  async fetchTimeseriesData(
    geometry: RectBounds | PointBounds,
    timeRanges: TimeRanges,
    options: FetchOptions = {}
  ): Promise<TimeSeriesDataWithStats> {
    
    const { lat: centerLat, lon: centerLon } = this.getRegionCenter(geometry);
    const timezone = tz_lookup(centerLat, centerLon);
    
    // Convert UTC time ranges to local time ranges for this timezone
    const offsetter = new TimeRangeOffsetter(timezone);
    const timeRangesArray = Array.isArray(timeRanges) ? timeRanges : [timeRanges];
    const localTimeRanges = offsetter.offsetRanges(timeRangesArray);
    
    
    const meta = this._metaForTimeRange(localTimeRanges[0]);
    if (this.isRectBounds(geometry) && meta) {
      const sampler = new EsriSampler(meta, geometry);
      const sampleCount = options.sampleCount || 30;
      options.sampleCount = sampler.getSamplingSpecificationFromSampleCount(sampleCount).count;
      console.log(`This region is covered by ${options.sampleCount} samples`);
    }
    const rawData = await this.fetchSamples(geometry, localTimeRanges, options);
    // const stats = this.getTimeSeriesStatistics(rawData);
    
    const result: TimeSeriesDataWithStats = this.aggregateByTime(rawData.samples);

    if (rawData.requestSummary) {
      // just the counts - urlList stays on rawData.requestSummary for debugging
      const { totalRequests, successCount, failedCount, retrievedSamples } = rawData.requestSummary;
      result.summary = {
        totalRequests,
        successCount,
        failedCount,
        retrievedSamples,
        timeseriesLength: Object.keys(result.values).length,
      };
    }

    // Pass through expected total samples if available
    if (rawData.expectedTotalSamples !== undefined) {
      result.expectedTotalSamples = rawData.expectedTotalSamples;
    }
    if (rawData.actualTotalSamples !== undefined) {
      result.actualTotalSamples = rawData.actualTotalSamples;
    }
    console.log(`Summary of fetched time series data:`, result.summary);
    return result;
  }
  

  /**
   * Get center point of rectangle and fetch data for it
   */
  async fetchCenterPointData(
    rectangle: RectBounds,
    timeRanges: TimeRanges,
    options: FetchOptions = {}
  ): Promise<TimeSeriesDataWithStats | null> {
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
    return _isRectBounds(geometry);
  }

  private calculateMean(samples: (number | null)[], time: number): AggValue {
    const validSamples = samples.filter((sample) => sample !== null);
    if (validSamples.length === 0) return { value: null, date: new Date(time) };
    const sum = validSamples.reduce((acc, val) => acc! + (val ?? 0), 0);
    return { value: sum! / validSamples.length, date: new Date(time) };
  }

  private calculateError(samples: (number | null)[]): DataPointError {
    const validSamples = samples.filter((sample) => sample !== null);
    if (validSamples.length === 0) return { lower: null, upper: null };
    
    const mean = validSamples.reduce((acc, val) => acc! + (val ?? 0), 0)! / validSamples.length;
    const squaredDiffs = validSamples.map((sample) => {
      if (sample === null) return 0;
      return Math.pow(sample - mean, 2);
    });
    // squared standard error of the mean = variance / n
    const squaredSEM = squaredDiffs.reduce((acc, val) => acc + val, 0) / Math.pow(validSamples.length, 2);
    
    return { lower: Math.sqrt(squaredSEM), upper: Math.sqrt(squaredSEM) };
  }

  // ============================================================================
  // SMART PARCELING HELPERS
  // ============================================================================

  /**
   * Efficiently count timestamps in each range using a two-pointer algorithm.
   * Both timestamps and ranges must be sorted in ascending order.
   * Time complexity: O(T + R) where T = number of timestamps, R = number of ranges
   * 
   * @param ranges - Array of time ranges (must be sorted by start time)
   * @returns Array of counts, one per range
   */
  private countTimestampsInRanges(ranges: MillisecondRange[]): number[] {
    if (this.availableTimestamps.length === 0 || ranges.length === 0) {
      return ranges.map(() => 0);
    }

    const counts: number[] = [];
    let timestampIndex = 0; // Pointer into availableTimestamps array
    
    for (const range of ranges) {
      let count = 0;
      
      // Skip timestamps before the current range
      while (timestampIndex < this.availableTimestamps.length && 
             this.availableTimestamps[timestampIndex] < range.start) {
        timestampIndex++;
      }
      
      // Save the starting position for this range
      // const rangeStartIndex = timestampIndex;
      
      // Count timestamps within the range
      while (timestampIndex < this.availableTimestamps.length && 
             this.availableTimestamps[timestampIndex] <= range.end) {
        count++;
        timestampIndex++;
      }
      
      counts.push(count);
      
      // Reset to the start position for the next range
      // This handles overlapping or out-of-order ranges
      // timestampIndex = rangeStartIndex;
      
      // Optimization: if ranges are guaranteed non-overlapping and sorted,
      // we don't need to reset. THIS ASSUMPTION IS TRUE FOR OUR USE CASE.
      // timestampIndex = 0;
    }
    
    return counts;
  }

  /**
   * Binary search to find the first timestamp >= target
   */
  private binarySearchStart(target: number): number {
    let left = 0;
    let right = this.availableTimestamps.length - 1;
    let result = this.availableTimestamps.length;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.availableTimestamps[mid] >= target) {
        result = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    
    return result;
  }

  /**
   * Binary search to find the last timestamp <= target
   */
  private binarySearchEnd(target: number, startIdx: number): number {
    let left = startIdx;
    let right = this.availableTimestamps.length - 1;
    let result = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.availableTimestamps[mid] <= target) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return result;
  }
  
  /**
 * Get timestamps that fall within a given time range (for splitting)
 */
  private getTimestampsInRange(range: MillisecondRange): number[] {
    // Binary search for efficiency
    const startIdx = this.binarySearchStart(range.start);
    const endIdx = this.binarySearchEnd(range.end, startIdx);
    
    return this.availableTimestamps.slice(startIdx, endIdx + 1);
  }

  /**
   * Get boundaries that overlap with the given time range.
   * Returns boundaries sorted by start time.
   */
  private _getOverlappingBoundaries(
    range: MillisecondRange,
    boundaries: Array<{ url: string; start: number; end: number }>
  ): Array<{ url: string; start: number; end: number }> {
    const overlapping = boundaries.filter(b => 
      range.start <= b.end && range.end >= b.start
    );
    // Sort by start time (boundaries should already be sorted, but ensure it)
    return overlapping.sort((a, b) => a.start - b.start);
  }

  /**
   * Split time ranges that span multiple ESRI service version boundaries.
   */
  private async splitParcelsAtVersionBoundaries(ranges: MillisecondRange[]): Promise<MillisecondRange[]> {
    // If only one base URL, no version boundaries to worry about
    if (this.baseUrlArray.length <= 1) {
      return ranges;
    }

    const boundaries = await this.timeBoundaries();
    const splitRanges: MillisecondRange[] = [];

    for (const range of ranges) {
      // Find which boundaries this range overlaps with
      const overlappingBoundaries = this._getOverlappingBoundaries(range, boundaries);

      if (overlappingBoundaries.length <= 1) {
        // Range fits within a single version, keep as-is
        splitRanges.push(range);
        continue;
      }
      console.error(`Splitting range ${range.start}-${range.end} across ${overlappingBoundaries.length} version boundaries`);
      // Range spans multiple versions - split it
      for (const boundary of overlappingBoundaries) {
        // Calculate the intersection of the range with this boundary
        const splitStart = Math.max(range.start, boundary.start);
        const splitEnd = Math.min(range.end, boundary.end);
        
        if (splitStart <= splitEnd) {
          splitRanges.push({ start: splitStart, end: splitEnd });
        }
      }
    }

    return splitRanges;
  }

  /**
   * Intelligently parcel time ranges based on sample count and timestamp availability
   * to avoid exceeding the ESRI service limit while maximizing request size
   */
  private smartParcelTimeRanges(
    timeRanges: MillisecondRange[],
    sampleCount: number
  ): { ranges: MillisecondRange[]; expectedTotalSamples: number } {
    // If no timestamps are available, can't do smart parceling
    if (this.availableTimestamps.length === 0) {
      console.warn('No timestamps available for smart parceling, using ranges as provided');
      return { ranges: timeRanges, expectedTotalSamples: 0 };
    }
    console.log(`Smart parceling ${timeRanges.length} time ranges with sample count ${sampleCount}`);

    const effectiveLimit = Math.floor(this.maxSamplesPerRequest * this.safetyMargin);
    const maxTimestampsPerRequest = Math.floor(effectiveLimit / sampleCount);
    
    if (maxTimestampsPerRequest < 1) {
      console.warn(`Sample count (${sampleCount}) exceeds effective limit (${effectiveLimit}). Cannot parcel safely.`);
      return { ranges: timeRanges, expectedTotalSamples: 0 };
    }

    // Count timestamps in all ranges efficiently with one pass
    const timestampCounts = this.countTimestampsInRanges(timeRanges);
    
    const parceledRanges: MillisecondRange[] = [];
    let totalTimestampsAcrossAllRanges = 0;

    for (let i = 0; i < timeRanges.length; i++) {
      const range = timeRanges[i];
      const timestampCount = timestampCounts[i];
      const totalSamples = timestampCount * sampleCount;
      
      totalTimestampsAcrossAllRanges += timestampCount;

      // Skip ranges with no timestamps
      if (timestampCount === 0) {
        continue;
      }

      // If this range fits within the limit, keep it as-is
      if (totalSamples <= effectiveLimit) {
        parceledRanges.push(range);
        continue;
      }

      // Need to split this range - get actual timestamps and chunk them
      const timestampsInRange = this.getTimestampsInRange(range);
      
      for (let j = 0; j < timestampsInRange.length; j += maxTimestampsPerRequest) {
        // if j + maxTimestampsPerRequest exceeds length, slice will just take to end
        const chunkTimestamps = timestampsInRange.slice(j, j + maxTimestampsPerRequest);
        
        if (chunkTimestamps.length === 0) continue;

        // Create a new range from first to last timestamp in this chunk
        const newRange: MillisecondRange = {
          start: chunkTimestamps[0],
          end: chunkTimestamps[chunkTimestamps.length - 1]
        };

        parceledRanges.push(newRange);
      }
    }
    
    // Calculate expected total samples: total timestamps × sample count
    const expectedTotalSamples = totalTimestampsAcrossAllRanges * sampleCount;
    
    return { ranges: parceledRanges, expectedTotalSamples };
  }
} 
