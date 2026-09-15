import L from 'leaflet';
import type { MapHazardZone } from '../../../services/mapService';

export function getDisasterZoneColor(severity: string) {
  const sev = (severity || '').toUpperCase();
  if (sev === 'CRITICAL') return { color: '#dc2626', fill: '#dc2626', opacity: 0.35, label: '🔴 Critical Zone' };
  if (sev === 'HIGH') return { color: '#ea580c', fill: '#ea580c', opacity: 0.30, label: '🟠 High Risk Zone' };
  return { color: '#eab308', fill: '#eab308', opacity: 0.25, label: '🟡 Warning Zone' };
}

export function renderDisasterZonesLayer(
  layerGroup: L.LayerGroup,
  hazardZones: MapHazardZone[],
  onSelectZone?: (zone: MapHazardZone) => void
) {
  layerGroup.clearLayers();

  hazardZones.forEach(zone => {
    if (!zone.geojson) return;

    const styleInfo = getDisasterZoneColor(zone.severity);

    const geoLayer = L.geoJSON(zone.geojson, {
      style: {
        color: styleInfo.color,
        weight: 2.5,
        fillColor: styleInfo.fill,
        fillOpacity: styleInfo.opacity,
        dashArray: zone.severity === 'CRITICAL' ? undefined : '6, 6'
      },
      onEachFeature: (_feature, layer) => {
        const popupContent = `
          <div class="sahay-popup font-sans text-xs p-1 space-y-2">
            <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                ${styleInfo.label}
              </span>
              <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                ACTIVE
              </span>
            </div>

            <div>
              <h4 class="font-black text-sm text-slate-900">${zone.name}</h4>
              <p class="text-[11px] text-slate-600 mt-1 leading-relaxed">${zone.description || 'Active hazard zone monitored by KSDMA.'}</p>
            </div>

            <div class="grid grid-cols-2 gap-1 text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-200/70">
              <div><span class="text-slate-400 font-medium">Type:</span> <strong class="text-slate-800">${zone.hazardType}</strong></div>
              <div><span class="text-slate-400 font-medium">Severity:</span> <strong class="text-slate-800">${zone.severity}</strong></div>
              <div><span class="text-slate-400 font-medium">Source:</span> <strong class="text-slate-800">${zone.source || 'KSDMA / IMD'}</strong></div>
              <div><span class="text-slate-400 font-medium">Status:</span> <strong class="text-emerald-700">Verified Active</strong></div>
            </div>

            <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>Updated: Real-time PostGIS</span>
              <span class="font-bold text-rose-600">Avoid Area</span>
            </div>
          </div>
        `;

        layer.bindPopup(popupContent, { maxWidth: 300 });

        layer.on('click', () => {
          if (onSelectZone) onSelectZone(zone);
        });
      }
    });

    geoLayer.addTo(layerGroup);
  });
}
