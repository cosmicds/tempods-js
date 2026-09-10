/* eslint-disable @typescript-eslint/naming-convention */
import { EsriGeometryType } from "../geometry";

export interface EsriFeatureServerDescriptionJSON {
  currentVersion?:                              number;
  serviceItemId:                               string;
  serviceDescription:                          string;
  maxRecordCount:                              number;
  capabilities?:                                string;
  description:                                 string;
  copyrightText:                               string;
  spatialReference?:                            SpatialReference;
  initialExtent?:                               LExtent;
  fullExtent?:                                  LExtent;
  allowGeometryUpdates?:                        boolean;
  units?:                                       string;
  layerOverridesEnabled?:                       boolean;
  size?:                                        number;
  layers:                                      FeatureServiceLayer[];
  tables?:                                      FeatureServiceTable[];
}



export interface LExtent {
  xmin?:             number;
  ymin?:             number;
  xmax?:             number;
  ymax?:             number;
  spatialReference?: SpatialReference;
}

export interface SpatialReference {
  wkid?:       number;
  latestWkid?: number;
}

export interface FeatureServiceLayer {
  id:                number;
  name:              string;
  parentLayerId?:     number;
  defaultVisibility?: boolean;
  subLayerIds?:       null;
  minScale?:          number;
  maxScale?:          number;
  type?:              string;
  geometryType?:      EsriGeometryType;
}


export interface FeatureServiceTable {
    id: number;
    name: string;
}



export interface EsriFeatureServiceLayerDescription {
    currentVersion:                     number;
    id:                                 number;
    name:                               string;
    type:                               string;
    serviceItemId:                      string;
    displayField:                       string;
    description:                        string;
    copyrightText:                      string;
    geometryType:                       EsriGeometryType;
    minScale:                           number;
    maxScale:                           number;
    extent:                             Extent;
    spatialReference:                   SpatialReference;
    hasMetadata:                        boolean;
    fields:                             EsriFeatureServiceLayerField[];
    dateFieldsTimeReference:            DateFieldsTimeReference;
    preferredTimeReference:             null;
    maxRecordCount:                     number;
    standardMaxRecordCount:             number;
    standardMaxRecordCountNoGeometry:   number;
    tileMaxRecordCount:                 number;
    maxRecordCountFactor:               number;
}


export interface DateFieldsTimeReference {
    timeZone:               string;
    timeZoneIANA:           string;
    respectsDaylightSaving: boolean;
}



export interface Extent {
    xmin:             number;
    ymin:             number;
    xmax:             number;
    ymax:             number;
    spatialReference: SpatialReference;
}



export interface EsriFeatureServiceLayerField {
    name:         string;
    type:         EsrieFieldType;
    alias:        string;
    sqlType:      SQLType;
    nullable:     boolean;
    editable:     boolean;
    domain:       null;
    defaultValue: null;
    length?:      number;
}

export enum SQLType {
    SQLTypeOther = "sqlTypeOther",
}

export enum EsrieFieldType {
    EsriFieldTypeDouble = "esriFieldTypeDouble",
    EsriFieldTypeInteger = "esriFieldTypeInteger",
    EsriFieldTypeOID = "esriFieldTypeOID",
    EsriFieldTypeString = "esriFieldTypeString",
}

export interface Index {
    name:        string;
    fields:      string;
    isAscending: boolean;
    isUnique:    boolean;
    description: string;
    indexType:   string;
}
