import React, { useEffect, useState } from 'react';
import { MapPin, Layers, Home, Waves, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import { fetchMapIncidents } from '../services/api';
import type { IncidentReport } from '../services/api';

export const LiveMapPage: React.FC = () => {
  const { coords, location } = useLocation();
  const [activeLayer, setActiveLayer] = useState<'all' | 'incidents' | 'camps' | 'dams' | 'floods' | 'units'>('all');
  const [selectedPin, setSelectedPin] = useState<string | null>('My Current GPS Position');
  const [spatialIncidents, setSpatialIncidents] = useState<IncidentReport[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  const loadIncidents = async () => {
    setLoadingIncidents(true);
    const incidents = await fetchMapIncidents();
    setSpatialIncidents(incidents);
    setLoadingIncidents(false);
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const userGpsPin = (coords && location?.isGPS) ? {
    id: 'My Current GPS Position',
    type: 'units',
    title: `📍 ${location.placeName || location.district} (Your GPS Position)`,
    district: location.district,
    capacity: `Accuracy: ±${Math.round(location.accuracy || 15)}m`,
    status: 'YOU ARE HERE (GPS Live)',
    lat: `${coords.latitude.toFixed(5)}° N`,
    lng: `${coords.longitude.toFixed(5)}° E`,
    contact: 'GPS Telemetry Active',
  } : null;

  // Map incident reports into pins
  const incidentPins = spatialIncidents.map(inc => ({
    id: inc.incidentCode,
    type: 'incidents',
    title: `🚨 ${inc.incidentTypeName} (${inc.incidentCode})`,
    district: inc.locationAddress || 'Kerala Hazard Zone',
    capacity: `Severity: ${inc.severity}`,
    status: `STATUS: ${inc.status.replace('_', ' ')}`,
    lat: `${inc.latitude.toFixed(4)}° N`,
    lng: `${inc.longitude.toFixed(4)}° E`,
    contact: `Reported: ${new Date(inc.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`,
    raw: inc
  }));

  const staticLocations = [
    ...(userGpsPin ? [userGpsPin] : []),
    {
      id: 'Munnar Relief Shelter',
      type: 'camps',
      title: 'Munnar Govt High School Relief Camp',
      district: 'Idukki',
      capacity: '450 / 600 Beds',
      status: 'OPEN & ACTIVE',
      lat: '10.0889° N',
      lng: '77.0595° E',
      contact: '04862-233111',
    },
    {
      id: 'Aluva Flood Camp',
      type: 'camps',
      title: 'Aluva St. Xavier College Relief Camp',
      district: 'Ernakulam',
      capacity: '320 / 500 Beds',
      status: 'OPEN & ACTIVE',
      lat: '10.1080° N',
      lng: '76.3570° E',
      contact: '0484-2423001',
    },
    {
      id: 'Idukki Arch Dam',
      type: 'dams',
      title: 'Idukki Hydroelectric Reservoir',
      district: 'Idukki',
      capacity: '2398.50 ft (92% Storage)',
      status: 'RED ALERT - 2 Shutters Open',
      lat: '9.8433° N',
      lng: '76.9744° E',
      contact: '04862-232200',
    },
    {
      id: 'Meppadi Rescue Post',
      type: 'units',
      title: 'NDRF 4th Battalion Rescue Post',
      district: 'Wayanad',
      capacity: '45 Personnel + 6 Boats',
      status: 'DEPLOYED & OPERATIONAL',
      lat: '11.5516° N',
      lng: '76.1264° E',
      contact: '1077',
    }
  ];

  const mapLocations = [...incidentPins, ...staticLocations];

  const filteredPins = mapLocations.filter(p => activeLayer === 'all' || p.type === activeLayer);
  const currentPin: any = mapLocations.find(p => p.id === selectedPin) || mapLocations[0];

  const getMarkerBg = (pin: any) => {
    if (pin.type === 'incidents' && pin.raw) {
      switch (pin.raw.severity) {
        case 'CRITICAL': return 'bg-red-600 text-white font-black animate-pulse';
        case 'HIGH': return 'bg-orange-500 text-white font-bold';
        case 'MODERATE': return 'bg-yellow-500 text-slate-950 font-bold';
        default: return 'bg-emerald-600 text-white font-bold';
      }
    }
    if (pin.type === 'camps') return 'bg-emerald-600 text-white';
    if (pin.type === 'dams') return 'bg-amber-600 text-white';
    if (pin.type === 'floods') return 'bg-red-600 text-white';
    return 'bg-sky-600 text-white';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>KSDMA PostGIS Spatial Telemetry System</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Interactive Live Disaster & Incident Map
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl font-normal">
            Real-time PostGIS spatial mapping for citizen incident reports, active relief camps, dam shutter positions, and rescue team deployments.
          </p>
        </div>

        {/* Layer Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-[#032e22] p-2 rounded-2xl border border-emerald-800">
          {[
            { id: 'all', label: 'All Layers' },
            { id: 'incidents', label: `🚨 Incidents (${spatialIncidents.length})` },
            { id: 'camps', label: 'Relief Camps' },
            { id: 'dams', label: 'Dam Storage' },
            { id: 'units', label: 'NDRF Units' },
          ].map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                activeLayer === layer.id
                  ? 'bg-[#059669] text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Interactive GIS Map Canvas View */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl relative min-h-[500px] overflow-hidden flex flex-col justify-between p-6">
          <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/40 pointer-events-none" />

          {/* Top Bar inside Map */}
          <div className="relative z-10 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800/80 text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Kerala PostGIS Spatial Feed (Live Telemetry)</span>
            </div>
            <button
              onClick={loadIncidents}
              className="text-emerald-400 hover:text-white font-mono text-[11px] flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingIncidents ? 'animate-spin' : ''}`} />
              <span>Sync Map</span>
            </button>
          </div>

          {/* Map Interactive Markers Grid */}
          <div className="relative z-10 my-auto grid grid-cols-2 sm:grid-cols-3 gap-3 py-6 max-h-[420px] overflow-y-auto pr-1">
            {filteredPins.map((pin: any) => (
              <button
                key={pin.id}
                onClick={() => setSelectedPin(pin.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-lg group ${
                  selectedPin === pin.id
                    ? 'bg-emerald-950 border-emerald-400 ring-2 ring-emerald-400/50 scale-105'
                    : 'bg-slate-950/90 border-slate-800 hover:border-emerald-600 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${getMarkerBg(pin)}`}>
                    {pin.type === 'incidents' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                     pin.type === 'camps' ? <Home className="w-3.5 h-3.5" /> :
                     pin.type === 'dams' ? <Waves className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[80px]">{pin.district}</span>
                </div>

                <div className="text-xs font-black text-white group-hover:text-emerald-300 line-clamp-1">
                  {pin.title}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1 line-clamp-1">
                  {pin.status}
                </div>
              </button>
            ))}
          </div>

          {/* Map Legend (Requirement Section 30) */}
          <div className="relative z-10 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-medium pt-3 border-t border-slate-800 gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-300">Severity Indicators:</span>
              <span className="flex items-center gap-1 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> LOW</span>
              <span className="flex items-center gap-1 text-yellow-400"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span> MODERATE</span>
              <span className="flex items-center gap-1 text-orange-400"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> HIGH</span>
              <span className="flex items-center gap-1 text-red-400"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-ping"></span> CRITICAL</span>
            </div>
            <span className="text-emerald-400 font-semibold">🔒 Citizen Personal Info Filtered</span>
          </div>
        </div>

        {/* Right Info Drawer for Selected Marker */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669]">
              <MapPin className="w-6 h-6 text-[#059669]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Spatial Marker Details
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {currentPin?.title || 'Selected Marker'}
              </h3>
            </div>
          </div>

          {currentPin?.raw && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500 uppercase">Incident Code</span>
                <span className="font-mono font-black text-emerald-950">{currentPin.raw.incidentCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-500 uppercase">Severity</span>
                <span className={`px-2.5 py-0.5 rounded-full ${getMarkerBg(currentPin)}`}>
                  {currentPin.raw.severity}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase block mb-1">Description</span>
                <p className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-800">{currentPin.raw.description}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 text-xs font-semibold text-slate-700">
            <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500">Status</span>
              <span className="text-slate-900 font-bold">{currentPin?.status}</span>
            </div>

            <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500">Coordinates</span>
              <span className="text-emerald-900 font-mono font-bold">{currentPin?.lat}, {currentPin?.lng}</span>
            </div>

            {currentPin?.contact && (
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500">Telemetry / Time</span>
                <span className="text-slate-900 font-bold">{currentPin.contact}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
