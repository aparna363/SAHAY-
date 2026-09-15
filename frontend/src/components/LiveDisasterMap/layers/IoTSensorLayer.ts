import L from 'leaflet';
import type { MapIoTSensor } from '../../../services/mapService';

export function getIoTSensorIcon(type: string) {
  const t = (type || '').toUpperCase();
  if (t === 'WATER_LEVEL') return '🌊';
  if (t === 'RAINFALL') return '🌧️';
  if (t === 'LANDSLIDE') return '🏔️';
  if (t === 'TEMPERATURE') return '🌡️';
  if (t === 'WIND') return '💨';
  return '📡';
}

export function getIoTSensorStatusConfig(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'CRITICAL') return { color: '#dc2626', bg: 'bg-rose-100 text-rose-800', dot: '🔴' };
  if (s === 'WARNING') return { color: '#ea580c', bg: 'bg-amber-100 text-amber-800', dot: '🟡' };
  if (s === 'OFFLINE') return { color: '#64748b', bg: 'bg-slate-100 text-slate-700', dot: '⚫' };
  return { color: '#16a34a', bg: 'bg-emerald-100 text-emerald-800', dot: '🟢' };
}

export function renderIoTSensorsLayer(
  layerGroup: L.LayerGroup,
  sensors: MapIoTSensor[],
  onSelectSensor?: (sensor: MapIoTSensor) => void
) {
  layerGroup.clearLayers();

  sensors.forEach(sensor => {
    if (isNaN(sensor.latitude) || isNaN(sensor.longitude)) return;

    const iconEmoji = getIoTSensorIcon(sensor.sensorType);
    const statusConfig = getIoTSensorStatusConfig(sensor.status);

    const iconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-2xl bg-white border-2 shadow-md flex items-center justify-center text-sm" style="border-color: ${statusConfig.color}">
          ${iconEmoji}
        </div>
        <span class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style="background-color: ${statusConfig.color}"></span>
      </div>
    `;

    const divIcon = L.divIcon({
      className: 'sahay-iot-sensor-icon',
      html: iconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([sensor.latitude, sensor.longitude], { icon: divIcon });

    const popupHtml = `
      <div class="sahay-popup font-sans text-xs p-1 space-y-2">
        <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <span class="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${statusConfig.bg}">
            ${statusConfig.dot} ${sensor.status}
          </span>
          <span class="text-[10px] font-mono text-slate-400">${sensor.sensorCode}</span>
        </div>

        <div>
          <h4 class="font-black text-sm text-slate-900">${sensor.sensorName}</h4>
          <p class="text-[11px] text-slate-500 mt-0.5">${sensor.locationName}, ${sensor.district}</p>
        </div>

        <div class="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 space-y-1">
          <div class="flex items-baseline justify-between">
            <span class="text-[11px] font-medium text-slate-500">Current Reading:</span>
            <span class="text-base font-black text-slate-900 font-mono">
              ${sensor.currentValue} ${sensor.unit}
            </span>
          </div>
          <div class="flex justify-between text-[10px] text-slate-400">
            <span>Warning: <strong>${sensor.thresholdWarning} ${sensor.unit}</strong></span>
            <span>Critical: <strong>${sensor.thresholdCritical} ${sensor.unit}</strong></span>
          </div>
        </div>

        <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <span>Battery: <strong>${sensor.batteryPct ?? 95}%</strong></span>
          <span>Updated: <strong>Just Now</strong></span>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 280 });
    marker.on('click', () => {
      if (onSelectSensor) onSelectSensor(sensor);
    });

    marker.addTo(layerGroup);
  });
}
