import React, { useState, useEffect } from 'react';
import {
  Radio,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Navigation,
  Search
} from 'lucide-react';
import {
  fetchCollectorSOS,
  assignRescueTeam,
  type SOSRequest,
  type CollectorSOSMetrics
} from '../../services/sosService';

interface CollectorSOSManagerProps {
  district?: string;
  onNavigateToMap?: (lat: number, lng: number, label: string) => void;
}

const EMERGENCY_TYPES = ['all', 'Flood', 'Landslide', 'Fire', 'Medical Emergency', 'Accident', 'Other'];
const STATUS_OPTIONS = ['all', 'Pending', 'Team Assigned', 'Rescue In Progress', 'Resolved', 'Cancelled'];

export const CollectorSOSManager: React.FC<CollectorSOSManagerProps> = ({
  district = 'Kottayam',
  onNavigateToMap
}) => {
  const [metrics, setMetrics] = useState<CollectorSOSMetrics>({
    totalActive: 0,
    pending: 0,
    teamAssigned: 0,
    inProgress: 0,
    resolved: 0,
    cancelled: 0,
    totalAffectedActive: 0
  });
  const [requests, setRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [emergencyType, setEmergencyType] = useState('all');
  const [taluk, setTaluk] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Assign Team Modal State
  const [assigningSOS, setAssigningSOS] = useState<SOSRequest | null>(null);
  const [assignedTeamName, setAssignedTeamName] = useState('');
  const [assignedTeamPhone, setAssignedTeamPhone] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchCollectorSOS(district, {
        emergencyType: emergencyType !== 'all' ? emergencyType : undefined,
        taluk: taluk !== 'all' ? taluk : undefined,
        status: status !== 'all' ? status : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });
      setMetrics(data.metrics);
      setRequests(data.requests || []);
    } catch (err) {
      console.warn('Error loading collector SOS data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [district, emergencyType, taluk, status, dateFrom, dateTo]);

  // Extract distinct taluks from loaded requests
  const distinctTaluks = Array.from(
    new Set(requests.map((r) => r.taluk).filter(Boolean))
  ) as string[];

  // Filter by search term
  const filteredRequests = requests.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.sos_code.toLowerCase().includes(term) ||
      r.emergency_type.toLowerCase().includes(term) ||
      (r.address && r.address.toLowerCase().includes(term)) ||
      (r.taluk && r.taluk.toLowerCase().includes(term)) ||
      (r.reporter_name && r.reporter_name.toLowerCase().includes(term)) ||
      (r.assigned_team_name && r.assigned_team_name.toLowerCase().includes(term))
    );
  });

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSOS || !assignedTeamName.trim()) return;
    setSubmittingAssign(true);
    try {
      await assignRescueTeam(assigningSOS.id, {
        teamName: assignedTeamName.trim(),
        teamPhone: assignedTeamPhone.trim() || undefined,
        remarks: assignRemarks.trim() || undefined
      });
      alert(`✅ Team ${assignedTeamName} successfully assigned to ${assigningSOS.sos_code}`);
      setAssigningSOS(null);
      setAssignedTeamName('');
      setAssignedTeamPhone('');
      setAssignRemarks('');
      loadData(false);
    } catch (err: any) {
      alert(err.message || 'Failed to assign rescue team');
    } finally {
      setSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-600 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-red-600">
              Emergency Operations Center
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            District SOS Response Monitor &bull; {district}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time emergency distress oversight, resource dispatching, and rescue operations status.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 shadow-xs flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* 4 Key Metric Cards (Requirement 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* 1. Total Active SOS */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Active SOS
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {metrics.totalActive}
          </div>
          <div className="text-[11px] text-red-600 font-medium mt-1">
            {metrics.totalAffectedActive} citizen(s) currently affected
          </div>
        </div>

        {/* 2. Pending SOS */}
        <div className="bg-white rounded-3xl p-5 border border-red-200 shadow-xs bg-red-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-700 uppercase tracking-wider">
              Pending SOS
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-600 font-mono">
            {metrics.pending}
          </div>
          <div className="text-[11px] text-red-700 font-medium mt-1">
            Awaiting rescue unit assignment
          </div>
        </div>

        {/* 3. Active Rescue Operations */}
        <div className="bg-white rounded-3xl p-5 border border-sky-200 shadow-xs bg-sky-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">
              Active Rescue Ops
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-900 font-mono">
            {metrics.teamAssigned + metrics.inProgress}
          </div>
          <div className="text-[11px] text-sky-700 font-medium mt-1">
            {metrics.inProgress} in field progress &bull; {metrics.teamAssigned} dispatched
          </div>
        </div>

        {/* 4. Resolved SOS */}
        <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-xs bg-emerald-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Resolved SOS
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-800 font-mono">
            {metrics.resolved}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Successfully rescued & safe
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Filters & Search</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search code, citizen, area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Emergency Type */}
          <div>
            <select
              value={emergencyType}
              onChange={(e) => setEmergencyType(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="all">All Emergency Types</option>
              {EMERGENCY_TYPES.filter((t) => t !== 'all').map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Taluk */}
          <div>
            <select
              value={taluk}
              onChange={(e) => setTaluk(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="all">All Taluks ({district})</option>
              {distinctTaluks.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.filter((s) => s !== 'all').map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              title="From date"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* SOS Requests Table / Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            Emergency Requests List ({filteredRequests.length})
          </h3>
          <span className="text-xs text-slate-500">
            Sorted by most recent distress dispatches
          </span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No SOS emergency requests found matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">SOS ID & Time</th>
                  <th className="py-3.5 px-4">Emergency Type</th>
                  <th className="py-3.5 px-4">Location / Taluk</th>
                  <th className="py-3.5 px-4">Affected</th>
                  <th className="py-3.5 px-4">Citizen</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Rescue Team</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredRequests.map((sos) => {
                  const isPending = sos.status === 'Pending' || sos.status === 'Acknowledged';
                  const isAssigned = sos.status === 'Team Assigned';
                  const isInProgress = sos.status === 'Rescue In Progress';

                  return (
                    <tr key={sos.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold">
                        <div className="text-slate-900 font-bold">{sos.sos_code}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {new Date(sos.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(sos.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-extrabold text-red-600">{sos.emergency_type}</span>
                        {sos.description && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]" title={sos.description}>
                            {sos.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sos.taluk || sos.district}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={sos.address || ''}>
                          {sos.address || `${sos.latitude.toFixed(4)}°, ${sos.longitude.toFixed(4)}°`}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                          {sos.affected_people}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{sos.reporter_name || 'Anonymous'}</div>
                        {sos.reporter_phone && (
                          <a href={`tel:${sos.reporter_phone}`} className="text-[11px] text-emerald-700 hover:underline">
                            {sos.reporter_phone}
                          </a>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
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
                      </td>

                      <td className="py-3 px-4">
                        {sos.assigned_team_name ? (
                          <div>
                            <div className="font-bold text-slate-900">{sos.assigned_team_name}</div>
                            {sos.assigned_team_phone && (
                              <div className="text-[11px] text-slate-500">{sos.assigned_team_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-bold italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Map Location */}
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
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                            title="View location on map"
                          >
                            <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          </button>

                          {/* Assign Rescue Unit */}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningSOS(sos);
                                setAssignedTeamName(`${district} Fire & Rescue Unit 1`);
                                setAssignedTeamPhone('0481-2562201');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-2xs"
                            >
                              Assign Team
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Team Modal */}
      {assigningSOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Dispatch Rescue Team ({assigningSOS.sos_code})
                </h4>
                <p className="text-xs text-slate-500">
                  {assigningSOS.emergency_type} at {assigningSOS.address || assigningSOS.district}
                </p>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Rescue Unit</label>
                <select
                  value={assignedTeamName}
                  onChange={(e) => setAssignedTeamName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                  required
                >
                  <option value={`${district} Fire & Safety Unit 1`}>{district} Fire & Safety Main Station</option>
                  <option value={`${district} 10th NDRF Rapid Response Team`}>{district} 10th NDRF Battalion Team</option>
                  <option value={`${district} Central Police Disaster Wing`}>{district} Central Police Response Wing</option>
                  <option value={`${district} KSDMA Rapid Cell`}>{district} KSDMA Emergency Cell</option>
                  <option value="Adoor Fire & Safety Station">Adoor Fire & Safety Station</option>
                  <option value="Munnar Fire & Safety Unit">Munnar Fire & Safety Unit</option>
                  <option value="Kalpetta Fire & Safety Station">Kalpetta Fire & Safety Station</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unit Contact Number</label>
                <input
                  type="text"
                  value={assignedTeamPhone}
                  onChange={(e) => setAssignedTeamPhone(e.target.value)}
                  placeholder="+91 94471 23456"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dispatch Instructions / Remarks</label>
                <textarea
                  rows={2}
                  value={assignRemarks}
                  onChange={(e) => setAssignRemarks(e.target.value)}
                  placeholder="e.g. Inflatable dinghy needed; 4 people on rooftop."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningSOS(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-md"
                >
                  {submittingAssign ? 'Dispatching...' : 'Dispatch Rescue Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
