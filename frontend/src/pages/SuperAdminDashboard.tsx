import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Building2,
  ShieldCheck,
  AlertTriangle,
  CloudSun,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Activity,
  Layers,
  Search,
  Filter,
  Clock,
  MapPin,
  Sparkles,
  Shield,
  ArrowRight,
  Lock,
  Server,
  CheckCircle
} from 'lucide-react';
import {
  createCollector,
  getAllCollectors,
  getStationAdmins,
  getAdminOverview,
  getDistricts,
  verifyOfficer,
  getDistrictsStatus,
  replaceCollector,
  getAuditLogs
} from '../services/api';
import type { AuthUser, VerifiedOfficer, DistrictStatusItem, AuditLogItem } from '../services/api';
import { OfficialIncidentsPage } from './OfficialIncidentsPage';
import { OfficialIncidentDetailsPage } from './OfficialIncidentDetailsPage';
import { WeatherTelemetryDashboard } from '../components/WeatherTelemetryDashboard';
import logoSahay from '../assets/logo_sahay.png';

interface SuperAdminDashboardProps {
  user?: any;
  onSignOut: () => void;
}

const DEFAULT_DISTRICTS = [
  'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
  'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad',
  'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
];

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user: _user, onSignOut }) => {
  // Navigation & Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    'overview' | 'create_collector' | 'collectors_list' | 'all_stations' | 'incidents' | 'weather' | 'audit_logs'
  >('overview');

  // Incident Detail View State
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Form state to create a District Collector
  const [collectorName, setCollectorName] = useState('');
  const [collectorPhone, setCollectorPhone] = useState('');
  const [collectorEmail, setCollectorEmail] = useState('');
  const [collectorPassword, setCollectorPassword] = useState('Collector@123');
  const [collectorDistrict, setCollectorDistrict] = useState('Idukki');
  const [collectorDesignation] = useState('District Collector & Magistrate');
  const [collectorDeptId, setCollectorDeptId] = useState('');

  // Officer ID Verification State
  const [officerIdInput, setOfficerIdInput] = useState('');
  const [isVerifyingOfficer, setIsVerifyingOfficer] = useState(false);
  const [verifiedOfficer, setVerifiedOfficer] = useState<VerifiedOfficer | null>(null);
  const [officerVerificationMsg, setOfficerVerificationMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Districts Assignment Status State
  const [districtsStatus, setDistrictsStatus] = useState<DistrictStatusItem[]>([]);
  const [allDistrictsAssigned, setAllDistrictsAssigned] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Transfer / Replacement Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferDistrict, setTransferDistrict] = useState('');
  const [transferOfficerId, setTransferOfficerId] = useState('');
  const [transferPassword, setTransferPassword] = useState('Collector@2026');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [keralaDistricts, setKeralaDistricts] = useState<string[]>(DEFAULT_DISTRICTS);

  // Search & Filters State
  const [collectorSearch, setCollectorSearch] = useState('');
  const [collectorDistrictFilter, setCollectorDistrictFilter] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [stationDistrictFilter, setStationDistrictFilter] = useState('');
  const [stationStatusFilter, setStationStatusFilter] = useState('');

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

  useEffect(() => {
    getDistricts().then((data) => {
      if (data && data.length > 0) {
        setKeralaDistricts(data);
        if (!collectorDistrict) setCollectorDistrict(data[0]);
      }
    }).catch(() => {
      setKeralaDistricts(DEFAULT_DISTRICTS);
    });
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [colRes, staRes, ovRes, distStatusRes, logsRes] = await Promise.all([
        getAllCollectors().catch(() => ({ collectors: [] })),
        getStationAdmins('All').catch(() => ({ stationAdmins: [] })),
        getAdminOverview().catch(() => ({ overview: { totalCitizens: 0, totalCollectors: 0, pendingStations: 0, approvedStations: 0 } })),
        getDistrictsStatus().catch(() => ({ districts: [], totalDistricts: 14, assignedCount: 0, allAssigned: false })),
        getAuditLogs().catch(() => ({ logs: [] }))
      ]);
      setCollectors(colRes.collectors || []);
      setStations(staRes.stationAdmins || []);
      setOverview(ovRes.overview || { totalCitizens: 0, totalCollectors: 0, pendingStations: 0, approvedStations: 0 });
      setDistrictsStatus(distStatusRes.districts || []);
      setAllDistrictsAssigned(distStatusRes.allAssigned || false);
      setAuditLogs(logsRes.logs || []);
    } catch (err: any) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOfficer = async () => {
    if (!officerIdInput.trim()) {
      setOfficerVerificationMsg({ type: 'error', text: 'Please enter an Officer ID to verify.' });
      return;
    }

    try {
      setIsVerifyingOfficer(true);
      setOfficerVerificationMsg(null);
      setVerifiedOfficer(null);

      const res = await verifyOfficer(officerIdInput.trim());

      if (res.verified && res.officer) {
        setVerifiedOfficer(res.officer);
        setCollectorName(res.officer.fullName);
        setCollectorDistrict(res.officer.district);
        setCollectorEmail(res.officer.officialEmail);
        setCollectorDeptId(res.officer.officerId);

        if (!res.districtAvailable) {
          setOfficerVerificationMsg({
            type: 'warning',
            text: `⚠ Officer ${res.officer.fullName} verified for ${res.officer.district} District, but ${res.officer.district} ALREADY HAS a Collector account (${res.assignedCollector?.name}). Only 1 Collector account per district is allowed.`
          });
        } else {
          setOfficerVerificationMsg({
            type: 'success',
            text: `✓ Officer ID Verified: ${res.officer.fullName} (${res.officer.designation}) for ${res.officer.district} District. District is AVAILABLE.`
          });
        }
      } else {
        setOfficerVerificationMsg({ type: 'error', text: res.message || 'Officer ID could not be verified in official directory.' });
      }
    } catch (err: any) {
      setOfficerVerificationMsg({ type: 'error', text: err.message || 'Failed to verify Officer ID.' });
    } finally {
      setIsVerifyingOfficer(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferDistrict || !transferPassword) return;

    try {
      setIsTransferring(true);
      const res = await replaceCollector({
        district: transferDistrict,
        newOfficerId: transferOfficerId || undefined,
        newPassword: transferPassword,
        newPhone: transferPhone || undefined,
        newEmail: transferEmail || undefined
      });

      setMsg({ type: 'success', text: res.message });
      setTransferModalOpen(false);
      setTransferOfficerId('');
      setTransferPhone('');
      setTransferEmail('');
      loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to transfer Collector account.' });
    } finally {
      setIsTransferring(false);
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

      setMsg({ type: 'success', text: res.message || 'District Collector created successfully!' });
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

  // Filtered Collectors
  const filteredCollectors = collectors.filter(c => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(collectorSearch.toLowerCase()) ||
      (c.phone || '').includes(collectorSearch) ||
      (c.email || '').toLowerCase().includes(collectorSearch.toLowerCase()) ||
      (c.district || '').toLowerCase().includes(collectorSearch.toLowerCase()) ||
      (c.departmentId || '').toLowerCase().includes(collectorSearch.toLowerCase());
    const matchesDistrict = !collectorDistrictFilter || c.district === collectorDistrictFilter;
    return matchesSearch && matchesDistrict;
  });

  // Filtered Stations
  const filteredStations = stations.filter(s => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(stationSearch.toLowerCase()) ||
      (s.phone || '').includes(stationSearch) ||
      (s.panchayat || '').toLowerCase().includes(stationSearch.toLowerCase()) ||
      (s.district || '').toLowerCase().includes(stationSearch.toLowerCase()) ||
      (s.designation || '').toLowerCase().includes(stationSearch.toLowerCase());
    const matchesDistrict = !stationDistrictFilter || s.district === stationDistrictFilter;
    const matchesStatus = !stationStatusFilter || s.status === stationStatusFilter;
    return matchesSearch && matchesDistrict && matchesStatus;
  });

  // Sidebar Menu Config
  const menuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, badge: null },
    { id: 'create_collector', label: 'Add District Collector', icon: UserPlus, badge: 'Privileged' },
    { id: 'collectors_list', label: 'Collectors Directory', icon: Building2, badge: collectors.length ? `${collectors.length}/14` : null },
    { id: 'all_stations', label: 'Station & Panchayats', icon: Layers, badge: overview.pendingStations ? `${overview.pendingStations} Pending` : null },
    { id: 'incidents', label: 'Incident Oversight', icon: AlertTriangle, badge: 'Live' },
    { id: 'weather', label: 'Weather Telemetry', icon: CloudSun, badge: null },
    { id: 'audit_logs', label: 'Security & Audit Logs', icon: Shield, badge: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-900">
      
      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Desktop Left Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out z-30 shadow-xs ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Sidebar Collapse Toggle Header */}
          <div className="p-3 border-b border-slate-200/80 flex items-center justify-end">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/80 transition-colors"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
          {/* Sidebar Menu Items */}
          <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveMenu(item.id as any);
                    if (item.id === 'incidents') setSelectedIncidentId(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-emerald-600 text-white font-extrabold shadow-md shadow-emerald-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <IconComponent className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600'
                  }`} />

                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between overflow-hidden">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`ml-2 px-2 py-0.5 text-[9px] font-black uppercase rounded-full tracking-wider ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : item.badge.includes('Pending') || item.badge === 'Live'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Active Indicator Strip */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-400 rounded-r-full" />
                  )}
                </button>
              );
            })}
          </nav>

        </aside>

        {/* Mobile Overlay Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />

            {/* Content Drawer */}
            <div className="relative flex-1 max-w-xs w-full bg-white border-r border-slate-200 flex flex-col p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <img src={logoSahay} alt="SAHAY" className="w-8 h-8 object-contain" />
                  <div>
                    <div className="font-black text-sm text-slate-900">SAHAY Admin</div>
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">State Command</div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1.5 overflow-y-auto">
                {menuItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveMenu(item.id as any);
                        if (item.id === 'incidents') setSelectedIncidentId(null);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white font-extrabold shadow-md'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`px-2 py-0.5 text-[9px] rounded-full font-black ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-emerald-700'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-200 mt-auto">
                <button
                  onClick={onSignOut}
                  className="w-full py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Mobile Navigation Bar (Mobile Only) */}
          <div className="lg:hidden flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3 mb-2 shadow-md">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700"
            >
              {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>Admin Menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">State HQ</span>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700"
                title="Sync Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Feedback Toast / Alert Banner */}
          {msg && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-lg animate-fadeIn ${
              msg.type === 'success' ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300' : 'bg-red-950/90 border-red-800 text-red-300'
            }`}>
              <div className="flex items-center gap-3">
                {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                <span>{msg.text}</span>
              </div>
              <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 1: OVERVIEW DASHBOARD */}
          {/* ================================================================= */}
          {activeMenu === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Top Banner Card */}
              <div className="relative overflow-hidden bg-white text-slate-900 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      State Headquarters Command Center
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      Kerala Disaster Operations Overview
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      Monitor all 14 districts, manage District Collector appointments, oversee rescue stations, and track live emergency responses across Kerala.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveMenu('create_collector')}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center gap-2 hover:scale-[1.02]"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Appoint Collector</span>
                    </button>

                    <button
                      onClick={() => setActiveMenu('all_stations')}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-all flex items-center gap-2"
                    >
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Review Stations ({overview.pendingStations} Pending)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveMenu('collectors_list')}
                  className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-amber-400/50 rounded-3xl p-5 shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-amber-600 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">District Collectors</span>
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{collectors.length} <span className="text-base text-slate-400 font-bold">/ 14</span></div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-semibold">
                    <span>Appointed Officers</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-blue-600 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Registered Citizens</span>
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{overview.totalCitizens}</div>
                  <div className="text-xs text-slate-500 mt-1 font-semibold">Active Citizen Portal Users</div>
                </div>

                <div
                  onClick={() => setActiveMenu('all_stations')}
                  className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-orange-400/50 rounded-3xl p-5 shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-orange-600 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Pending Stations</span>
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Activity className="w-5 h-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{overview.pendingStations}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-semibold">
                    <span>Awaiting Collector Approval</span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange-600 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-600 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Approved Stations</span>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{overview.approvedStations}</div>
                  <div className="text-xs text-slate-500 mt-1 font-semibold">Operational Fire / NDRF / Police Units</div>
                </div>
              </div>

              {/* District Coverage Status Grid */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <span>Kerala District Collectorate Coverage (14 Districts)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visual overview of appointed IAS / State Collectors per district
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveMenu('collectors_list')}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>View All Directory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {keralaDistricts.map((d) => {
                    const appointedCollector = collectors.find(c => (c.district || '').toLowerCase() === d.toLowerCase());
                    return (
                      <div
                        key={d}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                          appointedCollector
                            ? 'bg-emerald-50/70 border-emerald-200 text-slate-900 hover:border-emerald-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-black text-slate-900">{d}</div>
                          <div className="text-[10px] mt-1 line-clamp-1 font-semibold text-slate-500">
                            {appointedCollector ? appointedCollector.name : 'Vacant Position'}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          {appointedCollector ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold uppercase">
                              APPOINTED
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setCollectorDistrict(d);
                                setActiveMenu('create_collector');
                              }}
                              className="text-[9px] font-extrabold text-emerald-700 hover:text-emerald-800 uppercase tracking-wider underline"
                            >
                              + APPOINT
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions & Recent Appointees Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent Collectors Table */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-amber-600" />
                      <span>Appointed Collectors</span>
                    </h3>
                    <button
                      onClick={() => setActiveMenu('collectors_list')}
                      className="text-xs text-emerald-600 hover:underline font-bold"
                    >
                      View All ({collectors.length})
                    </button>
                  </div>

                  {collectors.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">No collectors appointed yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {collectors.slice(0, 4).map(c => (
                        <div key={c.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-extrabold text-xs">
                              {c.district.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900">{c.name}</div>
                              <div className="text-[10px] text-emerald-700 font-semibold">{c.district} District Collector</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-mono text-slate-500">{c.phone}</div>
                            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold uppercase">
                              ACTIVE
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Activity & Shortcuts */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>Admin Quick Shortcuts</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => setActiveMenu('create_collector')}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 text-left transition-all group hover:border-emerald-300"
                      >
                        <UserPlus className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                        <div className="text-xs font-bold text-slate-900">Appoint Collector</div>
                        <div className="text-[10px] text-slate-500 mt-1">Assign District IAS Officer</div>
                      </button>

                      <button
                        onClick={() => setActiveMenu('all_stations')}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 text-left transition-all group hover:border-emerald-300"
                      >
                        <Layers className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                        <div className="text-xs font-bold text-slate-900">Station Directory</div>
                        <div className="text-[10px] text-slate-500 mt-1">Review NDRF & Station sign-ups</div>
                      </button>

                      <button
                        onClick={() => setActiveMenu('incidents')}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 text-left transition-all group hover:border-emerald-300"
                      >
                        <AlertTriangle className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                        <div className="text-xs font-bold text-slate-900">Live Incident Oversight</div>
                        <div className="text-[10px] text-slate-500 mt-1">Monitor state-wide reports</div>
                      </button>

                      <button
                        onClick={() => setActiveMenu('weather')}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 text-left transition-all group hover:border-emerald-300"
                      >
                        <CloudSun className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                        <div className="text-xs font-bold text-slate-900">Weather Telemetry</div>
                        <div className="text-[10px] text-slate-500 mt-1">Live IMD radar & alert feed</div>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <strong className="block text-slate-900 font-bold">State HQ Authority Active</strong>
                      <span>Changes made here update the platform registry in real time across Kerala.</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 2: ADD DISTRICT COLLECTOR FORM */}
          {/* ================================================================= */}
          {activeMenu === 'create_collector' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs max-w-4xl mx-auto animate-fadeIn">
              <div className="border-b border-slate-200 pb-5 flex items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-2 border border-emerald-300">
                    Privileged Command
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-emerald-600" />
                    <span>Appoint District Collector</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Appoint District Collectors to administer disaster management for specific Kerala districts and approve local emergency response stations.
                  </p>
                </div>

                <button
                  onClick={() => setActiveMenu('collectors_list')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-200"
                >
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>View All Collectors ({collectors.length})</span>
                </button>
              </div>

              {/* 14 Districts Assigned Warning Banner */}
              {allDistrictsAssigned && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <strong className="block text-slate-900 font-bold">All 14 Kerala districts already have Collector accounts.</strong>
                    <span>Only 1 Collector account per district is permitted. Use the Collectors Directory to manage existing accounts or transfer officers.</span>
                  </div>
                </div>
              )}

              {/* Officer ID Verification Section */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-slate-900">
                    Step 1: Verify Authorized Officer ID (Development Directory)
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Authorized Directory</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <ShieldCheck className="w-4 h-4 absolute left-3.5 top-3.5 text-emerald-600" />
                    <input
                      type="text"
                      value={officerIdInput}
                      onChange={(e) => setOfficerIdInput(e.target.value)}
                      placeholder="e.g. KL-DEMO-KTM-001 or KL-DEMO-IDK-001"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOfficer}
                    disabled={isVerifyingOfficer}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                  >
                    {isVerifyingOfficer ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Verify Officer ID</span>
                  </button>
                </div>

                {/* Quick Preset Buttons for Demo */}
                <div className="flex items-center gap-2 pt-1 overflow-x-auto text-[10px]">
                  <span className="text-slate-500 font-medium">Demo IDs:</span>
                  <button
                    type="button"
                    onClick={() => setOfficerIdInput('KL-DEMO-KTM-001')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-emerald-800 font-mono border border-slate-200"
                  >
                    KL-DEMO-KTM-001 (Kottayam)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfficerIdInput('KL-DEMO-IDK-001')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-emerald-800 font-mono border border-slate-200"
                  >
                    KL-DEMO-IDK-001 (Idukki)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfficerIdInput('KL-DEMO-WYD-001')}
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-emerald-800 font-mono border border-slate-200"
                  >
                    KL-DEMO-WYD-001 (Wayanad)
                  </button>
                </div>

                {/* Verification Feedback Banner */}
                {officerVerificationMsg && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                    officerVerificationMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : officerVerificationMsg.type === 'warning'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  }`}>
                    {officerVerificationMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    )}
                    <span>{officerVerificationMsg.text}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleCreateCollector} className="space-y-5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Collector Full Name * {verifiedOfficer && <span className="text-emerald-600 text-[10px]">(Verified)</span>}
                    </label>
                    <input
                      type="text"
                      required
                      value={collectorName}
                      onChange={(e) => setCollectorName(e.target.value)}
                      placeholder="e.g. Dr. V. Venu IAS"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Assigned Kerala District *
                    </label>
                    <select
                      value={collectorDistrict}
                      onChange={(e) => setCollectorDistrict(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      {districtsStatus.length > 0 ? (
                        districtsStatus.map(ds => (
                          <option key={ds.district} value={ds.district} disabled={ds.isAssigned}>
                            {ds.isAssigned ? `✓ ${ds.district} — Already Assigned (DISABLED)` : ds.district}
                          </option>
                        ))
                      ) : (
                        keralaDistricts.map(d => (
                          <option key={d} value={d}>{d} District</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Mobile Phone (Login Contact) *</label>
                    <input
                      type="tel"
                      required
                      value={collectorPhone}
                      onChange={(e) => setCollectorPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Official Govt Email</label>
                    <input
                      type="email"
                      value={collectorEmail}
                      onChange={(e) => setCollectorEmail(e.target.value)}
                      placeholder="collector.idukki@kerala.gov.in"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">Initial Password *</label>
                    <input
                      type="text"
                      required
                      value={collectorPassword}
                      onChange={(e) => setCollectorPassword(e.target.value)}
                      placeholder="Initial login password"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">IAS / Service Badge ID</label>
                    <input
                      type="text"
                      value={collectorDeptId}
                      onChange={(e) => setCollectorDeptId(e.target.value)}
                      placeholder="e.g. IAS-KLA-IDK-01"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                  <div className="text-[11px] text-slate-500">
                    * The collector will log in using their phone number/email and initial password.
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || allDistrictsAssigned}
                    className="py-3 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Collector...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Appoint District Collector</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 3: COLLECTORS DIRECTORY */}
          {/* ================================================================= */}
          {activeMenu === 'collectors_list' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs animate-fadeIn">
              
              {/* Header & Filter Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                    <span>District Collectors Directory ({collectors.length} / 14)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    State registry of appointed District Collectors managing Kerala's 14 administrative districts.
                  </p>
                </div>

                <button
                  onClick={() => setActiveMenu('create_collector')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 self-start md:self-auto"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Appoint New Collector</span>
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={collectorSearch}
                    onChange={(e) => setCollectorSearch(e.target.value)}
                    placeholder="Search by collector name, phone, email, district..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <select
                    value={collectorDistrictFilter}
                    onChange={(e) => setCollectorDistrictFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">All 14 Districts</option>
                    {keralaDistricts.map(d => (
                      <option key={d} value={d}>{d} District</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Render */}
              {filteredCollectors.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">No District Collectors Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    No collectors matched your search filter. Use the button above to appoint a new District Collector.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">District</th>
                        <th className="py-3.5 px-4">Collector Name</th>
                        <th className="py-3.5 px-4">Contact Phone</th>
                        <th className="py-3.5 px-4">Official Email</th>
                        <th className="py-3.5 px-4">Service Badge ID</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Account Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredCollectors.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-black text-slate-900 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold text-[10px]">
                              {c.district.substring(0, 2).toUpperCase()}
                            </span>
                            <span>{c.district}</span>
                          </td>
                          <td className="py-4 px-4 font-bold text-emerald-800">{c.name}</td>
                          <td className="py-4 px-4 font-mono text-slate-800">{c.phone}</td>
                          <td className="py-4 px-4 text-slate-600">{c.email || 'N/A'}</td>
                          <td className="py-4 px-4 font-mono text-slate-600">{c.departmentId || 'IAS-KLA'}</td>
                          <td className="py-4 px-4">
                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] uppercase">
                              ACTIVE
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => {
                                setTransferDistrict(c.district);
                                setTransferPhone(c.phone);
                                setTransferEmail(c.email || '');
                                setTransferModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-emerald-800 rounded-xl font-bold text-[11px] transition-colors border border-slate-200 inline-flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Transfer / Replace Officer</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 4: ALL STATIONS DIRECTORY */}
          {/* ================================================================= */}
          {activeMenu === 'all_stations' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs animate-fadeIn">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-6 h-6 text-emerald-600" />
                    <span>Station & Rescue Units Directory ({stations.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    State-wide view of NDRF, Fire Stations, Police Control, and Local Panchayat units.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    {overview.pendingStations} Pending Approval
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    {overview.approvedStations} Approved Units
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={stationSearch}
                    onChange={(e) => setStationSearch(e.target.value)}
                    placeholder="Search by station user, phone, panchayat..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <select
                    value={stationDistrictFilter}
                    onChange={(e) => setStationDistrictFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">All Districts</option>
                    {keralaDistricts.map(d => (
                      <option key={d} value={d}>{d} District</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={stationStatusFilter}
                    onChange={(e) => setStationStatusFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending Collector Approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Table Render */}
              {filteredStations.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                  <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">No Stations Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    No station accounts matched your search criteria.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Station User</th>
                        <th className="py-3.5 px-4">District</th>
                        <th className="py-3.5 px-4">Station / Panchayat</th>
                        <th className="py-3.5 px-4">Contact Phone</th>
                        <th className="py-3.5 px-4">Designation</th>
                        <th className="py-3.5 px-4 text-right">Approval Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredStations.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-900">{s.name}</td>
                          <td className="py-4 px-4 font-semibold text-slate-700">{s.district}</td>
                          <td className="py-4 px-4 text-slate-600">{s.panchayat || 'Main District Station'}</td>
                          <td className="py-4 px-4 font-mono text-slate-800">{s.phone}</td>
                          <td className="py-4 px-4 text-slate-600">{s.designation || 'Station Officer'}</td>
                          <td className="py-4 px-4 text-right">
                            {s.status === 'approved' ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] uppercase">
                                APPROVED BY COLLECTOR
                              </span>
                            ) : s.status === 'rejected' ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 font-extrabold text-[10px] uppercase">
                                REJECTED
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[10px] uppercase animate-pulse">
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

          {/* ================================================================= */}
          {/* VIEW 5: INCIDENT OVERSIGHT */}
          {/* ================================================================= */}
          {activeMenu === 'incidents' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-xs">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    <span>State-Wide Live Incident Oversight</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Real-time emergency incident feed from citizens across all 14 Kerala districts
                  </p>
                </div>
              </div>

              {selectedIncidentId ? (
                <OfficialIncidentDetailsPage
                  incidentId={selectedIncidentId}
                  onBack={() => setSelectedIncidentId(null)}
                />
              ) : (
                <OfficialIncidentsPage
                  onViewIncident={(id) => setSelectedIncidentId(id)}
                />
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 6: WEATHER TELEMETRY */}
          {/* ================================================================= */}
          {activeMenu === 'weather' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-xs">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <CloudSun className="w-6 h-6 text-blue-600" />
                    <span>State-Wide Weather & Telemetry Dashboard</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Integrated IMD meteorological feeds, rainfall alerts, and dam water level telemetry
                  </p>
                </div>
              </div>

              <WeatherTelemetryDashboard weatherData={null} loading={false} />
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 7: SECURITY & AUDIT LOGS */}
          {/* ================================================================= */}
          {activeMenu === 'audit_logs' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-emerald-600" />
                  <span>Platform Security & System Audit Logs</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Security overview, authority privilege tracking, and platform health status.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-emerald-600 mb-2">
                    <span className="text-xs font-bold text-slate-500">API Gateway Status</span>
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-black text-emerald-700">OPERATIONAL</div>
                  <p className="text-[11px] text-slate-500 mt-1">Express Socket.IO Backend active</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-amber-600 mb-2">
                    <span className="text-xs font-bold text-slate-500">Role Base Security</span>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-black text-amber-700 font-mono">RBAC ENABLED</div>
                  <p className="text-[11px] text-slate-500 mt-1">SuperAdmin & Collector isolated</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-blue-600 mb-2">
                    <span className="text-xs font-bold text-slate-500">State Database Sync</span>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-black text-blue-700">SYNCHRONIZED</div>
                  <p className="text-[11px] text-slate-500 mt-1">Statewide registry up to date</p>
                </div>
              </div>

              {/* Audit Logs Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Real-Time System Audit Trail ({auditLogs.length} Events)</span>
                  </h3>
                  <button
                    onClick={loadData}
                    className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh Logs</span>
                  </button>
                </div>

                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    No security audit events recorded yet. Actions such as Officer Verification, Collector Creation, and Rescue Team Approvals will log automatically here.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Performed By / Role</th>
                          <th className="py-3 px-4">Entity</th>
                          <th className="py-3 px-4">District</th>
                          <th className="py-3 px-4">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px]">
                        {auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-slate-500 font-sans">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="py-3 px-4 font-bold text-emerald-800 font-sans">{log.action}</td>
                            <td className="py-3 px-4 text-slate-800 font-sans">{log.user_name || 'System / Admin'} ({log.role})</td>
                            <td className="py-3 px-4 text-slate-600">{log.entity_type || 'N/A'}: {log.entity_id || 'N/A'}</td>
                            <td className="py-3 px-4 text-emerald-700 font-sans font-bold">{log.district || 'Statewide'}</td>
                            <td className="py-3 px-4 text-slate-500">{log.ip_address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">System Security Policy</h3>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside font-medium">
                  <li>Super Admin privileges are strictly restricted to State Disaster Management Authority staff.</li>
                  <li>District Collectors have exclusive rights to approve emergency response station accounts in their assigned district.</li>
                  <li>Station Officers must maintain valid service phone numbers for dispatch notifications.</li>
                </ul>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Transfer / Replace Officer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative text-slate-900">
            <button
              onClick={() => setTransferModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-2 border border-emerald-300">
                District Officer Transfer
              </div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <span>Transfer Collector Account — {transferDistrict}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Reappoint a new officer to the existing <strong>{transferDistrict} Collector account</strong>. The district account remains unchanged while credentials and access are securely updated.
              </p>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Officer ID (Optional Verification)</label>
                <input
                  type="text"
                  value={transferOfficerId}
                  onChange={(e) => setTransferOfficerId(e.target.value)}
                  placeholder="e.g. KL-DEMO-KTM-001"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Contact Mobile Phone</label>
                <input
                  type="tel"
                  value={transferPhone}
                  onChange={(e) => setTransferPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Official Govt Email</label>
                <input
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="collector.district@kerala.gov.in"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Initial Password *</label>
                <input
                  type="text"
                  required
                  value={transferPassword}
                  onChange={(e) => setTransferPassword(e.target.value)}
                  placeholder="Password for new officer"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isTransferring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Transfer & Issue Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
