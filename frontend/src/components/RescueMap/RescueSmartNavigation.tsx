import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation as NavIcon,
  MapPin,
  Compass,
  RotateCw,
  ExternalLink,
  CheckCircle2,
  AlertOctagon,
  ShieldAlert,
  X
} from 'lucide-react';
import {
  calculateRescueSafeRoute,
  type SafeRouteResponse,
  type RescueMapIncident
} from '../../services/api';

interface RescueSmartNavigationProps {
  incident: RescueMapIncident | null;
  currentTeamLocation?: { lat: number; lng: number } | null;
  teamUnitName?: string;
  onArrivedAtSite?: (incidentId: number | string) => void;
  onOpenEvidenceForm?: (incidentId: number | string) => void;
  onClose?: () => void;
}

export const RescueSmartNavigation: React.FC<RescueSmartNavigationProps> = ({
  incident,
  currentTeamLocation,
  teamUnitName = 'Rescue Team Unit',
  onArrivedAtSite,
  onOpenEvidenceForm,
  onClose
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);

  // GPS Origin state
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number }>(() => {
    return currentTeamLocation || { lat: 9.5916, lng: 76.5222 };
  });
  const [originName, setOriginName] = useState<string>(`${teamUnitName} Station Base`);

  // Routing state
  const [routeData, setRouteData] = useState<SafeRouteResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('safest');
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Navigation active mode
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Fetch routes from backend smart routing engine
  const computeRoutes = useCallback(async (start: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
    try {
      setIsLoadingRoute(true);
      setRouteError(null);
      const res = await calculateRescueSafeRoute(start, dest);
      setRouteData(res);
      setSelectedRouteId(res.recommendedRouteId || 'safest');
    } catch (err: any) {
      console.error('Routing calculation error:', err);
      setRouteError(err.message || 'Unable to calculate a safe route right now. Please try again.');
    } finally {
      setIsLoadingRoute(false);
    }
  }, []);

  // Compute on mount or when incident changes
  useEffect(() => {
    if (!incident) return;
    const dest = { lat: incident.latitude, lng: incident.longitude };
    computeRoutes(originCoords, dest);
  }, [incident, originCoords, computeRoutes]);

  // Use current live GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const live = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOriginCoords(live);
        setOriginName('My Live GPS Position');
        if (incident) {
          computeRoutes(live, { lat: incident.latitude, lng: incident.longitude });
        }
      },
      (err) => {
        alert('Could not acquire GPS position: ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [originCoords.lat, originCoords.lng],
      zoom: 12,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap | SAHAY Smart Navigation'
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw Route Polyline & Markers on map
  useEffect(() => {
    if (!mapRef.current || !routeData || !incident) return;

    const activeRoute = routeData.routes.find((r) => r.id === selectedRouteId) || routeData.routes[0];
    if (!activeRoute || !activeRoute.coordinates || activeRoute.coordinates.length === 0) return;

    // 1. Origin Marker
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
    }
    const origIcon = L.divIcon({
      className: 'sahay-nav-origin-pin',
      html: `
        <div class="w-8 h-8 rounded-2xl bg-slate-900 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-black ring-4 ring-slate-900/20">
          🚒
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    originMarkerRef.current = L.marker([originCoords.lat, originCoords.lng], { icon: origIcon })
      .addTo(mapRef.current)
      .bindPopup(`<b>Starting Point</b><br/>${originName}`);

    // 2. Destination Marker
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
    }
    const destIcon = L.divIcon({
      className: 'sahay-nav-dest-pin',
      html: `
        <div class="w-8 h-8 rounded-2xl bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-black ring-4 ring-red-500/30 animate-bounce">
          📍
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
    destMarkerRef.current = L.marker([incident.latitude, incident.longitude], { icon: destIcon })
      .addTo(mapRef.current)
      .bindPopup(`<b>Incident Destination</b><br/>${incident.incidentTypeName} (${incident.incidentCode})`);

    // 3. Polyline for Active Route
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
    }

    const polyColor =
      activeRoute.id === 'safest' ? '#10b981' : activeRoute.id === 'fastest' ? (activeRoute.riskLevel === 'CRITICAL RISK' ? '#ef4444' : '#f59e0b') : '#3b82f6';

    const poly = L.polyline(activeRoute.coordinates, {
      color: polyColor,
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(mapRef.current);

    routePolylineRef.current = poly;

    // Fit map bounds to show complete route
    mapRef.current.fitBounds(poly.getBounds(), { padding: [40, 40] });
  }, [routeData, selectedRouteId, incident, originCoords, originName]);

  const activeRoute = routeData?.routes.find((r) => r.id === selectedRouteId) || routeData?.routes[0];

  // Open in external navigation app fallback
  const handleOpenExternalNav = () => {
    if (!incident) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originCoords.lat},${originCoords.lng}&destination=${incident.latitude},${incident.longitude}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0 text-white animate-fadeIn">
      {/* Top Bar */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <NavIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                SMART NAVIGATION &bull; SAFEST ROUTE
              </h2>
              {activeRoute && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${activeRoute.id === 'safest' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
                  {activeRoute.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              PostGIS disaster hazard avoidance &bull; Real-time blocked road bypass
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
              title="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Control Panel + Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Side: Route Controls & Guidance (5 Cols) */}
        <div className="lg:col-span-5 p-6 space-y-5 bg-slate-900/90 border-r border-slate-800 overflow-y-auto max-h-[640px]">
          {/* 1. Origin & Destination Cards */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>STARTING POINT</span>
                <button
                  onClick={handleUseCurrentLocation}
                  className="text-emerald-400 hover:underline flex items-center gap-1 normal-case text-xs font-bold"
                >
                  <span>Use My Current Location</span>
                </button>
              </div>
              <div className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">{originName}</span>
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                DESTINATION INCIDENT
              </div>
              <div className="font-extrabold text-sm text-red-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span className="truncate">{incident?.incidentTypeName || 'Emergency Site'} ({incident?.incidentCode || 'INC-104'})</span>
              </div>
              <div className="text-[11px] text-slate-400 pl-6 line-clamp-1">
                {incident?.locationAddress || 'Incident Location'}
              </div>
            </div>
          </div>

          {/* 2. Route Options (Safest, Fastest, Alternative) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black uppercase text-slate-400 tracking-wider">
              <span>Available Route Options</span>
              <button
                onClick={() => incident && computeRoutes(originCoords, { lat: incident.latitude, lng: incident.longitude })}
                disabled={isLoadingRoute}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold text-xs"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoadingRoute ? 'animate-spin' : ''}`} />
                <span>Recalculate</span>
              </button>
            </div>

            {routeError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                  <span>Routing Error</span>
                </div>
                <p className="text-[11px] leading-tight">{routeError}</p>
              </div>
            )}

            <div className="space-y-2">
              {routeData?.routes.map((rt) => {
                const isSelected = selectedRouteId === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setSelectedRouteId(rt.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${isSelected ? 'bg-slate-950 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${rt.id === 'safest' ? 'bg-emerald-500 animate-pulse' : rt.riskLevel === 'CRITICAL RISK' ? 'bg-red-500' : 'bg-amber-400'}`}></div>
                        <h4 className="font-black text-xs uppercase tracking-wider text-white">
                          {rt.name}
                        </h4>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${rt.isRecommended ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : rt.recommendation === 'NOT RECOMMENDED' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                        {rt.recommendation}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-1">
                      <div>
                        <span className="text-slate-400 font-sans">Distance: </span>
                        <strong className="text-slate-100">{rt.distanceKm} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans">Est. Time: </span>
                        <strong className="text-slate-100">{rt.travelTimeMinutes} min</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans">Safety Score: </span>
                        <strong className={rt.safetyScore >= 70 ? 'text-emerald-400 font-bold' : rt.safetyScore >= 40 ? 'text-amber-400' : 'text-red-400'}>
                          {rt.safetyScore}/100
                        </strong>
                      </div>
                    </div>

                    {/* Warnings / Hazard Notes */}
                    {rt.warnings && rt.warnings.length > 0 && (
                      <div className="pt-1 text-[11px] space-y-1">
                        {rt.warnings.slice(0, 2).map((warn, i) => (
                          <div key={i} className={`flex items-start gap-1 font-medium ${warn.startsWith('✓') ? 'text-emerald-400' : 'text-amber-300'}`}>
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Turn Guidance or Navigation Mode Action Buttons */}
          <div className="space-y-3 pt-2">
            {!isNavigating ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setIsNavigating(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <NavIcon className="w-4 h-4" />
                  <span>START NAVIGATION</span>
                </button>

                <button
                  onClick={handleOpenExternalNav}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-extrabold text-xs transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in External Maps</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/50 border border-emerald-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <Compass className="w-4 h-4 animate-spin" />
                    <span>Navigation Active</span>
                  </div>
                  <button
                    onClick={() => setIsNavigating(false)}
                    className="text-xs text-slate-400 hover:text-white underline font-medium"
                  >
                    Exit Navigation
                  </button>
                </div>

                <div className="text-xs text-slate-200 font-medium">
                  Remaining Distance: <strong className="font-mono text-emerald-400">{activeRoute?.distanceKm} km</strong> &bull; ETA: <strong className="font-mono text-emerald-400">{activeRoute?.travelTimeMinutes} mins</strong>
                </div>

                {/* Next maneuver */}
                {activeRoute?.steps && activeRoute.steps[currentStepIndex] && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-bold text-slate-100 flex items-center justify-between">
                    <span>{activeRoute.steps[currentStepIndex].instruction}</span>
                    <button
                      onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, (activeRoute.steps?.length || 1) - 1))}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] uppercase font-black"
                    >
                      Next Step
                    </button>
                  </div>
                )}

                {/* Arrived and Evidence buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (incident && onArrivedAtSite) onArrivedAtSite(incident.id);
                    }}
                    className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Arrived</span>
                  </button>

                  <button
                    onClick={() => {
                      if (incident && onOpenEvidenceForm) onOpenEvidenceForm(incident.id);
                    }}
                    className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                  >
                    <span>Capture Evidence 📸</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map Visualization (7 Cols) */}
        <div className="lg:col-span-7 h-[420px] lg:h-auto relative">
          <div ref={mapContainerRef} className="w-full h-full min-h-[420px]" />
        </div>
      </div>
    </div>
  );
};
