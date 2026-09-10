import { computed } from 'vue';
import type { Ref } from 'vue';
import { BoundingBox, BoundsSelector } from '@/types';

// Define standard bounds as constants
const BOUNDS_COLLECTION: Record<string, BoundingBox> = {
  novDec: {
    west: -154.975,
    south: 17.025,
    east: -24.475, 
    north: 63.975
  },
  march: {
    west: -167.99,
    south: 14.01,
    east: -13.01,
    north: 72.99
  },
  default: {
    west: -167.99,
    south: 14.01,
    east: -13.01,
    north: 72.99
  }
};

export function useBounds(
  date: Ref<Date | null>, 
  customSelector?: BoundsSelector
) {
  // Default selector function based on your existing logic
  const defaultSelector: BoundsSelector = (date: Date | null) => {
    if (date === null) {
      return BOUNDS_COLLECTION.default;
    }
    if (date.getUTCFullYear() === 2023) {
      return BOUNDS_COLLECTION.novDec;
    } else if (date.getUTCFullYear() === 2024 && date.getUTCMonth() === 2) {
      return BOUNDS_COLLECTION.march;
    } else {
      return BOUNDS_COLLECTION.default;
    }
  };

  // Use the custom selector if provided, otherwise use the default
  const selector = customSelector || defaultSelector;

  // Current bounds as a reactive reference
  const currentBounds = computed(() => selector(date.value));

  // Array representation [west, south, east, north]
  const boundsArray = computed(() => {
    const bounds = currentBounds.value;
    return [bounds.west, bounds.south, bounds.east, bounds.north];
  });

  return {
    boundsCollection: BOUNDS_COLLECTION,
    currentBounds,
    boundsArray,
    selector
  };
}