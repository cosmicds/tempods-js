<template>
  <v-menu open-on-hover>
    <template #activator="{ props }">
      <v-btn
        icon
        class="info-button"
        v-bind="props"
        density="compact"
        flat
        :size="size"
      >
        <v-icon>mdi-information-variant-circle-outline</v-icon>
      </v-btn>
    </template>
    <v-card
      class="info-card"
      v-bind="cardProps"
    >
      <slot name="info">
        <v-card-text class="pa-2" v-if="infoHtml"><span style="padding:0;margin:0" v-html="infoHtml"/></v-card-text>
        <v-card-text class="pa-2" v-else>{{ infoText }}</v-card-text>
      </slot>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
interface Props {
  infoText?: string;
  infoHtml?: string
  size?: string | number;
  width?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  infoText: "No information provided.",
  size: "small",
});

const cardProps: Record<string, string | number> = {};
if (props.width != undefined) {
  cardProps.width = props.width;
}
</script>

<style scoped>
.info-card {
  padding: 5px;
  border-radius: 5px;
  outline: 1px solid rgb(var(--v-theme-surface-variant));
  font-size: 14px;
}

.v-btn {
  background-color: transparent;
}
</style>
