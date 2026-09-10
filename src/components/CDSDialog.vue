<template>
  <v-dialog 
    :class="['cds-dialog', `${displayedShortTitle.toLowerCase().replace(/ /g, '-')}-cds-dialog`, !modal ? 'nonmodal' : '']" 
    v-model="modelValue" 
    :scrim="scrim"
    :persistent="persistent"
    :no-click-animation="!modal"
    >
    <!-- add the activator slot, but only use it if the appropriate value is given for activator -->
    <template v-slot:activator="$attrs">
      <slot name="activator" v-bind="$attrs">
        <v-btn
          v-if="button"
          :color="color"
          :title="displayedShortTitle"
          class="cds-dialog-button"
          @click="modelValue = true"
          @keyup.enter="modelValue = true"
          tabindex="0"
          >
          Open {{ displayedShortTitle }}
        </v-btn>
      </slot>
    </template>
    
    <v-card
      ref="card"
      class="cds-dialog-card"
      :width="width"
      :max-width="maxWidth"
      :height="height"
      :max-height="maxHeight"
    >   
      <v-toolbar
        density="compact"
        :color="titleColor"
      >
        <v-toolbar-title class="cds-dialog-v-toolbar-title" :text="title"></v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          class="cds-dialog-close-icon"
          icon="mdi-close"
          @click="close"
          @keyup:enter="close"
        >
        </v-btn>
      </v-toolbar>
      
      <v-card-text class="cds-dialog-v-card-text" >
        <slot>
          Add content to the default slot
        </slot>
      </v-card-text>
    </v-card>
  </v-dialog>

</template>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch, useAttrs, useTemplateRef } from "vue";
import { VCard } from "vuetify/components";
import { UseDraggableDialogOptions, useDraggableDialog } from "../composables/useDraggableDialog";

interface CDSDialogProps {
  title: string;
  color?: string;
  titleColor?: string;
  shortTitle?: string;
  draggable?: boolean;
  button?: boolean;
  scrim?: boolean;
  persistent?: boolean;
  modal?: boolean;
  maxHeight?: string;
  maxWidth?: string;
  width?: string;
  height?: string;
}

const modelValue = defineModel<boolean>();

const props = withDefaults(defineProps<CDSDialogProps>(), {
  color: "red",
  shortTitle: "",
  draggable: false,
  button: false,
  titleColor: "primary",
  scrim: true,
  persistent: false,
  modal: true,
});


const card = useTemplateRef<InstanceType<typeof VCard>>("card");
const displayedShortTitle = computed(() => props.shortTitle || props.title);
const cardRoot = ref<HTMLElement | null>(null);

const attrs = useAttrs();

if (props.draggable) {
  const options: UseDraggableDialogOptions = {
    root: cardRoot,
    dialogSelector: ".cds-dialog-card",
  };
  if (attrs["drag-predicate"]) {
    options.dragPredicate = attrs["drag-predicate"] as (element: HTMLElement) => boolean;
  }
  useDraggableDialog(options);
}

function updateRoot() {
  nextTick(() => {
    if (card.value) {
      cardRoot.value = card.value.$el;
    }
  });
}

function close(event: PointerEvent) {
  modelValue.value = false;
  event.stopPropagation();
}

onMounted(() => {
  if (props.draggable && modelValue.value) {
    updateRoot();
  }
});


watch(modelValue, value => {
  if (value && props.draggable) {
    updateRoot();
  }
});

</script>

<style>

.cds-dialog {
  display: flex;
  width: calc(100%);
}
.cds-dialog-card {
  align-self: center;
  outline: 1px solid rgb(var(--v-theme-surface-variant)); 
  /* overscroll-behavior does not have wide support */
  overscroll-behavior-y: none; 

  .v-toolbar, .v-toolbar__content {
    height: 40px !important;
  }
}

.cds-dialog-close-icon {
  cursor: pointer;
}

.v-dialog.cds-dialog > .v-overlay__content {
  margin: unset;
}

.cds-dialog .v-card-text {
  contain: layout;
}
.cds-dialog-v-card-text {
  overflow-y: scroll;

}
.v-toolbar-title.cds-dialog-v-toolbar-title > .v-spacer {
  display: none;
}
.v-toolbar-title.cds-dialog-v-toolbar-title > .v-toolbar-title__placeholder {
  padding-bottom: 1px; /* needed for text with unicode subscript text */
} 

.cds-dialog.nonmodal {

  .v-overlay__content {
    visibility: hidden;

    .v-card {
      visibility: visible;
    }
  }

}
</style>
