
import { magma } from "./magma";
import { inferno } from "./inferno";
import { plasma } from "./plasma";
import { viridis } from "./viridis";
import cividis from "./cividis";
import { gray } from "./gray";
import { svs_nitrogen_dioxide, svsColorRamp } from "./svs_nitrogen_dioxide";
import { sargassum, sargassumColorRamp } from "./sargassum";
import { haline } from "./cmo_haline";
import redfromblack from "./custom_red_from_black";
import bluefromblack from "./custom_blue_from_black";
import greenfromblack from "./custom_green_from_black";
import cyanfromblack from "./custom_cyan_from_black";
import yellowfromblack from "./custom_yellow_from_black";
import magentafromblack from "./custom_magenta_from_black";
import redfromwhite from "./custom_red_from_white";
import bluefromwhite from "./custom_blue_from_white";
import greenfromwhite from "./custom_green_from_white";
import cyanfromwhite from "./custom_cyan_from_white";
import yellowfromwhite from "./custom_yellow_from_white";
import magentafromwhite from "./custom_magenta_from_white";
import purples from "./Purples";


import type { ColorMaps } from "./types";

export const colormaps: ColorMaps = {
  "magma": magma,
  "inferno": inferno,
  "plasma": plasma,
  "viridis": viridis,
  "cividis": cividis.colormap,
  "svs": svs_nitrogen_dioxide,
  "sargassum": sargassum,
  "gray": gray,
  "haline": haline,
  "redfromblack": redfromblack.colormap,
  "bluefromblack": bluefromblack.colormap,
  "greenfromblack": greenfromblack.colormap,
  "cyanfromblack": cyanfromblack.colormap,
  "yellowfromblack": yellowfromblack.colormap,
  "magentafromblack": magentafromblack.colormap,
  "redfromwhite": redfromwhite.colormap,
  "bluefromwhite": bluefromwhite.colormap,
  "greenfromwhite": greenfromwhite.colormap,
  "cyanfromwhite": cyanfromwhite.colormap,
  "yellowfromwhite": yellowfromwhite.colormap,
  "magentafromwhite": magentafromwhite.colormap,
  "purples": purples.colormap,
} as const;

// add custom colormaps here
export const nonEsriColormaps = {
  'svs': {rgb: svs_nitrogen_dioxide, esriColorRamp: svsColorRamp},
  'sargassum': {rgb: sargassum, esriColorRamp: sargassumColorRamp},
  'redfromblack': {rgb: redfromblack.colormap, esriColorRamp: redfromblack.esri},
  'bluefromblack': {rgb: bluefromblack.colormap, esriColorRamp: bluefromblack.esri},
  'greenfromblack': {rgb: greenfromblack.colormap, esriColorRamp: greenfromblack.esri},
  'cyanfromblack': {rgb: cyanfromblack.colormap, esriColorRamp: cyanfromblack.esri},
  'yellowfromblack': {rgb: yellowfromblack.colormap, esriColorRamp: yellowfromblack.esri},
  'magentafromblack': {rgb: magentafromblack.colormap, esriColorRamp: magentafromblack.esri},
  'redfromwhite': {rgb: redfromwhite.colormap, esriColorRamp: redfromwhite.esri},
  'bluefromwhite': {rgb: bluefromwhite.colormap, esriColorRamp: bluefromwhite.esri},
  'greenfromwhite': {rgb: greenfromwhite.colormap, esriColorRamp: greenfromwhite.esri},
  'cyanfromwhite': {rgb: cyanfromwhite.colormap, esriColorRamp: cyanfromwhite.esri},
  'yellowfromwhite': {rgb: yellowfromwhite.colormap, esriColorRamp: yellowfromwhite.esri},
  'magentafromwhite': {rgb: magentafromwhite.colormap, esriColorRamp: magentafromwhite.esri},
  'purples': {rgb: purples.colormap, esriColorRamp: purples.esri},
  // overriding the colormap from esri
  'cividis': {rgb: cividis.colormap, esriColorRamp: cividis.esri}
} as const;

export type AvailableColorMaps = 'magma' | 'inferno' | 'plasma' | 'viridis' | 'cividis' | 'svs' | 'gray' | 'sargassum' | 'haline' | 'redfromblack' | 'bluefromblack' | 'greenfromblack' | 'cyanfromblack' | 'yellowfromblack' | 'magentafromblack' | 'redfromwhite' | 'bluefromwhite' | 'greenfromwhite' | 'cyanfromwhite' | 'yellowfromwhite' | 'magentafromwhite' | 'purples';
export type AvailableReverseColorMaps = `${AvailableColorMaps}_r`;
export type AllAvailableColorMaps = AvailableColorMaps 
  | AvailableReverseColorMaps 
  | Lowercase<AvailableColorMaps> 
  | Lowercase<AvailableReverseColorMaps> 
  | Capitalize<AvailableColorMaps>
  | Capitalize<AvailableReverseColorMaps>
  | 'None' | 'none';
