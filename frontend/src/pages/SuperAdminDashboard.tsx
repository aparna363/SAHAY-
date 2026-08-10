import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Building2, LogOut, CheckCircle2, AlertCircle, Users, Activity, Layers, RefreshCw } from 'lucide-react';
import { createCollector, getAllCollectors, getStationAdmins, getAdminOverview, getDistricts } from '../services/api';
import type { AuthUser } from '../services/api';

interface SuperAdminDashboardProps {
  user?: any;
  onSignOut: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onSignOut }) => {
  const [activeTab, setActiveTab] = useState<'create_collector' | 'collectors_list' | 'all_stations'>('create_collector');

  // Form state to create a District Collector
  const [collectorName, setCollectorName] = useState('');
  const [collectorPhone, setCollectorPhone] = useState('');
  const [collectorEmail, setCollectorEmail] = useState('');
  const [collectorPassword, setCollectorPassword] = useState('Collector@123');
  const [collectorDistrict, setCollectorDistrict] = useState('Idukki');
  const [collectorDesignation] = useState('District Collector & Magistrate');
  const [collectorDeptId, setCollectorDeptId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [keralaDistricts, setKeralaDistricts] = useState<string[]>([]);

  useEffect(() => {
    getDistricts().then((data) => {
      setKeralaDistricts(data);
      if (data.length > 0 && !collectorDistrict) {
        setCollectorDistrict(data[0]);
      }
    });
  }, []);

  // Data lists
  const [collectors, setCollectors] = useState<AuthUser[]>([]);
  const [stations, setStations] = useState<AuthUser[]>([]);
  const [overview, setOverview] = useState<{ totalCitizens: number; totalCollectors: number; pendingStations: number; approvedStations: number }>({
    totalCitizens: 0,
    totalCollectors: 0,
    pendingStations: 0,
    approvedStations: 0
  });
  const [isLoading, setIsLoading] = useState(false);



  const loadData = async () => {
    try {
      setIsLoading(true);
      const [colRes, staRes, ovRes] = await Promise.all([
        getAllCollectors(),
        getStationAdmins('All'),
        getAdminOverview()
      ]);
      setCollectors(colRes.collectors || []);
      setStations(staRes.stationAdmins || []);
      setOverview(ovRes.overview || { totalCitizens: 0, totalCollectors: 0, pendingStations: 0, approvedStations: 0 });
    } catch (err: any) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!collectorName.trim() || !collectorPhone.trim() || !collectorPassword.trim() || !collectorDistrict.trim()) {
      setMsg({ type: 'error', text: 'Name, Phone, Password, and District are required.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createCollector({
        name: collectorName.trim(),
        phone: collectorPhone.trim(),
        email: collectorEmail.trim() || undefined,
        password: collectorPassword.trim(),
        district: collectorDistrict,
        designation: collectorDesignation.trim() || undefined,
        departmentId: collectorDeptId.trim() || undefined,
      });

      setMsg({ type: 'success', text: res.message });
      // Reset form
      setCollectorName('');
      setCollectorPhone('');
      setCollectorEmail('');
      setCollectorDeptId('');
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create collector.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-amber-950/80 border-2 border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner flex-shrink-0">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-1">
                State HQ Platform Admin
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Admin Platform Dashboard
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Admin: <strong className="text-amber-300">{user?.name || 'Seeded Developer Admin'}</strong> ({user?.email || 'sahayapp26@gmail.com'}) &bull; Scope: Entire Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>

            <button
              onClick={onSignOut}
              className="px-5 py-2.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Collectors</span>
              <Building2 className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-white">{collectors.length} / 14</div>
            <div className="text-[11px] text-slate-400 mt-1">Appointed Collectors</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Citizens</span>
              <Users className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-blue-300">{overview.totalCitizens}</div>
            <div className="text-[11px] text-slate-400 mt-1">Registered Citizens</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Pending Stations</span>
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{overview.pendingStations}</div>
            <div className="text-[11px] text-slate-400 mt-1">Awaiting Collector Approval</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Approved Stations</span>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{overview.approvedStations}</div>
            <div className="text-[11px] text-slate-400 mt-1">Operational Stations</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('create_collector')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'create_collector'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add District Collector</span>
          </button>

          <button
            onClick={() => setActiveTab('collectors_list')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'collectors_list'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>District Collectors ({collectors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all_stations')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all_stations'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Stations ({stations.length})</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {msg && (
          <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
            msg.type === 'success' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' : 'bg-red-950/80 border-red-800 text-red-300'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Tab 1: Add Collector Form */}
        {activeTab === 'create_collector' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>Admin Privileges: Add District Collector</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                As Admin, add District Collectors for any district. Collectors manage their district and approve station sign-ups.
              </p>
            </div>

            <form onSubmit={handleCreateCollector} className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Collector Full Name *</label>
                  <input
                    type="text"
                    required
                    value={collectorName}
                    onChange={(e) => setCollectorName(e.target.value)}
                    placeholder="e.g. Dr. V. Venu IAS"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Assigned District *</label>
                  <select
                    value={collectorDistrict}
                    onChange={(e) => setCollectorDistrict(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    {keralaDistricts.map(d => (
                      <option key={d} value={d}>{d} District</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={collectorPhone}
                    onChange={(e) => setCollectorPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Govt Official Email</label>
                  <input
                    type="email"
                    value={collectorEmail}
                    onChange={(e) => setCollectorEmail(e.target.value)}
                    placeholder="collector.idukki@kerala.gov.in"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={collectorPassword}
                    onChange={(e) => setCollectorPassword(e.target.value)}
                    placeholder="Initial Collector password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">IAS / Service ID</label>
                  <input
                    type="text"
                    value={collectorDeptId}
                    onChange={(e) => setCollectorDeptId(e.target.value)}
                    placeholder="e.g. IAS-KLA-IDK-01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="py-3 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <span>Adding District Collector...</span> : <span>Add District Collector</span>}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Collectors List */}
        {activeTab === 'collectors_list' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>Appointed District Collectors ({collectors.length})</span>
            </h2>

            {collectors.length === 0 ? (
              <p className="text-xs text-slate-400 py-6">No Collectors added yet. Use the tab above to add a Collector.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">District</th>
                      <th className="py-3 px-4">Collector Name</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Official Email</th>
                      <th className="py-3 px-4">Service ID</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {collectors.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/50">
                        <td className="py-3.5 px-4 font-black text-white">{c.district}</td>
                        <td className="py-3.5 px-4 font-bold text-amber-300">{c.name}</td>
                        <td className="py-3.5 px-4 font-mono">{c.phone}</td>
                        <td className="py-3.5 px-4 text-slate-400">{c.email || 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{c.departmentId || 'IAS-KLA'}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-extrabold text-[10px] uppercase">
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: All Stations List */}
        {activeTab === 'all_stations' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>All Registered Stations ({stations.length})</span>
            </h2>

            {stations.length === 0 ? (
              <p className="text-xs text-slate-400 py-6">No Stations registered across any district yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Station User</th>
                      <th className="py-3 px-4">District</th>
                      <th className="py-3 px-4">Station / Panchayat</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {stations.map(s => (
                      <tr key={s.id} className="hover:bg-slate-800/50">
                        <td className="py-3.5 px-4 font-bold text-white">{s.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">{s.district}</td>
                        <td className="py-3.5 px-4 text-slate-400">{s.panchayat || 'Main Station'}</td>
                        <td className="py-3.5 px-4 font-mono">{s.phone}</td>
                        <td className="py-3.5 px-4 text-slate-400">{s.designation || 'Station Officer'}</td>
                        <td className="py-3.5 px-4">
                          {s.status === 'approved' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-extrabold text-[10px] uppercase">
                              APPROVED BY COLLECTOR
                            </span>
                          ) : s.status === 'rejected' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 font-extrabold text-[10px] uppercase">
                              REJECTED
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 font-extrabold text-[10px] uppercase">
                              PENDING COLLECTOR APPROVAL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
