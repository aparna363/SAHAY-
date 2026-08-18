import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, AlertTriangle, FileText, Image as ImageIcon, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import { fetchIncidentById } from '../services/api';
import type { IncidentReport } from '../services/api';
import { IncidentStatusTimeline } from '../components/IncidentStatusTimeline';

interface CitizenIncidentDetailsPageProps {
  incidentId: string;
  onBack: () => void;
}

export const CitizenIncidentDetailsPage: React.FC<CitizenIncidentDetailsPageProps> = ({
  incidentId,
  onBack
}) => {
  const [incident, setIncident] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchIncidentById(incidentId).then(data => {
      setIncident(data);
      setLoading(false);
    });
  }, [incidentId]);

  // Leaflet Map rendering
  useEffect(() => {
    if (!incident) return;
    const container = document.getElementById(`detail-map-${incident.id}`);
    if (!container) return;

    const map = L.map(container, {
      center: [incident.latitude, incident.longitude],
      zoom: 14
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: 'custom-pin-detail',
      html: `<div class="bg-red-600 text-white rounded-full p-2 shadow-xl border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });

    L.marker([incident.latitude, incident.longitude], { icon: markerIcon })
      .addTo(map)
      .bindPopup(`<b>${incident.incidentCode}</b><br/>${incident.incidentTypeName}`)
      .openPopup();

    return () => {
      map.remove();
    };
  }, [incident]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
        <p className="font-bold text-sm text-slate-600">Retrieving incident report details...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-xl font-black text-slate-900">Incident Report Not Found</h3>
        <p className="text-xs text-slate-500">The requested incident ID does not exist or you do not have permission to view it.</p>
        <button
          onClick={onBack}
          className="bg-[#043e2e] text-white px-5 py-2 rounded-xl text-xs font-bold"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-600 text-white font-black';
      case 'HIGH': return 'bg-orange-500 text-white font-bold';
      case 'MODERATE': return 'bg-yellow-500 text-slate-900 font-bold';
      default: return 'bg-emerald-600 text-white font-bold';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-bold mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Reports
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black font-mono text-white">
              {incident.incidentCode}
            </h1>
            <span className={`text-xs px-3 py-1 rounded-full ${getSeverityBadge(incident.severity)}`}>
              {incident.severity}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            Category: <span className="font-bold text-white">{incident.incidentTypeName}</span> | Reported on {new Date(incident.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      </div>

      {/* Incident Progression Timeline Component (Requirement Section 23) */}
      <IncidentStatusTimeline
        currentStatus={incident.status}
        statusHistory={incident.statusHistory}
      />

      {/* Main Incident Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Description & Evidence */}
        <div className="md:col-span-2 space-y-6">
          {/* Description Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Incident Description</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {incident.description}
            </p>
          </div>

          {/* Evidence Photos Gallery */}
          {incident.media && incident.media.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>Uploaded Photo Evidence ({incident.media.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {incident.media.map((item) => (
                  <a
                    key={item.id}
                    href={`http://localhost:5000${item.filePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl overflow-hidden border border-slate-200 hover:opacity-90 transition-all shadow-sm h-36 bg-slate-100 group"
                  >
                    <img
                      src={`http://localhost:5000${item.filePath}`}
                      alt={item.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Location Map */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>Incident Location</span>
            </h3>

            {/* Map Container */}
            <div
              id={`detail-map-${incident.id}`}
              className="w-full h-56 rounded-2xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100"
            />

            <div className="text-xs space-y-1.5 pt-2">
              <p className="font-bold text-slate-900">
                Latitude: <span className="font-mono text-emerald-900">{incident.latitude.toFixed(6)}°</span>
              </p>
              <p className="font-bold text-slate-900">
                Longitude: <span className="font-mono text-emerald-900">{incident.longitude.toFixed(6)}°</span>
              </p>
              {incident.locationAddress && !incident.locationAddress.includes('Browser Live GPS Position') && !incident.locationAddress.startsWith('Selected on Map') && (
                <p className="text-slate-600 mt-1 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  📍 {incident.locationAddress}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
