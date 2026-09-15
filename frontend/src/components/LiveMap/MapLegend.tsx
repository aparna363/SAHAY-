import React from 'react';
import { AlertTriangle, Home, Building2, Shield, Info, Flame, Map } from 'lucide-react';

interface MapLegendProps {
  role: 'citizen' | 'rescue_team' | 'collector' | 'admin';
  className?: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({ role, className = '' }) => {
  const isOfficial = role === 'collector' || role === 'admin' || role === 'rescue_team';

  return (
    <div className={`bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 text-xs text-slate-300 shadow-xl space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-white tracking-wide">
          <Info className="w-3.5 h-3.5 text-emerald-400" />
          <span>Map Legend & Spatial Symbols</span>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300">
          {role.replace('_', ' ')}
        </span>
      </div>

      {/* Incident Severity Spectrum */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Incident Severity</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-red-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-red-400/50 animate-pulse"></span>
            <span className="font-bold text-red-300">CRITICAL</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-orange-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span className="font-bold text-orange-300">HIGH</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-yellow-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <span className="font-semibold text-yellow-300">MODERATE</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-emerald-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-emerald-300">LOW</span>
          </div>
        </div>
      </div>

      {/* Operational Rescue Team Status (Officials Only) */}
      {isOfficial && (
        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Shield className="w-3 h-3 text-sky-400" />
            <span>Rescue Units Status</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              <span>En Route / Busy</span>
            </div>
          </div>
        </div>
      )}

      {/* Safety Assets & Spatial Polygons */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400">
            <Home className="w-3 h-3" />
          </span>
          <span>Relief Camp</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-sky-950 border border-sky-500/40 text-sky-400">
            <Building2 className="w-3 h-3" />
          </span>
          <span>Hospital 24x7</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-amber-950 border border-amber-500/40 text-amber-400">
            <Flame className="w-3 h-3" />
          </span>
          <span>Hazard Risk Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded bg-purple-950 border border-purple-500/40 text-purple-400">
            <Map className="w-3 h-3" />
          </span>
          <span>District Boundary</span>
        </div>
      </div>
    </div>
  );
};
