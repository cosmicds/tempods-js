/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import { useEsriImageServiceLayer } from "@/esri/maplibre/useEsriMapLayer";


// https://www.arcgis.com/home/item.html?id=cfcb7609de5f478eb7666240902d4d3d

// Esri Image Service URL for GPWv4 Population Density
const url = "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer";



const layerOptions = {};
layerOptions['visible'] = false;
layerOptions['clickValue'] = true;
layerOptions['renderingRule'] = {
  "rasterFunction": "Cartographic Renderer for Visualization and Analysis"
};
layerOptions['exportImageOptions'] = {
  "format": "jpgpng" // to get transparency
};

//valid timestamp otions are
/*

*/
export function addLandUseLayer() {
  const popLayer = useEsriImageServiceLayer(
    url,
    'land-use',
    1,
    'LandCoverType',
    1735689599000,
    layerOptions,
  );
  return popLayer;
}


// const availableRasterFunctions = { 
//   "rasterFunctionInfos": [
//     { 
//       "name": "Cartographic Renderer for Visualization and Analysis", 
//       "description": "Legend and attribute table for Sentinel 2 10m Land Cover.", "help": "" 
//     }, 
//     { 
//       "name": "None", 
//       "description": "Make a Raster or Raster Dataset into a Function Raster Dataset.", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Bare Ground Areas for Visualization and Analysis", 
//       "description": "Shows only areas of bare ground(class 8).", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Built Areas for Visualization and Analysis", 
//       "description": "Shows only built areas (class 7).", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Clouds for Visualization and Analysis", 
//       "description": "Shows only Clouds(class 10)", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Converted Lands for Visualization and Analysis", 
//       "description": "Shows only built areas and crops (class 5 and 7).", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Crops for Visualization and Analysis", 
//       "description": "Shows only Croplands(class 5)", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Flooded Vegeation Areas for Visualization and Analysis", 
//       "description": "Shows only areas of flooded vegetation (class 4).", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Rangelands Areas for Visualization and Analysis", 
//       "description": "Shows only rangeland areas (class 11).", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Snow or Ice for Visualization and Analysis", 
//       "description": "Shows only areas of snow or ice (class 9).", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Trees for Visualization and Analysis", 
//       "description": "Shows only areas of trees (class 2).", "help": "" 
//     }, 
//     { 
//       "name": "Isolate Water Areas for Visualization and Analysis", 
//       "description": "Shows only water areas (class 1).", "help": "" }
//   ] 
// };