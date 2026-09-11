import { Layout, Config, ModeBarDefaultButtons } from "plotly.js-dist-min";

export const DEFAULT_PLOT_LAYOUT: Partial<Layout> = {
  dragmode: false,
  modebar: {
    color: "#808080",
    activecolor: "#009ade",  // Smithsonian blue
  },
  yaxis: {
    automargin: true,
    showline: true,
    mirror: true,
  },
  xaxis: {
    showline: true,
    mirror: true,
  },
  legend: {
    yanchor: 'top',
    yref: 'container',
    y: .95,
    orientation:'h' as |'h' | 'v',
    bordercolor: '#ccc', 
    borderwidth:1,
    // @ts-expect-error entrywidthmode is a valid value
    entrywidthmode: 'pixels',
    entrywidth: 0, // fit the text
  }
};

/**
 * Tick/hover formats for date-typed axes, so times read as 2:30 PM rather than 14:30.
 * 
 * https://plotly.com/javascript/reference/layout/xaxis/#layout-xaxis-tickformatstops
 *
 * Uses tickformatstops rather than a flat tickformat: a flat tickformat applies at every
 * zoom level, so a month-wide view would label every tick "12:00 AM" and lose the date.
 * Each stop covers a dtickrange (in ms for date axes; 'M1'/'M12' are month-based dticks),
 * which preserves Plotly's adaptive tick granularity.
 *
 * Setting these also replaces Plotly's automatic two-tier date labelling, hence the <br>
 * on the hour-scale stop -- without it a single-day view shows times with no date at all.
 */
const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const week = 7 * day;
// Month-based dticks, for spans where a fixed ms count doesn't divide evenly
const month = 'M1';
const year = 'M12';

export const DATE_AXIS_DEFAULTS: Partial<Layout["xaxis"]> = {
  automargin: true,
  hoverformat: '%b %-d, %Y %-I:%M %p',
  tickformatstops: [
    { dtickrange: [null, second], value: '%-I:%M:%S.%L %p' },
    { dtickrange: [second, minute], value: '%-I:%M:%S %p' },
    { dtickrange: [minute, hour], value: '%-I:%M %p' },
    { dtickrange: [hour, day], value: '%b %-d<br>%-I %p' },
    { dtickrange: [day, week], value: '%b %-d' },
    { dtickrange: [week, month], value: '%b %-d' },
    { dtickrange: [month, year], value: '%b %Y' },
    { dtickrange: [year, null], value: '%Y' },
  ],
};

export const DEFAULT_MODEBAR_BUTTONS_TO_REMOVE: ModeBarDefaultButtons[] = ['sendDataToCloud', 'lasso2d', 'select2d', 'autoScale2d'];
export const DEFAULT_PLOT_CONFIG: Partial<Config> = {
  modeBarButtonsToRemove: DEFAULT_MODEBAR_BUTTONS_TO_REMOVE,
  displaylogo: false,
};
