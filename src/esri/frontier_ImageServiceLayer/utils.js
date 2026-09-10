export function cleanTrailingSlash (url) {
  return url.replace(/\/$/, '');
}

// convert to async and handle esri's error response explicitly
export async function getServiceDetails (url, fetchOptions = {}) {
  const response = await fetch(`${url}?f=json`, fetchOptions);
  if (!response.ok) {
    throw new Error(`Failed to load service details (${response.status})`);
  }

  const json = await response.json();
  if (json && 'error' in json) {
    const msg = (json['error'] && json['error']['message']) ?? 'Unknown service metadata error';
    throw new Error(msg);
  }

  return json;
}

const POWERED_BY_ESRI_ATTRIBUTION_STRING = 'Powered by <a href="https://www.esri.com">Esri</a>';
// This requires hooking into some undocumented properties
export function updateAttribution (newAttribution, sourceId, map) {
  const attributionController = map._controls.find(c => '_attribHTML' in c);
  if (!attributionController) return;

  const customAttribution = attributionController.options.customAttribution;

  if (typeof customAttribution === 'string') {
    attributionController.options.customAttribution = `${customAttribution} | ${POWERED_BY_ESRI_ATTRIBUTION_STRING}`;
  } else if (customAttribution === undefined) {
    attributionController.options.customAttribution = POWERED_BY_ESRI_ATTRIBUTION_STRING;
  } else if (Array.isArray(customAttribution)) {
    if (customAttribution.indexOf(POWERED_BY_ESRI_ATTRIBUTION_STRING) === -1) {
      customAttribution.push(POWERED_BY_ESRI_ATTRIBUTION_STRING);
    }
  }

  if (map.style.sourceCaches && map.style.sourceCaches[sourceId] && map.style.sourceCaches[sourceId]._source) {
    map.style.sourceCaches[sourceId]._source.attribution = newAttribution;
  } else if (map.style._otherSourceCaches && map.style._otherSourceCaches[sourceId] && map.style._otherSourceCaches[sourceId]._source) {
    map.style._otherSourceCaches[sourceId]._source.attribution = newAttribution;
  }
  attributionController._updateAttributions();
}
