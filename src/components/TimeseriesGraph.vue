<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<template>
  <div
    ref="graph"
    :id="id"
    class="timeseries"
  >
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import { onMounted, ref, watch } from "vue";
import { v4 } from "uuid";
import { PlotlyHTMLElement, newPlot, type Data, type Datum, type PlotMouseEvent } from "plotly.js-dist-min";

import { AggValue, UserSelection } from "../types";


interface TimeseriesProps {
  data: UserSelection[]; // composed selections
}

const props = defineProps<TimeseriesProps>();

const id = `timeseries-${v4()}`;

const plot = ref<PlotlyHTMLElement | null>(null);
const graph = ref<HTMLDivElement | null>(null);

const emit = defineEmits<{
  (event: "click", value: AggValue): void;
}>();

function datumToDate(datum: Datum): Date | null {
  if (datum === null) { return null; }
  if (datum instanceof Date) { return datum; }
  return new Date(datum);
}

const legendGroups: Record<string, string> = {};

function renderPlot() {
  
  const plotlyData: Data[] = [];
  if (props.data.length === 0) {
    console.log("No data provided for timeseries graph");
    return;
  }
  
  if (props.data.map(sel => Object.keys(sel.samples ?? {}).length).every(len => len === 0)) {
    console.log("No samples provided for timeseries graph");
    return;
  }

  let max = 0;
  props.data.forEach(data => {
    const samples = data.samples;
    if (!samples) { return; }
    // derive color from region if present
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const regionColor = (data as any).region?.color;
    const ts = Object.keys(samples).sort();
    const dataT: Date[] = [];
    const dataV: (number | null)[] = [];
    ts.forEach(t => {
      const point: AggValue = samples[t];
      if (point.value !== null) {
        dataT.push(point.date);
        dataV.push(point.value);
      }
    });
    max = Math.max(max, Math.max(...dataV.filter((v): v is number => v !== null)));

    const legendGroup = v4();
    legendGroups[data.id] = legendGroup;
    plotlyData.push({
      x: dataT,
      y: dataV,
      mode: "lines+markers",
      legendgroup: legendGroup,
      name: data.name,
      marker: { color: regionColor },
    });

    const errors = data.errors;
    if (errors != null) {
      const upperY: (number | null)[] = [];
      const lowerY: (number | null)[] = [];

      ts.forEach(t => {
        const point: AggValue = samples[t];
        const value = point.value;
        const errs = errors[t];
        if (value === null || errs == null) {
          // lowerY.push(null);
          // upperY.push(null);
          return;
        }
        const { lower, upper } = errs;
        const valueLower = value - lower;
        const valueHigher = value + upper;
        lowerY.push(Math.min(valueLower, valueHigher));
        upperY.push(Math.max(valueLower, valueHigher));
      });

      plotlyData.push({
        x: dataT,
        y: lowerY,
        mode: "lines",
        line: { width: 0 },
        showlegend: false,
        legendgroup: legendGroup,
        marker: { color: regionColor },
      });

      plotlyData.push({
        x: dataT,
        y: upperY,
        mode: "lines",
        line: { width: 0 },
        fill: "tonexty",
        showlegend: false,
        legendgroup: legendGroup,
        marker: { color: regionColor },
      });
    }
  });

  const layout = {
    width: 600,
    height: 400,
    yaxis: {
      range: [0, 1.2 * max],
    }
  };

  newPlot(graph.value ?? id, plotlyData, layout).then((el: PlotlyHTMLElement) => {
    plot.value = el;
    el.on("plotly_click", (data: PlotMouseEvent) => {
      data.points.forEach(point => {
        const traceIndex = point.curveNumber;
        if (traceIndex !== 0 || point.x == null || point.y == null) {
          return;
        }
        const date = datumToDate(point.x);
        if (date !== null) {
          emit("click", { date, value: point.y as number });
        }
      });
    });
  });
}


onMounted(() => {
  renderPlot();
});


watch(() => props.data.map(sel => Object.keys(sel.samples ?? {}).length), (newData) => {
  if (newData.length === 0) {
    console.log("No data provided for timeseries graph");
    return;
  }
  console.log("Data changed, re-rendering plot");
  renderPlot();
}, 
{ immediate: true } // needed to force render in some situations
);
</script>

<style scoped>
.timeseries:not(:empty) {
  width: 600px;
  height: 400px;
}
</style>
