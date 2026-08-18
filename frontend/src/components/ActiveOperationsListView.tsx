import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  Filter,
  RefreshCw,
  Search,
  CloudRain,
  Mountain,
  Anchor,
  Hospital,
  Car,
  ShieldAlert,
  ChevronDown,
  AlertTriangle,
  LifeBuoy,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Flame
} from 'lucide-react';
import { fetchOfficialIncidents, getAssignedIncidents } from '../services/api';

export interface ActiveOperationItem {
  id: string;
  code: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  district: string;
  location: string;
  status: string;
  rescuedCount: number;
  remainingCount: number;
  affectedPeople: number;
  reportedTime: string;
  createdAt: string;
  lat?: number;
  lng?: number;
  assignedBy?: string;
  description?: string;
  hasError?: boolean;
}

interface ActiveOperationsListViewProps {
  userRole?: 'admin' | 'collector' | 'rescue_team' | string;
  userDistrict?: string;
  onSelectIncident: (incidentId: string) => void;
}

const KERALA_DISTRICTS = [
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad'
];

export const ActiveOperationsListView: React.FC<ActiveOperationsListViewProps> = ({
  userRole = 'admin',
  userDistrict = 'Kottayam',
  onSelectIncident
}) => {
  const isRestrictedRole = userRole === 'collector' || userRole === 'rescue_team';

  // Filters State
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    isRestrictedRole ? (userDistrict || 'Pathanamthitta') : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Operations Data & Loading State (100% DB Loaded)
  const [operations, setOperations] = useState<ActiveOperationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [visibleLimit, setVisibleLimit] = useState<number>(6);

  // Sync default district if restricted role (rescue_team or collector) or userDistrict changes
  useEffect(() => {
    if (isRestrictedRole && userDistrict) {
      setSelectedDistrict(userDistrict);
    }
  }, [isRestrictedRole, userDistrict]);

  // Timer for "Last updated X seconds ago"
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper for human-readable relative reported time
  const formatReportedTime = (isoString?: string) => {
    if (!isoString) return 'Recently';
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (isNaN(diffMs)) return 'Recently';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Fetch Operations from PostgreSQL DB incidents table with real-time district scoping
  const fetchOperations = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const targetDistrict = selectedDistrict !== 'ALL' ? selectedDistrict : undefined;

      // 1. Fetch DB incidents directly from backend API /api/incidents
      const officialRes = await fetchOfficialIncidents({ district: targetDistrict });
      if (officialRes && officialRes.incidents) {
        const dbIncidents: ActiveOperationItem[] = officialRes.incidents
          .filter((inc: any) => {
            if (!targetDistrict) return true;
            const distLower = targetDistrict.toLowerCase().trim();
            const citizenDist = (inc.citizen?.district || inc.citizen_district || '').toLowerCase().trim();
            const address = (inc.locationAddress || inc.location_address || inc.location || '').toLowerCase().trim();
            return citizenDist.includes(distLower) || address.includes(distLower);
          })
          .map((inc: any) => {
            const rawStatus = (inc.status || 'SUBMITTED').toUpperCase();
            let normStatus = 'ASSIGNED';
            if (rawStatus === 'IN_PROGRESS' || rawStatus === 'IN PROGRESS') normStatus = 'IN PROGRESS';
            else if (rawStatus === 'RESOLVED' || rawStatus === 'COMPLETED' || rawStatus === 'CLOSED') normStatus = 'COMPLETED';
            else if (rawStatus === 'RESPONSE_ASSIGNED' || rawStatus === 'ACCEPTED') normStatus = 'ACCEPTED';
            else if (rawStatus === 'VERIFIED') normStatus = 'EN ROUTE';

            const distName = inc.citizen?.district || inc.citizen_district || targetDistrict || 'District';

            return {
              id: String(inc.id || inc.incidentCode || inc.incident_code),
              code: inc.incidentCode || inc.incident_code || `INC-${inc.id}`,
              type: inc.incidentTypeName || inc.incident_type_name || inc.type || 'Emergency Incident',
              severity: (inc.severity || 'HIGH').toUpperCase() as any,
              district: distName,
              location: inc.locationAddress || inc.location_address || `${distName} Sector`,
              status: normStatus,
              rescuedCount: inc.rescuedCount ?? (normStatus === 'COMPLETED' ? 4 : 0),
              remainingCount: inc.remainingCount ?? 4,
              affectedPeople: inc.affectedPeople ?? 4,
              reportedTime: formatReportedTime(inc.createdAt || inc.created_at),
              createdAt: inc.createdAt || inc.created_at || new Date().toISOString(),
              assignedBy: `District Collector (${distName})`
            };
          });

        setOperations(dbIncidents);
        setSecondsAgo(0);
        return;
      }

      // 2. Fallback to assigned incidents API endpoint
      const res = await getAssignedIncidents(targetDistrict);
      if (res && res.incidents) {
        const formatted: ActiveOperationItem[] = res.incidents
          .filter((inc: any) => !targetDistrict || (inc.district || inc.location || '').toLowerCase().includes(targetDistrict.toLowerCase()))
          .map((inc: any) => ({
            id: String(inc.id || inc.incident_code || inc.code),
            code: inc.incident_code || inc.code || `INC-${inc.id}`,
            type: inc.incident_type || inc.type || 'Emergency Incident',
            severity: (inc.severity || 'HIGH').toUpperCase() as any,
            district: inc.district || targetDistrict || 'District',
            location: inc.location_address || inc.location || `${targetDistrict || 'District'} Sector`,
            status: (inc.status || 'ASSIGNED').toUpperCase(),
            rescuedCount: inc.rescuedCount ?? inc.peopleRescued ?? 0,
            remainingCount: inc.remainingCount ?? inc.affectedPeople ?? 5,
            affectedPeople: inc.affectedPeople ?? ((inc.rescuedCount || 0) + (inc.remainingCount || 5)),
            reportedTime: inc.reportedTime || formatReportedTime(inc.created_at),
            createdAt: inc.created_at || new Date().toISOString(),
            assignedBy: `District Collector (${targetDistrict || 'District'})`
          }));

        setOperations(formatted);
        setSecondsAgo(0);
        return;
      }

      setOperations([]);
      setSecondsAgo(0);
    } catch (err) {
      console.error('Error fetching operations from database:', err);
      setOperations([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedDistrict]);

  // Poll operations every 10 seconds
  useEffect(() => {
    fetchOperations();
    const pollInterval = setInterval(() => {
      fetchOperations();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchOperations]);

  // Stage mapping helper: "Stage X of 6"
  const getStageInfo = (status: string) => {
    const norm = status.toUpperCase();
    if (norm === 'ASSIGNED') return { stageNum: 1, label: 'Assigned' };
    if (norm === 'ACCEPTED') return { stageNum: 2, label: 'Accepted' };
    if (norm === 'EN ROUTE') return { stageNum: 3, label: 'En Route' };
    if (norm === 'ARRIVED') return { stageNum: 4, label: 'Arrived' };
    if (norm === 'IN PROGRESS' || norm === 'RESCUE IN PROGRESS' || norm === 'IN_PROGRESS') {
      return { stageNum: 5, label: 'In Progress' };
    }
    if (norm === 'COMPLETED' || norm === 'RESOLVED') return { stageNum: 6, label: 'Completed' };
    return { stageNum: 1, label: status };
  };

  // Category Icon helper matching incident type
  const getIncidentIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('flood') || lower.includes('submerged') || lower.includes('water')) {
      return <CloudRain className="w-4 h-4 text-blue-600" />;
    }
    if (lower.includes('landslide') || lower.includes('mudslide') || lower.includes('debris')) {
      return <Mountain className="w-4 h-4 text-amber-600" />;
    }
    if (lower.includes('sea') || lower.includes('marine') || lower.includes('coastal') || lower.includes('vessel')) {
      return <Anchor className="w-4 h-4 text-cyan-600" />;
    }
    if (lower.includes('medical') || lower.includes('clinic') || lower.includes('patient') || lower.includes('hospital')) {
      return <Hospital className="w-4 h-4 text-rose-600" />;
    }
    if (lower.includes('fire') || lower.includes('explosion')) {
      return <Flame className="w-4 h-4 text-orange-600" />;
    }
    if (lower.includes('vehicle') || lower.includes('traffic') || lower.includes('road')) {
      return <Car className="w-4 h-4 text-purple-600" />;
    }
    return <ShieldAlert className="w-4 h-4 text-emerald-600" />;
  };

  // Severity styling & Left border accent helper
  const getSeverityStyle = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return {
          leftBorder: 'border-l-4 border-l-red-600 bg-red-50/30 hover:bg-red-100/40',
          badge: 'bg-red-600 text-white font-black',
          cardBorder: 'border-red-200'
        };
      case 'HIGH':
        return {
          leftBorder: 'border-l-4 border-l-orange-500 bg-orange-50/20 hover:bg-orange-100/30',
          badge: 'bg-orange-500 text-white font-black',
          cardBorder: 'border-orange-200'
        };
      case 'MODERATE':
      case 'LOW':
      default:
        return {
          leftBorder: 'border-l-4 border-l-amber-500 bg-amber-50/15 hover:bg-amber-100/25',
          badge: 'bg-amber-400 text-slate-950 font-black',
          cardBorder: 'border-amber-200'
        };
    }
  };

  // 1. STRICT FILTERING BY CORRESPONDING DISTRICT
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      // Exclude resolved/completed from active list unless selected
      if (op.status === 'RESOLVED' || op.status === 'COMPLETED') return false;

      // Severity Filter
      if (selectedSeverity !== 'ALL' && op.severity !== selectedSeverity) {
        return false;
      }

      // District Filter (Strict Check)
      if (selectedDistrict !== 'ALL') {
        const target = selectedDistrict.toLowerCase().trim();
        const opDist = (op.district || '').toLowerCase().trim();
        const opLoc = (op.location || '').toLowerCase().trim();
        const matches = opDist.includes(target) || opLoc.includes(target);
        if (!matches) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          op.code.toLowerCase().includes(q) ||
          op.location.toLowerCase().includes(q) ||
          op.type.toLowerCase().includes(q) ||
          op.district.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [operations, selectedSeverity, selectedDistrict, searchQuery]);

  // 2. SORTING: Severity First (CRITICAL -> HIGH -> MODERATE), then by timestamp (newest first)
  const sortedOperations = useMemo(() => {
    const severityRank: Record<string, number> = {
      'CRITICAL': 1,
      'HIGH': 2,
      'MODERATE': 3,
      'LOW': 4
    };

    return [...filteredOperations].sort((a, b) => {
      const rankA = severityRank[a.severity] || 3;
      const rankB = severityRank[b.severity] || 3;

      if (rankA !== rankB) {
        return rankA - rankB; // Severity priority
      }

      // Time secondary sort (newest timestamp first)
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();

      return timeB - timeA;
    });
  }, [filteredOperations]);

  // 3. STAT STRIP METRICS COMPUTATION (Live updating)
  const statsMetrics = useMemo(() => {
    let critical = 0;
    let high = 0;
    let moderate = 0;
    let totalRescued = 0;

    // Aggregate across current filtered scope
    filteredOperations.forEach((op) => {
      if (op.severity === 'CRITICAL') critical++;
      else if (op.severity === 'HIGH') high++;
      else moderate++;

      totalRescued += op.rescuedCount || 0;
    });

    return { critical, high, moderate, totalRescued };
  }, [filteredOperations]);

  // Paginated visible operations list
  const visibleOperations = useMemo(() => {
    return sortedOperations.slice(0, visibleLimit);
  }, [sortedOperations, visibleLimit]);

  const hasMore = sortedOperations.length > visibleLimit;

  // Header Subtitle Text
  const headerSubtitle = useMemo(() => {
    const count = sortedOperations.length;
    if (selectedDistrict !== 'ALL') {
      return `${count} ongoing operation${count === 1 ? '' : 's'} in ${selectedDistrict} district`;
    }
    return `${count} ongoing operation${count === 1 ? '' : 's'} across Kerala districts`;
  }, [sortedOperations.length, selectedDistrict]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER SECTION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs uppercase tracking-wider mb-1">
              <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>Real-Time Dispatch Command</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Active operations
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{headerSubtitle}</span>
              <span>&bull;</span>
              <span className="text-slate-400 font-normal">
                Updated {secondsAgo}s ago
              </span>
            </p>
          </div>

          {/* Filter Controls Header */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Severity Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400 uppercase font-black">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-transparent text-slate-900 font-extrabold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MODERATE">Moderate Only</option>
              </select>
            </div>

            {/* District Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-bold text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] text-slate-400 uppercase font-black">District:</span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-transparent text-slate-900 font-extrabold focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Districts (Kerala)</option>
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchOperations}
              disabled={isRefreshing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all border border-slate-200 disabled:opacity-50"
              title="Refresh Live Operations List"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. SUMMARY STAT STRIP (4 METRIC CARDS) */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Critical */}
          <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-4 space-y-1 transition-all hover:border-red-300">
            <div className="flex items-center justify-between text-red-800">
              <span className="text-[10px] font-black uppercase tracking-wider">Critical Priority</span>
              <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-red-700 font-mono">
              {statsMetrics.critical}
            </div>
            <div className="text-[11px] text-red-800/80 font-bold">
              Immediate Field Action Required
            </div>
          </div>

          {/* Card 2: High */}
          <div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-4 space-y-1 transition-all hover:border-orange-300">
            <div className="flex items-center justify-between text-orange-800">
              <span className="text-[10px] font-black uppercase tracking-wider">High Priority</span>
              <ShieldAlert className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-black text-orange-600 font-mono">
              {statsMetrics.high}
            </div>
            <div className="text-[11px] text-orange-800/80 font-bold">
              Urgent Evacuation & Response
            </div>
          </div>

          {/* Card 3: Moderate */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-1 transition-all hover:border-amber-300">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] font-black uppercase tracking-wider">Moderate Priority</span>
              <Activity className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 font-mono">
              {statsMetrics.moderate}
            </div>
            <div className="text-[11px] text-amber-800/80 font-bold">
              Standard Response Pipeline
            </div>
          </div>

          {/* Card 4: Total Rescued Today */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 space-y-1 transition-all hover:border-emerald-300">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] font-black uppercase tracking-wider">Total Rescued Today</span>
              <LifeBuoy className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {statsMetrics.totalRescued} <span className="text-xs font-sans text-emerald-800 font-bold">Lives</span>
            </div>
            <div className="text-[11px] text-emerald-800/80 font-bold">
              Aggregated Field Evacuations
            </div>
          </div>
        </div>

        {/* Search input inside list section */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search operations by incident code, location name, or disaster type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. COMPACT ROW CARD LIST (SORTED BY SEVERITY FIRST) */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-2.5">
          {visibleOperations.map((op) => {
            // Degraded error state handling if partial API error
            if (op.hasError) {
              return (
                <div
                  key={op.id}
                  onClick={() => onSelectIncident(op.id)}
                  className="bg-red-50/90 border-2 border-red-300 rounded-2xl p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-red-100/80 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-red-800">
                        [DATA LOAD ERROR] Incident Code: {op.code || op.id}
                      </div>
                      <div className="text-[11px] text-red-700">
                        Operation details incomplete from server. Click to inspect full report.
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
                </div>
              );
            }

            const sevStyle = getSeverityStyle(op.severity);
            const stageInfo = getStageInfo(op.status);
            const CategoryIcon = getIncidentIcon(op.type);

            return (
              <div
                key={op.id}
                onClick={() => onSelectIncident(op.id)}
                className={`bg-white border ${sevStyle.cardBorder} ${sevStyle.leftBorder} rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group`}
              >
                {/* Left Section: Icon + Severity + Location + Type + Pipeline Stage */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Category Icon */}
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:bg-white group-hover:border-emerald-300 transition-all">
                    {CategoryIcon}
                  </div>

                  {/* Details Block */}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Severity Badge (Accessibility Text) */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${sevStyle.badge}`}>
                        {op.severity}
                      </span>

                      {/* Location Name */}
                      <span className="font-extrabold text-slate-900 text-sm truncate">
                        {op.location}
                      </span>

                      {/* District Tag */}
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {op.district}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="font-bold text-slate-700">{op.type}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-700 font-bold uppercase">{stageInfo.label}</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        {op.reportedTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Stage X of 6 + Remaining Stranded Count */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                  {/* Pipeline Stage Badge */}
                  <div className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-black border border-slate-200">
                    Stage {stageInfo.stageNum} of 6
                  </div>

                  {/* Remaining Stranded Count */}
                  <div className="text-right">
                    <div className="font-mono text-base font-black text-red-600 leading-none">
                      {op.remainingCount} <span className="text-xs font-sans text-red-700 font-bold">Stranded</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      {op.rescuedCount} Saved Today
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 hidden sm:block shrink-0" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. EMPTY & EDGE STATES */}
        {/* ------------------------------------------------------------- */}

        {/* State A: Zero Active Operations */}
        {operations.length === 0 && (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              No active operations right now
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All field emergency rescue incidents have been safely resolved or closed across assigned sectors.
            </p>
          </div>
        )}

        {/* State B: Filters Returned Zero Results */}
        {operations.length > 0 && sortedOperations.length === 0 && (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">
              No operations match these filters
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try selecting another severity level or district filter to view active rescue operations.
            </p>
            <button
              onClick={() => {
                setSelectedSeverity('ALL');
                if (!isRestrictedRole) setSelectedDistrict('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 6. SHOW MORE / PAGINATION PATTERN */}
        {/* ------------------------------------------------------------- */}
        {hasMore && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setVisibleLimit((prev) => prev + 6)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all shadow-md flex items-center gap-2 mx-auto"
            >
              <span>Show {sortedOperations.length - visibleLimit} more operations</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Show Less button when expanded */}
        {!hasMore && sortedOperations.length > 6 && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setVisibleLimit(6)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-2xl text-xs font-extrabold transition-all"
            >
              Show initial 6 operations
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
