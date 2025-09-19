import { ref, watch, computed, type WritableComputedRef, type Ref, onBeforeUnmount } from 'vue';
import M from 'maplibre-gl';
import { Popup } from 'maplibre-gl';
import { useKML } from './useKML';

// AQI styleUrl -> color mapping (hex), derived from the
// legend here https://gispub.epa.gov/airnow/?tab=archive
const AQI_STYLE_COLORS: Record<string, string> = {
  '#undefined': '#D9D9D9',
  '#normalstateundefined': '#D9D9D9',
  '#highlightstateundefined': '#D9D9D9',
  '#legendicon': '#D9D9D9',

  '#good': '#00E400',
  '#normalstategood': '#00E400',
  '#highlightstategood': '#00E400',

  '#moderate': '#FFFF00',
  '#normalstatemoderate': '#FFFF00',
  '#highlightstatemoderate': '#FFFF00',

  '#unhealthysg': '#FF7E00',
  '#normalstateunhealthysg': '#FF7E00',
  '#highlightstateunhealthysg': '#FF7E00',

  '#unhealthy': '#FF0000',
  '#normalstateunhealthy': '#FF0000',
  '#highlightstateunhealthy': '#FF0000',

  '#veryunhealthy': '#8F3F97',
  '#normalstateveryunhealthy': '#8F3F97',
  '#highlightstateveryunhealthy': '#8F3F97',

  '#hazardous': '#7E0023',
  '#normalstatehazardous': '#7E0023',
  '#highlightstatehazardous': '#7E0023'
};

// Normalize and resolve a styleUrl to an AQI color
function getAqiColorFromStyleUrl(styleUrlRaw: string | null | undefined): string {
  const key = (styleUrlRaw || '').trim();
  if (!key) return '#D9D9D9';
  // ensure hash prefix and lowercase for lookup
  const normalized = (key.startsWith('#') ? key : `#${key}`).toLowerCase();
  return AQI_STYLE_COLORS[normalized] || '#D9D9D9';
}

export type InternalMapLayerEventType = M.MapMouseEvent & {features?: M.MapGeoJSONFeature[];};
export type InternalMapLayerEventTypeHandler = (e: InternalMapLayerEventType) => void;

export interface AQILayer {
  addToMap: (map: M.Map) => Promise<void>
  removeFromMap: (map: M.Map) => void
  geoJsonData: Ref<GeoJSON.FeatureCollection | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  layerVisible: WritableComputedRef<boolean>
  toggleAQIVisibility: (vis?: boolean | undefined) => void
  setUrl: (newUrl: string) => Promise<void>
}

// Optional settings for labels
export interface UseKMLOptions {
  propertyToShow?: string | null;   // e.g., 'aqi'. If null/undefined, no labels are shown.
  labelMinZoom?: number;            // min zoom at which labels appear
  layerName?: string;               // custom id base for source/layers, e.g. 'aqi'
  showPopup?: boolean;            // whether to show popup on click/hover
  showLabel?: boolean;           // whether to show labels
  visible?: boolean;              // initial visibility state; defaults to true
}



export function addQUI(url: string, options: UseKMLOptions = {}): AQILayer {
  const { kmlUrl, geoJsonData, loading, error, setUrl: internalSetUrl, loadKML, cleanUp } = useKML(url);

  const propertyToShow = options.propertyToShow ?? null;
  const labelMinZoom = options.labelMinZoom ?? 8;
  const showPopup = options.showPopup ?? true;
  const showLabel = options.showLabel ?? true;

  // Store runtime state in refs (avoid caching on the function)
  const mapRef = ref<M.Map | null>(null);
  const idBase = options.layerName ? options.layerName : '';
  const sourceId = idBase ? `aqi-source-${idBase}` : 'aqi-source';
  const layerId = idBase ? `aqi-layer-${idBase}` : 'aqi-layer';
  const labelLayerId = layerId + '-label';

  const popupRef = ref<Popup | null>(null);
  const onEnterRef = ref<InternalMapLayerEventTypeHandler | null>(null);
  const onMoveRef = ref<InternalMapLayerEventTypeHandler | null>(null);
  const onLeaveRef = ref<InternalMapLayerEventTypeHandler | null>(null);
  const onStyleDataRef = ref<InternalMapLayerEventTypeHandler | null>(null);

  // Track the last known layer visibility across URL changes (persisted)
  const lastKnownVisible = ref<boolean>(options.visible ?? true); 

  // layerVisible reflects actual map state; falls back to lastKnownVisible if layer missing
  const layerVisible = computed<boolean>({
    get() {
      const map = mapRef.value;
      if (!map) {
        console.warn(`AQI: Tried to get ${layerId} but map is not set`);
        return lastKnownVisible.value;
      }
      if (!map.getLayer(layerId)) {
        console.warn(`AQI: Tried to get ${layerId} but layer is not present on map`);
        return lastKnownVisible.value;
      }
      
      const vis = map.getLayoutProperty(layerId, 'visibility');
      console.log(`AQI: Layer ${layerId} visibility is`, vis);
      return vis === 'visible';
    },
    set(val: boolean) {
      lastKnownVisible.value = val;
      const map = mapRef.value;
      if (!map) {
        console.warn(`AQI: Tried to get ${layerId} but map is not set`);
        return lastKnownVisible.value;
      }
      if (!map.getLayer(layerId)) {
        console.warn(`AQI: Tried to get ${layerId} but layer is not present on map`);
        return lastKnownVisible.value;
      }
      
      const vis = val ? 'visible' : 'none';
      map.setLayoutProperty(layerId, 'visibility', vis);
      if (map.getLayer(labelLayerId)) {
        map.setLayoutProperty(labelLayerId, 'visibility', vis);
      }
    }
  });

  

  // Post-process GeoJSON to apply styleUrl-based AQI coloring
  const postProcessGeoJson = (geoJson: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection => {
    const processedFeatures = geoJson.features.map((feature) => {
      const processedFeature = { ...feature };
      const props = processedFeature.properties || {};
      const styleUrl = props.styleUrl ?? props.styleURL ?? null;
      const color = getAqiColorFromStyleUrl(styleUrl);
      processedFeature.properties = {
        ...props,
        'marker-color': color
      };
      return processedFeature;
    });

    return {
      ...geoJson,
      features: processedFeatures
    };
  };

  
  function setupLayerPopup(propertyToShow: string, map: M.Map, layerId: string) {
    const popup = new Popup({ closeButton: false, closeOnClick: false, maxWidth: '200px' });
    const valueProp = propertyToShow || 'aqi';
    const onEnter = (e: InternalMapLayerEventType) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features && e.features[0];
      const val = f?.properties?.[valueProp];
      if (val !== undefined && val !== null && `${val}` !== '') {
        const desc = `<div style="font:12px sans-serif;color:#000">AQI: ${val}</div>`;
        popup
          .setLngLat(e.lngLat)
          .setHTML(desc)
          .addTo(map);
      }
    };
    const onMove = (e: InternalMapLayerEventType) => {
      popup.setLngLat(e.lngLat);
      const f = e.features && e.features[0];
      const val = f?.properties?.[valueProp];
      if (val !== undefined && val !== null && `${val}` !== '') {
        const desc = `<div style="font:12px sans-serif;color:#000">AQI: ${val}</div>`;
        popup.setHTML(desc);
      }
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    };
    
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('click', layerId, onEnter);
    map.on('mousemove', layerId, onMove);
    map.on('mouseleave', layerId, onLeave);

    // Store state in refs (not on function)
    popupRef.value = popup;
    onEnterRef.value = onEnter;
    onMoveRef.value = onMove;
    onLeaveRef.value = onLeave;
  }

  function setupVisibilitySync(map: M.Map) {
    // Keep label visibility equal to main layer & sync external visibility changes
    const syncLabelVisibility = () => {
      if (!map.getLayer(layerId)) return;
      const mainVis = (map.getLayoutProperty(layerId, 'visibility') as string) || 'visible';
      const isVisible = mainVis === 'visible';
      if (lastKnownVisible.value !== isVisible) {
        lastKnownVisible.value = isVisible;
      }
      if (map.getLayer(labelLayerId)) {
        const labelVis = (map.getLayoutProperty(labelLayerId, 'visibility') as string) || 'visible';
        if (labelVis !== mainVis) {
          map.setLayoutProperty(labelLayerId, 'visibility', mainVis);
        }
      }
    };
    
    syncLabelVisibility();
    // idle takes a bit longer than styledata, and the user can tell
    // but idle would be less frequent i think
    map.on('styledata', syncLabelVisibility); 
    onStyleDataRef.value = syncLabelVisibility;
  }


  // Add GeoJSON to map
  const addToMap = async (map: M.Map): Promise<void> => {
    // Always store map first so subsequent retries have a reference
    mapRef.value = map;
    
    // Load KML if not already loaded
    if (!geoJsonData.value) {
      // console.log('AQI: No GeoJSON data, loading KML from URL:', kmlUrl.value);
      await loadKML();
    }
    if (!geoJsonData.value) {
      throw new Error('No GeoJSON data available');
    }

    // Remove existing layer and source if they exist
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (labelLayerId && map.getLayer(labelLayerId)) {
      map.removeLayer(labelLayerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    // Add new source and layer
    map.addSource(sourceId, {
      type: 'geojson',
      data: postProcessGeoJson(geoJsonData.value)
    });

    // Add point layer colored by 'marker-color'
    map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      layout: {
        visibility: lastKnownVisible.value ? 'visible' : 'none'
      },
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          0, 1,
          5, 8,
          20, 12
        ],
        'circle-color': [
          'case',
          ['has', 'marker-color'],
          ['get', 'marker-color'],
          '#808080'
        ],
        'circle-stroke-color': '#444444',
        'circle-stroke-width': 1,
        'circle-opacity': 0.8
      },
      filter: ['==', '$type', 'Point']
    });

    // Conditionally add text labels
    if (propertyToShow && showLabel) {
      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        minzoom: labelMinZoom,
        layout: {
          'text-field': ['coalesce', ['to-string', ['get', propertyToShow]], ''],
          'text-size': 10,
          'text-offset': [0, 0],
          'visibility': lastKnownVisible.value ? 'visible' : 'none'
        },
        paint: {
          'text-color': '#1a1a1a',
          'text-opacity': 1, // needs to be set so we can detect if we change it
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        },
        filter: ['==', '$type', 'Point']
      });

      
      // Add popup/handlers if it hasn't been added yet
      if (showPopup && popupRef.value === null) {
        setupLayerPopup(propertyToShow, map, layerId);
      }
    }
    // Even without labels still sync visibility (for external toggles)
    if (onStyleDataRef.value === null) {
      setupVisibilitySync(map);

    }

    // Apply last known visibility after layers are added
    // const vis = lastKnownVisible.value ? 'visible' : 'none';
    // map.setLayoutProperty(layerId, 'visibility', vis);
    // if (map.getLayer(labelLayerId)) {
    //   map.setLayoutProperty(labelLayerId, 'visibility', vis);
    // }

    console.log('AQI: Successfully added KML layer to map');
      
    
  };
  
  
  // Optional: debug logging
  // watch(layerVisible, (newVis) => {
  //   console.log('AQI layer visibility changed to:', newVis);
  // });

  // Toggle visibility for main and label layers using the computed setter
  const toggleAQIVisibility = (val?: boolean | undefined): void => {
    const next = val ?? !layerVisible.value;
    layerVisible.value = next;
  };

  // Change URL and refresh layer
  const setUrl = async (newUrl: string): Promise<void> => {
    console.log('AQI: Setting new KML URL:', newUrl);
    internalSetUrl(newUrl) // will automatically load new and abort prior
      .then(() => {
        const map = mapRef.value;

        if (map) {
          addToMap(map as never);
        }
      }).catch((err) => {
        console.error('AQI: Error setting new KML URL:', err);
      });
  };

  // Watch for URL changes to auto-reload (will be idempotent due to early return)
  watch(kmlUrl, (newUrl) => {
    setUrl(newUrl).catch(err => {
      console.error('AQI: Error reloading KML after URL change:', err);
    });
  });

  // Remove from map
  const removeFromMap = (map: M.Map): void => {
    cleanUp();
    
    // Remove hover handlers and popup
    if (onEnterRef.value) map.off('click', layerId, onEnterRef.value);
    if (onMoveRef.value) map.off('mousemove', layerId, onMoveRef.value);
    if (onLeaveRef.value) map.off('mouseleave', layerId, onLeaveRef.value);
    if (popupRef.value) popupRef.value.remove();
    if (onStyleDataRef.value) map.off('styledata', onStyleDataRef.value);
    // if (onStyleDataRef.value) map.off('idle', onStyleDataRef.value); 

    // Remove layers and source
    if (map.getLayer(labelLayerId)) {
      map.removeLayer(labelLayerId);
    }
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    // Clear stored handlers/popup; keep mapRef so we can re-add later
    popupRef.value = null;
    onEnterRef.value = null;
    onMoveRef.value = null;
    onLeaveRef.value = null;
  };
  
  onBeforeUnmount(() => {
    const map = mapRef.value;
    if (map) {
      removeFromMap(map as never);
      mapRef.value = null;
    }
  });
  
  return {
    addToMap,
    removeFromMap,
    geoJsonData,
    loading,
    error,
    layerVisible,
    toggleAQIVisibility,
    setUrl
  };
}
