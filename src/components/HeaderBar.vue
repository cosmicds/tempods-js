<template>
  <div class="header">
    <!-- tempo logo -->
    <div id="logo-title">
    <a href="https://tempo.si.edu" target="_blank" rel="noopener noreferrer" >
      <img 
        src="@/assets/TEMPO-Logo-Small.png"
        alt="TEMPO Logo"
        style="width: 100px; height: 100px;"
      >
    </a>
    </div>

    <h1 id="title">TEMPO Lab: Investigate Air Quality</h1>
    <!-- <cds-dialog
      title="Time Series"
      v-model="samplesGraph"
      :color="accentColor2"
      draggable
      :scrim="false"
      :drag-predicate="(element: HTMLElement) => element.closest('.plotly') == null"
    >
      <timeseries-graph
        v-if="userSelections.length > 0"
        :data="userSelections"
      />
    </cds-dialog> -->

    <!-- </div> -->
    <cds-dialog 
      title="About the Data" 
      v-model="showAboutData" 
      :color="accentColor2" 
      max-height="80vh" 
      max-width="700px"
    >
      <about-data />
    </cds-dialog>

    <cds-dialog title="What's new" v-model="showChanges" :color="accentColor2">
      <ul class="snackbar-alert-ul">
        <li class="change-item mb-5" v-for="change in changes" :key="change.date" :data-date="change.date">
          <span :style='{"font-weight":"bold", "color": `${change.highlight ? "var(--smithsonian-yellow)" : "currentColor"}` }'>{{ change.date }}</span><br> <span v-html="change.html">  </span>{{ change.text }}
        </li>
      </ul>
      <!-- <template v-slot:activator="{ onClick, id }">
        <v-btn :id="id" @click="onClick" color="primary">
          Custom Activator
        </v-btn>
      </template>  -->
    </cds-dialog>

    <div id="menu-area">
      <v-btn 
        v-if="(new Date('2025-05-7 00:00:00') > new Date())"
        class='whats-new-button pulse' 
        aria-label="What's new" 
        @click="showChanges = true" 
        @keyup.enter="showChanges = true" 
        variant="outlined" 
        rounded="lg" 
        :color="accentColor2" 
        elevation="0"
        size="lg"
        >
        <v-tooltip location="bottom" activator="parent" :disabled="mobile" text="What's new"></v-tooltip>
        <v-icon>mdi-creation</v-icon>
      </v-btn>

    <div class="tour-button-wrapper">
      <v-btn
        @click="() => {
          getIntroTour(store).start();
        }"
        id="tour-button"
        class="intro-tour-button"
        aria-label="Start intro tour"
        variant="outlined"
        rounded="lg"
        density="default"
        :color="accentColor2"
        elevation="0"
        size="lg"
      >
        <v-tooltip location="bottom" activator="parent" :disabled="mobile" text="Start intro tour"></v-tooltip>
          <font-awesome-icon
            icon="fa-signs-post"
            size="lg"
          />
      </v-btn>
      <transition name="tour-hint-fade">
        <div v-if="showTourHintVisible" class="tour-hint-bubble">
          Open tour here any time
          <font-awesome-icon
              class="ml-2 cursor-pointer"
              icon="fa-circle-xmark"
              size="lg"
              @click="showTourHintVisible = false"
              @keyup.enter="showTourHintVisible = false"
              color="#ffcc33"
            />
        </div>
      </transition>
    </div>

     <v-btn
       @click="showSaveDialog = !showSaveDialog"
       class="save-button"
       aria-label="Save my progress"
       variant="outlined"
       rounded="lg"
       density="default"
       :color="accentColor2"
       elevation="0"
       size="lg"
      >
        <v-tooltip location="bottom" activator="parent" :disabled="mobile" text="Export current state"></v-tooltip>
        <v-icon>mdi-file-arrow-up-down</v-icon>
      </v-btn>

      <v-btn aria-role="menu" aria-label="Show menu" class="menu-button" variant="outlined" rounded="lg" :color="accentColor2" elevation="5">
        <v-icon size="x-large">mdi-menu</v-icon>
        <v-menu
          activator="parent"
          >
          <v-list>
            <v-list-item 
              tabindex="0"
              aria-label="See recent changes"
              @click="showChanges = true"
              @keyup.enter="showChanges = true"
              >
              What's New
            </v-list-item>

            <v-list-item 
              tabindex="0" 
              aria-label="Show introduction"
              @click="() => emit('intro-slide', 1)"
              @keyup.enter="() => emit('intro-slide', 1)"
              disabled
              >
                Introduction
            </v-list-item>
            
            <v-list-item 
              tabindex="0"
              aria-label="Show user guide"
              @click="() => emit('intro-slide', 4)"
              @keyup.enter="() => emit('intro-slide', 4)"
              disabled
              >
              User Guide
            </v-list-item>
            
            <v-list-item
              tabindex="0"
              aria-label="Show dialog telling about the data"
              @click="showAboutData = true"
              @keyup.enter="showAboutData = true"
              >
              About the Data
            </v-list-item>
            
            <v-list-item 
              
              aria-label="Leave Page to Educator Resources"
              >
              <a style="font-weight: normal;" tabindex="0"  href="https://www.cosmicds.cfa.harvard.edu/resources/tempo" target="_blank" rel="noopener">Educator Resources<v-icon>mdi-open-in-new</v-icon></a>
            </v-list-item>
            
            <v-list-item 
              tabindex="0" 
              aria-label="Show credits"
              @click="showCredits = true"
              @keyup.enter="showCredits = true"
              disabled
              >
                Credits
            </v-list-item>
            
          </v-list>
        </v-menu>
      </v-btn>

      <v-dialog
        v-model="showSaveDialog"
        width="300px"
      >
        <save-state
          @load-local="showSaveDialog = false"
          @save-local="showSaveDialog = false"
          @error="(type: string, message: string) => reportError(type, message)"
        />
      </v-dialog>

      <v-snackbar
        v-model="showErrorSnackbar"
        timeout="2000"
        color="error"
      >
         {{ ioErrorMessage }}
      </v-snackbar>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDisplay } from "vuetify";
import { supportsTouchscreen } from "@cosmicds/vue-toolkit";

import { useTempoStore } from "@/stores/app";
import changes from "@/changes";
import AboutData from "@/components/AboutData.vue";

import { library } from "@fortawesome/fontawesome-svg-core";
import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons";
import { getIntroTour } from "@/utils/tours";

library.add(faArrowsRotate);

const emit = defineEmits<{
  (event: "intro-slide", value: number): void;
  (event: 'layers'): void;
}>();

const store = useTempoStore();
const {
  accentColor2,
  showTourHint,
} = storeToRefs(store);

const display = useDisplay();

const showChanges = ref(false);
const showAboutData = ref(false);
const showCredits = ref(false);
const showSaveDialog = ref(false);
const showErrorSnackbar = ref(false);
const ioErrorMessage = ref("");

const showTourHintVisible = ref(false);
const tourHintAlreadyShown = ref(false);
// let tourHintTimeout: ReturnType<typeof setTimeout> | undefined;

watch(showTourHint, (visible) => {
  if (!visible) {
    return;
  }
  store.showTourHint = false;
  if (tourHintAlreadyShown.value) {
    return;
  }
  tourHintAlreadyShown.value = true;
  showTourHintVisible.value = true;
  // clearTimeout(tourHintTimeout);
  // tourHintTimeout = setTimeout(() => {
  //   showTourHintVisible.value = false;
  // }, 5000);
});

const touchscreen = supportsTouchscreen();

const smallSize = computed(() => {
  return display.smAndDown.value;
});

const mobile = computed(() => {
  return smallSize.value && touchscreen;
});

function reportError(_error: string, message: string) {
  showErrorSnackbar.value = true;
  ioErrorMessage.value = message;
}
</script>

<style scoped lang="less">
#title {
  color: var(--smithsonian-yellow);
  font-weight: 600;
  font-size: clamp(1rem, 4vw, 2.5rem);
  text-align: center;
  text-wrap: wrap;
  flex-grow: 1;
}

a[href="https://tempo.si.edu"]>img {
  // display: inline;
  height: 70px !important;
  width: auto !important;
}

.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px;
  gap: 3px;

  >* {
    background-color: transparent;
  }

  >div {
    outline: 1px solid transparent;
  }

  .layers-button, .save-button, .intro-tour-button {
    padding: 8px;
  }

  #menu-area {
    display: flex;
    justify-self: end;
    gap: 1rem;
    align-items: center;

    :deep(.icon-wrapper) {
      width: 40px;
      height: 40px;
      border-radius: 8px !important;
    }

  }
}

.tour-button-wrapper {
  position: relative;
}

.tour-hint-bubble {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 100;
  padding: 10px 14px;
  background: #1a1a2e;
  border: 1px solid var(--smithsonian-yellow);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  color: #eaeaea;
  font-family: "Lexend", sans-serif;
  font-size: 0.9rem;
  white-space: nowrap;
}

.tour-hint-bubble::before {
  content: "";
  position: absolute;
  bottom: 100%;
  right: 16px;
  width: 12px;
  height: 12px;
  margin-bottom: -6px;
  background: #1a1a2e;
  border-top: 1px solid var(--smithsonian-yellow);
  border-left: 1px solid var(--smithsonian-yellow);
  transform: rotate(45deg);
}

.tour-hint-fade-enter-active,
.tour-hint-fade-leave-active {
  transition: opacity 0.2s ease;
}

.tour-hint-fade-enter-from,
.tour-hint-fade-leave-to {
  opacity: 0;
}

</style>
