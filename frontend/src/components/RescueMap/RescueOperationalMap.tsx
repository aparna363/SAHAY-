import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  Layers,
  Crosshair,
  AlertTriangle,
  Radio,
  Search,
  X
} from 'lucide-react';
import {
  fetchRescueMapData,
  type RescueMapDataResponse,
  type RescueMapIncident
} from '../../services/api';

// Fix Leaflet default icon paths in Vite bundling
try {
  if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }
} catch {
  // Ignore fallback
}

interface RescueOperationalMapProps {
  district: string;
  teamUnitId?: string;
  teamUnitName?: string;
  onSelectIncidentForDetails?: (incidentId: number | string) => void;
  onGetSafestRoute?: (incident: RescueMapIncident) => void;
  className?: string;
}

export const RescueOperationalMap: React.FC<RescueOperationalMapProps> = ({
  district,
  teamUnitId = 'RS-01',
  teamUnitName = 'Rescue Team Station',
  onSelectIncidentForDetails,
  onGetSafestRoute,
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layers
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null);
  const rescueTeamsLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const hospitalsLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardZonesLayerRef = useRef<L.LayerGroup | null>(null);
  const roadHazardsLayerRef = useRef<L.LayerGroup | null>(null);
  const myLocationMarkerRef = useRef<L.Marker | null>(null);
  const myLocationCircleRef = useRef<L.Circle | null>(null);

  // Map state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [data, setData] = useState<RescueMapDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<'CONNECTED' | 'SEARCHING' | 'DENIED' | 'UNAVAILABLE'>('SEARCHING');
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);

  // Filter & Layer Controls State
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [layers, setLayers] = useState({
    incidents: true,
    rescueTeams: true,
    shelters: true,
    hospitals: true,
    hazardZones: true,
    blockedRoads: true
  });

  // Selected Incident Drawer / Modal
  const [activePopupIncident, setActivePopupIncident] = useState<RescueMapIncident | null>(null);

  // -------------------------------------------------------------
  // 1. GPS Location Tracking (navigator.geolocation)
  // -------------------------------------------------------------
  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('UNAVAILABLE');
      setGpsErrorMessage('Browser does not support GPS geolocation.');
      return;
    }

    setGpsStatus('SEARCHING');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyCoords(coords);
        setGpsStatus('CONNECTED');
        setGpsErrorMessage(null);

        // Update map position if map initialized
        if (mapRef.current) {
          updateMyLocationOnMap(coords.lat, coords.lng, pos.coords.accuracy);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('DENIED');
          setGpsErrorMessage('GPS access denied. Enable location permissions in browser.');
        } else {
          setGpsStatus('UNAVAILABLE');
          setGpsErrorMessage('GPS position unavailable or timed out.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  }, []);

  const updateMyLocationOnMap = (lat: number, lng: number, accuracy: number = 50) => {
    if (!mapRef.current) return;

    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const myIcon = L.divIcon({
        className: 'sahay-rescue-my-location',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75"></span>
            <div class="relative w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px] font-black">
              🚒
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      myLocationMarkerRef.current = L.marker([lat, lng], { icon: myIcon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindPopup(`
          <div class="font-sans text-xs p-1">
            <strong class="text-emerald-800 font-bold">Your Current GPS Location</strong><br/>
            <span>${teamUnitName} (${teamUnitId})</span><br/>
            <span class="text-[10px] text-slate-500 font-mono">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
          </div>
        `);
    }

    if (myLocationCircleRef.current) {
      myLocationCircleRef.current.setLatLng([lat, lng]);
      myLocationCircleRef.current.setRadius(Math.min(accuracy, 200));
    } else {
      myLocationCircleRef.current = L.circle([lat, lng], {
        radius: Math.min(accuracy, 200),
        color: '#059669',
        fillColor: '#10b981',
        fillOpacity: 0.12,
        weight: 1.5
      }).addTo(mapRef.current);
    }
  };

  // -------------------------------------------------------------
  // 2. Data Fetching (Live Telemetry)
  // -------------------------------------------------------------
  const loadMapData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchRescueMapData(district);
      setData(res);
      setSecondsAgo(0);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Failed to load rescue map telemetry:', err);
      setErrorMessage(err.message || 'Error loading live operational map telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [district]);

  // Initial load + GPS trigger
  useEffect(() => {
    loadMapData();
    startGpsTracking();
  }, [loadMapData, startGpsTracking]);

  // Periodic Telemetry Polling (every 20s)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadMapData();
    }, 20000);
    return () => clearInterval(pollInterval);
  }, [loadMapData]);

  // "Seconds ago" timer ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // -------------------------------------------------------------
  // 3. Initialize Leaflet Map
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center to Kerala (Kottayam / district center)
    const initialCenter: [number, number] = [9.5916, 76.5222];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Reliable OpenStreetMap basemap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | SAHAY Rescue GIS'
    }).addTo(map);

    // Create layer groups
    hazardZonesLayerRef.current = L.layerGroup().addTo(map);
    roadHazardsLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    hospitalsLayerRef.current = L.layerGroup().addTo(map);
    rescueTeamsLayerRef.current = L.layerGroup().addTo(map);
    incidentsLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Expose global callback for popup clicks
  useEffect(() => {
    (window as any).__sahayRescue_selectIncident = (id: string | number) => {
      const inc = data?.incidents.find((i) => String(i.id) === String(id) || i.incidentCode === String(id));
      if (inc && onGetSafestRoute) {
        onGetSafestRoute(inc);
      }
    };
    (window as any).__sahayRescue_viewIncidentDetails = (id: string | number) => {
      if (onSelectIncidentForDetails) {
        onSelectIncidentForDetails(id);
      }
    };

    return () => {
      delete (window as any).__sahayRescue_selectIncident;
      delete (window as any).__sahayRescue_viewIncidentDetails;
    };
  }, [data, onGetSafestRoute, onSelectIncidentForDetails]);

  // -------------------------------------------------------------
  // 4. Render Markers & Layers when Data or Filters Change
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !data) return;

    // A. HAZARD ZONES (PostGIS Polygons)
    if (hazardZonesLayerRef.current) {
      hazardZonesLayerRef.current.clearLayers();
      if (layers.hazardZones) {
        data.hazardZones.forEach((hz) => {
          if (!hz.geojson) return;
          const isCritical = (hz.severity || '').toUpperCase() === 'CRITICAL';
          const isFlood = (hz.hazardType || '').toUpperCase().includes('FLOOD');
          const color = isFlood ? '#2563eb' : isCritical ? '#dc2626' : '#d97706';

          const geoLayer = L.geoJSON(hz.geojson, {
            style: {
              color,
              weight: 2,
              opacity: 0.85,
              fillColor: color,
              fillOpacity: 0.22,
              dashArray: isCritical ? '4, 4' : undefined
            }
          });

          geoLayer.bindPopup(`
            <div class="font-sans text-xs p-1 space-y-1">
              <div class="font-bold text-slate-900 flex items-center gap-1">
                <span>⚠️ ${hz.name}</span>
              </div>
              <div class="text-[11px] text-slate-600">Type: <strong>${hz.hazardType}</strong> &bull; Severity: <span class="font-bold uppercase text-red-600">${hz.severity}</span></div>
              <p class="text-[10px] text-slate-600 leading-tight">${hz.description || 'Active disaster threat area.'}</p>
            </div>
          `);

          hazardZonesLayerRef.current?.addLayer(geoLayer);
        });
      }
    }

    // B. ROAD HAZARDS & BLOCKED ROADS
    if (roadHazardsLayerRef.current) {
      roadHazardsLayerRef.current.clearLayers();
      if (layers.blockedRoads) {
        data.roadHazards.forEach((rh) => {
          const isBlocked = rh.status === 'BLOCKED';
          const roadColor = isBlocked ? '#dc2626' : rh.status === 'HAZARDOUS' ? '#ea580c' : '#eab308';

          if (rh.geojson) {
            const geoRoad = L.geoJSON(rh.geojson, {
              style: {
                color: roadColor,
                weight: isBlocked ? 6 : 4,
                opacity: 0.9,
                dashArray: isBlocked ? '6, 6' : undefined
              }
            });

            geoRoad.bindPopup(`
              <div class="font-sans text-xs p-1 space-y-1">
                <div class="font-bold text-slate-900">🚧 ${rh.roadName}</div>
                <div class="text-[11px]">Condition: <strong class="${isBlocked ? 'text-red-600' : 'text-amber-600'} uppercase">${rh.status}</strong></div>
                <div class="text-[10px] text-slate-500">Hazard: ${rh.hazardType || 'Obstruction'}</div>
                <p class="text-[10px] text-slate-600">${rh.description || 'Road condition logged in district PostGIS telemetry.'}</p>
              </div>
            `);

            roadHazardsLayerRef.current?.addLayer(geoRoad);
          } else if (rh.startLat && rh.startLng) {
            // Marker fallback if line geometry not present
            const blockIcon = L.divIcon({
              className: 'sahay-blocked-road-pin',
              html: `
                <div class="w-6 h-6 rounded-full bg-red-600 border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-black">
                  ⛔
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            const marker = L.marker([rh.startLat, rh.startLng], { icon: blockIcon });
            marker.bindPopup(`
              <div class="font-sans text-xs p-1">
                <strong class="text-red-600 font-bold">⛔ Blocked Road: ${rh.roadName}</strong><br/>
                <span>${rh.description || rh.hazardType || 'Road Blocked'}</span>
              </div>
            `);
            roadHazardsLayerRef.current?.addLayer(marker);
          }
        });
      }
    }

    // C. SHELTERS / EVACUATION CAMPS
    if (sheltersLayerRef.current) {
      sheltersLayerRef.current.clearLayers();
      if (layers.shelters) {
        data.shelters.forEach((sh) => {
          const shelterIcon = L.divIcon({
            className: 'sahay-shelter-marker',
            html: `
              <div class="w-6 h-6 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white text-xs">
                🏠
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const m = L.marker([sh.latitude, sh.longitude], { icon: shelterIcon });
          m.bindPopup(`
            <div class="font-sans text-xs p-1 space-y-1">
              <div class="font-black text-slate-900">🏠 ${sh.name}</div>
              <div class="text-[11px] text-slate-600">${sh.address || sh.district}</div>
              <div class="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                <span>Available Space:</span>
                <strong class="text-emerald-700">${sh.availableCapacity || 0} / ${sh.capacity || 100}</strong>
              </div>
              <div class="text-[10px] text-slate-500 font-medium">Contact: ${sh.contactNumber || 'DEOC 1077'}</div>
            </div>
          `);
          sheltersLayerRef.current?.addLayer(m);
        });
      }
    }

    // D. HOSPITALS
    if (hospitalsLayerRef.current) {
      hospitalsLayerRef.current.clearLayers();
      if (layers.hospitals) {
        data.hospitals.forEach((hosp) => {
          const hospIcon = L.divIcon({
            className: 'sahay-hospital-marker',
            html: `
              <div class="w-6 h-6 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md border-2 border-white text-xs">
                🏥
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const m = L.marker([hosp.latitude, hosp.longitude], { icon: hospIcon });
          m.bindPopup(`
            <div class="font-sans text-xs p-1 space-y-1">
              <div class="font-black text-slate-900">🏥 ${hosp.name}</div>
              <div class="text-[11px] text-slate-600">${hosp.address || hosp.district}</div>
              <div class="text-[11px]">
                <span>Emergency: </span>
                <strong class="${hosp.emergencyAvailable ? 'text-emerald-600' : 'text-red-600'}">
                  ${hosp.emergencyAvailable ? 'Available' : 'Restricted'}
                </strong>
                &bull; Trauma: <strong>${hosp.traumaCareLevel || 'Level 2'}</strong>
              </div>
              <div class="text-[10px] text-slate-500">Available Beds: <strong>${hosp.availableBeds || 0}</strong> &bull; Contact: ${hosp.contactNumber || '108'}</div>
            </div>
          `);
          hospitalsLayerRef.current?.addLayer(m);
        });
      }
    }

    // E. OTHER RESCUE TEAMS
    if (rescueTeamsLayerRef.current) {
      rescueTeamsLayerRef.current.clearLayers();
      if (layers.rescueTeams) {
        data.rescueTeams.forEach((team) => {
          // Do not duplicate own unit icon if matches ID
          if (team.unitId === teamUnitId) return;

          const isAvailable = team.status.toUpperCase() === 'ACTIVE' || team.status.toUpperCase() === 'AVAILABLE';
          const teamIcon = L.divIcon({
            className: 'sahay-other-team-marker',
            html: `
              <div class="w-7 h-7 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-slate-700'} text-white border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold">
                🚒
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const m = L.marker([team.latitude, team.longitude], { icon: teamIcon });
          m.bindPopup(`
            <div class="font-sans text-xs p-1 space-y-1">
              <div class="font-black text-slate-900">🚒 ${team.unitName}</div>
              <div class="text-[11px] text-slate-500">Unit ID: <strong class="font-mono">${team.unitId}</strong> &bull; ${team.unitType}</div>
              <div class="flex items-center gap-2 pt-0.5">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'}">
                  ${team.status}
                </span>
                <span class="text-[10px] text-slate-400 font-medium">Updated: ${team.minutesSinceUpdate}m ago</span>
              </div>
              <div class="text-[10px] text-slate-600">Leader: ${team.teamLeader} &bull; Personnel: ${team.teamSize}</div>
            </div>
          `);
          rescueTeamsLayerRef.current?.addLayer(m);
        });
      }
    }

    // F. INCIDENT MARKERS
    if (incidentsLayerRef.current) {
      incidentsLayerRef.current.clearLayers();
      if (layers.incidents) {
        // Filter incidents
        const filtered = data.incidents.filter((inc) => {
          if (selectedSeverity !== 'ALL' && inc.severity !== selectedSeverity) return false;
          if (selectedStatus !== 'ALL' && inc.status !== selectedStatus) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matches =
              inc.incidentCode.toLowerCase().includes(q) ||
              inc.incidentTypeName.toLowerCase().includes(q) ||
              inc.locationAddress.toLowerCase().includes(q) ||
              inc.description.toLowerCase().includes(q);
            if (!matches) return false;
          }
          return true;
        });

        filtered.forEach((inc) => {
          const sev = inc.severity.toUpperCase();
          const sevColor = sev === 'CRITICAL' ? '#dc2626' : sev === 'HIGH' ? '#ea580c' : sev === 'MODERATE' ? '#eab308' : '#10b981';

          const incIcon = L.divIcon({
            className: 'sahay-incident-field-marker',
            html: `
              <div class="relative flex items-center justify-center">
                ${sev === 'CRITICAL' ? '<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75"></span>' : ''}
                <div class="w-8 h-8 rounded-2xl shadow-xl flex items-center justify-center text-white text-xs font-black border-2 border-white ring-2 ring-slate-900/10" style="background-color: ${sevColor};">
                  ⚠️
                </div>
                <div class="absolute -bottom-1 -right-1 px-1 py-0.2 bg-slate-950 text-[8px] font-mono text-white rounded shadow-xs font-black">
                  ${sev.slice(0, 3)}
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          const m = L.marker([inc.latitude, inc.longitude], { icon: incIcon });

          const timeFormatted = inc.createdAt ? new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';

          // Popup HTML with "VIEW DETAILS" and "GET SAFEST ROUTE"
          const popupHtml = `
            <div class="font-sans text-slate-800 p-1 min-w-[260px] max-w-[300px] space-y-2">
              <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <div>
                  <div class="text-xs font-black text-slate-900">${inc.incidentTypeName}</div>
                  <span class="font-mono text-[10px] text-slate-500 font-bold">${inc.incidentCode}</span>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black text-white" style="background-color: ${sevColor};">
                  ${inc.severity}
                </span>
              </div>

              <div class="space-y-1 text-xs">
                <div class="text-[11px] text-slate-600 flex items-start gap-1 font-medium">
                  <span class="shrink-0">📍</span>
                  <span class="line-clamp-2 font-bold text-slate-800">${inc.locationAddress || 'Field Incident Location'}</span>
                </div>
                <p class="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-snug">
                  ${inc.description || 'Emergency incident reported in this sector.'}
                </p>
                <div class="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Status: <strong class="text-emerald-700 uppercase font-bold">${inc.status}</strong></span>
                  <span>Time: <strong>${timeFormatted}</strong></span>
                </div>
                ${inc.assignment?.assignedTeam ? `
                  <div class="text-[10px] text-blue-700 font-bold bg-blue-50 p-1 rounded-lg">
                    Assigned: ${inc.assignment.assignedTeam}
                  </div>
                ` : ''}
              </div>

              <!-- Operational Buttons: VIEW DETAILS & GET SAFEST ROUTE -->
              <div class="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  onclick="window.__sahayRescue_viewIncidentDetails && window.__sahayRescue_viewIncidentDetails('${inc.id}')"
                  class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-2.5 rounded-xl transition-all shadow-xs text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>VIEW DETAILS</span>
                </button>
                <button
                  onclick="window.__sahayRescue_selectIncident && window.__sahayRescue_selectIncident('${inc.id}')"
                  class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-2.5 rounded-xl transition-all shadow-xs text-center flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>GET SAFEST ROUTE</span>
                </button>
              </div>
            </div>
          `;

          m.bindPopup(popupHtml);
          m.on('click', () => {
            setActivePopupIncident(inc);
          });

          incidentsLayerRef.current?.addLayer(m);
        });
      }
    }
  }, [data, layers, selectedSeverity, selectedStatus, searchQuery, teamUnitId, teamUnitName]);

  // Recenter on rescue team location
  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (myCoords) {
      mapRef.current.flyTo([myCoords.lat, myCoords.lng], 14, { duration: 1 });
    } else {
      mapRef.current.flyTo([9.5916, 76.5222], 12, { duration: 1 });
      startGpsTracking();
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative flex flex-col bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'h-[720px]'} ${className}`}>
      {/* ------------------------------------------------------------- */}
      {/* HEADER BAR (Government Operational Disaster Standard) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                LIVE DISASTER MAP
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold border border-slate-700">
                {teamUnitName} ({teamUnitId})
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span>District: <strong className="text-slate-200">{district}</strong></span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${gpsStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : gpsStatus === 'SEARCHING' ? 'bg-amber-400 animate-ping' : 'bg-red-500'}`}></span>
                <span className={`font-mono font-bold ${gpsStatus === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {gpsStatus === 'CONNECTED' ? 'GPS: Connected' : gpsStatus === 'SEARCHING' ? 'GPS: Acquiring' : 'GPS: Unavailable'}
                </span>
              </span>
              <span>&bull;</span>
              <span className="text-slate-400">Last updated: {secondsAgo}s ago</span>
            </div>
          </div>
        </div>

        {/* Quick Operational Stats in Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          {data && (
            <div className="hidden md:flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-xl bg-red-950/70 border border-red-800 text-red-300 font-bold">
                {data.counts.incidents} Incidents
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 font-bold">
                {data.counts.rescueTeams} Teams
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-bold">
                {data.counts.blockedRoads} Blocked Roads
              </span>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={loadMapData}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700 disabled:opacity-50"
            title="Refresh Map Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Recenter Button */}
          <button
            onClick={handleRecenter}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 text-xs font-bold"
            title="Recenter on Rescue Team"
          >
            <Crosshair className="w-4 h-4" />
            <span className="hidden sm:inline">Recenter</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-950/90 border-b border-red-800 text-red-300 text-xs px-5 py-2 flex items-center gap-2 z-10">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TOP CONTROL BAR: SEARCH & FILTERS */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 text-white px-5 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incident, road, or area..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] font-bold">
            <span className="text-slate-400">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-white font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All</option>
              <option value="CRITICAL" className="bg-slate-900 text-red-400">Critical</option>
              <option value="HIGH" className="bg-slate-900 text-orange-400">High</option>
              <option value="MODERATE" className="bg-slate-900 text-yellow-400">Moderate</option>
              <option value="LOW" className="bg-slate-900 text-emerald-400">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] font-bold">
            <span className="text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-white font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Statuses</option>
              <option value="SUBMITTED" className="bg-slate-900">Submitted</option>
              <option value="RESPONSE_ASSIGNED" className="bg-slate-900">Assigned</option>
              <option value="IN_PROGRESS" className="bg-slate-900">In Progress</option>
            </select>
          </div>
        </div>

        {/* Layer & Legend Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs ${showLayerPanel ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers</span>
          </button>

          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs ${showLegend ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <span>Legend</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAYER CONTROL DRAWER */}
      {/* ------------------------------------------------------------- */}
      {showLayerPanel && (
        <div className="absolute top-24 right-4 z-[500] w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="font-black text-xs uppercase text-emerald-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Operational Layers</span>
            </div>
            <button onClick={() => setShowLayerPanel(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs font-semibold">
            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-800">
              <span className="flex items-center gap-2"><span>⚠️</span> Incidents</span>
              <input
                type="checkbox"
                checked={layers.incidents}
                onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-800">
              <span className="flex items-center gap-2"><span>🚒</span> Rescue Teams</span>
              <input
                type="checkbox"
                checked={layers.rescueTeams}
                onChange={(e) => setLayers({ ...layers, rescueTeams: e.target.checked })}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-800">
              <span className="flex items-center gap-2"><span>🏠</span> Evacuation Shelters</span>
              <input
                type="checkbox"
                checked={layers.shelters}
                onChange={(e) => setLayers({ ...layers, shelters: e.target.checked })}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-800">
              <span className="flex items-center gap-2"><span>🏥</span> Hospitals & Trauma</span>
              <input
                type="checkbox"
                checked={layers.hospitals}
                onChange={(e) => setLayers({ ...layers, hospitals: e.target.checked })}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-800">
              <span className="flex items-center gap-2"><span>🌊</span> Flood & Hazard Zones</span>
              <input
                type="checkbox"
                checked={layers.hazardZones}
                onChange={(e) => setLayers({ ...layers, hazardZones: e.target.checked })}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-xl hover:bg-slate-800">
              <span className="flex items-center gap-2"><span>🚧</span> Blocked Roads</span>
              <input
                type="checkbox"
                checked={layers.blockedRoads}
                onChange={(e) => setLayers({ ...layers, blockedRoads: e.target.checked })}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEGEND DRAWER */}
      {/* ------------------------------------------------------------- */}
      {showLegend && (
        <div className="absolute top-24 left-4 z-[500] w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-2.5 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-black text-xs uppercase text-emerald-400">Map Legend</span>
            <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600"></span>
              <span className="text-slate-300">Critical Incident / SOS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-slate-300">High Severity Incident</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
              <span className="text-slate-300">Moderate Severity</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Active Rescue Team Unit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-600"></span>
              <span className="text-slate-300">Relief Evacuation Shelter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-600"></span>
              <span className="text-slate-300">Hospital / Trauma Center</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-red-600"></span>
              <span className="text-slate-300">Blocked Road (No Access)</span>
            </div>
          </div>
        </div>
      )}

      {/* GPS Warning Banner if disabled */}
      {gpsStatus !== 'CONNECTED' && gpsErrorMessage && (
        <div className="bg-amber-950/80 border-b border-amber-800 text-amber-200 px-5 py-2 text-xs flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{gpsErrorMessage}</span>
          </div>
          <button
            onClick={startGpsTracking}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] transition-all"
          >
            Retry GPS
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN LEAFLET MAP CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full relative z-0" />

      {/* Active Selected Incident Bottom Sheet on Mobile */}
      {activePopupIncident && (
        <div className="sm:hidden absolute bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 p-4 z-[600] rounded-t-3xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-white">{activePopupIncident.incidentTypeName} ({activePopupIncident.incidentCode})</div>
            <button onClick={() => setActivePopupIncident(null)} className="text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 line-clamp-2">{activePopupIncident.description}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelectIncidentForDetails && onSelectIncidentForDetails(activePopupIncident.id)}
              className="py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold text-center"
            >
              View Details
            </button>
            <button
              onClick={() => onGetSafestRoute && onGetSafestRoute(activePopupIncident)}
              className="py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center"
            >
              Get Safest Route
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
