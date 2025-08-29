import { LatLng, LatLngBounds, LatLngBoundsExpression, Map, Rectangle, CircleMarker } from "leaflet";
import { RectangleSelectionInfo, UnifiedRegion } from "../../types";


function createBounds(info: RectangleSelectionInfo): LatLngBounds {
  const southwest = new LatLng(info.ymin, info.xmin);
  const northeast = new LatLng(info.ymax, info.xmax);
  return new LatLngBounds(southwest, northeast);
}

export function addRectangleLayer(
  map: Map,
  info: RectangleSelectionInfo,
  color: string,
) {
  const bounds = createBounds(info);
  const rect = new Rectangle(bounds);
  rect.setStyle({
    fill: true,
    fillOpacity: 0.7,
    weight: 0,
    color,
  });
  map.addLayer(rect);
  return { layer: rect };
}

export function updateRectangleBounds(
  rectangle: Rectangle,
  info: RectangleSelectionInfo
) {
  rectangle.setBounds(createBounds(info)); 
}

export function removeRectangleLayer(
  map: Map,
  rect: Rectangle
) {
  map.removeLayer(rect);
}


export function addPointLayer(
  map: Map,
  info: { x: number; y: number },
  color: string,
) {
  const latlng = new LatLng(info.y, info.x);
  const marker = new CircleMarker(latlng, {
    radius: 6,
    fillColor: color,
    color: "white",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8,
  });
  map.addLayer(marker);
  return { layer: marker };
}

export function updatePointLocation(
  marker: CircleMarker,
  info: { x: number; y: number },
) {
  const latlng = new LatLng(info.y, info.x);
  marker.setLatLng(latlng);
}

export function removePointLayer(
  map: Map,
  layer: CircleMarker,
) {
  map.removeLayer(layer);
}

export function regionBounds(region: UnifiedRegion<"leaflet">): [[number, number], [number, number]] {
  const pointPadding = 1;
  return region.geometryType == "rectangle" ?
    [[region.geometryInfo.ymin, region.geometryInfo.xmin], [region.geometryInfo.ymax, region.geometryInfo.xmax]] :
    [[region.geometryInfo.y - pointPadding, region.geometryInfo.x - pointPadding], [region.geometryInfo.y + pointPadding, region.geometryInfo.x + pointPadding]];
}

export function fitBounds(map: Map, bounds: LatLngBoundsExpression, fly = true) {
  if (fly) {
    map.flyToBounds(bounds);
  } else {
    map.fitBounds(bounds);
  }
}
