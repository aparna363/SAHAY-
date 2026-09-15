import L from 'leaflet';
import type { MapIncident, MapShelter, MapHospital } from '../../../services/mapService';

export function getSeverityColor(severity: string): { bg: string; border: string; text: string; hex: string; dot: string } {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return { bg: 'bg-red-600', border: 'border-red-400', text: 'text-red-600', hex: '#dc2626', dot: 'bg-red-500' };
    case 'HIGH':
      return { bg: 'bg-orange-500', border: 'border-orange-300', text: 'text-orange-600', hex: '#f97316', dot: 'bg-orange-500' };
    case 'MODERATE':
      return { bg: 'bg-yellow-500', border: 'border-yellow-300', text: 'text-yellow-700', hex: '#eab308', dot: 'bg-yellow-500' };
    default:
      return { bg: 'bg-emerald-600', border: 'border-emerald-300', text: 'text-emerald-700', hex: '#059669', dot: 'bg-emerald-500' };
  }
}

export function createIncidentMarkerIcon(incident: MapIncident): L.DivIcon {
  const sev = getSeverityColor(incident.severity);
  const isCritical = incident.severity === 'CRITICAL';

  const html = `
    <div class="relative group cursor-pointer flex items-center justify-center">
      ${isCritical ? `<div class="absolute -inset-2 bg-red-500/40 rounded-full animate-ping pointer-events-none"></div>` : ''}
      <div class="w-8 h-8 rounded-2xl ${sev.bg} border-2 border-white shadow-xl flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div class="absolute -bottom-1 -right-1 px-1 py-0.2 bg-slate-950 text-[8px] font-black font-mono text-white rounded-md border border-slate-700 shadow-xs">
        ${incident.severity.slice(0, 3)}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-incident-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

export function generateIncidentPopupHtml(
  incident: MapIncident,
  role: 'citizen' | 'rescue_team' | 'collector' | 'admin',
  nearestShelter?: MapShelter | null,
  nearestHospital?: MapHospital | null
): string {
  const sev = getSeverityColor(incident.severity);
  const isCitizen = role === 'citizen';
  const isRescue = role === 'rescue_team';
  const isCollector = role === 'collector' || role === 'admin';

  const timeAgo = incident.createdAt ? new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';

  let actionsHtml = '';

  if (isCitizen) {
    actionsHtml = `
      <div class="pt-2 border-t border-slate-100 flex gap-2">
        <button 
          onclick="window.__sahayMap_getSafeRoute && window.__sahayMap_getSafeRoute('${incident.incidentCode}', ${incident.latitude}, ${incident.longitude})"
          class="w-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-xs text-center flex items-center justify-center gap-1.5"
        >
          <span>Get Safe Route</span>
        </button>
      </div>
    `;
  } else if (isRescue) {
    actionsHtml = `
      <div class="pt-2 border-t border-slate-100 space-y-1.5">
        <button 
          onclick="window.__sahayMap_startNavigation && window.__sahayMap_startNavigation('${incident.incidentCode}', ${incident.latitude}, ${incident.longitude})"
          class="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl transition-all shadow-xs text-center flex items-center justify-center gap-1"
        >
          <span>Start Navigation</span>
        </button>
        <div class="grid grid-cols-2 gap-1.5">
          <button 
            onclick="window.__sahayMap_updateStatus && window.__sahayMap_updateStatus('${incident.id}', 'EN_ROUTE')"
            class="bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold py-1 px-2 rounded-lg transition-all text-center"
          >
            En Route
          </button>
          <button 
            onclick="window.__sahayMap_updateStatus && window.__sahayMap_updateStatus('${incident.id}', 'RESOLVED')"
            class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1 px-2 rounded-lg transition-all text-center"
          >
            Resolved
          </button>
        </div>
      </div>
    `;
  } else if (isCollector) {
    actionsHtml = `
      <div class="pt-2 border-t border-slate-100 flex gap-1.5">
        <button 
          onclick="window.__sahayMap_openAssignModal && window.__sahayMap_openAssignModal('${incident.id}', '${incident.incidentCode}')"
          class="flex-1 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-1.5 px-2 rounded-xl transition-all text-center"
        >
          Assign Team
        </button>
        <button 
          onclick="window.__sahayMap_viewDetails && window.__sahayMap_viewDetails('${incident.id}')"
          class="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-2 rounded-xl transition-all text-center"
        >
          View Details
        </button>
      </div>
    `;
  }

  return `
    <div class="sahay-popup font-sans text-slate-800 p-1 min-w-[260px] max-w-[320px] space-y-2.5">
      <!-- Header -->
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${sev.dot}"></span>
            <span class="text-xs font-black text-slate-900 tracking-tight">${incident.incidentTypeName}</span>
          </div>
          <span class="font-mono text-[10px] text-slate-500 font-bold">${incident.incidentCode}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${sev.bg}">
          ${incident.severity}
        </span>
      </div>

      <!-- Location and Description -->
      <div class="space-y-1 text-xs">
        <div class="text-[11px] font-semibold text-slate-600 flex items-start gap-1">
          <span class="text-slate-400 shrink-0">📍</span>
          <span class="line-clamp-2">${incident.locationAddress || 'Area reported'}</span>
        </div>
        <p class="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-snug">
          ${incident.description || 'Disaster incident reported in this sector.'}
        </p>
      </div>

      <!-- Public Safety Context for Citizen -->
      ${isCitizen ? `
        <div class="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2 space-y-1 text-[11px] text-amber-950 font-medium">
          <div class="font-bold flex items-center gap-1 text-amber-800">
            <span>⚠️ Safety Advisory:</span>
          </div>
          <p class="text-[10px] text-amber-900 leading-tight">Avoid low-lying roads and waterlogged zones.</p>
          ${nearestShelter ? `
            <div class="flex justify-between items-center text-[10px] pt-1 border-t border-amber-200/60 font-semibold">
              <span class="text-emerald-800">Nearest Shelter:</span>
              <strong class="text-slate-900 truncate max-w-[140px]">${nearestShelter.name} (${nearestShelter.distanceKm || '2.1'} km)</strong>
            </div>
          ` : ''}
          ${nearestHospital ? `
            <div class="flex justify-between items-center text-[10px] font-semibold">
              <span class="text-sky-800">Nearest Hospital:</span>
              <strong class="text-slate-900 truncate max-w-[140px]">${nearestHospital.name} (${nearestHospital.distanceKm || '3.4'} km)</strong>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Operational Info for Officials -->
      ${!isCitizen ? `
        <div class="bg-slate-50 rounded-xl p-2 border border-slate-200 space-y-1 text-[11px]">
          <div class="flex justify-between items-center">
            <span class="text-slate-500 font-semibold">Status:</span>
            <span class="font-bold text-slate-900 font-mono">${incident.status}</span>
          </div>
          ${incident.assignment?.assignedTeam ? `
            <div class="flex justify-between items-center text-emerald-800 font-semibold">
              <span>Assigned:</span>
              <span class="truncate max-w-[130px] font-bold">${incident.assignment.assignedTeam}</span>
            </div>
          ` : `
            <div class="flex justify-between items-center text-amber-700 font-semibold">
              <span>Assigned:</span>
              <span>Pending Dispatch</span>
            </div>
          `}
          ${incident.reporter ? `
            <div class="flex justify-between items-center text-slate-600 text-[10px]">
              <span>Reporter:</span>
              <span>${incident.reporter.name || 'Citizen'} (${incident.reporter.phone || 'N/A'})</span>
            </div>
          ` : ''}
          <div class="flex justify-between items-center text-slate-400 text-[10px]">
            <span>Reported:</span>
            <span>${timeAgo}</span>
          </div>
        </div>
      ` : ''}

      <!-- Actions -->
      ${actionsHtml}
    </div>
  `;
}
