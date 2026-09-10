/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
import { useEsriImageServiceLayer } from "@/esri/maplibre/useEsriMapLayer";

const count = "gpw_v4_population_count_adjusted_to_2015_unwpp_country_totals_rev11";
const countVar = 'un-adjusted-population-count';


const density = "gpw_v4_population_density_adjusted_to_2015_unwpp_country_totals_rev11";
const densityVar = 'un-adjusted-population-density';
const densityRaster = {
  "rasterFunctionArguments": {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "Colormap": [
      // generate 7 equally spaced colors from the 'haline' colormap
      // and map it to values 1 - 7
      ...sampleColormap('haline_r', 7).map((rgb, i) => [i + 1, ...rgb]),
    ],
    // https://developers.arcgis.com/rest/services-reference/enterprise/raster-function-objects/#remap
    // eslint-disable-next-line @typescript-eslint/naming-convention
    "Raster": {
      "rasterFunctionArguments": {
        // each of these pairs defines a range of map values to be mapped to a single output value
        // 1 - 7 are the indices of the colormap defined above
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "InputRanges": [
          0.0001, 0.9901,           // 1
          0.9901, 5.0001,          // 2
          5.0001, 25.0001,         // 3
          25.0001, 250.0001,       // 4
          250.0001, 1000.0001,     // 5
          1000.0001, 5000.0001,    // 6
          5000.0001, 50000.0001,    // 7
        ],

        "OutputValues": [1, 2, 3, 4, 5, 6, 7],
        "NoDataRanges": [0, 0],
        "replacementValue": 0,
        "AllowUnmatched": false,
      },
      "rasterFunction": "Remap", "variableName": "Raster"
    }
  },
  "rasterFunction": "Colormap"
};

const countRaster = {
  "rasterFunctionArguments": {
    "colorRamp": {
      "type": "multipart",
      "colorRamps": [
        { "type": "algorithmic", "algorithm": "esriHSVAlgorithm", "fromColor": [255, 252, 255, 255], "toColor": [181, 150, 181, 255] }, 
        { "type": "algorithmic", "algorithm": "esriHSVAlgorithm", "fromColor": [181, 150, 181, 255], "toColor": [150, 150, 181, 255] }, 
        { "type": "algorithmic", "algorithm": "esriHSVAlgorithm", "fromColor": [150, 150, 181, 255], "toColor": [135, 96, 38, 255] }, 
        { "type": "algorithmic", "algorithm": "esriHSVAlgorithm", "fromColor": [135, 96, 38, 255], "toColor": [217, 194, 121, 255] }, 
        { "type": "algorithmic", "algorithm": "esriHSVAlgorithm", "fromColor": [217, 194, 121, 255], "toColor": [255, 255, 128, 255] }, 
        { "type": "algorithmic", "algorithm": "esriHSVAlgorithm", "fromColor": [255, 255, 128, 255], "toColor": [255, 255, 199, 255] }, 
        { "type": "algorithmic", "algorithm": "esriHSVAlgorithm", "fromColor": [255, 255, 199, 255], "toColor": [118, 219, 211, 255] }
      ]
    },
    "Raster": {
      "rasterFunctionArguments": {
        "StretchType": 5,
        "Statistics": [[0, 602380.375, 31.152280479445455, 272.81391026456805]],
        "DRA": false,
        "UseGamma": true,
        "Gamma": [5.02],
        "ComputeGamma": false,
        "Min": 0,
        "Max": 255
      },
      "rasterFunction": "Stretch",
      "outputPixelType": "U8",
      "variableName": "Raster"
    }
  },
  "rasterFunction": "Colormap",
  "variableName": "Raster"
};

// Esri Image Service URL for GPWv4 Population Density
const gpw4url = `https://gis.earthdata.nasa.gov/image/rest/services/gpw-v4/${density}/ImageServer`;

import { sampleColormap } from "@/colormaps/utils";
const populationLayerOptions = {};
populationLayerOptions['visible'] = false;
populationLayerOptions['clickValue'] = true;
populationLayerOptions['renderingRule'] = densityRaster;

//valid timestamp otions are
/*
* 962424000000, 2000, 
* 1120190400000, 2005
* 1277956800000, 2010 
* 1435723200000, 2015
* 1593576000000, 2020 << use this
*/
export function addPopulationDensityLayer() {
  const popLayer = useEsriImageServiceLayer(
    gpw4url,
    'pop-dens',
    1,
    densityVar,
    1593576000000,
    populationLayerOptions,
  );
  return popLayer;
}
