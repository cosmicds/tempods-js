<template>
<v-app
  id="app"
  :style="cssVars"
>

  <v-overlay
    :model-value="inIntro"
    :style="cssVars"
    id="intro-background"
  >

      <v-dialog 
        v-model="inIntro"
        >
        <div v-if="inIntro" id="introduction-overlay" class="elevation-10 gradient-background">
          <v-window v-model="introSlide">
            <template v-slot:additional>
              <div id="intro-window-close-button">
              <font-awesome-icon
                size="xl"
                class="ma-3"
                color="#b3d5e6"
                icon='square-xmark'
                @click="inIntro = !inIntro"
                @keyup.enter="inIntro = !inIntro"
                tabindex="0"
                tooltip-location="start"
              /> 
            </div>
            </template>

            <v-window-item :value="1"
              id="splash-screen"
            >
              <div
                id="first-splash-row"
              >
                <div id="splash-screen-text">
                  What Is in the Air You Breathe?
                </div>
                <div>
                  Explore daily pollution maps over North America and find out.
                </div>
              </div>

              <div>
                <v-btn
                  class="splash-get-started"
                  @click="introSlide++"
                  @keyup.enter="introSlide++"
                  :color="accentColor"
                  :density="display.smAndDown ? 'compact' : 'default'"
                  size="x-large"
                  variant="elevated"
                  rounded="lg"
                >
                  Get Started
                </v-btn>
              </div>
            
              <div id="splash-screen-acknowledgements">
                Brought to you by <a href="https://www.cosmicds.cfa.harvard.edu/" target="_blank" rel="noopener noreferrer">Cosmic Data Stories</a>.
                
                <div id="splash-screen-logos">
                  <a href="https://www.si.edu/" target="_blank" rel="noopener noreferrer"
                  ><img alt="Smithsonian Logo" src="220px-Smithsonian_sun_logo_no_text.svg.png"></a>
                  <credit-logos/>
                </div>
              </div>
            </v-window-item>
            
            <v-window-item :value="2">
              <div class="intro-text">
                <p class="mb-5">
                  The TEMPO satellite mission (Tropospheric Emissions: Monitoring Pollution), launched in April 2023, is the first space-based instrument to measure major air pollutants across the North American continent every daylight hour at high spatial resolution. A collaboration between NASA and the Smithsonian Astrophysical Observatory, the TEMPO instrument gathers hourly daytime scans of the atmosphere over North America from the Atlantic Ocean to the Pacific Coast and from the Yucatán Peninsula to central Canada.
                </p>
              </div>
            </v-window-item>
            
            <v-window-item :value="3">
              <div class="intro-text mb-3">
                <p class="mb-3">
                  This Data Story provides an introduction to what can be learned from TEMPO’s data, which became publicly available May 20, 2024. The map here visualizes hourly Nitrogen Dioxide (NO<sub>2</sub>) data over time. NO<sub>2</sub> can be produced by:
                </p> 
                <ul>
                  <li>Burning of fossil fuels&#8212;for example from vehicles, power plants, manufacturing sites, and oil refineries</li>
                  <li>Fires and biomass burning&#8212;including wildfires and prescribed burns, as well as burning of vegetation for land clearing</li>
                  <li>Bacteria, which naturally convert nitrogen in soil into compounds that can form NO<sub>2</sub>. Agricultural use of nitrogen-based fertilizers increases the amount of NO<sub>2</sub> produced by these bacteria.</li>
                  <li>Lightning, which triggers a chemical reaction that turns harmless N<sub>2</sub> in the atmosphere into NO<sub>2</sub>.
</li>
                </ul>
                <p class="mt-3">
                For each date, you can see the scans beginning on the East Coast in the morning, and ending on the West Coast as the Sun sets.
                </p> 
              </div>
            </v-window-item>
            <v-window-item :value="4">
              <div class="intro-text mb-3">      
                <p class="mb-3">
                  In this interactive page you can:
                </p>
                <ul>
                  <li>
                    Use the search box to navigate a location of your choice.
                  </li>
                  <li>
                    Select a date and press the “Play” button or scroll the time slider to view the changing concentrations of NO<sub>2</sub> on those dates. 
                  </li>
                  <li>
                    Click <v-icon style="color: #ffcc33">mdi-share-variant</v-icon> to share your selected location, date, and time with others.
                  </li>
                  <li v-bind:style="cssVars">
                    Press the <v-icon style="font-size: 1.3em; color: var(--accent-color)" elevation="1">mdi-information-variant-circle-outline</v-icon> button next to each Notable Date to get an overview of what to look for on that date
                  </li>
                  <li>
                    For each Notable Date, select one of two zoomed-in Locations to investigate specific pollution events.
                  </li>
                  <li>
                    You can use the “Timezone” setting to investigate how pollution evolves over the day in different parts of the country, for example as rush hour progresses in large cities.
                  </li>
                </ul>
                <!-- add do not show introduction again button -->
                <v-checkbox
                  v-model="dontShowIntro"
                  @keyup.enter="dontShowIntro = !dontShowIntro"
                  label="Don't show this introduction at launch"
                  color="#c10124"
                  hide-details
                />
              </div>
            </v-window-item>
          </v-window>

          <div id="intro-bottom-controls">
            <div>
              <v-btn
                v-if="(introSlide > 1)"
                id="intro-next-button"
                :color="accentColor"
                @click="introSlide--"
                @keyup.enter="introSlide--"
                elevation="0"
                >
                Back
              </v-btn>
            </div>
            
            <v-btn
              v-if="(introSlide > 1)"
              id="intro-next-button"
              :color="accentColor"
              @click="introSlide++"
              @keyup.enter="introSlide++"
              elevation="0"
              >
              {{ introSlide < 4 ? 'Next' : 'Get Started' }}
            </v-btn>
          </div>
        </div>
      </v-dialog>
    </v-overlay>
  <div
    id="main-content"
  > 
    <div class="content-with-sidebars">
      <!-- tempo logo -->
      <div id="logo-title">
      <a href="https://tempo.si.edu" target="_blank" rel="noopener noreferrer" >
        <img 
          src="./assets/TEMPO-Logo-Small.png"
          alt="TEMPO Logo"
          style="width: 100px; height: 100px;"
        >
      </a>

      <h1 id="title">What is in the Air You Breathe?</h1>
      <!-- <cds-dialog
        title="Time Series"
        v-model="samplesGraph"
        :color="accentColor2"
        draggable
        :scrim="false"
        :drag-predicate="(element: HTMLElement) => element.closest('.plotly') == null"
      >
        <timeseries-graph
          v-if="userSelections.length > 0"
          :data="userSelections"
        />
      </cds-dialog> -->

      <!-- </div> -->
      <cds-dialog title="What's new" v-model="showChanges" :color="accentColor2">
        <ul class="snackbar-alert-ul">
          <li class="change-item mb-5" v-for="change in changes" :key="change.date" :data-date="change.date">
            <span :style='{"font-weight":"bold", "color": `${change.highlight ? "var(--smithsonian-yellow)" : "currentColor"}` }'>{{ change.date }}</span><br> <span v-html="change.html">  </span>{{ change.text }}
          </li>
        </ul>
        <!-- <template v-slot:activator="{ onClick, id }">
          <v-btn :id="id" @click="onClick" color="primary">
            Custom Activator
          </v-btn>
        </template>  -->
      </cds-dialog>

      <div id="menu-area">
        <v-btn 
          v-if="(new Date('2025-05-7 00:00:00') > new Date())"
          class='whats-new-button pulse' 
          aria-label="What's new" 
          @click="showChanges = true" 
          @keyup.enter="showChanges = true" 
          variant="outlined" 
          rounded="lg" 
          :color="accentColor2" 
          elevation="0"
          size="lg"
          >
          <v-tooltip location="bottom" activator="parent" :disabled="mobile" text="What's new"></v-tooltip>
          <v-icon>mdi-creation</v-icon>
        </v-btn>
        <share-button
            :source="currentUrl"
            buttonColor="black"
            :iconColor="accentColor2"
            elevation="0"
            size="small"
            rounded="1"
            :tooltip-disabled="mobile"
            @click="shareButtonClickedCount += 1"
            alert
          />
        <v-btn aria-role="menu" aria-label="Show menu" class="menu-button" variant="outlined" rounded="lg" :color="accentColor2" elevation="5">
          <v-icon size="x-large">mdi-menu</v-icon>
          <v-menu
            activator="parent"
            >
            <v-list>
              <v-list-item 
                tabindex="0"
                aria-label="See recent changes"
                @click="showChanges = true"
                @keyup.enter="showChanges = true"
                >
                What's New
              </v-list-item>

              <v-list-item 
                tabindex="0" 
                aria-label="Show introduction"
                @click="() => {introSlide = 1; inIntro = true;}"
                @keyup.enter="() => {introSlide = 1; inIntro = true;}"
                >
                  Introduction
              </v-list-item>
              
              <v-list-item 
                tabindex="0"
                aria-label="Show user guide"
                @click="() => {introSlide = 4; inIntro = true;}"
                @keyup.enter="() => {introSlide = 4; inIntro = true;}"
                >
                User Guide
              </v-list-item>
              
              <v-list-item 
                tabindex="0"
                aria-label="Show dialog telling about the data"
                @click="showAboutData = true"
                @keyup.enter="showAboutData = true"
                >
                About the Data
              </v-list-item>
              
              <v-list-item 
                
                aria-label="Leave Page to Educator Resources"
                >
                <a style="font-weight: normal;" tabindex="0"  href="https://www.cosmicds.cfa.harvard.edu/resources/tempo" target="_blank" rel="noopener">Educator Resources<v-icon>mdi-open-in-new</v-icon></a>
              </v-list-item>
              
              <v-list-item 
                tabindex="0" 
                aria-label="Show credits"
                @click="showCredits = true"
                @keyup.enter="showCredits = true"
                >
                  Credits
              </v-list-item>
              
            </v-list>
          </v-menu>
        </v-btn>
      </div>
    </div>
    <div id="where" class="big-label">where</div>
      <div id="map-container">
        <colorbar-horizontal
          v-if="display.width.value <= 750"
          label="Amount of NO2"
          backgroundColor="transparent"
          :nsteps="255"
          :cmap="currentColormap"
          :cmapName="colorMap"
          :start-value="colorbarOptions[whichMolecule].stretch[0] / colorbarOptions[whichMolecule].cbarScale"
          :end-value="colorbarOptions[whichMolecule].stretch[1] / colorbarOptions[whichMolecule].cbarScale"
          :extend="true"
        >
        <template v-slot:label>
              <div v-if="Math.log10(colorbarOptions[whichMolecule].cbarScale) !== 0" style="text-align: center;">Amount of <span v-html="colorbarOptions[whichMolecule].label"></span><span class="unit-label">(10<sup>{{ Math.log10(colorbarOptions[whichMolecule].cbarScale)}}</sup> mol/cm<sup>2</sup>)</span></div>
              <div v-else style="text-align: center;">Amount of <span v-html="colorbarOptions[whichMolecule].label"></span><span class="unit-label"> molecules/cm<sup>2</sup></span></div>
        </template>
        </colorbar-horizontal>
        <v-card id="map-contents" style="width:100%; height: 100%;">
          <v-toolbar
            density="compact"
            color="var(--info-background)"
          >
            <v-toolbar-title :text="`TEMPO Data Viewer: ${mapTitle}`"></v-toolbar-title>
            <v-spacer></v-spacer>
            <v-tooltip :text="rectangleSelectionActive ? 'Cancel selection' : 'Select a region'">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-select"
                  :color="rectangleSelectionActive ? 'info' : 'default'"
                  :variant="rectangleSelectionActive ? 'tonal' : 'text'"
                  :disabled="pointSelectionActive"
                  @click="activateRectangleSelectionMode"
                ></v-btn>
              </template>
            </v-tooltip>
            <v-tooltip :text="pointSelectionActive ? 'Cancel selection' : 'Select a point'">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-plus"
                  :color="pointSelectionActive ? 'info' : 'default'"
                  :variant="pointSelectionActive ? 'tonal' : 'text'"
                  :disabled="rectangleSelectionActive"
                  @click="activatePointSelectionMode"
                ></v-btn>
              </template>
            </v-tooltip>
          </v-toolbar>
          <div id="map">
            <v-overlay
              :modelValue="loadingEsriTimeSteps"
              style="z-index: 1000;"
              class="align-center justify-center"
              contained
              opacity=".8"
              >
              <div id="loading-circle-progress-container" class="d-flex flex-column align-center justify-center ga-2">
                <label class="text-white" for="loading-circle-progress">Fetching time steps from NASA Earthdata GIS service...</label>
                <v-progress-circular
                  id="loading-circle-progress"
                  style="z-index: 1000;"
                  :size="100"
                  :width="15"
                  :indeterminate="loadingEsriTimeSteps"
                  color="#092088"
                >
                
              </v-progress-circular>
              </div>
            </v-overlay>
          </div>

          <div v-if="showFieldOfRegard" id="map-legend"><hr class="line-legend">TEMPO Field of Regard</div>
          <!-- show hide cloud data, disable if none is available -->

          <v-menu
            id="map-controls"
            v-model="showControls"
            :close-on-content-click="false"
          >
            <template v-slot:activator="{ props }">
              <div id="map-show-hide-controls">
                <v-btn
                  v-bind="props"
                  class="mx-2 mt-5"
                  elevation="2"
                  color="white"
                  icon
                  style="outline: 2px solid #b6b6b6;"
                  rounded="0"
                  size="x-small"
                >
                  <template v-slot:default>
                    <v-icon
                      color="black"
                      size="x-large"
                    >mdi-tune-variant</v-icon>
                  </template>
                </v-btn>
              </div>
            </template>
            <v-card class="controls-card">
              <font-awesome-icon
                style="position:absolute;right:16px;cursor:pointer"
                icon="square-xmark"
                size="xl"
                @click="showControls = false"
                @keyup.enter="showControls = false"
                :color="accentColor2"
                tabindex="0"
              ></font-awesome-icon>
              <div
                id="opacity-slider-container"
                class="mt-5"
              >
                <div id="opacity-slider-label">TEMPO data opacity</div>
                <v-slider
                    v-model="opacity"
                    :min="0"
                    :max="1"
                    color="#c10124"
                    density="compact"
                    hide-details
                    class="mb-4"
                    @end="onOpacitySliderEnd"
                  >
                </v-slider>
              </div>
              <div
                class="d-flex flex-row align-center justify-space-between"
              >
                <v-checkbox
                  v-model="showRoads"
                  @keyup.enter="showRoads = !showRoads"
                  label="Show Roads"
                  color="#c10124"
                  hide-details
                />
              </div>
              <div
                class="d-flex flex-row align-center justify-space-between"
              >
                <v-checkbox
                  v-model="showFieldOfRegard"
                  @keyup.enter="showFieldOfRegard = !showFieldOfRegard"
                  label="TEMPO Field of Regard"
                  color="#c10124"
                  hide-details
                />
                <info-button>
                  <p>
                    The TEMPO satellite observes the atmosphere over North America, from the Atlantic Ocean to the Pacific Coast, and from roughly Mexico City to central Canada. 
                  </p>
                  <p>
                    The TEMPO Field of Regard (in <span class="text-red">red</span>, currently <em>{{ showFieldOfRegard ? 'visible' : "hidden" }}</em>)
                    is the area over which the satellite takes measurements. 
                  </p>
                  </info-button>
                </div>
            </v-card>
          </v-menu>
          <div id="location-and-sharing">
          <location-search
            v-model="searchOpen"
            small
            stay-open
            buttonSize="xl"
            persist-selected
            :search-provider="geocodingInfoForSearchLimited"
            @set-location="setLocationFromSearch"
            @error="(error: string) => searchErrorMessage = error"
          ></location-search>
        </div>
        
        
        
        </v-card>
        <colorbar 
          v-if="display.width.value > 750"
          label="Amount of NO2"
          backgroundColor="transparent"
          :nsteps="255"
          :cmap="currentColormap"
          :cmapName="colorMap"
          :start-value="colorbarOptions[whichMolecule].stretch[0] / colorbarOptions[whichMolecule].cbarScale"
          :end-value="colorbarOptions[whichMolecule].stretch[1] / colorbarOptions[whichMolecule].cbarScale"
          :extend="true"
        >
          <template v-slot:label>
              <div v-if="Math.log10(colorbarOptions[whichMolecule].cbarScale) !== 0" style="text-align: center;">Amount of <span v-html="colorbarOptions[whichMolecule].label"></span><span class="unit-label">(10<sup>{{ Math.log10(colorbarOptions[whichMolecule].cbarScale)}}</sup> mol/cm<sup>2</sup>)</span></div>
              <div v-else style="text-align: center;">Amount of <span v-html="colorbarOptions[whichMolecule].label"></span><span class="unit-label"> (molecules/cm<sup>2</sup>)</span></div>
          </template>
        </colorbar>
        

      </div>
        <div id="when" class="big-label">when</div>
        <div id="slider-row">
          <v-slider
            class="time-slider"
            v-model="timeIndex"
            :min="minIndex"
            :max="maxIndex"
            :step="1"
            color="#068ede95"
            thumb-label="always"
            :track-size="10"
            show-ticks="always"
            hide-details
            @end="onTimeSliderEnd"
          >
            <template v-slot:thumb-label>
              <div class="thumb-label">
                {{ thumbLabel }}
              </div>
            </template>
          </v-slider>
          <icon-button
            id="play-pause"
            :fa-icon="playing ? 'pause' : 'play'"
            fa-size="sm"
            @activate="playing = !playing"
          ></icon-button>
        </div>

        <div id="side-panel">
          <div id="map-view">
            <h2>Map View</h2>
            <div class="mt-2">
              <h3>Select a Date</h3>
              <div class="d-flex flex-row align-center">
                <v-radio-group v-model="radio">
                  <date-picker
                    ref="calendar"
                    :model-value="singleDateSelected"
                    @internal-model-change="(value: Date) => {
                      if (value != null && value.getTime() != singleDateSelected.getTime()) {
                        radio = null;
                        singleDateSelected = value;
                        calendar?.closeMenu();
                      }
                    }"
                    :allowed-dates="uniqueDays"
                    :clearable="false"
                    :enable-time-picker="false"
                    :multi-dates="false"
                    :transitions="false"
                    :format="(date: Date | null) => date?.toDateString()"
                    :preview-format="(date: Date | null) => date?.toDateString()"
                    no-today
                    dark
                  >
                    <template #action-buttons>
                      <button
                        class="dp__action_button dp__action-latest"
                        @click="() => singleDateSelected = uniqueDays[uniqueDays.length - 1]"
                        @keyup.enter="() => singleDateSelected = uniqueDays[uniqueDays.length - 1]"
                        :disabled="singleDateSelected === uniqueDays[uniqueDays.length - 1]"
                        elevation="0"
                        size="sm"
                      >
                        Latest
                    </button>
                    </template>
                    <!-- <template #action-extra="{ selectCurrentDate }">
                    
                    </template> -->
                  </date-picker>
                  <!-- time chips to select time specifically for esri times -->
                  <time-chips
                    v-if="whichMolecule.toLowerCase().includes('month')"
                    :timestamps="esriTimesteps"
                    @select="handleEsriTimeSelected($event.value, $event.index)"
                    reverse
                    use-utc
                    date-only
                  />
                </v-radio-group>
              </div>        
              <!-- add buttons to increment and decrement the singledateselected -->
              <div class="d-flex flex-row align-center my-2">
                <v-tooltip :disabled="touchscreen" text="Previous Date">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      class="rounded-icon-wrapper"
                      @click="moveBackwardOneDay"
                      @keyup.enter="moveBackwardOneDay"
                      :disabled="singleDateSelected === uniqueDays[0]"
                      color="#009ade"
                      variant="outlined"
                      elevation="0"
                      size="md"
                    >
                      <v-icon>mdi-chevron-double-left</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-spacer></v-spacer>
                <v-tooltip :disabled="touchscreen" text="Get Data for latest available day">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      style="padding-inline: 4px;"
                      @click="() => singleDateSelected = uniqueDays[uniqueDays.length - 1]"
                      @keyup.enter="() => singleDateSelected = uniqueDays[uniqueDays.length - 1]"
                      :disabled="singleDateSelected === uniqueDays[uniqueDays.length - 1]"
                      color="#009ade"
                      variant="outlined"
                      elevation="0"
                      size="md"
                    >
                      Latest Data
                    </v-btn>
                  </template>
                </v-tooltip>
                <v-spacer></v-spacer>
                <v-tooltip :disabled="touchscreen" text="Next Date">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      class="rounded-icon-wrapper"
                      @click="moveForwardOneDay"
                      @keyup.enter="moveForwardOneDay"
                      :disabled="singleDateSelected === uniqueDays[uniqueDays.length - 1]"
                      color="#009ade"
                      variant="outlined"
                      elevation="0"
                      size="md"
                    >
                      <v-icon>mdi-chevron-double-right</v-icon>
                    </v-btn>
                  </template>
                </v-tooltip>
              </div>

            </div>
            <v-select
              v-model="selectedTimezone"
              label="Timezone"
              :items="timezoneOptions"
              item-title="name"
              item-value="tz"
              hide-details
              dense
              class="mt-3 pl-3"
            ></v-select>
            <v-select
              v-model="whichMolecule"
              :items="MOLECULE_OPTIONS"
              item-title="title"
              item-value="value"
              label="Molecule / Quantity"
              hide-details
              dense
              class="mt-3 pl-3"
            ></v-select>
          </div>

          <div id="dataset-sections">
            <div id="add-region-time">
              <h2>Add Region/Time Range</h2>  
              <v-expansion-panels
                v-model="openPanels"
                variant="accordion"
                id="user-options-panels"
                multiple
                class="pl-3"
              >
                <v-expansion-panel
                  title="Regions"
                  class="mt-3"
                >
                  <template #text>
                    <div id="add-region-buttons">
                      <v-btn
                        size="small"
                        :active="rectangleSelectionActive"
                        :disabled="pointSelectionActive"
                        @click="() => {
                          if (rectangleSelectionActive) {
                            rectangleSelectionActive = false;
                          } else {
                            createNewSelection('rectangle');
                          }
                        }"
                      >
                        <template #prepend>
                          <v-icon v-if="!rectangleSelectionActive" icon="mdi-select"></v-icon>
                        </template>
                        {{ rectangleSelectionActive ? "Cancel" : "Add Region" }}
                      </v-btn>
                      <v-btn
                        size="small"
                        :active="pointSelectionActive"
                        :disabled="rectangleSelectionActive"
                        @click="() => {
                          if (pointSelectionActive) {
                            pointSelectionActive = false;
                          } else {
                            createNewSelection('point');
                          }
                        }"
                      >
                        <template #prepend>
                          <v-icon v-if="!pointSelectionActive" icon="mdi-plus"></v-icon>
                        </template>
                        {{ pointSelectionActive ? "Cancel" : "Add Point" }}
                      </v-btn>
                    </div>
                    <v-list>
                      <v-list-item
                        v-for="(region, index) in availableRegions"
                        :key="index"
                        :title="region.name"
                        :style="{ 'background-color': region.color }"
                      >
                        <template #append>
                          <!-- New: Edit Geometry button (disabled if any selection using region has samples) -->
                          <!-- <v-btn
                            variant="plain"
                            :icon="region.geometryType === 'rectangle' ? 'mdi-select' : 'mdi-plus'"
                            color="white"
                            :disabled="regionHasSamples(region as UnifiedRegionType)"
                            v-tooltip="regionHasSamples(region as UnifiedRegionType) ? 'Cannot edit geometry after samples are fetched for a selection using this region' : 'Edit Geometry'"
                            @click="() => editRegionGeometry(region as UnifiedRegionType)"
                          ></v-btn> -->
                          <v-btn
                            
                            variant="plain"
                            v-tooltip="'Edit Name'"
                            icon="mdi-pencil"
                            color="white"
                            @click="() => editRegionName(region as UnifiedRegionType)"
                          ></v-btn>
                          <v-btn
                            variant="plain"
                            v-tooltip="'Delete'"
                            icon="mdi-delete"
                            color="white"
                            @click="() => deleteRegion(region as UnifiedRegionType)"
                          ></v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                  </template>
                </v-expansion-panel>
                <v-expansion-panel
                  title="Date/Time Range"
                  class="mt-3"
                >
                  <template #text>
                    <v-btn
                      size="small"
                      :active="createTimeRangeActive"
                      @click="createTimeRangeActive = !createTimeRangeActive"
                    >
                      <template #prepend>
                        <v-icon v-if="!createTimeRangeActive" icon="mdi-plus"></v-icon>
                      </template>
                      {{ createTimeRangeActive ? "Cancel" : "Create Time Range" }}
                    </v-btn>
                    <date-time-range-selection
                      v-if="createTimeRangeActive"
                      :current-date="singleDateSelected"
                      :selected-timezone="selectedTimezone"
                      :allowed-dates="uniqueDays"
                      @ranges-change="handleDateTimeRangeSelectionChange"
                    />
                    <v-list>
                      <v-list-item
                        v-for="(timeRange, index) in availableTimeRanges"
                        :key="index"
                        :title="timeRange.name"
                        :subtitle="timeRange.description"
                      ></v-list-item>
                    </v-list>
                  </template>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>

            <div id="selections">
              <h2>Create a Dataset</h2>
              <v-btn
                size="small"
                :active="createSelectionActive"
                @click="createSelectionActive = !createSelectionActive"
                class="mt-3 ml-3"
              >
                <template #prepend>
                  <v-icon v-if="!createSelectionActive" icon="mdi-plus"></v-icon>
                </template>
                {{ createSelectionActive ? "Cancel" : "New Dataset" }}
              </v-btn>
              <selection-composer
                v-show="createSelectionActive"
                :backend="BACKEND"
                :time-ranges="availableTimeRanges"
                :regions="availableRegions"
                :disabled="{ region: rectangleSelectionActive, point: pointSelectionActive, timeRange: createTimeRangeActive }"
                @create="handleSelectionCreated"
                :tempo-data-service="tempoDataService"
              >
              </selection-composer>
              <div id="sample-info" v-if="selections.length>0" style="margin-top: 1em;" class="pl-3">

                <h3>My Datasets</h3>
                <v-list>
                  <v-hover
                    v-slot="{ isHovering, props }"
                    v-for="sel in selections"
                    :key="sel.id"
                  >
                    <v-list-item
                      v-bind="props"
                      class="selection-item"
                      :title="sel.name"
                      :style="{ 'background-color': `rgb(from ${sel.region.color} r g b / 0.35)` }"
                      :ripple="touchscreen"
                      @click="() => {
                        if (touchscreen) {
                          openSelection = (openSelection == sel.id) ? null : sel.id;
                        }
                      }"
                      lines="two"
                    >
                      <template #subtitle>
                        <v-chip>{{ moleculeName(sel.molecule) }}</v-chip>
                        <v-chip v-if="sel.timeRange" class="text-caption">
                          {{ sel.timeRange.description }}
                        </v-chip>
                      </template>
                      <template #default>
                        <v-expand-transition>
                          <div
                            class="selection-icons"
                            v-show="touchscreen ? openSelection == sel.id : isHovering"
                          >
                            <v-tooltip
                              text="Change Selection Name"
                              location="top"
                            >
                              <template #activator="{ props }">
                                <v-btn
                                  v-bind="props"
                                  size="x-small"
                                  icon="mdi-pencil"
                                  @click="() => editSelectionName(sel)"
                                  variant="plain"
                                ></v-btn>
                              </template>
                            </v-tooltip>
                            <v-tooltip
                              text="Get Center Point Sample"
                              location="top"
                            >
                              <template #activator="{ props }">
                                <v-btn
                                  v-bind="props"
                                  size="x-small"
                                  :loading="loadingPointSample === sel.name"
                                  icon="mdi-image-filter-center-focus"
                                  variant="plain"
                                  @click="() => fetchCenterPointDataForSelection(sel)"
                                ></v-btn>
                              </template>
                            </v-tooltip> 
                            <v-tooltip
                              text="Show table"
                              location="top"
                            >
                              <template #activator="{ props }">
                                <v-btn
                                  v-bind="props"
                                  size="x-small"
                                  icon="mdi-table"
                                  :disabled="!sel.samples"
                                  variant="plain"
                                  @click="() => tableSelection = sel"
                                ></v-btn>
                              </template>
                            </v-tooltip>
                            <v-tooltip
                              text="Show graph"
                              location="top"
                            >
                              <template #activator="{ props }">
                                <v-btn
                                  v-bind="props"
                                  size="x-small"
                                  icon="mdi-chart-line"
                                  :disabled="!sel.samples"
                                  variant="plain"
                                  @click="() => graphSelection = sel"
                                ></v-btn>
                              </template>
                            </v-tooltip>
                            <v-tooltip
                              text="Remove selection"
                              location="top"
                            >
                              <template #activator="{ props }">
                                <v-btn
                                  v-bind="props"
                                  size="x-small"
                                  icon="mdi-trash-can"
                                  variant="plain"
                                  @click="() => deleteSelection(sel)"
                                ></v-btn>
                              </template>
                            </v-tooltip>
                          </div>
                        </v-expand-transition>
                      </template>
                    </v-list-item>
                  </v-hover>
                </v-list>

                <cds-dialog
                  :title="graphSelectionTitle"
                  v-model="showGraph"
                  title-color="#F44336"
                >
                  <v-checkbox
                    v-model="showErrorBands"
                    label="Show Errors"
                    density="compact"
                    hide-details
                  >
                  </v-checkbox>
                  <timeseries-graph
                    :data="graphSelection ? [graphSelection] : []"
                    :show-errors="showErrorBands"
                  />
                </cds-dialog>
              </div>
            </div>
          </div>
          
          <v-btn v-if="no2GraphData.length > 0" @click="showNO2Graph = true">
          Show NO₂ Graph
        </v-btn>
        <cds-dialog
          title="Nitrogen Dioxide Data"
          v-model="showNO2Graph"
        >
          <v-checkbox
            v-model="showErrorBands"
            label="Show Errors"
            density="compact"
            hide-details
          >
          </v-checkbox>
          <timeseries-graph
            :data="no2GraphData.length > 0 ? no2GraphData : []"
            :show-errors="showErrorBands"
          />
        </cds-dialog>

        <v-btn v-if="o3GraphData.length > 0" @click="showO3Graph = true">
          Show Ozone Graph
        </v-btn>
        <cds-dialog
          title="Ozone Data"
          v-model="showO3Graph"
        >
          <v-checkbox
            v-model="showErrorBands"
            label="Show Errors"
            density="compact"
            hide-details
          >
          </v-checkbox>
          <timeseries-graph
            :data="o3GraphData.length > 0 ? o3GraphData : []"
            :show-errors="showErrorBands"
          />
        </cds-dialog>
        
        <v-btn v-if="hchoGraphData.length > 0" @click="showHCHOGraph = true">
          Show Formaldehyde Graph
        </v-btn>
        <cds-dialog
          title="Formaldehyde Data"
          v-model="showHCHOGraph"
        >
          <v-checkbox
            v-model="showErrorBands"
            label="Show Errors"
            density="compact"
            hide-details
          >
          </v-checkbox>
          <timeseries-graph
            :data="hchoGraphData.length > 0 ? hchoGraphData : []"
            :show-errors="showErrorBands"
          />
        </cds-dialog>
        
        
        <v-dialog
          v-model="showEditSelectionNameDialog"
          >
          <v-card
            class="mx-auto px-3 py-2"
            min-width="300px"
            width="50%"
          >
            <v-card-title>New Name</v-card-title>
            <v-text-field
              label="Selection Name"
              hide-details
              dense
              @update:model-value="(val: string) => {
                setSelectionName(selection as UserSelectionType, val);
              }"
            ></v-text-field>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                :color="accentColor"
                variant="flat"
                @click="showEditSelectionNameDialog = false"
              >Done</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        
        <v-dialog
          v-model="showEditRegionNameDialog"
          >
          <v-card
            class="mx-auto px-3 py-2"
            min-width="300px"
            width="50%"
          >
            <v-card-title>New Name</v-card-title>
            <v-text-field
              label="Region Name"
              hide-details
              dense
              @update:model-value="(val: string) => {
                setRegionName(regionBeingEdited as UnifiedRegionType, val);
              }"
            ></v-text-field>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                :color="accentColor"
                variant="flat"
                @click="showEditRegionNameDialog = false"
              >Done</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

          <div id="bottom-options">
            <br>
              <cds-dialog
                v-model="showUserGuide"
                title="User Guide"
                color="var(--tempo-red)"
                button
                >
                <UserGuide/>
              </cds-dialog>
          </div>
        
        </div>
      

        <cds-dialog 
          title="NO₂ Samples" 
          v-model="showTable"
          >
          <div 
            v-if="loadingSamples === 'loading'" 
            >Loading rectangle samples...
            <v-progress-linear
              indeterminate
              height="20"
            >
            </v-progress-linear>
          </div>

          <div v-if="tableSelection">
            <div v-if="sampleErrors[tableSelection.id]" class="text-red">Error: {{ sampleErrors[tableSelection.id] }}</div>
            <SampleTable :samples="tableSelection.samples ?? null" :error="sampleErrors[tableSelection.id]" />
            <div v-if="loadingPointSample === 'loading'" class="mt-2">Loading center point sample...</div>
            <div v-if="pointSampleErrors[tableSelection.id]" class="mt-2 text-red">Error: {{ pointSampleErrors[tableSelection.id] }}</div>
            <SampleTable :samples="pointSampleResults[tableSelection.id]" :error="pointSampleErrors[tableSelection.id]" />
            <div v-if="pointSampleResults[tableSelection.id] && Object.keys(pointSampleResults[tableSelection.id] ?? {}).length === 0" class="mt-2">No data for this point/time.</div>
          </div>
        </cds-dialog>
        
        

      <div id="information">
        <div id="body-logos">
          <a href="https://www.si.edu/" target="_blank" rel="noopener noreferrer" class="mr-1" 
          ><img alt="Smithsonian Logo" src="./assets/smithsonian.png"
            /></a>
          <credit-logos/>
        </div>
      </div>
      
    </div>
  </div>

  <!-- Data collection opt-out dialog -->
    <v-dialog
      scrim="false"
      v-model="showPrivacyDialog"
      max-width="400px"
      id="privacy-popup-dialog"
    >
      <v-card>
        <v-card-text>
          To evaluate usage of this app, <strong>anonymized</strong> data may be collected, including locations viewed and map quiz responses. "My Location" data is NEVER collected.
        </v-card-text>
        <v-card-actions class="pt-3">
          <v-spacer></v-spacer>
          <v-btn
            color="#BDBDBD"
            href="https://www.cfa.harvard.edu/privacy-statement"
            target="_blank"
            rel="noopener noreferrer"
          >
          Privacy Policy
          </v-btn>
          <v-btn
            color="#ff6666"
            @click="() => {
              responseOptOut = true;
              showPrivacyDialog = false;
            }"
          >
          Opt out
          </v-btn>
          <v-btn 
            color="green"
            @click="() => {
              responseOptOut = false;
              showPrivacyDialog = false;
            }"
          >
            Allow
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


</v-app>
</template>
  
<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { API_BASE_URL, blurActiveElement } from "@cosmicds/vue-toolkit";
import { useDisplay } from 'vuetify';
import { DatePickerInstance } from "@vuepic/vue-datepicker";
import { v4 } from "uuid";
import { getTimezoneOffset } from "date-fns-tz";
// import { cbarNO2 } from "./revised_cmap";
import { colormap } from "./colormaps/utils";
import { MapBoxFeature, MapBoxFeatureCollection, geocodingInfoForSearch } from "./mapbox";
import changes from "./changes";
import { useBounds } from './composables/useBounds';
import { interestingEvents } from "./interestingEvents";
import { LatLngPair, InitMapOptions, RectangleSelectionInfo, PointSelectionInfo, PointSelection, RectangleSelection, MappingBackends, TimeRange, UserSelection } from "./types";
import type { MillisecondRange } from "./types/datetime";
import UserGuide from "./components/UserGuide.vue";
import SampleTable from "./components/SampleTable.vue";
import { atleast1d } from "./utils/atleast1d";
import { formatTimeRange } from "./utils/timeRange";

import { useUniqueTimeSelection } from "./composables/useUniqueTimeSelection";

import DateTimeRangeSelection from "./date_time_range_selection/DateTimeRangeSelection.vue";
import TimeChips from "./components/TimeChips.vue";
// Import Leaflet Composables
// import { useMap } from "./composables/leaflet/useMap";
// import { usezoomhome } from './composables/leaflet/useZoomHome';
// import { useImageOverlay } from "./composables/leaflet/useImageOverlay";
// import { useFieldOfRegard} from "./composables/leaflet/useFieldOfRegard";
// import { useLocationMarker } from "./composables/leaflet/useMarker";
// import { useRectangleSelection } from "./composables/leaflet/useRectangleSelection";
// import { addRectangleLayer, updateRectangleBounds, removeRectangleLayer } from "./composables/leaflet/utils";
// import { useMultiMarker } from './composables/leaflet/useMultiMarker';
// import { useEsriLayer } from "./esri/leaflet/useEsriImageLayer";
// const zoomScale = 1; 

// Import Maplibre Composables
import { useMap } from "./composables/maplibre/useMap";
import { usezoomhome } from './composables/maplibre/useZoomHome';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useImageOverlay } from "./composables/maplibre/useImageOverlay";
import { useFieldOfRegard} from "./composables/maplibre/useFieldOfRegard";
import { useLocationMarker } from "./composables/maplibre/useMarker";
import { useRectangleSelection } from "./composables/maplibre/useRectangleSelection";
import { addRectangleLayer, updateRectangleBounds, removeRectangleLayer } from "./composables/maplibre/utils";
import { usePointSelection } from "./composables/maplibre/usePointSelection";
import { addPointLayer, updatePointLocation, removePointLayer } from "./composables/maplibre/utils";
import { useMultiMarker } from './composables/maplibre/useMultiMarker';
import { useEsriLayer } from "./esri/maplibre/useEsriImageLayer";
const zoomScale = 0.5; // for matplibre-gl
// import { useEsriLayer } from "./esri/maplibre/useEsriImageLayerPlain"; // do not use


const BACKEND: MappingBackends = "maplibre" as const;

type RectangleSelectionType = RectangleSelection<typeof BACKEND>;
type PointSelectionType = PointSelection<typeof BACKEND>;
type UnifiedRegionType = RectangleSelectionType | PointSelectionType;


import { TempoDataService } from "./esri/services/TempoDataService";



// const zoomScale = 0.5; // for maplibre-gl


const display = useDisplay();
const calendar = ref<DatePickerInstance | null>(null);
type SheetType = "text" | "video" | null;
type Timeout = ReturnType<typeof setTimeout>;


/**************
 * UI Setup
 *************/
// const hash = window.location.hash;
const urlParams = new URLSearchParams(window.location.search);
const showSplashScreen = ref(new URLSearchParams(window.location.search).get("splash")?.toLowerCase() !== "false");
const hideIntro = "true";
const WINDOW_DONTSHOWINTRO = hideIntro ? true : window.localStorage.getItem("dontShowIntro") === 'true';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore --> msPointerEnabled may not be defined in window.navigator
const touchscreen = ref(('ontouchstart' in window) || ('ontouchstart' in document.documentElement) || !!window.navigator.msPointerEnabled);



const STORY_VISIT_URL = `${API_BASE_URL}/tempo-lite/visit`;
function pingServer(venue: string) {

  fetch(STORY_VISIT_URL, {
    
    method: "POST",
    
    headers: {
      "Content-Type": "application/json",
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Authorization": process.env.VUE_APP_CDS_API_KEY ?? ''
    },
    
    body: JSON.stringify({
      info: { venue }
    })
    
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Error pinging server", response.status, response.statusText);
      } 
    }).
    catch((error) => {
      console.error("Error pinging server", error);
    });
}

const venue = (urlParams.get("venue") ?? '').replace(/,/g, '-');

if (venue !== '') {
  // get current value of venue
  const venues =  window.localStorage.getItem("venues") ?? '';
  // if they haven't visited this venue before, ping the server & save it
  if (!venues.includes(venue)) {
    pingServer(venue);
    window.localStorage.setItem("venues", venues ? `${venues},${venue}` : venue);
  }
}


function clearUrl(hash = false) {
  const newUrl = location.origin + location.pathname + (hash ? location.hash : '');
  window.history.replaceState({}, '', newUrl);
}
clearUrl(true);


const introSlide = ref(1);
const inIntro = ref(!WINDOW_DONTSHOWINTRO);
const dontShowIntro = ref(WINDOW_DONTSHOWINTRO);
const showNotice = ref(true);
const sheet = ref<SheetType>(null);
const accentColor = ref("#068ede");
const accentColor2 = ref("#ffcc33");

let hasOptOutBeenOpened = false;
const introductionOpen = computed(() => inIntro.value && (introSlide.value === 1));
const userGuideOpen = computed(() => inIntro.value && (introSlide.value === 4));

let whatsNewOpenedCount = 0;
let whatsNewTimestamp = null as number | null;
let whatsNewOpenTimeMs = 0;
let introductionOpenedCount = 0;
let introductionTimestamp = null as number | null;
let introductionOpenTimeMs = 0;
let userGuideOpenedCount = 0;
let userGuideTimestamp = null as number | null;
let userGuideOpenTimeMs = 0;
let aboutDataOpenedCount = 0;
let aboutDataTimestamp = null as number | null;
let aboutDataOpenTimeMs = 0;
let creditsOpenedCount = 0;
let creditsTimestamp = null as number | null;
let creditsOpenTimeMs = 0;
let shareButtonClickedCount = 0;
let playButtonClickedCount = 0;
let timeSliderUsedCount = 0;
let opacitySliderUsedCount = 0;
let fieldOfRegardToggled = false;
let cloudMaskToggled = false;
let hiResDataToggled = false;

let userSelectedCalendarDates: number[] = [];
let userSelectedTimezones: string[] = [];
let userSelectedLocations: string[] = [];
let userSelectedNotableEvents: [string, string][] = [];

const STORY_DATA_URL = `${API_BASE_URL}/tempo-lite/data`;
const OPT_OUT_KEY = "tempo-lite-optout" as const;
const UUID_KEY = "tempo-lite-uuid" as const;
const _storedOptOut = window.localStorage.getItem(OPT_OUT_KEY);
const maybeUUID = window.localStorage.getItem(UUID_KEY);
const optOut = true; //typeof storedOptOut === "string" ? storedOptOut === "true" : null;
const showPrivacyDialog = ref(false);
const responseOptOut = ref(optOut);
const existingUser = maybeUUID !== null;
const uuid = maybeUUID ?? v4();
if (!existingUser) {
  window.localStorage.setItem(UUID_KEY, uuid);
}

function selectSheet(name: SheetType) {
  if (sheet.value === name) {
    sheet.value = null;
    nextTick(() => {
      blurActiveElement();
    });
  } else {
    sheet.value = name;
  }
}

const showTextSheet = computed({
  get() {
    return sheet.value === 'text';
  },
  set(_value: boolean) {
    selectSheet('text');
  }
});

const infoColor = "#092088";
const cssVars = computed(() => {
  return {
    '--accent-color': accentColor.value,
    '--accent-color-2': accentColor2.value,
    '--app-content-height': showTextSheet.value ? '66%' : '100%',
    '--info-background': infoColor,
  };
});

const smallSize = computed(() => {
  return display.smAndDown.value;
});

const mobile = computed(() => {
  return smallSize.value && touchscreen.value;
});


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function zpad(n: number, width: number = 2, character: string = "0"): string {
  return n.toString().padStart(width, character);
}

/************
 * TIMESTAMP SETUP
 ************/
import { AllAvailableColorMaps } from "./colormaps";
import { ESRI_URLS, MOLECULE_OPTIONS, MoleculeType } from "./esri/utils";

const initialDate = new Date();
const timestamps = ref<number[]>([initialDate.getTime()]); // we need _something_ so that downstream steps have valid dates to initialize with. 
const {
  timeIndex,
  timestamp,
  date,
  singleDateSelected,
  maxIndex,
  minIndex,
  uniqueDays,
  uniqueDaysIndex,
  setNearestDate,
  moveBackwardOneDay,
  moveForwardOneDay,
  nearestDateIndex } = useUniqueTimeSelection(timestamps);

const timestampsLoaded = ref(false);
const timestampsSet = ref(new Set(timestamps.value));
// append and Set timestamps
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function appendTimestamps(newTimestamps: number[][]) {
  if (newTimestamps.length > 0) {
    timestamps.value = timestamps.value.concat(...newTimestamps).sort();
    timestampsSet.value = new Set(timestamps.value);
  }
}



/************
 * INITIAL LOCATIONS SETUP
 ************/


const initLat = parseFloat(urlParams.get("lat") || '40.044');
const initLon = parseFloat(urlParams.get("lon") || '-98.789');
const initZoom = parseFloat(urlParams.get("zoom") || `${4 * zoomScale}`); // 4 is the default zoom level for the map, multiplied by zoomScale for maplibre
const initTime = urlParams.get("t");
const initState = ref<InitMapOptions>({
  loc: [initLat, initLon] as LatLngPair,
  zoom: initZoom,
  t: initTime ? +initTime : null
});


const homeLat = 40.044;
const homeLon = -98.789;
const homeZoom = 4 * zoomScale; // 4 is the default zoom level for the map, multiplied by zoomScale for maplibre
const homeState = ref({
  loc: [homeLat, homeLon] as LatLngPair,
  zoom: homeZoom,
  t: null as number | null
});


const radio = ref<number | null>(null);
const sublocationRadio = ref<number | null>(null);


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { currentBounds: imageBounds } = useBounds(date);





const selectedTimezone = ref("US/Eastern");
const playing = ref(false);
const playInterval = ref<Timeout | null>(null);
const searchOpen = ref(true);
const searchErrorMessage = ref<string | null>(null);
const showControls = ref(false);
const showCredits = ref(false);
const showAboutData = ref(false);
const showUserGuide = ref(false);

const showLocationMarker = ref(true);
const currentUrl = ref(window.location.href);
const showChanges = ref(false);






const showClouds = ref(false);
const opacity = ref(0.9);

// const cloudOverlay = useImageOverlay(cloudUrl, opacity, imageBounds, 'cloud-overlay');
// const imageOverlay = useImageOverlay(imageUrl, opacity, imageBounds, 'image-overlay');


const whichMolecule = ref<MoleculeType>('no2');

function moleculeName(molecule: MoleculeType): string {
  return MOLECULE_OPTIONS.find(m => m.value == molecule)?.title ?? "";
}

const mapTitle = computed(() => {
  const currentMolecule = MOLECULE_OPTIONS.find(m => m.value === whichMolecule.value);
  if (!currentMolecule) {
    return '';
  }
  return currentMolecule.title;
});

import { stretches, colorramps } from "./esri/ImageLayerConfig";

const colorbarOptions = {
  'no2': {stretch: stretches['NO2_Troposphere'], cbarScale: 1e14, colormap: colorramps['NO2_Troposphere'] + '_r', label:'NO<sub>2</sub>&nbsp;&nbsp;'},
  'no2Monthly': {stretch: stretches['NO2_Troposphere'], cbarScale: 1e14, colormap: colorramps['NO2_Troposphere'] + '_r', label: 'NO<sub>2</sub>&nbsp;&nbsp;'},
  'no2DailyMax': {stretch: stretches['NO2_Troposphere'], cbarScale: 1e14, colormap: colorramps['NO2_Troposphere'] + '_r', label: 'NO<sub>2</sub>&nbsp;&nbsp;'},
  'o3': {stretch: stretches['Ozone_Column_Amount'], cbarScale: 1, colormap: colorramps['Ozone_Column_Amount'] + '_r', label: 'Ozone&nbsp;'},
  'hcho': {stretch: stretches['HCHO'], cbarScale: 1e14, colormap: colorramps['HCHO'] + '_r', label: 'Formaldehyde&nbsp;&nbsp;'},
  'hchoMonthly': {stretch: stretches['HCHO'], cbarScale: 1e14, colormap: colorramps['HCHO'] + '_r', label: 'Formaldehyde&nbsp;&nbsp;'},
  'hchoDailyMax': {stretch: stretches['HCHO'], cbarScale: 1e14, colormap: colorramps['HCHO'] + '_r', label: 'Formaldehyde&nbsp;&nbsp;'},
};




// computed
const esriUrl = computed(() => {
  return ESRI_URLS[whichMolecule.value].url;
});
const esriVariable = computed(() => {
  return ESRI_URLS[whichMolecule.value].variable;
});

// Create TempoDataService instance
const tempoDataService = new TempoDataService(esriUrl.value, esriVariable.value);


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const {getEsriTimeSteps, loadingEsriTimeSteps, addEsriSource, esriTimesteps, changeUrl, renderOptions} = useEsriLayer(
  esriUrl.value,
  esriVariable.value,
  timestamp,
  opacity,
);
getEsriTimeSteps();
watch(esriTimesteps, (newSteps, _oldSteps) => {
  if (newSteps.length > 0) {
    timestamps.value = newSteps.sort();
  }
});
// renderOptions.value.colormap = 'Plasma';

function handleEsriTimeSelected(timestamp:number, _index: number) {
  const idx = timestamps.value.indexOf(timestamp);
  console.log(`ESRI time selected: ${new Date(timestamp)} (nearest index ${idx})`);
  if (idx >= 0) {
    timeIndex.value = idx;
  }
  singleDateSelected.value = new Date(timestamp);
}

watch(whichMolecule, (newMolecule) => {
  changeUrl(ESRI_URLS[newMolecule].url, ESRI_URLS[newMolecule].variable);
  // Update TempoDataService with new URL and variable
  tempoDataService.setBaseUrl(ESRI_URLS[newMolecule].url);
  tempoDataService.setVariable(ESRI_URLS[newMolecule].variable);
  getEsriTimeSteps();
  console.log(colorbarOptions[newMolecule].colormap.toLowerCase());
  colorMap.value = colorbarOptions[newMolecule].colormap.toLowerCase();
});

const onMapReady = (map) => {
  map.on('moveend', updateURL);
  map.on('zoomend', updateURL);
  addEsriSource(map);
};
const showRoads = ref(true);
const { map, createMap, setView } = useMap("map", initState.value, showRoads, onMapReady);

const { 
  addFieldOfRegard,
  showFieldOfRegard,
  updateFieldOfRegard 
} = useFieldOfRegard(singleDateSelected, map);

const {
  setMarker,
  removeMarker,
  locationMarker
} = useLocationMarker(map,  showLocationMarker.value);


const regions = ref<UnifiedRegionType[]>([]);
let selectionCount = 0;

// Selections now are UserSelection objects directly
type UserSelectionType = UserSelection;
const selections = ref<UserSelectionType[]>([]);
const selection = ref<UserSelectionType | null>(null);
const tableSelection = ref<UserSelectionType | null>(null);
const graphSelection = ref<UserSelectionType | null>(null);

const showTable = computed({
  get() {
    return tableSelection.value != null;
  },
  set(value: boolean) {
    if (!value) {
      tableSelection.value = null;
    }
  }
});

const showGraph = computed({
  get() {
    return graphSelection.value != null;
  },
  set(value: boolean) {
    if (!value) {
      graphSelection.value = null;
    }
  }
});

const graphSelectionTitle = computed(() => {
  if (!graphSelection.value) {
    return '';
  }
  const molecule = graphSelection.value.molecule;
  const title = MOLECULE_OPTIONS.find(m => m.value === molecule)?.title || '';
  return `${title} Time Series for ${graphSelection.value.name}`;
});

const showNO2Graph = ref(false);
const no2GraphData = computed(() =>{
  return selections.value.filter(s => s.molecule.includes('no2') && selectionHasSamples(s));
});

// ozone version
const showO3Graph = ref(false);
const o3GraphData = computed(() =>{
  return selections.value.filter(s => s.molecule.includes('o3') && selectionHasSamples(s));
});

// formaldehyde version
const showHCHOGraph = ref(false);
const hchoGraphData = computed(() =>{
  return selections.value.filter(s => s.molecule.includes('hcho') && selectionHasSamples(s));
});

const showErrorBands = ref(true);

const selectedIndex = computed({
  get() {
    const selectedID = selection.value?.id;
    const idx = selections.value.findIndex(s => s.id == selectedID);
    return idx >= 0 ? idx : null;
  },
  set(index: number | null) {
    if (typeof index === "number") {
      selection.value = selections.value[index] ?? null;
    } else {
      selection.value = null;
    }
  }
});

function setSelection(sel: UserSelectionType | null) {
  if (sel === null) {
    selection.value = null;
    selectedIndex.value = null;
    return null;
  }
  const idx = selections.value.findIndex(s => s.id === sel.id);
  if (idx == -1) {
    // must already be in selections, so throw an error if that is not true
    throw new Error(`Selection with ID ${sel.id} and name ${sel.name} not found in selections.`);
  }
  selection.value = selections.value[idx];
  selectedIndex.value = idx;
  return selection.value;
}

function addUserSelection(sel: UserSelectionType) {
  selections.value = [...selections.value, sel];
  return sel;
}

function handleSelectionCreated(sel: UserSelectionType) {
  addUserSelection(sel);
  setSelection(sel);
  createSelectionActive.value = false;
}

// Track total created selections for unique naming
// Removed timeRangeCount/timeRangeNameMap and dedup logic; we'll just append custom ranges and always keep a current day option.
let timeRangeCount = 0;

// Simple deterministic color palette (unused in composition now but kept for future region coloring if needed)
// const okabeAndItoColorblindSafeColors = ['#D55E00', '#56B4E9', '#F0E442', '#009E73', '#E69F00', '#0072B2', '#CC79A7',];

const paulTolMutedColorblindSafeColors = ['#CC6677', '#332288', '#117733', '#882255', '#44aa99', '#999933', '#aa4499',];

const COLORS = [
  ...paulTolMutedColorblindSafeColors, '#e6194b', '#3cb44b', '#4363d8', '#911eb4', '#46f0f0',
  '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8',
  '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080', '#ffffff',
  '#000000'
];

// implement rectangle and point
const { active: rectangleSelectionActive, selectionInfo: rectangleInfo } = useRectangleSelection(map, "red");
const { active: pointSelectionActive, selectionInfo: pointInfo } = usePointSelection(map, false);

const loadingSamples = ref<string | false>(false);

const createTimeRangeActive = ref(false);
const createSelectionActive = ref(false);
const openPanels = ref<number[]>([]);
const openSelection = ref<string | null>(null);

const testErrorAmount = 0.25e15;
const _testError = { lower: testErrorAmount, upper: testErrorAmount };

const sampleErrors = ref<Record<string, string | null>>({});
const pointSampleErrors = ref<Record<string, string | null>>({});
const pointSampleResults = ref<Record<string, Record<number, { value: number | null; date: Date }> | null>>({});
const loadingPointSample = ref<string | false>(false);

// UI state for time range management

const useCustomTimeRange = ref(true); // Binary choice: false = current day, true = custom range

// Store markers for timeseries locations
const timeseriesMarkerApi = useMultiMarker(map, {
  shape: 'circle',
  color: '#ff0000',
  fillColor: '#ff0000',
  fillOpacity: 0.8,
  opacity: 1,
  radius: 1,
  outlineColor: '#ff0000',
});

const showDataSamplingMarkers = ref(true);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clearTimeseriesMarkers() {
  timeseriesMarkerApi.clearMarkers();
}

const samplingPreviewMarkers = useMultiMarker(map, {
  shape: 'circle',
  color: '#0000ff',
  fillColor: '#0000ff',
  fillOpacity: 0.5,
  opacity: 1,
  radius: 1,
  outlineColor: '#0000ff',
  label: 'predicted-samples-locations'
});


watch([showDataSamplingMarkers, () => selections.value.map(s => selectionHasSamples(s))], (newVal) => {
  if (!newVal[0]) {
    clearTimeseriesMarkers();
  }
  if (newVal[0]) {
    const locations = selections.value
      .filter(sel => selectionHasSamples(sel))
      .map(sel => sel.locations ?? [])
      .flat();
    
    timeseriesMarkerApi.addMarkers(locations);
  }
  
});

import { EsriSampler } from "./esri/services/sampling";
const showSamplingPreviewMarkers = ref(true);
// const sampler = new EsriSampler( tempoDataService.meta,);
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const sampler =  ref<EsriSampler>(null);
tempoDataService.withMetadataCache().then(meta => {
  sampler.value = new EsriSampler(meta);
});
watch([showSamplingPreviewMarkers, regions], (newVal) => {
  const show = newVal[0];
  const regs = newVal[1];
  samplingPreviewMarkers.clearMarkers();
  let locations: {x: number, y:number}[] = [];
  if (sampler.value && show && regs.length > 0) {
    regs.forEach(r => {
      if (r.geometryType === 'rectangle') {
        sampler.value.setGeometry(r.geometryInfo);
        if (tempoDataService.meta) {
          sampler.value.setMetadata(tempoDataService.meta);
        }
        locations = [...locations, ...sampler.value.getSampleLocationsGrid(maxSampleCount.value)];
        // samplingPreviewMarkers.addMarkers(locations);
      }
    });
    samplingPreviewMarkers.addMarkers(locations);
  }
  
});

function selectionHasSamples(sel: UserSelectionType): boolean {
  return (sel.samples !== undefined) && Object.keys(sel.samples).length > 0;
}

// Type Guards
function isRectangleSelection(selection: UnifiedRegionType): selection is RectangleSelectionType {
  return selection.geometryType === 'rectangle';
}

function isPointSelection(selection: UnifiedRegionType): selection is PointSelectionType {
  return selection.geometryType === 'point';
}

function regionHasSamples(region: UnifiedRegionType): boolean {
  const sel = selections.value.find(s => s.region.id === region.id);
  if (!sel) {
    return false;
  }
  return selectionHasSamples(sel);
}


// Replace primitive customTimeRange with TimeRange object
// OLD:
// const customTimeRange = ref<MillisecondRange | MillisecondRange[] | null>(null);
const customTimeRange = ref<TimeRange | null>(null);

// Add TimeRange object support for custom time ranges, update handler to accept (ranges, selectionType), name and describe new custom ranges, and adjust dependent logic.
function handleDateTimeRangeSelectionChange(timeRanges: MillisecondRange[], selectionType?: string) {
  if (!Array.isArray(timeRanges) || timeRanges.length === 0) {
    console.error('No time ranges received from DateTimeRangeSelection');
    return;
  }
  const normalized = atleast1d(timeRanges);
  // No dedup tracking now
  // Build description based on selection type
  let descriptionBase = 'Custom';
  switch (selectionType) {
  case 'weekday':
    descriptionBase = 'Weekday Pattern';
    break;
  case 'daterange':
    descriptionBase = 'Date Range';
    break;
  case 'singledate':
    descriptionBase = 'Single Date';
    break;
  }
  const description = `${descriptionBase} (${formatTimeRange(normalized)})`;
  timeRangeCount += 1;
  const tr: TimeRange = {
    id: v4(),
    name: `Custom Range ${timeRangeCount}`,
    description,
    range: normalized.length === 1 ? normalized[0] : normalized
  };
  customTimeRange.value = tr;
  useCustomTimeRange.value = true;
  // Add to available list if new (compare by serialized range key)
  availableTimeRanges.value.push(tr); // always append

  createTimeRangeActive.value = false;
  console.log(`Registered ${tr.name}: ${tr.description}`);
}

// Selection management handlers
function activateRectangleSelectionMode() {
  rectangleSelectionActive.value = !rectangleSelectionActive.value;
}

function activatePointSelectionMode() {
  pointSelectionActive.value = !pointSelectionActive.value;
}

// clear all the data from the current selection
// This is not used right now, but it is useful to have
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clearSelectionSamples(sel: UserSelectionType) {
  sel.samples = undefined;
  sel.errors = undefined;
}

// edit the region of the given selection.
function _editRegionGeometry(region: UnifiedRegionType) {
  if (regionHasSamples(region)) {
    return;
  }
  regionBeingEdited.value = region;
  if (isRectangleSelection(region)) {
    rectangleSelectionActive.value = true;
  } else if (isPointSelection(region)) {
    pointSelectionActive.value = true;
  }
  console.log(`Editing geometry for ${region.geometryType}: ${region.name}`);
}

const showEditSelectionNameDialog = ref(false);
function editSelectionName(sel: UserSelectionType | null) {
  if (sel === null) {
    console.error("Cannot edit name of a null selection.");
    return;
  }
  // Set the selection to edit
  setSelection(sel);
  
  // Open dialog for renaming
  showEditSelectionNameDialog.value = true;
}

function setSelectionName(sel: UserSelectionType, newName: string) {
  if (newName.trim() === '') {
    console.error("Selection name cannot be empty.");
    return;
  }
  const existing = selections.value.find(s => s.name === newName && s.id !== sel.id);
  if (existing) {
    console.error(`A selection with the name "${newName}" already exists.`);
    return;
  }
  sel.name = newName;
  console.log(`Renamed selection to: ${newName}`);
}

function createNewSelection(geometryType: 'rectangle' | 'point') {
  // Clear current selection to force new selection creation
  setSelection(null);
  rectangleSelectionActive.value = geometryType === 'rectangle';
  pointSelectionActive.value = geometryType === 'point';
}

// 30 is the value we have been using
const maxSampleCount = ref(30);



// New: fetch data for composed UserSelection
// fetchDataForSelection already handles UserSelection

async function fetchCenterPointDataForSelection(sel: UserSelectionType) {
  loadingSamples.value = sel.name;
  sampleErrors.value[sel.id] = null;
  
  const timeRanges = atleast1d(sel.timeRange.range);
  
  try {
    tempoDataService.setBaseUrl(ESRI_URLS[sel.molecule].url);
    const data = await tempoDataService.fetchCenterPointData(
      sel.region.geometryInfo,
      timeRanges,
      { sampleCount: maxSampleCount.value }
    );
    if (data) {
      sel.samples = data.values;
      sel.locations = data.locations;
      loadingSamples.value = "finished";
      console.log(`Fetched center point data for ${timeRanges.length} time range(s)`);
    }
  } catch (error) {
    sampleErrors.value[sel.id] = error instanceof Error ? error.message : String(error);
    loadingSamples.value = "error";
  }
}


function createDraftSelection(info: RectangleSelectionInfo | PointSelectionInfo, geometryType: 'rectangle' | 'point') {
  const color = COLORS[selectionCount % COLORS.length];
  selectionCount += 1;
  
  const isRect = geometryType === 'rectangle';
  const { layer } = isRect ? 
    addRectangleLayer(map.value!, info as RectangleSelectionInfo, color)
    : addPointLayer(map.value!, info as PointSelectionInfo, color);


  const newSelection = {
    id: v4(),
    name: `${isRect ? 'Region' : 'Point'} ${selectionCount}`,
    geometryInfo: info,
    geometryType: geometryType,
    color,
    layer: layer
  } as UnifiedRegionType;
  
  regions.value = [...regions.value, newSelection];
  console.log(`Created ${geometryType} ${newSelection.name}`);
}



const availableRegions = computed(() => regions.value);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const availableMolecules = computed(() => MOLECULE_OPTIONS.map(o => ({ key: o.value as MoleculeType, title: o.title })));
// Time ranges maintained as a list of TimeRange objects
const availableTimeRanges = ref<TimeRange[]>([]);

// Dedup helper removed (no longer needed)

// dedup avaialbeTimeRange and add in the effective time range (which is an old way of storing the current time range)
// Always-present current day option at index 0
const currentDayTimeRange = computed<TimeRange>(() => {
  const offset = getTimezoneOffset(selectedTimezone.value, singleDateSelected.value);
  const day = singleDateSelected.value.getTime() - offset;
  const start = day - (day % 86400000) - offset; // Start of the day in milliseconds
  const end = start + (86400000 - 1); // End of the day in milliseconds
  return {
    id: 'current-day',
    name: 'Current Day',
    description: `Current Day (${new Date(start).toLocaleDateString()})`,
    range: { start, end }
  };
});

watch(currentDayTimeRange, (val) => {
  // console.log(singleDateSelected.value, getTimezoneOffset(selectedTimezone.value, singleDateSelected.value), val,);
  if (!availableTimeRanges.value.length) {
    availableTimeRanges.value.push(val);
  } else {
    availableTimeRanges.value[0] = val;
  }
}, { immediate: true });


// Options for time range dropdown sourced from availableTimeRanges (TimeRange objects)
const timeRangeOptions = computed(() => availableTimeRanges.value.map(tr => ({ title: tr.description || tr.name, value: tr.range })));

watch(timeRangeOptions, (newOptions,) => {
  // Log the change in time range options
  console.log(`Time range options changed:`, newOptions);
});

watch(selections, (newSelections, oldSelections) => {
  // just log out the length difference
  console.log(`Selections changed: ${oldSelections.length} -> ${newSelections.length}`);
});

const showEditRegionNameDialog = ref(false);
const regionBeingEdited = ref<UnifiedRegionType | null>(null);
function editRegionName(region: UnifiedRegionType) {
  console.log(`Editing ${region.geometryType}: ${region.name}`);
  // Set the region to edit
  const existing = (regions.value as UnifiedRegionType[]).find(r => r.id === region.id);
  if (!existing) {
    console.error(`Selection with ID ${region.id} not found.`);
    return;
  }
  regionBeingEdited.value = region;
  // Open dialog for renaming
  showEditRegionNameDialog.value = true;
}
function setRegionName(region: UnifiedRegionType, newName: string) {
  if (newName.trim() === '') {
    console.error("Region name cannot be empty.");
    return;
  }
  const existing = (regions.value as UnifiedRegionType[]).find(r => r.name === newName && r.id !== region.id);
  if (existing) {
    console.error(`A region with the name "${newName}" already exists.`);
    return;
  }
  region.name = newName;
  console.log(`Renamed ${region.geometryType} region to: ${newName}`);
}

function deleteRegion(region: UnifiedRegionType) {
  const index = regions.value.findIndex(r => r.id === region.id);
  if (index < 0) {
    return;
  }
  if (map.value && region.layer) {
    if (isRectangleSelection(region)) {
      removeRectangleLayer(map.value, region.layer);
    } else if (isPointSelection(region)) {
      removePointLayer(map.value, region.layer);
    }
  }
  regions.value.splice(index, 1);
}

function deleteSelection(sel: UserSelectionType) {
  const index = selections.value.findIndex(s => s.id == sel.id);
  if (index < 0) {
    return;
  }
  const isSelected = selectedIndex.value === index;
  // if (map.value && sel.region.layer) {
  //   removeRectangleLayer(map.value, sel.region.layer);
  // }
  selections.value.splice(index, 1);
  if (isSelected) {
    if (index > 0) {
      selection.value = selections.value[index - 1];
    } else if (selections.value.length > 0) { 
      selection.value = selections.value[0];
    } else {
      selection.value = null;
    }
  }
}



onMounted(() => {
  showSplashScreen.value = false;
  createMap();
  
  usezoomhome(map, homeState.value.loc, homeState.value.zoom, (_e: Event) => {
    sublocationRadio.value = null;
    // check if location marker is not null and on map. if so remove it
    if (locationMarker.value !== null) {
      removeMarker();
    }
  });

  
  singleDateSelected.value = uniqueDays.value[uniqueDays.value.length - 1];
  
  updateFieldOfRegard();
  addFieldOfRegard();

  createUserEntry();
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      updateUserData();
    } else {
      resetData();
    }
  });
  
});



const datesOfInterest = computed(() => {
  return interestingEvents.map(event => event.date);
});

const dateIsDST = computed(() => {
  const standardOffset = getTimezoneOffset(selectedTimezone.value, new Date(date.value.getUTCFullYear(), 0, 1));
  const currentOffset = getTimezoneOffset(selectedTimezone.value, date.value);
  if (standardOffset === currentOffset) {
    return false;
  }
  return true;
});

const timezoneOptions = computed(() => {
  return [
    { tz: 'US/Eastern', name: dateIsDST.value ? 'Eastern Daylight' : 'Eastern Standard' },
    { tz: 'US/Central', name: dateIsDST.value ? 'Central Daylight' : 'Central Standard' },
    { tz: 'US/Mountain', name: dateIsDST.value ? 'Mountain Daylight' : 'Mountain Standard' },
    { tz: 'US/Arizona', name: 'Mountain Standard' },
    { tz: 'US/Pacific', name: dateIsDST.value ? 'Pacific Daylight' : 'Pacific Standard' },
    { tz: 'US/Alaska', name: dateIsDST.value ? 'Alaska Daylight' : 'Alaska Standard' },
    { tz: 'UTC', name: 'UTC' },
  ];
});

// TODO: Maybe there's a built-in Date function to get this formatting?
const thumbLabel = computed(() => {
  const offset = getTimezoneOffset(selectedTimezone.value, date.value);
  const dateObj = new Date(timestamp.value + offset);
  const hours = dateObj.getUTCHours();
  const amPm = hours >= 12 ? "PM" : "AM";
  let hourValue = hours % 12;
  if (hourValue === 0) {
    hourValue = 12;
  }
  return `${date.value.getUTCMonth() + 1}/${dateObj.getUTCDate()}/${dateObj.getUTCFullYear()} ${hourValue}:${dateObj.getUTCMinutes().toString().padStart(2, '0')} ${amPm}`;
});




function updateURL() {
  if (map.value) {
    const center = map.value.getCenter();
    let stateObj = null as Record<string, string> | null;
    stateObj = {
      lat: `${center.lat.toFixed(4)}`,
      lon: `${center.lng.toFixed(4)}`,
      zoom: `${map.value.getZoom()}`,
      t: `${timestamp.value}`
    };
    const url = new URL(location.origin);
    const searchParams = new URLSearchParams(stateObj ?? {});
    // const hash = window.location.hash;
    // url.hash = hash;
    url.pathname = location.pathname;
    window.history.replaceState(null, '', url.toString());
    url.search = searchParams.toString();
    currentUrl.value = url.toString();
    // window.history.replaceState(stateObj, '', url);
  }
}


const colorMap = ref<AllAvailableColorMaps>('None');
colorMap.value = colorbarOptions[whichMolecule.value].colormap.toLowerCase();


const currentColormap = computed(() => {return (x: number): string => {
  // const rgb = cbarNO2(0, 1, x);
  const rgb = colormap(colorMap.value, 0 ,1 ,x);
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]},1)`;
};
});

async function geocodingInfoForSearchLimited(searchText: string): Promise<MapBoxFeatureCollection | null> {
  return geocodingInfoForSearch(searchText, {
    countries: ["US", "CA", "MX", "CU", "BM", "HT", "DO"],
    limit: 10,
  }).catch(_err => null);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resetMapBounds() {
  setView([40.044, -98.789] as LatLngPair, 4);
}

function setLocationFromSearch(items: [MapBoxFeature | null, string]) {
  const [feature, text] = items;
  if (feature !== null) {
    // Latitude, Longitude order
    const coordinates: LatLngPair = [feature.center[1], feature.center[0]] as LatLngPair;
    setView(coordinates, 12);
    setMarker(coordinates);
    userSelectedLocations.push(text);
  }
}

function play() {
  playInterval.value = setInterval(() => {
    if (timeIndex.value >= maxIndex.value) {
      if (playInterval.value) {
        // clearInterval(this.playInterval);
        // this.playInterval = null;
        // let it loop
        timeIndex.value = minIndex.value;
      }
    } else {
      timeIndex.value += 1;
    }
  }, 1000);
}


function pause() {
  if (playInterval.value) {
    clearInterval(playInterval.value);
  }
}










const locationsOfInterest = ref<Array<Array<{ latlng: LatLngPair; zoom: number; index?: number }>>>([]);
function goToLocationOfInterst(index: number, subindex: number) {
  if (index < 0 || index >= locationsOfInterest.value.length) {
    console.error('Invalid index for location of interest');
    return;
  }
  const loi = locationsOfInterest.value[index][subindex];
  setView(loi.latlng, loi.zoom * zoomScale); // Adjust zoom level for maplibre
  if (loi.index !== undefined) {
    timeIndex.value = loi.index;
  } else {
    console.error('No index found for location of interest');
  }
}


function onTimeSliderEnd(_value: number) {
  timeSliderUsedCount += 1; 
}

function onOpacitySliderEnd(_value: number) {
  opacitySliderUsedCount += 1;
}

async function createUserEntry() {
  if (responseOptOut.value) {
    return;
  }

  const response = await fetch(`${STORY_DATA_URL}/${uuid}`, {
    method: "GET",
    // eslint-disable-next-line @typescript-eslint/naming-convention
    headers: { "Authorization": process.env.VUE_APP_CDS_API_KEY ?? "" }
  });
  const content = await response.json();
  const exists = response.status === 200 && content.response?.user_uuid != undefined;
  if (exists) {
    return;
  }

  fetch(`${STORY_DATA_URL}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Authorization": process.env.VUE_APP_CDS_API_KEY ?? "",
    },
    body: JSON.stringify({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      user_uuid: uuid,
    }),
  });
}

function resetData() {
  whatsNewOpenedCount = 0;
  introductionOpenedCount = 0;
  userGuideOpenedCount = 0;
  aboutDataOpenedCount = 0;
  creditsOpenedCount = 0;
  shareButtonClickedCount = 0;
  playButtonClickedCount = 0;
  timeSliderUsedCount = 0;
  opacitySliderUsedCount = 0;
  userSelectedCalendarDates = [];
  userSelectedTimezones = [];
  userSelectedLocations = [];
  userSelectedNotableEvents = [];

  aboutDataOpenTimeMs = 0;
  userGuideOpenTimeMs = 0;
  introductionOpenTimeMs = 0;
  whatsNewOpenTimeMs = 0;
  creditsOpenTimeMs = 0;
  fieldOfRegardToggled = false;
  cloudMaskToggled = false;
  hiResDataToggled = false;

  const now = Date.now();
  creditsTimestamp = showCredits.value ? now : null;
  aboutDataTimestamp = showAboutData.value ? now : null;
}

async function updateUserData() {
  if (responseOptOut.value) {
    return;
  }

  const now = Date.now();
  const creditsTime = (showCredits.value && creditsTimestamp !== null) ? now - creditsTimestamp : creditsOpenTimeMs;
  const aboutDataTime = (showAboutData.value && aboutDataTimestamp !== null) ? now - aboutDataTimestamp: aboutDataOpenTimeMs;
  const whatsNewTime = (showChanges.value && whatsNewTimestamp !== null) ? now  - whatsNewTimestamp : whatsNewOpenTimeMs;
  const introductionTime = (introductionOpen.value && introductionTimestamp !== null) ? now - introductionTimestamp : introductionOpenTimeMs;
  const userGuideTime = (userGuideOpen.value && userGuideTimestamp !== null) ? now - userGuideTimestamp : userGuideOpenTimeMs;

  fetch(`${STORY_DATA_URL}/${uuid}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Authorization": process.env.VUE_APP_CDS_API_KEY ?? "",
    },
    body: JSON.stringify({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_whats_new_opened_count: whatsNewOpenedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_whats_new_open_time_ms: whatsNewTime,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_introduction_opened_count: introductionOpenedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_introduction_open_time_ms: introductionTime,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_user_guide_opened_count: userGuideOpenedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_user_guide_open_time_ms: userGuideTime,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_about_data_opened_count: aboutDataOpenedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_about_data_open_time_ms: aboutDataTime,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_credits_opened_count: creditsOpenedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_credits_open_time_ms: creditsTime,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_share_button_clicked_count: shareButtonClickedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      user_selected_calendar_dates: userSelectedCalendarDates,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      user_selected_timezones: userSelectedTimezones,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      user_selected_locations: userSelectedLocations,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      user_selected_notable_events: userSelectedNotableEvents,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_play_clicked_count: playButtonClickedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_time_slider_used_count: timeSliderUsedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      delta_opacity_slider_used_count: opacitySliderUsedCount,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      field_of_regard_toggled: fieldOfRegardToggled,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      cloud_mask_toggled: cloudMaskToggled,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      high_res_data_toggled: hiResDataToggled,
    }),
    keepalive: true,
  }).then(() => {
    resetData();
  });
}

watch(timestampsLoaded, (loaded: boolean) => {
  if (loaded) {
    console.log('timestamps loaded');
    if (initState.value.t) {
      let index = uniqueDaysIndex(initState.value.t);
      if (index == -1) {
        return;
      }
      console.log('set the date');
      singleDateSelected.value = uniqueDays.value[index];
      index = nearestDateIndex(new Date(initState.value.t));
      if (index == -1) {
        return;
      }
      timeIndex.value = index;
      // FIXME if needed. if we find the time is not being set, use nextTick
      // this.$nextTick(() => { this.timeIndex = index;});
    }
  }
});

watch(timestamp, (_val: number) => {
  updateURL();
});

watch(introSlide, (val: number) => {
  inIntro.value = val < 5;
});

watch(dontShowIntro, (val: boolean) => {
  window.localStorage.setItem("dontShowIntro", val.toString());
  if (!val) {
    inIntro.value = true;
  }
});

watch(inIntro, (value: boolean) => {
  if (!value) {
    if (responseOptOut.value === null && !hasOptOutBeenOpened) {
      showPrivacyDialog.value = true;
    }
  }
});

watch(showPrivacyDialog, (show: boolean) => {
  if (show) {
    hasOptOutBeenOpened = true;
  }
});

watch(responseOptOut, (optOut: boolean | null) => {
  if (responseOptOut.value !== null) {
    window.localStorage.setItem(OPT_OUT_KEY, String(optOut));
  }
});



watch(playing, (val: boolean) => {
  if (val) {
    play();
    playButtonClickedCount += 1;
  } else {
    pause();
  }
});


watch(showFieldOfRegard, (_show: boolean) => {
  fieldOfRegardToggled = true;
});

watch(showClouds, (_show: boolean) => {
  cloudMaskToggled = true;
});

watch(showLocationMarker, (show: boolean) => {
  if (locationMarker.value) {
    if (show && map.value) {
      locationMarker.value.addTo(map.value);
      return;
    } else {
      locationMarker.value.remove();
      return;
    }
  }
});

watch(timestamps, () => {
  singleDateSelected.value = uniqueDays.value[uniqueDays.value.length - 1];
});

watch(radio, (value: number | null) => {
  if (value == null) {
    setNearestDate(singleDateSelected.value.getTime());
    sublocationRadio.value = null;
    return;
  }
  const date = datesOfInterest.value[value] ?? singleDateSelected.value;
  singleDateSelected.value = date;
  setNearestDate(date.getTime());
  if (sublocationRadio.value == 0 && value !== null) {
    // run this manually as the watcher wouldn't trigger
    goToLocationOfInterst(value, 0);
  } else {
    sublocationRadio.value = 0;
  }
});

watch(singleDateSelected, (value: Date) => {
  // console.log(`singleDateSelected ${value}`);
  const timestamp = value.getTime();
  setNearestDate(timestamp);
  if (radio.value !== null) {
    const index = datesOfInterest.value.map(d => d.getTime()).indexOf(timestamp);
    radio.value = index < 0 ? null : index;
  }
});

watch(sublocationRadio, (value: number | null) => {
  if (value !== null && radio.value != null) {
    goToLocationOfInterst(radio.value, value);
  }
});


watch(showChanges, (_value: boolean) => {
  if (showNotice.value) {
    showNotice.value = false;
  }
});



watch(showChanges, (show: boolean) => {
  const now = Date.now();
  if (show) {
    whatsNewTimestamp = now;
    whatsNewOpenedCount += 1;
  } else if (whatsNewTimestamp !== null) {
    whatsNewOpenTimeMs += (now - whatsNewTimestamp);
    whatsNewTimestamp = null;
  }
});

watch(showAboutData, (show: boolean) => {
  const now = Date.now();
  if (show) {
    aboutDataTimestamp = now;
    aboutDataOpenedCount += 1;
  } else if (aboutDataTimestamp !== null) {
    aboutDataOpenTimeMs += (now - aboutDataTimestamp);
    aboutDataTimestamp = null;
  }
});

watch(showCredits, (show: boolean) => {
  const now = Date.now();
  if (show) {
    creditsTimestamp = now;
    creditsOpenedCount += 1;
  } else if (creditsTimestamp !== null) {
    creditsOpenTimeMs += (now - creditsTimestamp);
    creditsTimestamp = null;
  }
});

watch(introductionOpen, (open: boolean) => {
  const now = Date.now();
  if (open) {
    introductionTimestamp = now;
    introductionOpenedCount += 1;
  } else if (introductionTimestamp !== null) {
    introductionOpenTimeMs += (now - introductionTimestamp);
    introductionTimestamp = null;
  }
});

watch(userGuideOpen, (open: boolean) => {
  const now = Date.now();
  if (open) {
    userGuideTimestamp = now;
    userGuideOpenedCount += 1;
  } else if (userGuideTimestamp !== null) {
    userGuideOpenTimeMs += (now - userGuideTimestamp);
    userGuideTimestamp = null;
  }
});

watch(selectedTimezone, (timezone: string) => {
  userSelectedTimezones.push(timezone);
});

watch(singleDateSelected, (date: Date) => {
  if (!timestampsLoaded.value ) return;
  userSelectedCalendarDates.push(date.getTime());
});

watch(openPanels, (open: number[]) => {
  if (!open.includes(0)) {
    createTimeRangeActive.value = false;
  }
  if (!open.includes(1)) {
    rectangleSelectionActive.value = false;
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleSelectionRegionEdit(info: RectangleSelectionInfo) { 

  // Update the existing selection
  const currentSelection = selections.value[selectedIndex.value];
  currentSelection.region.geometryInfo = info;
  currentSelection.samples = undefined; // Clear existing data
  // explicit type
  const rect = currentSelection.region.layer as RectangleSelectionType['layer'];
  if (rect) {
    updateRectangleBounds(rect, info);
  }
    
  console.log(`Updated existing selection: ${currentSelection.name} (time range unchanged)`);
}

function handleRegionEdit(info: RectangleSelectionInfo | PointSelectionInfo) {
  if (regionBeingEdited.value) {
    regionBeingEdited.value.geometryInfo = info;
    const layer = regionBeingEdited.value.layer;
    if (layer) {
      if (isRectangleSelection(regionBeingEdited.value as UnifiedRegionType)) {
        updateRectangleBounds(layer as RectangleSelectionType['layer'], info as RectangleSelectionInfo);
      } else if (isPointSelection(regionBeingEdited.value as UnifiedRegionType)) {
        updatePointLocation(layer as PointSelectionType['layer'], info as PointSelectionInfo);
      }
    }
    console.log(`Updated ${regionBeingEdited.value.geometryType}: ${regionBeingEdited.value.name}`);
  } else {
    console.error('No selection is currently being edited.');
  }
  showEditRegionNameDialog.value = false;
  regionBeingEdited.value = null;
}

watch(rectangleInfo, (info: RectangleSelectionInfo | null) => {
  if (info === null || map.value === null) {
    return;
  }
  const canCreate = (selection.value === null || selectedIndex.value === null) && !regionBeingEdited.value;
  if (canCreate) {
    createDraftSelection(info, 'rectangle');
    rectangleSelectionActive.value = false;
  } else {
    handleRegionEdit(info);
  }
  
  // do not permit editing a region on a selection
  // handleSelectionRegionEdit(info);
  

});

// Add watcher for point selection
watch(pointInfo, (info: PointSelectionInfo | null) => {
  if (info === null || map.value === null) {
    return;
  }
  const canCreate = (selection.value === null || selectedIndex.value === null) && !regionBeingEdited.value;
  if (canCreate) {
    createDraftSelection(info, 'point');
    pointSelectionActive.value = false;
  } else {
    handleRegionEdit(info);
  }
});

// Watch for time range mode changes and update custom time range if needed
watch(useCustomTimeRange, (useCustom) => {
  console.log(`Time range mode changed to: ${useCustom ? 'Custom Range' : 'Current Day'}`);
  if (useCustom && !customTimeRange.value) {
    // If switching to custom but no custom range is set, set a default
    const start = singleDateSelected.value.setHours(0, 0, 0, 0);
    const end = singleDateSelected.value.setHours(23, 59, 59, 999);
    customTimeRange.value = {
      id: v4(),
      name: `Time Range ${timeRangeCount}`,
      description: `Current Day (${new Date(start).toLocaleDateString()})`,
      range: [{ start, end }]
    };
  }
});
</script>
  
<style lang="less">
@font-face {
  font-family: "Highway Gothic Narrow";
  src: url("./assets/HighwayGothicNarrow.ttf");
}

// import Lexand from google fonts
// @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&display=swap');

:root {
  // font-size: clamp(14px, 1.7vw, 16px);
  // --default-font-size: 1rem; // we don't use this
  font-size: 16px; // this is the standard browser default
  --default-line-height: clamp(1rem, min(2.2vh, 2.2vw), 1.6rem); // we don't use this
  --smithsonian-blue: #009ade;
  --smithsonian-yellow: #ffcc33;
  --info-background: #092088;
  --map-height: 500px;
  --tempo-red: #b60e32;
}

.dp__theme_dark {
  --dp-primary-text-color: #fff !important; // selected date text
  --dp-primary-color: var(--accent-color) !important; // selected date background
}

.dp__month_year_select,
.dp__calendar_item {
  color: #97c8f1 !important; // selectable date text & Month/Year
  font-weight: 800 !important;
}

.dp__cell_disabled {
  color: #888 !important;
  font-weight: 400;
}

button.dp__action-latest {
  color: white;
  background: var(--dp-primary-color);
}

button.dp__action-latest[disabled] {
  background: var(--dp-disabled-color);
  color: #ccc;
  
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
  overflow: hidden;


  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    width: 0;
    height: 0
  }
}

body {
  position: fixed;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: auto;

  font-family: Verdana, Arial, Helvetica, sans-serif;
}

a {
  text-decoration: none;
  color: var(--smithsonian-yellow);
}

ul {
  margin-left: 1rem;
}

#intro-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 100;
}

.gradient-background {
  // rotated translucent background gradient
  background: linear-gradient(45deg,
      rgb(14, 30, 40),
      rgb(22, 50, 65),
      rgb(30 70 90));
}

#introduction-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  height: fit-content;
  // outline: 5px solid var(--accent-color);
  border-radius: 1em;
  z-index: 1000;

  @media (max-width: 700px) {
    width: 95%;
    padding: 3em 1em 1em;
  }

  @media (min-width: 701px) {
    width: 75%;
    padding: 3em 2em 2em;
  }

  .span-accent {
    color: var(--accent-color);
  }


  //font-size: calc(1.1 * var(--default-font-size));
  // line-height: var(--default-line-height);

  .v-list-item {
    color: #eee;
  }

  .intro-text {
    color: white;
    font-size: 1em;
    line-height: 1.5em;
  }

  strong {
    color: white;
  }

  div#intro-bottom-controls {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;

    gap: 1em;
    margin-top: 0.5em;

    .v-btn.v-btn--density-default {
      max-height: calc(1.6 * var(--default-line-height));
    }

    .v-btn--size-default {
      font-size: calc(0.9 * var(--default-font-size));
    }

    #intro-next-button {
      background-color: rgba(18, 18, 18, .5);
    }
  }
}

#privacy-popup-dialog {

  .v-card-text {
    color: #BDBDBD;
  }

  .v-overlay__content {
    font-size: var(--default-font-size);
    background-color: purple;
    position: absolute;
    bottom: 0;
    right: 0;
  }

  .v-btn--size-default {
      font-size: calc(0.9 * var(--default-font-size));
    }  

  .v-card-actions .v-btn {
    padding: 0 4px;
  }
}

#splash-screen {
  color: #E0E0E0;

  justify-content: space-around;
  align-content: center;
  padding-top: 4rem;
  padding-bottom: 1rem;

  font-family: 'Highway Gothic Narrow', 'Roboto', sans-serif;

  div {
    margin-inline: auto;
    text-align: center;
  }

  // make a paragraph inside the div centered horizontally and vertically
  p {
    font-family: 'Highway Gothic Narrow', 'Roboto', sans-serif;
    font-weight: bold;
    vertical-align: middle;
  }

  #first-splash-row {
    width: 100%;
    font-size: 1.25em;
  }

  #splash-screen-text {
    // in the grid, the text is in the 2nd column
    display: flex;
    flex-direction: column;
    line-height: 130%;
    font-size: 2em;
    color: var(--smithsonian-yellow);
  }

  .splash-get-started {
    border: 2px solid white;
    font-size: 1.5em;
    margin-top: 10%;
    margin-bottom: 2%;
    font-weight: bold !important;
  }

  #splash-screen-acknowledgements {
    margin-top: 3rem;
    font-size: calc(1.7 * var(--default-font-size));
    line-height: calc(1.5 * var(--default-line-height));
    width: 80%;
    color: var(--smithsonian-yellow);
  }

  #splash-screen-logos {
    margin-block: 0.75em;

    /* format for including more inline logos */
    display: flex; // place on same line
    justify-content: center; // align center

    >* {
      margin-inline: 0; // counteract margin-inline: auto from #splash-screen div
    }

    /* ************ */

    img {
      height: 5vmin;
      vertical-align: middle;
      margin: 2px;
    }

    @media only screen and (max-width: 600px) {
      img {
        height: 24px;
      }
    }

    svg {
      vertical-align: middle;
      height: 24px;
    }
  }
}

#intro-window-close-button {
  position: absolute;
  top: 0.25em;
  right: 0.25em;

  &:hover {
    cursor: pointer;
  }
}

#main-content {
  position: fixed;
  width: 100%;
  height: var(--app-content-height);
  overflow: auto;
  transition: height 0.1s ease-in-out;
}

#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

#map {
  width: 100%;
  height: calc(100% - 48px);
}

// define the layout
.content-with-sidebars {
  position: relative;
  padding: 0;

  display: grid;
  grid-template-columns: 0 .8fr .3fr;
  grid-template-rows: 70px var(--map-height) 78px .5fr .5fr;
  gap: 20px 10px;

  >* {
    background-color: transparent;
  }

  >div {
    outline: 1px solid transparent;
  }

  #side-panel {
    overflow-y: auto;
    margin-left: 1.5rem;
    grid-column: 3 / 4;
    grid-row: 2 / 6;
  }

  #logo-title {
    display: flex;
    align-items: center;
    grid-column: 2 / 4;
    grid-row: 1 / 2;
    gap: 10px;
  }

  #menu-area {
    // grid-column: 3 / 4;
    // grid-row: 1 / 2;
    // // border: 1px solid red;
    display: flex;
    justify-self: end;
    gap: 1rem;
    align-items: center;
  }

  #where {
    display: none;
    grid-column: 1 / 2;
    grid-row: 2 / 3;
  }

  #map-container {
    grid-column: 2 / 3;
    grid-row: 2 / 3;
  }

  #when {
    display: none;
    grid-column: 1 / 2;
    grid-row: 3 / 4;
  }

  #slider-row {
    grid-column: 2 / 3;
    grid-row: 3 / 4;
  }

  #information {
    padding: 1rem;
    grid-column: 2 / 3;
    grid-row: 4 / 6;
  }

}

// style the content 
#main-content {
  padding: 2rem;
}

.content-with-sidebars {
  font-family: "Lexend", sans-serif;
  font-optical-sizing: auto;
  font-weight: normal;
  font-style: normal;
  background-color: transparent;
  height: calc(100% - 4rem);
}

#title {
  color: var(--smithsonian-yellow);
  font-weight: 600;
  font-size: 2.5rem;
  text-align: left;
  text-wrap: nowrap;
  flex-grow: 1;
}

a[href="https://tempo.si.edu"]>img {
  // display: inline;
  height: 70px !important;
  width: auto !important;
}

#information {
  border-radius: 10px;
  padding-inline: 1rem;
  // margin-right: 200px;
}

a {
  text-decoration: underline;
  font-weight: bold;
  color: var(--accent-color-2);
}

#dataset-sections {
  padding: 0.5rem 1rem;
  border: 5px solid var(--tempo-red);
  border-radius: 10px;
  margin: 10px;
}

// prevent overflows of the content
#add-region-time {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 5px;
}

#sample-info {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 5px;
  padding: 0.5rem;
  border-radius: 10px;
}

#date-radio {
  padding-block: 0.5rem;
}

#date-radio div.highlighted label {
  font-size: 1.2em;
  font-weight: bold;
  border-radius: 5px;
  color: var(--smithsonian-yellow);
  opacity: 1;
}

#map-view {
  padding: 0.5rem 1rem;
  margin: 10px;
  border: 5px solid var(--info-background);
  border-radius: 10px;

  h2 {
    margin: 0;
  }
}

#locations-of-interest {
  border: 1px solid black;
  padding-block: 0.5rem;
  padding-inline: 1rem;
  height: fit-content;

  h3 {
    font-weight: 500;
  }
}

.big-label {
  font-size: 2rem;
  text-align: right;
  margin-right: 0.5rem;
  align-self: end;
  color: var(--smithsonian-blue);
}

#when {
  align-self: start;
}

#slider-row,
#when {
  margin-top: 1.5rem;
}

#slider-row {
  margin-left: 3rem;
}

#map-container {
  position: relative;
  display: flex;
  flex-direction: row;
  padding-right: 10px;

  #map {
    flex-basis: 80%;
    flex-grow: 1;
    flex-shrink: 1;
  }

  #location-and-sharing {
    position: absolute;
    bottom: 0;
    z-index: 1000;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    width: fit-content;
  }

  .forward-geocoding-container {
    width: 250px;
    border: 2px solid black;
  }

  #map-show-hide-controls {
    z-index: 1000;
    position: absolute;
    top: calc(48px + 1rem);
    right: 80px;
  }

  #map-legend {
    position: absolute;
    top: 48px;
    right: 80px;
    width: fit-content;
    z-index: 1000;

    display: flex;
    align-items: center;
    gap: 0.5rem;

    color: black;
    background-color: #fff5;
    padding-left: 0.5rem;
    padding-right: 0.25rem;

    backdrop-filter: blur(5px);

    hr.line-legend {
      display: inline-block;
      border: 0.5px solid #c10124;
      width: 3rem;
    }
  }

  .colorbar-container {
    flex-grow: 0;
    flex-shrink: 1;

    .unit-label {
      font-size: .95em;
    }
  }

  #la-fires {
    z-index: 1000;
    position: absolute;
    right: 80px;
    bottom: 1rem;

  }
}

.colorbar-container sub {
    vertical-align: sub !important;
    line-height: 1.25  !important;
  }

.colorbar-container sup {
    vertical-align: super  !important;
    line-height: 1.25  !important;
  }
.colorbar-container sub ,
.colorbar-container sup {
    top: 0  !important;
  }

#slider-row {
  display: flex;
  flex-direction: row;
  padding-left: 0;

  >#play-pause-button {
    height: fit-content;
    align-self: center;
    padding-inline: 0.5rem;
    margin-left: 0.75rem;
    width: 2.5rem;
    color: var(--accent-color);
    border: 2px solid var(--accent-color);
  }

  #play-pause-button[disabled] {
    filter: grayscale(100%);
    cursor: progress;
    cursor: not-allowed;
  }

  .icon-wrapper {
    padding-inline: 0.5rem !important;
  }
}

.time-slider {

  .v-slider-thumb {

  .v-slider-thumb__surface::after {
    background-image: url("./assets/smithsonian.png");
      background-size: 30px 30px;
      height: 30px;
      width: 30px;
    }

    .v-slider-thumb__label {
      background-color: var(--accent-color-2);
      border: 0.25rem solid var(--accent-color);
      width: max-content;
      height: 2.5rem;
      font-size: 1rem;

      &::before {
        color: var(--accent-color);
      }
    }
  }

  .v-slider-track__tick {
    background-color: var(--accent-color);
    /* Change color */
    height: 15px;
    /* Change size */
    width: 4px;
    margin-top: 0 !important;
    // top: -10%;
  }

  .v-slider {

    .v-slider.v-input--horizontal {
      grid-template-rows: auto 0px;
    }

    .v-slider.v-input--horizontal .v-slider-thumb__label {
      // top: calc(var(--v-slider-thumb-size) * 1.5);
      z-index: 2000;
    }

    .v-slider.v-input--horizontal .v-slider-thumb__label::before {
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-top: 6px solid currentColor;
      bottom: -15px;
    }
  }
}

#opacity-slider-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-left: 7%;
  padding-right: 7%;
  gap: 2px;

  .v-slider {
    margin-right: 0;
    width: 100%;
  }

  #opacity-slider-label {
    opacity: 0.7;
    width: fit-content;
  }
}

#body-logos {
  margin-bottom: -1rem;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;

  img {
    height: 35px !important;
    vertical-align: middle;
    margin: 2px;
  }
}

#icons-container>a[href="https://worldwidetelescope.org/home/"] {
  display: none;
}

.v-selection-control {
  z-index: auto;

}

.v-radio-group .v-input__details {
  display: none;
}

.v-radio-group .v-selection-control {
  label {
    width: 100%;
  }
}

.rounded-icon-wrapper {
  height: fit-content;
  align-self: center;
  padding-inline: 0.5rem;
  // margin-left: 0.75rem;
  width: 2.5rem;
  color: var(--accent-color);
  border: 2px solid var(--accent-color);
  border-radius: 20px;
}

i.mdi-menu-down {
  color: var(--smithsonian-blue);
}

// From Sara Soueidan (https://www.sarasoueidan.com/blog/focus-indicators/) & Erik Kroes (https://www.erikkroes.nl/blog/the-universal-focus-state/)
:focus-visible:not(.v-field__input input, .v-overlay__content),
button:focus-visible,
.focus-visible,
.v-selection-control--focus-visible .v-selection-control__input {
  outline: 9px double white !important;
  box-shadow: 0 0 0 6px black !important;
  border-radius: .125rem;
}

.controls-card {
  padding: 1rem;
  border: 1px solid #068ede;
}

//  mobile styles

// ========= DEFINE MOBILE STYLES =========
@media (max-width: 1180px) {

  .content-with-sidebars {
    grid-template-columns: 0px 0.7fr 0.3fr;
    grid-template-rows: 3.5rem var(--map-height) 78px .5fr .5fr;

    #when {
      display: none;
    }

    #where {
      display: none;
    }

    #title {
      text-wrap: wrap;
      font-size: 2rem;
      line-height: 1.25;
      margin-left: 10px;
    }

    #slider-row {
      margin-left: 3rem;
    }

    a[href="https://tempo.si.edu"]>img {
      height: 70px !important;
      width: auto !important;
    }

  }
}

@media (max-width: 750px) {
  :root {
    --map-height: 60vh;
    --map-height: 60dvh;
    --map-height: 60svh;
    font-size: 14px;
  }

  #main-content {
    padding: 1rem;
  }

  #introduction-overlay .v-window {
    max-height: 75vh;
    max-height: 75dvh;
    max-height: 75sdvh;
    overflow-y: scroll;
  }

  #introduction-overlay .intro-text {
    font-size: min(1.15em, 2vw);
  }

  #introduction-overlay ul li {
    margin-block-start: 1.15em;
  }

  .content-with-sidebars {
    gap: 10px;
    // padding-inline: 1rem;

    #menu-area {
      display: flex;
      flex-direction: column-reverse;
      gap: 1rem;
      align-items: flex-end;
    }

    #map-container #map-show-hide-controls {
      right: 5px
    }

    #where {
      display: none;
    }


    #when {
      display: none;
    }


    // #body-logos {
    //   grid-column: 1 / 2;
    //   grid-row: 7 / 8;
    // }
  }

  .content-with-sidebars {

    #slider-row {
      margin-left: 4rem;
      margin-right: 1rem;
      padding-top: 10px;
      align-items: center;
    }

    #user-options {
      margin: 0;
      width: auto;
    }

    #bottom-options {
      margin: 0;
    }

    #information {
      font-size: 1em;
    }


    #title {
      font-size: 2rem;
      margin-left: 15px;
      text-wrap: wrap;

    }

  }


  #map-container {
    display: flex;
    flex-direction: column;


    #map-contents {
      position: relative;
    }

    #map-legend {
      right: 0;
    }

    .colorbar-container-horizontal {
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      z-index: 5000;
      --height: 0.75rem;
    }

  }


}

/* Leaflet crispness override */
// @JobLeonard - https://github.com/Leaflet/Leaflet/issues/5883#issue-269071844
// .leaflet-container .leaflet-overlay-pane svg,
// .leaflet-container .leaflet-marker-pane img,
// .leaflet-container .leaflet-shadow-pane img,
// .leaflet-container .leaflet-tile-pane img,
.leaflet-container img.leaflet-image-layer {
  max-width: none !important;
  /* Preserve crisp pixels with scaled up images */
  image-rendering: optimizeSpeed;
  /* Legal fallback */
  image-rendering: -moz-crisp-edges;
  /* Firefox        */
  image-rendering: -o-crisp-edges;
  /* Opera          */
  image-rendering: -webkit-optimize-contrast;
  /* Safari         */
  image-rendering: optimize-contrast;
  /* CSS3 Proposed  */
  image-rendering: crisp-edges;
  /* CSS4 Proposed  */
  image-rendering: pixelated;
  /* CSS4 Proposed  */
  -ms-interpolation-mode: nearest-neighbor;
  /* IE8+           */
}

.cds-snackbar-alert {
  position: absolute;
  top: 1rem;
  right: 1rem;
  pointer-events: auto;
  z-index: 999;
}

.snackbar-alert-ul {
  margin-left: 1em;
}

@media (max-width: 750px) {
  .cds-snackbar-alert {
    top: -1rem;
  }
}

.menu-button,
.share-button,
.whats-new-button {
  outline: 2px solid var(--smithsonian-yellow) !important;
  height: 2rem !important;
}

.whats-new-button {
  padding-inline: 10px;
}

div.callout-wrapper {
  display: content;
  // overflow-x: hidden;  
}

.menu-link {
  text-decoration: none;
}

#loading-circle-progress-container {
  font-size: large;
}

#la-fires {
  max-width: 20ch;

  .v-btn {
    height: fit-content; // calc(var(--v-btn-height) + 18px);
    padding-block: 5px;
  }

  .v-btn__content {
    white-space: normal;

  }
}

.la-fires-cds-dialog .cds-dialog-card .v-card-text {
  height: unset;
}

.pulse {
  animation-name: pulse;
  animation-duration: 1.5s;
  animation-iteration-count: 3;
}


@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.2);
  }

  100% {
    transform: scale(1);
  }
}

canvas.maplibregl-canvas {
  background-color: whitesmoke;
}
</style>

