import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Save,
  X,
  History,
  Sliders,
  Database
} from 'lucide-react';

export const AdminWeatherAlertsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'mappings' | 'health' | 'audit'>('overview');
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any>(null);
  
  // Edit mapping modal
  const [editingMapping, setEditingMapping] = useState<any>(null);
  const [editMappedLevel, setEditMappedLevel] = useState<'GREEN' | 'YELLOW' | 'ORANGE' | 'RED'>('RED');
  const [editDescription, setEditDescription] = useState('');
  const [savingMapping, setSavingMapping] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchAllAdminData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [sourcesRes, mappingsRes, healthRes, auditRes] = await Promise.all([
        fetch('/api/weather-alerts/admin/sources', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/weather-alerts/admin/mappings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/weather-alerts/admin/system-health', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/weather-alerts/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const sourcesJson = await sourcesRes.json();
      const mappingsJson = await mappingsRes.json();
      const healthJson = await healthRes.json();
      const auditJson = await auditRes.json();

      if (sourcesJson.success) setSources(sourcesJson.sources || []);
      if (mappingsJson.success) setMappings(mappingsJson.mappings || []);
      if (healthJson.success) setHealthData(healthJson);
      if (auditJson.success) setAuditLogs(auditJson);
    } catch (err: any) {
      console.error('Error fetching admin weather data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const handleUpdateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMapping) return;

    setSavingMapping(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/weather-alerts/admin/mappings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingMapping.id,
          mapped_level: editMappedLevel,
          description: editDescription,
          is_active: editingMapping.is_active
        })
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', msg: 'Severity mapping rule updated & change logged to audit trail.' });
        setEditingMapping(null);
        fetchAllAdminData();
      } else {
        setFeedback({ type: 'error', msg: json.message || 'Failed to update mapping' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setSavingMapping(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const getSeverityBadgeClass = (lvl: string) => {
    switch (lvl?.toUpperCase()) {
      case 'RED': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'ORANGE': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'YELLOW': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'GREEN': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
        <span>Loading Admin Weather Alert Management Console...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-red-950/60 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-cyan-400" />
              Statewide Weather Alert Management & Reliability Console
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure feeds, edit category mapping tables with audit trail, and monitor system health.
            </p>
          </div>

          <button
            onClick={fetchAllAdminData}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold border border-slate-700 flex items-center space-x-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Refresh System Health</span>
          </button>
        </div>

        {/* Console Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          {[
            { id: 'overview', label: 'Multi-District Overview', icon: Database },
            { id: 'sources', label: 'Data Source Manager', icon: Server },
            { id: 'mappings', label: 'Severity Mapping Table', icon: Sliders },
            { id: 'health', label: 'System Health & Error Logs', icon: Activity },
            { id: 'audit', label: 'Full System Audit Logs', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Multi-District Overview */}
      {activeTab === 'overview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white mb-2">Statewide District Status Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthData?.zones?.map((zone: any) => (
              <div key={zone.district} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-white">{zone.district}</h4>
                  <div className="text-xs text-slate-400 mt-1">
                    Status: <span className="font-semibold text-slate-200">{zone.fetch_status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Last Fetch: {new Date(zone.last_successful_fetch).toLocaleString()}
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${getSeverityBadgeClass(zone.highest_severity)}`}>
                  {zone.highest_severity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Data Source Manager */}
      {activeTab === 'sources' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center justify-between">
            <span>Configured Meteorological Alert Sources</span>
            <span className="text-xs text-slate-400 font-normal">Official vs Secondary Fallback Priority</span>
          </h3>

          <div className="space-y-3">
            {sources.map((src) => (
              <div key={src.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-bold text-white">{src.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      src.source_type === 'OFFICIAL' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {src.source_type}
                    </span>
                    <span className="text-xs text-slate-400">Priority #{src.priority}</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono">Endpoint: {src.api_endpoint}</div>
                  <div className="text-xs text-slate-400">Region: {src.region}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-semibold ${src.is_active ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
                    {src.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Severity Mapping Table */}
      {activeTab === 'mappings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Source Category Severity Mapping Table</h3>
              <p className="text-xs text-slate-400">Mapping raw weather provider strings to SAHAY's 4 standard alert levels</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">Source Name</th>
                  <th className="p-3">Raw Source Category</th>
                  <th className="p-3">Mapped SAHAY Level</th>
                  <th className="p-3">Description / Safety Impact</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400">{m.source_name}</td>
                    <td className="p-3 font-semibold text-white">{m.source_category}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${getSeverityBadgeClass(m.mapped_level)}`}>
                        {m.mapped_level}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 max-w-md">{m.description}</td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          setEditingMapping(m);
                          setEditMappedLevel(m.mapped_level);
                          setEditDescription(m.description || '');
                        }}
                        className="px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Mapping</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: System Health & Error Logs */}
      {activeTab === 'health' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">FAILED FETCHES (LAST 24H)</div>
              <div className="text-3xl font-bold text-red-400 mt-1">{healthData?.failedFetches24h || 0}</div>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">TOTAL MONITORED ZONES</div>
              <div className="text-3xl font-bold text-white mt-1">{healthData?.zones?.length || 0}</div>
            </div>
            <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">PRIMARY SOURCE HEALTH</div>
              <div className="text-3xl font-bold text-emerald-400 mt-1">OPERATIONAL</div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Recent Server-Side Weather Fetch Audit Logs</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">District</th>
                    <th className="p-3">Source Name</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Mapped Level</th>
                    <th className="p-3">Error Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {healthData?.recentLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-3">{new Date(log.fetched_at).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-white">{log.district}</td>
                      <td className="p-3 text-slate-400">{log.source_name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300' : log.status === 'FALLBACK' ? 'bg-amber-950 text-amber-300' : 'bg-red-950 text-red-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3">{log.mapped_level || 'N/A'}</td>
                      <td className="p-3 text-slate-400 max-w-xs truncate">{log.error_message || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Full Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white">Mapping Edit & Manual Advisory Audit Trail</h3>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-cyan-400">Severity Mapping Configuration Change Logs</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Changed At</th>
                    <th className="p-3">Changed By</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Old Mapped Level</th>
                    <th className="p-3">New Mapped Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditLogs?.mappingAudits?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="p-3">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-3 font-semibold text-white">{log.changed_by_name || 'Admin'}</td>
                      <td className="p-3 font-mono text-cyan-400">{log.action}</td>
                      <td className="p-3 text-red-400">{log.old_value?.mapped_level || '-'}</td>
                      <td className="p-3 text-emerald-400">{log.new_value?.mapped_level || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Severity Mapping Modal */}
      {editingMapping && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                Edit Severity Mapping Rule
              </h3>
              <button onClick={() => setEditingMapping(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-amber-300 bg-amber-950/40 p-3 rounded-lg border border-amber-800/40">
              <strong>Safety Critical Action:</strong> Every mapping edit is permanently recorded in the system audit log with your user ID and timestamp.
            </div>

            <form onSubmit={handleUpdateMapping} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Raw Provider Category</label>
                <input
                  type="text"
                  disabled
                  value={editingMapping.source_category}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Map to Standard SAHAY Level</label>
                <select
                  value={editMappedLevel}
                  onChange={(e) => setEditMappedLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                >
                  <option value="RED" className="text-red-400">RED (Severe / Extreme Threat)</option>
                  <option value="ORANGE" className="text-amber-400">ORANGE (Moderate / High Threat)</option>
                  <option value="YELLOW" className="text-yellow-400">YELLOW (Advisory / Minor Threat)</option>
                  <option value="GREEN" className="text-emerald-400">GREEN (No Warning / Normal)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Description / Guidance Note</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMapping(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMapping}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingMapping ? 'Saving...' : 'Save & Log Audit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
