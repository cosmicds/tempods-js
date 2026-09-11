import { GeoJSONSource, LngLatBoundsLike, Map } from "maplibre-gl";
import { v4 } from "uuid";

import { syncLayerVisibility } from "@/composables/useSyncedVisibilityAndOpacity";

import { RectangleSelectionInfo, PointSelectionInfo, UnifiedRegion } from "../../types";

const layerGetter = (m: Map, id: string) => m.getLayer(id);
export type LayerType = Exclude<ReturnType<typeof layerGetter>, undefined>;

function createBounds(info: RectangleSelectionInfo) {
  return [
    [info.xmin, info.ymin],
    [info.xmax, info.ymin],
    [info.xmax, info.ymax],
    [info.xmin, info.ymax],
    [info.xmin, info.ymin],
  ];
}

function outlineLayerId(layerId: string): string {
  return `${layerId}-outline`;
}

export function addRectangleLayer(
  map: Map,
  id: string, 
  info: RectangleSelectionInfo,
  color: string,
  opacity=0.7,
  visible=true,
  outlineColor="#000000",
  outlineWidth=1.5,
) {

  const uuid = id ?? v4();
  const geoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          createBounds(info),
        ],
      },
      properties: {},
    }],
  };

  map.addSource(uuid, {
    type: "geojson",
    data: geoJson,
  });
  const source = map.getSource(uuid) as GeoJSONSource;

  map.addLayer({
    id: uuid,
    type: "fill",
    source: uuid,
    paint: {
      "fill-color": color,
      "fill-opacity": opacity,
    },
    layout: {
      visibility: visible ? "visible" : "none",
    }
  });

  const outlineId = outlineLayerId(uuid);
  map.addLayer({
    id: outlineId,
    type: "line",
    source: uuid,
    paint: {
      "line-color": outlineColor,
      "line-width": outlineWidth,
      "line-opacity": 1.0,
    },
    layout: {
      visibility: visible ? "visible" : "none",
    }
  });
  // const coloredOutlineId = outlineLayerId(uuid)+"-colored";
  // map.addLayer({
  //   id: coloredOutlineId,
  //   type: "line",
  //   source: uuid,
  //   paint: {
  //     "line-color": color,
  //     "line-width": outlineWidth * 1.5,
  //     "line-opacity": 1.0,
  //   },
  //   layout: {
  //     visibility: visible ? "visible" : "none",
  //   }
  // });
  syncLayerVisibility(map, uuid, outlineId);
  // syncLayerVisibilityAndOpacity(map, uuid, outlineId);

  return { layer: source, layerIds: [uuid, outlineId] };
}

export function updateRectangleBounds(
  source: GeoJSONSource,
  info: RectangleSelectionInfo,
) {
  source.getData().then(data => {
    const geoJson = data as GeoJSON.FeatureCollection;
    geoJson.features[0] = {
      ...geoJson.features[0],
      geometry: {
        type: "Polygon",
        coordinates: [createBounds(info)],
      }
    };

    source.setData(geoJson);
  });
}

export function removeRectangleLayer(
  map: Map,
  layer: LayerType,
) {
  const outlineId = outlineLayerId(layer.id);
  if (map.getLayer(outlineId)) {
    map.removeLayer(outlineId);
  }
  map.removeLayer(layer.id);
  map.removeSource(layer.id);
}

// Point layer utilities
export function addPointLayer(
  map: Map,
  id: string,
  info: PointSelectionInfo,
  color: string,
  visible=true,
) {
  const uuid = id ?? v4();
  const geoJson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [info.x, info.y],
      },
      properties: {},
    }],
  };

  map.addSource(uuid, {
    type: "geojson",
    data: geoJson,
  });
  const source = map.getSource(uuid) as GeoJSONSource;

  map.addLayer({
    id: uuid,
    type: "circle",
    source: uuid,
    paint: {
      "circle-radius": 8,
      "circle-color": color,
      "circle-stroke-color": "white",
      "circle-stroke-width": 2,
    },
    layout: {
      visibility: visible ? "visible" : "none",
    }
  });

  return { layer: source, layerIds: [uuid] }; // add layerIds for compatability wtih rectangle
}

export function updatePointLocation(
  source: GeoJSONSource,
  info: PointSelectionInfo,
) {
  source.getData().then(data => {
    const geoJson = data as GeoJSON.FeatureCollection;
    geoJson.features[0] = {
      ...geoJson.features[0],
      geometry: {
        type: "Point",
        coordinates: [info.x, info.y],
      }
    };
    source.setData(geoJson);
  });
}

export function removePointLayer(
  map: Map,
  layer: LayerType,
) {
  map.removeLayer(layer.id);
  map.removeSource(layer.id);
}

export function regionBounds(region: UnifiedRegion): [[number, number], [number, number]] {
  const pointPadding = 1;
  return region.geometryType == "rectangle" ?
    [[region.geometryInfo.xmin, region.geometryInfo.ymin], [region.geometryInfo.xmax, region.geometryInfo.ymax]] :
    [[region.geometryInfo.x - pointPadding, region.geometryInfo.y - pointPadding], [region.geometryInfo.x + pointPadding, region.geometryInfo.y + pointPadding]];
}

export function fitBounds(map: Map, bounds: LngLatBoundsLike, _fly: boolean) {
  map.fitBounds(bounds);
}
