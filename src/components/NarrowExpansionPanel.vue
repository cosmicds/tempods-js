<template>
  <v-expansion-panels variant="default" v-model="panel">
    <v-expansion-panel class="lcil" static>
      <v-expansion-panel-title 
        class="lcil" 
        tabindex="0"
        height="1.5em"
        min-height="1.5em"
        >
        <slot name="summary" :isOpen="isOpen">{{ label ?? 'Show Legend' }}</slot>
      </v-expansion-panel-title>
      <v-expansion-panel-text class="lcil-legend-content">
        <slot></slot>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import {  ref, watch } from 'vue';



interface Props {
  item: string
  label?: string
}

const _props = defineProps<Props>();
const isOpen = defineModel<boolean>('isOpen', { required: false, default: true });
const panel = ref(isOpen.value ? 0 : null);
watch(panel, (newVal) => {
  isOpen.value = newVal === 0;
});




</script>

<style>
.lcil-legend-content > .v-expansion-panel-text__wrapper {
  padding-inline: 5px;
}

</style>