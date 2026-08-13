import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  ShieldCheck,
  AlertTriangle,
  Home,
  Bell,
  Activity,
  MapPin,
  Users,
  FileText,
  History,
  User,
  Settings,
  Package,
  Menu,
  X,
  ShieldAlert,
  Send,
  Navigation as NavIcon,
  CloudRain,
  Hospital,
  CheckCircle2,
  Radio,
  FileCheck,
  Zap,
  Phone,
  AlertCircle,
  Lock,
  Plus,
  Trash2,
  UserPlus
} from 'lucide-react';
import {
  getRescueDashboardStats,
  updateRescueOperationStatus,
  submitEmergencySupportRequest,
  getTeamMembers,
  addTeamMember,
  updateTeamMemberAvailability,
  deleteTeamMember,
  getRescueProfile,
  getRescueAgencyConfig,
  normalizeAgencyCode,
  getAssignedIncidents,
  type RescueTeamMember,
  type RescueProfileData,
  type RescueAgencyConfig
} from '../services/api';
import { OfficialIncidentDetailsPage } from './OfficialIncidentDetailsPage';
import { KeralaAlertMap } from '../components/KeralaAlertMap';

interface RescueDashboardProps {
  user?: any;
  onSignOut?: () => void;
}

export type RescueSidebarTab =
  | 'dashboard'
  | 'assigned_incidents'
  | 'active_operations'
  | 'operation_history'
  | 'map'
  | 'navigation'
  | 'team_members'
  | 'team_status'
  | 'resources'
  | 'notifications'
  | 'collector_comm'
  | 'emergency_requests'
  | 'weather_alerts'
  | 'shelters'
  | 'hospitals'
  | 'operation_reports'
  | 'profile'
  | 'settings';

interface SidebarMenuItem {
  id: RescueSidebarTab;
  label: string;
  icon: any;
  badge: string | null;
  badgeColor?: string;
}

interface MenuCategory {
  title: string;
  items: SidebarMenuItem[];
}

export const RescueDashboard: React.FC<RescueDashboardProps> = ({ user }) => {
  const initialAgencyCode = normalizeAgencyCode(user?.agencyType || user?.designation || user?.unitType || 'FIRE_RESCUE');

  // Authenticated Unit Profile Context
  const [profile, setProfile] = useState<RescueProfileData>({
    userId: user?.id || 0,
    role: user?.role || 'rescue_team',
    agencyType: initialAgencyCode,
    agencyTypeName: initialAgencyCode === 'NDRF' ? 'National Disaster Response Force (NDRF)' : initialAgencyCode === 'POLICE' ? 'Kerala Police (Disaster Response Wing)' : 'Fire & Rescue Services',
    unitName: user?.name || user?.panchayat || `${initialAgencyCode} Unit Base`,
    officialUnitId: user?.departmentId || user?.department_id || `${initialAgencyCode}-001`,
    district: user?.district || 'Kottayam',
    email: user?.email || 'rescue@kerala.gov.in',
    phone: user?.phone || '+91 94471 23456',
    verificationStatus: user?.status || 'approved'
  });

  // Dynamic Agency Configuration (Designations, Specializations, Resources, Roles)
  const [agencyConfig, setAgencyConfig] = useState<RescueAgencyConfig>({
    agencyType: initialAgencyCode,
    agencyTypeName: initialAgencyCode === 'NDRF' ? 'National Disaster Response Force (NDRF)' : initialAgencyCode === 'POLICE' ? 'Kerala Police (Disaster Response Wing)' : 'Fire & Rescue Services',
    agencyTypes: [
      { code: 'FIRE_RESCUE', name: 'Fire & Rescue Services' },
      { code: 'NDRF', name: 'National Disaster Response Force (NDRF)' },
      { code: 'POLICE', name: 'Kerala Police (Disaster Response Wing)' },
      { code: 'KSDMA', name: 'KSDMA / SDMA Control Room' },
      { code: 'CIVIL_DEFENCE', name: 'Civil Defence Volunteers' },
      { code: 'OTHER', name: 'Other Authorized Rescue Agency' }
    ],
    designations: initialAgencyCode === 'NDRF' ? ['Commandant', 'Deputy Commandant', 'Assistant Commandant', 'Inspector', 'Sub-Inspector', 'Head Constable', 'Constable'] : ['Station Officer', 'Assistant Station Officer', 'Fire & Rescue Officer', 'Fire & Rescue Operator', 'Driver / Operator'],
    specializations: initialAgencyCode === 'NDRF' ? ['Search & Rescue', 'Flood Rescue', 'Mountain Rescue', 'Medical Assistance', 'Disaster Response', 'Communications', 'CBRN Response'] : ['Fire Fighting', 'Flood Rescue', 'Swift Water Rescue', 'Rope Rescue', 'Search & Rescue', 'First Aid'],
    resources: [],
    operationalRoles: ['Team Leader', 'Rescue Member', 'Driver', 'Medical Support', 'Communication Support', 'Incident Coordinator', 'Search Team', 'Evacuation Support']
  });

  const district = profile.district;
  const unitName = profile.unitName;
  const unitId = profile.officialUnitId;
  const agencyType = profile.agencyType;
  const isApproved = (profile.verificationStatus === 'approved' || user?.status === 'approved') && user?.status !== 'pending' && user?.status !== 'rejected';

  const [activeTab, setActiveTab] = useState<RescueSidebarTab>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Core Data States
  const [stats, setStats] = useState({
    newAssignments: 3,
    activeOperations: 2,
    completedOperations: 14,
    teamStatus: 'Available',
    availableMembers: 8,
    totalMembers: 10,
    availableResources: 24,
    totalResources: 30,
    criticalAlerts: 2,
    pendingRequests: 1
  });

  const [currentTeamStatus, setCurrentTeamStatus] = useState<'Available' | 'On Operation' | 'Standby' | 'Offline'>('Available');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Helper for District-Specific Incidents Fallback
  const getDistrictMockIncidents = (targetDistrict: string) => [
    {
      id: 'INC-2026-0012',
      code: 'INC-2026-0012',
      type: 'Flood Rescue & Evacuation',
      severity: 'CRITICAL',
      location: `${targetDistrict} Sector 4 Basin`,
      reportedTime: '15 mins ago',
      assignedTime: '10 mins ago',
      assignedBy: `District Collector (${targetDistrict})`,
      affectedPeople: 18,
      status: 'EN ROUTE',
      rescuedCount: 0,
      remainingCount: 18,
      lat: 9.5916,
      lng: 76.5222,
      description: `Flash flooding near river basin in ${targetDistrict}. 18 citizens stranded inside two-storey residential building.`
    },
    {
      id: 'INC-2026-0019',
      code: 'INC-2026-0019',
      type: 'Landslide Debris Clearance',
      severity: 'HIGH',
      location: `${targetDistrict} North Highway Pass`,
      reportedTime: '45 mins ago',
      assignedTime: '30 mins ago',
      assignedBy: `District Collector (${targetDistrict})`,
      affectedPeople: 5,
      status: 'ASSIGNED',
      rescuedCount: 0,
      remainingCount: 5,
      lat: 9.4833,
      lng: 76.8333,
      description: `Mudslide blocking primary emergency route in ${targetDistrict}. 2 vehicles trapped under light debris.`
    },
    {
      id: 'INC-2026-0008',
      code: 'INC-2026-0008',
      type: 'Medical Emergency Transport',
      severity: 'MEDIUM',
      location: `${targetDistrict} Central Sector`,
      reportedTime: '2 hours ago',
      assignedTime: '1 hour ago',
      assignedBy: `Disaster Management Cell (${targetDistrict})`,
      affectedPeople: 2,
      status: 'IN PROGRESS',
      rescuedCount: 1,
      remainingCount: 1,
      lat: 9.5542,
      lng: 76.7867,
      description: `Emergency patient evacuation from flooded clinic to ${targetDistrict} District Hospital.`
    }
  ];

  // Dynamic Incident State
  const [assignedIncidents, setAssignedIncidents] = useState<any[]>(() => getDistrictMockIncidents(profile.district));

  // Operations History State
  const [operationHistory] = useState([
    {
      id: 'INC-2026-0003',
      type: 'Submerged Vehicle Rescue',
      location: 'Pala River Bridge',
      date: '2026-08-11',
      responseTime: '8 mins',
      arrivalTime: '14:20 PM',
      completionTime: '15:45 PM',
      peopleRescued: 4,
      resourcesUsed: 'Inflatable Boat #2, Heavy Ropes, Winch Vehicle',
      finalStatus: 'COMPLETED'
    },
    {
      id: 'INC-2026-0001',
      type: 'Fallen Tree Road Clearing',
      location: 'Changanassery Bypass',
      date: '2026-08-10',
      responseTime: '12 mins',
      arrivalTime: '09:15 AM',
      completionTime: '10:30 AM',
      peopleRescued: 0,
      resourcesUsed: 'Power Chainsaws, Fire Tender',
      finalStatus: 'COMPLETED'
    }
  ]);

  // Team Members Roster State (Stored in Database)
  const [teamMembers, setTeamMembers] = useState<RescueTeamMember[]>([]);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmpId, setNewMemberEmpId] = useState('');
  const [newMemberDesignation, setNewMemberDesignation] = useState('');
  const [newMemberSpecialization, setNewMemberSpecialization] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Rescuer');
  const [newMemberContact, setNewMemberContact] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberExperience, setNewMemberExperience] = useState('2 Years');
  const [newMemberAvailability, setNewMemberAvailability] = useState('Available');
  const [newMemberAssignment, setNewMemberAssignment] = useState('Base Station');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Resources State (Loaded from agency config or local DB)
  const [resourceList] = useState([
    { id: 1, name: 'Inflatable Rescue Boats with Engine (OBM)', category: 'Marine', total: 6, available: 4, inUse: 2, damaged: 0, lowStock: false },
    { id: 2, name: 'Heavy Rescue Tenders & Hydraulic Cutters', category: 'Vehicles', total: 4, available: 3, inUse: 1, damaged: 0, lowStock: false },
    { id: 3, name: 'Life Jackets (SOLAS Certified)', category: 'Safety Equipment', total: 40, available: 28, inUse: 12, damaged: 0, lowStock: false },
    { id: 4, name: 'High-Capacity Dewatering Submersible Pumps', category: 'Drainage', total: 8, available: 5, inUse: 3, damaged: 0, lowStock: false },
    { id: 5, name: 'Emergency Satellite Phones (Inmarsat)', category: 'Comms', total: 3, available: 2, inUse: 1, damaged: 0, lowStock: true },
    { id: 6, name: 'Trauma & Advanced First Aid Kits', category: 'Medical', total: 15, available: 10, inUse: 5, damaged: 0, lowStock: false }
  ]);

  // Support Requests State
  const [supportRequests, setSupportRequests] = useState([
    { id: 'REQ-901', type: 'Additional Rescue Personnel', priority: 'URGENT', incidentId: 'INC-2026-0012', quantity: 4, reason: 'Strong currents in Manimala river requiring 4 additional swift-water divers.', status: 'APPROVED', time: '20 mins ago' },
    { id: 'REQ-904', type: 'ALS Ambulance Support', priority: 'HIGH', incidentId: 'INC-2026-0012', quantity: 1, reason: 'Pre-positioning ambulance at Mundakayam landing zone for injured survivors.', status: 'PENDING', time: '10 mins ago' }
  ]);

  // Form states for new support request
  const [reqType, setReqType] = useState('Additional Rescue Personnel');
  const [reqPriority, setReqPriority] = useState('URGENT');
  const [reqIncidentId] = useState('INC-2026-0012');
  const [reqQuantity, setReqQuantity] = useState('2');
  const [reqReason, setReqReason] = useState('');
  const [reqNotes, setReqNotes] = useState('');

  // Messages with District Collector
  const [collectorMessages, setCollectorMessages] = useState([
    { id: 1, sender: `District Collector (${district})`, role: 'Collector', message: 'Erumeli Fire Unit: Please prioritize flood evacuation at Mundakayam Ward 4. 18 citizens stranded.', timestamp: '10:45 AM', isOfficial: true },
    { id: 2, sender: `${unitName}`, role: 'Rescue Team', message: 'Copy Collector Sir. Team dispatched en route with 2 OBM rescue boats and 4 divers. ETA 15 mins.', timestamp: '10:48 AM', isOfficial: false },
    { id: 3, sender: `District Collector (${district})`, role: 'Collector', message: 'Acknowledged. KSDMA helicopter standby team is also alerted if water level exceeds 4 meters.', timestamp: '10:52 AM', isOfficial: true }
  ]);
  const [newMessageText, setNewMessageText] = useState('');

  // Notifications List
  const [notifications] = useState([
    { id: 1, title: 'NEW INCIDENT DISPATCH', body: 'Dispatched to Flood Rescue INC-2026-0012 at Mundakayam Ward 4.', time: '15 mins ago', type: 'CRITICAL', unread: true },
    { id: 2, title: 'RED ALERT BROADCAST', body: 'KSDMA issued RED ALERT for Kottayam & Pathanamthitta for next 24 hours.', time: '1 hour ago', type: 'WARNING', unread: true },
    { id: 3, title: 'SUPPORT REQUEST APPROVED', body: 'District Collector approved request REQ-901 for 4 swift-water divers.', time: '2 hours ago', type: 'INFO', unread: false }
  ]);

  // Post Operation Report Form
  const [reportIncidentId, setReportIncidentId] = useState('INC-2026-0003');
  const [reportRescued, setReportRescued] = useState('4');
  const [reportInjured, setReportInjured] = useState('0');
  const [reportMissing, setReportMissing] = useState('0');
  const [reportActions, setReportActions] = useState('Deployed inflatable boat with outboard motor. Evacuated 4 stranded occupants safely to high ground.');
  const [reportRemarks, setReportRemarks] = useState('All rescued individuals handed over to primary health team at Pala relief camp.');

  // Agency Type Switcher handler
  const handleAgencyTypeChange = async (selectedCode: string) => {
    try {
      const cfgRes = await getRescueAgencyConfig(selectedCode);
      if (cfgRes) {
        setAgencyConfig(cfgRes);
        if (cfgRes.designations && cfgRes.designations.length > 0) {
          setNewMemberDesignation(cfgRes.designations[0]);
        }
        if (cfgRes.specializations && cfgRes.specializations.length > 0) {
          setNewMemberSpecialization(cfgRes.specializations[0]);
        }
      }
    } catch (err) {
      console.warn('Error loading agency config:', err);
    }
  };

  // Fetch authenticated profile, agency config, stats & DB team members
  const fetchProfileAndConfig = async () => {
    try {
      const profRes = await getRescueProfile();
      if (profRes && profRes.profile) {
        setProfile(profRes.profile);
        await handleAgencyTypeChange(profRes.profile.agencyType);
      }
    } catch (err) {
      console.warn('Failed to fetch profile/config:', err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await getTeamMembers(district);
      if (res && res.teamMembers) {
        setTeamMembers(res.teamMembers);
      }
    } catch (err) {
      console.warn('Failed to fetch team members:', err);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await getAssignedIncidents(district);
      if (res && res.incidents && res.incidents.length > 0) {
        const formatted = res.incidents.map((inc: any) => ({
          id: inc.id || inc.incident_code,
          code: inc.incident_code,
          type: inc.incident_type || 'Emergency Response',
          severity: inc.severity || 'HIGH',
          location: inc.location_address || `${district} Sector`,
          reportedTime: inc.created_at ? new Date(inc.created_at).toLocaleTimeString() : 'Recently',
          assignedTime: 'Recently',
          assignedBy: `District Collector (${district})`,
          affectedPeople: 4,
          status: inc.status === 'RESOLVED' ? 'COMPLETED' : (inc.status === 'IN_PROGRESS' ? 'IN PROGRESS' : 'ASSIGNED'),
          rescuedCount: inc.status === 'RESOLVED' ? 4 : 0,
          remainingCount: inc.status === 'RESOLVED' ? 0 : 4,
          lat: parseFloat(inc.latitude) || 9.5916,
          lng: parseFloat(inc.longitude) || 76.5222,
          description: inc.description || `Emergency incident assigned in ${district} district.`
        }));
        setAssignedIncidents(formatted);
      } else {
        setAssignedIncidents(getDistrictMockIncidents(district));
      }
    } catch (err) {
      setAssignedIncidents(getDistrictMockIncidents(district));
    }
  };

  useEffect(() => {
    fetchProfileAndConfig();
    getRescueDashboardStats(district).then((res) => {
      if (res && res.stats) setStats(res.stats);
    });
    fetchTeamMembers();
    fetchIncidents();
  }, [district]);

  // Team Member CRUD Handlers
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberContact.trim()) return;
    try {
      setIsSubmittingMember(true);
      const res = await addTeamMember({
        name: newMemberName.trim(),
        employeeServiceId: newMemberEmpId.trim() || `${agencyType.slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`,
        agencyTypeCode: agencyType,
        designation: newMemberDesignation || (agencyConfig.designations[0] || 'Rescuer'),
        specialization: newMemberSpecialization || (agencyConfig.specializations[0] || 'General'),
        role: newMemberRole,
        contact: newMemberContact.trim(),
        email: newMemberEmail.trim(),
        experience: newMemberExperience.trim(),
        availability: newMemberAvailability,
        currentAssignment: newMemberAssignment.trim()
      });
      setTeamMembers(prev => [...prev, res.member]);
      setNewMemberName('');
      setNewMemberEmpId('');
      setNewMemberContact('');
      setNewMemberEmail('');
      setShowAddMemberForm(false);
      setStatusMsg({ type: 'success', text: `Team member ${res.member.name} (${res.member.designation}) saved to database!` });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save team member to database.' });
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleUpdateMemberStatus = async (id: number, availability: string) => {
    try {
      const res = await updateTeamMemberAvailability(id, availability);
      setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, availability: res.member.availability } : m));
      setStatusMsg({ type: 'success', text: `Member availability updated to ${availability}` });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update member status.' });
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!window.confirm('Remove this team member from database roster?')) return;
    try {
      await deleteTeamMember(id);
      setTeamMembers(prev => prev.filter(m => m.id !== id));
      setStatusMsg({ type: 'success', text: 'Team member removed from database.' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete member.' });
    }
  };

  // Handlers
  const handleUpdateOperationStatus = async (incidentId: string, newStatus: string) => {
    try {
      setAssignedIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: newStatus } : inc));
      await updateRescueOperationStatus(incidentId, newStatus);
      setStatusMsg({ type: 'success', text: `Operation ${incidentId} status updated to ${newStatus}!` });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update operation status.' });
    }
  };

  const handleSendSupportRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqReason.trim()) return;
    try {
      const payload = {
        requestType: reqType,
        priority: reqPriority,
        incidentId: reqIncidentId,
        quantity: parseInt(reqQuantity, 10) || 1,
        reason: reqReason,
        notes: reqNotes
      };
      await submitEmergencySupportRequest(payload);
      const newReq = {
        id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
        type: reqType,
        priority: reqPriority,
        incidentId: reqIncidentId,
        quantity: parseInt(reqQuantity, 10) || 1,
        reason: reqReason,
        status: 'PENDING',
        time: 'Just Now'
      };
      setSupportRequests([newReq, ...supportRequests]);
      setReqReason('');
      setReqNotes('');
      setStatusMsg({ type: 'success', text: `Support Request successfully sent to District Collector (${district})!` });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to send support request.' });
    }
  };

  const handleSendCollectorMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    const msgObj = {
      id: Date.now(),
      sender: unitName,
      role: 'Rescue Team',
      message: newMessageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOfficial: false
    };
    setCollectorMessages([...collectorMessages, msgObj]);
    setNewMessageText('');
  };

  // Sidebar Menu Categories (Matching User Model & Collector Portal Standard)
  const menuCategories: MenuCategory[] = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'assigned_incidents', label: 'Assigned Incidents', icon: ShieldAlert, badge: `${assignedIncidents.length}`, badgeColor: 'bg-amber-500 text-slate-950 font-black' },
        { id: 'active_operations', label: 'Active Operations', icon: Activity, badge: `${assignedIncidents.filter(i => i.status !== 'RESOLVED').length}`, badgeColor: 'bg-red-600 text-white' },
        { id: 'operation_history', label: 'Operation History', icon: History, badge: null }
      ]
    },
    {
      title: 'MAP & NAVIGATION',
      items: [
        { id: 'map', label: 'Live Disaster Map', icon: MapPin, badge: 'GIS' },
        { id: 'navigation', label: 'Navigation', icon: NavIcon, badge: 'GPS' }
      ]
    },
    {
      title: 'TEAM & RESOURCES',
      items: [
        { id: 'team_members', label: 'Team Members', icon: Users, badge: `${teamMembers.length}` },
        { id: 'team_status', label: 'Team Status', icon: ShieldCheck, badge: currentTeamStatus, badgeColor: currentTeamStatus === 'Available' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950 font-bold' },
        { id: 'resources', label: 'Resource Management', icon: Package, badge: null }
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: `${notifications.filter(n => n.unread).length}`, badgeColor: 'bg-red-600 text-white' },
        { id: 'collector_comm', label: 'Collector Communication', icon: Radio, badge: 'EOC' },
        { id: 'emergency_requests', label: 'Emergency Requests', icon: AlertCircle, badge: supportRequests.filter(r => r.status === 'PENDING').length ? `${supportRequests.filter(r => r.status === 'PENDING').length} Pending` : null, badgeColor: 'bg-orange-500 text-white' }
      ]
    },
    {
      title: 'INFORMATION',
      items: [
        { id: 'weather_alerts', label: 'Weather & Alerts', icon: CloudRain, badge: stats.criticalAlerts ? `${stats.criticalAlerts}` : null, badgeColor: 'bg-red-500 text-white' },
        { id: 'shelters', label: 'Evacuation Centers', icon: Home, badge: 'Camps' },
        { id: 'hospitals', label: 'Hospitals & Emergency', icon: Hospital, badge: '24/7' }
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { id: 'operation_reports', label: 'Operation Reports', icon: FileCheck, badge: null }
      ]
    },
    {
      title: 'ACCOUNT',
      items: [
        { id: 'profile', label: 'Profile', icon: User, badge: 'Verified' },
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
            <LifeBuoy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wide text-slate-900 leading-tight">SAHAY</div>
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">{district} Rescue Portal</div>
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
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-sm">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                <span>SAHAY</span>
              </h1>
              <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">
                Rescue Portal &bull; {district}
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

          {/* Sidebar Footer Info */}
          <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/50 text-[11px] text-slate-500 font-medium text-center">
            Official Portal &bull; KSDMA / Kerala Govt
          </div>
        </aside>

        {/* BACKDROP FOR MOBILE SIDEBAR */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-30 md:hidden"
          />
        )}

        {/* 3. DYNAMIC RIGHT MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">

          {/* Pending Approval Notification Guard */}
          {!isApproved && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-3 shadow-xs animate-fadeIn">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-black text-slate-900">Registration Verification Pending:</span> Your rescue unit (<strong>{unitName}</strong> &bull; <span className="font-mono text-amber-800">{unitId}</span>) is currently under review by the District Collector ({district}). Full operational features will automatically unlock upon official approval.
              </div>
            </div>
          )}

          {/* Global Action Banner Notification if status Msg exists */}
          {statusMsg && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-sm ${
              statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <div className="flex items-center gap-2">
                {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span>{statusMsg.text}</span>
              </div>
              <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* TOP STATUS WORKSPACE BAR */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black uppercase tracking-wider mb-1">
                  District Emergency Response Unit &bull; {district}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 capitalize tracking-tight">
                  {activeTab.replace('_', ' ')} Command Center
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Officer: <strong className="text-slate-900">{unitName}</strong> ({unitId})</span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* VIEW 1: DASHBOARD HOME */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'dashboard' && !selectedIncidentId && (
            <div className="space-y-6 animate-fadeIn">

              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
                
                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-emerald-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Team Status</span>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-black text-emerald-700 truncate">{currentTeamStatus}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Operational Mode</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-amber-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Assigned</span>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.newAssignments}</div>
                  <div className="text-[10px] text-slate-500 mt-1">New Dispatches</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-red-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Ops</span>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono">{stats.activeOperations}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Rescue in progress</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-emerald-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Completed</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.completedOperations}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Resolved Missions</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-blue-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Team Members</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {teamMembers.length > 0 ? teamMembers.filter(m => m.availability === 'Available').length : stats.availableMembers}/{teamMembers.length > 0 ? teamMembers.length : stats.totalMembers}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Ready Rescuers</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-teal-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Resources</span>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.availableResources}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Gear & Boats Ready</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-orange-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Alerts</span>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.criticalAlerts}</div>
                  <div className="text-[10px] text-slate-500 mt-1">District Warnings</div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-xs hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-purple-600 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Requests</span>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{stats.pendingRequests}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Support Pending</div>
                </div>

              </div>

              {/* 5. CURRENT RESCUE OPERATION LARGE CARD */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-400">
                      <Zap className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black tracking-widest text-red-400 uppercase">
                        CURRENT RESCUE OPERATION &bull; ACTIVE MISSION
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white">
                        {assignedIncidents[0]?.type || 'Flood Rescue'} (INC-2026-0012)
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-black uppercase tracking-wider">
                      SEVERITY: CRITICAL
                    </span>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider">
                      STATUS: EN ROUTE
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <div className="text-xs text-slate-400 font-bold uppercase">Location</div>
                    <div className="font-extrabold text-slate-100 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{assignedIncidents[0]?.location || 'Mundakayam, Kottayam'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <div className="text-xs text-slate-400 font-bold uppercase">People Affected / Stranded</div>
                    <div className="font-mono text-2xl font-black text-amber-400">
                      {assignedIncidents[0]?.affectedPeople || 18} <span className="text-xs text-slate-400 font-sans">Lives</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <div className="text-xs text-slate-400 font-bold uppercase">Assigned By</div>
                    <div className="font-bold text-slate-200">
                      {assignedIncidents[0]?.assignedBy || `District Collector (${district})`}
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 leading-relaxed font-normal">
                  {assignedIncidents[0]?.description}
                </p>

                {/* Operational Quick Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => {
                      setSelectedIncidentId(assignedIncidents[0]?.id || '12');
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Incident Details</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('navigation')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <NavIcon className="w-4 h-4" />
                    <span>Open Navigation</span>
                  </button>

                  <button
                    onClick={() => handleUpdateOperationStatus('INC-2026-0012', 'ARRIVED')}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Arrived at Site</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('emergency_requests')}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Request Collector Support</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* SINGLE INCIDENT DETAILS DRILLDOWN VIEW */}
          {selectedIncidentId && (
            <div className="space-y-4 animate-fadeIn">
              <button
                onClick={() => setSelectedIncidentId(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2"
              >
                <span>&larr; Back to Dashboard Operations</span>
              </button>
              <OfficialIncidentDetailsPage
                incidentId={selectedIncidentId}
                onBack={() => setSelectedIncidentId(null)}
              />
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 2: ASSIGNED INCIDENTS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'assigned_incidents' && !selectedIncidentId && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Assigned Field Incidents ({assignedIncidents.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Emergency incidents assigned specifically to {unitName} in {district} district.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {assignedIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className={`bg-white border rounded-3xl p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        inc.severity === 'CRITICAL' ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                            inc.severity === 'CRITICAL' ? 'bg-red-600 text-white animate-pulse' :
                            inc.severity === 'HIGH' ? 'bg-orange-500 text-white' : 'bg-amber-400 text-slate-950'
                          }`}>
                            {inc.severity}
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black border border-slate-200">
                            {inc.code}
                          </span>

                          <span className="text-xs text-slate-500 font-medium">
                            Reported: {inc.reportedTime} &bull; Assigned by: <strong>{inc.assignedBy}</strong>
                          </span>
                        </div>

                        <h3 className="text-base font-black text-slate-900">
                          {inc.type} &bull; <span className="text-emerald-700 font-bold">{inc.location}</span>
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {inc.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs font-bold text-slate-700 pt-1">
                          <span>Stranded People: <strong className="text-red-600 font-mono">{inc.affectedPeople}</strong></span>
                          <span>Current Status: <strong className="text-emerald-700 uppercase font-mono">{inc.status}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
                        <button
                          onClick={() => setSelectedIncidentId(inc.id)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-200"
                        >
                          View Details
                        </button>

                        <button
                          onClick={() => handleUpdateOperationStatus(inc.id, 'ACCEPTED')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                          Accept
                        </button>

                        <button
                          onClick={() => handleUpdateOperationStatus(inc.id, 'EN ROUTE')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                        >
                          Start Operation
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 3: ACTIVE OPERATIONS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'active_operations' && !selectedIncidentId && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Active Field Rescue Operations Workflow
                  </h2>
                  <p className="text-xs text-slate-500">
                    Step through the official mission lifecycle from ACCEPTED ➔ EN ROUTE ➔ ARRIVED ➔ RESCUE IN PROGRESS ➔ COMPLETED.
                  </p>
                </div>

                {assignedIncidents.filter(i => i.status !== 'RESOLVED').map((op) => (
                  <div key={op.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                      <div>
                        <div className="text-xs font-black text-emerald-700 uppercase tracking-wider">{op.code} &bull; {op.type}</div>
                        <h3 className="text-lg font-black text-slate-900">{op.location}</h3>
                      </div>

                      <div className="px-3.5 py-1 rounded-full bg-red-600 text-white text-xs font-black uppercase">
                        Current Status: {op.status}
                      </div>
                    </div>

                    {/* Workflow Stepper */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-[11px] font-extrabold">
                      {['ASSIGNED', 'ACCEPTED', 'EN ROUTE', 'ARRIVED', 'RESCUE IN PROGRESS', 'COMPLETED'].map((step, idx) => {
                        const isCurrent = op.status === step;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleUpdateOperationStatus(op.id, step)}
                            className={`p-2.5 rounded-2xl border transition-all ${
                              isCurrent
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {step}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-700 bg-white p-4 rounded-2xl border border-slate-200">
                      <div>GPS Position: <span className="font-mono text-slate-900">{op.lat}, {op.lng}</span></div>
                      <div>Rescued Count: <span className="font-mono text-emerald-700 font-black">{op.rescuedCount}</span></div>
                      <div>Remaining Stranded: <span className="font-mono text-red-600 font-black">{op.remainingCount}</span></div>
                      <div>Assigned Rescuers: <span className="text-slate-900 font-bold">4 Divers + 1 Tender</span></div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 4: OPERATION HISTORY */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'operation_history' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-black text-slate-900">Completed Operation Log</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                        <th className="py-3 px-4">Incident ID</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Response Time</th>
                        <th className="py-3 px-4">People Rescued</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {operationHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.id}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{item.type}</td>
                          <td className="py-3 px-4">{item.location}</td>
                          <td className="py-3 px-4">{item.date}</td>
                          <td className="py-3 px-4 text-emerald-700 font-bold">{item.responseTime}</td>
                          <td className="py-3 px-4 font-mono font-black text-emerald-600">{item.peopleRescued}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px]">
                              {item.finalStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setActiveTab('operation_reports')}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200"
                            >
                              View Full Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 5: LIVE DISASTER MAP */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'map' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Live Field GIS Disaster Map</h2>
                    <p className="text-xs text-slate-500">Real-time GPS positions of rescue teams, assigned incidents, shelters, and hazard zones.</p>
                  </div>
                </div>

                <div className="h-[600px] rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
                  <KeralaAlertMap
                    alerts={[
                      { district: district, alertLevel: 'RED', alertType: 'Heavy Rainfall & Flood Warning', description: 'Extremely heavy rainfall predicted in Kottayam sector.' }
                    ]}
                    userLocation={{ latitude: 9.5916, longitude: 76.5222, district }}
                    selectedDistrict={district}
                    onSelectDistrict={() => {}}
                    onLocateUser={() => {}}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 6: NAVIGATION */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'navigation' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <NavIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">GPS Field Navigation & Emergency Route</h2>
                    <p className="text-xs text-slate-500">From Rescue Station Base ➔ Selected Incident Site</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <div className="space-y-2">
                      <div className="text-xs font-black uppercase text-slate-400">Origin Point</div>
                      <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>{unitName} Base Station</span>
                      </div>
                    </div>

                    <div className="h-px bg-slate-200" />

                    <div className="space-y-2">
                      <div className="text-xs font-black uppercase text-slate-400">Destination Incident</div>
                      <div className="font-extrabold text-red-600 text-sm flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                        <span>Mundakayam Ward 4 (INC-2026-0012)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-bold pt-2">
                      <div className="bg-white p-3 rounded-2xl border border-slate-200">
                        <div className="text-slate-500">Total Distance</div>
                        <div className="text-xl font-black text-slate-900 font-mono">14.2 km</div>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-200">
                        <div className="text-slate-500">Estimated Travel Time</div>
                        <div className="text-xl font-black text-emerald-600 font-mono">22 mins</div>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Route Hazard Advisory</span>
                      </div>
                      <p className="font-normal text-[11px]">
                        Waterlogging reported near bridge at km 4.5. Heavy emergency tenders should take the Erumeli-Pampa bypass road.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => alert("Navigation routing started. Live GPS active.")}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
                      >
                        <NavIcon className="w-4 h-4" />
                        <span>Start Navigation</span>
                      </button>

                      <button
                        onClick={() => handleUpdateOperationStatus('INC-2026-0012', 'ARRIVED')}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Arrived</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="text-xs font-black uppercase text-emerald-400 mb-2">Turn-by-Turn Route Guidance</div>
                      <div className="space-y-4 text-xs font-medium">
                        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">1. Depart Base Station heading East on Erumeli Main Road (3.2 km)</div>
                        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">2. Turn Right onto High Range Highway SH-44 (6.5 km)</div>
                        <div className="p-3 bg-amber-950/60 text-amber-200 rounded-xl border border-amber-800/80">3. CAUTION: Divert via Bridge Bypass Road (2.1 km)</div>
                        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">4. Arrive at Incident Sector - Mundakayam Ward 4 (2.4 km)</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 text-center font-bold">
                      Integrated PostGIS Spatial Road Network Telemetry
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 7: TEAM MEMBERS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'team_members' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Rescue Unit Roster & Personnel Database</h2>
                    <p className="text-xs text-slate-500">Official personnel details, roles, contacts, and live operational availability stored in database.</p>
                  </div>

                  <button
                    onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    {showAddMemberForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    <span>{showAddMemberForm ? 'Cancel Form' : '+ Add Team Member to Roster'}</span>
                  </button>
                </div>

                {/* ADD TEAM MEMBER DATABASE FORM */}
                {showAddMemberForm && (
                  <form onSubmit={handleAddTeamMember} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <div className="text-xs font-black uppercase text-emerald-800 tracking-wider">
                          Add New Member to {agencyConfig.agencyTypeName} Roster
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          Official designation & specialization options automatically adapt to the selected agency.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Agency Mode:</span>
                        <select
                          value={agencyConfig.agencyType}
                          onChange={(e) => handleAgencyTypeChange(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-100 text-emerald-900 font-black text-xs shadow-xs"
                        >
                          <option value="NDRF">NDRF (National Disaster Response Force)</option>
                          <option value="FIRE_RESCUE">Fire & Rescue Services</option>
                          <option value="POLICE">Kerala Police (Disaster Wing)</option>
                          <option value="KSDMA">KSDMA / SDMA Control Room</option>
                          <option value="CIVIL_DEFENCE">Civil Defence Volunteers</option>
                          <option value="OTHER">Other Authorized Agency</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                      <div>
                        <label className="block text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="e.g. Capt. Suresh Kumar / Insp. Rajesh"
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Employee / Service ID *</label>
                        <input
                          type="text"
                          required
                          value={newMemberEmpId}
                          onChange={(e) => setNewMemberEmpId(e.target.value)}
                          placeholder="e.g. FRS-9921 / NDRF-042"
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Official Designation ({agencyConfig.agencyTypeName}) *</label>
                        <select
                          value={newMemberDesignation}
                          onChange={(e) => setNewMemberDesignation(e.target.value)}
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold"
                        >
                          {agencyConfig.designations.map((desg, i) => (
                            <option key={i} value={desg}>{desg}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Agency Specialization *</label>
                        <select
                          value={newMemberSpecialization}
                          onChange={(e) => setNewMemberSpecialization(e.target.value)}
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                        >
                          {agencyConfig.specializations.map((spec, i) => (
                            <option key={i} value={spec}>{spec}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Operational Role (Mission Function) *</label>
                        <select
                          value={newMemberRole}
                          onChange={(e) => setNewMemberRole(e.target.value)}
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                        >
                          {agencyConfig.operationalRoles.map((roleOption, i) => (
                            <option key={i} value={roleOption}>{roleOption}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Mobile Contact Phone *</label>
                        <input
                          type="text"
                          required
                          value={newMemberContact}
                          onChange={(e) => setNewMemberContact(e.target.value)}
                          placeholder="+91 94471 23456"
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Government Email</label>
                        <input
                          type="email"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          placeholder="member@kerala.gov.in"
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Experience / Service Length</label>
                        <input
                          type="text"
                          value={newMemberExperience}
                          onChange={(e) => setNewMemberExperience(e.target.value)}
                          placeholder="e.g. 5 Years"
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Initial Availability</label>
                        <select
                          value={newMemberAvailability}
                          onChange={(e) => setNewMemberAvailability(e.target.value)}
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                        >
                          <option value="Available">Available</option>
                          <option value="On Operation">On Operation</option>
                          <option value="Standby">Standby</option>
                          <option value="Unavailable">Unavailable</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1">Current Base / Assignment</label>
                        <input
                          type="text"
                          value={newMemberAssignment}
                          onChange={(e) => setNewMemberAssignment(e.target.value)}
                          placeholder="e.g. Command Base Station"
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAddMemberForm(false)}
                        className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl text-xs font-bold"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmittingMember}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-md transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isSubmittingMember ? 'Saving to DB...' : 'SAVE MEMBER TO DATABASE'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* DATABASE TEAM MEMBERS TABLE */}
                {teamMembers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300 space-y-3">
                    <Users className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="text-sm font-bold text-slate-700">No {agencyConfig.agencyTypeName} Members Saved Yet</div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click the <strong>"+ Add Team Member to Roster"</strong> button above to register your unit's personnel into PostgreSQL database.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                          <th className="py-3 px-4">Name & Service ID</th>
                          <th className="py-3 px-4">Official Designation</th>
                          <th className="py-3 px-4">Specialization</th>
                          <th className="py-3 px-4">Operational Role</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4">Availability</th>
                          <th className="py-3 px-4">Assignment</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {teamMembers.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-black text-slate-900">{m.name}</div>
                              <div className="text-[10px] font-mono text-emerald-700 font-bold">{m.employeeServiceId || 'FRS-001'}</div>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">{m.designation}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                                {m.specialization || 'General'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-emerald-700">{m.role}</td>
                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-slate-800">{m.contact}</div>
                              {m.email && <div className="text-[10px] text-slate-400">{m.email}</div>}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={m.availability}
                                onChange={(e) => handleUpdateMemberStatus(m.id, e.target.value)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                                  m.availability === 'Available' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                                  m.availability === 'On Operation' ? 'bg-amber-50 border-amber-300 text-amber-900' :
                                  'bg-slate-100 border-slate-300 text-slate-700'
                                }`}
                              >
                                <option value="Available">Available</option>
                                <option value="On Operation">On Operation</option>
                                <option value="Standby">Standby</option>
                                <option value="Unavailable">Unavailable</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{m.currentAssignment}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteMember(m.id)}
                                title="Delete Member from DB"
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 8: TEAM STATUS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'team_status' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Current Unit Operational Status</h2>
                  <p className="text-xs text-slate-500">Update operational mode broadcasted to District Collector and KSDMA control room.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(['Available', 'On Operation', 'Standby', 'Offline'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setCurrentTeamStatus(st);
                        setStatusMsg({ type: 'success', text: `Team Status updated to ${st} across SAHAY system!` });
                        setTimeout(() => setStatusMsg(null), 3000);
                      }}
                      className={`p-5 rounded-3xl border text-center transition-all ${
                        currentTeamStatus === st
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-black scale-105'
                          : 'bg-white text-slate-800 border-slate-200 font-bold hover:border-slate-300'
                      }`}
                    >
                      <div className="text-base">{st}</div>
                      <div className="text-[10px] opacity-80 mt-1">Click to broadcast status</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 9: RESOURCE MANAGEMENT */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'resources' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Emergency Resource Inventory ({agencyConfig.agencyTypeName})</h2>
                    <p className="text-xs text-slate-500">Track agency-specific equipment availability, active field deployment, and condition.</p>
                  </div>
                  <div className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl">
                    Agency: {agencyConfig.agencyTypeName}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                        <th className="py-3 px-4">Resource Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Total Quantity</th>
                        <th className="py-3 px-4">Available</th>
                        <th className="py-3 px-4">In Use</th>
                        <th className="py-3 px-4">Damaged</th>
                        <th className="py-3 px-4">Stock Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(agencyConfig.resources.length > 0
                        ? agencyConfig.resources.map((res, i) => ({
                            id: i + 1,
                            name: res.name,
                            category: res.category,
                            total: 10 - i,
                            available: 8 - i,
                            inUse: 2,
                            damaged: 0,
                            lowStock: i === 4
                          }))
                        : resourceList
                      ).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-black text-slate-900">{r.name}</td>
                          <td className="py-3 px-4 text-slate-700">{r.category}</td>
                          <td className="py-3 px-4 font-mono font-bold">{r.total}</td>
                          <td className="py-3 px-4 font-mono font-black text-emerald-600">{r.available}</td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-600">{r.inUse}</td>
                          <td className="py-3 px-4 font-mono font-bold text-red-600">{r.damaged}</td>
                          <td className="py-3 px-4">
                            {r.lowStock ? (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full font-black text-[10px]">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px]">
                                Optimal
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 10: EMERGENCY REQUESTS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'emergency_requests' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Request Support from District Collector</h2>
                  <p className="text-xs text-slate-500">Submit requests for additional boats, NDRF personnel, medical teams, or heavy machinery.</p>
                </div>

                <form onSubmit={handleSendSupportRequest} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                    <div>
                      <label className="block text-slate-700 mb-1">Request Type</label>
                      <select
                        value={reqType}
                        onChange={(e) => setReqType(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                      >
                        <option value="Additional Rescue Personnel">Additional Rescue Personnel</option>
                        <option value="ALS Ambulance Support">ALS Ambulance Support</option>
                        <option value="NDRF Swift-Water Team">NDRF Swift-Water Team</option>
                        <option value="Inflatable Rescue Boat">Inflatable Rescue Boat</option>
                        <option value="Heavy Excavator JCB">Heavy Excavator JCB</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1">Priority Level</label>
                      <select
                        value={reqPriority}
                        onChange={(e) => setReqPriority(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900"
                      >
                        <option value="URGENT">URGENT</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1">Required Quantity</label>
                      <input
                        type="number"
                        value={reqQuantity}
                        onChange={(e) => setReqQuantity(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 text-xs font-bold">Reason for Support Request</label>
                    <textarea
                      rows={2}
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                      placeholder="e.g. Flood water levels rising rapidly at Mundakayam Ward 4. Swift-water current requires 4 additional divers."
                      className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>SEND REQUEST TO COLLECTOR</span>
                  </button>
                </form>

                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900">Support Requests Status</h3>
                  <div className="space-y-2">
                    {supportRequests.map((r) => (
                      <div key={r.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4 text-xs font-medium">
                        <div>
                          <div className="font-black text-slate-900">{r.type} ({r.priority}) &bull; Qty: {r.quantity}</div>
                          <div className="text-slate-500 text-[11px]">{r.reason}</div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 11: COLLECTOR COMMUNICATION */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'collector_comm' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">District Collector & EOC Emergency Direct Thread</h2>
                  <p className="text-xs text-slate-500">Official encrypted channel between {unitName} and District Collector ({district}).</p>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 h-96 flex flex-col justify-between">
                  <div className="overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {collectorMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl text-xs max-w-xl ${
                          m.isOfficial
                            ? 'bg-slate-800 text-slate-100 border border-slate-700'
                            : 'bg-emerald-700 text-white ml-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 mb-1 font-bold">
                          <span>{m.sender}</span>
                          <span>{m.timestamp}</span>
                        </div>
                        <p className="leading-relaxed">{m.message}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendCollectorMessage} className="pt-4 flex gap-2">
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Type urgent transmission to District Collector..."
                      className="flex-1 p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md transition-all"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 12: NOTIFICATIONS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-black text-slate-900">Official Operational Notifications</h2>
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                      <Bell className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <div className="font-black text-slate-900">{n.title} &bull; <span className="text-slate-400 font-normal">{n.time}</span></div>
                        <p className="text-slate-600">{n.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 13: WEATHER & ALERTS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'weather_alerts' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">District Disaster & Weather Telemetry</h2>
                  <p className="text-xs text-slate-500">Live telemetry for {district} Sector from IMD & KSDMA telemetry network.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
                  <div className="p-5 bg-red-50 border border-red-200 rounded-3xl text-red-950 space-y-1">
                    <div className="font-black uppercase text-[10px] text-red-600">Active Warning</div>
                    <div className="text-base font-black">HEAVY RAINFALL RED ALERT</div>
                    <p className="text-[11px] font-normal text-red-900">Extremely heavy rainfall (115.6mm to 204.4mm) predicted for high ranges of {district}.</p>
                  </div>

                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl text-amber-950 space-y-1">
                    <div className="font-black uppercase text-[10px] text-amber-600">Landslide Advisory</div>
                    <div className="text-base font-black">HILL SLOPE CAUTION</div>
                    <p className="text-[11px] font-normal text-amber-900">High vulnerability to landslides in Erumeli North & Mundakayam slopes.</p>
                  </div>

                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-3xl text-blue-950 space-y-1">
                    <div className="font-black uppercase text-[10px] text-blue-600">River Telemetry</div>
                    <div className="text-base font-black">MANIMALA RIVER LEVEL</div>
                    <p className="text-[11px] font-normal text-blue-900">Water level at 6.4m (Warning Mark: 6.0m). Rising rapidly.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 14: EVACUATION CENTERS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'shelters' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-black text-slate-900">Evacuation Relief Shelters in {district}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {[
                    { name: 'Govt Higher Secondary School Camp', location: 'Mundakayam Sector', capacity: 500, occupied: 180, distance: '3.4 km' },
                    { name: 'St. Thomas Community Relief Center', location: 'Erumeli Town', capacity: 350, occupied: 290, distance: '5.1 km' },
                    { name: 'District Indoor Stadium Shelter', location: 'Civil Station Ward', capacity: 1000, occupied: 410, distance: '12.0 km' }
                  ].map((sh, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-2">
                      <div className="font-black text-slate-900 text-sm">{sh.name}</div>
                      <div className="text-slate-500 font-medium">{sh.location} &bull; Distance: <strong>{sh.distance}</strong></div>
                      <div className="font-mono text-emerald-700 font-bold">Occupied: {sh.occupied} / {sh.capacity}</div>
                      <button
                        onClick={() => setActiveTab('navigation')}
                        className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                      >
                        Navigate to Camp
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 15: HOSPITALS & EMERGENCY SERVICES */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'hospitals' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-black text-slate-900">Emergency Medical & Security Directory</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {[
                    { name: 'Kottayam General Hospital', category: 'Tertiary Hospital', beds: '24 ICU Beds Free', phone: '+91 481 256 3211', distance: '11.5 km' },
                    { name: 'Taluk Hospital Kanjirappally', category: 'Secondary Hospital', beds: '8 ICU Beds Free', phone: '+91 4828 251 044', distance: '6.2 km' },
                    { name: 'Emergency ALS Ambulance Base', category: 'Ambulance Service', beds: '4 Ambulances Ready', phone: '+91 94471 99999', distance: '2.1 km' }
                  ].map((h, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-2">
                      <div className="font-black text-slate-900 text-sm">{h.name}</div>
                      <div className="text-slate-500 font-medium">{h.category} &bull; {h.distance}</div>
                      <div className="font-mono text-blue-700 font-bold">{h.beds}</div>
                      <a
                        href={`tel:${h.phone}`}
                        className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call {h.phone}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 16: OPERATION REPORTS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'operation_reports' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Submit Post-Operation Debrief Report</h2>
                  <p className="text-xs text-slate-500">Official debrief report submitted to District Collector for official archives.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); setStatusMsg({ type: 'success', text: 'Final Operation Report submitted to District Collector!' }); setTimeout(() => setStatusMsg(null), 4000); }} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 text-xs font-bold">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-slate-700 mb-1">Incident Code</label>
                      <input type="text" value={reportIncidentId} onChange={(e) => setReportIncidentId(e.target.value)} className="w-full p-3 rounded-2xl border border-slate-200 bg-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">People Rescued</label>
                      <input type="number" value={reportRescued} onChange={(e) => setReportRescued(e.target.value)} className="w-full p-3 rounded-2xl border border-slate-200 bg-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">People Injured</label>
                      <input type="number" value={reportInjured} onChange={(e) => setReportInjured(e.target.value)} className="w-full p-3 rounded-2xl border border-slate-200 bg-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">People Missing</label>
                      <input type="number" value={reportMissing} onChange={(e) => setReportMissing(e.target.value)} className="w-full p-3 rounded-2xl border border-slate-200 bg-white font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">Rescue Actions Taken</label>
                    <textarea rows={2} value={reportActions} onChange={(e) => setReportActions(e.target.value)} className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs font-normal" />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1">Final Remarks / Handover</label>
                    <textarea rows={2} value={reportRemarks} onChange={(e) => setReportRemarks(e.target.value)} className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs font-normal" />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-md transition-all"
                  >
                    SUBMIT FINAL REPORT
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 17: PROFILE */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase mb-1">
                      ✓ VERIFIED OFFICIAL RESCUE UNIT
                    </div>
                    <h2 className="text-xl font-black text-slate-900">{profile.unitName}</h2>
                    <p className="text-xs text-slate-500">{profile.agencyTypeName} &bull; {profile.district} District</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  <div>Agency Type: <span className="text-slate-900 font-bold text-emerald-800">{profile.agencyTypeName}</span></div>
                  <div>District Sector: <span className="text-slate-900 font-normal">{profile.district}</span></div>
                  <div>Official Unit ID: <span className="font-mono text-emerald-700 font-bold">{profile.officialUnitId}</span></div>
                  <div>Station / Unit Name: <span className="text-slate-900 font-normal">{profile.unitName}</span></div>
                  <div>Government Email: <span className="text-slate-900 font-normal">{profile.email}</span></div>
                  <div>Emergency Contact: <span className="font-mono text-slate-900">{profile.phone}</span></div>
                  <div>Verification Status: <span className="text-emerald-600 font-black uppercase">{profile.verificationStatus}</span></div>
                  <div>Verified By: <span className="text-slate-900 font-normal">District Collector ({profile.district})</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VIEW 18: SETTINGS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <h2 className="text-lg font-black text-slate-900">Operational System Settings</h2>
                <div className="space-y-3 text-xs font-bold text-slate-700">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span>GPS Auto-Update Interval (Seconds)</span>
                    <select className="p-2 rounded-xl border border-slate-200 bg-white">
                      <option>10 Seconds (High Precision)</option>
                      <option>30 Seconds</option>
                      <option>60 Seconds</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span>Critical Alert Audio Sirens</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span>Offline Maps Caching</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
    </div>
  );
};
