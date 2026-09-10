<template>
  <v-app
    id="app"
    :style="cssVars"
  >
    <header-bar />
    <div ref="root" class="layout-root">
      <side-placeholder
        id="layers-panel"
        ref="layers-panel"
        class="panel"
        open-direction="right"
        icon="mdi-layers"
        :color="accentColor2"
        open-tooltip-text="Hide layer controls"
        closed-tooltip-text="Show layer controls"
        open-arrow-color="surface-variant"
        :closed-arrow-color="accentColor2"
        tooltips
        v-model:open="layerControlsOpen"
      >
        <template #default>
          <comparison-data-controls
            class="comparison-data-controls"
          />
        </template>
      </side-placeholder>

      <v-tooltip
        text="Change panel width"
        location="end center"
        :disabled="dragging"
      >
        <template #activator="{ props }">
          <div
            v-bind="props"
            class="handle"
            ref="left-handle"
            aria-label="Resize left/middle"
            role="separator"
          ></div>
        </template>
      </v-tooltip>

      <map-with-controls id="map-panel" />

      <v-tooltip
        text="Change panel width"
        location="start center"
        :disabled="dragging"
      >
        <template #activator="{ props }">
          <div
            v-bind="props"
            class="handle"
            ref="right-handle"
            aria-label="Resize middle/right"
            role="separator"
          ></div>
        </template>
      </v-tooltip>

      <side-placeholder
        id="datasets-panel"
        ref="datasets-panel"
        class="panel"
        open-direction="left"
        icon="mdi-chart-line"
        :color="accentColor2"
        open-tooltip-text="Hide graphing controls"
        closed-tooltip-text="Show graphing controls"
        open-arrow-color="surface-variant"
        :closed-arrow-color="accentColor2"
        tooltips
        v-model:open="datasetControlsOpen"
      >
        <template #default>
          <dataset-controls
           class="dataset-controls"
          />
        </template>
     </side-placeholder>
    </div>

    <!-- Data collection opt-out dialog -->
    <v-dialog
      scrim="false"
      v-model="showAutosaveDialog"
      max-width="400px"
      id="autosave-popup-dialog"
    >
      <v-card>
        <v-card-text>
          To provide a convenient experience across repeated uses of this app, we automatically store data describing your app state in local browser storage. While this means that your app state information is <strong>not</strong> shared with the CosmicDS team, we still allow you to opt of this if you wish.
        </v-card-text>
        <v-card-actions class="pt-3">
          <v-spacer></v-spacer>
          <v-btn
            color="#ff6666"
            @click="() => {
              useLocalStorage = false;
              writeLocalStoragePreference(false);
              showAutosaveDialog = false;
            }"
          >
          Opt out
          </v-btn>
          <v-btn 
            color="green"
            @click="() => {
              useLocalStorage = true;
              writeLocalStoragePreference(true);
              showAutosaveDialog = false;
            }"
          >
            Allow
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, ref, type Ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";

import { useTempoStore, updateStoreFromJSON, serializeTempoStore } from "@/stores/app";

const root = useTemplateRef<HTMLDivElement>("root");
const leftHandle = useTemplateRef<HTMLDivElement>("left-handle");
const rightHandle = useTemplateRef<HTMLDivElement>("right-handle");
// const layersPanel = useTemplateRef<HTMLElement>("layers-panel");
// const datasetsPanel = useTemplateRef<HTMLElement>("datasets-panel");
// const mapsPanel = useTemplateRef<HTMLElement>("maps-panel");

const showAutosaveDialog = ref(false);

const store = useTempoStore();
const {
  accentColor,
  accentColor2,
  debugMode,
  tempoRed,
  datasetControlsOpen,
  layerControlsOpen,
} = storeToRefs(store);

const query = new URLSearchParams(window.location.search);
debugMode.value = (query.get("debug") ?? process.env.VUE_APP_TEMPO_LAB_DEBUG)?.toLowerCase() == "true";
const ignoreCache = query.get("ignorecache")?.toLowerCase() == "true";

const infoColor = "#092088";
const HANDLE_SIZE_PX = 4;
const DEFAULT_PANEL_WIDTH_PX = 300;
const MIN_PANEL_WIDTH_PX = 250;
const PLACEHOLDER_WIDTH_PX = 40;
const cssVars = computed(() => {
  return {
    "--accent-color": accentColor.value,
    "--accent-color-2": accentColor2.value,
    "--info-background": infoColor,
    "--tempo-red": tempoRed.value,
    "--handle-size": `${HANDLE_SIZE_PX}px`,
    "--handle-color": "gray",
    "--handle-hover-color": accentColor.value,
  };
});

const localStorageStateKey = "tempods";
const localStoragePreferenceKey = "tempods-save";

let _saveStateInterval: ReturnType<typeof setInterval>;

const localStorageAutosave = window.localStorage?.getItem(localStoragePreferenceKey);
const useLocalStorage = ref(localStorageAutosave?.toLowerCase() !== "false");

let animationFrame = 0;

function setBasis(panel: HTMLElement, sizePx: number) {
  panel.style.flexBasis = `${sizePx}px`;
}

function getBasis(panel: HTMLElement): number {
  const basis = parseFloat(getComputedStyle(panel).flexBasis);
  return isNaN(basis) ? 0 : basis;
}

function saveStateToLocalStorage(): boolean {
  try {
    const stringified = serializeTempoStore(store, true);
    window.localStorage.setItem(localStorageStateKey, stringified);
    return true;
  } catch (_error) {
    return false;
  }
}

onBeforeMount(() => {
  const storedState = ignoreCache ? undefined : window.localStorage.getItem(localStorageStateKey);
  if (storedState) {
    updateStoreFromJSON(store, storedState, true);
  }
});

function updateSizes(layersDefault: boolean = false, datasetsDefault: boolean = false) {
  // const rootElement = root.value;
  const layers = document.querySelector("#layers-panel") as HTMLElement;
  const datasets = document.querySelector("#datasets-panel") as HTMLElement;

  const layersWidth = layerControlsOpen.value ? (layersDefault ? DEFAULT_PANEL_WIDTH_PX : Math.max(MIN_PANEL_WIDTH_PX, layers.clientWidth)) : PLACEHOLDER_WIDTH_PX;
  setBasis(layers, layersWidth);
  const datasetsWidth = datasetControlsOpen.value ? (datasetsDefault ? DEFAULT_PANEL_WIDTH_PX : Math.max(MIN_PANEL_WIDTH_PX, datasets.clientWidth)) : PLACEHOLDER_WIDTH_PX;
  setBasis(datasets, datasetsWidth);
}

const dragging = ref(false);

type EventHandler = (event: PointerEvent) => void;

interface HandleSetupParams {
  handle: HTMLElement;
  onMove: EventHandler;
  initialEventHandler?: (event: PointerEvent) => void;
}

function setupHandleEvents(params: HandleSetupParams) {
  
  const { handle, onMove } = params;

  handle.addEventListener("pointerdown", (event: PointerEvent) => {

    event.preventDefault();
    handle.setPointerCapture(event.pointerId);

    document.body.classList.add("panel-size-dragging");

    dragging.value = true;

    if (params.initialEventHandler) {
      params.initialEventHandler(event); 
    }

    const onUp = (ev: PointerEvent) => {
      try {
        handle.releasePointerCapture(ev.pointerId); 
      } catch (error) {
        console.error(error);
      }
      document.body.classList.remove("panel-size-dragging");
      dragging.value = false;

      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

  });
}

onMounted(() => {
  
  const left = leftHandle.value;
  const leftPanel = document.querySelector("#layers-panel") as HTMLElement;
  if (left && leftPanel) {
    let startXLeft = 0;
    let startLeft = 0;

    const onLeftMove = (event: PointerEvent) => {
      const dx = event.clientX - startXLeft;
      const minLeft = layerControlsOpen.value ? DEFAULT_PANEL_WIDTH_PX : PLACEHOLDER_WIDTH_PX;
      const newLeftSize = Math.max(minLeft, startLeft + dx);
      setBasis(leftPanel, newLeftSize);
    };

    const initialLeftHandler = (event: PointerEvent) => {
      startXLeft = event.clientX;
      startLeft = getBasis(leftPanel);
    };

    setupHandleEvents({
      handle: left,
      onMove: onLeftMove,
      initialEventHandler: initialLeftHandler,
    });

  }

  const right = rightHandle.value;
  const rightPanel = document.querySelector("#datasets-panel") as HTMLElement;
  if (right && rightPanel) {
    let startXRight = 0;
    let startRight = 0;

    const onRightMove = (event: PointerEvent) => {
      const dx = event.clientX - startXRight;
      const minRight = datasetControlsOpen.value ? DEFAULT_PANEL_WIDTH_PX : PLACEHOLDER_WIDTH_PX;
      const newRightSize = Math.max(minRight, startRight - dx);
      setBasis(rightPanel, newRightSize);
    };

    const initialRightHandler = (event: PointerEvent) => {
      startXRight = event.clientX;
      startRight = getBasis(rightPanel);
    };

    setupHandleEvents({
      handle: right,
      onMove: onRightMove,
      initialEventHandler: initialRightHandler,
    });
  }

  window.addEventListener("resize", () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => updateSizes());
  });

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && useLocalStorage.value && !ignoreCache) {
      saveStateToLocalStorage();
    }
  });

  _saveStateInterval = setInterval(() => {
    if (!useLocalStorage.value || ignoreCache) {
      return;
    }
    saveStateToLocalStorage();
  }, 60_000);
  
  updateSizes(true, true);
  setHandleVisibility(leftHandle, layerControlsOpen.value);
  setHandleVisibility(rightHandle, datasetControlsOpen.value);
});

function setHandleVisibility(handle: Ref<HTMLElement | null>, visible: boolean) {
  if (handle.value) {
    handle.value.style.display = visible ? "unset" : "none";
  }
}

function onDatasetPanelOpenChange(open: boolean) {
  updateSizes(false, true);
  setHandleVisibility(rightHandle, open);
}

function onLayersPanelOpenChange(open: boolean) {
  updateSizes(true, false);
  setHandleVisibility(leftHandle, open);
}

watch(datasetControlsOpen, onDatasetPanelOpenChange);
watch(layerControlsOpen, onLayersPanelOpenChange);

function writeLocalStoragePreference(use: boolean) {
  const value = use ? "true" : "false";
  window.localStorage.setItem(localStoragePreferenceKey, value);

  if (!use) {
    window.localStorage.removeItem(localStorageStateKey);
  }
}

watch(useLocalStorage, writeLocalStoragePreference);
</script>

<style lang="less">
// NB: The styles here are NOT scoped - these are intended to apply to the overall application,
// as this component is really just a layout container.
// If we do want component-only styles, just add a <style scoped> block below this one

@font-face {
  font-family: "Highway Gothic Narrow";
  src: url("./assets/HighwayGothicNarrow.ttf");
}

// JC: This was commented out, but I put it back in because my browser (Chrome on Ubuntu) didn't already have Lexend
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');

html, body {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
}

body {
  font-family: Verdana, Arial, Helvetica, sans-serif;
}

#app {
  h1, h2, h3, h4, h5, h6, p, div {
    user-select: none;
    -webkit-user-select: none;
  }
  font-family: "Lexend", sans-serif;
  height: 100%;
}

.map-panel {
  min-width: 250px;
  display: flex;
  flex-direction: row;
  padding-left: 10px;
  gap: 5px;
}

#layers-panel, #datasets-panel {
  overflow-y: scroll;
  /* these were already 0, just make 
  what we're starting with clearer */
  margin: 0;
  padding: 0;
}

#layers-panel {
  /* can set to 5px to give handle back space */
  margin-inline: 5px;
}

#datasets-panel {
  /* can set to 5px to give handle back space */
  margin-inline: 5px;
}

.comparison-data-controls,
.dataset-controls {
  width: 100%;
  padding-inline: 8px;
}

:root {
  // font-size: clamp(14px, 1.7vw, 16px);
  // --default-font-size: 1rem; // we don't use this
  font-size: 16px; // this is the standard browser default
  --default-line-height: clamp(1rem, min(2.2vh, 2.2vw), 1.6rem); // we don't use this
  --smithsonian-blue: #009ade;
  --smithsonian-yellow: #ffcc33;
  --info-background: #092088;
  --map-height: 500px;
}

@media (max-width: 750px) {
  :root {
    --map-height: 60vh;
    --map-height: 60dvh;
    --map-height: 60svh;
    font-size: 14px;
  }
}

.tab-content {
  padding: 0.5rem 1rem;
  border: 5px solid var(--tempo-red);
  border-radius: 10px;
  margin: 10px;
}

.layout-root {
  height: 100%;
  width: 100%;
  display: flex;
  overflow: hidden;
  overflow-x: auto;
}

.panel {
  flex: 0 0 auto;
  width: 100%;
  background: var(--panel);
  box-sizing: border-box;
  overflow: auto;
  border: 1px solid rgba(255,255,255,0.06);
}

.handle {
  flex: 0 0 var(--handle-size);
  width: var(--handle-size);
  cursor: col-resize;
  background: var(--handle-color);
  position: relative;
  touch-action: none;
}

.handle:hover {
  background: var(--handle-hover-color);
}

.handle::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  border-radius: 2px;
  background: rgba(255,255,255,0.35);
  box-shadow: -6px 0 0 rgba(255,255,255,0.18), 6px 0 0 rgba(255,255,255,0.18);
}

.handle:hover::after {
  box-shadow: -6px 0 0 rgba(255,255,255,0.42), 6px 0 0 rgba(255,255,255,0.42);
}

.panel-size-dragging, .panel-size-dragging * {
  cursor: col-resize !important;
}

#autosave-popup-dialog {

  .v-card-text {
    color: #BDBDBD;
  }

  .v-overlay__content {
    font-size: var(--default-font-size);
    background-color: purple;
    position: absolute;
    bottom: 0;
    right: 0;
  }

  .v-btn--size-default {
      font-size: calc(0.9 * var(--default-font-size));
    }  

  .v-card-actions .v-btn {
    padding: 0 4px;
  }
}
</style>
