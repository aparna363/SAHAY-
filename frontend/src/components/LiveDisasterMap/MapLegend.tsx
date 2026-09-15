import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-md text-xs transition-all overflow-hidden max-w-xs">
      {/* Header / Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-3 py-2 flex items-center justify-between gap-3 text-slate-800 font-bold hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#0E8F66]" />
          <span className="text-[11px] uppercase tracking-wider font-extrabold">MAP LEGEND</span>
        </div>
        {collapsed ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Collapsible Content */}
      {!collapsed && (
        <div className="p-3 pt-1 border-t border-slate-100 space-y-2 text-[11px]">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Risk & Route Status</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="font-semibold text-slate-700">GREEN = Safe</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span>
              <span className="font-semibold text-slate-700">YELLOW = Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0"></span>
              <span className="font-semibold text-slate-700">ORANGE = High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shrink-0"></span>
              <span className="font-semibold text-slate-700">RED = Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
              <span className="font-semibold text-slate-700">BLUE = Evacuation Route</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500 shrink-0"></span>
              <span className="font-semibold text-slate-700">GREY = Road Closed / Unavailable</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-1.5 space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Key Markers</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">🏫</span>
              <span className="font-medium text-slate-600">Evacuation Center (Shelter)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">🚒</span>
              <span className="font-medium text-slate-600">Rescue Team (Civil Defense)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">🌊</span>
              <span className="font-medium text-slate-600">IoT Telemetry Sensor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">📍</span>
              <span className="font-medium text-slate-600">Your GPS Location</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
