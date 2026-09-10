<template>
  <v-checkbox
    v-model="modelValue"
    :value="value"
    :label="label"
    :class="[isSelected ? '' : 'not-selected']"
    :ripple="false"
    class="icon-checkbox"
  >
    <template #label>
      <span class="pl-2 icon-checkbox-label" @click="() => update()">
        {{ label }}
      </span>
    </template>
    <template #input="{ model }">
      <!-- Using <component :is="..."/> didn't work with v-icon for some reason -->
      <span class="icon-checkbox-control" @click="model.value = !model.value">
      <font-awesome-icon
          v-if="(model.value ? onIcon : offIcon)?.startsWith('fa-') && !hideIcon"
          :icon="model.value ? onIcon : offIcon"
          :class="['fa-icon', model.value ? 'icon-checkbox--checked' : '']"
          :color="model.value ? onColor : offColor"
        ></font-awesome-icon>
        <v-icon
          v-else-if="!hideIcon"
          :class="['md-icon', model.value ? 'icon-checkbox--checked' : '']"
          :color="model.value ? onColor : offColor"
        >{{ model.value ? onIcon : offIcon }}
      </v-icon>
      <div v-else :class="['icon-checkbox-circle-icon', model.value ? '' : 'disabled']" :style="{'--color':onColor}"></div>
    </span>
    </template>
  </v-checkbox>
</template>

<script setup lang="ts">
import { computed } from 'vue';
export interface IconCheckboxProps {
  value: string;
  onIcon: string;
  offIcon: string;
  onColor?: string;
  offColor?: string;
  label: string;
  hideIcon?: boolean;
}

const modelValue = defineModel<boolean | string[]>({required: true});
const props = withDefaults(defineProps<IconCheckboxProps>(), {
  onColor: "white",
  offColor: "gray",
  hideIcon: false,
});

function update() {
  if (typeof modelValue.value === "boolean") {
    modelValue.value = !modelValue.value;
  } else { // it's an array
    const index = modelValue.value.indexOf(props.value);
    if (index >= 0) {
      modelValue.value = modelValue.value.slice(0, index).concat(modelValue.value.slice(index + 1));
    } else {
      modelValue.value = [...modelValue.value, props.value];
    }
  }
}

const isSelected = computed(() => {
  if (typeof modelValue.value === "boolean") {
    return modelValue.value;
  } else if (Array.isArray(modelValue.value)) { // it's an array
    const index = modelValue.value.indexOf(props.value);
    return index >= 0;
  }
  return false;
});
</script>

<style lang="less">
.icon-checkbox {
.icon-checkbox--checked {
  filter: drop-shadow(0 0 2px rgb(var(--v-theme-on-surface)));
}


.v-selection-control__input {
  // outline: 1px solid white;
}

.icon-checkbox-control {
  display: flex;
  align-items: center;
}

.icon-checkbox-circle-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  background-color: var(--color);
  border-radius: 50%;
  outline: 1px solid rgb(var(--v-theme-on-surface));
  cursor: pointer;
}

}

.v-checkbox.icon-checkbox.not-selected {
  
  .icon-checkbox-label {
    opacity: 0.38;
  }
  
  .icon-checkbox-circle-icon {
    opacity: 0.38;
    outline: 1px solid #4d4d4d;
  }
}

.v-checkbox.icon-checkbox:hover {
  // filter: drop-shadow(0px 0px 2px rgb(var(--v-theme-on-surface)));
  font-weight: bold;
}
</style>
