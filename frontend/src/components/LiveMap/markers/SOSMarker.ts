import L from 'leaflet';
import type { SOSRequest } from '../../../services/sosService';

/**
 * Creates custom Leaflet DivIcon for SOS Emergency Markers with different visual states
 */
export function createSOSMarkerIcon(sos: SOSRequest): L.DivIcon {
  const isPending = sos.status === 'Pending' || sos.status === 'Acknowledged';
  const isAssigned = sos.status === 'Team Assigned';
  const isInProgress = sos.status === 'Rescue In Progress';

  let bgClass = 'bg-red-600';
  let ringClass = 'border-red-200';
  let badgeText = 'SOS';
  let badgeColor = 'bg-red-950 text-white border-red-500';
  let pingEffect = '';

  if (isPending) {
    bgClass = 'bg-red-600';
    ringClass = 'border-white';
    badgeText = 'SOS';
    badgeColor = 'bg-red-950 text-white border-red-500';
    pingEffect = '<div class="absolute -inset-2.5 bg-red-600/50 rounded-full animate-ping pointer-events-none"></div>';
  } else if (isAssigned) {
    bgClass = 'bg-sky-600';
    ringClass = 'border-white';
    badgeText = 'ASSIGNED';
    badgeColor = 'bg-sky-950 text-white border-sky-400';
    pingEffect = '<div class="absolute -inset-1.5 bg-sky-500/40 rounded-full animate-pulse pointer-events-none"></div>';
  } else if (isInProgress) {
    bgClass = 'bg-amber-600';
    ringClass = 'border-white';
    badgeText = 'IN OPS';
    badgeColor = 'bg-amber-950 text-white border-amber-400';
    pingEffect = '<div class="absolute -inset-2 bg-amber-500/50 rounded-full animate-ping pointer-events-none"></div>';
  } else {
    bgClass = 'bg-emerald-600';
    ringClass = 'border-white';
    badgeText = 'RESOLVED';
    badgeColor = 'bg-emerald-950 text-white border-emerald-400';
  }

  const html = `
    <div class="relative group cursor-pointer flex items-center justify-center">
      ${pingEffect}
      <div class="w-9 h-9 rounded-2xl ${bgClass} border-2 ${ringClass} shadow-2xl flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="2"/>
          <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
        </svg>
      </div>
      <div class="absolute -bottom-2 -right-1 px-1.5 py-0.2 ${badgeColor} text-[8px] font-black font-mono rounded-md border shadow-xs">
        ${badgeText}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-sos-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
}

/**
 * Generates popup HTML matching Requirement 8:
 * - SOS ID
 * - Emergency Type
 * - Location
 * - People Affected
 * - Time
 * - Current Status
 * - Assigned Rescue Team
 */
export function generateSOSPopupHtml(sos: SOSRequest): string {
  const timeStr = new Date(sos.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const isPending = sos.status === 'Pending' || sos.status === 'Acknowledged';
  const statusBadge = isPending
    ? '<span class="bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">Pending</span>'
    : sos.status === 'Team Assigned'
    ? '<span class="bg-sky-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">Team Assigned</span>'
    : sos.status === 'Rescue In Progress'
    ? '<span class="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">Rescue In Progress</span>'
    : '<span class="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">Resolved</span>';

  return `
    <div class="p-3.5 space-y-2.5 max-w-[280px] font-sans text-slate-900">
      <!-- Header -->
      <div class="border-b border-slate-100 pb-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-mono font-black text-red-600 tracking-wider">
            🚨 ${sos.sos_code}
          </span>
          ${statusBadge}
        </div>
        <h4 class="text-sm font-black text-slate-900 mt-1">
          ${sos.emergency_type} Emergency
        </h4>
      </div>

      <!-- Information Rows -->
      <div class="space-y-1.5 text-xs text-slate-600">
        <div class="flex items-start gap-1.5">
          <span class="font-bold text-slate-700 shrink-0">Location:</span>
          <span class="text-slate-800 break-words">${sos.address || `${sos.taluk || ''}, ${sos.district}`}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-700">People Affected:</span>
          <span class="font-black text-red-600 font-mono">${sos.affected_people}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-700">Time of Request:</span>
          <span class="font-medium text-slate-800">${timeStr}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-700">Current Status:</span>
          <span class="font-bold text-slate-900">${sos.status}</span>
        </div>

        <div class="flex items-start gap-1.5 pt-1 border-t border-slate-100">
          <span class="font-bold text-slate-700 shrink-0">Assigned Team:</span>
          <span class="font-bold text-slate-900 truncate">
            ${sos.assigned_team_name ? `🚑 ${sos.assigned_team_name}` : '<em class="text-amber-600 font-normal">Awaiting Assignment</em>'}
          </span>
        </div>

        ${sos.description ? `
          <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 italic mt-1">
            "${sos.description}"
          </div>
        ` : ''}
      </div>

      <!-- Actions -->
      <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
        <a
          href="https://www.google.com/maps/dir/?api=1&destination=${sos.latitude},${sos.longitude}"
          target="_blank"
          rel="noopener noreferrer"
          class="w-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1 shadow-2xs"
        >
          <span>Navigate</span>
        </a>
        ${sos.reporter_phone ? `
          <a
            href="tel:${sos.reporter_phone}"
            class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1 shadow-2xs"
          >
            <span>Call Citizen</span>
          </a>
        ` : `
          <button
            onclick="window.__sahayMap_getSafeRoute && window.__sahayMap_getSafeRoute('${sos.sos_code}', ${sos.latitude}, ${sos.longitude})"
            class="w-full bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-bold py-1.5 px-2 rounded-xl text-center"
          >
            <span>Safe Route</span>
          </button>
        `}
      </div>
    </div>
  `;
}
