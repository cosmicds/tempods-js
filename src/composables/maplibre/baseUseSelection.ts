import { onMounted, onUnmounted, ref, watch } from "vue";
import { Map, MapMouseEvent } from "maplibre-gl";

import { UseSelectionOptions } from "../../types";

export function baseUseSelection<SelectionInfo>(
  options: UseSelectionOptions<Map, MapMouseEvent, SelectionInfo>,
) {

  const { map, handler, startActive } = options;
  const active = ref(startActive ?? false);

  onMounted(() => {
    const mMap = map.value;
    if (active.value && mMap) {
      updateListeners(mMap, active.value);
    }
  });

  function updateListeners(map: Map, active: boolean) {
    if (active) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      if (handler.onMousedown) {
        map.on("mousedown", handler.onMousedown);
      }
      if (handler.onMouseup) {
        map.on("mouseup", handler.onMouseup);
      }
      if (handler.onMousemove) {
        map.on("mousemove", handler.onMousemove);
      }
    } else {
      map.dragPan.enable();
      map.scrollZoom.enable();
      if (handler.onMousedown) {
        map.off("mousedown", handler.onMousedown);
      }
      if (handler.onMouseup) {
        map.off("mouseup", handler.onMouseup);
      }
      if (handler.onMousemove) {
        map.off("mousemove", handler.onMousemove);
      }
    }
  }

  watch(active, (nowActive: boolean) => {
    const mMap = map.value;
    if (mMap !== null) {
      updateListeners(mMap, nowActive);
      mMap.getCanvas().style.cursor = nowActive ? 'crosshair' : '';
    }
  });

  // If we're going to take in the map as a ref,
  // we might as well update if its value does
  watch(map, (newMap: Map | null) => {
    if (newMap !== null) {
      updateListeners(newMap, active.value);
    }
  });

  onUnmounted(() => {
    // The map will probably be destroyed along with the component using this composable
    // But if not, we should remove handlers
    const mMap = map.value;
    if (mMap !== null && active.value) {
      updateListeners(mMap, false);
    }
  });

  return {
    active,
    selectionInfo: handler.selectionInfo,
  };

}
