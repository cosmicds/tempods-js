import { ref, watch, Ref, MaybeRef, toRef, nextTick, computed } from 'vue';
import { renderingRule, stretches, colorramps, RenderingRuleOptions, ColorRamps } from '../ImageLayerConfig';
import { Map, type MapSourceDataEvent } from 'maplibre-gl';
import { validate as uuidValidate } from "uuid";

import { ImageService } from 'mapbox-gl-esri-sources';
import { useEsriTimesteps } from '../../composables/useEsriTimesteps';
import { MoleculeType } from '../utils';


interface UseEsriLayer {
  esriImageSource: Ref<maplibregl.RasterTileSource | null>;
  opacity: Ref<number>;
  noEsriData: Ref<boolean>;
  loadingEsriTimeSteps: Ref<boolean>;
  esriTimesteps: Ref<number[]>;
  updateEsriOpacity: (value?: number | null | undefined) => void;
  updateEsriTimeRange: () => void;
  addEsriSource: (map: Map) => void;
  renderOptions: Ref<RenderingRuleOptions>;
}

export function useEsriLayer(initialMolecule: MaybeRef<MoleculeType>,
  timestamp: Ref<number | null>,
  opacity: MaybeRef<number>,
  fetchOnMount=true): UseEsriLayer {

  const esriLayerId = 'esri-source';
  const esriImageSource = ref<maplibregl.RasterTileSource | null>(null);
  const map = ref<Map | null>(null);
  const molecule = toRef(initialMolecule);

  const { url, variable, esriTimesteps } = useEsriTimesteps(molecule, fetchOnMount);

  const opacityRef = toRef(opacity);
  const noEsriData = ref(false);
  const loadingEsriTimeSteps = ref(false);
  const renderOptions = ref<RenderingRuleOptions>({
    range: stretches[variable.value],
    colormap: colorramps[variable.value],
  });

  
  const options = computed(() => {
    return  {
      'format': 'png',
      'pixelType': 'U8',
      'size': '256,256',
      'transparent': true,
      'bboxSR': 3857,
      'imageSR': 3857,
      'bbox': '{bbox-epsg-3857}',
      'interpolation': 'RSP_NearestNeighbor',
      'renderingRule': renderingRule(renderOptions.value.range, renderOptions.value.colormap),
    };
  });
  // const _esriImageOptions = Object.entries(options).map(([key, value]) => `${key}=${value}`).join('&');
  
  function addLayer(map: Map | null | undefined) {

    if (map && !map.getLayer(esriLayerId)) {
      map.addLayer({
        id: esriLayerId,
        type: 'raster',
        source: esriLayerId,
        paint: {
          'raster-resampling': 'nearest',
          'raster-opacity': opacityRef.value ?? 0.8,
        },
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
    // console.log('Source data event: ', e.sourceId, e.isSourceLoaded);
    if (e.sourceId === esriLayerId && e.isSourceLoaded && map.value?.getSource(esriLayerId)) {
      console.log('ESRI source loaded with time', new Date(timestamp.value ?? 0 ));
      esriImageSource.value = map.value?.getSource(esriLayerId) as maplibregl.RasterTileSource;
      updateEsriOpacity();
      updateEsriTimeRange();
      map.value?.off('sourcedata', onSourceLoad);
    }
  }
  
  function createImageService(map: Map, url: string, options) {
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
    
    dynamicMapService.value = createImageService(mMap, url.value, options.value);

    addLayer(mMap);
    // this event will run until the source is loaded
    mMap.on('sourcedata', onSourceLoad);
  }
  
  function hasEsriSource() {
    return map.value?.getSource(esriLayerId) !== undefined;
  }

  
  function updateEsriTimeRange() {
    if (!map.value) return;
    if (timestamp.value === null) return;
    const time = timestamp.value;

    const nearest = esriTimesteps.value.length > 0 
      ? esriTimesteps.value.reduce((a, b) => Math.abs(b - time) < Math.abs(a - time) ? b : a)
      : time - 1000 * 60 * 15; 
    noEsriData.value = Math.abs((nearest - time) / (1000 * 60)) > 60;
    // noEsriData.value = nearest > 1752595200000; // Example condition (July 15, 2025 12pm ET for testing)
    if (noEsriData.value) {
      console.error('No ESRI data available for the selected time');
    }

    if (dynamicMapService.value && !noEsriData.value) {
      dynamicMapService.value.setDate(new Date(nearest), new Date(nearest * 2));
    } else if (!noEsriData.value) {
      // if there is esri coverage, then this is the issue
      console.error('Dynamic Map Service is not initialized');
    }
  }

  watch(esriTimesteps, _timesteps => {
    nextTick(updateEsriTimeRange);
  });


  watch(timestamp, (_value) => {
    console.log('esri imageset timestamp set to ', _value ? new Date(_value) : null);
    if ( hasEsriSource() ) {
      updateEsriTimeRange();
    } else {
      console.error('ESRI source not yet available');
    }
  });
  
  
  function updateEsriOpacity(value: number | null | undefined = undefined) {
    if (map.value) {
      map.value.setPaintProperty(esriLayerId, 'raster-opacity', value ?? opacityRef.value ?? 0.8);
    }
  }

  watch(molecule, (_newMol: MoleculeType) => {
    dynamicMapService.value.esriServiceOptions.url = url.value;
    dynamicMapService.value.esriServiceOptions.renderingRule = renderingRule(renderOptions.value.range, renderOptions.value.colormap);
  });
  
  function updateStretch(vmin: number, vmax: number) {
    if (dynamicMapService.value) {
      dynamicMapService.value.esriServiceOptions.renderingRule = renderingRule([vmin, vmax], renderOptions.value.colormap);
    }
  }
  
  function updateColormap(colormap: ColorRamps) {
    if (dynamicMapService.value) {
      dynamicMapService.value.esriServiceOptions.renderingRule = renderingRule(renderOptions.value.range, colormap);
    }
  }
  
  watch(() => renderOptions.value.range, (newRange) => {
    console.log('Range changed to ', newRange);
    updateStretch(newRange[0], newRange[1]);
  });
  watch(() => renderOptions.value.colormap, (newColormap) => {
    console.log('Colormap changed to ', newColormap);
    updateColormap(newColormap);
  });
  
  watch(variable, () => {
    renderOptions.value.range = stretches[variable.value];
    renderOptions.value.colormap = colorramps[variable.value];
  });

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
    esriTimesteps,
    loadingEsriTimeSteps,
    updateEsriOpacity,
    updateEsriTimeRange,
    addEsriSource,
    renderOptions,
  } as UseEsriLayer;
}


