import React, { useEffect, useState } from 'react';
import { FileText, MapPin, ArrowLeft, RefreshCw, Eye, ShieldAlert, AlertTriangle } from 'lucide-react';
import { fetchMyIncidentReports } from '../services/api';
import type { IncidentReport } from '../services/api';

interface MyReportsPageProps {
  onBackToDashboard: () => void;
  onViewDetails: (id: string) => void;
  onNewReport: () => void;
}

export const MyReportsPage: React.FC<MyReportsPageProps> = ({
  onBackToDashboard,
  onViewDetails,
  onNewReport
}) => {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const loadReports = async () => {
    setLoading(true);
    const data = await fetchMyIncidentReports();
    setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = reports.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'UNDER_REVIEW':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'VERIFIED':
        return 'bg-emerald-100 text-emerald-950 border-emerald-400 font-black';
      case 'RESPONSE_ASSIGNED':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'RESOLVED':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'CLOSED':
        return 'bg-slate-200 text-slate-800 border-slate-400';
      case 'REJECTED':
        return 'bg-red-100 text-red-900 border-red-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-600 text-white font-black';
      case 'HIGH': return 'bg-orange-500 text-white font-bold';
      case 'MODERATE': return 'bg-yellow-500 text-slate-900 font-bold';
      default: return 'bg-emerald-600 text-white font-bold';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-bold mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <FileText className="w-8 h-8 text-emerald-400" />
            <span>My Reported Incidents</span>
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            Track the status progression, official verification, and response assignment of your submitted emergency reports.
          </p>
        </div>

        <button
          onClick={onNewReport}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 text-xs sm:text-sm shrink-0 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>🚨 Report New Incident</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={loadReports}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table / Cards List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="font-bold text-sm">Loading your reported incidents...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 space-y-4 border border-slate-200">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-black text-slate-800">No Incident Reports Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't submitted any incident reports matching this status filter yet.
          </p>
          <button
            onClick={onNewReport}
            className="bg-[#043e2e] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-[#065f46] transition-all"
          >
            Submit an Incident Report
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-white uppercase text-[11px] font-black tracking-wider">
                <tr>
                  <th className="py-4 px-4">Incident ID</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Severity</th>
                  <th className="py-4 px-4">Location</th>
                  <th className="py-4 px-4">Submitted Date</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-4 px-4 font-mono font-black text-emerald-950">
                      {report.incidentCode}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {report.incidentTypeName}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${getSeverityBadge(report.severity)}`}>
                        {report.severity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-700 max-w-xs truncate">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        {report.locationAddress || `${report.latitude.toFixed(3)}°, ${report.longitude.toFixed(3)}°`}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                      {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(report.status)}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => onViewDetails(report.incidentCode)}
                        className="inline-flex items-center gap-1 bg-[#043e2e] hover:bg-[#065f46] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
