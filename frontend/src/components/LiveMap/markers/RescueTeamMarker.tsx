import L from 'leaflet';
import type { MapRescueTeam } from '../../../services/mapService';

export function getTeamStatusBadge(status: string): { bg: string; text: string; hex: string } {
  switch (status?.toUpperCase()) {
    case 'AVAILABLE':
    case 'ACTIVE':
      return { bg: 'bg-emerald-600', text: 'text-emerald-300', hex: '#059669' };
    case 'ON_DUTY':
    case 'BUSY':
      return { bg: 'bg-orange-500', text: 'text-orange-300', hex: '#f97316' };
    case 'EN_ROUTE':
      return { bg: 'bg-amber-500', text: 'text-amber-300', hex: '#eab308' };
    case 'AT_SCENE':
      return { bg: 'bg-red-600', text: 'text-red-300', hex: '#dc2626' };
    default:
      return { bg: 'bg-slate-600', text: 'text-slate-300', hex: '#475569' };
  }
}

export function createRescueTeamMarkerIcon(team: MapRescueTeam): L.DivIcon {
  const badge = getTeamStatusBadge(team.status);
  const isMoving = team.status === 'EN_ROUTE' || team.status === 'AT_SCENE';

  const html = `
    <div class="relative group cursor-pointer flex items-center justify-center">
      ${isMoving ? `<div class="absolute -inset-2 bg-orange-400/40 rounded-full animate-ping pointer-events-none"></div>` : ''}
      <div class="w-8 h-8 rounded-full ${badge.bg} border-2 border-white shadow-xl flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
        </svg>
      </div>
      <div class="absolute -bottom-1 -right-1 px-1 py-0.2 bg-slate-950 text-[8px] font-black font-mono text-white rounded-md border border-slate-700 shadow-xs">
        ${team.unitType === 'NDRF' ? 'NDRF' : 'FRS'}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-rescue-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

export function generateRescueTeamPopupHtml(team: MapRescueTeam): string {
  const badge = getTeamStatusBadge(team.status);

  return `
    <div class="sahay-popup font-sans text-slate-800 p-1 min-w-[260px] max-w-[300px] space-y-2.5">
      <!-- Header -->
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl ${badge.bg} text-white flex items-center justify-center text-xs font-black">
            🚒
          </div>
          <div>
            <h4 class="text-xs font-black text-slate-900">${team.unitName}</h4>
            <span class="text-[10px] font-mono font-bold text-slate-500">${team.unitId} &bull; ${team.district}</span>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white ${badge.bg}">
          ${team.status.replace('_', ' ')}
        </span>
      </div>

      <!-- Operational Status -->
      <div class="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-xs">
        <div class="flex justify-between items-center text-[11px]">
          <span class="text-slate-500 font-semibold">Team Leader:</span>
          <span class="font-bold text-slate-900">${team.teamLeader || 'Duty Commander'}</span>
        </div>
        <div class="flex justify-between items-center text-[11px]">
          <span class="text-slate-500 font-semibold">Team Strength:</span>
          <span class="font-bold text-slate-900">${team.teamSize || 12} Rescuers</span>
        </div>
        <div class="flex justify-between items-center text-[11px]">
          <span class="text-slate-500 font-semibold">Current Operation:</span>
          <span class="font-mono font-bold text-emerald-800">
            ${team.assignedIncidentId ? `Incident #${team.assignedIncidentId}` : 'Standby / Patrol'}
          </span>
        </div>
        <div class="flex justify-between items-center text-[11px]">
          <span class="text-slate-500 font-semibold">Base / Location:</span>
          <span class="text-slate-800 truncate max-w-[130px] font-semibold">${team.currentLocation || 'District Station'}</span>
        </div>
      </div>

      <!-- Telemetry Status -->
      <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
        <span>Last GPS Update:</span>
        <span class="font-bold ${team.isStale ? 'text-amber-600' : 'text-emerald-700'}">
          ${team.minutesSinceUpdate ? `${team.minutesSinceUpdate}m ago` : 'Live Telemetry'}
        </span>
      </div>

      ${team.isStale ? `
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-1.5 text-[10px] text-amber-800 font-semibold text-center">
          ⚠️ Location not updated recently (Stale GPS)
        </div>
      ` : ''}

      <!-- Quick Actions -->
      <div class="pt-2 border-t border-slate-100 flex gap-2">
        ${team.contactNumber ? `
          <a 
            href="tel:${team.contactNumber}"
            class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-2 rounded-xl transition-all text-center"
          >
            Call Unit
          </a>
        ` : ''}
      </div>
    </div>
  `;
}
