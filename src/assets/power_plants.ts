/* eslint-disable @typescript-eslint/naming-convention */
// Type Generated with "Paste JSON as Code" extension for VSCode
export interface PowerPlants {
  X:               number;
  Y:               number;
  OBJECTID:        number;
  Plant_Code:      number;
  Plant_Name:      string;
  Utility_ID:      number;
  Utility_Name?:   string;
  sector_name:     SectorName;
  Street_Address?: string;
  City?:           string;
  County?:         string;
  State:           State;
  Zip?:            number;
  PrimSource:      PrimSource;
  source_desc:     string;
  tech_desc:       string;
  Install_MW:      number;
  Total_MW?:       number;
  Hydro_MW?:       number;
  Source:          Source;
  Period:          number;
  Longitude:       number;
  Latitude:        number;
  Coal_MW?:        number;
  NG_MW?:          number;
  Crude_MW?:       number;
  Nuclear_MW?:     number;
  HydroPS_MW?:     number;
  Bat_MW?:         number;
  Solar_MW?:       number;
  Geo_MW?:         number;
  Bio_MW?:         number;
  Wind_MW?:        number;
  Other_MW?:       number;
}

export enum PrimSource {
  Batteries = "batteries",
  Biomass = "biomass",
  Coal = "coal",
  Geothermal = "geothermal",
  Hydroelectric = "hydroelectric",
  NaturalGas = "natural gas",
  Nuclear = "nuclear",
  Other = "other",
  Petroleum = "petroleum",
  PumpedStorage = "pumped storage",
  Solar = "solar",
  Wind = "wind",
}

// custom groups for green and traditional sources
export enum RenewableSource {
  Biomass = "biomass",
  Geothermal = "geothermal",
  Hydroelectric = "hydroelectric",
  Solar = "solar",
  Wind = "wind",
}

export enum TraditionalSource {
  Coal = "coal",
  NaturalGas = "natural gas",
  Petroleum = "petroleum",
}

export enum Source {
  EIA860EIA860MAndEIA923 = "EIA-860, EIA-860M and EIA-923",
}

export enum State {
  Alabama = "Alabama",
  Alaska = "Alaska",
  Arizona = "Arizona",
  Arkansas = "Arkansas",
  California = "California",
  Colorado = "Colorado",
  Connecticut = "Connecticut",
  Delaware = "Delaware",
  Florida = "Florida",
  Georgia = "Georgia",
  Hawaii = "Hawaii",
  Idaho = "Idaho",
  Illinois = "Illinois",
  Indiana = "Indiana",
  Iowa = "Iowa",
  Kansas = "Kansas",
  Kentucky = "Kentucky",
  Louisiana = "Louisiana",
  Maine = "Maine",
  Maryland = "Maryland",
  Massachusetts = "Massachusetts",
  Michigan = "Michigan",
  Minnesota = "Minnesota",
  Mississippi = "Mississippi",
  Missouri = "Missouri",
  Montana = "Montana",
  Nebraska = "Nebraska",
  Nevada = "Nevada",
  NewHampshire = "New Hampshire",
  NewJersey = "New Jersey",
  NewMexico = "New Mexico",
  NewYork = "New York",
  NorthCarolina = "North Carolina",
  NorthDakota = "North Dakota",
  Ohio = "Ohio",
  Oklahoma = "Oklahoma",
  Oregon = "Oregon",
  Pennsylvania = "Pennsylvania",
  PuertoRico = "Puerto Rico",
  RhodeIsland = "Rhode Island",
  SouthCarolina = "South Carolina",
  SouthDakota = "South Dakota",
  Tennessee = "Tennessee",
  Texas = "Texas",
  Utah = "Utah",
  Vermont = "Vermont",
  Virginia = "Virginia",
  Washington = "Washington",
  WestVirginia = "West Virginia",
  Wisconsin = "Wisconsin",
  Wyoming = "Wyoming",
}

export enum SectorName {
  CommercialCHP = "Commercial CHP",
  CommercialNonCHP = "Commercial Non-CHP",
  ElectricUtility = "Electric Utility",
  IPPChp = "IPP CHP",
  IPPNonCHP = "IPP Non-CHP",
  IndustrialCHP = "Industrial CHP",
  IndustrialNonCHP = "Industrial Non-CHP",
}



// import from the "Power_Plants_records.json"
import powerPlantsData from './Power_Plants_records.json' assert { type: 'json' };

// Cast the imported data to the PowerPlants array type
export const powerPlants: PowerPlants[] = powerPlantsData as PowerPlants[];

export const powerPlantsGeoJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: powerPlants.map(plant => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [plant.Longitude, plant.Latitude],
    },
    properties: { ...plant },
  })),
};