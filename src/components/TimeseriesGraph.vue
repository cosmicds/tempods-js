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
import { onMounted, computed, ref, watch, nextTick } from "vue";
import { v4 } from "uuid";
import { PlotlyHTMLElement, newPlot, restyle, type Data, type Datum, type PlotMouseEvent } from "plotly.js-dist-min";

import { AggValue, UserDataset } from "../types";


interface TimeseriesProps {
  data: UserDataset[]; // composed selections
  showErrors?: boolean;
}

const props = defineProps<TimeseriesProps>();
const sampleKeyCounts = computed(() => props.data.map(sel => Object.keys(sel.samples ?? {}).length));

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
let errorTraces: number[] = [];
const traceVisible = ref<Map<string, boolean>>(new Map());

function renderPlot() {

  errorTraces = [];
  
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
    if (!traceVisible.value.has(data.id)) {
      traceVisible.value.set(data.id, true);
    }
    legendGroups[data.id] = legendGroup;
    plotlyData.push({
      x: dataT,
      y: dataV,
      mode: "lines+markers",
      legendgroup: legendGroup,
      showlegend: true,
      name: data.region.name,
      marker: { color: regionColor },
      visible: traceVisible.value.get(data.id) ? true : "legendonly",
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
        const low = Math.min(valueLower, valueHigher);
        const high = Math.max(valueLower, valueHigher);
        max = Math.max(max, high);
        lowerY.push(low);
        upperY.push(high);
      });

      plotlyData.push({
        x: dataT,
        y: lowerY,
        mode: "lines",
        line: { width: 0 },
        showlegend: false,
        legendgroup: legendGroup,
        name: data.region.name,
        marker: { color: regionColor },
        visible: props.showErrors && traceVisible.value.get(data.id),
      });
      errorTraces.push(plotlyData.length - 1);

      plotlyData.push({
        x: dataT,
        y: upperY,
        mode: "lines",
        line: { width: 0 },
        fill: "tonexty",
        showlegend: false,
        legendgroup: legendGroup,
        name: data.region.name,
        marker: { color: regionColor },
        visible: props.showErrors && traceVisible.value.get(data.id),
      });
      errorTraces.push(plotlyData.length - 1);
    }
  });

  const paddingFactor = 1.1;
  const axisMax = Math.max(1, paddingFactor * max);
  const layout = {
    width: 600,
    height: 400,
    yaxis: {
      title: { text: "Molecules / cm<sup>2</sup>" },
      range: [0, axisMax],
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
    el.on('plotly_legendclick', (data) => {
      const trace = plotlyData[data.curveNumber];
      if (!trace) { 
        console.error("No trace for legend click", data);
        return true; 
      }
      // eslint-disable-next-line 
      // @ts-ignore legend group should exist. but guard anyway
      const group = trace.legendgroup as string;
      if (!group) { 
        console.error("No legend group for trace", trace);
        return true; 
      }
      const dataId = Object.keys(legendGroups).find(key => legendGroups[key] === group);
      if (!dataId) { 
        console.error("Could not find data ID for legend group", group);
        return true; 
      }
      const currentlyVisible = traceVisible.value.get(dataId);
      traceVisible.value.set(dataId, !currentlyVisible);
      // if currently visible and errors are visible set stlye the error traces too
      nextTick(() => { // next tick so that updated traceVisible is available
        if (currentlyVisible && props.showErrors) {
          updateErrorDisplay(true);
        }
      });
      return true;
    });
  });
}

function updateErrorDisplay(visible: boolean) {
  if (graph.value) {
    errorTraces.forEach((traceIndex) => {
      const trace = plot.value?.data[traceIndex];
      if (!trace) return;
      if (!graph.value) return;
      // eslint-disable-next-line 
      // @ts-ignore legend group should exist. but guard anyway
      const group = trace.legendgroup as string;
      const dataId = Object.keys(legendGroups).find(key => legendGroups[key] === group);
      if (dataId && traceVisible.value.get(dataId)) {
        restyle(graph.value, { visible }, [traceIndex]);
      } 
    });
  }
}


onMounted(() => {
  renderPlot();
});


watch(() => props.showErrors, updateErrorDisplay);

watch(sampleKeyCounts, (newCounts: number[], oldCounts: number[]) => {
  const different = (newCounts.length != oldCounts.length) && 
                    newCounts.some((value, index) => value !== oldCounts[index]);
  if (!different) {
    return;
  }
  if (newCounts.length === 0) {
    console.log("No data provided for timeseries graph");
    return;
  }
  console.log("Data changed, re-rendering plot");
  renderPlot();
});

watch(() => props.data, (newData, oldData) => {
  console.log("Data prop changed, re-rendering plot");
  renderPlot();
});

</script>

<style scoped>
.timeseries:not(:empty) {
  width: 600px;
  height: 400px;
}
</style>
