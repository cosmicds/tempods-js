import type { LayerStatus } from "@/types";

// --- ESRI Image service status warnings -------------------------------------------------

const serviceWarning =
  "The service supporting this layer is down, all or some data may be unavailable.";

// create custom warning for pop-dense, land-use, tempo data. still short but blames the provider
const customServiceWarning = new Map<string, string>([
  ['tempo', "NASA's Earthdata GIS service for this layer is down. See https://gis.earthdata.nasa.gov/ for more information."],
  ['pop', "NASA's Earthdata GIS service for this layer is down. See https://gis.earthdata.nasa.gov/ for more information."],
  ['land', "ESRI's service for this layer is down. See https://livingatlas.arcgis.com/landcoverexplorer/ for more information."],
]);
const partialCustomServiceWarning = new Map<string, string>([
  ['tempo', "Due to a disruption of NASA's Earthdata GIS service some data may be unavailable. "],
  ['pop', "Due to a disruption of NASA's Earthdata GIS service some data may be unavailable. "],
  ['land', "Due to a disruption ESRI's service for this layer is down. See https://livingatlas.arcgis.com/landcoverexplorer/ for more information."],
]);

function serviceMessage(layerId: string, partial: boolean): string {
  const messages = partial ? partialCustomServiceWarning : customServiceWarning;
  const key = layerId.split('-')[0];
  if (messages.has(key)) {
    return messages.get(key)!;
  } else {
    return serviceWarning;
  }
}

export function serviceStatus(layerId: string, serviceReady: boolean[] | undefined): LayerStatus {
  if (!serviceReady || serviceReady.length === 0) return { status: 'ready', statusMsg: [] };
  if (serviceReady.every(ready => ready)) return { status: 'ready', statusMsg: [] };
  const partial = serviceReady.some(ready => ready);
  return { status: 'error', statusMsg: [serviceMessage(layerId, partial)] };
}

// --- HMS wildfire smoke layer -------------------------------------------------

export const FIRE_LOADING_MESSAGE =
  "Fire layer is large and may take a few seconds to fully load";

export function fireStatus(loading: boolean, error: Error | null): LayerStatus {
  if (error) return { status: 'error', statusMsg: ["The wildfire smoke layer failed to load."] };
  if (loading) return { status: 'loading', statusMsg: [FIRE_LOADING_MESSAGE] };
  return { status: 'warning', statusMsg: [FIRE_LOADING_MESSAGE] };
}

// --- ESRI feature layers (asthma tracts / counties) ---------------------------

export type FeatureLayerStatus = "idle" | "loading" | "zoom-in" | "ready";

export const ZOOM_IN_MESSAGE = "Zoom in to see the data for this layer";

export function featureStatus(status: FeatureLayerStatus): LayerStatus {
  switch (status) {
  case 'zoom-in': return { status: 'warning', statusMsg: [ZOOM_IN_MESSAGE] };
  case 'loading': return { status: 'loading', statusMsg: [] };
  default: return { status: 'ready', statusMsg: [] };
  }
}
