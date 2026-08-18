import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
  LifeBuoy,
  FileText,
  Calendar,
  X,
  Info,
  Megaphone
} from 'lucide-react';

interface Props {
  district: string;
}

export const CollectorWeatherAlerts: React.FC<Props> = ({ district }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyDays, setHistoryDays] = useState<30 | 90>(30);
  
  // Modals
  const [showAdvisoryModal, setShowAdvisoryModal] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);
  const [selectedAlertForRaw, setSelectedAlertForRaw] = useState<any>(null);
  
  // Advisory Form
  const [advisoryTitle, setAdvisoryTitle] = useState('');
  const [advisoryInstruction, setAdvisoryInstruction] = useState('');
  const [expiresHours, setExpiresHours] = useState(24);
  const [issuingAdvisory, setIssuingAdvisory] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchDistrictView = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weather-alerts/collector/district-view?district=${encodeURIComponent(district)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err: any) {
      console.error('Error fetching collector district view:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (days: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/weather-alerts/history?district=${encodeURIComponent(district)}&days=${days}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setHistory(json.history || []);
      }
    } catch (err) {
      console.error('Error fetching alert history:', err);
    }
  };

  useEffect(() => {
    fetchDistrictView();
    fetchHistory(historyDays);
  }, [district, historyDays]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/weather-alerts/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ district })
      });
      await fetchDistrictView();
      setFeedback({ type: 'success', msg: 'Weather alert data refreshed from official feeds!' });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: 'Failed to refresh weather alert data.' });
    } finally {
      setRefreshing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleIssueAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisoryTitle || !advisoryInstruction) return;

    setIssuingAdvisory(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/weather-alerts/collector/advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          district,
          title: advisoryTitle,
          instruction: advisoryInstruction,
          expiresHours
        })
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: 'success', msg: 'Local advisory broadcasted and pushed to citizens & rescue teams!' });
        setShowAdvisoryModal(false);
        setAdvisoryTitle('');
        setAdvisoryInstruction('');
        fetchDistrictView();
      } else {
        setFeedback({ type: 'error', msg: json.message || 'Failed to issue advisory' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message });
    } finally {
      setIssuingAdvisory(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const getSeverityBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'RED':
        return { bg: 'bg-red-500/20 text-red-400 border-red-500/40', label: 'RED ALERT (Severe / Extreme)', icon: ShieldAlert };
      case 'ORANGE':
        return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', label: 'ORANGE ALERT (Moderate / High)', icon: AlertTriangle };
      case 'YELLOW':
        return { bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', label: 'YELLOW ADVISORY (Minor)', icon: Info };
      case 'GREEN':
        return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', label: 'GREEN (No Active Alert)', icon: CheckCircle2 };
      default:
        return { bg: 'bg-slate-700/50 text-slate-300 border-slate-600', label: 'UNVERIFIED STATUS', icon: Clock };
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mr-3 text-cyan-500" />
        <span>Loading district official weather alert status...</span>
      </div>
    );
  }

  const badgeInfo = getSeverityBadge(data?.highestSeverity);
  const BadgeIcon = badgeInfo.icon;

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

      {/* Main Status Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/30">
                DISTRICT JURISDICTION
              </span>
              <span className="text-slate-400 text-xs flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {data?.lastUpdatedLabel || 'Recently verified'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {district} District Weather Alert System
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Official Meteorological Alert Monitoring & Local Advisory Console
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`px-4 py-2.5 rounded-xl border flex items-center space-x-2 font-bold text-sm ${badgeInfo.bg}`}>
              <BadgeIcon className="w-5 h-5" />
              <span>{badgeInfo.label}</span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 flex items-center space-x-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Feed'}</span>
            </button>

            <button
              onClick={() => setShowAdvisoryModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-lg shadow-amber-900/30 cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              <span>Issue Local Advisory</span>
            </button>
          </div>
        </div>

        {/* Resourcing Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>ACTIVE CITIZENS</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">{data?.activeCitizensCount || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Targeted by local advisories</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>ACTIVE RESCUE TEAMS</span>
              <LifeBuoy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">{data?.activeRescueTeamsCount || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Ready for early deployment</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>OFFICIAL ALERTS</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-white">{data?.activeAlerts?.length || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Government verified alerts</div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>LOCAL ADVISORIES</span>
              <Megaphone className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{data?.activeAdvisories?.length || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Active local instructions</div>
          </div>
        </div>
      </div>

      {/* Active Official Alerts & Local Advisories Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Official Meteorological Alerts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Active Official Meteorological Feeds
            </span>
            <span className="text-xs text-slate-400 font-normal">Source: Government Feed</span>
          </h3>

          {!data?.activeAlerts || data.activeAlerts.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-800 text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              No active official weather warning in force for {district}.
            </div>
          ) : (
            <div className="space-y-4">
              {data.activeAlerts.map((alert: any) => {
                const badge = getSeverityBadge(alert.mapped_severity);
                return (
                  <div key={alert.id || alert.alert_id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${badge.bg} mb-1.5`}>
                          {alert.mapped_severity} - {alert.hazard_type}
                        </span>
                        <h4 className="text-base font-semibold text-white">{alert.title}</h4>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAlertForRaw(alert);
                          setShowRawModal(true);
                        }}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Raw Data</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>
                    
                    {alert.safety_instructions && (
                      <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-lg text-xs text-amber-200">
                        <strong className="block mb-1 text-amber-400">Safety Instructions:</strong>
                        {alert.safety_instructions}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/60">
                      <span>Source: {alert.source_name} ({alert.source_type})</span>
                      <span>Valid until: {alert.expires_at ? new Date(alert.expires_at).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Local District Collector Advisories (Additive) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-400" />
              Collector Local Advisories (Additive)
            </span>
            <button
              onClick={() => setShowAdvisoryModal(true)}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              + New Advisory
            </button>
          </h3>

          {!data?.activeAdvisories || data.activeAdvisories.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-800 text-slate-400 text-sm">
              <Info className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
              No local collector advisories issued for {district}.
            </div>
          ) : (
            <div className="space-y-4">
              {data.activeAdvisories.map((advisory: any) => (
                <div key={advisory.id} className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded border border-amber-500/30">
                      LOCAL BROADCAST
                    </span>
                    <span className="text-xs text-slate-400">Issued by {advisory.issued_by_name || 'Collector'}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{advisory.title}</h4>
                  <p className="text-xs text-slate-300">{advisory.instruction}</p>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-amber-900/40 flex justify-between">
                    <span>Issued: {new Date(advisory.issued_at).toLocaleString()}</span>
                    <span>Expires: {advisory.expires_at ? new Date(advisory.expires_at).toLocaleString() : 'Open-ended'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 30-Day / 90-Day History Reporting Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              District Weather Alert History & Audit Reports
            </h3>
            <p className="text-xs text-slate-400">Historical meteorological logs for district reporting & review</p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setHistoryDays(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                historyDays === 30 ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Past 30 Days
            </button>
            <button
              onClick={() => setHistoryDays(90)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                historyDays === 90 ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Past 90 Days
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm bg-slate-800/30 rounded-xl">
            No historical alert records logged for the past {historyDays} days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">Fetched At</th>
                  <th className="p-3">Alert Title</th>
                  <th className="p-3">Raw Severity</th>
                  <th className="p-3">Mapped Severity</th>
                  <th className="p-3">Source Name</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3">{new Date(item.fetched_at).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-white">{item.title}</td>
                    <td className="p-3 text-slate-400">{item.raw_severity}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getSeverityBadge(item.mapped_severity).bg}`}>
                        {item.mapped_severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{item.source_name} ({item.source_type})</td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          setSelectedAlertForRaw(item);
                          setShowRawModal(true);
                        }}
                        className="text-cyan-400 hover:underline text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Payload Inspector Modal */}
      {showRawModal && selectedAlertForRaw && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Raw Source Payload Inspector (Read-Only)
              </h3>
              <button onClick={() => setShowRawModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div><strong className="text-slate-400">Alert Title:</strong> {selectedAlertForRaw.title}</div>
              <div><strong className="text-slate-400">Source:</strong> {selectedAlertForRaw.source_name} ({selectedAlertForRaw.source_type})</div>
              <div><strong className="text-slate-400">Raw Severity String:</strong> {selectedAlertForRaw.raw_severity}</div>
              <div><strong className="text-slate-400">Mapped Severity:</strong> {selectedAlertForRaw.mapped_severity}</div>
              <div><strong className="text-slate-400">Reference Link:</strong> <a href={selectedAlertForRaw.source_reference_url} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{selectedAlertForRaw.source_reference_url}</a></div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1">Raw API Payload:</div>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto">
                {JSON.stringify(selectedAlertForRaw.raw_payload || selectedAlertForRaw, null, 2)}
              </pre>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowRawModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Advisory Modal */}
      {showAdvisoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                Issue Local District Advisory ({district})
              </h3>
              <button onClick={() => setShowAdvisoryModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-amber-300/80 bg-amber-950/40 p-3 rounded-lg border border-amber-800/40">
              <strong>Notice:</strong> This local advisory is <strong>ADDITIVE</strong>. It will be pushed to Citizen and Rescue Team mobile apps in {district}, but does <strong>never override</strong> official government meteorological severity levels.
            </p>

            <form onSubmit={handleIssueAdvisory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Advisory Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavy Waterlogging at Highway Bypass - Take Alternate Route"
                  value={advisoryTitle}
                  onChange={(e) => setAdvisoryTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Instruction / Advisory Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide explicit local instructions for citizens and field rescue teams..."
                  value={advisoryInstruction}
                  onChange={(e) => setAdvisoryInstruction(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Valid Duration (Hours)</label>
                <select
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={6}>6 Hours</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={48}>48 Hours (2 Days)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvisoryModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuingAdvisory}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-semibold rounded-xl flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{issuingAdvisory ? 'Broadcasting...' : 'Broadcast Advisory'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
