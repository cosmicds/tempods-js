<template>
  <div v-if="visible" class="header-warning" :class="`bg-${color}`">
    <span class="header-warning-prepend">
      <slot name="prepend">
        <v-icon v-if="icon">{{ icon }}</v-icon>
      </slot>
    </span>

    <span class="header-warning-text">
      <slot></slot>
    </span>

    <v-btn
      class="header-warning-close"
      icon="mdi-close"
      variant="text"
      density="compact"
      aria-label="Dismiss warning"
      @click="visible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

export interface HeaderWarningProps {
  color?: "error" | "warning" | "info" | "success" | "primary" | "secondary" | string;
  icon?: string;
  /** Seconds before auto-closing. 0 or negative means never. default 0 / never */
  timeout?: number;
}

const visible = defineModel<boolean>({ default: true });
const props = withDefaults(defineProps<HeaderWarningProps>(), {
  color: "error",
  icon: "",
  timeout: 0,
});

onMounted(() => {
  if (props.timeout > 0) {
    setTimeout(() => visible.value = false, props.timeout * 1000);
  }
});
</script>

<style scoped>
.header-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 2rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
  line-height: 1.2;
}

.header-warning-text {
  /* empty */
  color: black;
}

.header-warning-close {
  /* empty */
}
</style>
