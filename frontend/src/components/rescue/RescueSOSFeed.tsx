import React, { useState, useEffect } from 'react';
import {
  Radio,
  MapPin,
  Clock,
  Users,
  Phone,
  CheckCircle2,
  Navigation,
  Activity,
  RefreshCw,
  X
} from 'lucide-react';
import {
  fetchRescueFeedSOS,
  acceptSOS,
  updateSOSStatus,
  type SOSRequest,
  type SOSStatus
} from '../../services/sosService';

interface RescueSOSFeedProps {
  district?: string;
  onNavigateToMap?: (lat: number, lng: number, label: string) => void;
  onSOSAccepted?: (sos: SOSRequest) => void;
}

export const RescueSOSFeed: React.FC<RescueSOSFeedProps> = ({
  district = 'Kottayam',
  onNavigateToMap,
  onSOSAccepted
}) => {
  const [sosList, setSosList] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingSOS, setResolvingSOS] = useState<SOSRequest | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS'>('ALL');

  const loadFeed = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const feed = await fetchRescueFeedSOS(district);
      setSosList(feed || []);
    } catch (err) {
      console.warn('Error loading rescue feed SOS:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(true);
    const interval = setInterval(() => {
      loadFeed(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [district]);

  // Handle Accept SOS (Acknowledged -> Team Assigned)
  const handleAcceptSOS = async (sos: SOSRequest) => {
    setActionInProgress(sos.id);
    try {
      const updated = await acceptSOS(sos.id);
      setSosList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (onSOSAccepted) onSOSAccepted(updated);
      alert(`✅ SOS Request ${sos.sos_code} accepted! Team assigned to dispatch.`);
    } catch (err: any) {
      alert(err.message || 'Failed to accept SOS');
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Status Update (e.g. Rescue In Progress, Resolved)
  const handleUpdateStatus = async (sos: SOSRequest, newStatus: SOSStatus, notes?: string) => {
    setActionInProgress(sos.id);
    try {
      const updated = await updateSOSStatus(sos.id, newStatus, notes);
      setSosList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setResolvingSOS(null);
      setResolutionNotes('');
      alert(`✅ SOS status updated to ${newStatus}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update SOS status');
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingSOS = sosList.filter((s) => s.status === 'Pending' || s.status === 'Acknowledged');

  const filteredList = sosList.filter((s) => {
    if (filter === 'PENDING') return s.status === 'Pending' || s.status === 'Acknowledged';
    if (filter === 'ASSIGNED') return s.status === 'Team Assigned';
    if (filter === 'IN_PROGRESS') return s.status === 'Rescue In Progress';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if any Pending SOS exists */}
      {pendingSOS.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-6 shadow-xl border border-red-400 animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                <Radio className="w-8 h-8 animate-ping" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white text-red-700 font-mono">
                  🚨 {pendingSOS.length} URGENT DISTRESS REQUEST{pendingSOS.length > 1 ? 'S' : ''}
                </span>
                <h3 className="text-xl font-black tracking-tight mt-1 text-white">
                  Active Emergency SOS in {district} District
                </h3>
                <p className="text-xs text-rose-100 font-medium mt-0.5">
                  Citizens require immediate rescue dispatch. Prioritize response based on proximity and vulnerability.
                </p>
              </div>
            </div>

            <button
              onClick={() => loadFeed(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/30 text-xs font-extrabold flex items-center gap-2 backdrop-blur-md transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary SOS Cards matching prompt specification */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-600 animate-pulse" />
            <h4 className="text-lg font-black text-slate-900 tracking-tight">
              SOS Emergency Response Feed ({district})
            </h4>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
            {(['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  filter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h5 className="text-sm font-bold text-slate-800">No Active SOS Requests</h5>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All distress calls in {district} have either been resolved or there are currently no active emergencies.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((sos) => {
              const isPending = sos.status === 'Pending' || sos.status === 'Acknowledged';
              const isAssigned = sos.status === 'Team Assigned';
              const isInProgress = sos.status === 'Rescue In Progress';

              const timeStr = new Date(sos.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={sos.id}
                  className={`rounded-3xl border p-5 shadow-sm transition-all space-y-4 ${
                    isPending
                      ? 'bg-red-50/70 border-red-300 ring-2 ring-red-500/20'
                      : isAssigned
                      ? 'bg-sky-50/70 border-sky-300'
                      : isInProgress
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Card Header matching prompt example: 🚨 NEW SOS REQUEST */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="text-xs font-black text-red-600 flex items-center gap-1">
                            🚨 NEW SOS REQUEST
                          </span>
                        )}
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700">
                          {sos.sos_code}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 mt-1">
                        Emergency: <span className="text-red-700">{sos.emergency_type}</span>
                      </h4>
                    </div>

                    <span
                      className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                        isPending
                          ? 'bg-red-600 text-white animate-pulse'
                          : isAssigned
                          ? 'bg-sky-600 text-white'
                          : isInProgress
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {sos.status}
                    </span>
                  </div>

                  {/* Information Rows */}
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                      <span>
                        <strong>Location:</strong> {sos.address || `${sos.taluk || ''}, ${sos.district}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        <strong>People Affected:</strong> {sos.affected_people}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        <strong>Time:</strong> {timeStr}
                      </span>
                    </div>

                    {sos.reporter_name && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>
                          <strong>Citizen:</strong> {sos.reporter_name} ({sos.reporter_phone || 'N/A'})
                        </span>
                      </div>
                    )}

                    {sos.description && (
                      <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200 mt-2 text-[11px] text-slate-800 italic">
                        "{sos.description}"
                      </div>
                    )}

                    {sos.assigned_team_name && (
                      <div className="p-2.5 rounded-xl bg-sky-100/70 border border-sky-200 text-sky-900 text-[11px] font-semibold mt-1">
                        🚑 Assigned Unit: {sos.assigned_team_name}
                      </div>
                    )}
                  </div>

                  {/* Actions matching prompt specification:
                      [View Location] [Accept SOS] [Contact Citizen] */}
                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                    {/* 1. View Location */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigateToMap) {
                          onNavigateToMap(sos.latitude, sos.longitude, sos.sos_code);
                        } else {
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${sos.latitude},${sos.longitude}`,
                            '_blank'
                          );
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>View Location</span>
                    </button>

                    {/* 2. Accept SOS (if Pending or Acknowledged) */}
                    {isPending && (
                      <button
                        type="button"
                        disabled={actionInProgress === sos.id}
                        onClick={() => handleAcceptSOS(sos)}
                        className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Accept SOS</span>
                      </button>
                    )}

                    {/* Operational Progression Buttons if Assigned */}
                    {isAssigned && (
                      <button
                        type="button"
                        disabled={actionInProgress === sos.id}
                        onClick={() => handleUpdateStatus(sos, 'Rescue In Progress')}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Start Rescue</span>
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => setResolvingSOS(sos)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    )}

                    {/* 3. Contact Citizen */}
                    {sos.reporter_phone && (
                      <a
                        href={`tel:${sos.reporter_phone}`}
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Contact Citizen</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolution Notes Modal */}
      {resolvingSOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">
                Resolve SOS Mission ({resolvingSOS.sos_code})
              </h4>
              <button onClick={() => setResolvingSOS(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Resolution & Rescue Notes</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. 4 citizens safely evacuated by boat to St. Dominic Camp. No casualties."
                className="w-full p-3 text-xs border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolvingSOS(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(resolvingSOS, 'Resolved', resolutionNotes)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md"
              >
                Complete & Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
