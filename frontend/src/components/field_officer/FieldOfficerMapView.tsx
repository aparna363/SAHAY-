import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  RotateCw
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchFieldOfficerMapData } from '../../services/api';

interface FieldOfficerMapViewProps {
  onConductInspection: (claim: any) => void;
  onViewClaim: (claim: any) => void;
}

export const FieldOfficerMapView: React.FC<FieldOfficerMapViewProps> = ({
  onConductInspection,
  onViewClaim
}) => {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Officer GPS state
  const [, setOfficerGPS] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const officerMarkerRef = useRef<L.Marker | null>(null);

  const loadMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFieldOfficerMapData();
      setLocations(data.locations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load map points');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter: [number, number] = [9.5916, 76.5222]; // Kottayam default
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 11,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers on filter or locations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const filtered = locations.filter((loc) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'SCHEDULED') return loc.status === 'VISIT_SCHEDULED';
      if (statusFilter === 'PENDING') return ['UNDER_FIELD_VERIFICATION', 'ASSIGNED_FOR_VERIFICATION', 'SUBMITTED'].includes(loc.status);
      if (statusFilter === 'COMPLETED') return ['FIELD_VISIT_COMPLETED', 'FIELD_VERIFIED', 'REQUIRES_CORRECTION'].includes(loc.status);
      if (statusFilter === 'VERIFIED') return ['FIELD_VERIFIED', 'COLLECTOR_REVIEW'].includes(loc.status);
      return true;
    });

    const bounds: L.LatLngExpression[] = [];

    filtered.forEach((loc) => {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      // Marker Color based on Status
      let pinColor = '#3b82f6'; // Blue
      let iconSymbol = '📍';
      let statusLabel = 'Assigned';

      if (loc.status === 'VISIT_SCHEDULED') {
        pinColor = '#059669'; // Emerald
        iconSymbol = '📅';
        statusLabel = 'Visit Scheduled';
      } else if (loc.status === 'FIELD_VISIT_COMPLETED') {
        pinColor = '#8b5cf6'; // Purple
        iconSymbol = '🔍';
        statusLabel = 'Visit Completed';
      } else if (loc.status === 'FIELD_VERIFIED') {
        pinColor = '#10b981'; // Green
        iconSymbol = '✓';
        statusLabel = 'Verified';
      } else if (loc.status === 'REQUIRES_CORRECTION') {
        pinColor = '#f43f5e'; // Rose
        iconSymbol = '⚠';
        statusLabel = 'Requires Correction';
      } else if (['UNDER_FIELD_VERIFICATION', 'ASSIGNED_FOR_VERIFICATION', 'SUBMITTED'].includes(loc.status)) {
        pinColor = '#f59e0b'; // Amber
        iconSymbol = '⏳';
        statusLabel = 'Pending Visit';
      }

      const customIcon = L.divIcon({
        className: 'custom-field-pin',
        html: `
          <div style="background-color: ${pinColor}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 13px; font-weight: bold; cursor: pointer; transform: hover:scale-110 transition: all 0.2s;">
            ${iconSymbol}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Popup Content with clickable actions
      const popupDiv = document.createElement('div');
      popupDiv.className = 'p-1 font-sans text-xs';
      popupDiv.innerHTML = `
        <div style="min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #065f46; font-family: monospace; font-size: 12px;">${loc.claim_id}</strong>
            <span style="background-color: ${pinColor}20; color: ${pinColor}; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: bold;">
              ${statusLabel}
            </span>
          </div>
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${loc.applicant_name}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">📍 ${loc.village || loc.taluk || ''}, ${loc.district}</div>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; margin-bottom: 8px; font-size: 11px;">
            <div><strong>Damage:</strong> ${loc.damage_category || 'Pending Assessment'}</div>
            <div><strong>Disaster:</strong> ${loc.disaster_type}</div>
            ${loc.scheduled_visit_date ? `<div style="color: #059669; font-weight: bold; margin-top: 2px;">📅 ${new Date(loc.scheduled_visit_date).toLocaleDateString('en-IN')} ${new Date(loc.scheduled_visit_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
          </div>
          <div style="display: flex; gap: 6px;">
            <button id="btn-inspect-${loc.id}" style="flex: 1; background-color: #059669; color: #ffffff; padding: 6px 8px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; font-size: 11px;">
              Inspect & Verify
            </button>
            <button id="btn-view-${loc.id}" style="background-color: #f1f5f9; color: #334155; padding: 6px 8px; border-radius: 8px; font-weight: bold; border: 1px solid #cbd5e1; cursor: pointer; font-size: 11px;">
              View
            </button>
          </div>
        </div>
      `;

      // Attach event listeners after popup opens
      marker.bindPopup(popupDiv);
      marker.on('popupopen', () => {
        const btnInspect = document.getElementById(`btn-inspect-${loc.id}`);
        if (btnInspect) {
          btnInspect.onclick = () => onConductInspection(loc);
        }
        const btnView = document.getElementById(`btn-view-${loc.id}`);
        if (btnView) {
          btnView.onclick = () => onViewClaim(loc);
        }
      });

      layer.addLayer(marker);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
    }
  }, [locations, statusFilter]);

  // Handle Locate Me (Officer Live Position)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setOfficerGPS({ lat: latitude, lng: longitude });

        const map = mapInstanceRef.current;
        if (map) {
          if (officerMarkerRef.current) {
            officerMarkerRef.current.remove();
          }

          const officerIcon = L.divIcon({
            className: 'officer-pulse-pin',
            html: `
              <div style="position: relative; width: 36px; height: 36px;">
                <div style="position: absolute; inset: 0; border-radius: 50%; background-color: #10b981; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; inset: 4px; border-radius: 50%; background-color: #059669; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">
                  🛡️
                </div>
              </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          });

          const m = L.marker([latitude, longitude], { icon: officerIcon }).addTo(map);
          m.bindPopup(`<b>You are here (Officer GPS)</b><br/>Accuracy: &plusmn;${Math.round(accuracy)}m`).openPopup();
          officerMarkerRef.current = m;

          map.setView([latitude, longitude], 15);
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert(`Location Error: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Map Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Assigned Applicant Sites & Field Locations Map</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic view of assigned relief applicants, visit locations and spatial density
          </p>
        </div>

        {/* Filter + Locate Button */}
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses ({locations.length})</option>
            <option value="PENDING">Pending Visits</option>
            <option value="SCHEDULED">Visit Scheduled</option>
            <option value="COMPLETED">Visits Completed</option>
            <option value="VERIFIED">Verified Sites</option>
          </select>

          {/* Locate Me Button */}
          <button
            onClick={handleLocateMe}
            disabled={locating}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Locating...' : 'Locate Me'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Map Container */}
      <div className="relative h-[480px] w-full">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-xs flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RotateCw className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Loading map sites...</span>
            </div>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      {/* Map Legend Strip */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 font-medium">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span>Pending Inspection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
            <span>Visit Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600"></span>
            <span>Field Visit Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>Verified (Collector Review)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <span>Requires Correction</span>
          </div>
        </div>

        <div className="text-slate-500 font-mono text-[10px]">
          Click any pin on the map to view applicant details or trigger inspection.
        </div>
      </div>
    </div>
  );
};
