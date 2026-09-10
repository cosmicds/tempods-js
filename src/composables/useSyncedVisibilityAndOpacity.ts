
import { watch} from 'vue';

import type {Map} from 'maplibre-gl';

import { useMaplibreLayerOpacity } from '@/composables/useMaplibreLayerOpacity';
import { useMaplibreLayerVisibility } from '@/composables/useMaplibreLayerVisibility';

import { setLayerOpacity, setLayerVisibility } from '@/maplibre_controls';


export function syncLayerOpacity(map: Map, mainLayer: string, ...otherLayers: string[]) {
  
  // track the opacity of the main layer
  const { opacity } = useMaplibreLayerOpacity(map, mainLayer);
  
  const syncOpacities = (o: number) => {
    otherLayers.forEach(layerId => {
      setLayerOpacity(map, layerId, o);
    });
  };
  
  syncOpacities(opacity.value);
  watch(opacity, syncOpacities, {immediate: true}); 
}


export function syncLayerVisibility(map: Map, mainLayer: string, ...otherLayers: string[]) {
  
  // track the visibility of the main layer
  const { visible } = useMaplibreLayerVisibility(map, mainLayer);
  
  const syncVisible = (v: boolean) => {
    otherLayers.forEach(layerId => {
      setLayerVisibility(map, layerId, v);
    });
  };
  
  syncVisible(visible.value);
  watch(visible, syncVisible, {immediate: true}); 
}


export function syncLayerVisibilityAndOpacity(map: Map, mainLayer: string, ...otherLayers: string[]) {
  
  const { visible } = useMaplibreLayerVisibility(map, mainLayer);
  const { opacity } = useMaplibreLayerOpacity(map, mainLayer);
  
  const syncOpacities = (o: number) => {
    otherLayers.forEach(layerId => {
      setLayerOpacity(map, layerId, o);
    });
  };
  
  const syncVisible = (v: boolean) => {
    otherLayers.forEach(layerId => {
      setLayerVisibility(map, layerId, v);
    });
  };
  
  syncOpacities(opacity.value);
  syncVisible(visible.value);
  watch(opacity, syncOpacities, {immediate: true}); 
  watch(visible, (v) => {
    syncOpacities(opacity.value);
    syncVisible(v);
  }, {immediate: true});
  
}