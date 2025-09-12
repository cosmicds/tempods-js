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
/* slint-disable @typescript-eslint/no-unused-vars */
import { onMounted, ref, watch, nextTick } from "vue";
import { v4 } from "uuid";
import Plotly, { PlotlyHTMLElement, newPlot, restyle, type Data, type Datum, type PlotMouseEvent } from "plotly.js-dist-min";
import type { DataSet } from '../types';

// https://stackoverflow.com/a/7616484
const generateHash = (string) => {
  let hash = 0;
  for (const char of string) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0; // Constrain to 32bit integer
  }
  return hash;
};

const hashDataset = (data: DataSet) => {
  const hash = JSON.stringify(data.x) + JSON.stringify(data.y) +
              JSON.stringify(data.lower) + JSON.stringify(data.upper) + JSON.stringify(data.errorType);
  return generateHash(hash).toString();
};

interface TimeseriesProps {
  datasets: DataSet[];
  colors?: string[];
  showErrors?: boolean;
  dataOptions?: Partial<Data>[];
  errorBarStyles?: (Partial<Plotly.ErrorOptions> | null)[];
}

const props = defineProps<TimeseriesProps>();

const id = `timeseries-${v4()}`;

const plot = ref<PlotlyHTMLElement | null>(null);
const graph = ref<HTMLDivElement | null>(null);

const emit = defineEmits<{
  // Datum is from type of x in DataSet
  (event: "click", value: {x: Datum, y: number}): void;
}>();

function datumToDate(datum: Datum): Date | null {
  if (datum === null) { return null; }
  if (datum instanceof Date) { return datum; }
  return new Date(datum);
}

const legendGroups: Record<string, string> = {};
let errorTraces: number[] = [];
const traceVisible = ref<Map<string, boolean>>(new Map());

function normalizeBadValue(v: number | null | undefined): number | null {
  if (v === null || v === undefined || isNaN(v)) {
    return null;
  }
  return v;
}

function nanMean(arr: (number | null)[]): number | null {
  const validValues = arr.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length === 0) return null;
  const sum = validValues.reduce((a, b) => a + b, 0);
  return sum / validValues.length;
}

const filterNulls = ref(true);

function filterNullValues(data: DataSet): DataSet {
  // filter out any place where
  // data.x or data.y is null or undefined or NaN
  const filteredX: Datum[] = [];
  const filteredY: number[] = [];
  const filteredLower: (number | null)[] = [];
  const filteredUpper: (number | null)[] = [];
  data.x.forEach((x, idx) => {
    const y = data.y[idx];
    if (x !== null && x !== undefined && y !== null && y !== undefined && !isNaN(y)) {
      filteredX.push(x);
      filteredY.push(y);
      if (data.lower) {
        filteredLower.push(data.lower[idx] ?? null); // keep length consistent 
      }
      if (data.upper) {
        filteredUpper.push(data.upper[idx] ?? null); // keep length consistent 
      }
    }
  });
  const result: DataSet = {
    x: filteredX,
    y: filteredY,
  };
  if (data.lower) {
    result.lower = filteredLower;
  } 
  if (data.upper) {
    result.upper = filteredUpper;
  }
  result.errorType = data.errorType;
  
  return result;
}

function renderPlot() {

  errorTraces = [];
  
  const plotlyData: Data[] = [];
  if (props.datasets.length === 0) {
    console.log("No data provided for timeseries graph");
    return;
  }
  

  let max = 0;
  
  props.datasets.forEach((data, index) => {
    // create a hash from the data.x and data.y to be it's "id"
    data = filterNulls.value ? filterNullValues(data) : data;
    
    // check x, and have same length y
    if (!data.x || !data.y || data.x.length !== data.y.length) {
      console.error("Invalid dataset, skipping", data);
      return;
      // throw new Error(`Invalid dataset: x and y must be non-null and of same length. Lengths: x=${data.x?.length}, y=${data.y?.length}`);
    }
    
    const id = hashDataset(data);
    
    max = Math.max(max, Math.max(...data.y.filter((v): v is number => v !== null)));

    const legendGroup = v4();
    if (!traceVisible.value.has(id)) {
      traceVisible.value.set(id, true);
    }
    legendGroups[id] = legendGroup;
    
    
    const errorOptions = {} as Record<'error_y',Plotly.ErrorBar>;
    console.log(index, data.errorType);
    // https://plotly.com/javascript/error-bars/
    if (data.errorType === 'bar') {
      const style = (props.errorBarStyles && props.errorBarStyles[index]) || {};
      errorOptions['error_y'] = {
        type: 'data',
        symmetric: false,
        array: data.upper as Datum[],
        arrayminus: data.lower as Datum[] | undefined,
        color: props.colors ? props.colors[index % props.colors.length] : 'red',
        visible: true,
        thickness: 1.5,
        width: 3,
        ...style,
      };
      
    }
    console.log("Error options", errorOptions);
    const dataTraceOptions = {
      mode: "lines+markers",
      legendgroup: legendGroup,
      showlegend: true,
      name: `Dataset ${index + 1}`,
      marker: { color: props.colors ? props.colors[index % props.colors.length] : 'red' },
      visible: traceVisible.value.get(id) ? true : "legendonly",
      ...errorOptions,
      ...props.dataOptions?.[index],
    };
    
    plotlyData.push({
      x: data.x,
      y: data.y,
      ...dataTraceOptions
    } as Data);
    
    const hasErrors = data.lower && data.upper && data.lower.length === data.y.length && data.upper.length === data.y.length;
    // double checking to have valid types
    if (hasErrors && data.lower && data.upper && data.errorType !== 'bar') {
      console.log("Adding error traces for dataset", index);
      const upperY: (number | null)[] = [];
      const lowerY: (number | null)[] = [];
      
      data.y.forEach((y, idx) => {
        if (y === null) {
          lowerY.push(null);
          upperY.push(null);
          return;
        }
        
        if (data.upper === undefined) {
          upperY.push(null);
        } else {
          const high = y + (data.upper[idx] ?? nanMean(data.upper) ?? 0);
          // console.log(y, data.upper[idx] ?? nanMean(data.upper) ?? 0);
          upperY.push(high);
          max = Math.max(max, high !== null ? high : 0);
        }
        
        if (data.lower === undefined) {
          lowerY.push(null);
        } else {
          const low = y - (data.lower[idx] ?? nanMean(data.lower) ?? 0);
          // console.log(y, data.lower[idx] ?? nanMean(data.lower) ?? 0);
          lowerY.push(low);
          
        }
        
        
      });
      // console.log({lowerY, upperY});
      const traceErrorOptions = {
        x: data.x,
        mode: "lines",
        line: { width: 0 },
        showlegend: false,
        legendgroup: legendGroup,
        name: `Dataset ${index + 1}`,
        marker: { color: props.colors ? props.colors[index % props.colors.length] : 'red' },
        // visible: props.showErrors && traceVisible.value.get(id),
      };


      plotlyData.push({
        y: lowerY.map(normalizeBadValue),
        ...traceErrorOptions
      });
      errorTraces.push(plotlyData.length - 1);

      plotlyData.push({
        y: upperY.map(normalizeBadValue),
        ...traceErrorOptions,
        fill: "tonexty",
      });
      errorTraces.push(plotlyData.length - 1);
    }
  });

  const paddingFactor = 1.1;
  const axisMax = Math.max(1, paddingFactor * max);
  // get width of parent element .plot-container.plotly
  const width = document.querySelector('.plot-container.plotly')?.clientWidth ?? 600;
  const layout: Partial<Plotly.Layout> = {
    width: width,
    height: 400,
    yaxis: {
      title: { text: "Molecules / cm<sup>2</sup>" },
      range: [0, axisMax],
    },
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
          emit("click", {x: point.x, y: point.y as number} );
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

watch(() => props.datasets, (_newData, _oldData) => {
  console.log("Data prop changed, re-rendering plot");
  renderPlot();
}, { deep: true });

</script>

<style scoped>
.timeseries:not(:empty) {
  width: 600px;
  height: 400px;
}
</style>
