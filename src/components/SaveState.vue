<template>
  <v-card class="save-state">
    <v-toolbar
      density="compact"
      color="var(--info-background)"
    >
      <v-toolbar-title text="Save and Load"></v-toolbar-title>
    </v-toolbar>
    <div class="icon-row">
      <h3>Save to:</h3>
      <v-tooltip
        location="top"
        text="Save to local file"
      >
      <template #activator="{ props }">
          <v-icon
            v-bind="props"
            icon="mdi-file"
            :color="accentColor"
            @click="() => saveLocal()"
          />
        </template>
      </v-tooltip>
      <v-tooltip
        location="top"
        text="Coming soon!"
      >
        <template #activator="{ props }">
          <span v-bind="props">
            <v-icon
              icon="mdi-google-drive"
              :color="accentColor"
              disabled
            />
          </span>
        </template>
      </v-tooltip>
    </div>
    <div class="icon-row">
      <h3>Open saved state:</h3>
      <v-tooltip
        location="top"
        text="Load from local file"
      >
        <template #activator="{ props }">
          <v-icon
            v-bind="props"
            icon="mdi-file"
            :color="accentColor"
            @click="() => loadLocal()"
          />
        </template>
      </v-tooltip>
      <v-tooltip
        location="top"
        text="Coming soon!"
      >
        <template #activator="{ props }">
          <span v-bind="props">
            <v-icon
              icon="mdi-google-drive"
              :color="accentColor"
              disabled
            />
          </span>
        </template>
      </v-tooltip>
    </div>
  </v-card>
</template>


<script setup lang="ts">
import { storeToRefs } from "pinia";
import { type TempoStore, useTempoStore, serializeTempoStore, updateStoreFromJSON } from "@/stores/app";

const store = useTempoStore();

const {
  accentColor
} = storeToRefs(store);

type OpType = "save" | "load";
type Target = "local" | "google-drive";
type EventType = `${OpType}-${Target}`;

const emit = defineEmits<{
  (event: "save-local"): void;
  (event: "load-local"): void;
  (event: "save-google-drive"): void;
  (event: "load-google-drive"): void;
  (event: "error", type: EventType, message: string): void;
}>();

const DEFAULT_FILENAME = "tempo_lab.json";

async function saveLocalFileSystemAPI(store: TempoStore): Promise<boolean> {
  const options = {
    suggestedName: DEFAULT_FILENAME,
    types: [
      {
        description: "JSON",
        accept: { "application/json": [".json"] },
      }
    ],
    multiple: false,
  };

  const content = serializeTempoStore(store, false);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore window *might* have this, and if we're here it should
  return window.showSaveFilePicker(options)
    .then((handle: FileSystemFileHandle) => handle.createWritable())
    .then((stream: FileSystemWritableFileStream) => {
      stream.write(content);
      stream.close();
      return true;
    })
    .catch((error: Error) => {
      if (error instanceof DOMException) { return false; }
      emit("error", "save-local", error.message);
      return false;
    });

}

function saveLocalLink(store: TempoStore) {
  const content = serializeTempoStore(store, false);

  const blob = new Blob([content], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = DEFAULT_FILENAME;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return true;
}

async function saveLocal() {
  let result = false;
  if ('showSaveFilePicker' in window) {
    result = await saveLocalFileSystemAPI(store);
  } else {
    result = saveLocalLink(store);
  }
  if (result) {
    emit("save-local");
  }
}

async function loadLocalFileSystemAPI(): Promise<boolean> {

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore window *might* have this, and if we're here it should
  const handles: FileSystemFileHandle[] = await window.showOpenFilePicker();
  if (handles.length === 0) {
    return false;
  }

  const handle = handles[0];
  const file = await handle.getFile();
  const content = await file.text();

  const result = updateStoreFromJSON(store, content, false);
  if (result) {
    return true;
  } else {
    emit("error", "load-local", "Error loading TEMPO Lab state from local file");
    return false;
  }
}

function loadLocalInput() {
  const input = document.createElement("input");
  input.type = "file";

  input.addEventListener("change", function (event) {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = function (evt) {
        if (!evt || !evt.target) { return; }
        const content = evt.target.result as string;
        const result = updateStoreFromJSON(store, content, false);
        if (result) {
          emit("load-local");
        } else {
          emit("error", "load-local", "Error loading TEMPO Lab state from local file");
        }
      };
      reader.readAsText(file);
    }
  });

  input.click();
}

async function loadLocal() {
  let result = false;
  if ('showOpenFilePicker' in window) {
    result = await loadLocalFileSystemAPI();
    if (result) {
      emit("load-local");
    }
  } else {
    loadLocalInput();
  }
}
</script>

<style scoped>
.save-state {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.icon-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 5px;
  padding: 5px;
}
</style>
