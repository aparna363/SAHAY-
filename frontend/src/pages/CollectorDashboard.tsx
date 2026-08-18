import React, { useState, useEffect } from 'react';
import {
  Building2,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Home,
  Bell,
  Activity,
  MapPin,
  Users,
  FileText,
  BarChart3,
  History,
  User,
  Settings,
  Compass,
  Package,
  Download,
  Menu,
  X,
  LifeBuoy,
  ShieldAlert,
  Megaphone,
  Plus,
  Printer,
  FileSpreadsheet,
  PhoneCall,
  ChevronRight
} from 'lucide-react';
import {
  getStationAdmins,
  approveStationAdmin,
  getCollectorDashboardStats,
  getAuditLogs
} from '../services/api';
import type { AuthUser, AuditLogItem } from '../services/api';
import { OfficialIncidentsPage } from './OfficialIncidentsPage';
import { OfficialIncidentDetailsPage } from './OfficialIncidentDetailsPage';
import { CollectorWeatherAlerts } from '../components/CollectorWeatherAlerts';
import { ActiveOperationsListView } from '../components/ActiveOperationsListView';

interface CollectorDashboardProps {
  user?: any;
  onSignOut?: () => void;
}

export type SidebarTab =
  | 'dashboard'
  | 'alerts'
  | 'map'
  | 'incidents'
  | 'rescue_ops'
  | 'rescue_teams'
  | 'shelters'
  | 'evacuation'
  | 'resources'
  | 'notifications'
  | 'citizen_reports'
  | 'analytics'
  | 'generate_reports'
  | 'audit_logs'
  | 'profile'
  | 'settings';

interface SidebarMenuItem {
  id: SidebarTab;
  label: string;
  icon: any;
  badge: string | null;
  badgeColor?: string;
}

interface MenuCategory {
  title: string;
  items: SidebarMenuItem[];
}

export const CollectorDashboard: React.FC<CollectorDashboardProps> = ({ user, onSignOut }) => {
  const district = user?.district || 'Idukki';
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Core Data States
  const [stations, setStations] = useState<AuthUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);



  // Shelter Management State
  const [shelterList, setShelterList] = useState([
    { id: 1, name: `${district} Govt Higher Secondary School Camp`, location: `Town Center, ${district}`, totalCapacity: 500, occupied: 180, foodStockDays: 7, waterSupply: 'Optimal', medicalTeam: 'On-site' },
    { id: 2, name: `St. Joseph Community Relief Shelter`, location: `High Range Sector, ${district}`, totalCapacity: 350, occupied: 290, foodStockDays: 4, waterSupply: 'Good', medicalTeam: 'On-call' },
    { id: 3, name: `${district} District Indoor Stadium Camp`, location: `Civil Station Ward, ${district}`, totalCapacity: 1000, occupied: 410, foodStockDays: 10, waterSupply: 'Optimal', medicalTeam: 'On-site' },
  ]);
  const [newShelterName, setNewShelterName] = useState('');
  const [newShelterCapacity, setNewShelterCapacity] = useState('300');

  // Resource Inventory State
  const [resources] = useState([
    { id: 1, name: 'Inflatable Rescue Boats with OBM', total: 18, deployed: 12, available: 6, unit: 'Units' },
    { id: 2, name: 'Heavy Excavators (JCB / Earthmovers)', total: 24, deployed: 19, available: 5, unit: 'Vehicles' },
    { id: 3, name: 'High-Power Dewatering Pumps (50HP)', total: 35, deployed: 28, available: 7, unit: 'Pumps' },
    { id: 4, name: 'Emergency Ambulances (ALS/BLS)', total: 15, deployed: 11, available: 4, unit: 'Ambulances' },
    { id: 5, name: 'Satellite Phones & Emergency Comms', total: 12, deployed: 10, available: 2, unit: 'Handsets' },
  ]);

  // Notifications State
  const [notificationsList] = useState([
    { id: 1, title: 'State Emergency Directive Update', body: 'KSDMA issued High-Range evacuation advisories for hill slopes.', time: '10 mins ago', type: 'CRITICAL' },
    { id: 2, title: 'NDRF Battalion Deployment Confirmed', body: '2 teams dispatched to sector 4 high risk landslide zones.', time: '45 mins ago', type: 'INFO' },
    { id: 3, title: 'Station Approval Requested', body: 'New Panchayath Station submitted verification documentation.', time: '2 hours ago', type: 'WARNING' },
  ]);

  const [stats, setStats] = useState<{
    activeIncidents: number;
    pendingRescueTeams: number;
    activeRescueTeams: number;
    shelters: number;
    activeAlerts: number;
    sosReports: number;
  }>({
    activeIncidents: 0,
    pendingRescueTeams: 0,
    activeRescueTeams: 0,
    shelters: 3,
    activeAlerts: 0,
    sosReports: 0
  });

  const fetchDistrictStations = async () => {
    try {
      const res = await getStationAdmins(district);
      setStations(res.stationAdmins || []);
    } catch (err: any) {
      console.error('Failed to fetch stations for district:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getCollectorDashboardStats(district);
      if (res && res.stats) {
        setStats(prev => ({ ...res.stats, shelters: prev.shelters || 3 }));
      }
    } catch (err) {
      console.error('Failed to fetch collector stats:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await getAuditLogs();
      if (res && res.logs) setAuditLogs(res.logs);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  useEffect(() => {
    fetchDistrictStations();
    fetchStats();
    fetchLogs();
  }, [district]);

  const handleApproveReject = async (id: number, action: 'approve' | 'reject') => {
    try {
      setProcessingId(id);
      setActionMsg(null);
      const res = await approveStationAdmin(id, action);
      setActionMsg({ type: 'success', text: res.message });
      fetchDistrictStations();
      fetchStats();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to process approval.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddShelter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelterName.trim()) return;
    const cap = parseInt(newShelterCapacity, 10) || 300;
    const newShelter = {
      id: Date.now(),
      name: newShelterName,
      location: `${district} Sector`,
      totalCapacity: cap,
      occupied: 0,
      foodStockDays: 7,
      waterSupply: 'Optimal',
      medicalTeam: 'On-site'
    };
    setShelterList([...shelterList, newShelter]);
    setNewShelterName('');
    setStats(prev => ({ ...prev, shelters: prev.shelters + 1 }));
  };

  const pendingStations = stations.filter(s => s.status === 'pending');
  const approvedStations = stations.filter(s => s.status === 'approved');

  // Sidebar Menu Categories (Matching User Model)
  const menuCategories: MenuCategory[] = [
    {
      title: '',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null }
      ]
    },
    {
      title: 'EMERGENCY & DISPATCH',
      items: [
        { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: stats.activeAlerts ? `${stats.activeAlerts}` : null, badgeColor: 'bg-red-500 text-white' },
        { id: 'map', label: 'Live District Map', icon: MapPin, badge: 'GIS' },
        { id: 'incidents', label: 'Incident Management', icon: ShieldAlert, badge: stats.activeIncidents ? `${stats.activeIncidents}` : null, badgeColor: 'bg-amber-500 text-slate-950 font-black' }
      ]
    },
    {
      title: 'RESCUE & FIELD ASSETS',
      items: [
        { id: 'rescue_ops', label: 'Rescue Operations', icon: LifeBuoy, badge: null },
        { id: 'rescue_teams', label: 'Rescue Teams', icon: Users, badge: pendingStations.length ? `${pendingStations.length} Pending` : null, badgeColor: 'bg-orange-500 text-white' },
        { id: 'shelters', label: 'Evacuation Shelters', icon: Home, badge: `${shelterList.length}` },
        { id: 'evacuation', label: 'Evacuation Management', icon: Compass, badge: null },
        { id: 'resources', label: 'Resource Management', icon: Package, badge: null }
      ]
    },
    {
      title: 'COMMUNICATIONS',
      items: [
        { id: 'notifications', label: 'Official Notifications', icon: Megaphone, badge: null },
        { id: 'citizen_reports', label: 'Citizen Reports', icon: User, badge: stats.sosReports ? `${stats.sosReports} SOS` : null, badgeColor: 'bg-red-600 text-white' }
      ]
    },
    {
      title: 'REPORTS & INTELLIGENCE',
      items: [
        { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3, badge: null },
        { id: 'generate_reports', label: 'Generate Reports', icon: FileText, badge: 'PDF/CSV' },
        { id: 'audit_logs', label: 'Activity / Audit Logs', icon: History, badge: null }
      ]
    },
    {
      title: 'ACCOUNT & USER',
      items: [
        { id: 'profile', label: 'Collector Profile', icon: User, badge: user?.name || 'Collector' },
        { id: 'settings', label: 'Settings', icon: Settings, badge: null }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-emerald-600 selection:text-white">

      {/* MOBILE TOP BAR */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 text-slate-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md">
            
          </div>
          <div>
            <div className="text-sm font-black tracking-wide text-slate-900 leading-tight">SAHAY</div>
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">{district} Collector Portal</div>
          </div>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all border border-slate-200"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR NAVIGATION (Clean Modern White Theme) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 text-slate-800 shadow-xs ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-3">
            
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                <span>SAHAY</span>
              </h1>
              <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">
                Collector Portal
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Scrollable Nav List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {menuCategories.map((cat, idx) => (
            <div key={idx} className="space-y-1">
              {cat.title && (
                <div className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  {cat.title}
                </div>
              )}
              {cat.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSelectedIncidentId(null);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all group ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md border border-emerald-500'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-emerald-700'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-black rounded-full shadow-xs ${
                          item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-emerald-800 border border-slate-200')
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

       
        </div>
      </aside>

      {/* BACKDROP FOR MOBILE SIDEBAR */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* MAIN CONTENT WORKSPACE (Clean White/Slate Light Theme) */}
      <main className="flex-1 min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">

        {/* TOP STATUS BAR */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black uppercase tracking-wider mb-1">
                District Emergency Operations Center &bull; {district}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 capitalize tracking-tight">
                {activeTab.replace('_', ' ')} Overview
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Officer: <strong className="text-slate-900">{user?.name || 'District Collector'}</strong> ({district})</span>
            </div>
            
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: DASHBOARD */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-amber-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Incidents</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.activeIncidents}</div>
                <div className="text-[10px] text-slate-500 mt-1">Active in {district}</div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-emerald-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Teams</span>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.activeRescueTeams}</div>
                <div className="text-[10px] text-slate-500 mt-1">Approved Stations</div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-orange-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pending</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.pendingRescueTeams}</div>
                <div className="text-[10px] text-slate-500 mt-1">Sign-up Approvals</div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-blue-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Shelters</span>
                  <Home className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.shelters}</div>
                <div className="text-[10px] text-slate-500 mt-1">Relief Centers</div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-red-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">SOS Alerts</span>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono">{stats.sosReports}</div>
                <div className="text-[10px] text-slate-500 mt-1">Critical Calls</div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between text-teal-600 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Broadcasts</span>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.activeAlerts}</div>
                <div className="text-[10px] text-slate-500 mt-1">Active Alerts</div>
              </div>
            </div>

            {/* Emergency Action Banner */}
            <div className="bg-gradient-to-r from-[#043e2e] to-[#065f46] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-4 max-w-3xl">
                <div className="inline-flex items-center gap-2 bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>District Disaster Management Authority ({district})</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  District Command Operations Center & Ready Feeds
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-normal">
                  You are viewing the supreme district operational dashboard for <strong>{district} District</strong>. Review station sign-ups, issue emergency Red Alerts, manage evacuation relief camps, and assign dispatch units to incoming incidents.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('incidents')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>View District Incidents ({stats.activeIncidents})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>Broadcast Emergency Alert</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('rescue_teams')}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs transition-all flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Pending Station Approvals ({pendingStations.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Shortcuts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('incidents')}
                className="bg-white border border-slate-200/80 hover:border-emerald-500 p-6 rounded-3xl cursor-pointer transition-all space-y-3 group shadow-xs"
              >
                <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 flex items-center justify-between">
                  <span>Incident Control</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Review citizen submitted emergency reports, assign station dispatch units, and update official remarks.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('rescue_teams')}
                className="bg-white border border-slate-200/80 hover:border-emerald-500 p-6 rounded-3xl cursor-pointer transition-all space-y-3 group shadow-xs"
              >
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 flex items-center justify-between">
                  <span>Station Approvals</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Manage panchayat station applications in {district}. Currently {pendingStations.length} station applications awaiting verification.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('shelters')}
                className="bg-white border border-slate-200/80 hover:border-emerald-500 p-6 rounded-3xl cursor-pointer transition-all space-y-3 group shadow-xs"
              >
                <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Home className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 flex items-center justify-between">
                  <span>Relief Shelters</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Monitor {shelterList.length} active evacuation centers and relief camps in {district} district.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: ALERTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'alerts' && (
          <div className="animate-fadeIn">
            <CollectorWeatherAlerts district={district} />
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: LIVE DISTRICT MAP */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'map' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                  <span>{district} District GIS Telemetry & Spatial Live Map</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Real-time spatial visualization of incident call locations, rescue stations, and relief camp locations in {district}.
                </p>
              </div>
              <div className="px-3.5 py-1.5 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-black text-emerald-900">
                POSTGIS LIVE GIS ACTIVE
              </div>
            </div>

            <div className="h-[600px] w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center text-white">
              <div className="text-center space-y-3 p-8">
                <MapPin className="w-12 h-12 text-emerald-400 animate-bounce mx-auto" />
                <h3 className="text-lg font-black text-white">{district} GIS Spatial Command Centered</h3>
                <p className="text-xs text-slate-300 max-w-md">
                  Displaying PostGIS spatial markers for active incident coordinates, registered stations, and relief camps in {district} District.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('incidents')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    View Incidents Table ({stats.activeIncidents})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: INCIDENT MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'incidents' && (
          selectedIncidentId ? (
            <OfficialIncidentDetailsPage
              incidentId={selectedIncidentId}
              onBack={() => setSelectedIncidentId(null)}
            />
          ) : (
            <OfficialIncidentsPage
              district={district}
              lockDistrict={true}
              onViewIncident={(id) => setSelectedIncidentId(id)}
            />
          )
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 5: RESCUE OPERATIONS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'rescue_ops' && (
          selectedIncidentId ? (
            <OfficialIncidentDetailsPage
              incidentId={selectedIncidentId}
              onBack={() => setSelectedIncidentId(null)}
            />
          ) : (
            <ActiveOperationsListView
              userRole="collector"
              userDistrict={district}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
            />
          )
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 6: RESCUE TEAMS (STATION APPROVALS) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'rescue_teams' && (
          <div className="space-y-6 animate-fadeIn">
            {actionMsg && (
              <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
                actionMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                {actionMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> : <XCircle className="w-5 h-5 shrink-0 text-red-600" />}
                <span>{actionMsg.text}</span>
              </div>
            )}

            {/* PENDING APPROVALS */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>Pending Station Sign-up Applications ({pendingStations.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Review and verify new Panchayat Station accounts in {district} District before granting dispatch authority.
                </p>
              </div>

              {pendingStations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-800">All Station Applications Cleared</div>
                  <p className="text-xs text-slate-500 font-medium">No pending station sign-ups in {district}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingStations.map(station => (
                    <div key={station.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-900 text-base">{station.name}</div>
                        <div className="text-xs text-slate-600 font-medium">
                          <strong>Panchayath / Station Ward:</strong> {station.panchayat || 'District Sector'} &bull; Phone: {station.phone}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveReject(station.id, 'approve')}
                          disabled={processingId === station.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs"
                        >
                          Approve Station
                        </button>
                        <button
                          onClick={() => handleApproveReject(station.id, 'reject')}
                          disabled={processingId === station.id}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold border border-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* APPROVED STATIONS */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Active Approved Stations Roster ({approvedStations.length})</span>
              </h3>

              {approvedStations.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 font-medium">
                  No active approved stations found in {district}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {approvedStations.map(station => (
                    <div key={station.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{station.name}</div>
                        <div className="text-xs text-slate-500">Panchayath: {station.panchayat || 'District Station'} &bull; {station.phone}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                        ACTIVE RESPONDER
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 7: EVACUATION SHELTERS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'shelters' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Home className="w-6 h-6 text-blue-600" />
                <span>Relief Camps & Evacuation Shelters in {district}</span>
              </h2>
              <form onSubmit={handleAddShelter} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Shelter Name (e.g. Town Hall Relief Center)"
                  value={newShelterName}
                  onChange={(e) => setNewShelterName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <input
                  type="number"
                  placeholder="Total Bed Capacity"
                  value={newShelterCapacity}
                  onChange={(e) => setNewShelterCapacity(e.target.value)}
                  className="w-full sm:w-40 bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-extrabold shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Shelter</span>
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shelterList.map(sh => (
                <div key={sh.id} className="bg-white border border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-snug">{sh.name}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">{sh.location}</div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-[10px] font-black">
                      CAMP READY
                    </span>
                  </div>

                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Occupancy:</span>
                      <span>{sh.occupied} / {sh.totalCapacity} Beds</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((sh.occupied / sh.totalCapacity) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-semibold text-slate-700">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Rations Stock</span>
                      <strong className="text-emerald-700">{sh.foodStockDays} Days Available</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block text-[10px]">Medical Team</span>
                      <strong className="text-blue-700">{sh.medicalTeam}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 8: EVACUATION MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'evacuation' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Compass className="w-6 h-6 text-teal-600" />
                <span>Evacuation Zone Management & Route Control ({district})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Monitor high-risk flood and landslide zones, designate safe transport corridors, and enforce mandatory evacuation orders.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300 text-[10px] font-black">
                  HIGH RISK ZONE A
                </span>
                <h3 className="text-base font-extrabold text-slate-900">Riverbank & Low Lying Panchayats</h3>
                <p className="text-xs text-slate-600 font-medium">Mandatory evacuation active for residents within 200m of river basin.</p>
                <div className="text-xs font-bold text-emerald-700">Primary Route: Highway 18 via Bridge Sector 3</div>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 text-[10px] font-black">
                  SLOPE RISK ZONE B
                </span>
                <h3 className="text-base font-extrabold text-slate-900">High-Range Landslide Susceptible Slopes</h3>
                <p className="text-xs text-slate-600 font-medium">Night travel restriction enforced between 7 PM and 6 AM.</p>
                <div className="text-xs font-bold text-emerald-700">Primary Route: Bypass Ring Road Corridor</div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 9: RESOURCE MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'resources' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-emerald-600" />
                <span>Emergency Equipment & Resource Inventory ({district})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                District Disaster Management Authority (DDMA) emergency machinery, rescue gear, and inventory roster.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map(res => (
                <div key={res.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">{res.name}</h3>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-black text-emerald-700 font-mono">{res.available} Available</span>
                    <span className="text-xs text-slate-500 font-medium">Total: {res.total} {res.unit}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.round((res.available / res.total) * 100)}%` }} />
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Currently Deployed: {res.deployed} {res.unit}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 10: OFFICIAL NOTIFICATIONS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-amber-600" />
                <span>Official Emergency Broadcast Log ({district})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Statewide & District Collectorate directives issued to rescue units and citizens.
              </p>
            </div>

            <div className="space-y-3">
              {notificationsList.map(n => (
                <div key={n.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-4">
                  <Bell className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-900 text-sm">{n.title}</h3>
                      <span className="text-[10px] text-slate-500 font-mono">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 11: CITIZEN REPORTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'citizen_reports' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4 shadow-xs">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <User className="w-6 h-6 text-red-600" />
                  <span>Citizen Emergency SOS Reports & Calls ({district})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  List of direct SOS distress reports filed by citizens located in {district} district.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-6 h-6 text-red-600 animate-bounce" />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Citizen Helpline Operational</div>
                    <div className="text-xs text-slate-500">Connected to {district} District Collectorate EOC Response Desk.</div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('incidents')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  View All Incidents
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 12: ANALYTICS & REPORTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
                <span>District Disaster Analytics & Metrics ({district})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Real-time data telemetry on response efficiency, incident severity, and relief camp metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">Avg Response Time</div>
                <div className="text-3xl font-black text-emerald-700 font-mono">14.2 Mins</div>
                <div className="text-[11px] text-slate-500">Citizen Submission to Station Dispatch</div>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">Verification Accuracy</div>
                <div className="text-3xl font-black text-blue-700 font-mono">98.4%</div>
                <div className="text-[11px] text-slate-500">Verified by Station Incharges</div>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">Relief Camp Efficiency</div>
                <div className="text-3xl font-black text-teal-700 font-mono">880 Beds</div>
                <div className="text-[11px] text-slate-500">Occupied across {shelterList.length} registered centers</div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 13: GENERATE REPORTS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'generate_reports' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-teal-600" />
                <span>DDMA Official Report Generator Center ({district})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Compile and export official District Disaster Management Authority (DDMA) reports for state government submission.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Daily Situation Summary Report (SITREP)</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium">Includes active incidents, station deployments, casualties, and relief camp data in {district}.</p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => alert(`Generated Official PDF SITREP for ${district} District.`)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => alert(`Exported SITREP CSV spreadsheet for ${district} District.`)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>Relief Camp & Supply Distribution Audit</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium">Occupancy statistics, ration distribution, and medical team logs across camps in {district}.</p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => alert(`Generated Shelter Audit Report for ${district} District.`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Report</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 14: ACTIVITY / AUDIT LOGS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'audit_logs' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <History className="w-6 h-6 text-emerald-600" />
                <span>District Activity & System Audit Logs ({district})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Immutable audit trial of official verifications, station approvals, and dispatch actions.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs font-semibold">
                No recent system audit logs recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-emerald-800">{log.action}</span>
                      <div className="text-slate-600 mt-0.5 font-medium">
                        Performed by: {log.user_name || (log.user_id ? `User #${log.user_id}` : 'System')} &bull; Role: {log.role || 'Official'}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 15: COLLECTOR PROFILE */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl animate-fadeIn">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl flex items-center justify-center font-black text-2xl shadow-md">
                🛡️
              </div>
              <div>
                <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  OFFICIAL APPOINTED AUTHORITY
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{user?.name || 'District Collector'}</h2>
                <p className="text-xs text-slate-500 font-medium">District Magistrate & Head of DDMA, {district} District</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs font-semibold">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 block text-[10px] uppercase">Jurisdiction District</span>
                <strong className="text-emerald-800 text-sm font-black">{district} District</strong>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 block text-[10px] uppercase">Official Designation</span>
                <strong className="text-slate-900 text-sm font-black">{user?.designation || 'District Collector & Magistrate'}</strong>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 block text-[10px] uppercase">Official Phone</span>
                <strong className="text-slate-800 font-mono">{user?.phone || '+91 94470 00000'}</strong>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-slate-500 block text-[10px] uppercase">Official Email</span>
                <strong className="text-slate-800 font-mono">{user?.email || `collector.${district.toLowerCase()}@sahay.gov.in`}</strong>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 16: SETTINGS */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs max-w-3xl animate-fadeIn">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-slate-600" />
                <span>District Operations Center Settings ({district})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Configure emergency control room settings and broadcast preferences.
              </p>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Automated SOS Escalation</div>
                  <div className="text-slate-500 text-xs">Automatically alert state control room if incident remains unassigned &gt; 30 mins.</div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold">ENABLED</span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">KSDMA Weather Sync</div>
                  <div className="text-slate-500 text-xs">Sync live radar & weather alerts for {district} every 5 minutes.</div>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
