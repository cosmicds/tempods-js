/* eslint-disable @typescript-eslint/naming-convention */
export interface EsriGetSamplesReturn {
  samples: EsriGetSamplesSample[];
}

export interface EsriGetSamplesSample {
  location: Location;
  locationId: number;
  value: string;
  resolution: number;
  attributes: Attributes;
}

export interface EsriGetSamplesReturnError {
  error: Error;
}


export interface Attributes {
  NO2_Troposphere?: string;
  HCHO?: string;
  Ozone_Column_Amount?: string;
  "0-2_km_Column_Ozone"?: string;
  StdTime: number;
  StdTime_Max: number;
  Variables: Variables;
  Dimensions: Dimensions;
}

export type Dimensions = "StdTime";

export type Variables = "NO2_Troposphere" | "HCHO" | "Ozone_Column_Amount" | "0-2_km_Column_Ozone";


export interface Location {
  x: number;
  y: number;
  spatialReference: SpatialReference;
}

export interface SpatialReference {
  wkid: number;
  latestWkid: number;
}


export interface CEsriTimeseries {
  x: number;
  y: number;
  time: number;
  date: Date; 
  variable: number | string | null;
  value: number | null;
  locationId: number;
  geometryType: 'rectangle' | 'point';
}


export interface Error {
  code:         number;
  extendedCode: number;
  message:      string;
  details:      string[];
}


export type EsriInterpolationMethod = "RSP_BilinearInterpolation" | "RSP_CubicConvolution" | "RSP_Majority" | "RSP_NearestNeighbor";


/** 
 * Esri Interface return 
 * https://developers.arcgis.com/rest/services-reference/enterprise/image-service/
 * Generated via "Paste as JSON" & filling in missing fields
 */

export interface AdvancedQueryCapabilities {
    useStandardizedQueries: boolean;
    supportsStatistics:     boolean;
    supportsOrderBy:        boolean;
    supportsDistinct:       boolean;
    supportsPagination:     boolean;
}

export interface EditFieldsInfo {
    creationDateField: string;
    creatorField:      string;
    editDateField:     string;
    editorField:       string;
    realm:             string;
}

export interface Extent {
    xmin:             number;
    ymin:             number;
    xmax:             number;
    ymax:             number;
    spatialReference: ExtentSpatialReference;
}

export interface ExtentSpatialReference {
    wkid:       number;
    latestWkid: number;
}

export interface Field {
    name:     string;
    type:     string;
    alias:    string;
    domain:   Domain | null;
    editable: boolean;
    nullable: boolean;
    length?:  number;
}

export interface Domain {
    type:        string;
    name:        string;
    codedValues: CodedValue[];
}

export interface CodedValue {
    name: string;
    code: number;
}

export interface OwnershipBasedAccessControlForRasters {
    allowOthersToUpdate: boolean;
    allowOthersToDelete: boolean;
}

export interface RasterInfo {
    name:        string;
    description: string;
    help:        string;
}

export interface TileInfo {
    rows:               number;
    cols:               number;
    dpi:                number;
    format:             string;
    compressionQuality: number;
    origin:             Origin;
    storageInfo:        StorageInfo;
    spatialReference:   TileInfoSpatialReference;
    lods:               Lod[];
}

export interface Lod {
    level:      number;
    resolution: number;
    scale:      number;
}

export interface Origin {
    x: number;
    y: number;
}

export interface TileInfoSpatialReference {
    wkt: string;
}

export interface StorageInfo {
    storageFormat: string;
    packetSize:    number;
}

export interface TimeInfo {
    startTimeField: string;
    endTimeField:   string;
    timeExtent:     number[];
    timeReference:  null;
}

type TransposeInfo = {
  cols: number;
  rows: number;
};


export type EsriImageServiceSpec = {
  currentVersion:number;
  serviceDescription: string;
  name: string; // name of the service
  description: string;
  extent: Extent; // extent of the service
  initialExtent: Extent; // Initial extent of the service.
  fullExtent: Extent; // Full extent of the service.
  timeInfo?: TimeInfo; // Optional. Time information of the service.
  pixelSizeX: number; // The base pixel size in X dimension. It's usually the source resolution of single raster service, or best available raster resolution in a mosaic dataset (can be multiresolution, multi-source).
  pixelSizeY: number; // The base pixel size in Y dimension. It's usually the source resolution of single raster service, or best available raster resolution in a mosaic dataset (can be multiresolution, multi-source).
  meanPixelSize: number; // Introduced at 11.2. The mean pixel size in meters is calculated from pixel size X,Y and unit of the spatial reference.
  bandCount: number; // Number of bands of the image service.
  pixelType: string; // Represents pixel type, e.g., U8 means unsigned 8bit; F32 means float 32bit; S16 means signed 16bit
  minPixelSize: number; // Minimum pixel size.
  maxPixelSize: number; // Maximum pixel size.
  copyrightText:string; // Copyright text.
  serviceDataType: string; // Type of service data
  minValues: number[]; // Minimum pixel values of all bands
  maxValues: number[]; // Maximum pixel values of all bands
  meanValues: number[]; // Mean pixel values of all bands
  stdvValues: number[]; // Standard deviation of pixel values of all bands
  objectIdField: string; // Accessible fields
  fields: Field[]; // Editable and nullable properties are available only if image service has capability
  capabilities: string; // Comma-separated list of supported capabilities, e.g., "Image,Metadata,Pixels,Catalog,Download,Mensuration,Edit,Uploads".
  defaultCompressionQuality: number; // Default compression quality of jpeg format exported image (applies to jpg and jpgpng).
  defaultResamplingMethod: string; // Default resampling method.
  maxImageHeight: number; // The maximum number of rows that the service allows in a client request.
  maxImageWidth: number; // The maximum number of columns that the service allows in a client request.
  defaultMosaicMethod?: string; // Optional. Default mosaic method.
  allowedMosaicMethods?: string; // Optional. Comma-separated list of allowed mosaic methods. Can be one or more of the following: None,Center,NorthWest,LockRaster,ByAttribute,Nadir,Viewpoint,Seamline (not case sensitive). Corresponds to the following enums: esriMosaicNone | esriMosaicCenter | esriMosaicNorthwest | esriMosaicLockRaster | esriMosaicAttribute | esriMosaicNadir | esriMosaicViewpoint | esriMosaicSeamline
  sortField?: string; // Optional. Specifies the sort field of default mosaic rule when byattribute is used as the default mosaic method.
  sortValue?: unknown; // Optional. Specifies the sort base value of default mosaic rule when byattribute is used as the default mosaic method. The type depends on attribute type
  mosaicOperator?: string; // Optional. Specifies default mosaic operator.
  maxRecordCount?: number; // Optional. The maximum records returned in a query response. For single raster-based image services, the maxRecordCount is -1.
  maxDownloadImageCount?: number; // Optional. The maximum number of downloadable rasters (number of rows) that the service allows per request
  maxDownloadSizeLimit?: number; // Optional. The maximum size of download raster request that the service allows per request
  maxMosaicImageCount?: number; // Optional. The maximum number of rasters the service can mosaic per request
  singleFusedMapCache: boolean; // Indicates the existence of tile resource
  cacheDirectory?: string; // Optional. The cache directory
  tileInfo?: TileInfo; // Optional. Information of tile resource
  storageInfo?: StorageInfo; // Introduced at 11.1
  transposeInfo?: TransposeInfo; // New in 11.0. Optional. Information of transposed tile resource
  minScale: number; // The denominator of the minimum scale at which caching may be available. It's 0 for not cached service.
  maxScale: number; // The denominator of the maximum scale at which caching may be available. It's 0 for not cached service.
  allowRasterFunction: string[]; // Indicates whether the service allows raster functions in request
  rasterFunctionInfos?: RasterInfo[]; // Optional. Specifies the supported raster function templates the client can invoke. The first one is applied to exportImage request by default
  editFieldsInfo?: EditFieldsInfo; // Optional. Editor tracking fields information.
  ownershipBasedAccessControlForRasters?: OwnershipBasedAccessControlForRasters; // Optional. Ownership-based access (update/delete) control information.
  rasterTypeInfos?: RasterInfo[]; // Optional. Supported raster types in add rasters operation
  mensurationCapabilities: string; // Mensuration capabilities, one or more in "Basic,Base-Top Height,Top-Top Shadow Height,Base-Top Shadow Height,3D"
  inspectionCapabilities: string; // Inspection capabilities, one or more in "Nadir, Oblique, Hero"
  hasHistograms: boolean; // Indicates the existence of histograms resource.
  hasColormap: boolean;
  hasRasterAttributeTable: boolean; // Indicates the existence of raster attribute table resource.
  spatialReference: ExtentSpatialReference;
  allowComputeTiePoints: boolean;
  useStandardizedQueries: boolean;
  supportsStatistics: boolean;
  supportsAdvancedQueries: boolean;
  hasMultidimensions: boolean;
  advancedQueryCapabilities: AdvancedQueryCapabilities;
};