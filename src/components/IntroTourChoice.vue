<template>
  <v-card class="intro-tour-card">
    <button
      class="intro-tour-close"
      aria-label="Close"
      type="button"
      @click="() => emit('close')"
    >
      <v-icon icon="mdi-close" size="18" />
    </button>
    <v-card-text class="intro-popup">
      <div class="intro-tour-group">
        <v-btn
          :color="accentColor2"
          class="intro-tour-btn"
          @click="() => {
            emit('tour');
            emit('close');
          }"
        >Give me a quick tour</v-btn>
        <v-btn
          :color="accentColor2"
          class="intro-tour-btn"
          @click="() => emit('close')"
        >I want to dive right in!</v-btn>
      </div>
      <v-checkbox
        class="intro-dont-show"
        @update:modelValue="value => emit('dont-show', !!value)"
        label="Don't show this again"
        density="compact"
        hide-details
      ></v-checkbox>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useTempoStore } from "@/stores/app";

const emit = defineEmits<{
  (event: "close"): void;
  (event: "tour"): void;
  (event: "dont-show", value: boolean): void;
}>();

const store = useTempoStore();
const { accentColor2 } = storeToRefs(store);
</script>

<style>
.intro-tour-card {
  position: relative;
  max-width: 500px;
  padding-inline: 10px;
  margin: 0 auto;
  background: #1a1a2e !important;
  border: 1px solid var(--smithsonian-yellow);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.intro-tour-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 20px;
  height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2rem;
  line-height: 1;
  z-index: 1;
}

.intro-tour-close:hover {
  color: #ffffff;
}

.intro-popup {
  display: grid;
  grid-template-rows: 1fr auto;
  justify-items: center;
  min-height: 280px;
  padding: 2.5rem 1.5rem !important;
}

.intro-tour-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: center;
  gap: 20px;
}

.intro-dont-show {
  align-self: end;
}

.intro-tour-btn {
  color: #1a1a2e !important;
  font-family: "Lexend", sans-serif;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  height: 36px !important;
  min-width: 260px;
  padding: 0 20px;
  border-radius: 4px;
}
</style>
