import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  CalendarDays,
  MapPin,
  Shield,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  LogOut,
  ArrowRight,
  Info,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  fetchFieldOfficerSummary,
  fetchFieldOfficerClaims,
  type FieldOfficerReliefSummary,
  type FieldOfficerClaim
} from '../services/api';
import { FieldOfficerSummaryCards } from '../components/field_officer/FieldOfficerSummaryCards';
import { FieldOfficerClaimsTable } from '../components/field_officer/FieldOfficerClaimsTable';
import { ScheduleVisitModal } from '../components/field_officer/ScheduleVisitModal';
import { FieldVisitDetailPage } from '../components/field_officer/FieldVisitDetailPage';
import { MyFieldVisitsView } from '../components/field_officer/MyFieldVisitsView';
import { FieldOfficerMapView } from '../components/field_officer/FieldOfficerMapView';

interface FieldOfficerDashboardPageProps {
  user?: any;
  onSignOut?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const FieldOfficerDashboardPage: React.FC<FieldOfficerDashboardPageProps> = ({
  user,
  onSignOut,
  onNavigateToTab
}) => {
  // Navigation & Sub-views
  const [activeSection, setActiveSection] = useState<'applications' | 'my_visits' | 'map'>('applications');
  const [activeTabFilter, setActiveTabFilter] = useState<string>('all');
  const [selectedClaimForDetail, setSelectedClaimForDetail] = useState<FieldOfficerClaim | null>(null);
  const [selectedClaimForSchedule, setSelectedClaimForSchedule] = useState<FieldOfficerClaim | null>(null);

  // Data states
  const [summary, setSummary] = useState<FieldOfficerReliefSummary>({
    assignedApplications: 0,
    pendingVisits: 0,
    todaysVisits: 0,
    completedVisits: 0,
    verifiedApplications: 0,
    requiringCorrection: 0
  });
  const [officerData, setOfficerData] = useState<any>(user || null);
  const [claims, setClaims] = useState<FieldOfficerClaim[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Load Dashboard Summary
  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await fetchFieldOfficerSummary();
      setSummary(data.summary);
      if (data.officer) {
        setOfficerData(data.officer);
      }
    } catch (err: any) {
      console.error('Error loading summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Load Assigned Claims
  const loadClaims = async () => {
    setLoadingClaims(true);
    setError(null);
    try {
      const data = await fetchFieldOfficerClaims({
        tab: activeTabFilter,
        search: searchQuery,
        priority: priorityFilter,
        category: categoryFilter,
        page: 1,
        limit: 50
      });
      setClaims(data.claims || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned relief applications');
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadClaims();
  }, [activeTabFilter, searchQuery, priorityFilter, categoryFilter]);

  const handleRefresh = () => {
    loadSummary();
    loadClaims();
  };

  // If viewing single claim inspection / verification page
  if (selectedClaimForDetail) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FieldVisitDetailPage
          claimId={selectedClaimForDetail.id}
          onBack={() => {
            setSelectedClaimForDetail(null);
            handleRefresh();
          }}
          onSuccess={() => {
            handleRefresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white border-b border-emerald-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Field Visit Officer Dashboard
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-emerald-950 shadow-xs">
                    Relief Fund Module
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Officer: <strong className="text-white">{officerData?.name || user?.name || 'Sujith Menon'}</strong></span>
                  <span>&bull;</span>
                  <span>Designation: <strong className="text-white">{officerData?.designation || 'Revenue Field Officer'}</strong></span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-amber-300 font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    {officerData?.district || user?.district || 'Kottayam'} District
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRefresh}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5"
                title="Refresh dashboard metrics"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingSummary || loadingClaims ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>

          {/* Workflow Progress Banner Ribbon */}
          <div className="mt-6 pt-4 border-t border-emerald-800/80">
            <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-2">
              Official Verification Workflow:
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] overflow-x-auto pb-1 scrollbar-none font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-800/60 text-emerald-200 border border-emerald-700/60 whitespace-nowrap">
                1. Submitted
              </span>
              <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-800/60 text-emerald-200 border border-emerald-700/60 whitespace-nowrap">
                2. Field Officer Assigned
              </span>
              <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold border border-emerald-400 whitespace-nowrap shadow-xs">
                3. Visit Scheduled
              </span>
              <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold border border-emerald-400 whitespace-nowrap shadow-xs">
                4. Field Visit Completed
              </span>
              <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-teal-700 text-white font-bold border border-teal-400 whitespace-nowrap shadow-xs">
                5. Verified / Requires Correction
              </span>
              <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-emerald-950 font-black border border-amber-300 whitespace-nowrap shadow-xs">
                6. Collector Review & Sanction
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Role Restriction & Compliance Notice */}
        <div className="p-4 rounded-3xl bg-blue-50/80 border border-blue-200/90 text-blue-900 shadow-xs flex items-start gap-3 text-xs leading-relaxed">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-blue-950">Statutory Authority Boundary:</strong> As a Field Visit Officer, you are authorized to conduct on-site physical damage assessment, record GPS coordinates, attach geo-tagged photographs, and submit official verification findings. <strong>Final claim approval, compensation orders, and DBT payment disbursement are strictly restricted to the District Collector and designated State Sanctioning Authority.</strong>
          </div>
        </div>

        {/* 3. Dashboard Metrics Cards */}
        <FieldOfficerSummaryCards
          summary={summary}
          activeTab={activeTabFilter}
          onTabChange={(tab) => {
            setActiveTabFilter(tab);
            setActiveSection('applications');
          }}
        />

        {/* 4. Section Navigation Pills */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSection('applications')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSection === 'applications'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <span>Assigned Applications & Queue</span>
            </button>

            <button
              onClick={() => setActiveSection('my_visits')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSection === 'my_visits'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <span>My Field Visits Schedule</span>
            </button>

            <button
              onClick={() => setActiveSection('map')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSection === 'map'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Interactive Map & Locations</span>
            </button>
          </div>
        </div>

        {/* 5. Dynamic Section Content */}
        {activeSection === 'applications' && (
          <FieldOfficerClaimsTable
            claims={claims}
            loading={loadingClaims}
            activeTab={activeTabFilter}
            onTabChange={setActiveTabFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            onRefresh={handleRefresh}
            onViewClaim={(claim) => setSelectedClaimForDetail(claim)}
            onScheduleVisit={(claim) => setSelectedClaimForSchedule(claim)}
            onConductInspection={(claim) => setSelectedClaimForDetail(claim)}
          />
        )}

        {activeSection === 'my_visits' && (
          <MyFieldVisitsView
            onConductInspection={(claim) => setSelectedClaimForDetail(claim)}
            onViewClaim={(claim) => setSelectedClaimForDetail(claim)}
          />
        )}

        {activeSection === 'map' && (
          <FieldOfficerMapView
            onConductInspection={(claim) => setSelectedClaimForDetail(claim)}
            onViewClaim={(claim) => setSelectedClaimForDetail(claim)}
          />
        )}
      </div>

      {/* Schedule Field Visit Modal */}
      {selectedClaimForSchedule && (
        <ScheduleVisitModal
          claim={selectedClaimForSchedule}
          isOpen={Boolean(selectedClaimForSchedule)}
          onClose={() => setSelectedClaimForSchedule(null)}
          onSuccess={() => {
            setSelectedClaimForSchedule(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};
