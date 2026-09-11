<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<template>
  <!-- not too wide, and center it -->
  <v-card width="fit-content" class="mx-auto popup-card--outline">
    
    <v-card-text class="pb-0">
      
      <div class="user-dataset-editor">
        <div class="ude__label_input" v-if="!props.colorOnly">
          <label for="ude-name">Edit Name:</label>
          <input id="ude-name" type="text" v-model="name" :placeholder="region.name ?? 'Dataset Name'" minlength="3" @keydown="handleKeydown"/>
        </div>

        <div class="ude__label_input" v-if="!props.nameOnly">
          <label for="ude-color"> Edit Color:</label>
          <input id="ude-color" type="color" v-model="color" @keydown="handleKeydown"/>
          <v-btn class="use_reset-color" variant="outlined" :color="region.color"  size="small" @click="color = region.color">
            <template #default>
            Reset
              <div 
                class="ude_color-swatch" 
                :style="{backgroundColor: region.defaultColor}"
                > 
              </div>
              </template>
          </v-btn>
        </div>
      </div>
      
    </v-card-text>
    
    <div class="ude__button-container">
      <v-btn variant="flat" size="small" @click="cancel">Cancel</v-btn>
      <v-btn :color="accentColor2" size="small" @click="save" :disabled="!changed">Save</v-btn>
    </div>

  </v-card>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted  } from 'vue';
import { useTempoStore } from "../stores/app";
const accentColor2 = useTempoStore().accentColor2;

import { UnifiedRegion } from '@/types';

type Props = {
  nameOnly?: boolean;
  colorOnly?: boolean;
  region: UnifiedRegion;
};

const props = withDefaults(defineProps<Props>(),{
  nameOnly: false,
  colorOnly: false,
});


const emit = defineEmits<{
  change: [name: string, color: string];
  cancel: [];
}>();

const name = ref(props.region.name || '');
const color = ref(props.region.color || props.region.defaultColor || 'white');
const changed = ref(false);

watch(name, () => {
  changed.value = true;
});
watch(color, () => {
  changed.value = true;
});

function save() {
  emit('change', name.value, color.value);
}

function cancel() {
  emit('cancel');
}


function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && changed.value) {
    save();
  } else if (event.key === 'Escape') {
    cancel();
  }
}

window.addEventListener('keydown', globalKeydownHandler);

function globalKeydownHandler(event: KeyboardEvent) {
  const skipTags = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'];
  if (
    event.target && 
    skipTags.includes((event.target as HTMLElement).tagName)) {
    return; 
  }
  handleKeydown(event);
}
onUnmounted(() => {
  window.removeEventListener('keydown', globalKeydownHandler);
});

</script>

<style lang="less" scoped>
div.user-dataset-editor {
  display: flex;
  flex-direction: column;
  gap: 1em;
  margin-block: 1em;
}

.ude__label_input {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 5px;
}

label {
  font-size: 0.9em;
  font-weight: bold;
  width: 10ch; // bad: hack to get inputs aligned
}

.ude__button-container {
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem 1rem;
  padding-bottom: 1rem;
  gap: 1rem;
}



input {
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-on-surface));
  border-radius: 5px;
  color: rgb(var(--v-theme-on-surface));
  padding-inline: 0.5rem;
  font-size: 0.9em;
}

.ude_color-swatch {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 1px solid rgb(var(--v-theme-on-surface));
  margin-left: 0.5em;
  vertical-align: middle;
}

.use_reset-color {
  text-transform: none;
}
</style>