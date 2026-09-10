
// https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/#request-parameters
import type { 
  EsriFeatureServerDescriptionJSON, 
  EsriFeatureServiceLayerDescription,
  EsriFeatureServiceLayerField,
  FeatureServiceLayer
} from "./feature_server_types";



const PAGE_SIZE = 2000;


async function getAllFeatureServicePages(getPage) {
  const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
  let hasMorePages = true;
  let offset = 0;
  
  while (hasMorePages) {
    const resp = await getPage(offset, PAGE_SIZE);
    if (!resp.ok) throw new Error(`ArcGIS query failed: ${resp.status}`);

    const page = (await resp.json()) as GeoJSON.FeatureCollection & { properties?: { exceededTransferLimit?: boolean } };
    if (!page.features || page.features.length === 0) break;

    fc.features.push(...page.features);

    if (!page.properties?.exceededTransferLimit) break;
    hasMorePages = !!page.properties?.exceededTransferLimit;
    if (hasMorePages) {
      offset += page.features.length;
    }
    
  }
  
  return fc;
}

/**
 * Fetch features from an ArcGIS FeatureServer layer within a bounding box,
 * paginating automatically to handle the server's maxRecordCount limit.
 */
export async function fetchFeaturesInBounds(
  layerUrl: string,
  outFields: string[],
  where: string,
  bounds: [number, number, number, number],
): Promise<GeoJSON.FeatureCollection> {
  const envelope = JSON.stringify({
    xmin: bounds[0], ymin: bounds[1], xmax: bounds[2], ymax: bounds[3],
    spatialReference: { wkid: 4326 },
  });
  
  async function getPage(offset, pageSize) {
    const params = new URLSearchParams({
      where,
      outFields: outFields.join(","),
      f: "geojson",
      returnGeometry: "true",
      geometry: envelope,
      geometryType: "esriGeometryEnvelope",
      spatialRel: "esriSpatialRelIntersects",
      inSR: "4326",
      outSR: "4326",
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
    });

    return await fetch(`${layerUrl}/query?${params}`);
  }

  return await getAllFeatureServicePages(getPage);
}

/**
 * Fetch ALL features from a layer (no spatial filter), with pagination.
 * Suitable for smaller layers like PlacePoints (0) and Counties (2).
 */
export async function fetchAllFeatures(
  layerUrl: string,
  outFields: string[],
  where: string,
): Promise<GeoJSON.FeatureCollection> {
  
  async function getPage(offset, count) {
    const params = new URLSearchParams({
      where,
      outFields: outFields.join(","),
      f: "geojson",
      returnGeometry: "true",
      resultOffset: String(offset),
      resultRecordCount: String(count),
    });
    return await fetch(`${layerUrl}/query?${params}`);
  }
  
  return await getAllFeatureServicePages(getPage);
}




export class EsriFeatureService {
  url: string;
  metadata: EsriFeatureServerDescriptionJSON | null = null;
  layers: FeatureServiceLayer[] | null = null;

  constructor(url: string) {
    if (url.endsWith('/')) {
      url = url.substring(0, url.length-1);
    }
    if (!url.endsWith('FeatureServer')) {
      throw new Error(`FeatureService url must end with "FeatureService". Provided url ${url}`);
    }
    this.url = url;
  }
  
  
  async getServiceMetadata(): Promise<EsriFeatureServerDescriptionJSON | null> {
    const requestUrl = `${this.url}?f=json`;
    const resp = await fetch(requestUrl);
    if (resp.ok) {
      this.metadata = await resp.json();
      this.getLayers();
    }
    return this.metadata ?? null;
  }
  
  getLayers() {
    if (this.metadata) {
      this.layers = this.metadata["layers"] ?? null;
    }
    if (!this.layers) {
      console.warn("get layers: metadata not loaded yet for", this.url);
    }
    return this.layers;
  }
  
  
  isPointLayer(layer: EsriFeatureServerDescriptionJSON['layers'][number]) {
    return layer.geometryType === 'esriGeometryMultipoint' || layer.geometryType === 'esriGeometryPoint';
  }
  
  async metadataForLayer(layer: EsriFeatureServerDescriptionJSON['layers'][number]): Promise<EsriFeatureServiceLayerDescription | null> {
    const layerId = layer.id;
    const requestUrl = `${this.url}/${layerId}?f=json`;
    const resp = await fetch(requestUrl);
    if (resp.ok) {
      const json =  resp.json();
      return json;
    }
    return null;
  }

}

export class EsriFeatureLayer {
  url: string;
  layerIndex: number;
  metadata: EsriFeatureServiceLayerDescription | null = null;
  fields: EsriFeatureServiceLayerField[] = [];

  constructor(url: string, layerIndex: number) {
    if (url.endsWith('/')) {
      url = url.substring(0, url.length-1);
    }
    if (!url.endsWith('FeatureServer')) {
      throw new Error(`FeatureService url must end with "FeatureService". Provided url ${url}`);
    }
    
    this.url = url;
    this.layerIndex = layerIndex;
  }
  
  get layerUrl() {
    return `${this.url}/${this.layerIndex}`;
  }
  
  async getMetadata(): Promise<EsriFeatureServiceLayerDescription | null> {

    const resp = await fetch(this.layerUrl + '?f=json');
    if (resp.ok) {
      this.metadata = await resp.json();
      // chain useful getters here so the user doesn't have to
      this.getFields();
    }
    return this.metadata;
  }
  
  async getFields() {
    if (this.metadata) {
      this.fields = this.metadata.fields;
    }
  }

  
  fetchFeaturesInBounds(outFields: string[], where: string, bounds: [number, number, number, number]): Promise<GeoJSON.FeatureCollection | null> {
    return fetchFeaturesInBounds(this.layerUrl, outFields, where, bounds);
  }

  fetchAllFeatures(outFields: string[], where: string): Promise<GeoJSON.FeatureCollection | null> {
    return fetchAllFeatures(this.layerUrl, outFields, where);
  }
  
  
}