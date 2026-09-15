import React from 'react';
import { Layers, Shield, Home, Building2, AlertTriangle, CloudSun, Navigation, Flame, Map } from 'lucide-react';

export interface LayerState {
  incidents: boolean;
  rescueTeams: boolean;
  shelters: boolean;
  hospitals: boolean;
  hazardZones: boolean;
  districtBoundary: boolean;
  weatherAlerts: boolean;
  routes: boolean;
  userGps: boolean;
}

interface MapLayerControlProps {
  role: 'citizen' | 'rescue_team' | 'collector' | 'admin';
  layers: LayerState;
  onToggleLayer: (layerName: keyof LayerState) => void;
  className?: string;
}

export const MapLayerControl: React.FC<MapLayerControlProps> = ({
  role,
  layers,
  onToggleLayer,
  className = ''
}) => {
  const isCitizen = role === 'citizen';
  const isRescue = role === 'rescue_team';

  return (
    <div className={`bg-slate-900/90 backdrop-blur-md border border-slate-700/90 rounded-2xl p-2.5 shadow-2xl text-xs text-white ${className}`}>
      <div className="flex items-center gap-1.5 font-black text-[11px] text-emerald-400 tracking-wider uppercase mb-2 px-1">
        <Layers className="w-3.5 h-3.5" />
        <span>GIS Map Layers</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {/* Incidents Layer */}
        <button
          onClick={() => onToggleLayer('incidents')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            layers.incidents
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{isRescue ? 'Assigned Incidents' : 'Incidents'}</span>
        </button>

        {/* Rescue Teams Telemetry (Hidden for Citizen) */}
        {!isCitizen && (
          <button
            onClick={() => onToggleLayer('rescueTeams')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              layers.rescueTeams
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isRescue ? 'My Team GPS' : 'Rescue Units'}</span>
          </button>
        )}

        {/* Shelters Layer */}
        <button
          onClick={() => onToggleLayer('shelters')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            layers.shelters
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Relief Shelters</span>
        </button>

        {/* Hospitals Layer */}
        <button
          onClick={() => onToggleLayer('hospitals')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            layers.hospitals
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Hospitals</span>
        </button>

        {/* Hazard Risk Zones Layer */}
        <button
          onClick={() => onToggleLayer('hazardZones')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            layers.hazardZones
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Risk Zones</span>
        </button>

        {/* District Boundary Layer */}
        <button
          onClick={() => onToggleLayer('districtBoundary')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            layers.districtBoundary
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Boundaries</span>
        </button>

        {/* Routes Layer */}
        <button
          onClick={() => onToggleLayer('routes')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            layers.routes
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{isRescue ? 'Navigation Route' : 'Routes'}</span>
        </button>

        {/* Weather Alerts Layer */}
        <button
          onClick={() => onToggleLayer('weatherAlerts')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            layers.weatherAlerts
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <CloudSun className="w-3.5 h-3.5" />
          <span>Alerts</span>
        </button>
      </div>
    </div>
  );
};
