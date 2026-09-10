import { ref, type Ref } from "vue";
import { Map, Popup } from "maplibre-gl";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createHeatmapColorMap, previewColormapInConsole } from "@/colormaps/utils";
import { PrimSource } from "@/assets/power_plants";
import { useGeoJsonLayer } from "@/composables/useGeoJsonLayer";



// const steps = Array.from({ length: 20 }, (_, i) => i / 19);
// console.log('Heatmap colors:', createHeatmapColorMap('svs', steps, 0.05));
// previewColormapInConsole('svs', steps, 0.05);

export const POWER_PLANT_COLORS: Record<PrimSource, string> = {
  batteries: "#00FF00",
  biomass: "#654321",
  coal: "#36454F",
  geothermal: "#FF0000",
  hydroelectric: "#00008B",
  "natural gas": "#C4A484",
  nuclear: "#5D3FD3",
  other: "#FAF9F6",
  petroleum: "#D3D3D3",
  "pumped storage": "#00FFFF",
  solar: "#FFFF00",
  wind: "#ADD8E6",
} as const;


export function addPowerPlants(map: Ref<Map | null> | null, startVisible = true) {
  const powerPlantsLayerId = "power-plants-layer";
  const powerPlantsHeatmapLayerId = "power-plants-heatmap";
  const powerPlantsVisible = ref(startVisible);
  const loading = ref(false);
  let loadPromise: Promise<GeoJSON.FeatureCollection> | null = null;
  // let usingHeatmap = false;
  
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
  // asynchronously load the heavy GeoJSON chunk and update both sources when ready
  function ensureDataLoaded() {
    if (loadPromise) return loadPromise;
    loading.value = true;
    loadPromise = import("@/assets/power_plants")
      .then((mod) => mod.powerPlantsGeoJSON as GeoJSON.FeatureCollection)
      .then((data) => {
        circleLayer.setData(data);
        heatmapLayer.setData(data);
        return data;
      })
      .finally(() => {
        loading.value = false;
      });
    return loadPromise;
  }


  const circleLayer = useGeoJsonLayer("power-plants", null, {
    sourceId: "power-plants-source",
    layerOptions: {
      id: powerPlantsLayerId,
      type: "circle",
      minzoom: 0,
      layout: {
        visibility: powerPlantsVisible.value ? "visible" : "none",
      },
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["sqrt", ["get", "Total_MW"]],

          // These two points define a linear interpolation
          // so if Install_MW is 0, the radius is 0
          // and if sqrt(Install_MW) is 55, the radius is 10
          0, 1,
          55, 10,
        ],
        "circle-color": [
          "match",
          ["get", "PrimSource"],

          // Traditional Sources (Black, Gray, Brown)
          'coal',          POWER_PLANT_COLORS.coal,
          'petroleum',     POWER_PLANT_COLORS.petroleum,
          'natural gas',   POWER_PLANT_COLORS['natural gas'],

          // Renewable Sources (Bright & Cool Hues)
          'solar',         POWER_PLANT_COLORS.solar,
          'wind',          POWER_PLANT_COLORS.wind,
          'hydroelectric', POWER_PLANT_COLORS.hydroelectric,
          'geothermal',    POWER_PLANT_COLORS.geothermal,
          'biomass',       POWER_PLANT_COLORS.biomass,

          // Storage & Unique Sources (Magenta, Purple, Light Blue)
          'nuclear',       POWER_PLANT_COLORS.nuclear,
          'batteries',     POWER_PLANT_COLORS.batteries,
          'pumped storage', POWER_PLANT_COLORS['pumped storage'],

          // Fallback
          /* other */ POWER_PLANT_COLORS.other // Lightest Gray

        ],
        "circle-opacity": 1,
        "circle-stroke-width": 1,
        "circle-stroke-color": [
          "match",
          ["get", "PrimSource"],
          // light colors get black, else white stroke
          'solar',         "#000000",
          'wind',     "#000000",
          'petroleum', "#000000",
          'other',          "#000000",
          'natural gas',     "#000000",
          /* default */    "#FFFFFF"
        ]
      },
    }
  });

 
  function addLayer(_op = {minzoom: 0}) {
    if (!isValidMap(map)) return;

    circleLayer.addToMap(map.value);

    // kick off loading in the background; do not await
    ensureDataLoaded();

    // Create a popup, but don't add it to the map yet.
    //https://maplibre.org/maplibre-gl-js/docs/examples/display-a-popup-on-hover/
    const popup = new Popup({
      closeButton: true,
      closeOnClick: false,
      className: 'powerplant-popup'
    });


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
          'Total MW: ' + e.features[0].properties.Total_MW;

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

    heatmapLayer.addToMap(map.value);

    addLayer(); // add the point layer on top of the heatmap

  }
  // get screen pixel ratio
  const pixelRatio = window.devicePixelRatio || 1;

  const heatmapLayer = useGeoJsonLayer("power-plants-heatmap", null, {
    sourceId: "power-plants-heatmap-source",
    layerOptions: {
      id: powerPlantsHeatmapLayerId,
      type: 'heatmap',
      // maxzoom: 5,
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
        "heatmap-opacity": 0.8,
        // "heatmap-opacity": [
        //   'interpolate',
        //   ['linear'],
        //   ['zoom'],
        //   4.9, // zoom = 4.9
        //   1, // opacity = 1 @ zoom = 4.9
        //   5, // zoom = 5
        //   0 // opacity = 0 @ zoom = 5
        // ],
      }
    }

  });



  function removeLayer() {
    circleLayer.cleanup();
    heatmapLayer.cleanup();
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
