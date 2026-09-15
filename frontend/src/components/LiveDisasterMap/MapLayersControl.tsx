import React from 'react';
import { Layers, X } from 'lucide-react';

export interface DisasterMapLayersState {
  disasterZones: boolean;
  liveIncidents: boolean;
  roadConditions: boolean;
  safeRoutes: boolean;
  evacuationCenters: boolean;
  rescueTeams: boolean;
  iotSensors: boolean;
  weather: boolean;
  riskHeatmap: boolean;
}

interface MapLayersControlProps {
  layers: DisasterMapLayersState;
  onToggleLayer: (layerKey: keyof DisasterMapLayersState) => void;
  onClose?: () => void;
}

export const MapLayersControl: React.FC<MapLayersControlProps> = ({
  layers,
  onToggleLayer,
  onClose
}) => {
  const layerItems: Array<{ key: keyof DisasterMapLayersState; label: string; icon: string }> = [
    { key: 'disasterZones', label: 'Disaster Zones (Polygons)', icon: '🔴' },
    { key: 'liveIncidents', label: 'Live Incidents', icon: '🚨' },
    { key: 'roadConditions', label: 'Road Conditions (Safe/Blocked)', icon: '🚧' },
    { key: 'safeRoutes', label: 'Safe Evacuation Routes', icon: '🧭' },
    { key: 'evacuationCenters', label: 'Evacuation Centers (Shelters)', icon: '🏫' },
    { key: 'rescueTeams', label: 'Rescue Teams (Civil Units)', icon: '🚒' },
    { key: 'iotSensors', label: 'IoT Sensors Telemetry', icon: '🌊' },
    { key: 'weather', label: 'Weather Telemetry', icon: '🌧️' },
    { key: 'riskHeatmap', label: 'Risk Heatmap', icon: '🗺️' }
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-4 w-72 space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0E8F66]" />
          <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">MAP LAYERS</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        {layerItems.map(item => (
          <label
            key={item.key}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <input
              type="checkbox"
              checked={layers[item.key]}
              onChange={() => onToggleLayer(item.key)}
              className="w-4 h-4 text-[#0E8F66] rounded border-slate-300 focus:ring-[#0E8F66] accent-[#0E8F66]"
            />
          </label>
        ))}
      </div>
    </div>
  );
};
