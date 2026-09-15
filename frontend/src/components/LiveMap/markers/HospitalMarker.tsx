import L from 'leaflet';
import type { MapHospital } from '../../../services/mapService';

export function createHospitalMarkerIcon(_hospital?: MapHospital): L.DivIcon {
  const html = `
    <div class="relative group cursor-pointer flex items-center justify-center">
      <div class="w-8 h-8 rounded-2xl bg-sky-700 border-2 border-white shadow-xl flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6v12"/>
          <path d="M6 12h12"/>
        </svg>
      </div>
      <div class="absolute -bottom-1 -right-1 px-1 py-0.2 bg-sky-950 text-[8px] font-black text-sky-300 rounded-md border border-sky-700 shadow-xs">
        HOSP
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hospital-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

export function generateHospitalPopupHtml(hospital: MapHospital): string {
  return `
    <div class="sahay-popup font-sans text-slate-800 p-1 min-w-[250px] max-w-[290px] space-y-2.5">
      <!-- Header -->
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-base">🏥</span>
            <h4 class="text-xs font-black text-slate-900 tracking-tight leading-tight">${hospital.name}</h4>
          </div>
          <span class="text-[10px] font-semibold text-slate-500">${hospital.district} &bull; ${hospital.distanceKm ? `${hospital.distanceKm} km away` : 'Emergency Center'}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white bg-sky-600">
          ${hospital.emergencyAvailable ? '24x7 Emergency' : 'General'}
        </span>
      </div>

      <!-- Emergency Capabilities -->
      <div class="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-xs">
        <div class="flex justify-between items-center text-[11px]">
          <span class="text-slate-500 font-semibold">Trauma Facility:</span>
          <span class="font-bold text-slate-900">${hospital.traumaCareLevel || 'Level 2 Trauma'}</span>
        </div>
        <div class="flex justify-between items-center text-[11px]">
          <span class="text-slate-500 font-semibold">Total Capacity:</span>
          <span class="font-bold text-slate-900">${hospital.bedCapacity} Beds</span>
        </div>
        <div class="flex justify-between items-center text-[11px]">
          <span class="text-sky-700 font-semibold">Available Emergency Beds:</span>
          <span class="font-bold text-sky-800 text-sm">${hospital.availableBeds} Free</span>
        </div>
      </div>

      <!-- Contact & Address -->
      ${hospital.address ? `
        <div class="text-[11px] text-slate-600 flex items-start gap-1">
          <span class="text-slate-400 shrink-0">📍</span>
          <span class="line-clamp-2">${hospital.address}</span>
        </div>
      ` : ''}

      <!-- Actions -->
      <div class="pt-2 border-t border-slate-100 flex gap-2">
        <button 
          onclick="window.__sahayMap_getDirections && window.__sahayMap_getDirections(${hospital.latitude}, ${hospital.longitude}, '${hospital.name.replace(/'/g, "\\'")}')"
          class="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl transition-all shadow-xs text-center flex items-center justify-center gap-1"
        >
          <span>Get Directions</span>
        </button>
        ${hospital.contactNumber ? `
          <a 
            href="tel:${hospital.contactNumber}"
            class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-xl transition-all text-center"
          >
            Call
          </a>
        ` : ''}
      </div>
    </div>
  `;
}
