import { ref, shallowRef, type Ref, onBeforeUnmount } from 'vue';
import toGeoJSON from '../togeojson.js';
import { useAbortableFetch } from './useAbortableFetch';


export interface KMLResource {
  kmlUrl: Ref<string>
  geoJsonData: Ref<GeoJSON.FeatureCollection | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  setUrl: (newUrl: string) => Promise<void>
  loadKML: () => Promise<unknown>
  cleanUp: () => void
}

// https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#error_handling
function parseXML(xmlString: string): Document | null {
  const parser = new DOMParser();

  const doc = parser.parseFromString(xmlString, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    return null;
  } else {
    return doc;
  }
}

export function useKML(url: string): KMLResource {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {loading: fetchLoading, error, abortController, abortableFetch, abort } = useAbortableFetch();
  const kmlUrl = ref(url);
  const geoJsonData = shallowRef<GeoJSON.FeatureCollection | null>(null);
  const loadingUrl = ref<string | null>(null);
  
  // loading should track the fetch and KML -> GeoJSON conversion.
  const loading = ref(false);
  let mostRecentLoadIndex = 0;

  // Convert KML to GeoJSON
  const _convertKmlToGeoJson = (kmlContent: string): GeoJSON.FeatureCollection => {
    
    const kmlDoc = parseXML(kmlContent);
    if (!kmlDoc) {
      throw new Error('Invalid KML format');
    }
    // Convert using local togeojson library
    const geoJson = toGeoJSON.kml(kmlDoc, { styles: true }) as GeoJSON.FeatureCollection;

    
    return geoJson;
      
  };


  // Load KML from URL
  async function loadKML() {
    
    const requestedUrl = kmlUrl.value;
    console.log(`loading kml ${requestedUrl}`);

    // Already loading or already loaded this URL — don't restart.
    // Checked without requiring an active controller so cached responses
    // (which complete before the next styledata event) are also covered.
    if (loadingUrl.value === requestedUrl) {
      return;
    }

    // Abort any in-flight request for a different URL
    if (abortController.value) {
      abort('Aborting previous KML fetch due to new request');
    }
    

    loadingUrl.value = requestedUrl;
    loading.value = true;
    mostRecentLoadIndex += 1;
    const currentLoadIndex = mostRecentLoadIndex;
    
    return abortableFetch(requestedUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
      
    })
      .then((response) => response.text())
      .then((kmlContent) => {
        
        // short-circuit lengthy processing if URL changed
        if (requestedUrl !== kmlUrl.value) {
          console.warn('KML URL changed during fetch, ignoring this result');
          return;
        }
        
        // convert Kml to GeoJSON and save to ref
        const geoJson = _convertKmlToGeoJson(kmlContent);
        if (requestedUrl !== kmlUrl.value) {
          console.warn('KML URL changed during KML parsing, ignoring this result');
          return;
        }
        if (geoJson) {
          geoJsonData.value = geoJson;
        }
        
        return kmlContent;
      })
      .catch((err) => {
        // only error if not abort
        if (err.name === 'AbortError') {
          console.warn('KML fetch aborted:', err.message);
        } else {
          console.error('Error fetching KML:', err);
        }
      })
      .finally(() => {
        // only the most recent load owns the loading flag; a stale/aborted
        // load finishing late must not clear it for a newer in-flight load
        if (currentLoadIndex === mostRecentLoadIndex) {
          loading.value = false;
        }
      });

  }


  // Change URL and refresh layer
  async function setUrl(newUrl: string) {
    const next = (newUrl || '').trim();
    // right now lets avoid loops.
    if (next !== kmlUrl.value) {
      kmlUrl.value = next;
    } // avoid loops

    // Abort any in-flight fetch before switching
    if (abortController.value) {
      abort('Aborting previous KML fetch due to URL change');
    }
    
    geoJsonData.value = null;
    error.value = null;
    loadingUrl.value = null;
  }

  // Watch for URL changes to auto-reload (will be idempotent due to early return)
  // watch(kmlUrl, (newUrl) => {
  //   console.log('KML URL changed, reloading:', kmlUrl.value);
  //   setUrl(newUrl);
  // });

  // Remove from map
  function cleanUp() {
    // Abort any in-flight fetch
    if (abortController.value) {
      abort('Aborting KML fetch due to layer removal');
    }
  }
  
  onBeforeUnmount(() => {
    cleanUp();
  });
  return {
    geoJsonData,
    loadKML,
    loading,
    error,
    kmlUrl,
    setUrl,
    cleanUp,
  };
}