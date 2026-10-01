import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Phone } from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { DISTRICT_CENTERS } from '../../utils/districtUtils';
import {
  fetchRoleMapIncidents,
  fetchMapShelters,
  fetchMapRescueTeams,
  fetchMapHazardZones,
  fetchRoadHazards,
  fetchIoTSensors,
  fetchCitizenSafetyStatus,
  requestSafeRoute,
  requestEvacuateMe,
  type MapIncident,
  type MapShelter,
  type MapRescueTeam,
  type MapHazardZone,
  type MapRoadHazard,
  type MapIoTSensor,
  type SafeRouteData,
  type NormalRouteData,
  type RouteComparisonData,
  type EvacuateMeResponse,
  type SafetyStatusResponse
} from '../../services/mapService';
import { listenToMapEvents, subscribeToDistrict } from '../../services/socketService';
import { MapHeader } from './MapHeader';
import { EmergencyBanner } from './EmergencyBanner';
import { SafetySummary } from './SafetySummary';
import { MapLayersControl, type DisasterMapLayersState } from './MapLayersControl';
import { MapLegend } from './MapLegend';
import { EvacuationPanel } from './EvacuationPanel';
import { RouteInformationPanel } from './RouteInformationPanel';
import { DeveloperSimulationBar } from './DeveloperSimulationBar';
import { CitizenIncidentReportModal } from './CitizenIncidentReportModal';
import { WeatherCard } from './WeatherCard';
import { renderDisasterZonesLayer } from './layers/DisasterZoneLayer';
import { renderRoadHazardsLayer } from './layers/RoadHazardLayer';
import { renderIoTSensorsLayer } from './layers/IoTSensorLayer';
import { renderSafeRouteOnMap } from './layers/SafeRouteLayer';
import { createIncidentMarkerIcon, generateIncidentPopupHtml } from '../LiveMap/markers/IncidentMarker';
import { createShelterMarkerIcon, generateShelterPopupHtml } from '../LiveMap/markers/ShelterMarker';
import { createRescueTeamMarkerIcon, generateRescueTeamPopupHtml } from '../LiveMap/markers/RescueTeamMarker';
import { createSOSMarkerIcon, generateSOSPopupHtml } from '../LiveMap/markers/SOSMarker';
import { fetchMapSOSMarkers, type SOSRequest } from '../../services/sosService';

// Fix Leaflet marker icon asset paths
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
  // Silent fallback
}

interface LiveDisasterMapProps {
  userDistrict?: string;
  onViewIncidentDetails?: (id: number | string) => void;
  className?: string;
  targetDestination?: {
    lat: number;
    lng: number;
    name: string;
  } | null;
  onClearTargetDestination?: () => void;
}

export const LiveDisasterMap: React.FC<LiveDisasterMapProps> = ({
  userDistrict,
  onViewIncidentDetails: _onViewIncidentDetails,
  className = '',
  targetDestination,
  onClearTargetDestination
}) => {
  const { coords, location, weatherData, refreshLocation } = useLocation();

  // Map DOM & Leaflet References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Leaflet Layer Groups
  const disasterZonesLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null);
  const roadHazardsLayerRef = useRef<L.LayerGroup | null>(null);
  const sheltersLayerRef = useRef<L.LayerGroup | null>(null);
  const rescueTeamsLayerRef = useRef<L.LayerGroup | null>(null);
  const iotSensorsLayerRef = useRef<L.LayerGroup | null>(null);
  const safeRouteLayerRef = useRef<L.LayerGroup | null>(null);
  const sosLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);

  // District & Mode State: Prioritize real-time reverse geocoded district from LocationContext
  const citizenDistrict = location?.district || userDistrict || 'Kottayam';
  const [mapMode, setMapMode] = useState<'local' | 'kerala'>('local');

  // Layer Visibility State
  const [layers, setLayers] = useState<DisasterMapLayersState>({
    disasterZones: true,
    liveIncidents: true,
    roadConditions: true,
    safeRoutes: true,
    evacuationCenters: true,
    rescueTeams: true,
    iotSensors: true,
    weather: true,
    riskHeatmap: false
  });
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);

  // Live Telemetry Data States
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [shelters, setShelters] = useState<MapShelter[]>([]);
  const [rescueTeams, setRescueTeams] = useState<MapRescueTeam[]>([]);
  const [hazardZones, setHazardZones] = useState<MapHazardZone[]>([]);
  const [roadHazards, setRoadHazards] = useState<MapRoadHazard[]>([]);
  const [iotSensors, setIoTSensors] = useState<MapIoTSensor[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatusResponse | null>(null);

  // Route & Evacuation State
  const [activeRoute, setActiveRoute] = useState<SafeRouteData | null>(null);
  const [normalRoute, setNormalRoute] = useState<NormalRouteData | null>(null);
  const [routeComparison, setRouteComparison] = useState<RouteComparisonData | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'safe' | 'normal'>('safe');
  const [activeRouteDestinationName, setActiveRouteDestinationName] = useState<string>('');
  const [activeDestinationCoords, setActiveDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeSimulationScenario, setActiveSimulationScenario] = useState<string | null>(null);
  const [isRouteInvalidated, setIsRouteInvalidated] = useState<boolean>(false);
  const [evacuationData, setEvacuationData] = useState<EvacuateMeResponse | null>(null);
  const [evacuationPanelOpen, setEvacuationPanelOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Location Coordinates: Real browser GPS coordinates have primary authority.
  // Fallback strictly matches the citizen's detected district (e.g. Kottayam: 9.5916, 76.5222)
  const hasBrowserGps = Boolean(coords?.latitude && coords?.longitude);
  const fallbackCoords = DISTRICT_CENTERS[citizenDistrict] || { lat: 9.5916, lng: 76.5222 };
  const effectiveLat = coords?.latitude ?? fallbackCoords.lat;
  const effectiveLng = coords?.longitude ?? fallbackCoords.lng;

  // Telemetry Fetching directly from database tables
  const loadTelemetry = useCallback(async () => {
    try {
      const targetDistParam = mapMode === 'local' ? citizenDistrict : undefined;

      // Parallel data fetching for performance
      const [incList, shelterList, teamsList, zonesList, roadList, sensorList, statusRes, sosList] = await Promise.all([
        fetchRoleMapIncidents({ district: targetDistParam, lat: effectiveLat, lng: effectiveLng }),
        fetchMapShelters(targetDistParam, effectiveLat, effectiveLng),
        fetchMapRescueTeams(targetDistParam),
        fetchMapHazardZones(),
        fetchRoadHazards({ district: targetDistParam, lat: effectiveLat, lng: effectiveLng }),
        fetchIoTSensors({ district: targetDistParam, lat: effectiveLat, lng: effectiveLng }),
        fetchCitizenSafetyStatus(effectiveLat, effectiveLng, citizenDistrict),
        fetchMapSOSMarkers(targetDistParam, false)
      ]);

      setIncidents(incList);
      setShelters(shelterList);
      setRescueTeams(teamsList);
      setHazardZones(zonesList);
      setRoadHazards(roadList);
      setIoTSensors(sensorList);
      if (statusRes) setSafetyStatus(statusRes);
      setSosRequests(sosList || []);
    } catch (err) {
      console.error('[LiveDisasterMap] Telemetry load error:', err);
    }
  }, [citizenDistrict, effectiveLat, effectiveLng, mapMode]);

  // Initial load and periodic refresh
  useEffect(() => {
    loadTelemetry();
    const interval = setInterval(loadTelemetry, 10000);
    return () => clearInterval(interval);
  }, [loadTelemetry]);

  // Socket.IO real-time event listener & route invalidation
  useEffect(() => {
    subscribeToDistrict(citizenDistrict);

    const cleanup = listenToMapEvents({
      onIncidentCreated: (newInc) => {
        console.log('⚡ [LiveDisasterMap] Real-time new incident:', newInc);
        loadTelemetry();
        if (activeRoute) setIsRouteInvalidated(true);
      },
      onIncidentUpdated: () => loadTelemetry(),
      onRoadHazardUpdated: (newHazard) => {
        console.log('⚡ [LiveDisasterMap] Real-time road hazard:', newHazard);
        loadTelemetry();
        if (activeRoute && newHazard.status === 'BLOCKED') {
          setIsRouteInvalidated(true);
        }
      },
      onHazardZoneUpdated: () => {
        loadTelemetry();
        if (activeRoute) setIsRouteInvalidated(true);
      },
      onIoTSensorUpdated: () => loadTelemetry(),
      onShelterUpdated: () => loadTelemetry()
    });

    return cleanup;
  }, [citizenDistrict, loadTelemetry, activeRoute]);

  // Initialize Leaflet Map Canvas with reliable OpenStreetMap basemap
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const initialCenter: [number, number] = [effectiveLat, effectiveLng];
    const initialZoom = mapMode === 'local' ? 12 : 8;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
      maxBounds: [
        [7.5, 73.5],
        [13.5, 78.5]
      ],
      maxBoundsViscosity: 0.85
    });

    // Reliable OpenStreetMap Basemap Tiles (No API key needed, zero watermark/grey tile errors)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 6,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      crossOrigin: true
    }).addTo(map);

    // Zoom control in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initialize layer groups in proper z-order
    disasterZonesLayerRef.current = L.layerGroup().addTo(map);
    roadHazardsLayerRef.current = L.layerGroup().addTo(map);
    safeRouteLayerRef.current = L.layerGroup().addTo(map);
    sheltersLayerRef.current = L.layerGroup().addTo(map);
    rescueTeamsLayerRef.current = L.layerGroup().addTo(map);
    iotSensorsLayerRef.current = L.layerGroup().addTo(map);
    incidentsLayerRef.current = L.layerGroup().addTo(map);
    sosLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Invalidate size on initial container render & post-mount layout completion
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 400);

    // Dynamic ResizeObserver ensures tiles continuously fit the container on window/parent resize
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map center & zoom on coordinate update or Map Mode Switch
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapMode === 'local') {
      mapRef.current.setView([effectiveLat, effectiveLng], 12, { animate: true });
      mapRef.current.invalidateSize();
    } else {
      // Kerala statewide view: Fits all 14 districts without locking to a single city
      mapRef.current.fitBounds([
        [8.18, 74.85],
        [12.85, 77.40]
      ], { animate: true, padding: [20, 20] });
      mapRef.current.invalidateSize();
    }
  }, [mapMode, effectiveLat, effectiveLng]);

  // Render "📍 YOU" Citizen Location Marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();
    if (userAccuracyCircleRef.current) userAccuracyCircleRef.current.remove();

    const userIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-60"></span>
        <div class="relative w-8 h-8 rounded-full bg-[#043e2e] border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-black">
          📍
        </div>
      </div>
    `;

    const divIcon = L.divIcon({
      className: 'sahay-user-gps-marker',
      html: userIconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([effectiveLat, effectiveLng], { icon: divIcon }).addTo(mapRef.current);

    const popupHtml = `
      <div class="sahay-popup font-sans text-xs p-1 space-y-2">
        <div class="flex items-center gap-2 border-b border-slate-100 pb-1.5">
          <span class="text-sm">📍</span>
          <div>
            <h4 class="font-black text-slate-900">YOUR CURRENT LOCATION</h4>
            <span class="text-[10px] text-emerald-700 font-bold">${hasBrowserGps ? 'Live Browser GPS' : 'Default Sector Position'}</span>
          </div>
        </div>

        <div class="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/70">
          <div>Latitude: <strong class="font-mono text-slate-800">${effectiveLat.toFixed(4)}° N</strong></div>
          <div>Longitude: <strong class="font-mono text-slate-800">${effectiveLng.toFixed(4)}° E</strong></div>
          <div>District: <strong>${citizenDistrict}</strong></div>
          <div>GPS Status: <strong class="text-emerald-700">${hasBrowserGps ? 'Active & Accurate' : 'Fallback (Enable Location)'}</strong></div>
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml, { maxWidth: 260 });
    userMarkerRef.current = marker;

    // Accuracy circle around citizen
    const circle = L.circle([effectiveLat, effectiveLng], {
      radius: hasBrowserGps ? (location?.accuracy || 80) : 500,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '4, 4'
    }).addTo(mapRef.current);
    userAccuracyCircleRef.current = circle;
  }, [effectiveLat, effectiveLng, hasBrowserGps, location, citizenDistrict]);

  // Render Disaster Zones Layer
  useEffect(() => {
    if (!disasterZonesLayerRef.current) return;
    if (layers.disasterZones) {
      renderDisasterZonesLayer(disasterZonesLayerRef.current, hazardZones);
    } else {
      disasterZonesLayerRef.current.clearLayers();
    }
  }, [layers.disasterZones, hazardZones]);

  // Render Road Hazards Layer
  useEffect(() => {
    if (!roadHazardsLayerRef.current) return;
    if (layers.roadConditions) {
      renderRoadHazardsLayer(roadHazardsLayerRef.current, roadHazards);
    } else {
      roadHazardsLayerRef.current.clearLayers();
    }
  }, [layers.roadConditions, roadHazards]);

  // Render IoT Sensors Layer
  useEffect(() => {
    if (!iotSensorsLayerRef.current) return;
    if (layers.iotSensors) {
      renderIoTSensorsLayer(iotSensorsLayerRef.current, iotSensors);
    } else {
      iotSensorsLayerRef.current.clearLayers();
    }
  }, [layers.iotSensors, iotSensors]);

  // Render Incidents Layer
  useEffect(() => {
    if (!incidentsLayerRef.current) return;
    incidentsLayerRef.current.clearLayers();

    if (!layers.liveIncidents) return;

    incidents.forEach(inc => {
      if (isNaN(inc.latitude) || isNaN(inc.longitude)) return;
      const icon = createIncidentMarkerIcon(inc);
      const marker = L.marker([inc.latitude, inc.longitude], { icon });
      const nearestShelter = shelters[0] || null;
      const popupHtml = generateIncidentPopupHtml(inc, 'citizen', nearestShelter, null);
      marker.bindPopup(popupHtml, { maxWidth: 320 });
      marker.addTo(incidentsLayerRef.current!);
    });
  }, [layers.liveIncidents, incidents, shelters]);

  // Render Active SOS Emergency Requests Layer (Requirement 8)
  useEffect(() => {
    if (!sosLayerRef.current) return;
    sosLayerRef.current.clearLayers();

    sosRequests.forEach((sos) => {
      if (isNaN(sos.latitude) || isNaN(sos.longitude)) return;
      const icon = createSOSMarkerIcon(sos);
      const marker = L.marker([sos.latitude, sos.longitude], {
        icon,
        zIndexOffset: 2000 // Highest priority on map
      });
      const popupHtml = generateSOSPopupHtml(sos);
      marker.bindPopup(popupHtml, { maxWidth: 320 });
      marker.addTo(sosLayerRef.current!);
    });
  }, [sosRequests]);

  // Render Evacuation Centers (Shelters) Layer
  useEffect(() => {
    if (!sheltersLayerRef.current) return;
    sheltersLayerRef.current.clearLayers();

    if (!layers.evacuationCenters) return;

    shelters.forEach(s => {
      if (isNaN(s.latitude) || isNaN(s.longitude)) return;
      const icon = createShelterMarkerIcon(s);
      const marker = L.marker([s.latitude, s.longitude], { icon });
      const popupHtml = generateShelterPopupHtml(s);
      marker.bindPopup(popupHtml, { maxWidth: 320 });
      marker.addTo(sheltersLayerRef.current!);
    });
  }, [layers.evacuationCenters, shelters]);

  // Render Rescue Teams Layer (Civil Units for Citizens)
  useEffect(() => {
    if (!rescueTeamsLayerRef.current) return;
    rescueTeamsLayerRef.current.clearLayers();

    if (!layers.rescueTeams) return;

    rescueTeams.forEach(team => {
      if (isNaN(team.latitude) || isNaN(team.longitude)) return;
      const icon = createRescueTeamMarkerIcon(team);
      const marker = L.marker([team.latitude, team.longitude], { icon });
      const popupHtml = generateRescueTeamPopupHtml(team);
      marker.bindPopup(popupHtml, { maxWidth: 300 });
      marker.addTo(rescueTeamsLayerRef.current!);
    });
  }, [layers.rescueTeams, rescueTeams]);

  // Core: Calculate and compare Normal Route vs SAHAY Safe Route to a specific destination
  const calculateRouteToDestination = useCallback(async (
    destLat: number,
    destLng: number,
    destName: string,
    simOverride?: string | null
  ) => {
    setActiveDestinationCoords({ lat: destLat, lng: destLng });
    setActiveRouteDestinationName(destName);
    try {
      const scenario = simOverride !== undefined ? simOverride : activeSimulationScenario;
      const routeRes = await requestSafeRoute(
        { lat: effectiveLat, lng: effectiveLng },
        { lat: destLat, lng: destLng },
        { simulationScenario: scenario || undefined, district: citizenDistrict }
      );
      if (routeRes && routeRes.success && routeRes.route) {
        setActiveRoute(routeRes.route);
        setNormalRoute(routeRes.normalRoute || null);
        setRouteComparison(routeRes.comparison || null);
        setSelectedRouteType('safe');
        setIsRouteInvalidated(false);
      }
    } catch (err) {
      console.error('Safe route calculation error:', err);
    }
  }, [activeSimulationScenario, citizenDistrict, effectiveLat, effectiveLng]);

  // Global window handler for "Get Directions" from marker popups
  useEffect(() => {
    (window as any).__sahayMap_getDirections = (destLat: number, destLng: number, destName: string) => {
      calculateRouteToDestination(destLat, destLng, destName);
    };

    return () => {
      delete (window as any).__sahayMap_getDirections;
    };
  }, [calculateRouteToDestination]);

  // Trigger safe route calculation when targetDestination is provided (e.g. from Citizen Dashboard shelter navigation)
  useEffect(() => {
    if (targetDestination && targetDestination.lat && targetDestination.lng) {
      setMapMode('local');
      setLayers(prev => ({ ...prev, safeRoutes: true }));
      calculateRouteToDestination(
        targetDestination.lat,
        targetDestination.lng,
        targetDestination.name
      );
    }
  }, [targetDestination, calculateRouteToDestination]);

  // Render Active Safe Route & Normal Route on Map
  useEffect(() => {
    if (!mapRef.current) return;
    if (layers.safeRoutes && activeRoute) {
      renderSafeRouteOnMap(
        mapRef.current,
        safeRouteLayerRef,
        activeRoute,
        normalRoute,
        activeRouteDestinationName,
        selectedRouteType,
        (type) => setSelectedRouteType(type)
      );
    } else if (safeRouteLayerRef.current) {
      safeRouteLayerRef.current.clearLayers();
    }
  }, [layers.safeRoutes, activeRoute, normalRoute, activeRouteDestinationName, selectedRouteType]);

  // Action: "🚨 EVACUATE ME" Trigger
  const handleTriggerEvacuateMe = async () => {
    try {
      const res = await requestEvacuateMe({ lat: effectiveLat, lng: effectiveLng }, citizenDistrict);
      if (res && res.success) {
        setEvacuationData(res);
        setEvacuationPanelOpen(true);
      } else {
        alert('Unable to calculate evacuation ranking. Please ensure GPS or district is selected.');
      }
    } catch (err) {
      console.error('Evacuation ranking error:', err);
    }
  };

  // Action: "🧭 FIND SAFE ROUTE" (Route to nearest safe shelter by default)
  const handleFindSafeRoute = async () => {
    if (!shelters.length) {
      alert('No relief shelters located in the selected district.');
      return;
    }
    const destination = shelters[0];
    await calculateRouteToDestination(destination.latitude, destination.longitude, destination.name);
  };

  // Action: Developer Simulation Scenario Changed
  const handleScenarioChange = async (scenarioId: string | null) => {
    setActiveSimulationScenario(scenarioId);
    if (activeDestinationCoords) {
      await calculateRouteToDestination(
        activeDestinationCoords.lat,
        activeDestinationCoords.lng,
        activeRouteDestinationName,
        scenarioId
      );
    } else if (shelters.length > 0) {
      const dest = shelters[0];
      await calculateRouteToDestination(
        dest.latitude,
        dest.longitude,
        dest.name,
        scenarioId
      );
    }
  };

  // Action: Start Route from Evacuation Panel
  const handleStartEvacuationRoute = (shelter: any) => {
    if (shelter.latitude && shelter.longitude) {
      calculateRouteToDestination(shelter.latitude, shelter.longitude, shelter.name);
      setEvacuationPanelOpen(false);
    } else if (shelter.route) {
      setActiveRoute(shelter.route);
      setActiveRouteDestinationName(shelter.name);
      setIsRouteInvalidated(false);
      setEvacuationPanelOpen(false);
    }
  };

  // Action: Recalculate route upon invalidation
  const handleRecalculateRoute = async () => {
    if (activeDestinationCoords) {
      await calculateRouteToDestination(activeDestinationCoords.lat, activeDestinationCoords.lng, activeRouteDestinationName);
    } else {
      await handleFindSafeRoute();
    }
  };

  // Action: Clear active route
  const handleClearRoute = () => {
    setActiveRoute(null);
    setNormalRoute(null);
    setRouteComparison(null);
    setActiveRouteDestinationName('');
    setActiveDestinationCoords(null);
    setIsRouteInvalidated(false);
    if (safeRouteLayerRef.current) safeRouteLayerRef.current.clearLayers();
    if (onClearTargetDestination) onClearTargetDestination();
  };

  // Action: Recenter Map to Citizen GPS
  const handleRecenterGps = () => {
    if (mapRef.current) {
      mapRef.current.setView([effectiveLat, effectiveLng], 14, { animate: true });
      mapRef.current.invalidateSize();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Map Header */}
      <MapHeader
        locationName={location?.placeName || `${citizenDistrict} Sector`}
        district={citizenDistrict}
        safetyStatus={safetyStatus}
        mapMode={mapMode}
        onToggleMapMode={(mode) => setMapMode(mode)}
        onEvacuateClick={handleTriggerEvacuateMe}
        onSafeRouteClick={handleFindSafeRoute}
        onReportIncidentClick={() => setReportModalOpen(true)}
        onRecenterGps={handleRecenterGps}
        onToggleLayers={() => setShowLayersDropdown(!showLayersDropdown)}
        showLayers={showLayersDropdown}
      />

      {/* 2. Emergency Alert Banner (Shown only when emergency/warning is active near citizen) */}
      <EmergencyBanner
        safetyStatus={safetyStatus}
        onViewSafeRoute={handleTriggerEvacuateMe}
      />

      {/* Developer Disaster Simulation Suite (Isolated Testing for Developer) */}
      <DeveloperSimulationBar
        onScenarioChange={handleScenarioChange}
        activeScenarioId={activeSimulationScenario}
        district={citizenDistrict}
      />

      {/* GPS Fallback Warning Alert if Browser GPS Denied/Disabled */}
      {!hasBrowserGps && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Device GPS location permission is not granted. Using default {citizenDistrict} monitoring coordinates. Enable GPS for precise localized safety routing.
            </span>
          </div>
          <button
            onClick={refreshLocation}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shrink-0 ml-3 cursor-pointer"
          >
            Enable GPS
          </button>
        </div>
      )}

      {/* 3. Main Interactive Map & Side Information Layout */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg bg-slate-100 min-h-[580px] lg:min-h-[680px] flex flex-col lg:flex-row">
        {/* Leaflet Map Canvas */}
        <div
          ref={mapContainerRef}
          id="sahay-live-disaster-map-canvas"
          className="w-full h-[580px] lg:h-[680px] flex-1 z-10"
          style={{ width: '100%', minHeight: '520px' }}
        />

        {/* Floating Controls Over Map */}
        {/* Top-Right: Map Layers Dropdown */}
        {showLayersDropdown && (
          <div className="absolute top-4 right-4 z-20">
            <MapLayersControl
              layers={layers}
              onToggleLayer={(key) => setLayers(prev => ({ ...prev, [key]: !prev[key] }))}
              onClose={() => setShowLayersDropdown(false)}
            />
          </div>
        )}

        {/* Bottom-Right: Collapsible Government Legend */}
        <div className="absolute bottom-4 right-4 z-20">
          <MapLegend />
        </div>

        {/* Top-Left / Floating: Active Route Information Panel (If safe route is calculated) */}
        {activeRoute && (
          <div className="absolute top-4 left-4 z-20 max-w-sm">
            <RouteInformationPanel
              routeData={activeRoute}
              normalRouteData={normalRoute}
              comparison={routeComparison}
              destinationName={activeRouteDestinationName}
              selectedRouteType={selectedRouteType}
              onSelectRouteType={(type) => setSelectedRouteType(type)}
              isRouteInvalidated={isRouteInvalidated}
              onRecalculateRoute={handleRecalculateRoute}
              onClearRoute={handleClearRoute}
            />
          </div>
        )}

        {/* Floating Evacuation Panel Drawer */}
        {evacuationPanelOpen && evacuationData && (
          <div className="absolute top-4 left-4 z-30 max-w-md">
            <EvacuationPanel
              evacuationData={evacuationData}
              onStartRoute={handleStartEvacuationRoute}
              onClose={() => setEvacuationPanelOpen(false)}
            />
          </div>
        )}

        {/* Floating Weather Card (Top or Bottom Left depending on route state) */}
        {!activeRoute && !evacuationPanelOpen && (
          <div className="absolute top-4 left-4 z-20 hidden md:block">
            <WeatherCard
              weatherData={weatherData}
              district={citizenDistrict}
            />
          </div>
        )}
      </div>

      {/* 4. Bottom Situation Grid (Safety Summary + Weather + Quick Emergency Guides) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SafetySummary
          safetyStatus={safetyStatus}
          onViewSafeRoute={handleFindSafeRoute}
          onEvacuateMe={handleTriggerEvacuateMe}
        />

        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
              RAPID ACTIONS
            </span>
            <h3 className="text-sm font-black text-slate-900">EMERGENCY PROTOCOLS</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              If flood levels rise above doorsteps or hill cracks appear, evacuate immediately along the green safe route.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href="tel:112"
              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-rose-600" />
              <span>Police / ERSS (112)</span>
            </a>
            <a
              href="tel:1077"
              className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#0B4D3B] border border-emerald-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#0E8F66]" />
              <span>Control Room (1077)</span>
            </a>
          </div>
        </div>

        <WeatherCard
          weatherData={weatherData}
          district={citizenDistrict}
        />
      </div>

      {/* 5. Citizen Incident Report Modal */}
      {reportModalOpen && (
        <CitizenIncidentReportModal
          gpsCoords={coords ? { latitude: coords.latitude, longitude: coords.longitude } : null}
          userDistrict={citizenDistrict}
          onSuccess={() => {
            setReportModalOpen(false);
            loadTelemetry();
          }}
          onClose={() => setReportModalOpen(false)}
        />
      )}
    </div>
  );
};
