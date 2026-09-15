import React from 'react';
import { Navigation } from 'lucide-react';
import type { SafetyStatusResponse } from '../../services/mapService';

interface SafetySummaryProps {
  safetyStatus: SafetyStatusResponse | null;
  onViewSafeRoute: () => void;
  onEvacuateMe: () => void;
}

export const SafetySummary: React.FC<SafetySummaryProps> = ({
  safetyStatus,
  onViewSafeRoute,
  onEvacuateMe
}) => {
  const metrics = safetyStatus?.metrics;
  const status = safetyStatus?.safetyStatus || 'SAFE';

  const statusBadge = {
    SAFE: { color: 'text-emerald-700', bg: 'bg-emerald-100', dot: '🟢', text: 'SAFE' },
    WARNING: { color: 'text-amber-700', bg: 'bg-amber-100', dot: '🟡', text: 'WARNING' },
    EMERGENCY: { color: 'text-rose-700', bg: 'bg-rose-100', dot: '🔴', text: 'EMERGENCY' }
  }[status];

  const nearestShelter = metrics?.nearestShelter;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[10px] font-mono font-black uppercase text-slate-400 tracking-wider">
            SITUATION TELEMETRY
          </span>
          <h2 className="text-sm font-black text-slate-900">SAFETY SUMMARY</h2>
        </div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${statusBadge.bg} ${statusBadge.color}`}>
          {statusBadge.dot} Area: {statusBadge.text}
        </span>
      </div>

      {/* Dynamic Count Grid */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-slate-50">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="text-red-500">🔴</span> Active Disasters:
          </span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            {metrics?.activeDisastersNearby ?? 0}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-50">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span>🚨</span> Active Incidents:
          </span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            {metrics?.activeIncidentsNearby ?? 0}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-50">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span>🚧</span> Blocked Roads:
          </span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            {metrics?.blockedRoadsNearby ?? 0}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-50">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span>🏫</span> Open Shelters:
          </span>
          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            {metrics?.openSheltersNearby ?? 0}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-50">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span>🚒</span> Rescue Teams:
          </span>
          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
            {metrics?.rescueTeamsNearby ?? 0}
          </span>
        </div>
      </div>

      {/* Nearest Safe Shelter Callout */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
            Nearest Safe Shelter
          </span>
          <span className="text-xs font-black text-emerald-700">
            {nearestShelter ? `${nearestShelter.distanceKm} km` : 'Computing...'}
          </span>
        </div>
        <p className="text-xs font-bold text-slate-800 truncate">
          {nearestShelter?.name || 'Local Relief Hub'}
        </p>
        <p className="text-[11px] text-slate-500">
          {nearestShelter?.availableCapacity ?? 150} beds available &bull; Open 24x7
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onViewSafeRoute}
          className="flex-1 px-3 py-2 bg-[#043e2e] hover:bg-[#065f46] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-300" />
          <span>VIEW SAFE ROUTE</span>
        </button>

        <button
          onClick={onEvacuateMe}
          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          title="Start Evacuation Decision Support"
        >
          🚨
        </button>
      </div>
    </div>
  );
};
