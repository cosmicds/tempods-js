import { ref, shallowRef, watch, Ref, MaybeRef, toRef, computed, type ComputedRef } from 'vue';
import { RenderingRuleOptions } from '@/esri/ImageLayerConfig';
import { Map, type MapSourceDataEvent } from 'maplibre-gl';
import { validate as uuidValidate } from "uuid";

import { ImageService } from '@/esri/frontier_ImageServiceLayer/ImageService';
import { TempoDataService } from '@/esri/services/TempoDataService';
import { type PointBounds } from '@/esri/geometry';
import { serviceStatus } from '@/datasets/layerStatus';
import type { LayerStatus } from '@/types';



export interface UseEsriLayer {
  esriImageSource: Ref<maplibregl.RasterTileSource | null>;
  opacity: Ref<number>;
  noEsriData: Ref<boolean>;
  loadingEsriTimeSteps: Ref<boolean>;
  esriTimesteps: Ref<number[]>;
  updateEsriOpacity: (value?: number | null | undefined) => void;
  updateEsriTimeRange: () => void;
  addEsriSource: (map: Map) => void;
  removeEsriSource: () => void;
  renderOptions: Ref<RenderingRuleOptions>;
  serviceReady: Ref<boolean[]>;
  status: ComputedRef<LayerStatus>;
}

export interface ImageSerivceLayerOptions {
  renderingRule?: RenderingRuleOptions;
  visible?: boolean;
  clickValue?: boolean;
  exportImageOptions?: Record<string, unknown>;
}

export function useEsriImageServiceLayer(
  serviceUrl: string,
  layerId: string,
  opacity: MaybeRef<number>,
  variable: MaybeRef<string>,
  _timestamp: MaybeRef<number>,
  options: ImageSerivceLayerOptions = {},
): UseEsriLayer {

  const timestamp = toRef(_timestamp);
  const url = ref(serviceUrl);
  const esriLayerId = layerId;
  const esriImageSource = ref<maplibregl.RasterTileSource | null>(null);
  const map = shallowRef<Map | null>(null);
  const variableRef = toRef(variable);
  
  const tds = new TempoDataService(serviceUrl, variableRef.value);
  // bind tds to the window
  const serviceReady = ref<boolean[]>([]);
  tds.serviceStatusReady().then((ready) => {
    const servicesReady: boolean[] = [];
    for (const kv of ready) {
      servicesReady.push(kv[1]);
    }
    serviceReady.value = servicesReady;
  });

  const status = computed<LayerStatus>(() => serviceStatus(esriLayerId, serviceReady.value));


  const opacityRef = toRef(opacity);
  const noEsriData = ref(false);

  
  const esriOptions = computed(() => {
    return  {
      'format': 'png',
      'pixelType': 'U8',
      'size': '256,256',
      'transparent': true,
      'bboxSR': 3857,
      'imageSR': 3857,
      'bbox': '{bbox-epsg-3857}',
      'interpolation': 'RSP_NearestNeighbor',
      'renderingRule': options.renderingRule || {},
      ...options.exportImageOptions || {},
    };
  });

  
  function addLayer(map: Map | null | undefined) {

    if (map && !map.getLayer(esriLayerId)) {
      map.addLayer({
        id: esriLayerId,
        type: 'raster',
        source: esriLayerId,
        paint: {
          'raster-resampling': 'nearest',
          'raster-opacity': (options.visible === false) ? 0.0 : (opacityRef.value ?? 0.8),
        },
        layout: {
          'visibility': (options.visible === false) ? 'none' : 'visible',
        }
      });
      let index = -1;
      for (const [idx, layer] of Object.entries(map.getStyle().layers)) {
        if (uuidValidate(layer.id)) {
          index = Number(idx) - 1;
        }
      }
      if (index >= 0) {
        map.moveLayer(esriLayerId, map.getStyle().layers[index].id);
      }
    }
  }
  
  function removeLayer(map: Map | null | undefined) {
    if (map && map.getLayer(esriLayerId)) {
      map.removeLayer(esriLayerId);
    }
  }
  
  const dynamicMapService = ref<ImageService | null>(null);
  
  function onSourceLoad(e: MapSourceDataEvent) {
    // console.log(`sourcedata event for ${esriLayerId}: `);
    if (e.sourceId === esriLayerId && e.isSourceLoaded && map.value?.getSource(esriLayerId)) {
      console.log(`ESRI source ${esriLayerId} loaded`);
      esriImageSource.value = map.value?.getSource(esriLayerId) as maplibregl.RasterTileSource;
      updateEsriOpacity();
      if (dynamicMapService.value) {
        dynamicMapService.value.setDate(new Date(timestamp.value - 1), new Date(timestamp.value + 1));
      }
      if (options.visible !== undefined && !options.visible) {
        map.value?.setLayoutProperty(esriLayerId, 'visibility', 'none');
      }
      map.value?.off('sourcedata', onSourceLoad);
    }
  }
  
  function createImageService(map: Map, url: string, options) {
    // console.log(`[${esriLayerId}] Creating image service with options:`, options);
    return new ImageService(
      esriLayerId,
      map,
      {
        url: url,
        ...options
      },
      {
        tileSize: 256,
      }
    );
    
  }
  
  function addEsriSource(mMap: Map) {
    if (!mMap) return;
    map.value = mMap;
    
    dynamicMapService.value = createImageService(mMap, url.value, esriOptions.value);

    addLayer(mMap);
    // this event will run until the source is loaded
    mMap.on('sourcedata', onSourceLoad);
    
    console.log(`[${esriLayerId}] Adding ESRI source to map`);
    // on click on the layer
    if (options.clickValue) {
      mMap.on('click', (e) => {
        if (_hasEsriSource() && map.value) {
          const point = { x: e.lngLat.lng, y: e.lngLat.lat } as PointBounds;
          const timeRange = {start: timestamp.value - 1, end: timestamp.value + 1};
          tds.fetchSample(point, timeRange ).then((val) => {
            console.log(`[${esriLayerId}] Value at point`, point, 'is', val.samples.map(v => v.value));
          }).catch((err) => {
            console.error(`[${esriLayerId}] Error fetching sample:`, err);
          });
        }
      });
    }
  }
  
    
  function removeEsriSource() {
    removeLayer(map.value as Map | null);
    if (map.value && map.value.getSource(esriLayerId)) {
      map.value.removeSource(esriLayerId);
    }
  }
  
  function _hasEsriSource() {
    return map.value?.getSource(esriLayerId) !== undefined;
  }
  
  watch(timestamp, (_value) => {
    console.log(`[${esriLayerId}] esri imageset timestamp set to `, _value ? new Date(_value) : null);
    if ( _hasEsriSource() && dynamicMapService.value) {
      dynamicMapService.value.setDate(new Date(_value-1), new Date(_value+1));
    } else {
      console.error(`[${esriLayerId}] ESRI source not yet available`);
    }
  });
  
  
  
  function updateEsriOpacity(value: number | null | undefined = undefined) {
    if (map.value) {
      map.value.setPaintProperty(esriLayerId, 'raster-opacity', value ?? opacityRef.value ?? 0.8);
    }
  }

  

  watch(opacityRef, (_value: number) => {
    updateEsriOpacity(_value);
  });

  watch(noEsriData, (value: boolean) => {
    if (value) {
      updateEsriOpacity(0);
      removeLayer(map.value as Map | null);
    } else {
      addLayer(map.value as Map | null);
    }
  });

  return {
    esriImageSource,
    opacity: opacityRef,
    noEsriData,
    updateEsriOpacity,
    addEsriSource,
    removeEsriSource,
    serviceReady,
    status,
  } as UseEsriLayer;
}


