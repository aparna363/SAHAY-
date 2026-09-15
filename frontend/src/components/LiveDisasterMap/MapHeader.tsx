import React from 'react';
import {
  MapPin,
  Shield,
  AlertTriangle,
  Flame,
  Radio,
  Navigation,
  Crosshair,
  Globe2,
  Layers,
  ChevronDown
} from 'lucide-react';
import type { SafetyStatusResponse } from '../../services/mapService';

interface MapHeaderProps {
  locationName: string;
  district: string;
  safetyStatus: SafetyStatusResponse | null;
  mapMode: 'local' | 'kerala';
  onToggleMapMode: (mode: 'local' | 'kerala') => void;
  onEvacuateClick: () => void;
  onSafeRouteClick: () => void;
  onReportIncidentClick: () => void;
  onRecenterGps: () => void;
  onToggleLayers?: () => void;
  showLayers?: boolean;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  locationName,
  district,
  safetyStatus,
  mapMode,
  onToggleMapMode,
  onEvacuateClick,
  onSafeRouteClick,
  onReportIncidentClick,
  onRecenterGps,
  onToggleLayers,
  showLayers
}) => {
  const status = safetyStatus?.safetyStatus || 'SAFE';

  // Government color-coded badges
  const badgeConfig = {
    SAFE: {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
      dot: 'bg-emerald-500 ring-emerald-200',
      label: '🟢 AREA CURRENTLY SAFE',
      icon: Shield
    },
    WARNING: {
      bg: 'bg-amber-50 border-amber-300 text-amber-800',
      dot: 'bg-amber-500 ring-amber-200',
      label: '🟡 WARNING IN YOUR AREA',
      icon: AlertTriangle
    },
    EMERGENCY: {
      bg: 'bg-rose-50 border-rose-300 text-rose-800',
      dot: 'bg-rose-600 ring-rose-200 animate-ping',
      label: '🔴 EMERGENCY IN YOUR AREA',
      icon: Flame
    }
  }[status];

  const StatusIcon = badgeConfig.icon;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Top row: Title + Location info + Safety Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold bg-[#043e2e] text-white px-2.5 py-0.5 rounded-md">
              KSDMA &bull; DISASTER GIS
            </span>
            <span className="text-xs text-slate-500 font-medium">
              National Disaster Management Telemetry
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            SAHAY LIVE SAFETY MAP
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <MapPin className="w-4 h-4 text-[#0E8F66]" />
              <span>Current Location: <strong>{locationName || 'GPS Detected Area'}</strong></span>
            </div>
            <span className="text-slate-300">&bull;</span>
            <div>
              <span>District: <strong>{district || 'Kottayam'}</strong></span>
            </div>
          </div>
        </div>

        {/* Dynamic Safety Status Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className={`px-3.5 py-2 rounded-2xl border ${badgeConfig.bg} shadow-2xs flex items-center gap-2.5`}>
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badgeConfig.dot}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${badgeConfig.dot}`}></span>
            </span>
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-black tracking-wide">{badgeConfig.label}</span>
          </div>

          {/* Map Mode Toggle Buttons */}
          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => onToggleMapMode('local')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                mapMode === 'local'
                  ? 'bg-white text-[#0B4D3B] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-[#0E8F66]" />
              <span>📍 My Safety Area</span>
            </button>
            <button
              onClick={() => onToggleMapMode('kerala')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                mapMode === 'kerala'
                  ? 'bg-white text-[#0B4D3B] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 text-blue-600" />
              <span>🗺️ Kerala Overview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* 🚨 EVACUATE ME BUTTON */}
          <button
            onClick={onEvacuateClick}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 border border-rose-700"
          >
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span>🚨 EVACUATE ME</span>
          </button>

          {/* 🧭 FIND SAFE ROUTE BUTTON */}
          <button
            onClick={onSafeRouteClick}
            className="px-4 py-2.5 bg-[#043e2e] hover:bg-[#065f46] active:scale-95 text-white text-xs font-black rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 border border-emerald-900"
          >
            <Navigation className="w-4 h-4 text-emerald-300" />
            <span>🧭 FIND SAFE ROUTE</span>
          </button>

          {/* 🚨 REPORT INCIDENT BUTTON */}
          <button
            onClick={onReportIncidentClick}
            className="px-3.5 py-2.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 active:scale-95 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>🚨 Report Incident</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {onToggleLayers && (
            <button
              onClick={onToggleLayers}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                showLayers
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#0E8F66]" />
              <span>Map Layers</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLayers ? 'rotate-180' : ''}`} />
            </button>
          )}

          <button
            onClick={onRecenterGps}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            title="Recenter on My GPS Location"
          >
            <Crosshair className="w-4 h-4 text-[#0E8F66]" />
          </button>
        </div>
      </div>
    </div>
  );
};
