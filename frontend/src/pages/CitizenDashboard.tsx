import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  CloudSun,
  MapPin,
  AlertTriangle,
  Radio,
  Home,
  PhoneCall,
  FileText,
  Users,
  Coins,
  BookOpen,
  Bot,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Navigation,
  Plus,
  Phone,
  Layers,
  Maximize2,
  Send,
  Building2,
  Heart,
  Crosshair,
  Map as MapIcon,
  ChevronDown,
  Edit3,
  Trash2,
  Search,
  MessageSquare,
  HeartPulse,
  CheckCircle,
  AlertOctagon,
  Info
} from 'lucide-react';
import type { Language } from '../translations';
import type { FamilyMember } from '../services/api';
import {
  getStoredUser,
  fetchFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  patchFamilyMemberStatus,
  deleteFamilyMemberRecord
} from '../services/api';
import { useLocation } from '../context/LocationContext';
import { WeatherTelemetryDashboard } from '../components/WeatherTelemetryDashboard';
import { TopHeader } from '../components/TopHeader';
import { LiveAlertTicker } from '../components/LiveAlertTicker';
import { EmergencyContactsModal } from '../components/EmergencyContactsModal';
import { NotificationBell } from '../components/NotificationBell';
import { ReportIncidentPage } from './ReportIncidentPage';
import { MyReportsPage } from './MyReportsPage';
import { CitizenIncidentDetailsPage } from './CitizenIncidentDetailsPage';
import logoSahay from '../assets/logo_sahay.png';

interface CitizenDashboardProps {
  currentLang?: Language;
  user?: any;
  onSignOut?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export function CitizenDashboard({
  currentLang = 'en',
  user: propUser,
  onSignOut,
  onNavigateToTab
}: CitizenDashboardProps) {
  const { weatherData, loading, error, refreshLocation } = useLocation();

  // User Session State
  const [currentUser] = useState<any>(() => propUser || getStoredUser() || {
    name: 'Ananya Nair',
    phone: '+91 98470 12345',
    district: 'Wayanad',
    panchayat: 'Meppadi',
    role: 'Citizen'
  });

  // UI State - activeMenu determines which view is shown on the right panel
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [selectedDistrict] = useState(currentUser?.district || 'Wayanad');
  const [selectedLang, setSelectedLang] = useState<Language>(currentLang);
  const [activeAlertBanner, setActiveAlertBanner] = useState(true);

  // Modals & Panels
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportDetails, setSelectedReportDetails] = useState<any | null>(null);
  const [selectedMapMarker, setSelectedMapMarker] = useState<any | null>(null);
  const [selectedTipModal, setSelectedTipModal] = useState<any | null>(null);
  const [addFamilyModalOpen, setAddFamilyModalOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Geolocation & SOS State
  const [sosTriggered, setSosTriggered] = useState(false);
  const [userLocation] = useState<{ lat: number; lng: number } | null>({
    lat: 11.605,
    lng: 76.083
  });
  const [userIsSafe, setUserIsSafe] = useState(true);
  const [lastSafeTime, setLastSafeTime] = useState('Today, 02:45 PM');

  // Interactive Checklist State
  const [kitChecklist, setKitChecklist] = useState<{ [key: string]: boolean }>({
    water: true,
    cannedFood: true,
    firstAid: true,
    flashlight: true,
    powerbank: false,
    documents: true,
    whistle: false,
    medicines: true
  });

  // Map Filter State
  const [mapLayerFilters, setMapLayerFilters] = useState<{ [key: string]: boolean }>({
    shelters: true,
    hospitals: true,
    police: true,
    fire: true,
    incidents: true,
    floodZones: true,
    landslideZones: true,
    rescueTeams: true,
    safeRoutes: true
  });

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: `Namaskaram ${currentUser.name.split(' ')[0]}! I am SAHAY AI Emergency Assistant. How can I assist you today regarding weather, open shelters, incident reporting, or disaster safety?`,
      time: 'Just now'
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Real-time / User Data States (Empty Initial States)
  const [incidentReports, setIncidentReports] = useState<any[]>([]);

  // New Incident Form State
  const [newIncident, setNewIncident] = useState({
    type: 'Flash Flood',
    location: `${selectedDistrict}`,
    description: '',
    severity: 'Medium'
  });

  // Shelters Data (empty array until loaded from backend API)
  const nearbyShelters: any[] = [];

  // Disaster Alerts Data (empty array until loaded from backend API)
  const disasterAlerts: any[] = [];

  // Family Members Data & State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingFamily, setLoadingFamily] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<FamilyMember | null>(null);

  // Search & Filter State
  const [familySearch, setFamilySearch] = useState('');
  const [familyStatusFilter, setFamilyStatusFilter] = useState<string>('ALL');

  // Form State & Live Validation
  const initialFamilyForm = {
    name: '',
    relation: 'Spouse',
    age: '',
    gender: 'Prefer not to say',
    phone: '',
    blood_group: 'Unknown',
    medical_needs: 'None',
    is_emergency_contact: false,
    status: 'Safe',
    location: 'Home',
    govt_id: '',
    notes: ''
  };

  const [familyForm, setFamilyForm] = useState(initialFamilyForm);
  const [familyErrors, setFamilyErrors] = useState<Record<string, string>>({});
  const [familyTouched, setFamilyTouched] = useState<Record<string, boolean>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Load family members from DB on mount
  useEffect(() => {
    let isMounted = true;
    const loadMembers = async () => {
      setLoadingFamily(true);
      try {
        const data = await fetchFamilyMembers();
        if (isMounted) {
          setFamilyMembers(data);
        }
      } catch (err: any) {
        console.warn('Backend fetch family members note:', err.message);
      } finally {
        if (isMounted) setLoadingFamily(false);
      }
    };
    loadMembers();
    return () => { isMounted = false; };
  }, []);

  // Live Field Validation logic
  const validateFamilyField = (fieldName: string, value: any): string => {
    let error = '';
    if (fieldName === 'name') {
      if (!value || typeof value !== 'string' || value.trim().length < 2) {
        error = 'Full Name is required (minimum 2 characters)';
      } else if (!/^[a-zA-Z\s\.\'\-]+$/.test(value.trim())) {
        error = 'Name should only contain letters and spaces';
      }
    } else if (fieldName === 'relation') {
      if (!value) {
        error = 'Please select a relationship';
      }
    } else if (fieldName === 'age') {
      if (value !== '' && value !== null && value !== undefined) {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 120 || !Number.isInteger(num)) {
          error = 'Age must be a whole number between 0 and 120';
        }
      }
    } else if (fieldName === 'phone') {
      if (value && value.trim() !== '') {
        const clean = value.replace(/[\s\-\+\(\)]/g, '');
        if (!/^\d{10,12}$/.test(clean)) {
          error = 'Enter a valid 10-digit mobile number';
        }
      }
    }
    return error;
  };

  const handleFamilyInputChange = (field: string, value: any) => {
    const updatedForm = { ...familyForm, [field]: value };
    setFamilyForm(updatedForm);

    if (familyTouched[field]) {
      const errorMsg = validateFamilyField(field, value);
      setFamilyErrors(prev => ({ ...prev, [field]: errorMsg }));
    }
  };

  const handleFamilyInputBlur = (field: string) => {
    setFamilyTouched(prev => ({ ...prev, [field]: true }));
    const errorMsg = validateFamilyField(field, familyForm[field as keyof typeof familyForm]);
    setFamilyErrors(prev => ({ ...prev, [field]: errorMsg }));
  };

  const openAddFamilyModal = () => {
    setEditingMember(null);
    setFamilyForm(initialFamilyForm);
    setFamilyErrors({});
    setFamilyTouched({});
    setAddFamilyModalOpen(true);
  };

  const openEditFamilyModal = (member: FamilyMember) => {
    setEditingMember(member);
    setFamilyForm({
      name: member.name || '',
      relation: member.relation || 'Spouse',
      age: member.age ? String(member.age) : '',
      gender: member.gender || 'Prefer not to say',
      phone: member.phone || '',
      blood_group: member.blood_group || 'Unknown',
      medical_needs: member.medical_needs || 'None',
      is_emergency_contact: Boolean(member.is_emergency_contact),
      status: member.status || 'Safe',
      location: member.location || 'Home',
      govt_id: member.govt_id || '',
      notes: member.notes || ''
    });
    setFamilyErrors({});
    setFamilyTouched({});
    setAddFamilyModalOpen(true);
  };

  const handleFamilyFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const touchedObj = { name: true, relation: true, age: true, phone: true };
    setFamilyTouched(touchedObj);

    const nameErr = validateFamilyField('name', familyForm.name);
    const relErr = validateFamilyField('relation', familyForm.relation);
    const ageErr = validateFamilyField('age', familyForm.age);
    const phoneErr = validateFamilyField('phone', familyForm.phone);

    const errors = { name: nameErr, relation: relErr, age: ageErr, phone: phoneErr };
    setFamilyErrors(errors);

    if (nameErr || relErr || ageErr || phoneErr) {
      return;
    }

    setFormSubmitting(true);

    const payload = {
      name: familyForm.name,
      relation: familyForm.relation,
      age: familyForm.age ? parseInt(familyForm.age, 10) : null,
      gender: familyForm.gender,
      phone: familyForm.phone || null,
      blood_group: familyForm.blood_group,
      medical_needs: familyForm.medical_needs,
      is_emergency_contact: familyForm.is_emergency_contact,
      status: familyForm.status,
      location: familyForm.location,
      govt_id: familyForm.govt_id || null,
      notes: familyForm.notes || null
    };

    try {
      if (editingMember) {
        const updated = await updateFamilyMember(editingMember.id, payload);
        setFamilyMembers(prev => prev.map(m => m.id === editingMember.id ? updated : m));
      } else {
        const created = await createFamilyMember(payload);
        setFamilyMembers(prev => [...prev, created]);
      }
      setAddFamilyModalOpen(false);
      setEditingMember(null);
      setFamilyForm(initialFamilyForm);
    } catch (err: any) {
      // Fallback state if server unavailable
      const fallbackMember: FamilyMember = {
        id: editingMember ? editingMember.id : Date.now(),
        ...payload,
        status: payload.status || 'Safe',
        last_checkin: 'Just now'
      };
      if (editingMember) {
        setFamilyMembers(prev => prev.map(m => m.id === editingMember.id ? fallbackMember : m));
      } else {
        setFamilyMembers(prev => [...prev, fallbackMember]);
      }
      setAddFamilyModalOpen(false);
      setEditingMember(null);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (memberId: number, newStatus: string) => {
    setFamilyMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: newStatus, last_checkin: 'Just now' } : m));
    try {
      await patchFamilyMemberStatus(memberId, newStatus);
    } catch (err) {
      console.warn('Backend patch status note:', err);
    }
  };

  const handleDeleteMemberConfirm = async () => {
    if (!deleteConfirmMember) return;
    const targetId = deleteConfirmMember.id;
    setFamilyMembers(prev => prev.filter(m => m.id !== targetId));
    setDeleteConfirmMember(null);
    try {
      await deleteFamilyMemberRecord(targetId);
    } catch (err) {
      console.warn('Backend delete member note:', err);
    }
  };

  // Relief & Compensation Claims Data
  const reliefClaims: any[] = [];

  // Map Markers Data
  const mapMarkers: any[] = [];

  // AI Chat Handler
  const handleSendChatMessage = (msgText?: string) => {
    const query = msgText || chatInput;
    if (!query.trim()) return;

    const userMsg = { sender: 'user' as const, text: query, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, userMsg]);
    if (!msgText) setChatInput('');

    setTimeout(() => {
      let replyText = `Thank you for reaching out. Based on official KSDMA guidelines for ${selectedDistrict}:`;
      const qLower = query.toLowerCase();

      if (qLower.includes('shelter') || qLower.includes('camp')) {
        replyText = `Nearest active relief camp in ${selectedDistrict} is St. Joseph Relief Camp, Meppadi (1.2 km away) with 185 available beds. Phone: +91 4936 240100. Would you like direct navigation?`;
      } else if (qLower.includes('landslide') || qLower.includes('hill')) {
        replyText = `Landslide Advisory: An Orange Alert is active for hilly regions in ${selectedDistrict}. Keep clear of steep slopes, move to safer valley relief camps if mud cracks or unusual stream turbidity appear. Emergency helpline: 1077.`;
      } else if (qLower.includes('sos') || qLower.includes('help') || qLower.includes('emergency')) {
        replyText = `EMERGENCY ALERT: Press the red Emergency SOS button on top of your dashboard to send immediate GPS coordinates to the District Control Room and 112 ERSS units!`;
      } else if (qLower.includes('compensation') || qLower.includes('relief') || qLower.includes('money')) {
        replyText = `You have 1 active compensation claim (CLM-2026-4412 for Flood Damage) approved by District Collector. Disbursement of ₹25,000 is scheduled within 48 hours to your linked bank account.`;
      } else {
        replyText = `Control Room Advisory: Current weather in ${selectedDistrict} shows 28°C with moderate to heavy rain. Dial 1077 (DDMA) or 112 for rapid emergency response.`;
      }

      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 600);
  };

  // SOS Dispatch Trigger
  const handleTriggerSOS = () => {
    setSosTriggered(true);
    setTimeout(() => {
      alert(`🚨 EMERGENCY SOS DISPATCHED!\n\nYour GPS Location (${userLocation ? userLocation.lat.toFixed(4) : '11.6050'}, ${userLocation ? userLocation.lng.toFixed(4) : '76.0830'}) and emergency distress call have been broadcast to:\n- Kerala Police ERSS (112)\n- ${selectedDistrict} District Disaster Control Room (1077)\n- NDRF Local Rapid Response Unit`);
      setSosModalOpen(false);
      setSosTriggered(false);
    }, 1200);
  };

  // Add Incident Submit
  const handleAddIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReport = {
      id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      type: newIncident.type,
      location: newIncident.location,
      date: 'Just Now',
      status: 'Pending',
      severity: newIncident.severity,
      details: newIncident.description || 'Incident submitted via Citizen Dashboard portal.'
    };
    setIncidentReports([newReport, ...incidentReports]);
    setReportModalOpen(false);
    setNewIncident({ type: 'Flash Flood', location: selectedDistrict, description: '', severity: 'Medium' });
    alert('✅ Incident Report submitted successfully to District Disaster Management Authority.');
  };

  // Sidebar Menu Navigation items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'weather', label: 'Weather & Alerts', icon: CloudSun },
    { id: 'map', label: 'Live Disaster Map', icon: MapPin },
    { id: 'report-incident', label: '🚨 Report Incident', icon: AlertTriangle, action: () => setActiveMenu('report-incident') },
    { id: 'sos', label: 'Emergency SOS', icon: Radio, action: () => setSosModalOpen(true) },
    { id: 'shelters', label: 'Nearby Shelters', icon: Home },
    { id: 'services', label: 'Emergency Services', icon: PhoneCall },
    { id: 'my-reports', label: 'My Reports', icon: FileText, action: () => setActiveMenu('my-reports') },
    { id: 'family', label: 'Family Safety', icon: Users },
    { id: 'relief', label: 'Relief & Compensation', icon: Coins },
    { id: 'preparedness', label: 'Disaster Preparedness', icon: BookOpen },
    { id: 'ai-assistant', label: 'AI Disaster Assistant', icon: Bot }
  ];

  // =========================================================================
  // VIEW RENDERER FOR THE RIGHT WORKSPACE PANE
  // =========================================================================
  const renderRightWorkspaceView = () => {
    switch (activeMenu) {
      case 'report-incident':
        return (
          <ReportIncidentPage
            onBackToDashboard={() => setActiveMenu('dashboard')}
            onViewIncidentDetails={(id) => {
              setSelectedReportId(id);
              setActiveMenu('incident-detail');
            }}
          />
        );

      case 'my-reports':
        return (
          <MyReportsPage
            onBackToDashboard={() => setActiveMenu('dashboard')}
            onViewDetails={(id) => {
              setSelectedReportId(id);
              setActiveMenu('incident-detail');
            }}
            onNewReport={() => setActiveMenu('report-incident')}
          />
        );

      case 'incident-detail':
        return (
          <CitizenIncidentDetailsPage
            incidentId={selectedReportId}
            onBack={() => setActiveMenu('my-reports')}
          />
        );

      // -----------------------------------------------------------------------
      // 1. DASHBOARD OVERVIEW VIEW
      // -----------------------------------------------------------------------
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Welcome & Active Emergency Alert Banner */}
            <section className="space-y-4">
              {disasterAlerts.length > 0 && activeAlertBanner && (
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-4 border border-orange-400">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
                    </div>
                    <div>
                      <p className="font-bold text-sm tracking-wide">
                        🔴 ORANGE ALERT: Heavy Rainfall Warning issued for {selectedDistrict} & Idukki
                      </p>
                      <p className="text-xs text-white/90">
                        IMD forecast heavy to very heavy rainfall for next 24 hours. High risk of landslides in hilly catchments.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveMenu('weather')}
                      className="bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs whitespace-nowrap"
                    >
                      View Advisory
                    </button>
                    <button
                      onClick={() => setActiveAlertBanner(false)}
                      className="p-1.5 text-white/80 hover:text-white rounded-lg"
                      title="Dismiss"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </section>



            {/* Statistic Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveMenu('weather')}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 cursor-pointer hover:border-amber-300 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Active Alerts</p>
                  <p className="text-2xl font-black text-slate-900">{disasterAlerts.length} Alerts</p>
                  <span className="text-[11px] text-amber-600 font-bold">{disasterAlerts.length > 0 ? `${disasterAlerts.length} Active` : 'All Safe'}</span>
                </div>
              </div>

              <div
                onClick={() => setActiveMenu('shelters')}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 cursor-pointer hover:border-emerald-300 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0E8F66] flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Nearby Shelters</p>
                  <p className="text-2xl font-black text-slate-900">{nearbyShelters.length} Open</p>
                  <span className="text-[11px] text-emerald-600 font-bold">{nearbyShelters.length > 0 ? 'Beds Available' : 'No Active Camps'}</span>
                </div>
              </div>

              <div
                onClick={() => setActiveMenu('my-reports')}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 cursor-pointer hover:border-blue-300 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">My Reports</p>
                  <p className="text-2xl font-black text-slate-900">{incidentReports.length} Submitted</p>
                  <span className="text-[11px] text-blue-600 font-bold">{incidentReports.length > 0 ? 'Active Reports' : 'No Submissions'}</span>
                </div>
              </div>

              <div
                onClick={() => setActiveMenu('weather')}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 cursor-pointer hover:border-teal-300 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                  <CloudSun className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Current Weather</p>
                  <p className="text-2xl font-black text-slate-900">28°C Rain</p>
                  <span className="text-[11px] text-teal-600 font-bold">92% Humidity &bull; 24km/h</span>
                </div>
              </div>
            </section>

            {/* Overview Quick Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Alerts Preview */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900">Recent Alerts Overview</h3>
                  <button onClick={() => setActiveMenu('weather')} className="text-xs font-bold text-[#0E8F66] hover:underline">
                    View All &rarr;
                  </button>
                </div>
                <div className="space-y-3">
                  {disasterAlerts.slice(0, 2).map(alt => (
                    <div key={alt.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-700 uppercase font-mono">{alt.severity} ALERT</span>
                        <span className="text-[10px] text-slate-400">{alt.time}</span>
                      </div>
                      <p className="font-bold text-slate-900">{alt.title}</p>
                      <p className="text-slate-500 text-[11px]">{alt.district}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Incident Reports Quick Snippet */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900">My Reports Summary</h3>
                  <button onClick={() => setActiveMenu('my-reports')} className="text-xs font-bold text-[#0E8F66] hover:underline">
                    Manage Reports &rarr;
                  </button>
                </div>
                <div className="space-y-3">
                  {incidentReports.slice(0, 2).map(rep => (
                    <div key={rep.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{rep.type}</p>
                        <p className="text-[11px] text-slate-500">{rep.location}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0B4D3B]">
                        {rep.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // 2. WEATHER & DISASTER ALERTS VIEW
      // -----------------------------------------------------------------------
      case 'weather':
        return (
          <div className="space-y-6 animate-fade-in">
            <WeatherTelemetryDashboard
              weatherData={weatherData}
              loading={loading}
              error={error}
              onRefresh={refreshLocation}
              allKeralaAlerts={disasterAlerts}
            />
          </div>
        );

      // -----------------------------------------------------------------------
      // 3. LIVE DISASTER MAP VIEW
      // -----------------------------------------------------------------------
      case 'map':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Live Disaster Operations Map</h1>
                <p className="text-xs text-slate-500">Interactive GIS mapping with shelters, hospitals, police, fire force, and hazard zones</p>
              </div>
              <span className="bg-emerald-100 text-[#0B4D3B] text-xs font-bold px-3 py-1 rounded-full">
                Telemetry Live &bull; {selectedDistrict} Sector
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-[#0E8F66]" />
                    <h2 className="font-bold text-base text-slate-900">Operations Map Canvas</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {Object.keys(mapLayerFilters).map((key) => (
                      <button
                        key={key}
                        onClick={() => setMapLayerFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all capitalize ${mapLayerFilters[key]
                            ? 'bg-[#EAF8F3] border-emerald-300 text-[#0B4D3B]'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                      >
                        {key.replace(/([A-Z])/g, ' $1')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative flex-1 min-h-[460px] bg-slate-900 p-4 flex flex-col justify-between overflow-hidden group">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0E8F66_1px,transparent_1px)] [background-size:16px_16px]"></div>

                  <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
                    <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span>GPS: {selectedDistrict} Sector &bull; 11.605° N, 76.083° E</span>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Layers Active: 9</span>
                    </div>
                  </div>

                  <div className="relative z-10 my-auto grid grid-cols-3 gap-6 p-4 max-w-lg mx-auto">
                    {mapMarkers.map((marker) => (
                      <div
                        key={marker.id}
                        onClick={() => setSelectedMapMarker(marker)}
                        className="bg-slate-800/90 border border-slate-700 hover:border-[#0E8F66] p-3 rounded-2xl cursor-pointer hover:scale-105 transition-all text-white shadow-lg flex flex-col items-center text-center group/pin"
                      >
                        <span className="text-2xl mb-1 group-hover/pin:animate-bounce">{marker.icon}</span>
                        <p className="text-xs font-bold truncate max-w-full">{marker.name}</p>
                        <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">{marker.status}</span>
                      </div>
                    ))}
                  </div>

                  <div className="relative z-10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Safe Evacuation Route Cleared via NH766</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button className="p-2 bg-slate-800 text-white rounded-xl border border-slate-700 hover:bg-slate-700">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-slate-800 text-white rounded-xl border border-slate-700 hover:bg-slate-700">
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between space-y-6">
                <div>
                  <h2 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
                    Map Location Info
                  </h2>
                  <div className="my-4 space-y-3 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <p className="font-bold text-slate-800">Current Sector</p>
                      <p className="text-slate-600 mt-0.5">{selectedDistrict} District Catchment</p>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <p className="font-bold text-slate-800">Nearest Relief Camp</p>
                      <p className="text-[#0E8F66] font-bold mt-0.5">St. Joseph Relief Shelter (1.2 km)</p>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <p className="font-bold text-slate-800">Active Hazards</p>
                      <p className="text-amber-700 font-bold mt-0.5">Orange Alert Landslide Slope Risk</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => alert(`🧭 Navigating to nearest shelter in ${selectedDistrict}...`)}
                  className="w-full bg-[#0E8F66] hover:bg-[#0B4D3B] text-white text-xs font-bold py-3 rounded-xl shadow-xs flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Navigate to Safe Zone</span>
                </button>
              </div>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // 4. NEARBY SHELTERS VIEW
      // -----------------------------------------------------------------------
      case 'shelters':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Active Nearby Relief Shelters</h1>
                <p className="text-xs text-slate-500">Government recognized relief camps with real-time bed capacity</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {selectedDistrict} District &bull; 14 Open Camps
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {nearbyShelters.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3 col-span-full">
                  <Home className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-base">No Relief Shelters Listed</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    There are currently no relief camps active for {selectedDistrict} district. For immediate assistance, contact helpline 1077.
                  </p>
                </div>
              ) : (
                nearbyShelters.map((shelter) => (
                <div key={shelter.id} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold bg-emerald-100 text-[#0B4D3B] px-2.5 py-0.5 rounded-full">
                        {shelter.status}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{shelter.availableBeds} Beds Open</span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{shelter.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0E8F66]" />
                      <span>{shelter.location}</span>
                    </p>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                        <span>Capacity Used</span>
                        <span>{shelter.capacity - shelter.availableBeds} / {shelter.capacity}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0E8F66] rounded-full"
                          style={{ width: `${((shelter.capacity - shelter.availableBeds) / shelter.capacity) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {shelter.facilities.map((fac: any, idx: number) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                          ✓ {fac}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => alert(`🧭 Navigating to ${shelter.name}...`)}
                      className="flex-1 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Navigate</span>
                    </button>
                    <a
                      href={`tel:${shelter.contact}`}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                      title="Call Shelter Officer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );

      // -----------------------------------------------------------------------
      // 5. EMERGENCY SERVICES VIEW
      // -----------------------------------------------------------------------
      case 'services':
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Emergency Response Services</h1>
              <p className="text-xs text-slate-500">Quick-dial official emergency desks for immediate assistance</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <a href="tel:108" className="bg-rose-50 border border-rose-200 hover:bg-rose-100 p-5 rounded-3xl text-center space-y-2 group transition-all">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white mx-auto flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <p className="font-bold text-xs text-slate-900">Ambulance Service</p>
                <p className="text-xl font-black text-rose-600">108</p>
              </a>

              <a href="tel:101" className="bg-orange-50 border border-orange-200 hover:bg-orange-100 p-5 rounded-3xl text-center space-y-2 group transition-all">
                <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white mx-auto flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <p className="font-bold text-xs text-slate-900">Fire & Rescue</p>
                <p className="text-xl font-black text-orange-600">101</p>
              </a>

              <a href="tel:112" className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 p-5 rounded-3xl text-center space-y-2 group transition-all">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Shield className="w-6 h-6" />
                </div>
                <p className="font-bold text-xs text-slate-900">Kerala Police (ERSS)</p>
                <p className="text-xl font-black text-indigo-600">112</p>
              </a>

              <a href="tel:1077" className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 p-5 rounded-3xl text-center space-y-2 group transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#0E8F66] text-white mx-auto flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Building2 className="w-6 h-6" />
                </div>
                <p className="font-bold text-xs text-slate-900">District Control Room</p>
                <p className="text-xl font-black text-[#0E8F66]">1077</p>
              </a>

              <a href="tel:1070" className="bg-teal-50 border border-teal-200 hover:bg-teal-100 p-5 rounded-3xl text-center space-y-2 group transition-all">
                <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white mx-auto flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Phone className="w-6 h-6" />
                </div>
                <p className="font-bold text-xs text-slate-900">State Disaster Helpline</p>
                <p className="text-xl font-black text-teal-700">1070</p>
              </a>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // 6. MY INCIDENT REPORTS VIEW
      // -----------------------------------------------------------------------
      case 'my-reports':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900">My Incident Reports</h1>
                <p className="text-xs text-slate-500">Track verification status of incidents reported by you</p>
              </div>
              <button
                onClick={() => setReportModalOpen(true)}
                className="bg-[#0E8F66] hover:bg-[#0B4D3B] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Report New Incident</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              {incidentReports.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-base">No Incident Reports Submitted</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    You haven't submitted any incident reports. Click the button below to report an emergency or hazard in your area.
                  </p>
                  <button
                    onClick={() => setReportModalOpen(true)}
                    className="bg-[#0E8F66] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xs hover:bg-[#0B4D3B] transition-all inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Report New Incident</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-3.5">Incident ID & Type</th>
                        <th className="p-3.5">Location</th>
                        <th className="p-3.5">Date & Time</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incidentReports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            <div>{report.type}</div>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">{report.id}</span>
                          </td>
                          <td className="p-3.5 text-slate-600 font-medium">{report.location}</td>
                          <td className="p-3.5 text-slate-500">{report.date}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${report.status === 'Verified'
                                  ? 'bg-emerald-100 text-[#0B4D3B]'
                                  : report.status === 'Resolved'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                            >
                              {report.status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <button
                              onClick={() => setSelectedReportDetails(report)}
                              className="text-[#0E8F66] font-bold hover:underline"
                            >
                              View Details
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
        );

      // -----------------------------------------------------------------------
      // 7. FAMILY SAFETY VIEW
      // -----------------------------------------------------------------------
      case 'family': {
        const filteredFamily = familyMembers.filter((m) => {
          const matchFilter =
            familyStatusFilter === 'ALL' ||
            (familyStatusFilter === 'In Distress / Missing'
              ? m.status === 'In Distress' || m.status === 'Missing'
              : m.status === familyStatusFilter);

          const q = familySearch.toLowerCase().trim();
          const matchSearch =
            !q ||
            m.name.toLowerCase().includes(q) ||
            m.relation.toLowerCase().includes(q) ||
            (m.phone && m.phone.includes(q)) ||
            (m.blood_group && m.blood_group.toLowerCase().includes(q)) ||
            (m.location && m.location.toLowerCase().includes(q));

          return matchFilter && matchSearch;
        });

        const safeCount = familyMembers.filter(m => m.status === 'Safe').length;
        const shelterCount = familyMembers.filter(m => m.status === 'In Shelter').length;
        const distressCount = familyMembers.filter(m => m.status === 'In Distress' || m.status === 'Missing').length;
        const medicalCount = familyMembers.filter(m => m.medical_needs && m.medical_needs !== 'None').length;

        return (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-7 h-7 text-[#0E8F66]" />
                  Family Safety Status
                </h1>
                <p className="text-xs text-slate-500">
                  Monitor live safety check-ins, medical vulnerabilities & emergency contact info
                </p>
              </div>
              <button
                onClick={openAddFamilyModal}
                className="text-xs font-bold text-white bg-[#0E8F66] hover:bg-[#0B4D3B] px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Add Family Member
              </button>
            </div>

            {/* Disaster Safety Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <p className="text-[11px] font-bold text-slate-500">Total Registered</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{familyMembers.length}</p>
              </div>

              <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
                <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Safe
                </p>
                <p className="text-xl font-black text-emerald-900 mt-0.5">{safeCount}</p>
              </div>

              <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200/80 shadow-2xs">
                <p className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-blue-600" /> In Shelter
                </p>
                <p className="text-xl font-black text-blue-900 mt-0.5">{shelterCount}</p>
              </div>

              <div className="bg-rose-50/80 p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs">
                <p className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> Emergency
                </p>
                <p className="text-xl font-black text-rose-900 mt-0.5">{distressCount}</p>
              </div>

              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-amber-600" /> Vulnerable
                </p>
                <p className="text-xl font-black text-amber-900 mt-0.5">{medicalCount}</p>
              </div>
            </div>

            {/* Main Safety Status Card Container */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              {/* Citizen Personal Safety Check-in Banner */}
              <div className="bg-[#EAF8F3] border border-emerald-200/80 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0E8F66] text-white flex items-center justify-center shadow-xs">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0B4D3B]">Your Current Check-in Status</p>
                    <p className="text-xs text-emerald-800">
                      {userIsSafe ? `Marked SAFE • ${lastSafeTime}` : 'Distress Alert Active'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserIsSafe(!userIsSafe);
                    setLastSafeTime('Just Now');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${userIsSafe
                    ? 'bg-[#0E8F66] text-white hover:bg-[#0B4D3B]'
                    : 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                    }`}
                >
                  {userIsSafe ? '✓ I am Safe' : 'Mark Myself Safe'}
                </button>
              </div>

              {/* Search and Status Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={familySearch}
                    onChange={(e) => setFamilySearch(e.target.value)}
                    placeholder="Search member by name, phone, blood group, shelter..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                  />
                  {familySearch && (
                    <button
                      onClick={() => setFamilySearch('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold text-slate-600 overflow-x-auto">
                  {(['ALL', 'Safe', 'In Shelter', 'In Distress / Missing'] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      onClick={() => setFamilyStatusFilter(filterOpt)}
                      className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${familyStatusFilter === filterOpt
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'hover:text-slate-900'
                        }`}
                    >
                      {filterOpt === 'ALL' ? 'All Members' : filterOpt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Family Member Cards List */}
              <div className="space-y-3 pt-2">
                {loadingFamily ? (
                  <div className="p-10 text-center text-xs text-slate-400 animate-pulse">
                    Syncing family member status from database...
                  </div>
                ) : filteredFamily.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <Users className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-800 text-base">
                      {familyMembers.length === 0 ? 'No Family Members Registered' : 'No Matching Family Members'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {familyMembers.length === 0
                        ? 'Click "+ Add Family Member" above to register family safety check-ins, medical vulnerability info, and shelter status.'
                        : 'Try adjusting your search query or status filter above.'}
                    </p>
                  </div>
                ) : (
                  filteredFamily.map((member) => {
                    const statusBg =
                      member.status === 'Safe'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : member.status === 'In Shelter'
                          ? 'bg-blue-50 border-blue-200 text-blue-800'
                          : member.status === 'Missing'
                            ? 'bg-purple-50 border-purple-200 text-purple-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800 animate-pulse';

                    const cleanPhone = member.phone ? member.phone.replace(/[\s\-\+\(\)]/g, '') : '';

                    return (
                      <div
                        key={member.id}
                        className="p-4 bg-slate-50/90 hover:bg-slate-50 rounded-2xl border border-slate-200/70 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-11 h-11 rounded-2xl font-black flex items-center justify-center text-base flex-shrink-0 shadow-2xs ${member.status === 'Safe'
                                ? 'bg-emerald-600 text-white'
                                : member.status === 'In Shelter'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-rose-600 text-white'
                                }`}
                            >
                              {member.name.charAt(0).toUpperCase()}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-sm text-slate-900">{member.name}</h4>
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                                  {member.relation}
                                </span>
                                {member.is_emergency_contact && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3 text-rose-600" /> Primary Contact
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500 mt-0.5">
                                {member.age ? `${member.age} yrs` : ''}
                                {member.gender && member.gender !== 'Prefer not to say' ? ` • ${member.gender}` : ''}
                                {member.phone ? ` • ${member.phone}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Quick Status Dropdown */}
                          <div className="flex items-center gap-2">
                            <select
                              value={member.status || 'Safe'}
                              onChange={(e) => handleQuickStatusChange(member.id, e.target.value)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${statusBg}`}
                            >
                              <option value="Safe">● Safe</option>
                              <option value="In Shelter">● In Shelter</option>
                              <option value="In Distress">🚨 In Distress</option>
                              <option value="Missing">❓ Missing</option>
                            </select>
                          </div>
                        </div>

                        {/* Disaster App Specific Badges Row */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          {member.blood_group && member.blood_group !== 'Unknown' && (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-extrabold border border-rose-200/80">
                              🩸 Blood: {member.blood_group}
                            </span>
                          )}

                          {member.medical_needs && member.medical_needs !== 'None' && (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200/80 flex items-center gap-1">
                              <HeartPulse className="w-3.5 h-3.5 text-amber-600" /> {member.medical_needs}
                            </span>
                          )}

                          <span className="px-2.5 py-1 rounded-lg bg-slate-200/70 text-slate-800 font-semibold flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" /> Location: {member.location || 'Home'}
                          </span>

                          {member.govt_id && (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-200/50 text-slate-700 font-mono text-[10px]">
                              ID: {member.govt_id}
                            </span>
                          )}
                        </div>

                        {/* Special Instructions / Medical Notes */}
                        {member.notes && (
                          <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl text-xs text-amber-950 font-medium flex items-start gap-2">
                            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span><strong>Emergency Notes:</strong> {member.notes}</span>
                          </div>
                        )}

                        {/* Card Bottom Toolbar / Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">
                            Last status check-in: {member.last_checkin || 'Recently'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {member.phone && (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1 px-2.5"
                                  title="Call Emergency Number"
                                >
                                  <Phone className="w-3.5 h-3.5" /> Call
                                </a>
                                <a
                                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${member.name}, checking your safety status via SAHAY Disaster Response Portal.`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-bold flex items-center gap-1 px-2.5"
                                  title="WhatsApp Alert"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                                </a>
                              </>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditFamilyModal(member)}
                              className="p-1.5 rounded-lg bg-slate-200/70 text-slate-700 hover:bg-slate-300 hover:text-slate-900 font-bold flex items-center gap-1 px-2.5 transition-colors"
                              title="Edit Member Details"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Edit
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteConfirmMember(member)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 font-bold flex items-center gap-1 px-2.5 transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // 8. RELIEF & COMPENSATION TRACKER VIEW
      // -----------------------------------------------------------------------
      case 'relief':
        return (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Relief & Compensation Tracker</h1>
              <p className="text-xs text-slate-500">Track progress of disaster financial assistance applications</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              {reliefClaims.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Coins className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="font-bold text-slate-800 text-base">No Active Relief Claims</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No active compensation or financial relief applications found for your profile.
                  </p>
                </div>
              ) : (
                reliefClaims.map((claim) => (
                  <div key={claim.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono text-slate-400">{claim.id}</span>
                        <h4 className="font-bold text-sm text-slate-900">{claim.title}</h4>
                      </div>
                      <span className="text-base font-black text-[#0E8F66] bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                        {claim.amount}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>Status: <strong className="text-[#0B4D3B]">{claim.status}</strong></span>
                        <span>Step {claim.currentStep} of 4</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {claim.steps.map((stepName: any, sIdx: number) => {
                          const isDone = sIdx + 1 <= claim.currentStep;
                          return (
                            <div
                              key={sIdx}
                              className={`h-2.5 rounded-full transition-all ${isDone ? 'bg-[#0E8F66]' : 'bg-slate-200'
                                }`}
                              title={stepName}
                            ></div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                      <span>Updated {claim.updatedAt}</span>
                      <button className="text-[#0E8F66] font-bold hover:underline">View Claim Audit Log</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // 9. DISASTER PREPAREDNESS VIEW
      // -----------------------------------------------------------------------
      case 'preparedness':
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Disaster Preparedness & Safety Guides</h1>
              <p className="text-xs text-slate-500">Official KSDMA safety guidelines and interactive emergency kit checklist</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => setSelectedTipModal({
                  title: 'Flood Safety Protocols',
                  tips: [
                    'Move immediately to higher ground or upper floors upon flood warning.',
                    'Do not walk or drive through flowing water (6 inches of swift water can sweep adults).',
                    'Switch off main electricity grid and gas lines before evacuating.',
                    'Boil drinking water thoroughly before consuming.'
                  ]
                })}
                className="p-5 rounded-3xl border border-slate-200 hover:border-[#0E8F66] bg-white cursor-pointer transition-all space-y-3 shadow-xs group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
                  🌊
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-[#0B4D3B]">Flood Safety Guide</h3>
                <p className="text-xs text-slate-500">Immediate actions for flash floods, river overflows & heavy inundation.</p>
                <span className="text-xs font-bold text-[#0E8F66] block">Read Safety Rules &rarr;</span>
              </div>

              <div
                onClick={() => setSelectedTipModal({
                  title: 'Landslide Safety Protocols',
                  tips: [
                    'Watch for slope mud cracks, unusual soil bulges, or murky stream runoff.',
                    'Evacuate immediately if mud slide rumbles or trees tilt unusually.',
                    'Stay away from steep embankment slopes during torrential rain.',
                    'Inform Village Officer or 1077 DDMA control room.'
                  ]
                })}
                className="p-5 rounded-3xl border border-slate-200 hover:border-[#0E8F66] bg-white cursor-pointer transition-all space-y-3 shadow-xs group"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl">
                  ⛰️
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-[#0B4D3B]">Landslide Safety Guide</h3>
                <p className="text-xs text-slate-500">Crucial precautions for hilly catchments in Wayanad & Idukki.</p>
                <span className="text-xs font-bold text-[#0E8F66] block">Read Safety Rules &rarr;</span>
              </div>

              <div className="p-5 rounded-3xl border border-emerald-200 bg-[#EAF8F3] space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-[#0B4D3B]">Emergency Kit Checklist</h3>
                  <span className="text-xs font-bold bg-[#0E8F66] text-white px-2.5 py-0.5 rounded-full">
                    {Object.values(kitChecklist).filter(Boolean).length} / {Object.keys(kitChecklist).length} Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(kitChecklist).map(([itemKey, checked]) => (
                    <label key={itemKey} className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium bg-white p-2 rounded-xl border border-emerald-100">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setKitChecklist(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                        className="w-4 h-4 text-[#0E8F66] rounded border-slate-300 focus:ring-[#0E8F66]"
                      />
                      <span className="capitalize">{itemKey.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // 10. AI DISASTER ASSISTANT VIEW
      // -----------------------------------------------------------------------
      case 'ai-assistant':
        return (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0B4D3B] to-[#0E8F66] text-white flex items-center justify-center shadow-md">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  SAHAY AI Disaster Assistant
                  <span className="bg-emerald-100 text-[#0B4D3B] text-xs font-bold px-2.5 py-0.5 rounded-full">AI Powered</span>
                </h1>
                <p className="text-xs text-slate-500">Ask emergency questions, shelter queries, or safety guidance</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => handleSendChatMessage('Where is the nearest shelter in Wayanad?')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#EAF8F3] hover:text-[#0B4D3B] font-semibold text-slate-700 border border-slate-200/70 transition-all"
                >
                  📍 Nearest Shelter in Wayanad
                </button>
                <button
                  onClick={() => handleSendChatMessage('What to do during a landslide warning?')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#EAF8F3] hover:text-[#0B4D3B] font-semibold text-slate-700 border border-slate-200/70 transition-all"
                >
                  ⛰️ Landslide Warning Safety
                </button>
                <button
                  onClick={() => handleSendChatMessage('How to track my flood compensation claim?')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#EAF8F3] hover:text-[#0B4D3B] font-semibold text-slate-700 border border-slate-200/70 transition-all"
                >
                  💰 Relief Claim Status
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 h-80 overflow-y-auto space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${msg.sender === 'user'
                          ? 'bg-[#0E8F66] text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                        }`}
                    >
                      <p className="font-medium">{msg.text}</p>
                      <span className={`text-[9px] block mt-1 ${msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your emergency query here..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E8F66]/30 focus:border-[#0E8F66]"
                />
                <button
                  onClick={() => handleSendChatMessage()}
                  className="bg-[#0E8F66] hover:bg-[#0B4D3B] text-white p-3 rounded-xl shadow-xs transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );

      // Default Fallback to Dashboard
      default:
        return (
          <div className="text-center py-12 text-slate-500 text-sm">
            Select a menu item from the left sidebar to view its details.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* 1. Official Government Header (TopHeader) */}
      <TopHeader
        currentLang={selectedLang}
        onLanguageChange={(lang) => setSelectedLang(lang)}
        onOpenContacts={() => setIsContactsOpen(true)}
        onOpenOfficialLogin={() => onNavigateToTab?.('official_login')}
      />

      {/* 2. Red Live Alert Ticker Bar (LiveAlertTicker) */}
      <LiveAlertTicker
        currentLang={selectedLang}
        onAlertClick={() => setActiveMenu('weather')}
      />

      {/* Main App Layout */}
      <div className="flex flex-1 relative overflow-hidden">

        {/* ========================================================================= */}
        {/* LEFT SIDEBAR */}
        {/* ========================================================================= */}
        <aside
          className={`bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 z-30 ${sidebarCollapsed ? 'w-20' : 'w-72'
            }`}
        >
          {/* Logo Branding - Clicking logo navigates to SAHAY Home Page */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-emerald-50/50 to-transparent">
            <div
              onClick={() => onNavigateToTab?.('home')}
              className="flex items-center gap-3 overflow-hidden cursor-pointer group"
              title="Go to SAHAY Home Page"
            >
              <div className="w-12 h-12 rounded-full bg-white border-2 border-[#0E8F66] p-0.5 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                <img
                  src={logoSahay}
                  alt="SAHAY Site Logo"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo_sahay.png';
                  }}
                />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xl tracking-tight text-[#0B4D3B] group-hover:text-[#0E8F66] transition-colors">
                      SAHAY
                    </span>
                    <span className="text-[10px] uppercase font-bold bg-[#EAF8F3] text-[#0E8F66] px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                      GOV
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold truncate mt-0.5 group-hover:text-[#0E8F66] transition-colors">
                    Stronger Together, Safer Forever
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 text-slate-400 hover:text-[#0B4D3B] hover:bg-slate-100 rounded-lg transition-colors"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links - Clicking item updates activeMenu */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              const isDanger = item.id === 'sos';

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      setActiveMenu(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative ${isDanger
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/60'
                      : isActive
                        ? 'bg-[#EAF8F3] text-[#0B4D3B] font-semibold border-l-4 border-[#0E8F66] shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isDanger
                        ? 'text-red-600 animate-pulse'
                        : isActive
                          ? 'text-[#0E8F66]'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                  {isDanger && !sidebarCollapsed && (
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer User Section - Clickable Profile Avatar Card */}
          {!sidebarCollapsed && (
            <div className="p-3 m-3 relative">
              {/* Clickable User Card Button */}
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full p-2.5 bg-gradient-to-br from-emerald-50 to-[#EAF8F3] hover:from-emerald-100/70 hover:to-emerald-100/90 active:scale-[0.98] rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center justify-between gap-2.5 transition-all duration-200 cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#0E8F66] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-[#0B4D3B] truncate">{currentUser.name}</p>
                    <p className="text-[11px] font-medium text-emerald-700 truncate">{currentUser.district} &bull; Citizen</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#0E8F66] transition-transform duration-200 flex-shrink-0 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Interactive Dropdown Popover Menu */}
              {userMenuOpen && (
                <>
                  {/* Backdrop overlay to close menu when clicking outside */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                  />

                  <div className="absolute bottom-full left-0 right-0 mb-2 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 space-y-1 animate-fadeIn">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Account Options</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</p>
                    </div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigateToTab?.('profile_settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#0B4D3B] transition-colors"
                    >
                      <User className="w-4 h-4 text-[#0E8F66]" />
                      <span>Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onNavigateToTab?.('profile_settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#0B4D3B] transition-colors"
                    >
                      <Settings className="w-4 h-4 text-emerald-600" />
                      <span>Settings</span>
                    </button>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onSignOut?.();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </aside>

        {/* ========================================================================= */}
        {/* MAIN WORKSPACE CONTENT */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-[calc(100vh-28px)] bg-[#F8FAFC]">

          {/* TOP NAVIGATION BAR - Clean & Minimal with 🚨 Report Incident & Notification Bell */}
          <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-6 py-3 shadow-2xs flex items-center justify-between gap-4">
            <button
              onClick={() => setActiveMenu('report-incident')}
              className="bg-[#043e2e] hover:bg-[#065f46] text-white font-black px-4 py-2 rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 active:scale-95 border border-emerald-800"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>🚨 Report Incident</span>
            </button>

            <div className="flex items-center gap-3">
              <NotificationBell onSelectNotification={(refId) => {
                if (refId) {
                  setSelectedReportId(refId);
                  setActiveMenu('incident-detail');
                } else {
                  setActiveMenu('my-reports');
                }
              }} />

              {/* Live Weather Summary Pill */}
              <div className="hidden sm:flex items-center gap-2.5 bg-[#EAF8F3] text-[#0B4D3B] px-4 py-1.5 rounded-full border border-emerald-200/80 text-xs font-semibold shadow-2xs">
                <CloudSun className="w-4 h-4 text-[#0E8F66]" />
                <span>28°C Moderate Rain</span>
              </div>
            </div>
          </header>

          {/* DASHBOARD WORKSPACE BODY - Renders ONLY the selected activeMenu view */}
          <main className="p-6 max-w-7xl mx-auto w-full flex-1">
            {renderRightWorkspaceView()}
          </main>

          {/* FOOTER */}
          <footer className="mt-auto border-t border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            <p className="font-medium">
              &copy; 2026 Government of Kerala &bull; Department of Disaster Management (KSDMA) &bull; SAHAY Platform
            </p>
          </footer>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. EMERGENCY SOS MODAL */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-slide-down border border-red-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center animate-pulse">
                <Radio className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">EMERGENCY DISTRESS SOS</h3>
              <p className="text-xs text-slate-500">
                Transmitting immediate emergency alert with your live GPS location to Kerala Police (112) & Wayanad Control Room.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-700">Dispatch Payload Information:</p>
              <p className="text-slate-600">User: <strong>{currentUser.name}</strong> ({currentUser.phone})</p>
              <p className="text-slate-600">Location: <strong>{selectedDistrict} Sector (11.605° N, 76.083° E)</strong></p>
              <p className="text-slate-600">Battery Level: <strong>88%</strong> &bull; GPS Accuracy: <strong>High</strong></p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTriggerSOS}
                disabled={sosTriggered}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <Radio className="w-5 h-5 animate-pulse" />
                <span>{sosTriggered ? 'DISPATCHING...' : 'CONFIRM SOS DISPATCH'}</span>
              </button>
              <button
                onClick={() => setSosModalOpen(false)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. REPORT INCIDENT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-slide-down">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-lg text-slate-900">Report Disaster Incident</h3>
              </div>
              <button onClick={() => setReportModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIncidentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Incident Category</label>
                <select
                  value={newIncident.type}
                  onChange={(e) => setNewIncident({ ...newIncident, type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-[#0E8F66]"
                >
                  <option value="Flash Flood">Flash Flood / Waterlogging</option>
                  <option value="Landslide Warning">Landslide / Debris Movement</option>
                  <option value="Fallen Tree Line">Fallen Tree / Blocked Road</option>
                  <option value="Building Collapse">Building / Bridge Structural Damage</option>
                  <option value="Medical Emergency">Medical Rescue Needed</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Location / Panchayat</label>
                <input
                  type="text"
                  value={newIncident.location}
                  onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                  placeholder="e.g. Meppadi Town Road, Wayanad"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Severity Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Low', 'Medium', 'High'].map((sev) => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setNewIncident({ ...newIncident, severity: sev })}
                      className={`p-2 rounded-xl font-bold border transition-all ${newIncident.severity === sev
                          ? 'bg-[#0E8F66] text-white border-[#0E8F66]'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description & Details</label>
                <textarea
                  rows={3}
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  placeholder="Provide additional context (e.g. 2 vehicles trapped, power cable snapped)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900"
                ></textarea>
              </div>

              <div className="border border-dashed border-slate-300 p-4 rounded-2xl text-center space-y-1 bg-slate-50/50">
                <p className="font-bold text-slate-700 text-xs">📷 Attach Photo / Video Proof</p>
                <p className="text-[10px] text-slate-400">Click to upload photo from camera or gallery</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white font-bold rounded-xl shadow-xs"
                >
                  Submit Incident Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. REPORT DETAIL MODAL */}
      {selectedReportDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-slide-down">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400">{selectedReportDetails.id}</span>
                <h3 className="font-bold text-base text-slate-900">{selectedReportDetails.type}</h3>
              </div>
              <button onClick={() => setSelectedReportDetails(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600"><strong>Location:</strong> {selectedReportDetails.location}</p>
              <p className="text-slate-600"><strong>Reported Date:</strong> {selectedReportDetails.date}</p>
              <p className="text-slate-600"><strong>Severity:</strong> {selectedReportDetails.severity}</p>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mt-2">
                <p className="font-bold text-slate-800">Official Action Notes:</p>
                <p className="text-slate-600 mt-1">{selectedReportDetails.details}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedReportDetails(null)}
              className="w-full py-2.5 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. MAP MARKER POPUP MODAL */}
      {selectedMapMarker && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-slide-down">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedMapMarker.icon}</span>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{selectedMapMarker.name}</h3>
                  <span className="text-[10px] text-emerald-600 font-bold">{selectedMapMarker.status}</span>
                </div>
              </div>
              <button onClick={() => setSelectedMapMarker(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600">Coordinates: {selectedMapMarker.lat}° N, {selectedMapMarker.lng}° E</p>
              {selectedMapMarker.beds && <p className="text-slate-600 font-bold">Available Beds: {selectedMapMarker.beds}</p>}
              {selectedMapMarker.phone && <p className="text-slate-600">Contact: {selectedMapMarker.phone}</p>}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  alert(`Navigating to ${selectedMapMarker.name}`);
                  setSelectedMapMarker(null);
                }}
                className="flex-1 bg-[#0E8F66] text-white font-bold text-xs py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get Directions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PREPAREDNESS TIP DETAIL MODAL */}
      {selectedTipModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-slide-down">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">{selectedTipModal.title}</h3>
              <button onClick={() => setSelectedTipModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {selectedTipModal.tips.map((tip: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-[#0E8F66] flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">{tip}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedTipModal(null)}
              className="w-full py-2.5 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* 6. ADD / EDIT FAMILY MEMBER MODAL */}
      {addFamilyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-slide-down border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0E8F66]" />
                  {editingMember ? 'Edit Family Member' : 'Add Family Member'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingMember
                    ? 'Update family member safety profile & emergency details'
                    : 'Register family member details for disaster tracking & emergency contact'}
                </p>
              </div>
              <button
                onClick={() => setAddFamilyModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFamilyFormSubmit} className="space-y-4 text-xs">
              {/* Full Name Field */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={familyForm.name}
                  onChange={(e) => handleFamilyInputChange('name', e.target.value)}
                  onBlur={() => handleFamilyInputBlur('name')}
                  placeholder="e.g. Ramesh Nair"
                  className={`w-full bg-slate-50 border rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none transition-all ${familyTouched.name && familyErrors.name
                    ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                    : 'border-slate-200 focus:border-[#0E8F66] focus:bg-white'
                    }`}
                />
                {familyTouched.name && familyErrors.name && (
                  <p className="text-rose-600 text-[11px] font-semibold mt-1 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> {familyErrors.name}
                  </p>
                )}
              </div>

              {/* Relationship & Gender Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Relationship <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={familyForm.relation}
                    onChange={(e) => handleFamilyInputChange('relation', e.target.value)}
                    onBlur={() => handleFamilyInputBlur('relation')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Relative">Relative</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={familyForm.gender}
                    onChange={(e) => handleFamilyInputChange('gender', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                  >
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Age & Mobile Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={familyForm.age}
                    onChange={(e) => handleFamilyInputChange('age', e.target.value)}
                    onBlur={() => handleFamilyInputBlur('age')}
                    placeholder="e.g. 34"
                    min="0"
                    max="120"
                    className={`w-full bg-slate-50 border rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none transition-all ${familyTouched.age && familyErrors.age
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                      : 'border-slate-200 focus:border-[#0E8F66] focus:bg-white'
                      }`}
                  />
                  {familyTouched.age && familyErrors.age && (
                    <p className="text-rose-600 text-[11px] font-semibold mt-1 flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> {familyErrors.age}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={familyForm.phone}
                    onChange={(e) => handleFamilyInputChange('phone', e.target.value)}
                    onBlur={() => handleFamilyInputBlur('phone')}
                    placeholder="e.g. 9847000000"
                    className={`w-full bg-slate-50 border rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none transition-all ${familyTouched.phone && familyErrors.phone
                      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500'
                      : 'border-slate-200 focus:border-[#0E8F66] focus:bg-white'
                      }`}
                  />
                  {familyTouched.phone && familyErrors.phone && (
                    <p className="text-rose-600 text-[11px] font-semibold mt-1 flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> {familyErrors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Blood Group & Medical Vulnerability Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Blood Group</label>
                  <select
                    value={familyForm.blood_group}
                    onChange={(e) => handleFamilyInputChange('blood_group', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                  >
                    <option value="Unknown">Unknown / Not Specified</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Medical Need / Vulnerability</label>
                  <select
                    value={familyForm.medical_needs}
                    onChange={(e) => handleFamilyInputChange('medical_needs', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                  >
                    <option value="None">None (Healthy Adult)</option>
                    <option value="Elderly (60+ yrs)">Elderly (60+ yrs)</option>
                    <option value="Infant / Toddler (0-5 yrs)">Infant / Toddler (0-5 yrs)</option>
                    <option value="Pregnant / Nursing Mother">Pregnant / Nursing Mother</option>
                    <option value="Physical Disability">Physical Disability</option>
                    <option value="Daily Medication / Chronic Condition">Daily Medication / Chronic Condition</option>
                    <option value="Wheelchair User">Wheelchair User</option>
                    <option value="Other Special Needs">Other Special Needs</option>
                  </select>
                </div>
              </div>

              {/* Safety Check-in Status & Current Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Current Safety Status</label>
                  <select
                    value={familyForm.status}
                    onChange={(e) => handleFamilyInputChange('status', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                  >
                    <option value="Safe">● Safe</option>
                    <option value="In Shelter">● In Shelter</option>
                    <option value="In Distress">🚨 In Distress / Needs Help</option>
                    <option value="Missing">❓ Missing</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Location / Shelter Name</label>
                  <input
                    type="text"
                    value={familyForm.location}
                    onChange={(e) => handleFamilyInputChange('location', e.target.value)}
                    placeholder="e.g. Meppadi Home or St. Joseph Camp"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                  />
                </div>
              </div>

              {/* Govt Identification / Aadhaar */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Govt ID / Aadhaar Number (Optional)</label>
                <input
                  type="text"
                  value={familyForm.govt_id}
                  onChange={(e) => handleFamilyInputChange('govt_id', e.target.value)}
                  placeholder="e.g. Aadhaar last 4 digits (xxxx-4321)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
              </div>

              {/* Emergency Contact Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_emergency_contact"
                  checked={familyForm.is_emergency_contact}
                  onChange={(e) => handleFamilyInputChange('is_emergency_contact', e.target.checked)}
                  className="w-4 h-4 text-[#0E8F66] rounded border-slate-300 focus:ring-[#0E8F66]"
                />
                <label htmlFor="is_emergency_contact" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Mark as Primary Emergency Contact <span className="block text-[11px] font-normal text-slate-500">Notified immediately when Emergency SOS is triggered</span>
                </label>
              </div>

              {/* Emergency Notes / Medical Instructions */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Emergency Notes & Medical Instructions</label>
                <textarea
                  value={familyForm.notes}
                  onChange={(e) => handleFamilyInputChange('notes', e.target.value)}
                  placeholder="e.g. Requires daily insulin injections, wheelchair accessible evacuation needed..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-3 flex items-center gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddFamilyModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !!familyErrors.name || !!familyErrors.age || !!familyErrors.phone}
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl shadow-xs transition-all ${formSubmitting || !!familyErrors.name || !!familyErrors.age || !!familyErrors.phone
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-[#0E8F66] hover:bg-[#0B4D3B]'
                    }`}
                >
                  {formSubmitting
                    ? 'Saving...'
                    : editingMember
                      ? 'Update Member'
                      : 'Save Family Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6B. DELETE FAMILY MEMBER CONFIRMATION MODAL */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Remove Family Member</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong>{deleteConfirmMember.name}</strong> ({deleteConfirmMember.relation}) from your registered family safety list?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmMember(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMemberConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. EMERGENCY CONTACTS MODAL */}
      <EmergencyContactsModal
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
      />

    </div>
  );
}

export default CitizenDashboard;
