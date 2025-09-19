import { ref, type Ref } from "vue";
import { Map, Popup, type GeoJSONSource } from "maplibre-gl";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createHeatmapColorMap, previewColormapInConsole } from "@/colormaps/utils";



// const steps = Array.from({ length: 20 }, (_, i) => i / 19);
// console.log('Heatmap colors:', createHeatmapColorMap('svs', steps, 0.05));
// previewColormapInConsole('svs', steps, 0.05);


export function addPowerPlants(map: Ref<Map | null> | null) {
  const powerPlantsLayerId = "power-plants-layer";
  const powerPlantsHeatmapLayerId = "power-plants-heatmap";
  const powerPlantsSourceId = "power-plants-source";
  const powerPlantsVisible = ref(true);
  const loading = ref(false);
  let loadPromise: Promise<GeoJSON.FeatureCollection> | null = null;
  let usingHeatmap = false;

  function togglePowerPlants(vis?: boolean | undefined) {
    if (!map || !map.value) return;
    const layerIDs = [powerPlantsLayerId, powerPlantsHeatmapLayerId];
    layerIDs.forEach(id => {
      if (!map.value || !map.value!.getLayer(id)) return;
      
      if (vis !== undefined) {
        powerPlantsVisible.value = vis;
        map.value.setLayoutProperty(id, "visibility", vis ? "visible" : "none");
        return;
      }
      
      const visibility = map.value.getLayoutProperty(
        id,
        "visibility"
      );
      if (visibility === "visible") {
        map.value.setLayoutProperty(id, "visibility", "none");
        powerPlantsVisible.value = false;
      } else {
        map.value.setLayoutProperty(id, "visibility", "visible");
        powerPlantsVisible.value = true;
      }
    });
  }
  
  function isValidMap(map: Ref<Map | null> | null): map is Ref<Map> {
    return map !== null && map.value !== null;
  }

  // asynchronously load the heavy GeoJSON chunk and update the source when ready
  function ensureDataLoaded() {
    if (loadPromise) return loadPromise;
    loading.value = true;
    loadPromise = import("@/assets/power_plants")
      .then((mod) => mod.powerPlantsGeoJSON as GeoJSON.FeatureCollection)
      .then((data) => {
        if (isValidMap(map)) {
          const src = map.value.getSource(powerPlantsSourceId) as GeoJSONSource | undefined;
          if (src) src.setData(data);
        }
        return data;
      })
      .finally(() => {
        loading.value = false;
      });
    return loadPromise;
  }

  function addSource() {
    if (!isValidMap(map)) return;
    
    if (!map.value.getSource(powerPlantsSourceId)) {
      map.value.addSource(powerPlantsSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    // kick off loading in the background; do not await
    ensureDataLoaded();
  }

  function addLayer(op = {minzoom: 0}) {
    if (!isValidMap(map)) return;
    
    addSource();

    if (map.value.getLayer(powerPlantsLayerId)) {
      console.error("Power plants layer already exists.");
      return;
    }
    
    // Create a popup, but don't add it to the map yet.
    //https://maplibre.org/maplibre-gl-js/docs/examples/display-a-popup-on-hover/
    const popup = new Popup({
      closeButton: true,
      closeOnClick: false,
      className: 'powerplant-popup'
    });


    // add a point layer for power plants
    map.value.addLayer({
      id: powerPlantsLayerId,
      type: "circle",
      source: powerPlantsSourceId,
      minzoom: op.minzoom || 0,
      paint: {
        "circle-radius": 6,
        "circle-color": [
          "match",
          ["get", "PrimSource"],
          'coal', '#4B0082',
          'natural gas', '#FF8C00',
          'nuclear', '#FFD700',
          'hydro', '#1E90FF',
          'wind', '#00FF00',
          'solar', '#FFA500',
          /* other */ '#808080'
          
        ],
        "circle-opacity": 1,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff"
      },
    });
    ////
    
    let currentFeatureCoordinates = undefined;
    
    map.value.on('mouseenter', powerPlantsLayerId, () => {
      map.value.getCanvas().style.cursor = 'pointer';
    });
    
    map.value.on('click', powerPlantsLayerId, (e) => {
      if (!e.features || e.features.length === 0) {
        return;
      }
      // eslint-disable-next-line
      // @ts-ignore
      const featureCoordinates = e.features[0].geometry.coordinates.toString();
      if (currentFeatureCoordinates !== featureCoordinates) {
        currentFeatureCoordinates = featureCoordinates;

        // Change the cursor style as a UI indicator.
        map.value.getCanvas().style.cursor = 'pointer';
        
        // eslint-disable-next-line
        // @ts-ignore
        const coordinates = e.features[0].geometry.coordinates.slice();
        // Plant_Name, PrimSource, Total_MW
        const description = e.features[0].properties.Plant_Name + '<br/>' +
          'Primary Source: ' + e.features[0].properties.PrimSource + '<br/>' +
          'Installed MW: ' + e.features[0].properties.Install_MW;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        popup.setLngLat(coordinates).setHTML(description).addTo(map.value);
      }
    });

    map.value.on('mouseleave', powerPlantsLayerId, () => {
      currentFeatureCoordinates = undefined;
      map.value.getCanvas().style.cursor = '';
      popup.remove();
    });
    
    
    
    
    ////
  }

    
  function addheatmapLayer() {
    if (!isValidMap(map)) return;
    
    addSource();
    
    // get screen pixel ratio
    const pixelRatio = window.devicePixelRatio || 1;
    
    map.value.addLayer( {
      id: powerPlantsHeatmapLayerId,
      type: 'heatmap',
      source: powerPlantsSourceId,
      maxzoom: 5,
      paint: {
        "heatmap-radius": [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, // zoom = 0
          4 / pixelRatio, // radius = 1 @ zoom = 0
          9, // zoom = 9
          40 / pixelRatio // radius = 20 @ zoom = 9
        ],
        "heatmap-intensity": 1,
        "heatmap-weight": [
          'interpolate',
          ['linear'],
          ['get', 'Install_MW'],
          0, // 
          0, // density is 0 at 0 MW
          1000,
          1, // densitity = 1 @ 1 GW
        ],
        "heatmap-color": [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          // 0.0, 'rgb(0,0,0,0)',
          // 0.05, 'rgb(37,52,148)',
          // 0.1, 'rgb(37,52,148)',
          // 0.2, 'rgb(44,127,184)',
          // 0.4, 'rgb(65,182,196)',
          // 0.6, 'rgb(127,205,187)',
          // 0.8, 'rgb(199,233,180)',
          // 1.0, 'rgb(255,255,204)',
          // ...[
          //   0, "rgba(0,0,0,0)",
          //   0.1, "rgb(7,4,13)",
          //   0.125, "rgb(91,21,124)",
          //   0.25, "rgb(223,79,103)",
          //   0.375, "rgb(254,156,84)",
          //   0.5, "rgb(254,232,161)",
          //   0.625,"rgb(252,250,189)",
          //   0.75, "rgb(181,220,168)",
          //   0.875, "rgb(118,196,173)",
          //   1.0, "rgb(64,157,191)",
          // ]
          ...createHeatmapColorMap('viridis', [0.1, 0.2, 0.4, 0.6, 0.8, 1], 0.05) // aweful by default
        ],
        // only fade at the zoom limit
        "heatmap-opacity": [
          'interpolate',
          ['linear'],
          ['zoom'],
          4.9, // zoom = 4.9
          1, // opacity = 1 @ zoom = 4.9
          5, // zoom = 5
          0 // opacity = 0 @ zoom = 5
        ],
      }

    });
    
    addLayer({minzoom: 5}); // add the point layer on top of the heatmap
    
    usingHeatmap = true;
    
    map.value.on('idle', () => {
      if (!isValidMap(map)) return;
      if (usingHeatmap) {
        if (map.value.getLayer(powerPlantsLayerId) && map.value.getLayer(powerPlantsHeatmapLayerId)) {
          const heatmapVis = map.value.getLayoutProperty(powerPlantsHeatmapLayerId, 'visibility');
          map.value.setLayoutProperty(powerPlantsLayerId, 'visibility', heatmapVis);
          
        }
      }
      
    }); 
    
  }
  
  function removeLayer() {
    if (!map || !map.value) return;
    [powerPlantsLayerId, powerPlantsHeatmapLayerId].forEach(id => {
      if (!map || !map.value) return;
      
      if (map.value.getLayer(id)) {
        map.value.removeLayer(id);
      }

      if (map.value.getSource(id)) {
        map.value.removeSource(id);
      }
    });
  }

  return {
    addLayer,
    removeLayer,
    addheatmapLayer,
    togglePowerPlants,
    powerPlantsVisible,
    loading, // expose loading state
  };
}