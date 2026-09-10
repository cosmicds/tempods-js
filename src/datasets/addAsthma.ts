import { sampleColormap } from "@/colormaps/utils";
import { useEsriFeatureLayer } from "@/esri/maplibre/useEsriFeatureService";
import type { ExpressionSpecification, LayerSpecification } from "maplibre-gl";

const PLACES_BASE_URL =
  "https://services3.arcgis.com/ZvidGQkLaDJxRSJ2/arcgis/rest/services/PLACES_Local_Data_for_Better_Health_2022/FeatureServer";

const DEFAULT_LAYER_INDEX = 2;
const PREVALENCE_FIELD = "CASTHMA_CrudePrev";
const PREV_MIN = 5;
const PREV_MAX = 15;
const COLOR_STEPS = 7;
const MIN_ZOOM = 6;
const COLORMAP = "purples";

export const asthmaColorbar = {
  colormap: COLORMAP,
  min: PREV_MIN,
  max: PREV_MAX,
  label: "% of adults with asthma",
};

const purpleStops = sampleColormap(COLORMAP, COLOR_STEPS).flatMap((rgb, i) => {
  const val = PREV_MIN + (PREV_MAX - PREV_MIN) * (i / (COLOR_STEPS - 1));
  return [val, `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`];
});

const LAYER_CONFIGS: Record<number, {
  isPoint: boolean;
  idFields: string[];
  viewportLoading: boolean;
}> = {
  0: { isPoint: true,  idFields: ["PlaceFIPS", "PlaceName", "StateAbbr"],   viewportLoading: false },
  2: { isPoint: false, idFields: ["CountyFIPS", "CountyName", "StateAbbr"], viewportLoading: false },
  3: { isPoint: false, idFields: ["TractFIPS", "CountyName", "StateAbbr"],  viewportLoading: true  },
};

export type AsthmaStatus = "idle" | "loading" | "zoom-in" | "ready";

export function addAsthmaLayer(layerName: string, layerIndex: number = DEFAULT_LAYER_INDEX) {
  const config = LAYER_CONFIGS[layerIndex] ?? LAYER_CONFIGS[DEFAULT_LAYER_INDEX];
  const sourceId = `${layerName}-source`;
  const minzoom = config.viewportLoading ? MIN_ZOOM : undefined;

  const colorExpr = [
    "interpolate",
    ["linear"],
    ["get", PREVALENCE_FIELD],
    ...purpleStops
  ] as ExpressionSpecification;

  const layerBase = {
    source: sourceId,
    layout: { visibility: "none" as const } 
  };
  if (minzoom) {
    layerBase['minzoom'] = minzoom;
  }

  let layers: LayerSpecification[] = [];
  if (config.isPoint) {
    layers = [{
      ...layerBase,
      id: layerName,
      type: "circle" as const,
      paint: {
        "circle-color": colorExpr,
        "circle-radius": 5,
        "circle-opacity": 0.8,
        "circle-stroke-color": "#333",
        "circle-stroke-width": 0.5,
      }
    }];
  } else {
    layers = [
      {
        ...layerBase,
        id: layerName,
        type: "fill" as const,
        paint: {
          "fill-color": colorExpr,
          "fill-opacity": 0.6,
        },
      },
      {
        ...layerBase,
        id: `${layerName}-outline`,
        type: "line" as const,
        paint: {
          "line-color": "#333",
          "line-width": 0.5,
        },
      },
    ];
  }

  return useEsriFeatureLayer(PLACES_BASE_URL, layerIndex, {
    sourceId,
    layers,
    outFields: [PREVALENCE_FIELD, ...config.idFields],
    where: `${PREVALENCE_FIELD} IS NOT NULL`,
    attribution: "CDC PLACES",
    viewportLoading: config.viewportLoading,
    minZoom: MIN_ZOOM,
    idFields: config.idFields,
  });
}
