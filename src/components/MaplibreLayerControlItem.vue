<template>
  <div
    :id="`mlc-layer-item-${layerId}`"
    :class="['mlc-layer-item', `mlc-layer-item-${visible ? 'visible' : 'none'}`]"
  >
    <div
      class="mlc-layer-item-checkbox-opacity-container"
    >
      <v-checkbox
        v-model="visible"
        :id="`mlc-${layerId}-visibility-checkbox`"
        class="mlc-layer-item-checkbox"
        density="compact"
        hide-details
        color="primary"
        :label="displayName ?? layerId"
        :disabled="disabled"
      >
        <template #label>
          {{ displayName ?? layerId }}
        </template>
        <template #append>
          <slot name="warning"></slot>
          
        </template>
      </v-checkbox>
      <div class="d-flex flex-grow-1 justify-end">
        <popup-info-button
          v-if="showInfo"
          width="500px"
          class="flex-1-1-auto"
        >
          <template #info>
            <slot name="info"></slot>
          </template>
        </popup-info-button>
      </div>
      <v-slider
        v-model.number="opacity"
        :id="`mlc-${layerId}-opacity-slider`"
        class="mlc-layer-opacity-slider"
        :min="0"
        :max="1"
        :step="0.01"
        title="Adjust layer opacity"
        color="primary"
        hide-details
        density="compact"
        :thumb-size="12"
        :track-size="3"
      />
    </div>
    <slot
      name="extras"
      :visible="visible"
    ></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots, watch } from "vue";
import type { Map } from "maplibre-gl";
import { useMaplibreLayerOpacity } from "@/composables/useMaplibreLayerOpacity";
import { useMaplibreLayerVisibility } from "@/composables/useMaplibreLayerVisibility";
import { setLayerOpacity, setLayerVisibility } from "@/maplibre_controls";
import { storeToRefs } from "pinia";
import { useTempoStore } from "@/stores/app";

const store = useTempoStore();
const { shownLayers } = storeToRefs(store);

interface Props {
  layerId: string;
  map: Map;
  displayName?: string;
  syncedItems?: string[];
  disabled?: boolean;
}

const props = defineProps<Props>();
let { opacity } = useMaplibreLayerOpacity(props.map, props.layerId);
let { visible } = useMaplibreLayerVisibility(props.map, props.layerId);

// sync opacity and visibility to other layers if specified 
// the opacity should be the layers opacity * the opacity of the main layer (layerId)
const { layerId, syncedItems } = props;
function syncOpacityAndVisibility() {
  if (syncedItems && syncedItems.length > 0) {
    syncedItems.forEach((syncedLayerId) => {
      setLayerOpacity(props.map, syncedLayerId, opacity.value);
      setLayerVisibility(props.map, syncedLayerId, visible.value);
    });
  }
}

const slots = useSlots();
const showInfo = computed(() => !!slots.info);

// Watch for changes to opacity and visibility and sync if needed
watch(() => [opacity.value, visible.value], () => {
  syncOpacityAndVisibility();
  // so just having this update here will miss the initial layers. but it's ok for now
  // since it only applies to legend layers. when we reload the state
  // we don't display the previously visible datasets anyway. 
  if (visible.value) {
    if (!shownLayers.value.includes(props.layerId)) {
      shownLayers.value.push(props.layerId);
    }
  }
});

// NB: If the props update, we need to make sure that the refs that we're using are still tracking the same layer
// In particular, if the layer ID changes, without this the component can end up manipulating the wrong layer!
//@ts-expect-error the types are correct
watch(() => [props.map, props.layerId],
  ([map, layerId]: [Map, string]) => {
    opacity = useMaplibreLayerOpacity(map, layerId).opacity;
    visible = useMaplibreLayerVisibility(map, layerId).visible;
    syncOpacityAndVisibility();
  }
);
</script>

<style scoped lang="less">
:deep(.v-checkbox .v-label) {
  font-size: 10pt;
}

.mlc-layer-item {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  
  
}


.mlc-layer-item-checkbox-opacity-container {
  width: 100%;
  padding: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  :deep(.v-input__append) {
    margin-left: 5px;
  }

  .v-slider {
    width: 70px;
    flex-grow: 1;
    flex-shrink: 0;
  }
  
  .v-input {
    flex-grow: 0;
  }
}
</style>
