import React, { useState, useEffect } from 'react';
import { Building2, LogOut, CheckCircle2, XCircle, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getStationAdmins, approveStationAdmin } from '../services/api';
import type { AuthUser } from '../services/api';
import { OfficialIncidentsPage } from './OfficialIncidentsPage';
import { OfficialIncidentDetailsPage } from './OfficialIncidentDetailsPage';

interface CollectorDashboardProps {
  user?: any;
  onSignOut: () => void;
}

export const CollectorDashboard: React.FC<CollectorDashboardProps> = ({ user, onSignOut }) => {
  const district = user?.district || 'Idukki';
  const [activeTab, setActiveTab] = useState<'stations' | 'incidents'>('incidents');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const [stations, setStations] = useState<AuthUser[]>([]);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchDistrictStations = async () => {
    try {
      const res = await getStationAdmins(district);
      setStations(res.stationAdmins || []);
    } catch (err: any) {
      console.error('Failed to fetch stations for district:', err);
    }
  };

  useEffect(() => {
    fetchDistrictStations();
  }, [district]);

  const handleApproveReject = async (id: number, action: 'approve' | 'reject') => {
    try {
      setProcessingId(id);
      setActionMsg(null);
      const res = await approveStationAdmin(id, action);
      setActionMsg({ type: 'success', text: res.message });
      fetchDistrictStations();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to process approval.' });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingStations = stations.filter(s => s.status === 'pending');

  return (
    <div className="min-h-[85vh] bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 animate-fadeIn font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-amber-400 flex-shrink-0">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-wider mb-1">
                District Collector Command
              </div>
              <h1 className="text-2xl font-black text-white">
                {district} District Collector Dashboard
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Collector: <strong className="text-emerald-300">{user?.name || 'District Collector'}</strong> ({district} District) &bull; Manages District & Approves Stations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSignOut}
              className="px-5 py-2.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <button
            onClick={() => { setActiveTab('incidents'); setSelectedIncidentId(null); }}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'incidents'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Incident Control & Dispatch</span>
          </button>

          <button
            onClick={() => setActiveTab('stations')}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 ${
              activeTab === 'stations'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Station Approvals ({pendingStations.length})</span>
          </button>
        </div>

        {/* Tab 1: Incidents Control */}
        {activeTab === 'incidents' && (
          selectedIncidentId ? (
            <OfficialIncidentDetailsPage
              incidentId={selectedIncidentId}
              onBack={() => setSelectedIncidentId(null)}
            />
          ) : (
            <OfficialIncidentsPage
              onViewIncident={(id) => setSelectedIncidentId(id)}
            />
          )
        )}

        {/* Tab 2: Station Approvals */}
        {activeTab === 'stations' && (
          <div className="space-y-6">
            {/* Action feedback */}
            {actionMsg && (
              <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
                actionMsg.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' : 'bg-red-950/80 border-red-800 text-red-300'
              }`}>
                {actionMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" /> : <XCircle className="w-5 h-5 flex-shrink-0 text-red-400" />}
                <span>{actionMsg.text}</span>
              </div>
            )}

            {/* PENDING STATION APPROVALS */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span>Station Approval Requests ({pendingStations.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Review and approve Station sign-ups in {district} District before granting access.
                  </p>
                </div>
              </div>

              {pendingStations.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-700/50 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-300">All Station Applications Cleared</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingStations.map(station => (
                    <div key={station.id} className="p-4 bg-slate-900 border border-slate-700 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-base">{station.name}</span>
                        </div>
                        <div className="text-xs text-slate-300 font-medium">
                          <strong>Station / Panchayat:</strong> {station.panchayat || 'District Station'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveReject(station.id, 'approve')}
                          disabled={processingId === station.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black"
                        >
                          Approve Station
                        </button>
                        <button
                          onClick={() => handleApproveReject(station.id, 'reject')}
                          disabled={processingId === station.id}
                          className="px-4 py-2 bg-red-900/80 hover:bg-red-800 text-red-200 rounded-xl text-xs font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
