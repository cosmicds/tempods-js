import {ref, shallowRef, Ref, watch, onUnmounted, toValue, toRef} from 'vue';
import { BoundingBox } from '@/types';
import M from 'maplibre-gl';

import { setLayerVisibility } from "@/maplibre_controls";


export interface MaplibreImageOverlayComposable {
  overlay: Ref<M.ImageSource | null>;
  addTo: (map: M.Map) => void;
  removeFromMap: () => void;
  setVisibility: (visible: boolean) => void;
  showLayer: Ref<boolean>
}

export function useImageOverlay(
  imageUrl: Ref<string> | string, 
  opacity: Ref<number> | number,
  imageBounds: Ref<BoundingBox>,
  overlayId='image-overlay',
): MaplibreImageOverlayComposable {
  
  imageUrl = toRef(imageUrl);
  opacity = toRef(opacity);
  imageBounds = toRef(imageBounds);
  const overlay = ref<M.ImageSource | null>(null);
  
  const layer: M.LayerSpecification = {
    id: overlayId,
    type: "raster",
    source: overlayId,
    paint: {
      'raster-opacity': toValue(opacity),
      'raster-fade-duration': 0,
      'raster-resampling': 'nearest',
    }
  };
  
  
  function toMaplibreBounds(boundingBox: BoundingBox): M.Coordinates {
    // Four geographical coordinates, represented as arrays of 
    // longitude and latitude numbers, which define the corners of the image. 
    // The coordinates start at the top left corner of the image and proceed in 
    // clockwise order. They do not have to represent a rectangle.
    // TL -> TR -> BR -> BL (NW, NE, SE, NW) [long, lat]
    return [
      [
        boundingBox.west, 
        boundingBox.north
      ], // top-left
      [
        boundingBox.east, 
        boundingBox.north
      ], // top-right
      [
        boundingBox.east, 
        boundingBox.south
      ], // bottom-right
      [
        boundingBox.west, 
        boundingBox.south
      ], // bottom-left
    ];
  }
  
  function addSource(map: M.Map) {
    map.addSource(overlayId,
      {
        type: "image",
        url: toValue(imageUrl),
        coordinates: toMaplibreBounds(imageBounds.value),
      } 
    );
    return map.getSource(overlayId);
  }
  
  function addLayer(map: M.Map) {
    map.addLayer(layer);
    return map.getLayer(overlayId);
  }
  
  const _map = shallowRef<M.Map | null>(null);
  const showLayer = ref(false);
  function addTo(map: M.Map) {
    console.log("add to", overlayId);
    _map.value = map;

    console.log(`adding overlay ${overlayId} to map`);
    const source = addSource(map);
    addLayer(map);
    showLayer.value = true;
    if (source !== undefined) {
      console.log(`overlay ${overlayId} added to map`);
      overlay.value = source as M.ImageSource;
      configureOverlay();
    }

  }
  
  function removeFromMap() {
    if (_map.value) {
      if (_map.value.getLayer(overlayId)) {
        _map.value.removeLayer(overlayId);
      }
      showLayer.value = false;
      // _map.value.removeSource(overlayId);
    }
  }
  
  function updateOrClearImage(url: string) {

    if (url && overlay.value) {
      overlay.value.updateImage({url: url});
      if (!showLayer.value) return;
      if (!overlay.value.map.getLayer(overlayId)) {
        overlay.value.map.addLayer(layer);
      }
    } else if (overlay.value) {
      if (overlay.value.map.getLayer(overlayId)) {
        overlay.value.map.removeLayer(overlayId);
      }
    }
    
  }
  
  watch(imageUrl, (url: string) => {
    updateOrClearImage(url);
  });

  watch(opacity, (value: number) => {
    if (overlay.value) {
      overlay.value.map.setPaintProperty(overlayId, 'raster-opacity', value);
    }
  });

  watch(imageBounds, (bounds: BoundingBox) => {
    if (overlay.value) {
      overlay.value.setCoordinates(toMaplibreBounds(bounds));
    }
  });
  
  function configureOverlay() {
    if (overlay.value) {
      console.log(`configuring overlay ${overlayId}`);
      overlay.value.map.setPaintProperty(overlayId, 'raster-fade-duration', 0);
    }
  }
  
  function setVisibility(visible: boolean) {
    if (_map.value === null) return;
    setLayerVisibility(_map.value, overlayId, visible);
  }
  
  

  onUnmounted(() => {
    if (overlay.value) {
      overlay.value.map.removeLayer(overlayId).removeSource(overlayId);
    }
  });
  
  return { overlay, addTo, removeFromMap, setVisibility, showLayer} as MaplibreImageOverlayComposable;

}