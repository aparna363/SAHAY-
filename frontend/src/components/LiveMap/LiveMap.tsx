import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Crosshair,
  RefreshCw,
  AlertTriangle,
  Shield,
  Home,
  Building2,
  Navigation,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  MapPin,
  SlidersHorizontal,
  X,
  Phone,
  Send,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import {
  fetchRoleMapIncidents,
  fetchMapShelters,
  fetchMapHospitals,
  fetchMapRescueTeams,
  fetchMapHazardZones,
  fetchMapSummaryStats,
  fetchMapWeatherAlerts,
  fetchNearestResources,
  dispatchIncidentTeam
} from '../../services/mapService';
import type {
  MapIncident,
  MapShelter,
  MapHospital,
  MapRescueTeam,
  MapHazardZone,
  MapSummaryStats,
  NearestResourcesResponse
} from '../../services/mapService';
import { MapLegend } from './MapLegend';
import { MapFilters } from './MapFilters';
import { MapLayerControl, type LayerState } from './MapLayerControl';
import { createIncidentMarkerIcon, generateIncidentPopupHtml, getSeverityColor } from './markers/IncidentMarker';
import { createRescueTeamMarkerIcon, generateRescueTeamPopupHtml } from './markers/RescueTeamMarker';
import { createShelterMarkerIcon, generateShelterPopupHtml } from './markers/ShelterMarker';
import { createHospitalMarkerIcon, generateHospitalPopupHtml } from './markers/HospitalMarker';
import { KERALA_DISTRICTS_GEOJSON } from '../../data/keralaDistricts';

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fix Leaflet marker icons in Vite bundling
try {
  if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }
} catch (e) {
  // Fallback silently
}

// Kerala District Center Coordinates
export const KERALA_DISTRICT_COORDS: Record<string, [number, number]> = {
  'Thiruvananthapuram': [8.5241, 76.9366],
  'Kollam': [8.8932, 76.6141],
  'Pathanamthitta': [9.2648, 76.7870],
  'Alappuzha': [9.4981, 76.3388],
  'Kottayam': [9.5916, 76.5222],
  'Idukki': [9.8497, 76.9804],
  'Ernakulam': [9.9816, 76.2999],
  'Thrissur': [10.5276, 76.2144],
  'Palakkad': [10.7867, 76.6548],
  'Malappuram': [11.0720, 76.0740],
  'Kozhikode': [11.2588, 75.7804],
  'Wayanad': [11.6854, 76.1320],
  'Kannur': [11.8745, 75.3704],
  'Kasaragod': [12.4996, 74.9869]
};

export interface LiveMapProps {
  role?: 'citizen' | 'rescue_team' | 'collector' | 'admin';
  userDistrict?: string;
  initialDistrict?: string;
  onAssignTeam?: (incidentId: number | string, incidentCode: string) => void;
  onViewIncidentDetails?: (incidentId: number | string) => void;
  onStatusUpdateSuccess?: () => void;
  className?: string;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  role = 'citizen',
  userDistrict,
  initialDistrict,
  onAssignTeam,
  onViewIncidentDetails,
  onStatusUpdateSuccess,
  className = ''
}) => {
  const { coords, location } = useLocation();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layer groups
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null);
  const rescueTeamsLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const hospitalsLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardZonesLayerRef = useRef<L.LayerGroup | null>(null);
  const boundariesLayerRef = useRef<L.GeoJSON | null>(null);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);
  const userGpsCircleRef = useRef<L.Circle | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  // District scoping (Strictly dynamic, no hardcoded district)
  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
    if (role === 'collector' || role === 'rescue_team') {
      return userDistrict || location?.district || initialDistrict || 'Kottayam';
    }
    if (role === 'admin') return initialDistrict || 'all';
    return userDistrict || location?.district || initialDistrict || 'All Kerala';
  });

  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'satellite'>('dark');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showLegend] = useState<boolean>(true);

  // Data States
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [rescueTeams, setRescueTeams] = useState<MapRescueTeam[]>([]);
  const [shelters, setShelters] = useState<MapShelter[]>([]);
  const [hospitals, setHospitals] = useState<MapHospital[]>([]);
  const [hazardZones, setHazardZones] = useState<MapHazardZone[]>([]);
  const [summaryStats, setSummaryStats] = useState<MapSummaryStats | null>(null);

  // Selected Incident & Nearest Intelligence State
  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(null);
  const [nearestData, setNearestData] = useState<NearestResourcesResponse | null>(null);
  const [loadingNearest, setLoadingNearest] = useState<boolean>(false);

  // Dispatch Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState<boolean>(false);
  const [dispatchIncidentTarget, setDispatchIncidentTarget] = useState<MapIncident | null>(null);
  const [selectedRescueUnitId, setSelectedRescueUnitId] = useState<string>('');
  const [dispatchRemarks, setDispatchRemarks] = useState<string>('');
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [dispatchToast, setDispatchToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Status & Telemetry
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [activeRouteInfo, setActiveRouteInfo] = useState<{ title: string; distance: string; target: string } | null>(null);

  // Layer Visibility
  const [layers, setLayers] = useState<LayerState>({
    incidents: true,
    rescueTeams: role !== 'citizen',
    shelters: true,
    hospitals: true,
    hazardZones: true,
    districtBoundary: true,
    weatherAlerts: true,
    routes: true,
    userGps: true
  });

  const handleToggleLayer = (layerKey: keyof LayerState) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Seconds ago ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdatedTime.getTime()) / 1000);
      setSecondsAgo(diff);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdatedTime]);

  // ---------------------------------------------------------------------------
  // 1. DATA LOADER FUNCTION (Real-time Polling & Initial Fetch)
  // ---------------------------------------------------------------------------
  const loadMapData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const userLat = coords?.latitude;
      const userLng = coords?.longitude;
      const targetDistParam = (selectedDistrict === 'all' || selectedDistrict === 'All Kerala') ? undefined : selectedDistrict;

      // 1. Fetch Incidents
      const incList = await fetchRoleMapIncidents({
        district: targetDistParam,
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        lat: userLat,
        lng: userLng
      });
      setIncidents(incList);

      // 2. Fetch Shelters
      const shelterList = await fetchMapShelters(targetDistParam, userLat, userLng);
      setShelters(shelterList);

      // 3. Fetch Hospitals
      const hospitalList = await fetchMapHospitals(targetDistParam, userLat, userLng);
      setHospitals(hospitalList);

      // 4. Fetch Rescue Teams (Authorized roles only)
      if (role !== 'citizen') {
        const teamList = await fetchMapRescueTeams(targetDistParam);
        setRescueTeams(teamList);
      }

      // 5. Fetch Hazard Zones
      const zones = await fetchMapHazardZones();
      setHazardZones(zones);

      // 6. Fetch Summary Stats & Alerts
      const stats = await fetchMapSummaryStats(targetDistParam);
      setSummaryStats(stats);

      await fetchMapWeatherAlerts(targetDistParam);

      setLastUpdatedTime(new Date());
    } catch (err) {
      console.error('[LiveMap] Failed to load map data:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [role, selectedDistrict, selectedSeverity, selectedStatus, coords]);

  // Initial load and live polling every 8 seconds
  useEffect(() => {
    loadMapData(true);
    const pollInterval = setInterval(() => {
      loadMapData(false);
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [loadMapData]);

  // ---------------------------------------------------------------------------
  // 2. SELECT INCIDENT & FETCH NEAREST SPATIAL INTELLIGENCE
  // ---------------------------------------------------------------------------
  const handleSelectIncident = useCallback(async (incident: MapIncident) => {
    setSelectedIncident(incident);
    setLoadingNearest(true);
    try {
      const nearest = await fetchNearestResources(incident.id);
      setNearestData(nearest);

      // Center map slightly offset for side panel
      if (mapRef.current) {
        mapRef.current.flyTo([incident.latitude, incident.longitude], 13, {
          duration: 1.2
        });
      }
    } catch (err) {
      console.error('Failed to load nearest spatial data:', err);
    } finally {
      setLoadingNearest(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. DISPATCH TEAM ACTION
  // ---------------------------------------------------------------------------
  const handleOpenDispatch = (incident: MapIncident) => {
    setDispatchIncidentTarget(incident);
    setSelectedRescueUnitId(nearestData?.nearestRescueTeam?.unitId || rescueTeams[0]?.unitId || '');
    setDispatchRemarks(`Operational dispatch by Collector to ${incident.incidentCode}`);
    setDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchIncidentTarget) return;
    setDispatching(true);
    try {
      const res = await dispatchIncidentTeam(dispatchIncidentTarget.id, {
        unitId: selectedRescueUnitId,
        remarks: dispatchRemarks
      });

      if (res.success) {
        setDispatchToast({
          type: 'success',
          message: `✅ Dispatched unit to incident ${dispatchIncidentTarget.incidentCode} successfully!`
        });
        setDispatchModalOpen(false);
        // Refresh map data immediately
        loadMapData(false);
        if (selectedIncident?.id === dispatchIncidentTarget.id) {
          setSelectedIncident(prev => prev ? { ...prev, status: 'RESPONSE_ASSIGNED' } : null);
        }
        if (onStatusUpdateSuccess) onStatusUpdateSuccess();
      } else {
        setDispatchToast({
          type: 'error',
          message: `❌ ${res.error || 'Failed to dispatch team'}`
        });
      }
    } catch (err: any) {
      setDispatchToast({
        type: 'error',
        message: `❌ ${err.message || 'Dispatch error'}`
      });
    } finally {
      setDispatching(false);
      setTimeout(() => setDispatchToast(null), 5000);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. GLOBAL WINDOW HOOKS FOR POPUPS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    (window as any).__sahayMap_selectIncident = (id: string | number) => {
      const inc = incidents.find(i => String(i.id) === String(id) || i.incidentCode === String(id));
      if (inc) handleSelectIncident(inc);
    };

    (window as any).__sahayMap_openAssignModal = (incId: string) => {
      const inc = incidents.find(i => String(i.id) === String(incId) || i.incidentCode === String(incId));
      if (inc) {
        handleOpenDispatch(inc);
      } else if (onAssignTeam) {
        onAssignTeam(incId, incId);
      }
    };

    (window as any).__sahayMap_viewDetails = (incId: string) => {
      if (onViewIncidentDetails) {
        onViewIncidentDetails(incId);
      }
    };

    (window as any).__sahayMap_getSafeRoute = (_code: string, lat: number, lng: number) => {
      if (!shelters.length) {
        alert('No relief shelters currently found in the vicinity.');
        return;
      }
      const nearest = shelters[0];
      drawRouteLine([lat, lng], [nearest.latitude, nearest.longitude], `Safe Evacuation to ${nearest.name}`);
    };

    (window as any).__sahayMap_getDirections = (destLat: number, destLng: number, destName: string) => {
      if (coords) {
        drawRouteLine([coords.latitude, coords.longitude], [destLat, destLng], `Directions to ${destName}`);
      } else {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
        window.open(url, '_blank');
      }
    };

    return () => {
      delete (window as any).__sahayMap_selectIncident;
      delete (window as any).__sahayMap_openAssignModal;
      delete (window as any).__sahayMap_viewDetails;
      delete (window as any).__sahayMap_getSafeRoute;
      delete (window as any).__sahayMap_getDirections;
    };
  }, [incidents, shelters, coords, handleSelectIncident, onAssignTeam, onViewIncidentDetails]);

  // ---------------------------------------------------------------------------
  // 5. INITIALIZE LEAFLET MAP CANVAS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const initialCenter: [number, number] = (selectedDistrict && KERALA_DISTRICT_COORDS[selectedDistrict])
      ? KERALA_DISTRICT_COORDS[selectedDistrict]
      : (coords ? [coords.latitude, coords.longitude] : [9.5916, 76.5222]);

    const initialZoom = selectedDistrict && selectedDistrict !== 'all' && selectedDistrict !== 'All Kerala' ? 11 : 8;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      maxBounds: [
        [7.5, 73.5],
        [13.5, 78.5]
      ],
      maxBoundsViscosity: 0.85
    });

    const tileUrls = {
      dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };

    const tileLayer = L.tileLayer(tileUrls[mapTheme], {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; Esri'
    }).addTo(map);

    baseTileLayerRef.current = tileLayer;

    // Initialize Layer Groups
    incidentsLayerRef.current = L.layerGroup().addTo(map);
    rescueTeamsLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    hospitalsLayerRef.current = L.layerGroup().addTo(map);
    hazardZonesLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer on Theme Change
  useEffect(() => {
    if (!mapRef.current || !baseTileLayerRef.current) return;
    const tileUrls = {
      dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };
    baseTileLayerRef.current.setUrl(tileUrls[mapTheme]);
  }, [mapTheme]);

  // Recenter map when selected district changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedDistrict && KERALA_DISTRICT_COORDS[selectedDistrict]) {
      mapRef.current.flyTo(KERALA_DISTRICT_COORDS[selectedDistrict], 11, { duration: 1.5 });
    }
  }, [selectedDistrict]);

  // ---------------------------------------------------------------------------
  // 6. DRAW ROUTE LINE HELPER
  // ---------------------------------------------------------------------------
  const drawRouteLine = (start: [number, number], end: [number, number], title: string) => {
    if (!mapRef.current) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const distMeters = Math.round(haversineDistanceMeters(start[0], start[1], end[0], end[1]));
    const distKm = (distMeters / 1000).toFixed(1);

    const polyline = L.polyline([start, end], {
      color: '#059669',
      weight: 5,
      dashArray: '8, 8',
      opacity: 0.9
    }).addTo(mapRef.current);

    routeLayerRef.current = polyline;
    mapRef.current.fitBounds(polyline.getBounds(), { padding: [60, 60] });

    setActiveRouteInfo({
      title,
      distance: `${distKm} km`,
      target: `${end[0].toFixed(4)}°, ${end[1].toFixed(4)}°`
    });
  };

  const clearRoute = () => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    setActiveRouteInfo(null);
  };

  // ---------------------------------------------------------------------------
  // 7. RENDER DISTRICT BOUNDARIES LAYER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current) return;

    if (boundariesLayerRef.current) {
      boundariesLayerRef.current.remove();
      boundariesLayerRef.current = null;
    }

    if (layers.districtBoundary && KERALA_DISTRICTS_GEOJSON) {
      const geoLayer = L.geoJSON(KERALA_DISTRICTS_GEOJSON as any, {
        style: (feature: any) => {
          const isTargetDistrict = selectedDistrict &&
            feature?.properties?.district?.toLowerCase() === selectedDistrict.toLowerCase();

          return {
            color: isTargetDistrict ? '#10b981' : '#64748b',
            weight: isTargetDistrict ? 2.5 : 1,
            fillColor: isTargetDistrict ? '#10b981' : '#334155',
            fillOpacity: isTargetDistrict ? 0.12 : 0.03,
            dashArray: isTargetDistrict ? undefined : '4, 4'
          };
        },
        onEachFeature: (feature: any, layer: L.Layer) => {
          if (feature?.properties?.district) {
            layer.bindTooltip(`📍 ${feature.properties.district} District`, {
              sticky: true,
              className: 'bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded-lg shadow-md border border-slate-700'
            });
          }
        }
      }).addTo(mapRef.current);

      boundariesLayerRef.current = geoLayer;
    }
  }, [layers.districtBoundary, selectedDistrict]);

  // ---------------------------------------------------------------------------
  // 8. RENDER INCIDENTS MARKERS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!incidentsLayerRef.current || !mapRef.current) return;
    incidentsLayerRef.current.clearLayers();

    if (!layers.incidents) return;

    const filtered = incidents.filter(inc => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCode = inc.incidentCode?.toLowerCase().includes(q);
        const matchType = inc.incidentTypeName?.toLowerCase().includes(q);
        const matchAddr = inc.locationAddress?.toLowerCase().includes(q);
        if (!matchCode && !matchType && !matchAddr) return false;
      }
      return true;
    });

    filtered.forEach(inc => {
      if (isNaN(inc.latitude) || isNaN(inc.longitude)) return;

      const icon = createIncidentMarkerIcon(inc);
      const marker = L.marker([inc.latitude, inc.longitude], { icon });

      const nearestShelter = shelters[0] || null;
      const nearestHospital = hospitals[0] || null;
      const popupHtml = generateIncidentPopupHtml(inc, role, nearestShelter, nearestHospital);

      marker.bindPopup(popupHtml, {
        maxWidth: 320,
        className: 'sahay-custom-leaflet-popup'
      });

      marker.on('click', () => {
        handleSelectIncident(inc);
      });

      marker.addTo(incidentsLayerRef.current!);
    });
  }, [incidents, layers.incidents, searchQuery, role, shelters, hospitals, handleSelectIncident]);

  // ---------------------------------------------------------------------------
  // 9. RENDER RESCUE TEAMS MARKERS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!rescueTeamsLayerRef.current || !mapRef.current) return;
    rescueTeamsLayerRef.current.clearLayers();

    if (!layers.rescueTeams || role === 'citizen') return;

    rescueTeams.forEach(team => {
      if (isNaN(team.latitude) || isNaN(team.longitude)) return;

      const icon = createRescueTeamMarkerIcon(team);
      const marker = L.marker([team.latitude, team.longitude], { icon });
      const popupHtml = generateRescueTeamPopupHtml(team);

      marker.bindPopup(popupHtml, {
        maxWidth: 320,
        className: 'sahay-custom-leaflet-popup'
      });

      marker.addTo(rescueTeamsLayerRef.current!);
    });
  }, [rescueTeams, layers.rescueTeams, role]);

  // ---------------------------------------------------------------------------
  // 10. RENDER RELIEF SHELTERS MARKERS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!sheltersLayerRef.current || !mapRef.current) return;
    sheltersLayerRef.current.clearLayers();

    if (!layers.shelters) return;

    shelters.forEach(shelter => {
      if (isNaN(shelter.latitude) || isNaN(shelter.longitude)) return;

      const icon = createShelterMarkerIcon(shelter);
      const marker = L.marker([shelter.latitude, shelter.longitude], { icon });
      const popupHtml = generateShelterPopupHtml(shelter);

      marker.bindPopup(popupHtml, {
        maxWidth: 300,
        className: 'sahay-custom-leaflet-popup'
      });

      marker.addTo(sheltersLayerRef.current!);
    });
  }, [shelters, layers.shelters, role]);

  // ---------------------------------------------------------------------------
  // 11. RENDER HOSPITALS MARKERS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!hospitalsLayerRef.current || !mapRef.current) return;
    hospitalsLayerRef.current.clearLayers();

    if (!layers.hospitals) return;

    hospitals.forEach(hospital => {
      if (isNaN(hospital.latitude) || isNaN(hospital.longitude)) return;

      const icon = createHospitalMarkerIcon(hospital);
      const marker = L.marker([hospital.latitude, hospital.longitude], { icon });
      const popupHtml = generateHospitalPopupHtml(hospital);

      marker.bindPopup(popupHtml, {
        maxWidth: 300,
        className: 'sahay-custom-leaflet-popup'
      });

      marker.addTo(hospitalsLayerRef.current!);
    });
  }, [hospitals, layers.hospitals, role]);

  // ---------------------------------------------------------------------------
  // 12. RENDER HAZARD / RISK ZONES LAYER (PostGIS GeoJSON Polygons)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!hazardZonesLayerRef.current || !mapRef.current) return;
    hazardZonesLayerRef.current.clearLayers();

    if (!layers.hazardZones) return;

    hazardZones.forEach(zone => {
      if (!zone.geojson) return;

      const geoLayer = L.geoJSON(zone.geojson, {
        style: {
          color: zone.severity === 'HIGH' || zone.severity === 'CRITICAL' ? '#ea580c' : '#f59e0b',
          weight: 2,
          fillColor: zone.severity === 'HIGH' || zone.severity === 'CRITICAL' ? '#ea580c' : '#f59e0b',
          fillOpacity: 0.25,
          dashArray: '6, 6'
        }
      });

      geoLayer.bindPopup(`
        <div class="sahay-popup p-1 text-xs text-slate-800 space-y-1.5 min-w-[200px]">
          <div class="flex items-center gap-1.5 font-bold text-amber-900 border-b border-amber-100 pb-1">
            <span>🔥 ${zone.hazardType} Zone</span>
            <span class="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">${zone.severity}</span>
          </div>
          <p class="text-xs text-slate-700">${zone.name}</p>
          <p class="text-[11px] text-slate-500">${zone.description || 'High risk disaster corridor.'}</p>
        </div>
      `);

      geoLayer.addTo(hazardZonesLayerRef.current!);
    });
  }, [hazardZones, layers.hazardZones]);

  // ---------------------------------------------------------------------------
  // 13. USER GPS PIN
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current) return;

    if (coords && layers.userGps) {
      const userLatLng: [number, number] = [coords.latitude, coords.longitude];

      if (userGpsMarkerRef.current) userGpsMarkerRef.current.remove();
      if (userGpsCircleRef.current) userGpsCircleRef.current.remove();

      const userHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-6 h-6 rounded-full bg-emerald-500/40 animate-ping absolute -inset-1"></div>
          <div class="w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-[9px] font-black">
            📍
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-gps-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      userGpsMarkerRef.current = L.marker(userLatLng, { icon: userIcon }).addTo(mapRef.current);
    } else {
      if (userGpsMarkerRef.current) userGpsMarkerRef.current.remove();
      if (userGpsCircleRef.current) userGpsCircleRef.current.remove();
    }
  }, [coords, layers.userGps]);

  // Center on User GPS or District
  const handleRecenter = () => {
    if (!mapRef.current) return;
    if (coords) {
      mapRef.current.flyTo([coords.latitude, coords.longitude], 13, { duration: 1.2 });
    } else if (selectedDistrict && KERALA_DISTRICT_COORDS[selectedDistrict]) {
      mapRef.current.flyTo(KERALA_DISTRICT_COORDS[selectedDistrict], 11, { duration: 1.2 });
    }
  };

  const activeDistrictLabel = selectedDistrict === 'all' || selectedDistrict === 'All Kerala'
    ? 'Kerala Statewide'
    : `${selectedDistrict} District`;

  return (
    <div className={`relative flex flex-col w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'min-h-[700px]'} ${className}`}>

      {/* ------------------------------------------------------------- */}
      {/* 1. TOP OPERATIONAL STATS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-950/90 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-black shadow-inner">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{activeDistrictLabel} Live GIS Operations Map</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                POSTGIS LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Spatial telemetric feed &bull; Refreshed {secondsAgo}s ago
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Incidents:</span>
            <span className="font-mono font-black text-amber-400">{summaryStats?.activeIncidents ?? incidents.length}</span>
            {summaryStats?.highCriticalIncidents ? (
              <span className="text-[10px] text-red-400 font-bold">({summaryStats.highCriticalIncidents} Critical)</span>
            ) : null}
          </div>

          {role !== 'citizen' && (
            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400">Rescue Units:</span>
              <span className="font-mono font-black text-sky-400">{summaryStats?.availableTeams ?? rescueTeams.length} Active</span>
            </div>
          )}

          <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Shelters:</span>
            <span className="font-mono font-black text-emerald-400">{summaryStats?.openShelters ?? shelters.length} Open</span>
          </div>

          <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-slate-400">Hospitals:</span>
            <span className="font-mono font-black text-teal-400">{summaryStats?.totalHospitals ?? hospitals.length}</span>
          </div>

          <button
            onClick={() => loadMapData(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Sync Map Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              showFilters
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FILTER DRAWER (Collapsible) */}
      {/* ------------------------------------------------------------- */}
      {showFilters && (
        <div className="bg-slate-950 p-4 border-b border-slate-800 z-20 animate-fadeIn">
          <MapFilters
            role={role}
            selectedDistrict={selectedDistrict}
            onDistrictChange={setSelectedDistrict}
            selectedSeverity={selectedSeverity}
            onSeverityChange={setSelectedSeverity}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onReset={() => {
              setSelectedSeverity('all');
              setSelectedStatus('all');
              setSearchQuery('');
              if (role === 'admin') setSelectedDistrict('all');
            }}
            incidentCount={incidents.length}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. MAP CANVAS & FLOATING CONTROLS */}
      {/* ------------------------------------------------------------- */}
      <div className="relative flex-1 w-full min-h-[580px] bg-slate-950 overflow-hidden">
        {/* Leaflet Map Div */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

        {/* Top-Right Floating Layer Control */}
        <div className="absolute top-4 right-4 z-10 max-w-xs sm:max-w-md pointer-events-auto">
          <MapLayerControl
            role={role}
            layers={layers}
            onToggleLayer={handleToggleLayer}
          />
        </div>

        {/* Top-Left Floating Map Theme & Recenter Bar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-1 rounded-2xl flex items-center gap-1 shadow-xl">
            <button
              onClick={() => setMapTheme('dark')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                mapTheme === 'dark' ? 'bg-slate-800 text-emerald-400 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-3 h-3" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setMapTheme('light')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                mapTheme === 'light' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3 h-3" />
              <span>Light</span>
            </button>
            <button
              onClick={() => setMapTheme('satellite')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                mapTheme === 'satellite' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Sat</span>
            </button>
          </div>

          <button
            onClick={handleRecenter}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-emerald-400 rounded-2xl shadow-xl transition-all"
            title="Recenter Map"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Active Routing Info Overlay */}
        {activeRouteInfo && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-slate-950/95 backdrop-blur-md border border-emerald-500/80 px-4 py-2 rounded-2xl shadow-2xl text-xs text-white flex items-center gap-3 animate-fadeIn">
            <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-emerald-300">{activeRouteInfo.title}</div>
              <div className="text-[11px] text-slate-400">Distance: <strong className="text-white">{activeRouteInfo.distance}</strong> &bull; Destination: {activeRouteInfo.target}</div>
            </div>
            <button
              onClick={clearRoute}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Bottom-Left Legend */}
        {showLegend && (
          <div className="absolute bottom-4 left-4 z-10 max-w-xs pointer-events-auto">
            <MapLegend role={role} />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4. SELECTED INCIDENT SIDE PANEL (PostGIS Spatial Intelligence) */}
        {/* ------------------------------------------------------------- */}
        {selectedIncident && (
          <div className="absolute top-0 right-0 bottom-0 z-20 w-full sm:w-[420px] bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 p-5 overflow-y-auto space-y-4 shadow-2xl text-white animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  PostGIS Spatial Incident Telemetry
                </span>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>{selectedIncident.incidentTypeName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${getSeverityColor(selectedIncident.severity).bg}`}>
                    {selectedIncident.severity}
                  </span>
                </h3>
                <span className="font-mono text-xs text-slate-400 font-bold">{selectedIncident.incidentCode}</span>
              </div>

              <button
                onClick={() => {
                  setSelectedIncident(null);
                  setNearestData(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description & Address */}
            <div className="space-y-2 text-xs">
              <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="text-slate-400 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 font-medium">{selectedIncident.locationAddress || 'Incident GPS Sector'}</span>
                </div>
                <p className="text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  {selectedIncident.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Status: <strong className="text-white">{selectedIncident.status.replace('_', ' ')}</strong></span>
                  <span>Reported: {new Date(selectedIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Reporter Info (Officials Only) */}
              {selectedIncident.reporter && (
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-[11px] space-y-1">
                  <div className="font-bold text-slate-400 uppercase text-[10px]">Citizen Reporter</div>
                  <div className="text-white font-semibold flex items-center justify-between">
                    <span>{selectedIncident.reporter.name || 'Citizen'}</span>
                    <span className="font-mono text-emerald-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedIncident.reporter.phone || 'N/A'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* PostGIS Nearest Resources Calculation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-400 uppercase tracking-wider text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Nearest Spatial Resources (PostGIS)
                </span>
                {loadingNearest && <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />}
              </div>

              {/* Nearest Rescue Unit */}
              <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-sky-400">
                    <Shield className="w-4 h-4" />
                    <span>Nearest Rescue Unit</span>
                  </div>
                  {nearestData?.nearestRescueTeam && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold">
                      {nearestData.nearestRescueTeam.distanceKm} km away
                    </span>
                  )}
                </div>

                {nearestData?.nearestRescueTeam ? (
                  <div className="space-y-1 text-slate-300">
                    <div className="font-black text-white">{nearestData.nearestRescueTeam.unitName}</div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Type: {nearestData.nearestRescueTeam.unitType}</span>
                      <span>Status: <strong className="text-emerald-400">{nearestData.nearestRescueTeam.status}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-[11px]">No active units recorded in immediate vicinity.</div>
                )}
              </div>

              {/* Nearest Shelter */}
              <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <Home className="w-4 h-4" />
                    <span>Nearest Relief Camp</span>
                  </div>
                  {nearestData?.nearestShelter && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                      {nearestData.nearestShelter.distanceKm} km away
                    </span>
                  )}
                </div>

                {nearestData?.nearestShelter ? (
                  <div className="space-y-1 text-slate-300">
                    <div className="font-black text-white">{nearestData.nearestShelter.name}</div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Available: {nearestData.nearestShelter.availableCapacity} / {nearestData.nearestShelter.capacity} Beds</span>
                      <span className="text-emerald-400 font-bold">{nearestData.nearestShelter.status}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-[11px]">No relief camp registered in sector.</div>
                )}
              </div>

              {/* Nearest Hospital */}
              <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-teal-400">
                    <Building2 className="w-4 h-4" />
                    <span>Nearest 24x7 Hospital</span>
                  </div>
                  {nearestData?.nearestHospital && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold">
                      {nearestData.nearestHospital.distanceKm} km away
                    </span>
                  )}
                </div>

                {nearestData?.nearestHospital ? (
                  <div className="space-y-1 text-slate-300">
                    <div className="font-black text-white">{nearestData.nearestHospital.name}</div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>{nearestData.nearestHospital.traumaCareLevel || 'Emergency Care'}</span>
                      <span>Available Beds: <strong className="text-teal-300">{nearestData.nearestHospital.availableBeds}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-[11px]">No hospital data in sector.</div>
                )}
              </div>
            </div>

            {/* Operational Actions */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              {role !== 'citizen' && (
                <button
                  onClick={() => handleOpenDispatch(selectedIncident)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Rescue Unit</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {nearestData?.nearestRescueTeam && (
                  <button
                    onClick={() => {
                      if (nearestData?.nearestRescueTeam) {
                        drawRouteLine(
                          [nearestData.nearestRescueTeam.latitude, nearestData.nearestRescueTeam.longitude],
                          [selectedIncident.latitude, selectedIncident.longitude],
                          `Rescue Route: ${nearestData.nearestRescueTeam.unitName} ➔ #${selectedIncident.incidentCode}`
                        );
                      }
                    }}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Route from Unit</span>
                  </button>
                )}

                {onViewIncidentDetails && (
                  <button
                    onClick={() => onViewIncidentDetails(selectedIncident.id)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. DISPATCH RESCUE TEAM MODAL */}
      {/* ------------------------------------------------------------- */}
      {dispatchModalOpen && dispatchIncidentTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black">Dispatch Rescue Unit</h3>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400 font-bold uppercase text-[10px]">Target Incident</div>
              <div className="font-black text-white">{dispatchIncidentTarget.incidentTypeName} ({dispatchIncidentTarget.incidentCode})</div>
              <div className="text-slate-400 truncate">{dispatchIncidentTarget.locationAddress || 'Coordinates sector'}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Select Rescue Unit to Assign
                </label>
                <select
                  value={selectedRescueUnitId}
                  onChange={(e) => setSelectedRescueUnitId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {rescueTeams.map(unit => (
                    <option key={unit.unitId} value={unit.unitId}>
                      {unit.unitName} ({unit.unitType}) - {unit.status}
                    </option>
                  ))}
                  {rescueTeams.length === 0 && (
                    <option value="">No active units recorded</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Dispatch Instructions / Remarks
                </label>
                <textarea
                  rows={3}
                  value={dispatchRemarks}
                  onChange={(e) => setDispatchRemarks(e.target.value)}
                  placeholder="Enter operational orders or priority..."
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                disabled={dispatching || !selectedRescueUnitId}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                {dispatching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {dispatchToast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
          dispatchToast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <span>{dispatchToast.message}</span>
        </div>
      )}
    </div>
  );
};
