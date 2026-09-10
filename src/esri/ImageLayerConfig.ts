/* eslint-disable @typescript-eslint/naming-convention */


// const earthdataRestSerivceURL = "https://gis.earthdata.nasa.gov/image/rest/services/C2930763263-LARC_CLOUD/TEMPO_NO2_L3_V03_HOURLY_TROPOSPHERIC_VERTICAL_COLUMN/ImageServer";
import { Variables } from './types';
import { AllAvailableColorMaps } from '@/colormaps';

export type ColorRamps = "Magma" | "Inferno" | "Plasma" | "Viridis" | "Gray" | "Hillshade" | "Cividis" | AllAvailableColorMaps;

type PixelType = "C128" | "C64" | "F32" | "F64" | "S16" | "S32" | "S8" | "U1" | "U16" | "U2" | "U32" | "U4" | "U8" | "UNKNOWN";

interface RasterFunctionObject {
  rasterFunction: string;
  variableName?: string; // Optional, as it might be implied or set by composition
  rasterFunctionArguments?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
    Raster?: RasterFunctionObject | { variableName: string }; // Input can be another function or the base 'Raster'
  };
  outputPixelType?: PixelType;
}

// https://developers.arcgis.com/rest/services-reference/enterprise/raster-function-objects/
// https://developers.arcgis.com/rest/services-reference/enterprise/raster-function-objects/#resample
// https://pro.arcgis.com/en/pro-app/latest/help/analysis/raster-functions/stretch-function.htm
export function _stretchRule(min: number, max: number, reverse: boolean): RasterFunctionObject {
  return {
    'rasterFunction': 'Stretch',
    'outputPixelType': 'U8' as PixelType,
    'variableName': 'Raster',
    'rasterFunctionArguments': {
      'StretchType': 5,
      'Statistics': [[
        min, // max
        max, // min
        0, 0
      ]],
      'DRA': false,
      'UseGamma': false,
      'Gamma': [1],
      'ComputeGamma': true,
      'Min': reverse ? 255 : 0,
      'Max': reverse ? 0 : 255,
    },
  };
}

//https://pro.arcgis.com/en/pro-app/latest/arcpy/spatial-analyst/convolution.html
//https://developers.arcgis.com/rest/services-reference/enterprise/raster-function-objects/#convolution
export function _convolutionRule(size: 3 | 5): RasterFunctionObject {
  return {
    'rasterFunction': 'Convolution',
    'rasterFunctionArguments': {
      "Type": size === 3 ? 11 : size === 5 ? 12 : 11,
    },
    'variableName': 'Raster',
  };
}

export const stretches = {
  'NO2_Troposphere': [0, 15_000_000_000_000_000],
  'Ozone_Column_Amount': [250, 430], // +- 2 sigma
  '0-2_km_Column_Ozone': [0, 15],
  'HCHO': [1_000_000_000_000_000, 30_000_000_000_000_000],
  'lite': [1e14, 150 * 1e14],
} as Record<Variables, [number, number]>;
export const colorramps = {
  'NO2_Troposphere': 'Magma_r',
  'Ozone_Column_Amount': 'Cividis',
  '0-2_km_Column_Ozone': 'Cividis',
  'HCHO': 'Viridis_r',
  'lite': 'svs_r',
} as Record<Variables, ColorRamps>;

export const rgbstretches = {
  'NO2_Troposphere': [0, 7_500_000_000_000_000],
  'Ozone_Column_Amount': [250, 430], // +- 2 sigma
  '0-2_km_Column_Ozone': [0, 15],
  'HCHO': [1_000_000_000_000_000, 15_000_000_000_000_000],
  'lite': [1e14, 150 * 1e14],
} as Record<string, [number, number]>;
export const rgbcolorramps = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'NO2_Troposphere': 'redfromwhite',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'Ozone_Column_Amount': 'greenfromwhite',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  '0-2_km_Column_Ozone': 'greenfromwhite',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'HCHO': 'bluefromwhite',
} as Record<string, ColorRamps>;

export const colorbarOptions = {
  'no2': {
    stretch: stretches['NO2_Troposphere'], 
    rgbstretch: rgbstretches['NO2_Troposphere'], 
    cbarScale: 1e14, 
    colormap: colorramps['NO2_Troposphere'], 
    rgbcolormap: rgbcolorramps['NO2_Troposphere'],
    label:'NO<sub>2</sub>',
    unit: "mol/cm<sup>2</sup>",
  },
  'lite': {
    stretch: stretches['lite'], 
    rgbstretch: stretches['lite'], 
    cbarScale: 1e14, 
    colormap: colorramps['lite'], 
    rgbcolormap: colorramps['lite'],
    label:'NO<sub>2</sub>',
    unit: "mol/cm<sup>2</sup>",
  },
  'no2Monthly': {
    stretch: stretches['NO2_Troposphere'], 
    rgbstretch: rgbstretches['NO2_Troposphere'], 
    cbarScale: 1e14, 
    colormap: colorramps['NO2_Troposphere'], 
    rgbcolormap: rgbcolorramps['NO2_Troposphere'],
    label: 'NO<sub>2</sub>',
    unit: "mol/cm<sup>2</sup>",
  },
  'no2DailyMax': {
    stretch: stretches['NO2_Troposphere'], 
    rgbstretch: rgbstretches['NO2_Troposphere'], 
    cbarScale: 1e14, 
    colormap: colorramps['NO2_Troposphere'], 
    rgbcolormap: rgbcolorramps['NO2_Troposphere'],
    label: 'NO<sub>2</sub>',
    unit: "mol/cm<sup>2</sup>",
  },
  'o3': {
    stretch: stretches['Ozone_Column_Amount'], 
    rgbstretch: rgbstretches['Ozone_Column_Amount'], 
    cbarScale: 1, 
    colormap: colorramps['Ozone_Column_Amount'], 
    rgbcolormap: rgbcolorramps['Ozone_Column_Amount'],
    label: 'Ozone',
    unit: "Dobson Units",
  },
  'o3trop': {
    stretch: stretches['0-2_km_Column_Ozone'],
    rgbstretch: rgbstretches['0-2_km_Column_Ozone'],
    cbarScale: 1,
    colormap: colorramps['0-2_km_Column_Ozone'],
    rgbcolormap: rgbcolorramps['0-2_km_Column_Ozone'],
    label: 'Tropospheric Ozone',
    unit: "Dobson Units",
  },
  'hcho': {
    stretch: stretches['HCHO'], 
    rgbstretch: rgbstretches['HCHO'], 
    cbarScale: 1e14, 
    colormap: colorramps['HCHO'], 
    rgbcolormap: rgbcolorramps['HCHO'],
    label: 'Formaldehyde',
    unit: "mol/cm<sup>2</sup>",
  },
  'hchoMonthly': {
    stretch: stretches['HCHO'], 
    rgbstretch: rgbstretches['HCHO'], 
    cbarScale: 1e14, 
    colormap: colorramps['HCHO'], 
    rgbcolormap: rgbcolorramps['HCHO'],
    label: 'Formaldehyde',
    unit: "mol/cm<sup>2</sup>",
  },
  'hchoDailyMax': {
    stretch: stretches['HCHO'], 
    rgbstretch: rgbstretches['HCHO'], 
    cbarScale: 1e14, 
    colormap: colorramps['HCHO'], 
    rgbcolormap: rgbcolorramps['HCHO'],
    label: 'Formaldehyde',
    unit: "mol/cm<sup>2</sup>",
  },
};

import { nonEsriColormaps } from '@/colormaps';


export function _colorMapRule(colorRamp: ColorRamps): RasterFunctionObject {
  if (Object.keys(nonEsriColormaps).includes((colorRamp as string).toLowerCase())) {
    // console.log('using non esri colormap:', colorRamp);
    return {
      'rasterFunction': 'Colormap',
      'variableName': 'Raster',
      'rasterFunctionArguments': {
        'colorramp': nonEsriColormaps[colorRamp.toLowerCase()].esriColorRamp,
      },
    };
  }
  // console.log('using esri colormap:', colorRamp);
  return {
    'rasterFunction': 'Colormap',
    'variableName': 'Raster',
    'rasterFunctionArguments': {
      'ColormapName': colorRamp,
    },
  };
}

export type ResamplingType = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' ; 
//0=NearestNeighbor, 1=Bilinear, 2=Cubic, 3=Majority, 4=BilinearInterpolationPlus, 5=BilinearGaussBlur, 6=BilinearGaussBlurPlus, 7=Average, 8=Minimum, 9=Maximum

export enum ResamplingTypeEnum {
  NearestNeighbor = '0',
  Bilinear = '1',
  Cubic = '2',
  Majority = '3',
  BilinearInterpolationPlus = '4',
  BilinearGaussBlur = '5',
  BilinearGaussBlurPlus = '6',
  Average = '7',
  Minimum = '8',
  Maximum = '9'
}



export function _resampleRule(resamplingType: keyof typeof ResamplingTypeEnum): RasterFunctionObject {
  return {
    'rasterFunction': 'Resample',
    'variableName': 'Raster',
    'rasterFunctionArguments': {
      'ResamplingType': ResamplingTypeEnum[resamplingType], // Convert string to enum value
    },
  };
}


export function composeRasterRules(
  ...rules: RasterFunctionObject[]
): RasterFunctionObject {
  if (rules.length === 0) {
    throw new Error('composeRasterRules requires at least one rule');
  }

  if (rules.length === 1) {
    return { ...rules[0] };
  }

  let currentRule: RasterFunctionObject = { ...rules[0] };

  for (let i = 1; i < rules.length; i++) {
    const nextOuterRule = { ...rules[i] }; // Copy to avoid modifying original rule objects

    // Ensure rasterFunctionArguments exists
    if (!nextOuterRule.rasterFunctionArguments) {
      nextOuterRule.rasterFunctionArguments = {};
    }

    // Assign the current (inner) rule as the 'Raster' input to the next outer rule.
    nextOuterRule.rasterFunctionArguments.Raster = currentRule;

    currentRule = nextOuterRule; // The newly composed rule becomes the current one for the next iteration
  }

  return currentRule;
}

export const renderingRule = (range: [number, number], colormap: ColorRamps, _resamplineRule: keyof typeof ResamplingTypeEnum = 'NearestNeighbor'): RasterFunctionObject => {
  let reverse = false;
  let colormapName = colormap;
  if (colormap.endsWith('_r')) {
    reverse = true;
    colormapName = colormap.slice(0, -2) as ColorRamps;
  }
  return composeRasterRules(
    _stretchRule(Math.min(...range), Math.max(...range), reverse), 
    _colorMapRule(colormapName), 
  );
};

export interface RenderingRuleOptions {
  range: [number, number];
  colormap: ColorRamps;
}

interface MultidimensionalDefinition {
  variableName: string;
  dimensionName: string;
  values: number[] | Array<number[]>;
}



export interface EsriSlice {
  sliceId: number;
  multidimensionalDefinition: MultidimensionalDefinition[];
}

export interface EsriSliceResponse {
  slices?: EsriSlice[];
}


export type VariableNames = 'NO2_Troposphere' | 'Ozone_Column_Amount' | '0-2_km_Column_Ozone' | 'HCHO';

export async function fetchEsriTimeSteps(esriUrl: string, variableName: VariableNames, dimensionName = "StdTime"): Promise<EsriSliceResponse> {
  const url = esriUrl + '/slices';
  const format = "json";
  const multidimensionalDefinition = { variableName: variableName, dimensionName: dimensionName };
  const params = { f: format, multidimensionalDefinition: JSON.stringify(multidimensionalDefinition) };
  const fetchURL = new URL(url);
  fetchURL.search = new URLSearchParams(params).toString();
  return fetch(fetchURL).then(async (res) => {
    const json = await res.json();
    if ('error' in json) {
      return {};
    }
    return json;
  });
}

export function extractTimeSteps(data: EsriSliceResponse): number[] {
  const slices = data.slices;
  if (!slices ) {
    return [];
  }
  const timesteps = slices.map(slice => slice.multidimensionalDefinition[0].values[0]);
  // check if timesteps are arrays or numbers. if arrays take first element of each


  return timesteps.reduce((acc: number[], val) => {
    if (Array.isArray(val)) {
      return acc.concat(val[0]);
    } else {
      acc.push(val);
      return acc;
    }
  }, []);
}
