import { ref, type Ref } from "vue";
import { type LeafletMouseEvent, Map } from "leaflet";

import { PointSelectionInfo, SelectionHandler } from "../../types";
import { baseUseSelection } from "./baseUseSelection";

export function usePointSelection(
  map: Ref<Map | null>,
  startActive: boolean = false,
) {

  const handler: SelectionHandler<LeafletMouseEvent, PointSelectionInfo> = {

    selectionInfo: ref<PointSelectionInfo | null>(null),

    onMouseup(event: LeafletMouseEvent) {
      handler.selectionInfo.value = {
        x: event.latlng.lng,
        y: event.latlng.lat,
      };
    },
  };

  return baseUseSelection({ map, handler, startActive });
}
