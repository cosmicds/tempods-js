<template>
  <section class="selection-list">
    <header class="selection-header">
      <h3>Selections</h3>
      <v-btn
        size="x-small"
        icon="mdi-plus"
        @click="$emit('create-new')"
        aria-label="Add new selection"
      />
    </header>

    <ul class="selection-items">
      <li v-if="filteredSelectionOptions.length === 0" class="selection-placeholder">
        Create a selection (region + time + molecule)
      </li>
      <li
        v-for="sel in filteredSelectionOptions"
        :key="sel.id"
        @click="select(sel)"
        class="selection-item"
        :style="{
          '--selection-color': sel.region?.color ? sel.region.color : '#aaa'
        }"
      >
        <label class="selection-label">
          <input
            type="radio"
            name="user-selection"
            :value="sel"
            v-model="modelValue"
            @change="select(sel)"
          />
          <span class="selection-name">{{ sel.name }}</span>
          <span class="selection-molecule" v-if="sel.molecule">{{ sel.molecule }}</span>
          <span class="selection-time" v-if="sel.timeRange">{{ formatTimeRange(sel.timeRange.range) }}</span>
        </label>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed, defineModel } from 'vue';
import { UserDataset } from "../types";
import { formatTimeRange } from "../utils/timeRange";


// Model (v-model) for currently selected UserDataset
const modelValue = defineModel<UserDataset | null>('modelValue');

const props = defineProps<{ selectionOptions: (UserDataset | null)[], selectionActive?: boolean }>();
const emits = defineEmits<{
  (e: 'edit-selection', sel: UserDataset | null): void;
  (e: 'create-new'): void;
}>();

const filteredSelectionOptions = computed(() =>
  props.selectionOptions.filter((sel): sel is UserDataset => sel !== null)
);


function select(sel: UserDataset) {
  if (modelValue.value !== sel) {
    modelValue.value = sel;
    emits('edit-selection', sel);
  }
}
</script>

<style scoped>
.selection-list {
  font-size: 0.9em;
  max-height: 200px;
  display: flex;
  flex-direction: column;
}

.selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5em;
}

.selection-header h3 {
  margin: 0;
  font-size: 1em;
}

.selection-items {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
}

.selection-item {
  margin: 0.25em 0;
  cursor: pointer;
  background: var(--selection-color, transparent);
  padding: 0.25em 0.5em;
  border-radius: 4px;
}

.selection-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5em;
}

.selection-name { }

.selection-time, .selection-molecule {
  font-size: 0.7em;
  opacity: 0.7;
  margin-left: 0.25em;
}

.selection-placeholder {
  padding: 0.75em;
  text-align: center;
  font-style: italic;
  font-size: 0.85em;
  color: #666;
}
</style>
