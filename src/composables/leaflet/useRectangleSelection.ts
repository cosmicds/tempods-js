import { ref, type Ref } from "vue";
import { type LatLng, LatLngBounds, type LeafletMouseEvent, Map, Rectangle } from "leaflet";

import { RectangleSelectionInfo, SelectionHandler } from "../../types";
import { baseUseSelection } from "./baseUseSelection";

export function useRectangleSelection(
  map: Ref<Map | null>, 
  interactColor: string = "yellow",
  startActive: boolean = false,
) {
  let rect: Rectangle | null = null;
  let startCoords: LatLng | null = null;

  const handler: SelectionHandler<LeafletMouseEvent, RectangleSelectionInfo> = {
    
    selectionInfo: ref<RectangleSelectionInfo | null>(null),

    onMousedown(event: LeafletMouseEvent) {
      startCoords = event.latlng;
      rect = new Rectangle(new LatLngBounds(startCoords, startCoords));
      rect.setStyle({
        weight: 1,
        fillOpacity: 0,
        dashArray: [5, 5],
        color: interactColor,
      });
      map.value?.addLayer(rect);
    },

    onMouseup(event: LeafletMouseEvent) {
      if (startCoords === null) {
        return;
      }

      const eventCoords = event.latlng;
      handler.selectionInfo.value = {
        xmin: startCoords.lng,
        ymin: startCoords.lat,
        xmax: eventCoords.lng,
        ymax: eventCoords.lat,
      };

      if (rect) {
        map.value?.removeLayer(rect);
        rect = null;
      }
      startCoords = null;
    },

    onMousemove(event: LeafletMouseEvent) {
      if (startCoords === null || rect === null) {
        return;
      }
      rect.setBounds(new LatLngBounds(startCoords, event.latlng));
    }
  };

  return baseUseSelection({ map, handler, startActive });
}
