import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Truck,
  RefreshCw,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';
import L from 'leaflet';
import { fetchIncidentById, updateIncidentStatusApi } from '../services/api';
import type { IncidentReport, IncidentStatus } from '../services/api';
import { IncidentStatusTimeline } from '../components/IncidentStatusTimeline';

interface OfficialIncidentDetailsPageProps {
  incidentId: string;
  onBack: () => void;
}

export const OfficialIncidentDetailsPage: React.FC<OfficialIncidentDetailsPageProps> = ({
  incidentId,
  onBack
}) => {
  const [incident, setIncident] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadIncident = async () => {
    setLoading(true);
    const data = await fetchIncidentById(incidentId);
    setIncident(data);
    setLoading(false);
  };

  useEffect(() => {
    loadIncident();
  }, [incidentId]);

  // Leaflet Map rendering
  useEffect(() => {
    if (!incident) return;
    const container = document.getElementById(`official-map-${incident.id}`);
    if (!container) return;

    const map = L.map(container, {
      center: [incident.latitude, incident.longitude],
      zoom: 14
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: 'custom-official-pin',
      html: `<div class="bg-red-600 text-white rounded-full p-2.5 shadow-2xl border-2 border-white ring-4 ring-red-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });

    L.marker([incident.latitude, incident.longitude], { icon: markerIcon })
      .addTo(map)
      .bindPopup(`<b>${incident.incidentCode}</b><br/>${incident.incidentTypeName}`)
      .openPopup();

    return () => {
      map.remove();
    };
  }, [incident]);

  const handleStatusChange = async (targetStatus: IncidentStatus) => {
    if (isUpdating || !incident) return;

    if (!remarks.trim() && (targetStatus === 'REJECTED' || targetStatus === 'RESPONSE_ASSIGNED')) {
      alert(`Please enter official remarks explaining why this incident is being ${targetStatus.toLowerCase().replace('_', ' ')}.`);
      return;
    }

    setIsUpdating(true);
    const result = await updateIncidentStatusApi(incident.incidentCode, targetStatus, remarks);
    setIsUpdating(false);

    if (result.success) {
      setRemarks('');
      loadIncident(); // Reload details and status history
    } else {
      alert(`Error updating status: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
        <p className="font-bold text-sm text-slate-600">Retrieving official incident record...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-xl font-black text-slate-900">Incident Record Not Found</h3>
        <button onClick={onBack} className="bg-[#043e2e] text-white px-5 py-2 rounded-xl text-xs font-bold">
          Back to Incidents List
        </button>
      </div>
    );
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-600 text-white font-black ring-4 ring-red-500/20';
      case 'HIGH': return 'bg-orange-500 text-white font-bold';
      case 'MODERATE': return 'bg-yellow-500 text-slate-900 font-bold';
      default: return 'bg-emerald-600 text-white font-bold';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Official Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-bold mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Incidents Control
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black font-mono text-white">
              {incident.incidentCode}
            </h1>
            <span className={`text-xs px-3 py-1 rounded-full ${getSeverityBadge(incident.severity)}`}>
              {incident.severity} SEVERITY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            Type: <span className="font-bold text-white">{incident.incidentTypeName}</span> | Current Status: <span className="font-bold text-amber-300 uppercase">{incident.status.replace('_', ' ')}</span>
          </p>
        </div>
      </div>

      {/* Incident Status Timeline */}
      <IncidentStatusTimeline currentStatus={incident.status} statusHistory={incident.statusHistory} />

      {/* Official Action Box (Requirement Section 26 & 27) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-black uppercase tracking-wide text-white">
            Official Action & Status Transition Control
          </h3>
        </div>

        {/* Official Remarks Textarea */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            Official Remarks / Operations Note:
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter official remark or action details (e.g. 'Incident verified. Rescue team dispatched to location.')..."
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Action Buttons Grid */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {incident.status === 'SUBMITTED' && (
            <button
              onClick={() => handleStatusChange('UNDER_REVIEW')}
              disabled={isUpdating}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Mark Under Review</span>
            </button>
          )}

          {['SUBMITTED', 'UNDER_REVIEW'].includes(incident.status) && (
            <>
              <button
                onClick={() => handleStatusChange('VERIFIED')}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify Incident</span>
              </button>

              <button
                onClick={() => handleStatusChange('REJECTED')}
                disabled={isUpdating}
                className="bg-red-700 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Incident</span>
              </button>
            </>
          )}

          {['VERIFIED', 'UNDER_REVIEW'].includes(incident.status) && (
            <button
              onClick={() => handleStatusChange('RESPONSE_ASSIGNED')}
              disabled={isUpdating}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Truck className="w-4 h-4" />
              <span>Assign Response Team</span>
            </button>
          )}

          {['RESPONSE_ASSIGNED', 'VERIFIED'].includes(incident.status) && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={isUpdating}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Mark In Progress</span>
            </button>
          )}

          {['IN_PROGRESS', 'RESPONSE_ASSIGNED'].includes(incident.status) && (
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={isUpdating}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Resolved</span>
            </button>
          )}

          {['RESOLVED', 'REJECTED'].includes(incident.status) && (
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={isUpdating}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Close Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Incident Information & Citizen Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details & Media */}
        <div className="md:col-span-2 space-y-6">
          {/* Description Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Incident Details & Description</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal bg-slate-50 p-4 rounded-2xl border border-slate-200 whitespace-pre-wrap">
              {incident.description}
            </p>
          </div>

          {/* Evidence Photos */}
          {incident.media && incident.media.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>Evidence Images ({incident.media.length})</span>
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

        {/* Sidebar: Citizen Information & Location Map */}
        <div className="space-y-6">
          {/* Citizen Details Box (Authorized Official Access) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <span>Reporting Citizen Info</span>
            </h3>

            {incident.citizen ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-800 font-bold">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{incident.citizen.name}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-800 font-mono font-bold">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{incident.citizen.phone}</span>
                </div>
                {incident.citizen.email && (
                  <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{incident.citizen.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>District: <strong className="text-slate-900">{incident.citizen.district}</strong></span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Citizen details restricted or unavailable.</p>
            )}
          </div>

          {/* Location Map */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>Location GIS Map</span>
            </h3>
            <div id={`official-map-${incident.id}`} className="w-full h-52 rounded-2xl border border-slate-300 overflow-hidden shadow-inner" />
            <div className="text-xs space-y-1 pt-1">
              <p className="font-bold text-slate-900">Lat: <span className="font-mono text-emerald-950">{incident.latitude.toFixed(6)}°</span></p>
              <p className="font-bold text-slate-900">Lng: <span className="font-mono text-emerald-950">{incident.longitude.toFixed(6)}°</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
