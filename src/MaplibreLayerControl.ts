import { 
  IControl, 
  Map,
  LayerSpecification,
} from "maplibre-gl";

import { 
  PrimSource,
  RenewableSource,
  TraditionalSource,
} from "@/assets/power_plants";
import './styles/maplibre-layer-control.css'; // added

// useful reference:
// https://github.com/reyemtm/mapbox-layer-control/blob/master/src/layerControlSimple.js

// https://maplibre.org/maplibre-gl-js/docs/API/interfaces/IControl/
// class HelloWorldControl: IControl {
//     onAdd(map) {
//         this._map = map;
//         this._container = document.createElement('div');
//         this._container.className = 'maplibregl-ctrl';
//         this._container.textContent = 'Hello, world';
//         return this._container;
//     }

//     onRemove() {
//         this._container.parentNode.removeChild(this._container);
//         this._map = undefined;
//     }
// }

function setLayerOpacity(map: Map, layerId: string, opacity: number) {
  const layer = map.getLayer(layerId)!;
  if (!layer) {
    console.warn('Layer not found:', layerId);
    return;
  }
  
  const paintProp = `${layer.type}-opacity`;
  if (layer.type !== 'symbol') {
    map.setPaintProperty(layerId, paintProp, opacity);
  }
  if (layer.type === 'circle') {
    if (map.getPaintProperty(layerId, 'circle-opacity') !== undefined) {
      map.setPaintProperty(layerId, 'circle-stroke-opacity', opacity);
    }
  }  
  if (layer.type === 'symbol') {
    // icon-opacity
    if (map.getPaintProperty(layerId, 'icon-opacity') !== undefined) {
      map.setPaintProperty(layerId, 'icon-opacity', opacity);
    }
    // text-opacity
    if (map.getPaintProperty(layerId, 'text-opacity') !== undefined) {
      map.setPaintProperty(layerId, 'text-opacity', opacity);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNumeric(value: any): boolean {
  return !isNaN(value - parseFloat(value));
}

function getLayerOpacity(map: Map, layerId: string): number {
  const layer = map.getLayer(layerId);
  if (!layer) return 1;
  
  const paintProp = `${layer.type}-opacity`;
  let op: unknown = 1;
  
  if (layer.type === 'symbol') {
    op = map.getPaintProperty(layerId, 'icon-opacity');
    if (isNaN(op as unknown as number)) {
      op = map.getPaintProperty(layerId, 'text-opacity');
    }
  } else if (layer.type === 'circle') {
    op = map.getPaintProperty(layerId, 'circle-opacity');
    if (isNaN(op as unknown as number)) {
      op = map.getPaintProperty(layerId, 'circle-stroke-opacity');
    }
  } else {
    op = map.getPaintProperty(layerId, paintProp);
  }
  
  
  return isNumeric(op) ? (op as unknown as number) : 1;
} 

// A super simple layer control to toggle visibility of layers
export class MaplibreLayersControl implements IControl {
  private _map: Map | undefined;
  private _container: HTMLElement | undefined;
  private _layers: LayerSpecification[] | undefined;
  private _ignoredLayers: string[] = [];
  private _ignoredSources: string[] = [];
  private _shownLayers: string[] = [];
  private _linkedOpacitiesIds: Record<string, string[]>; // layers that should be shown/hidden together
  private _selectedPrimSource: PrimSource | 'Renewables' | 'Fossil Fuels' | 'All' = 'All';
  
  constructor(ignoreLayers?: string[], ignoreSources?: string[], shownLayers?: string[], linkOpacities?: Record<string, string[]>) {
    this._ignoredLayers = ignoreLayers || [];
    this._ignoredSources = ignoreSources || [];
    this._shownLayers = shownLayers || [];
    this._linkedOpacitiesIds = linkOpacities || {};
  }
  
  // apply current PrimSource filter to both layers if present
  private _applyPrimSourceFilter() {
    if (!this._map) return;
    const selected = this._selectedPrimSource;
    const layerIds = ['power-plants-layer', 'power-plants-heatmap'];
    layerIds.forEach(id => {
      if (!this._map!.getLayer(id)) return;
      if (selected === 'All') {
        this._map!.setFilter(id, null);
      } else if (selected === "Renewables") {
        this._map!.setFilter(id, ['in', ['get', 'PrimSource'], ['literal', Object.values(RenewableSource)]]);
      } else if (selected === "Fossil Fuels") {
        this._map!.setFilter(id, ['in', ['get', 'PrimSource'], ['literal', Object.values(TraditionalSource)]]);
      }
      else {
        this._map!.setFilter(id, ['==', ['get', 'PrimSource'], selected]);
      }
    });
  }

  private _createLayerItem(layer: LayerSpecification): HTMLElement {
    // console.log('Creating layer item for', layer.id);
    if (!this._map || !this._map.getLayer(layer.id)) return document.createElement('div');
    
    // container
    const container = document.createElement('div');
    container.classList.add('mlc-layer-item');
    container.classList.add('mlc-layer-item-' + (layer.layout?.visibility === 'none' ? 'hidden' : 'visible'));
    container.id = `mlc-layer-item-${layer.id}`;
    
    // checkbox and label
    const checkboxLabelContainer = document.createElement('div');
    checkboxLabelContainer.classList.add('mlc-layer-item-checkbox-label-container');
    // container.appendChild(checkboxLabelContainer);
    const checkbox = document.createElement('input');
    checkbox.classList.add('mlc-layer-item-checkbox');
    checkbox.type = 'checkbox';
    checkbox.id=`${layer.id}-visibility-checkbox`;
    // corrected: checked when layer is visible
    checkbox.checked = layer.layout?.visibility !== 'none';
    checkbox.addEventListener('change', () => {
      if (this._map) {
        this._map.setLayoutProperty(
          layer.id,
          'visibility',
          checkbox.checked ? 'visible' : 'none'
        );
      }
    });

    const label = document.createElement('label');
    label.classList.add('mlc-layer-item-label');
    label.htmlFor = checkbox.id;
    label.textContent = layer.id;
    
    
    checkboxLabelContainer.appendChild(checkbox);
    checkboxLabelContainer.appendChild(label);
    container.appendChild(checkboxLabelContainer);
    
    // Opacity slider and label
    const opacityLabelContainer = document.createElement('div');
    opacityLabelContainer.classList.add('mlc-layer-item-opacity-label-container');
    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '1';
    opacitySlider.step = '0.01';
    const initialOpacity = getLayerOpacity(this._map, layer.id);
    opacitySlider.value = String(initialOpacity);
    opacitySlider.classList.add('mlc-layer-opacity-slider');
    opacitySlider.title = 'Adjust layer opacity';
    opacitySlider.id = `${layer.id}-opacity-slider`;
    opacitySlider.addEventListener('input', () => {
      if (this._map) {
        setLayerOpacity(this._map, layer.id, parseFloat(opacitySlider.value));
        // if this layer has linked opacities, set them too
        const linked = this._linkedOpacitiesIds[layer.id];
        if (linked) {
          linked.forEach(linkedId => {
            const linkedSlider = document.getElementById(`${linkedId}-opacity-slider`) as HTMLInputElement | null;
            if (linkedSlider) {
              linkedSlider.value = opacitySlider.value;
            }
            setLayerOpacity(this._map!, linkedId, parseFloat(opacitySlider.value));
          });
        }
      }
    });
    
    const opacityLabel = document.createElement('label');
    opacityLabel.htmlFor = opacitySlider.id;
    opacityLabel.textContent = `Transparency: `;
    // opacityLabel.classList.add('visually-hidden'); // CSS class to hide the label
    opacityLabelContainer.appendChild(opacityLabel);
    opacityLabelContainer.appendChild(opacitySlider);
    
    container.appendChild(opacityLabelContainer);
    
    
    
    return container;
  }
  
  
  get filteredLayers(): LayerSpecification[] {
    if (!this._layers) return [];
    return this._layers.filter(layer => {
      if (!layer.id) return false;
      if (this._ignoredLayers.includes(layer.id)) return false;
      // eslint-disable-next-line 
      // @ts-ignore
      if (layer.source && this._ignoredSources.includes(layer.source as string)) return false;
      if (this._shownLayers.length > 0 && !this._shownLayers.includes(layer.id)) return false;
      return true;
    });
  }
  
  _createPrimsSourceFilterElement(): HTMLElement {
    const label = document.createElement('label') as HTMLLabelElement;
    label.classList.add('mlc-filter');
    label.textContent = "Power Plants by Primary Source";
    
    const select = document.createElement('select');
    
    const allOption = document.createElement('option');
    allOption.value = 'All';
    allOption.textContent = 'All';
    select.appendChild(allOption);
    
    const renewableOption = document.createElement('option');
    renewableOption.value = 'Renewables';
    renewableOption.textContent = 'Renewables';
    select.appendChild(renewableOption);
    
    const fossilFuelsOption = document.createElement('option');
    fossilFuelsOption.value = 'Fossil Fuels';
    fossilFuelsOption.textContent = 'Fossil Fuels';
    select.appendChild(fossilFuelsOption);
    
    Object.values(PrimSource).forEach(source => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      select.appendChild(option);
    });

    // set the select to the persisted value
    select.value = this._selectedPrimSource;

    select.addEventListener('change', () => {
      this._selectedPrimSource = select.value as PrimSource | 'All';
      this._applyPrimSourceFilter();
    });
    
    label.appendChild(select);

    // ensure map reflects the persisted selection after (re)creation
    this._applyPrimSourceFilter();

    return label;
  }
  
  onLayersChanged(layers: LayerSpecification[]) {
    this._layers = layers;
    if (this._container) {
      // Clear existing items
      this._container.innerHTML = '';
      // Re-add items
      const elements = this.filteredLayers.map(layer => this._createLayerItem(layer));
      elements.forEach(el => this._container?.appendChild(el));
      this._container.appendChild(this._createPrimsSourceFilterElement());
      // re-apply filter to current layers
      this._applyPrimSourceFilter();
    }
  }
  
  

  onAdd(map: Map): HTMLElement {
    this._map = map;
    this._layers = map.getStyle().layers;
    const elements = this.filteredLayers.map(layer => this._createLayerItem(layer));
    this._container =  document.createElement('div');
    this._container.className = 'maplibregl-ctrl maplibre-layer-control';
    this._container.id = 'maplibre-layer-control';
    elements.forEach(el => this._container?.appendChild(el));
    this._container.appendChild(this._createPrimsSourceFilterElement());
    
    map.on('styledata', () => {
      // check if layers changed
      // console.log('Style data event received');
      const newLayerIds = new Set((map.getStyle().layers || []).map(l => l.id));
      const oldLayerIds = new Set((this._layers ?? []).map(l => l.id));
      const hasNewLayers = newLayerIds.size !== oldLayerIds.size || [...newLayerIds].some(id => !oldLayerIds.has(id));
      if (hasNewLayers) {
        // console.log('Style data changed, updating layer list');
        this.onLayersChanged(map.getStyle().layers || []);
      }
      // check layer visibility changes
      const visibilityChanged = (this._layers ?? []).some(oldLayer => {
        const newLayer = map.getStyle().layers?.find(l => l.id === oldLayer.id);
        return newLayer && oldLayer.layout?.visibility !== newLayer.layout?.visibility;
      });
      if (visibilityChanged) {
        console.log('Layer visibility changed, updating layer list');
        this.onLayersChanged(map.getStyle().layers || []);
      }
    });
    
    // watch for 

    // ensure initial selection is applied
    this._applyPrimSourceFilter();

    return this._container;
  }
  
  onRemove(_map: Map): void {
    this._map = undefined;
  }
}