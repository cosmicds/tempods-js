import { onMounted, onUnmounted, ref, watch } from "vue";
import { type LeafletMouseEvent, Map } from "leaflet";

import { UseSelectionOptions } from "../../types";

export function baseUseSelection<SelectionInfo>(
  options: UseSelectionOptions<Map, LeafletMouseEvent, SelectionInfo>,
) {

  const { map, handler, startActive } = options;
  const active = ref(startActive ?? false);

  onMounted(() => {
    const lMap = map.value;
    if (active.value && lMap) {
      updateListeners(lMap, active.value);
    }
  });

  function updateListeners(map: Map, active: boolean) {
    if (active) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      console.log(handler);
      if (handler.onMouseup) {
        map.addEventListener("mouseup", handler.onMouseup);
      }
      if (handler.onMousedown) {
        map.addEventListener("mousedown", handler.onMousedown);
      }
      if (handler.onMousemove) {
        map.addEventListener("mousemove", handler.onMousemove);
      }
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      if (handler.onMouseup) {
        map.removeEventListener("mouseup", handler.onMouseup);
      }
      if (handler.onMousedown) {
        map.removeEventListener("mousedown", handler.onMousedown);
      }
      if (handler.onMousemove) {
        map.removeEventListener("mousemove", handler.onMousemove);
      }
    }
  }

  watch(active, (nowActive: boolean) => {
    const lMap = map.value;
    if (lMap !== null) {
      updateListeners(lMap, nowActive);
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
    const lMap = map.value;
    if (lMap !== null && active.value) {
      updateListeners(lMap, false);
    }
  });

  return {
    active,
    selectionInfo: handler.selectionInfo,
  };
}
