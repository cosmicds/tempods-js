import { ref, type Ref } from "vue";
import { Map, MapMouseEvent } from "maplibre-gl";

import type { PointSelectionInfo, SelectionHandler } from "../../types";
import { baseUseSelection } from "./baseUseSelection";

export function usePointSelection(
  map: Ref<Map | null>,
  startActive: boolean = false,
) {
  
  const handler: SelectionHandler<MapMouseEvent, PointSelectionInfo> = {
    selectionInfo: ref<PointSelectionInfo | null>(null),

    onMouseup(event: MapMouseEvent) {
      handler.selectionInfo.value = {
        x: event.lngLat.lng,
        y: event.lngLat.lat,
      };
    },
  };

  return baseUseSelection({ map, handler, startActive });
}
