import L from 'leaflet';
import type { MapRoadHazard } from '../../../services/mapService';

export function getRoadStatusConfig(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'BLOCKED') {
    return {
      color: '#64748b', // GREY: Road Closed / Unavailable
      icon: '⛔',
      badge: 'GREY • ROAD CLOSED / UNAVAILABLE',
      weight: 6,
      dashArray: '8, 8'
    };
  }
  if (s === 'HAZARDOUS') {
    return {
      color: '#ea580c', // ORANGE: High Risk
      icon: '⚠️',
      badge: 'ORANGE • HIGH RISK',
      weight: 5,
      dashArray: '5, 5'
    };
  }
  if (s === 'CAUTION') {
    return {
      color: '#eab308', // YELLOW: Warning
      icon: '🟡',
      badge: 'YELLOW • WARNING',
      weight: 4,
      dashArray: undefined
    };
  }
  return {
    color: '#16a34a', // GREEN: Safe
    icon: '🟢',
    badge: 'GREEN • SAFE ROAD',
    weight: 4,
    dashArray: undefined
  };
}

export function renderRoadHazardsLayer(
  layerGroup: L.LayerGroup,
  roadHazards: MapRoadHazard[],
  onSelectRoad?: (road: MapRoadHazard) => void
) {
  layerGroup.clearLayers();

  roadHazards.forEach(road => {
    const config = getRoadStatusConfig(road.status);

    const popupHtml = `
      <div class="sahay-popup font-sans text-xs p-1 space-y-2">
        <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800">
            ${config.badge}
          </span>
          <span class="text-[10px] font-bold text-slate-500">${road.district}</span>
        </div>

        <div>
          <h4 class="font-black text-sm text-slate-900">${road.roadName}</h4>
          <p class="text-[11px] text-slate-600 mt-1">${road.description || 'Monitored road segment condition.'}</p>
        </div>

        <div class="grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-200/70">
          <div><span class="text-slate-400 font-medium">Hazard:</span> <strong>${road.hazardType}</strong></div>
          <div><span class="text-slate-400 font-medium">Severity:</span> <strong>${road.severity}</strong></div>
          <div><span class="text-slate-400 font-medium">Reported by:</span> <strong>${road.reportedBy || 'Traffic Cell'}</strong></div>
          <div><span class="text-slate-400 font-medium">Routing:</span> <strong class="${road.status === 'BLOCKED' ? 'text-slate-600' : 'text-emerald-700'}">${road.status === 'BLOCKED' ? 'Road Closed / Excluded' : 'Clear'}</strong></div>
        </div>
      </div>
    `;

    // 1. If PostGIS GeoJSON LineString is provided, render it directly
    if (road.geojson) {
      const geoLayer = L.geoJSON(road.geojson, {
        style: {
          color: config.color,
          weight: config.weight,
          dashArray: config.dashArray,
          opacity: 0.85
        },
        onEachFeature: (_feature, layer) => {
          layer.bindPopup(popupHtml, { maxWidth: 300 });
          layer.on('click', () => {
            if (onSelectRoad) onSelectRoad(road);
          });
        }
      });
      geoLayer.addTo(layerGroup);
    } else if (road.startLat && road.startLng && road.endLat && road.endLng) {
      // 2. Fallback to start/end point coordinates polyline
      const polyline = L.polyline(
        [
          [road.startLat, road.startLng],
          [road.endLat, road.endLng]
        ],
        {
          color: config.color,
          weight: config.weight,
          dashArray: config.dashArray,
          opacity: 0.85
        }
      );

      polyline.bindPopup(popupHtml, { maxWidth: 300 });
      polyline.on('click', () => {
        if (onSelectRoad) onSelectRoad(road);
      });
      polyline.addTo(layerGroup);
    }

    // Add marker indicator if start coordinates exist
    if (road.startLat && road.startLng) {
      const markerHtml = `
        <div class="w-7 h-7 rounded-full bg-white border-2 shadow-md flex items-center justify-center text-xs font-bold" style="border-color: ${config.color}">
          ${config.icon}
        </div>
      `;
      const divIcon = L.divIcon({
        className: 'sahay-road-hazard-icon',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([road.startLat, road.startLng], { icon: divIcon });
      marker.bindPopup(popupHtml, { maxWidth: 300 });
      marker.addTo(layerGroup);
    }
  });
}
