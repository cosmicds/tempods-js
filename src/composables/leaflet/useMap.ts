import { Ref, ref, onMounted, onUnmounted, watch } from 'vue';
import L, { Map } from 'leaflet';
import { InitMapOptions, LatLngPair } from '@/types';

export interface LeafletComposable {
    map: Ref<L.Map | null>;
    createMap: () => Ref<L.Map>;
    setView: (latlng: LatLngPair, zoom: number) => void;
    resetView: () => void;
    cleanupMap: () => void;
    getCenter: () => L.LatLng;
  }
  
function tryTileLayerPromise(
  stamenUrl: string,
  stamenLayerUrl: string,
  stamenOptions: L.TileLayerOptions,
  cartoTestUrl: string,
  cartoLayerUrl: string,
  cartoOptions: L.TileLayerOptions,
  mapRef: L.Map
): Promise<L.TileLayer | null> {
 
  return fetch(stamenUrl)
    .then(stamenResp => {
      if (stamenResp.ok) {
        return L.tileLayer(stamenLayerUrl, stamenOptions).addTo(mapRef as L.Map);
      }
      throw new Error('Stamen not available');
    })
    .catch(e => {
      console.error(e);
      return fetch(cartoTestUrl)
        .then(cartoResp => {
          if (cartoResp.ok) {
            return L.tileLayer(cartoLayerUrl, cartoOptions).addTo(mapRef as L.Map);
          }
          throw new Error('Carto not available');
        })
        .catch(e2 => {
          console.error(e2);
          return null;
        });
    });
}

export function useMap(id="map", options: InitMapOptions, showRoads: Ref<boolean>, onReady?: (map: L.Map) => void): LeafletComposable {
  
  // this is where our map will be
  const map = ref<L.Map | null>(null);
  const basemap = ref<L.TileLayer.WMS | null | L.TileLayer>(null);
  const labelmap = ref<L.TileLayer.WMS | null | L.TileLayer>(null);
  
  async function addCoastlines() {
    fetch("coastlines.geojson")
      .then(response => response.json())
      .then(data => {
        L.geoJson(data, {
          style: { color: "black", weight: 1, opacity: 0.8 }
        }).addTo(map.value as L.Map);
      });
  }
  
  function setupMap() {
    if (map.value === null) return;
    
    // we need a pane that will be at a high z-index
    const labelPane = map.value.createPane("labels");
    labelPane.style.zIndex = "650";
    labelPane.style.pointerEvents = "none";
    
    const markerPane = map.value.createPane("markers");
    markerPane.style.zIndex = "800";
    markerPane.style.pointerEvents = "none";
    
    // add Stadia Toner lines only w/ fallback to CartoDB if not available
    tryTileLayerPromise(
      'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/1/1/1.png',
      'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}{r}.png',
      {
        minZoom: 0,
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        pane: 'labels'
      },
      'https://a.basemaps.cartocdn.com/light_nolabels/1/1/1.png',
      'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      {
        attribution: 'OpenStreetMap, CartoDB',
        pane: 'labels'
      },
      map.value as L.Map // save to coerce because we have a gaurd at top
    ).then(layer => {
      basemap.value = layer;
    });
  
    
    // add Stadia Toner labels only w/ fallback to CartoDB if not available
    tryTileLayerPromise(
      'https://tiles.stadiamaps.com/tiles/stamen_toner_lines/1/1/1.png',
      'https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}{r}.png',
      {
        minZoom: 0,
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        pane: 'labels'
      },
      'https://a.basemaps.cartocdn.com/light_only_labels/1/1/1.png',
      'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
      {
        attribution: 'OpenStreetMap, CartoDB',
        pane: 'labels'
      },
      map.value as L.Map // save to coerce because we have a gaurd at top
    ).then(layer => {
      labelmap.value = layer;
    });
    
    
    toggleRoads(); // initial call to set the correct state
    
    addCoastlines();
    if (onReady !== undefined) {
      onReady(map.value as L.Map);
    }
  }

  function cleanupMap() {
    if (map.value) {
      map.value.off();
      map.value.remove();
      map.value = null;
    }
  }
  
  function createMap(): Ref<L.Map> {
    map.value = L.map(id, { zoomControl: false });
    map.value.setView(options.loc as L.LatLngTuple, options.zoom);
    
    map.value.whenReady(setupMap);
    return map as Ref<L.Map>;
  }

  function setView(latlng:LatLngPair, zoom: number) {
    if (map.value) {
      map.value.setView(latlng, zoom);
    }
  }
  
  function getCenter() {
    if (map.value) {
      return map.value.getCenter();
    }
  }
  
  function resetView() {
    if (map.value) {
      map.value.setView(options.loc, options.zoom);
    }
  }
  
  // use showRoads to show/hide the labels pane
  function toggleRoads() {
    // set opacity of labelPane
    if (map.value) {
      const _labelPane = map.value.createPane("labels");
      if (basemap.value && labelmap.value) {
        basemap.value.setOpacity(showRoads.value ? 1 : 0);
      }
    }
  }

  watch(showRoads, () => {
    toggleRoads();
  }, { immediate: true });
  
  onMounted(() => {
    
  });

  onUnmounted(() => {
    cleanupMap();
  });

  return {
    map,
    createMap,
    setView,
    resetView,
    cleanupMap,
    getCenter,
  } as LeafletComposable;
}