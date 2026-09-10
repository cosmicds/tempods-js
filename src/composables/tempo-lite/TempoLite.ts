
import { ref, computed, watch } from "vue";
import { useImageOverlay } from "./tempoLiteFallback";
import { useUniqueTimeSelection } from "../useUniqueTimeSelection";
import { _preloadImages } from "./PreloadImages";

import { storeToRefs } from "pinia";

import { useTempoStore } from "@/stores/app";
import { useBounds } from "./useBounds";
// TODO: Connect Date and timestamps

import { getTimestamps, getExtendedRangeTimestamps } from "./timestamps";

function zpad(n: number, width: number = 2, character: string = "0"): string {
  return n.toString().padStart(width, character);
}

export function useTempoLiteImages(forceTimestamps = false) {
  
  const layerId = 'tempo-lite';

  const store = useTempoStore();
  const { timestamp, singleDateSelected, timestamps: esriTimestamps, timestampsLoaded: esriTimestampsLoaded } = storeToRefs(store);
  const erdTimestamps = ref<number[]>([]);
  const newTimestamps = ref<number[]>([]);
  const cloudTimestamps = ref<number[]>([]);
  const fosterTimestamps = ref<number[]>([ 1698838920000, 1698841320000, 1698843720000, 1698846120000, 1698848520000, 1698852120000, 1698855720000, 1698859320000, 1698862920000, 1698866520000, 1698870120000, 1698873720000, 1698876120000, 1698878520000, 1698880920000, 1699011720000, 1699014120000, 1699016520000, 1699018920000, 1699021320000, 1699024920000, 1699028520000, 1699032120000, 1699035720000, 1699039320000, 1699042920000, 1699046520000, 1699048920000, 1699051320000, 1699053720000, 1711626180000, 1711628640000, 1711631040000, 1711633440000, 1711637040000, 1711640640000, 1711644240000, 1711647840000, 1711651440000, 1711655040000, 1711658640000, 1711662240000, 1711665840000, 1711668240000 ]);


  const timestamps = ref<number[]>(fosterTimestamps.value);
  const extendedRangeTimestamps = ref<number[]>([]);


  const timestampsLoaded = ref(false);
  const fosterTimestampsSet = ref(new Set(fosterTimestamps.value));
  const erdTimestampsSet = ref(new Set());
  const newTimestampsSet = ref(new Set());
  const cloudTimestampsSet = ref(new Set());
  const extendedRangeTimestampsSet = ref(new Set());
  const timestampsSet = ref(new Set(fosterTimestamps.value));
  
  function forceLiteTimestamps() {
    esriTimestamps.value = timestamps.value;
    esriTimestampsLoaded.value = true;
  }

  async function updateTimestamps() {
    return Promise.all([
      getExtendedRangeTimestamps().then(ts => {
        extendedRangeTimestamps.value = ts;
        extendedRangeTimestampsSet.value = new Set(ts);
      }),
      getTimestamps().then((ts) => {
        erdTimestamps.value = ts.early_release;
        erdTimestampsSet.value = new Set(ts.early_release);
        newTimestamps.value = ts.released;
        newTimestampsSet.value = new Set(ts.released);
        timestamps.value = timestamps.value.concat(erdTimestamps.value, newTimestamps.value).sort();
        if (forceTimestamps) {
          forceLiteTimestamps();
        }
        timestampsSet.value = new Set(timestamps.value);
        cloudTimestamps.value = ts.clouds;
        cloudTimestampsSet.value = new Set(ts.clouds);
      })
    ]);
  }
  
  updateTimestamps().then(() => { timestampsLoaded.value = true; });
  
  

  const uu = useUniqueTimeSelection(timestamps);

  const loadedImagesProgress = ref(0);
  
  const sortedTimes = computed(() => {
    const setArray = Array.from(timestampsSet.value);
    setArray.sort((a,b) =>a-b);
    return setArray;
  });

  
  /* get the closest timestamp to timestamp.value that is in timestampsSet */
  const nearest2Timestamp = computed(() => {
    if (timestamp.value === null) return null;
    const setArray = sortedTimes.value;
    const goal = timestamp.value;
    return setArray.reduce(function(prev, curr) {
      return (Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev);
    });
  });

  const date = computed(() => {
    return nearest2Timestamp.value === null ? null : new Date(nearest2Timestamp.value);
  });

  const imageName = computed(() => {
    if (!date.value) { return ''; }
    return getTempoFilename(date.value);
  });

  const imageUrl = computed(() => {
    if (!nearest2Timestamp.value) { return ''; }
    const url = getTempoDataUrl(nearest2Timestamp.value);
    if (url === null) { return ''; }
    return url + imageName.value;
  });

  const opacity = ref(0.9);
  const preload = ref(true);

  const { currentBounds: imageBounds } = useBounds(date);
  const imageOverlay = useImageOverlay(imageUrl, opacity, imageBounds, 'tempo-lite');



  function getTempoFilename(date: Date): string {
    return `tempo_${date.getUTCFullYear()}-${zpad(date.getUTCMonth() + 1)}-${zpad(date.getUTCDate())}T${zpad(date.getUTCHours())}h${zpad(date.getUTCMinutes())}m.png`;
  }


  function getTempoDataUrl(timestamp: number): string {
  
    if (fosterTimestampsSet.value.has(timestamp)) {
      return 'https://tempo-images-bucket.s3.amazonaws.com/tempo-lite/';
    }

    if (erdTimestampsSet.value.has(timestamp)) {
      return 'https://raw.githubusercontent.com/johnarban/tempo-data-holdings/main/early_release/images/';
    }

    if (newTimestampsSet.value.has(timestamp)) {
      return "https://raw.githubusercontent.com/johnarban/tempo-data-holdings/main/released/images/resized_images/";
    }

    return '';
  }




  function imagePreload() {
    if (!preload.value) {
      return;
    }
    // console.log('preloading images for ', this.thumbLabel);
    const times = timestamps.value.slice(uu.minIndex.value, uu.maxIndex.value + 1);
    const images = times.map(ts => getTempoDataUrl(ts) + getTempoFilename(new Date(ts)));
    const promises = _preloadImages(images);
    let loaded = 0;
    loadedImagesProgress.value = 0;
    promises.forEach((promise) => {
      promise.then(() => {
        loaded += 1;
        loadedImagesProgress.value = (loaded / promises.length) * 100;
      }).catch((err) => {
        console.error('error loading image', err);
      });
    });
  }

  
  watch(singleDateSelected, (s) => {
    uu.singleDateSelected.value = s;
  });
  
  watch([uu.minIndex, uu.maxIndex], () => {
    if (imageOverlay.showLayer.value) {
      imagePreload();
    }
  });
  
  

  
  return {
    ...imageOverlay,
    layerId,
    forceLiteTimestamps,
  };

}