// Types

import L, { Rectangle } from 'leaflet';
import M, { GeoJSONSource } from 'maplibre-gl';
import { Ref, toValue } from 'vue';

// eslint-disable-next-line @typescript-eslint/ban-types
export type Prettify<T> = { [K in keyof T]: T[K]; } & {};

// eslint-disable-next-line @typescript-eslint/naming-convention
type LocationOrderedPair<T extends string> = [number, number] & {_order: T};

export type LatLngPair = LocationOrderedPair<'(Lat,Lng)'>;
// eslint-disable-next-line @typescript-eslint/naming-convention
export type LngLatPair = LocationOrderedPair<'(Lng,Lat)'>;

export type MappingBackends = 'leaflet' | 'maplibre';


export interface InitMapOptions {
  loc: LatLngPair,
  zoom: number,
  t?: number | null,
}

export interface LocationOfInterest {
  latlng: LatLngPair;
  zoom: number;
  text: string;
  description: string;
  time: string;
  index?: number;
}

export interface InterestingEvent {
  date: Date;
  endDate?: Date;
  dateString: string;
  locations: LocationOfInterest[];
  label?: string;
  info?: string;
  highlighted?: boolean;
  hasFeature?: boolean;
}

export type MapType<T extends MappingBackends> = 
  T extends 'leaflet' ? L.Map :
  T extends 'maplibre' ? M.Map :
  never;

export type RectangleType<T extends MappingBackends> =
  T extends 'leaflet' ? Rectangle :
  T extends 'maplibre' ? GeoJSONSource:
  never;

export function isLeaflet<T extends MappingBackends>(backend: Ref<T> | T, map: unknown): map is MapType<'leaflet'> {
  return toValue(backend) === 'leaflet' && toValue(map) instanceof L.Map;
}
export function isMaplibre<T extends MappingBackends>(backend: Ref<T> | T, map: unknown): map is MapType<'maplibre'> {
  return toValue(backend) === 'maplibre' && toValue(map) instanceof M.Map;
}

export class LatLng extends L.LatLng {
  constructor(lat: number, lng: number) {
    super(lat, lng);
  }

  toLeaflet(): L.LatLng {
    return this;
  }
  
}
export class LatLngBounds extends L.LatLngBounds {
  constructor(sw: L.LatLng, ne: L.LatLng) {
    super(sw, ne);
  }

  toLeaflet(): L.LatLngBounds {
    return this;
  }
}


// Library-agnostic bounds representation
export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export type BoundsSelector = (date: Date) => BoundingBox;

export interface DragInfo {
  el: HTMLElement | undefined;
  title: HTMLElement;
  mouseStartX: number;
  mouseStartY: number;
  elStartX: number;
  elStartY: number;
  oldTransition?: string;
  overlays: NodeList;
}

export interface RectangleSelectionInfo {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export interface PointSelectionInfo {
  x: number;
  y: number;
}

export type AggValue = {
  value: number | null;
  date: Date;
};

export interface DataPointError {
  lower: number | null;
  upper: number | null;
}

export interface MillisecondRange {
  start: number;
  end: number;
}

export interface RectangleSelection<T extends MappingBackends> {
  id: string;
  name: string;
  rectangle: RectangleSelectionInfo;
  color: string;
  layer?: RectangleType<T>;
  source?: GeoJSONSource;
  samples?: Record<number, AggValue>;
  errors?: Record<number, DataPointError>;
  timeRange?: MillisecondRange | MillisecondRange[];
}

export interface SelectionHandler<EventType, SelectionInfo> {
  selectionInfo: Ref<SelectionInfo | null>;
  onMouseup?: (event: EventType) => void;
  onMousedown?: (event: EventType) => void;
  onMousemove?: (event: EventType) => void;
}

export interface UseSelectionOptions<MapType, EventType, SelectionInfo> {
  map: Ref<MapType | null>;
  handler: SelectionHandler<EventType, SelectionInfo>;
  startActive?: boolean;
}


