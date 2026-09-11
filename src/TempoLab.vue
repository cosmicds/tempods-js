<template>
  <v-app
    id="app"
    :style="cssVars"
  > 
    <v-snackbar
      color="red"
      absolute
      eager
      v-model="showAlert"
      location="top"
      :timeout="-1"
      multi-line
    > 
      <div class="d-flex flex-row align-center ga-3">
      <v-icon
        color="white"
        class="mr-2"
      >mdi-alert</v-icon>
      
      <span v-html="globalWarning" />
      </div>
      <template v-slot:actions>
        <v-btn
          variant="tonal"
          @click="showAlert = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
    <header-warning
      v-model="showHeaderWarning"
      color="warning"
      icon="mdi-alert"
    >
    <div>
      The TEMPO, Population data, and other layers may be unavailable between August 31st - September 4th 
      due to a scheduled upgrade of the NASA Earthdata GIS service. 
      See <a style="color: currentColor;" href="https://gis.earthdata.nasa.gov/portal/home/index.html" target="_blank" rel="noopener">NASA Earthdata GIS</a>
      for more information. We apologize for the inconvenience. 
    </div>
    </header-warning>
    <header-bar />
    <div ref="root" class="layout-root">
      <side-placeholder
        id="layers-panel"
        ref="layers-panel"
        class="panel scroll-y"
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

      <v-dialog
        v-model="showPopup"
        width="50%"
      >
        <intro-tour-choice
          @close="() => {
            showPopup = false;
            if (!tourStartedFromPopup) {
              store.showTourHint = true;
            }
            tourStartedFromPopup = false;
          }"
          @tour="() => {
            tourStartedFromPopup = true;
            getIntroTour(store).start();
          }"
          @dont-show="(value: boolean) => dontShowPopupAgain = value"
        ></intro-tour-choice>
      </v-dialog>

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

      <map-with-controls id="map-panel" class="scroll-y" />

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
        class="panel scroll-y"
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
import { getIntroTour } from "@/utils/tours";

const root = useTemplateRef<HTMLDivElement>("root");
const leftHandle = useTemplateRef<HTMLDivElement>("left-handle");
const rightHandle = useTemplateRef<HTMLDivElement>("right-handle");
const tourStartedFromPopup = ref(false);
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
  globalWarning,
} = storeToRefs(store);

// The NASA Earthdata GIS outage window, in UTC (EDT is UTC-4, so 5pm EDT = 21:00 UTC).
// Months are 0-indexed.
const warningStart = new Date(Date.UTC(2026, 7, 30));  // Aug 30, 2026, 0 UTC
const warningEnd = new Date(Date.UTC(2026, 8, 5, 21));  // Sept 5, 2026, 5pm EDT
const now = new Date();
const showHeaderWarning = ref(now >= warningStart && now < warningEnd);

const showAlert = ref(!!globalWarning.value);
watch(globalWarning, (newVal) => {
  showAlert.value = !!newVal;
}); 
watch(showAlert, (newVal) => {
  if (!newVal) {
    store.globalWarning = "";
  }
});


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

const localStorageSkipPopup = "tempods-skip-intro-popup";
const showPopup = ref(true);
const dontShowPopupAgain = ref(false);
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

  const popupPreference = window.localStorage.getItem(localStorageSkipPopup);
  dontShowPopupAgain.value = popupPreference === "true";
  showPopup.value = !dontShowPopupAgain.value;
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

function onDontShowPopupAgainChange(dontShow: boolean) {
  window.localStorage.setItem(localStorageSkipPopup, String(dontShow));
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
watch(dontShowPopupAgain, onDontShowPopupAgainChange);
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

// this was a class and should have been an id selector,
// so only left important things
#map-panel {
  min-width: 250px;
  padding-left: 10px;
}

#layers-panel, #datasets-panel {
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
.progress-dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;

  .progress-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.25);
    cursor: pointer;
    transition: width 0.15s ease, height 0.15s ease, background-color 0.15s ease;
  }

  .progress-dot:hover {
    background-color: rgba(255, 255, 255, 0.5);
  }

  .progress-dot:focus-visible {
    outline: 1px solid var(--smithsonian-yellow);
    outline-offset: 2px;
  }

  .progress-dot.active {
    width: 12px;
    height: 12px;
    background-color: var(--smithsonian-yellow);
  }

  .progress-dot.active:hover {
    background-color: var(--smithsonian-yellow);
  }
}

body .shepherd-element {
  background: #1a1a2e;
  border: 1px solid var(--smithsonian-yellow);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  font-family: "Lexend", sans-serif;
  max-width: 500px !important;
}

body .shepherd-element .shepherd-arrow::before {
  background: #1a1a2e;
}

body .shepherd-element[data-popper-placement^="top"] .shepherd-arrow::before {
  border-right: 1px solid var(--smithsonian-yellow);
  border-bottom: 1px solid var(--smithsonian-yellow);
}

body .shepherd-element[data-popper-placement^="bottom"] .shepherd-arrow::before {
  border-left: 1px solid var(--smithsonian-yellow);
  border-top: 1px solid var(--smithsonian-yellow);
  background: #1a1a2e !important;
}

body .shepherd-element[data-popper-placement^="left"] .shepherd-arrow::before {
  border-top: 1px solid var(--smithsonian-yellow);
  border-right: 1px solid var(--smithsonian-yellow);
}

body .shepherd-element[data-popper-placement^="right"] .shepherd-arrow::before {
  border-bottom: 1px solid var(--smithsonian-yellow);
  border-left: 1px solid var(--smithsonian-yellow);
}

.shepherd-element .shepherd-text {
  color: #eaeaea;
}

body .shepherd-element .shepherd-text p {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

body .shepherd-has-title .shepherd-content .shepherd-header {
  background: transparent;
  padding-right: 2.5rem;
  padding-bottom: 0rem !important;
  padding-left: 12px;
}

.shepherd-element .shepherd-title {
  color: var(--smithsonian-yellow);
  font-weight: 700;
  font-size: 1.1rem;
}

.shepherd-element .shepherd-cancel-icon,
body .shepherd-has-title .shepherd-content .shepherd-cancel-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.6);
}

.shepherd-element .shepherd-cancel-icon:hover,
body .shepherd-has-title .shepherd-content .shepherd-cancel-icon:hover {
  color: #ffffff;
}

body .shepherd-footer {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;

  .shepherd-button-back {
    grid-column: 1;
    justify-self: start;
  }

  .progress-dots {
    grid-column: 2;
    justify-self: center;
  }

  .shepherd-button-next {
    grid-column: 3;
    justify-self: end;
  }
}

body .shepherd-button {
  font-family: "Lexend", sans-serif;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.0893em;
  border-radius: 4px;
  height: 28px;
  min-width: 50px;
  padding: 0 12px;
  line-height: 28px;
}

.shepherd-button.shepherd-button-back {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #eaeaea;
}

.shepherd-button.shepherd-button-back:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #ffffff;
  color: #ffffff;
}

.shepherd-button.shepherd-button-next {
  background: var(--smithsonian-yellow);
  border: 1px solid var(--smithsonian-yellow);
  color: #1a1a2e;
}

.shepherd-button.shepherd-button-next:not(:disabled):hover {
  filter: brightness(1.1);
  background: var(--smithsonian-yellow);
  color: #1a1a2e;
}
</style>
