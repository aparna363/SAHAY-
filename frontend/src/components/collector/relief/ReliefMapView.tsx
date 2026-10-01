import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, RefreshCw } from 'lucide-react';
import { fetchCollectorReliefMap } from '../../../services/api';

interface ReliefMapViewProps {
  district: string;
  onSelectClaim: (claimId: string) => void;
}

export const ReliefMapView: React.FC<ReliefMapViewProps> = ({ district, onSelectClaim }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCollectorReliefMap(district);
      setClaims(res.claims || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load relief spatial records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, [district]);

  // District Default Center Coordinates
  const getDistrictCenter = (d: string): [number, number] => {
    const centers: Record<string, [number, number]> = {
      kottayam: [9.5916, 76.5222],
      idukki: [9.8497, 76.9806],
      wayanad: [11.6854, 76.1320],
      pathanamthitta: [9.2648, 76.7870],
      kozhikode: [11.2588, 75.7804],
      ernakulam: [9.9816, 76.2999],
      thiruvananthapuram: [8.5241, 76.9366]
    };
    return centers[d.toLowerCase()] || [9.5916, 76.5222];
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const center = getDistrictCenter(district);
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 11,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors &bull; SAHAY GIS Engine'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [district]);

  // Render Markers on Filter Change or Data Load
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const layer = markersLayerRef.current;
    layer.clearLayers();

    const filtered = statusFilter === 'ALL'
      ? claims
      : claims.filter(c => c.status === statusFilter);

    const bounds: [number, number][] = [];

    filtered.forEach((claim) => {
      const lat = parseFloat(claim.latitude);
      const lng = parseFloat(claim.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      // Color coding by status
      let color = '#3b82f6'; // blue default
      let labelText = 'NEW';

      if (['FIELD_VERIFIED', 'COLLECTOR_REVIEW'].includes(claim.status)) {
        color = '#8b5cf6'; // purple
        labelText = 'REV';
      } else if (['APPROVED', 'DISBURSED'].includes(claim.status)) {
        color = '#059669'; // emerald
        labelText = 'OK';
      } else if (claim.status === 'REVERIFICATION_REQUIRED') {
        color = '#f97316'; // orange
        labelText = 'RE';
      } else if (claim.status === 'STATE_REVIEW') {
        color = '#4f46e5'; // indigo
        labelText = 'STA';
      } else if (claim.status === 'REJECTED') {
        color = '#dc2626'; // red
        labelText = 'REJ';
      }

      const customIcon = L.divIcon({
        className: 'sahay-relief-pin',
        html: `
          <div style="
            background-color: ${color};
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 11px;
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            font-family: monospace;
          ">
            ${labelText}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layer);

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-xs space-y-2 font-sans';
      popupContent.innerHTML = `
        <div style="font-weight: 900; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${claim.claim_id}</div>
        <div style="color: #475569; font-size: 11px;"><strong>Applicant:</strong> ${claim.applicant_name}</div>
        <div style="color: #475569; font-size: 11px;"><strong>Category:</strong> ${claim.assistance_category}</div>
        <div style="color: #475569; font-size: 11px;"><strong>Location:</strong> ${claim.village || ''}, ${claim.taluk || ''}</div>
        <div style="color: #059669; font-weight: 800; font-size: 12px; margin-top: 4px;">
          ${claim.approved_amount > 0 ? `Sanctioned: ₹${parseFloat(claim.approved_amount).toLocaleString('en-IN')}` : `Requested: ₹${parseFloat(claim.requested_amount).toLocaleString('en-IN')}`}
        </div>
        <div style="margin-top: 4px;">
          <span style="background-color: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 9999px; font-weight: 900; font-size: 10px;">
            ${claim.status}
          </span>
        </div>
      `;

      const reviewBtn = document.createElement('button');
      reviewBtn.className = 'w-full mt-2 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1';
      reviewBtn.innerHTML = '<span>Review Claim Dossier</span>';
      reviewBtn.onclick = () => {
        onSelectClaim(claim.claim_id);
      };
      popupContent.appendChild(reviewBtn);

      marker.bindPopup(popupContent);
    });

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }, [claims, statusFilter]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HEADER & FILTER BAR */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1 border border-emerald-200">
            <MapPin className="w-3.5 h-3.5" />
            <span>GIS Relief Cluster Engine &bull; {district} District</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Spatial Relief Distribution Map
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Visualizing {claims.length} geocoded relief claims across Taluks and vulnerable hazard zones.
          </p>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All ({claims.length})
          </button>
          <button
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              statusFilter === 'SUBMITTED'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
            }`}
          >
            New ({claims.filter(c => c.status === 'SUBMITTED').length})
          </button>
          <button
            onClick={() => setStatusFilter('FIELD_VERIFIED')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              statusFilter === 'FIELD_VERIFIED'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
            }`}
          >
            Verified ({claims.filter(c => c.status === 'FIELD_VERIFIED' || c.status === 'COLLECTOR_REVIEW').length})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Sanctioned ({claims.filter(c => c.status === 'APPROVED' || c.status === 'DISBURSED').length})
          </button>
          <button
            onClick={loadMapData}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 disabled:opacity-50"
            title="Refresh Map Points"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      {/* MAP VIEW CONTAINER */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs relative">
        <div
          ref={mapContainerRef}
          className="w-full h-[620px] z-0"
        />

        {/* MAP LEGEND OVERLAY */}
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-200 shadow-lg text-xs font-semibold space-y-2 max-w-xs">
          <div className="font-extrabold text-slate-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Map Legend & Status Pins</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
              <span>New Application</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
              <span>Field Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
              <span>Sanctioned / Paid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
              <span>Re-verification</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-600 shrink-0" />
              <span>State Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
              <span>Rejected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
