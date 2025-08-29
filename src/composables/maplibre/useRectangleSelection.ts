import { ref, type Ref } from "vue";
import { GeoJSONSource, LngLat, Map, MapMouseEvent } from "maplibre-gl";
import { v4 } from "uuid";

import type { RectangleSelectionInfo, SelectionHandler } from "../../types";
import type { LayerType } from "./utils";
import { baseUseSelection } from "./baseUseSelection";


export function useRectangleSelection(
  map: Ref<Map | null>,
  interactColor: string = "yellow",
  startActive: boolean = false,
) {

  let rectangleSource: GeoJSONSource | null = null;
  let rectangleLayer: LayerType | undefined = undefined;
  let startCoords: LngLat | null = null;
  let geoJson: GeoJSON.FeatureCollection;
  const uuid = v4();

  const handler: SelectionHandler<MapMouseEvent, RectangleSelectionInfo> = {

    selectionInfo: ref<RectangleSelectionInfo | null>(null),

    onMousedown(event: MapMouseEvent) {
      const mMap = map.value;
      if (!mMap) {
        return;
      }

      startCoords = event.lngLat;
      geoJson = {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [startCoords.lng, startCoords.lat],
              [startCoords.lng, startCoords.lat],
              [startCoords.lng, startCoords.lat],
              [startCoords.lng, startCoords.lat],
            ]],
          },
          properties: {},
        }],
      };

      mMap.addSource(uuid, {
        type: "geojson",
        data: geoJson,
      });

      const source = mMap.getSource(uuid);
      if (!source) {
        return;
      }

      rectangleSource = source as GeoJSONSource;

      mMap.addLayer({
        id: uuid,
        type: "line",
        source: uuid,
        paint: {
          "line-color": interactColor,
          "line-width": 2,
          "line-dasharray": [2, 1],
        }
      });

      const layer = mMap.getLayer(uuid);
      if (layer) {
        rectangleLayer = layer;
      }
    },

    onMouseup(event: MapMouseEvent) {
      const mMap = map.value;
      if (!mMap || startCoords === null) {
        return;
      }

      const eventCoords = event.lngLat;
      handler.selectionInfo.value = {
        xmin: Math.min(startCoords.lng, eventCoords.lng),
        ymin: Math.min(startCoords.lat, eventCoords.lat),
        xmax: Math.max(startCoords.lng, eventCoords.lng),
        ymax: Math.max(startCoords.lat, eventCoords.lat),
      };

      if (rectangleLayer) {
        mMap.removeLayer(rectangleLayer.id);
      }
      if (rectangleSource) {
        mMap.removeSource(rectangleSource.id);
      }
      startCoords = null;

    },

    onMousemove(event: MapMouseEvent) {
      const mMap = map.value;
      if (!mMap || (startCoords === null) || (!geoJson)) {
        return;
      }

      const eventCoords = event.lngLat;
      const coordinates = [[
        [startCoords.lng, startCoords.lat],
        [eventCoords.lng, startCoords.lat],
        [eventCoords.lng, eventCoords.lat],
        [startCoords.lng, eventCoords.lat],
        [startCoords.lng, startCoords.lat],
      ]];

      geoJson.features[0] = {
        ...geoJson.features[0],
        geometry: {
          type: "Polygon",
          coordinates,
        }
      };

      rectangleSource?.setData(geoJson);
    }
  };

  return baseUseSelection({ map, handler, startActive });

}
