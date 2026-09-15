import L from 'leaflet';
import type { SafeRouteData, NormalRouteData } from '../../../services/mapService';

export function renderSafeRouteOnMap(
  map: L.Map,
  routeLayerRef: React.MutableRefObject<L.LayerGroup | null>,
  safeRouteData: SafeRouteData | null,
  normalRouteData: NormalRouteData | null = null,
  destinationName: string = 'Safe Destination',
  selectedRouteType: 'safe' | 'normal' = 'safe',
  onSelectRoute?: (type: 'safe' | 'normal') => void
) {
  if (!map) return;

  // Clear previous route layers
  if (routeLayerRef.current) {
    routeLayerRef.current.clearLayers();
  } else {
    routeLayerRef.current = L.layerGroup().addTo(map);
  }

  if (!safeRouteData || !safeRouteData.coordinates || safeRouteData.coordinates.length < 2) {
    return;
  }

  const safeCoords = safeRouteData.coordinates;
  const normalCoords = normalRouteData?.coordinates;
  const allBounds: L.LatLngBounds[] = [];

  // Check if routes are identical (e.g. normal route is already safe)
  const isIdentical = normalCoords &&
    normalCoords.length === safeCoords.length &&
    Math.abs(normalCoords[0][0] - safeCoords[0][0]) < 0.0001 &&
    Math.abs(normalCoords[Math.floor(normalCoords.length / 2)][0] - safeCoords[Math.floor(safeCoords.length / 2)][0]) < 0.0001;

  // -------------------------------------------------------------
  // 1. RENDER NORMAL ROUTE (BLUE LINE - Conventional Shortest Path)
  // -------------------------------------------------------------
  if (normalCoords && normalCoords.length >= 2 && !isIdentical) {
    const isNormalSelected = selectedRouteType === 'normal';
    const isNormalRisky = normalRouteData.riskLevel === 'HIGH' || normalRouteData.riskLevel === 'CRITICAL';
    const isNormalBlocked = normalRouteData.isBlocked;

    // Normal Route Shadow / Casing
    const normalCasing = L.polyline(normalCoords, {
      color: isNormalBlocked ? '#7f1d1d' : '#1e3a8a',
      weight: isNormalSelected ? 7 : 5,
      opacity: 0.35,
      lineCap: 'round'
    });
    normalCasing.addTo(routeLayerRef.current);

    // Normal Route Main Polyline (Muted Blue, dashed to indicate non-recommended or comparison)
    const normalPolyline = L.polyline(normalCoords, {
      color: isNormalBlocked ? '#ef4444' : isNormalRisky ? '#3b82f6' : '#2563eb',
      weight: isNormalSelected ? 6 : 4,
      opacity: isNormalSelected ? 0.95 : 0.70,
      dashArray: isNormalRisky ? '6, 6' : undefined,
      lineCap: 'round'
    });

    const normalTooltipHtml = `
      <div class="text-xs font-sans p-1">
        <div class="font-black text-blue-700 flex items-center gap-1">
          <span>🔵 Normal Route (Shortest)</span>
        </div>
        <div class="text-slate-600 text-[10px] mt-0.5">
          ${normalRouteData.distanceKm} km &bull; ${normalRouteData.travelTimeMinutes} min &bull;
          <span class="font-bold ${isNormalRisky || isNormalBlocked ? 'text-rose-600' : 'text-emerald-600'}">
            ${normalRouteData.riskLevel} RISK
          </span>
        </div>
        ${isNormalBlocked ? '<div class="text-[9px] text-rose-600 font-bold mt-0.5">⛔ Confirmed Road Blockage</div>' : ''}
      </div>
    `;

    normalPolyline.bindTooltip(normalTooltipHtml, {
      permanent: false,
      direction: 'top',
      sticky: true,
      className: 'sahay-route-tooltip'
    });

    normalPolyline.on('click', () => {
      if (onSelectRoute) onSelectRoute('normal');
    });

    normalPolyline.addTo(routeLayerRef.current);
    allBounds.push(normalPolyline.getBounds());

    // Render Hazard Callout Markers on normal route where danger exists
    if (isNormalBlocked || isNormalRisky) {
      const midIdx = Math.floor(normalCoords.length * 0.45);
      const hazardPt = normalCoords[midIdx];
      const hazardIconHtml = `
        <div class="w-6 h-6 rounded-full ${isNormalBlocked ? 'bg-rose-600' : 'bg-amber-500'} border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-[10px] animate-pulse cursor-pointer">
          ${isNormalBlocked ? '🚧' : '⚠️'}
        </div>
      `;
      const hazardDivIcon = L.divIcon({
        className: 'sahay-route-hazard-icon',
        html: hazardIconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const hazardMarker = L.marker(hazardPt, { icon: hazardDivIcon });
      const hazardReason = isNormalBlocked
        ? 'Normal Route Avoided: Blocked road detected'
        : 'Normal Route Avoided: Passes through active disaster zone';
      hazardMarker.bindTooltip(`⚠️ ${hazardReason}`, { direction: 'top' });
      hazardMarker.addTo(routeLayerRef.current);
    }
  }

  // -------------------------------------------------------------
  // 2. RENDER SAHAY SAFE ROUTE (GREEN LINE - Recommended Detour)
  // -------------------------------------------------------------
  const isSafeSelected = selectedRouteType === 'safe';

  // Safe Route Outer Glow / Contrast Border
  const safeOutline = L.polyline(safeCoords, {
    color: '#064e3b', // Deep green casing
    weight: isSafeSelected ? 10 : 8,
    opacity: 0.60,
    lineCap: 'round'
  });
  safeOutline.addTo(routeLayerRef.current);

  // Safe Route Vibrant Green Core
  const safePolyline = L.polyline(safeCoords, {
    color: '#059669', // Emerald green
    weight: isSafeSelected ? 6 : 5,
    opacity: 1.0,
    lineCap: 'round'
  });

  const safeTooltipHtml = `
    <div class="text-xs font-sans p-1">
      <div class="font-black text-emerald-800 flex items-center gap-1">
        <span>🟢 SAHAY Safe Route (Recommended)</span>
      </div>
      <div class="text-slate-600 text-[10px] mt-0.5">
        ${safeRouteData.distanceKm} km &bull; ${safeRouteData.travelTimeMinutes} min &bull;
        <span class="font-bold text-emerald-700">${safeRouteData.riskLevel} RISK</span>
      </div>
      <div class="text-[9px] text-emerald-700 font-bold mt-0.5">✓ Verified clear of disaster zones</div>
    </div>
  `;

  safePolyline.bindTooltip(safeTooltipHtml, {
    permanent: false,
    direction: 'top',
    sticky: true,
    className: 'sahay-route-tooltip'
  });

  safePolyline.on('click', () => {
    if (onSelectRoute) onSelectRoute('safe');
  });

  safePolyline.addTo(routeLayerRef.current);
  allBounds.push(safePolyline.getBounds());

  // -------------------------------------------------------------
  // 3. START MARKER (Citizen Origin GPS)
  // -------------------------------------------------------------
  const startPt = safeCoords[0];
  const startIconHtml = `
    <div class="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs animate-bounce">
      📍
    </div>
  `;
  const startDivIcon = L.divIcon({
    className: 'sahay-route-start-icon',
    html: startIconHtml,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
  const startMarker = L.marker(startPt, { icon: startDivIcon });
  startMarker.bindTooltip('📍 Your GPS Origin', { permanent: false, direction: 'top' });
  startMarker.addTo(routeLayerRef.current);

  // -------------------------------------------------------------
  // 4. DESTINATION MARKER (Relief Hub / Shelter / Destination)
  // -------------------------------------------------------------
  const endPt = safeCoords[safeCoords.length - 1];
  const endIconHtml = `
    <div class="w-9 h-9 rounded-full bg-[#043e2e] border-2 border-emerald-400 shadow-xl flex items-center justify-center text-white font-black text-sm">
      🏫
    </div>
  `;
  const endDivIcon = L.divIcon({
    className: 'sahay-route-end-icon',
    html: endIconHtml,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
  const endMarker = L.marker(endPt, { icon: endDivIcon });
  endMarker.bindTooltip(`🏫 ${destinationName}`, { permanent: false, direction: 'top' });
  endMarker.addTo(routeLayerRef.current);

  // -------------------------------------------------------------
  // 5. FIT BOUNDS TO BOTH ROUTES
  // -------------------------------------------------------------
  if (allBounds.length > 0) {
    let combinedBounds = allBounds[0];
    for (let i = 1; i < allBounds.length; i++) {
      combinedBounds = combinedBounds.extend(allBounds[i]);
    }
    map.fitBounds(combinedBounds, { padding: [70, 70], maxZoom: 15 });
  }
}
