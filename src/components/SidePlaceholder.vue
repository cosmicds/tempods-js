<template>
  <div
    :class="['side-panel-control', open ? 'open' : 'closed']"
    :style="cssVars"
  >
    <div class="open-close-container">
      <v-tooltip
        :disabled="!tooltips"
        :text="open ? openTooltipText : closedTooltipText"
      >
        <template #activator="{ props }">
          <v-icon
            v-bind="props"
            :color="open ? openArrowColor : closedArrowColor"
            class="open-close-icon"
            @click="toggleOpen()"
          >
            {{ open ? openIcon : closedIcon }}
          </v-icon>
        </template>
      </v-tooltip>
      <hr />
    </div>
    <v-slide-x-transition class="content-container">
      <div v-if="open" class="content">
        <slot></slot>
      </div>
      <div class="placeholder-content" v-else>
        <v-tooltip
          :disabled="!tooltips"
          :text="open ? openTooltipText : closedTooltipText"
        >
          <template #activator="{ props }">
            <v-icon
              class="content-icon"
              v-bind="{ ...props, icon }"
              :color="color"
              @click="toggleOpen()"
              size="large"
            >
            </v-icon>
        </template>
      </v-tooltip>
      </div>
    </v-slide-x-transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  openDirection: "left" | "right";
  icon: string;
  color?: string;
  openArrowColor?: string;
  closedArrowColor?: string;
  tooltips?: boolean;
  openTooltipText?: string | undefined;
  closedTooltipText?: string | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  color: "white",
  openArrowColor: "gray",
  closedArrowColor: "gray",
  tooltips: false,
  openTooltipText: undefined,
  closedTooltipText: undefined,
});
const open = defineModel<boolean>("open", { type: Boolean, default: false });
const closeDirection = computed(() => props.openDirection === "left" ? "right" : "left");
const openIcon = computed(() => `mdi-chevron-double-${closeDirection.value}`);
const closedIcon = computed(() => `mdi-chevron-double-${props.openDirection}`);

function toggleOpen() {
  open.value = !open.value;
}

const cssVars = computed(() => ({
  "--icon-alignment": props.openDirection == "left" ? "start" : "end",
}));
</script>

<style scoped lang="less">
.side-panel-control {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;

  -ms-overflow-style: none;
  scrollbar-width: none;
  padding: 0;

  &.closed::-webkit-scrollbar {
    display: none;
  }
}

hr {
  background: white;
  margin: auto;
  width: 100%;
}

.open-close-container {
  display: flex;
  background: #222222;
  flex-direction: column;

  .open-close-icon {
    align-self: var(--icon-alignment);
  }
}

.content-container {
  margin-top: 10px;
  height: 100%;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
