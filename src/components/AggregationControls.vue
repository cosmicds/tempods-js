<!-- eslint-disable vue/no-mutating-props -->
<template>
	<!-- Folding Period Selection -->
	<div class="aggregation-controls">
		<div>
			<h3>
				<info-button>
					<div class="explainer-text">
						<div>
							Greyed out options are options which are either not able to be applied to the current dataset (due to
							insufficient data), or which are incompatible with other selected options.
						</div>
						<hr />
						Select the period over which to stack the data. For example, selecting "Day" will align the entire time series by time of day to show how the measurement varies over the course of a typical day.
					</div>
				</info-button>
				Stack data by...
			</h3>
			<v-chip-group v-model="selectedFoldingPeriod" column class="mb-3">
				<v-chip v-for="option in foldingPeriodOptions" :key="option.value" :value="option.value" color="#092088"
					:variant="option.value === selectedFoldingPeriod ? 'flat' : 'outlined'" outline density="compact"
					:disabled="!validFoldingForData(option.value as FoldingPeriodOptions)">
					{{ option.title }}
				</v-chip>
			</v-chip-group>
		</div>




		<!-- Time Bin Selection -->
		<!-- use chips for select -->
		<div>
			<h3>
				<info-button>
					<div class="explainer-text">
						Select the resolution (bin size) within which to aggregate the data.
						When aggregating, we take all data in a bin (say, 1-hour bins around 1pm) and
						compute a single value for it, such as a mean or a max.
						<hr />
						<div>
							<div v-if="selectedTimeBin === 'hour'">
								<dt>Hour</dt>
								<dd>
									Rounds data to the nearest hour. For example: Date from 12:30pm to 1:29pm will go into the 1pm bin.
									The binned point, shown in black is placed on the hour (e.g. at 1:00pm).
								</dd>
							</div>
							<div v-else-if="selectedTimeBin === 'day'">
								<dt>Day</dt>
								<dd>Bins all data within a date. For example, all data points occuring on Dec 5 2025, or on Aug 28 2024,
									etc.
									The binned point, shown in black is placed at local noon (12:00pm) of that day.
								</dd>
							</div>
							<div v-else-if="selectedTimeBin === 'week'">
								<dt>Week</dt>
								<dd>
									Rounds data to the nearest week. Weeks start on Sunday. For example: Date from Sunday 12:00am to
									Saturday
									11:59pm will go into the week bin.
									The binned point, shown in black is placed at local noon (12:00pm) on Wednesday of that week.
								</dd>
							</div>
							<div v-else-if="selectedTimeBin === 'month'">
								<dt>Month</dt>
								<dd>
									Rounds data to the nearest month.
									For example: Date from the 1st of the month 12:00am to the last day of the month 11:59pm will go into
									the
									month bin.
									The binned point, shown in black is placed at local noon (12:00pm) on the 15th of that month.
								</dd>
							</div>
						</div>
					</div>
				</info-button>
				Average data over...
			</h3>
			<v-chip-group v-model="selectedTimeBin" column class="mb-3">
				<v-chip v-for="option in timeBinOptions" :key="option.value" :value="option.value" color="#092088"
					:variant="option.value === selectedTimeBin ? 'flat' : 'outlined'" density="compact"
					:disabled="!validTimeBinForData(option.value as TimeBinOptions) || !isValidCombination(option.value as TimeBinOptions, selectedFoldingPeriod)">
					{{ option.title }}
				</v-chip>
			</v-chip-group>
		</div>






		<!-- Timezone Selection -->
		<div v-if="false" class="selected-timezone-details d-flex mb-4">
			<v-checkbox v-model="useTzCenter" :label="`Use timezone of region center: ${tzCenter}`" density="compact"
				hide-details class="mb-1" />
		</div>
		<v-select v-if="!useTzCenter" v-model="selectedTimezone" :items="timezoneOptions" label="Timezone" density="compact"
			variant="outlined" hide-details class="mb-3" />

		<v-btn class="my-2" style="text-transform: none;" @click="safo = !safo" size="small" variant="outlined"
			color="#ffcc33">
			{{ safo ? 'Hide' : 'Show' }} advanced options
		</v-btn>
		<div v-if="safo" class="advanced-folding-options">
			<!-- Folding Method -->
			<v-select v-model="selectedMethod" :items="methodOptions" label="Aggregation Method" density="compact"
				variant="outlined" hide-details class="mb-3 text-caption" />
			<!-- Show Errors Toggle -->
			<div class="d-flex flex-row flex-wrap">
				<v-checkbox v-model="showErrors" label="Show Errors" density="compact"
					:disabled="selectedMethod == 'min' || selectedMethod == 'max'" hide-details class="text-caption" />
				<v-checkbox v-model="useErrorBars" label="Use Error Bars" density="compact" hide-details class="text-caption" />
				<!-- Show Errors Toggle -->
				<v-checkbox v-model="useSEM" label="Use Standard Error of the Mean" density="compact" hide-details
					class="text-caption" />
				<v-checkbox v-model="alignDataToBinCenters" label="Align Data to bins" density="compact"
					:disabled="!disableIncludePhaseCheckbox" hide-details class="text-caption" />
				<v-checkbox v-if="false" v-model="alignToBinCenter" label="Center bins" density="compact"
					:disabled="!disableBinCenterCheckbox" hide-details class="text-caption" />
			</div>
		</div>
		<!-- Preview Info -->
		<v-card v-if="debugMode" height="fit-content" variant="tonal" class="pa-2 mb-3">
			<v-card-subtitle class="pa-0">Preview</v-card-subtitle>
			<div class="text-caption">
				<div>Original points: {{ originalDataPointCount }}</div>
				<div>Aggregated points: {{ foldedDataPointCount }}</div>
				<div>Time Bin: {{ selectedTimeBin }}</div>
				<div>Folding Period: {{ selectedFoldingPeriod }}</div>
				<div>Fold Type: {{ selectedFoldType }}</div>
				<div>First bin: {{ foldedData && foldedData.bins ? Object.keys(foldedData.bins)[0] : 'N/A' }}</div>
				<!-- show first bins time in the local timezone if it's a date using toZonedTime -->
				<div
					v-if="foldedData && foldedData.bins && foldedData.bins[Object.keys(foldedData.bins)[0]] && foldedData.values[Object.keys(foldedData.bins)[0]] && foldedData.values[Object.keys(foldedData.bins)[0]].date">
					First bin time:
				</div>
			</div>
		</v-card>
		<v-spacer></v-spacer>
		<!-- Action Buttons -->
		<div class="d-flex ga-2">
			
			<v-btn color="primary" @click="() => emit('save')" :disabled="!canSave" size="small"
				prepend-icon="mdi-content-save-outline">
				Save Stacked Data
			</v-btn>
			<v-btn color="secondary" variant="outlined" @click="() => emit('cancel')" size="small">
				Cancel
			</v-btn>
		</div>
	</div>
</template>

<style>
.aggregation-controls {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	height: 100%;
}

</style>

<script setup lang="ts">
import type { AggregationMethod, FoldType, FoldedTimeSeriesData } from '@/esri/services/aggregation';

import {
  TimeBinOptions,
  FoldingPeriodOptions,
} from '@/utils/foldingValidation';


/*
:foldingPeriodOptions="foldingPeriodOptions"
:timeBinOptions="timeBinOptions"
:timezoneOptions="timezoneOptions"
:methodOptions="methodOptions"
:debugMode="debugMode"
:originalDataPointCount="originalDataPointCount"

v-model:validFoldingForData="validFoldingForData"
v-model:validTimeBinForData="validTimeBinForData"
v-model:isValidCombination="isValidCombination"
v-model:useTzCenter="useTzCenter"
v-model:tzCenter="tzCenter"
v-model:selectedTimezone="selectedTimezone"
v-model:showErrors="showErrors"
v-model:useErrorBars="useErrorBars"
v-model:useSEM="useSEM"
v-model:alignDataToBinCenters="alignDataToBinCenters"
v-model:disableIncludePhaseCheckbox="disableIncludePhaseCheckbox"
v-model:alignToBinCenter="alignToBinCenter"
v-model:disableBinCenterCheckbox="disableBinCenterCheckbox"
v-model:foldedDataPointCount="foldedDataPointCount"
v-model:selectedFoldType="selectedFoldType"
v-model:canSave="canSave"
v-model:saveFolding="saveFolding"
v-model:closeDialog="closeDialog"
v-model:selectedFoldingPeriod="selectedFoldingPeriod"
v-model:selectedTimeBin="selectedTimeBin"
v-model:selectedMethod="selectedMethod"
v-model:foldedData="foldedData"
*/
defineProps<{
	foldingPeriodOptions: { title: string; value: FoldingPeriodOptions; }[];
	timeBinOptions: { title: string; value: TimeBinOptions; }[];
	timezoneOptions: { title: string; value: string; }[];
	methodOptions: { title: string; value: string; }[];
	debugMode: boolean;
	originalDataPointCount: number;
	foldedDataPointCount: number;
	canSave: boolean;
}>();



const validFoldingForData = defineModel<(foldType: FoldingPeriodOptions) => boolean>('validFoldingForData', { required: true });
const validTimeBinForData = defineModel<(timeBin: TimeBinOptions) => boolean>('validTimeBinForData', { required: true });
const isValidCombination = defineModel<(timeBin: TimeBinOptions, foldingPeriod: FoldingPeriodOptions) => boolean>('isValidCombination', { required: true });
const useTzCenter = defineModel<boolean>('useTzCenter', { required: true });
const tzCenter = defineModel<string>('tzCenter', { required: true });
const selectedTimezone = defineModel<string>('selectedTimezone', { required: true });
const showErrors = defineModel<boolean>('showErrors', { required: true });
const useErrorBars = defineModel<boolean>('useErrorBars', { required: true });
const useSEM = defineModel<boolean>('useSEM', { required: true });
const alignDataToBinCenters = defineModel<boolean>('alignDataToBinCenters', { required: true });
const disableIncludePhaseCheckbox = defineModel<boolean>('disableIncludePhaseCheckbox', { required: true });
const alignToBinCenter = defineModel<boolean>('alignToBinCenter', { required: true });
const disableBinCenterCheckbox = defineModel<boolean>('disableBinCenterCheckbox', { required: true });
const selectedFoldType = defineModel<FoldType>('selectedFoldType', { required: true });
const selectedFoldingPeriod = defineModel<FoldingPeriodOptions>('selectedFoldingPeriod', { required: true });
const selectedTimeBin = defineModel<TimeBinOptions>('selectedTimeBin', { required: true });
const selectedMethod = defineModel<AggregationMethod>('selectedMethod', { required: true });
const foldedData = defineModel<FoldedTimeSeriesData | null>('foldedData', { required: true });
const safo = defineModel<boolean>('showAdvancedFoldingOptions', { required: false, default: false });

// emits: save, cancel
const emit = defineEmits(['save', 'cancel']);
</script>
