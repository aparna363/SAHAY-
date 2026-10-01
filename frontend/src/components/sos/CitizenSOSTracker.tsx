import React, { useState, useEffect } from 'react';
import {
  Radio,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import {
  fetchActiveCitizenSOS,
  cancelSOS,
  type SOSRequest,
  type SOSStatus,
  type SOSNearbyResources
} from '../../services/sosService';

interface CitizenSOSTrackerProps {
  initialSOS?: SOSRequest | null;
  onSOSCancelled?: () => void;
  onOpenSOSModal?: () => void;
}

const TIMELINE_STEPS: { status: SOSStatus; label: string; desc: string }[] = [
  { status: 'Pending', label: 'SOS Submitted', desc: 'Distress broadcast to Emergency Control' },
  { status: 'Acknowledged', label: 'Acknowledged', desc: 'Control room verified coordinates' },
  { status: 'Team Assigned', label: 'Rescue Team Assigned', desc: 'Field unit deployed' },
  { status: 'Rescue In Progress', label: 'Rescue In Progress', desc: 'Responders on-site' },
  { status: 'Resolved', label: 'Resolved', desc: 'Operation successfully completed' }
];

export const CitizenSOSTracker: React.FC<CitizenSOSTrackerProps> = ({
  initialSOS = null,
  onSOSCancelled,
  onOpenSOSModal: _onOpenSOSModal
}) => {
  const [activeSOS, setActiveSOS] = useState<SOSRequest | null>(initialSOS);
  const [nearbyResources, setNearbyResources] = useState<SOSNearbyResources | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Citizen is safe / false alarm');
  const [cancelling, setCancelling] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  // Poll for active SOS updates every 6 seconds if an active SOS exists
  const loadActiveSOS = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchActiveCitizenSOS();
      setActiveSOS(data.activeSOS);
      setNearbyResources(data.nearbyResources);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Error refreshing active SOS:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveSOS(true);
    const interval = setInterval(() => {
      loadActiveSOS(false);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Update when prop changes
  useEffect(() => {
    if (initialSOS) setActiveSOS(initialSOS);
  }, [initialSOS]);

  if (!activeSOS) {
    return null;
  }

  // Determine current timeline progress index
  const getStepIndex = (status: SOSStatus) => {
    switch (status) {
      case 'Pending':
        return 0;
      case 'Acknowledged':
        return 1;
      case 'Team Assigned':
        return 2;
      case 'Rescue In Progress':
        return 3;
      case 'Resolved':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(activeSOS.status);

  const handleCancelSOS = async () => {
    setCancelling(true);
    try {
      await cancelSOS(activeSOS.id, cancelReason);
      setActiveSOS(null);
      setCancelModalOpen(false);
      if (onSOSCancelled) onSOSCancelled();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel SOS');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-rose-700 to-slate-900 text-white shadow-2xl border border-red-500/40 p-6 my-6">
      {/* Background Pulse Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-red-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      {/* Header Banner */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-red-300 animate-pulse">
            <Radio className="w-6 h-6 text-red-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-red-500/80 text-white">
                LIVE SOS EMERGENCY
              </span>
              <span className="text-xs font-mono font-bold text-red-200">
                {activeSOS.sos_code}
              </span>
              {nearbyResources && nearbyResources.nearbyTeams.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {nearbyResources.nearbyTeams.length} Rescue Stations Alerted
                </span>
              )}
            </div>
            <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
              {activeSOS.emergency_type} Distress Request ({activeSOS.affected_people} affected)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadActiveSOS(true)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Refresh status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Updated {lastRefreshed}</span>
          </button>
          <button
            onClick={() => setCancelModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-xs font-bold text-rose-200 hover:text-white transition-all"
          >
            Cancel SOS
          </button>
        </div>
      </div>

      {/* Location & Time Info */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3 py-4 text-xs">
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
          <MapPin className="w-4 h-4 text-rose-300 shrink-0" />
          <span className="font-medium text-slate-200 truncate">
            {activeSOS.address || `${activeSOS.district}, Kerala`}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
          <Clock className="w-4 h-4 text-rose-300 shrink-0" />
          <span className="font-medium text-slate-200">
            Dispatched at {new Date(activeSOS.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="relative z-10 pt-2 pb-4">
        <div className="text-[11px] font-black uppercase tracking-wider text-rose-200 mb-3">
          Rescue Operation Progress
        </div>
        <div className="grid grid-cols-5 gap-1 relative">
          {TIMELINE_STEPS.map((s, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={s.status} className="flex flex-col items-center text-center">
                {/* Node */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    isCompleted
                      ? 'bg-emerald-400 text-slate-950 ring-4 ring-emerald-400/30 font-bold'
                      : 'bg-white/10 text-white/50 border border-white/20'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                {/* Text */}
                <span
                  className={`text-[11px] font-bold mt-2 leading-tight ${
                    isCurrent
                      ? 'text-white underline decoration-emerald-400 decoration-2 underline-offset-4'
                      : isCompleted
                      ? 'text-emerald-200'
                      : 'text-white/40'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assigned Team Card (if assigned) */}
      {activeSOS.assigned_team_name && (
        <div className="relative z-10 mt-2 p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                Assigned First Responders
              </div>
              <div className="text-sm font-extrabold text-white">
                {activeSOS.assigned_team_name}
              </div>
            </div>
          </div>

          {activeSOS.assigned_team_phone && (
            <a
              href={`tel:${activeSOS.assigned_team_phone}`}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Phone className="w-4 h-4" />
              <span>Call Rescue Team ({activeSOS.assigned_team_phone})</span>
            </a>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 text-slate-900 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-lg font-bold">Cancel Emergency SOS?</h4>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this emergency request? Responders and control room will be notified that you are safe.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="Citizen is safe / situation resolved">Situation resolved / I am safe now</option>
                <option value="Accidental SOS trigger">Accidentally triggered SOS</option>
                <option value="Helped by local volunteers/neighbors">Received help from local neighbors/volunteers</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
              >
                Keep Active
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelSOS}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
