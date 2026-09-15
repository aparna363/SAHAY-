import L from 'leaflet';
import type { MapShelter } from '../../../services/mapService';

export function createShelterMarkerIcon(shelter: MapShelter): L.DivIcon {
  const isOpen = (shelter.availableCapacity || 0) > 0;

  const html = `
    <div class="relative group cursor-pointer flex items-center justify-center">
      <div class="w-8 h-8 rounded-2xl ${isOpen ? 'bg-emerald-700' : 'bg-slate-700'} border-2 border-white shadow-xl flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div class="absolute -bottom-1 -right-1 px-1 py-0.2 bg-emerald-950 text-[8px] font-black text-emerald-300 rounded-md border border-emerald-700 shadow-xs">
        CAMP
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-shelter-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
}

export function generateShelterPopupHtml(shelter: MapShelter): string {
  const occupied = (shelter.capacity || 100) - (shelter.availableCapacity || 0);
  const occupancyPercent = Math.min(100, Math.round((occupied / (shelter.capacity || 100)) * 100));

  return `
    <div class="sahay-popup font-sans text-slate-800 p-1 min-w-[250px] max-w-[290px] space-y-2.5">
      <!-- Header -->
      <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-base">🏠</span>
            <h4 class="text-xs font-black text-slate-900 tracking-tight leading-tight">${shelter.name}</h4>
          </div>
          <span class="text-[10px] font-semibold text-slate-500">${shelter.district} &bull; ${shelter.distanceKm ? `${shelter.distanceKm} km away` : 'Relief Shelter'}</span>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white bg-emerald-600">
          ${shelter.status || 'OPEN'}
        </span>
      </div>

      <!-- Capacity & Occupancy -->
      <div class="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-2 text-xs">
        <div class="flex justify-between items-center text-[11px] font-semibold">
          <span class="text-slate-500">Total Capacity:</span>
          <span class="font-bold text-slate-900">${shelter.capacity} Beds</span>
        </div>
        <div class="flex justify-between items-center text-[11px] font-semibold">
          <span class="text-emerald-700">Available Beds:</span>
          <span class="font-bold text-emerald-800 text-sm">${shelter.availableCapacity} Free</span>
        </div>

        <!-- Progress bar -->
        <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div class="bg-emerald-600 h-full rounded-full transition-all" style="width: ${occupancyPercent}%"></div>
        </div>
        <div class="text-[10px] text-slate-400 text-right font-mono">${occupancyPercent}% Occupied</div>
      </div>

      <!-- Contact & Address -->
      ${shelter.address ? `
        <div class="text-[11px] text-slate-600 flex items-start gap-1">
          <span class="text-slate-400 shrink-0">📍</span>
          <span class="line-clamp-2">${shelter.address}</span>
        </div>
      ` : ''}

      <!-- Actions -->
      <div class="pt-2 border-t border-slate-100 flex gap-2">
        <button 
          onclick="window.__sahayMap_getDirections && window.__sahayMap_getDirections(${shelter.latitude}, ${shelter.longitude}, '${shelter.name.replace(/'/g, "\\'")}')"
          class="flex-1 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold py-1.5 px-3 rounded-xl transition-all shadow-xs text-center flex items-center justify-center gap-1"
        >
          <span>Get Directions</span>
        </button>
        ${shelter.contactNumber ? `
          <a 
            href="tel:${shelter.contactNumber}"
            class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-xl transition-all text-center"
          >
            Call
          </a>
        ` : ''}
      </div>
    </div>
  `;
}
