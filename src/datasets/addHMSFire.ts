/* eslint-disable @typescript-eslint/no-unused-vars */
import { ref, shallowRef, watch, computed, type Ref, type ComputedRef, onBeforeUnmount } from 'vue';
import M from 'maplibre-gl';
import { Popup } from 'maplibre-gl';
import type { SymbolLayerSpecification, CircleLayerSpecification, LayerSpecification, DistributiveOmit, DataDrivenPropertyValueSpecification } from 'maplibre-gl';
import { useKML } from '@/composables/useKML';
import { useGeoJsonLayer } from '@/composables/useGeoJsonLayer';
import { syncLayerOpacity, syncLayerVisibility } from '@/composables/useSyncedVisibilityAndOpacity';
import { fireStatus } from '@/datasets/layerStatus';
import type { LayerStatus } from '@/types';

/**
 * We select only VIIRS data from SUOMI and NOAA - 375 m resolution
 * The GOES data product is considered provisionally on FIRMS https://firms.modaps.eosdis.nasa.gov/
 * GOES is 2km resolution
 * 
 */


export type InternalMapLayerEventType = M.MapMouseEvent & {features?: M.MapGeoJSONFeature[];};
export type InternalMapLayerEventTypeHandler = (e: InternalMapLayerEventType) => void;

export const replaceYearDay = (s: string | null): string | null => {
  if (!s) return null;
  const m = s.match(/(YearDay: )(\d{7})/);
  if (!m) return null;
  const [, prefix, ydd] = m;
  const y = parseInt(ydd.substring(0, 4));
  const d = parseInt(ydd.substring(4));
  const dateStr = new Date(y, 0, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return s.replace(m[0], prefix + dateStr);
};

import { glccLabel } from '../utils/glcc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSciExpression(valueExpr: any, precision = 1): any {
  const pow10 = Math.pow(10, precision);

  const exponent = ['floor', ['log10', ['abs', valueExpr]]];
  const scale = ['^', 10, ['var', 'exp']];
  const mantissaRaw = ['/', valueExpr, scale];
  const mantissaRounded = ['/', ['round', ['*', mantissaRaw, pow10]], pow10];

  return [
    'let',
    'exp', exponent,
    ['concat', ['to-string', mantissaRounded], 'e', ['to-string', ['var', 'exp']]]
  ];
}

function circleRadiusExpression(meters: number, stops = [0, 5, 10, 15, 20]): M.DataDrivenPropertyValueSpecification<number> {
  return [
    "interpolate", ["linear"], ["zoom"],
    ...stops.flatMap(z => [
      z,
      [
        "/",
        ["*", meters, Math.pow(2, z)],
        ["*", 156543.03392, ["cos", ["/", ["*", Math.PI, ["get", "Lat"]], 180]]]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any
    ])
  ];
}

export const replaceEcosystem = (s: string | null): string | null => {
  if (!s) return null;
  const m = s.match(/(Ecosystem: )(\d+)/);
  if (!m) return s;
  const [, prefix, numStr] = m;
  const label = glccLabel(parseInt(numStr));
  
  return s.replace(m[0], prefix + label);
};


export interface HMSLayer {
  addToMap: (map: M.Map) => Promise<void>
  removeFromMap: (map: M.Map) => void
  geoJsonData: Ref<GeoJSON.FeatureCollection | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  status: ComputedRef<LayerStatus>
  toggleHMSVisibility: (vis?: boolean | undefined) => void
  setUrl: (newUrl: string) => Promise<void>
  retry: () => Promise<void>
}

// Optional settings for labels
export interface UseKMLOptions {
  labelMinZoom?: number;            // min zoom at which labels appear
  layerName: string;               // custom id base for source/layers, e.g. 'fire'
  showPopup?: boolean;            // whether to show popup on click/hover
  showLabel?: boolean;           // whether to show labels
  showClusters?: boolean;       // whether to cluster nearby points into circles; defaults to true
  showCircles?: boolean;       // whether to show the per-point FRP circle layer; defaults to false
  visible?: boolean;              // initial visibility state; defaults to true
  showIcons?: boolean; // show icons
}

// description
function description2props(desc: string | null): Record<string, string | number> {
  const props: Record<string, string | number> = {};
  if (!desc) return props;
  const vals = desc.split('<br>');
  vals.reduce((acc, pair) => {
    const [key, value] = pair.split(':').map(s => s.trim());
    if (key && value) {
      const v = parseFloat(value);
      acc[key] = isNaN(v) ? value : v;
    }
    return acc;
  }, props);
  return props;
}

type HmsSats = 'GOES-EAST' | 'GOES-WEST' | 'SUOMI NPP' | 'NOAA 20' | 'NOAA 21';
type HmsMethods = 'VIIRS' | 'NGFS';

// 'circle-color': [ // color scheme for satellites
//   'match', ['get', 'Satellite'],
//   'GOES-EAST',  '#E07020',
//   'GOES-WEST',  '#2060E0',
//   'SUOMI NPP',  '#20A040',
//   'NOAA 20',    '#9040C0',
//   'NOAA 21',    '#C04080',
//   '#888888'
// ],

// Post-process GeoJSON to apply styleUrl-based HMS coloring
const postProcessGeoJson = (geoJson: GeoJSON.FeatureCollection, yd: number): GeoJSON.FeatureCollection => {
  const processedFeatures: GeoJSON.Feature[] = [];
  geoJson.features.forEach((feature) => {
    const processedFeature = { ...feature };
    const props = processedFeature.properties || {};
    // const styleUrl = props.styleUrl ?? props.styleURL ?? null;
    processedFeature.properties = {
      ...props,
      ...props.description ? description2props(props.description as string) : {},
    };
    // FRP comes off of the description
    if (
      processedFeature.properties.FRP !== undefined &&
      processedFeature.properties.FRP > 1  && // prevents negative radii on the images. 
      processedFeature.properties.YearDay > yd - 1 &&
      processedFeature.properties.Method !== 'NGFS' // only keep viirs
      // (processedFeature.properties.Satellite as string).slice(0,4) !== 'GOES'
    ) {
      processedFeatures.push(processedFeature);
    }
    return processedFeature;
  });
  
  console.log(`HMS found ${processedFeatures.length} fires`);
  return {
    ...geoJson,
    features: processedFeatures,
  };
};


export function addHMSFire(date: Ref<Date>, options: UseKMLOptions = {layerName: 'hms-layer'}) {

  const url = computed(() => {
    const _date = date.value;
    if (!_date) {
      return 'https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Fire_Points/KML/2025/09/hms_fire20250914.kml';
    }
    const year = _date.getUTCFullYear();
    const month = (_date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = _date.getUTCDate().toString().padStart(2, '0');
    return `https://worldwidetelescope.org/webserviceproxy.aspx?targeturl=https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Fire_Points/KML/${year}/${month}/hms_fire${year}${month}${day}.kml`;
  });
  
  const { geoJsonData, loading, error, setUrl: internalSetUrl, loadKML, cleanUp } = useKML(url.value);
  
  watch(url, (newUrl) => {
    setUrl(newUrl).catch(() => {/* ignore */});
  });
  
  function getYearDay(date: Date): number {
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(date.getFullYear() * 1000 + dayOfYear);
  }
  
  const yearDay = computed(() => {
    const _date = date.value;
    if (!_date) {
      return 2025001; // Jan 1, 2025
    }
    return getYearDay(_date);
  });

  const showPopup = options.showPopup ?? true;
  const showClusters = options.showClusters ?? true;
  const showCircles = options.showCircles ?? false;
  const showIcons = options.showIcons ?? true;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const TRANSITION_ZOOM = 8.5;

  // Store runtime state in refs (avoid caching on the function)
  const mapRef = shallowRef<M.Map | null>(null);
  const idBase = options.layerName ? options.layerName : '';
  const sourceId = `${idBase}-source`;
  const layerId = idBase;
  const labelLayerId = layerId + '-label';
  const cicleLayerId = layerId + '-circle';
  const clusterLayerId = layerId + '-clustered';

  const popupRef = ref<Popup | null>(null);
  const onEnterRef = ref<InternalMapLayerEventTypeHandler | null>(null);
  const onMoveRef = ref<InternalMapLayerEventTypeHandler | null>(null);
  const onLeaveRef = ref<InternalMapLayerEventTypeHandler | null>(null);
  const onStyleDataRef = ref<InternalMapLayerEventTypeHandler | null>(null);

  const clusterPopupRef = ref<Popup | null>(null);
  const clusterOnMoveRef = ref<InternalMapLayerEventTypeHandler | null>(null);
  const clusterOnLeaveRef = ref<((e: M.MapMouseEvent) => void) | null>(null);

  // Track the last known layer visibility across URL changes (persisted)
  const lastKnownVisible = ref<boolean>(options.visible ?? true); 

  
  function preloadImages(map: M.Map) {
    const url = "./FireIcon.png";
    const name = 'hms-fire-icon';
    
    if (map.hasImage(name)) {
      return;
    }
    return map.loadImage(url)
      .then((img) => {
        if (map.hasImage(name)) {
          return;
        }
        map.addImage(name, img.data);
      });
  }

  
  function setupLayerPopup(map: M.Map, layerId: string) {
    const popup = new Popup({ closeButton: false, closeOnClick: false, maxWidth: '200px', className: 'hms-popup' });
    const onEnter = (e: InternalMapLayerEventType) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features && e.features[0];
      if (f?.properties?.description) {
        const desc = f?.properties?.description ; 
        popup
          .setLngLat(e.lngLat)
          .setHTML(replaceEcosystem(replaceYearDay(desc)) || '')
          .addTo(map)
          .addClassName('hms-popup');
      }
    };
    const onMove = (e: InternalMapLayerEventType) => {
      popup.setLngLat(e.lngLat);
      const f = e.features && e.features[0];
      if (f?.properties?.description) {
        popup.setHTML(replaceEcosystem(replaceYearDay(f?.properties?.description)) || '');
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

  function setupClusterPopup(map: M.Map) {
    const popup = new Popup({ closeButton: false, closeOnClick: false, maxWidth: '220px', className: 'hms-popup' });

    const onMove = (e: InternalMapLayerEventType) => {
      const f = e.features && e.features[0];
      if (!f) return;
      const count: number = f.properties?.point_count ?? 0;
      const frp: number = f.properties?.totalFRP ?? 0;
      map.getCanvas().style.cursor = 'pointer';
      popup
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font:12px sans-serif;color:#000">
          # of Fires: ${count.toLocaleString()}
          <br>Total FRP: ${frp.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW
          <br>Avg. FRP: ${(count > 0 ? frp/count : frp).toLocaleString(undefined, { maximumFractionDigits: 0 })} MW
          </div>`)
        .addTo(map);
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    };

    map.on('mousemove', clusterLayerId, onMove);
    map.on('mouseleave', clusterLayerId, onLeave);

    clusterPopupRef.value = popup;
    clusterOnMoveRef.value = onMove;
    clusterOnLeaveRef.value = onLeave;
  }

  function syncLastKnownVisible(map: M.Map) {
    const syncLabelVisibility = () => {
      if (!map.getLayer(layerId)) return;
      const mainVis = (map.getLayoutProperty(layerId, 'visibility') as string) || 'visible';
      const isVisible = mainVis === 'visible';
      if (lastKnownVisible.value !== isVisible) {
        lastKnownVisible.value = isVisible;
      }
      // get rid of the label sync, doing that through syncLayerVisibility below
      
      // load this if we are just becoming visible
      if (isVisible && !geoJsonData.value && !loading.value) {
        loadKML().catch(err => console.error('HMS: Error loading KML on visibility change:', err));
      }
    };
    
    syncLabelVisibility();
    // idle takes a bit longer than styledata, and the user can tell
    // but idle would be less frequent i think
    map.on('styledata', syncLabelVisibility);
    onStyleDataRef.value = syncLabelVisibility;
  }
  
  const processedData = computed<GeoJSON.FeatureCollection | null>(() => {
    if (!geoJsonData.value) return null;
    console.time('HMS: postProcessGeoJson');
    const p = postProcessGeoJson(geoJsonData.value, yearDay.value);
    console.timeEnd('HMS: postProcessGeoJson');
    return p;
  });
  

  // const clusterLayer: Omit<CircleLayerSpecification,'source'> = {
  //   id: clusterLayerId,
  //   type: 'circle',
  //   filter: ['has', 'point_count'],
  //   layout: {
  //     'visibility': lastKnownVisible.value ? 'visible' : 'none'
  //   },
  //   paint: {
  //     'circle-radius': ['*', 4.5,  ['log10', ["get", "totalFRP"]]],
  //     'circle-color': [
  //       "interpolate", 
  //       ["linear"], 
  //       ['log10', ["get", "totalFRP"]],
  //       0, "rgb(255, 255, 204)",       // pale yellow
  //       1, "rgb(255, 237, 160)",
  //       2.5, "rgb(254, 178, 76)",
  //       5, "rgb(240, 59, 32)",
  //       6, "rgb(189, 0, 38)",
  //       7, "rgb(128, 0, 38)",           // dark red
  //       8, "rgb(77, 0, 75)"            // very da       // very dark red
  //     ],
  //   }
  // };
  
  // instead of the circles above, we will stick with out icons
  const clusterLayer: Omit<SymbolLayerSpecification, 'source'> = {
    id: clusterLayerId,
    type: 'symbol',
    filter: ['has', 'point_count'],
    layout: {
      'icon-image': 'hms-fire-icon',
      'icon-size': ['*', .03, ['log10', ['get', 'totalFRP']]],
      'icon-allow-overlap': true,
      'visibility': lastKnownVisible.value ? 'visible' : 'none'
    },
    paint: { 'icon-opacity': 1 }
  };

  const symbolLayer: Omit<SymbolLayerSpecification, 'source'> = {
    id: layerId,
    type: 'symbol',
    paint: { 'icon-opacity': 1 },
    layout: {
      'icon-image': 'hms-fire-icon',
      'icon-size': [
        "*", 
        .025, 
        ['abs',['log10', [
          '*', 10,
          ['number', ['get', 'FRP']]
        ]
        ]]
      ],
      'icon-allow-overlap': true,
      'visibility': lastKnownVisible.value ? 'visible' : 'none'
    },
    filter: ['all',
      ['!', ['has', 'point_count']]
    ]
  };

  const hmsCircleLayer: Omit<CircleLayerSpecification, 'source'> = {
    id: cicleLayerId,
    type: 'circle',
    // paint with a pale yellow to dark red scale based on FRP
    layout: {
      'visibility': lastKnownVisible.value ? 'visible' : 'none'
    },
    paint: {
      // 375 meter radius using zoom, 'Lat', and 'Lon'
      'circle-radius': circleRadiusExpression(375/2),
      'circle-color': [
        "interpolate", 
        ["linear"], ["get", "FRP"],
        0, "rgb(255, 255, 204)", 
        1, "rgb(255, 237, 160)", 
        10, "rgb(254, 178, 76)",
        50, "rgb(240, 59, 32)", 
        150, "rgb(189, 0, 38)", 
        350, "rgb(128, 0, 38)", 
        1000, "rgb(77, 0, 75)"
      ],
      'circle-opacity': 0.5,
      'circle-stroke-color': 'black',
      // 'circle-stroke-width': 0.5,
      // 'circle-stroke-opacity': 0.8
    },
    filter: ['all',
      ['!', ['has', 'point_count']]
    ]
  };

  const layersToShow: DistributiveOmit<LayerSpecification,'source'>[] = [symbolLayer];
  if (showCircles) {
    layersToShow.push(hmsCircleLayer);
  }
  if (showClusters) {
    layersToShow.push(clusterLayer);
  }
  const geoLayer = useGeoJsonLayer(
    idBase || 'hms-fire',
    processedData,
    {
      layerOptions: layersToShow,
      sourceSpec: {
        cluster: showClusters,
        clusterMaxZoom: TRANSITION_ZOOM,
        clusterRadius: 15,
        clusterProperties: {
          'totalFRP': ['+', ['get','FRP']],
        },
      },
      sourceId,
    }
  );

  // Add GeoJSON to map
  const addToMap = async (map: M.Map): Promise<void> => {
    mapRef.value = map;

    // Mount source + layers immediately; data populates reactively once KML loads.
    geoLayer.addToMap(map);

    preloadImages(map);

    const vis = lastKnownVisible.value ? 'visible' : 'none';
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', vis);
    if (map.getLayer(cicleLayerId)) map.setLayoutProperty(cicleLayerId, 'visibility', vis);
    if (map.getLayer(clusterLayerId)) map.setLayoutProperty(clusterLayerId, 'visibility', vis);


    if (showPopup && popupRef.value === null) {
      setupLayerPopup(map, layerId);
    }
    if (showClusters && clusterPopupRef.value === null) {
      setupClusterPopup(map);
    }
    if (onStyleDataRef.value === null) {
      syncLastKnownVisible(map);
    }

    if (lastKnownVisible.value && !geoJsonData.value) {
      await loadKML();
    }

    syncLayerOpacity(map, layerId, cicleLayerId, clusterLayerId, labelLayerId);
    syncLayerVisibility(map, layerId, cicleLayerId, clusterLayerId, labelLayerId);
    
  };


  // Change URL and refresh layer
  const setUrl = async (newUrl: string): Promise<void> => {

    internalSetUrl(newUrl)
      .then(() => {
        if (lastKnownVisible.value) {
          loadKML();
        }
      })
      .catch((err) => {
        console.error('HMS: Error setting new KML URL:', err);
      });
  };

  // Force a fresh request (e.g. "try again" after an error): clear the loaded-URL
  // guard, wait a beat, then reload the same URL.
  const retry = async (): Promise<void> => {
    await internalSetUrl(url.value);
    await new Promise(resolve => setTimeout(resolve, 500));
    await loadKML();
  };

  // Remove from map
  const removeFromMap = (map: M.Map): void => {
    cleanUp();

    // Remove hover handlers and popup
    if (onEnterRef.value) map.off('click', layerId, onEnterRef.value);
    if (onMoveRef.value) map.off('mousemove', layerId, onMoveRef.value);
    if (onLeaveRef.value) map.off('mouseleave', layerId, onLeaveRef.value);
    if (popupRef.value) popupRef.value.remove();
    if (onStyleDataRef.value) map.off('styledata', onStyleDataRef.value);

    if (clusterOnMoveRef.value) map.off('mousemove', clusterLayerId, clusterOnMoveRef.value);
    if (clusterOnLeaveRef.value) map.off('mouseleave', clusterLayerId, clusterOnLeaveRef.value);
    if (clusterPopupRef.value) clusterPopupRef.value.remove();

    // Remove layers and source (keeps layer config so a later addToMap re-adds them)
    geoLayer.cleanup();

    // Clear stored handlers/popup; keep mapRef so we can re-add later
    popupRef.value = null;
    onEnterRef.value = null;
    onMoveRef.value = null;
    onLeaveRef.value = null;
    clusterPopupRef.value = null;
    clusterOnMoveRef.value = null;
    clusterOnLeaveRef.value = null;
  };
  
  onBeforeUnmount(() => {
    const map = mapRef.value;
    if (map) {
      removeFromMap(map as never);
      mapRef.value = null;
    }
  });
  
  watch(loading, (newLoading) => {
    console.log(`HMS: loading state changed to ${newLoading}`);
  });

  const status = computed<LayerStatus>(() => fireStatus(loading.value, error.value));

  return {
    addToMap,
    layerId,
    removeFromMap,
    geoJsonData,
    loading,
    error,
    status,
    setUrl,
    retry
  };
}
