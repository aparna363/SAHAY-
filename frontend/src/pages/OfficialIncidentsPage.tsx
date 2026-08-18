import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  RefreshCw,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { fetchOfficialIncidents, fetchIncidentTypes } from '../services/api';
import type { IncidentReport, IncidentStats, IncidentType } from '../services/api';

interface OfficialIncidentsPageProps {
  onViewIncident: (id: string) => void;
  district?: string;
  lockDistrict?: boolean;
}

export const OfficialIncidentsPage: React.FC<OfficialIncidentsPageProps> = ({
  onViewIncident,
  district,
  lockDistrict = false
}) => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [stats, setStats] = useState<IncidentStats | undefined>();
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(district || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    if (district) {
      setSelectedDistrict(district);
    }
  }, [district]);

  const activeDistrict = lockDistrict ? (district || selectedDistrict) : selectedDistrict;

  const loadData = async () => {
    setLoading(true);
    const data = await fetchOfficialIncidents({
      type: selectedType,
      severity: selectedSeverity,
      status: selectedStatus,
      district: activeDistrict,
      search: searchQuery,
      sortBy
    });
    setIncidents(data.incidents);
    if (data.stats) setStats(data.stats);
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidentTypes().then(setTypes);
  }, []);

  const hasActiveFilters = Boolean(selectedType || selectedSeverity || selectedStatus || (!lockDistrict && selectedDistrict) || searchQuery);

  const handleResetFilters = () => {
    setSelectedType('');
    setSelectedSeverity('');
    setSelectedStatus('');
    if (!lockDistrict) setSelectedDistrict('');
    setSearchQuery('');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedType, selectedSeverity, selectedStatus, selectedDistrict, district, lockDistrict, sortBy, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-600 text-white font-black';
      case 'HIGH': return 'bg-orange-500 text-white font-bold';
      case 'MODERATE': return 'bg-yellow-500 text-slate-900 font-bold';
      default: return 'bg-emerald-600 text-white font-bold';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
      case 'UNDER_REVIEW': return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      case 'VERIFIED': return 'bg-emerald-100 text-emerald-950 border-emerald-400 font-black';
      case 'RESPONSE_ASSIGNED': return 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      case 'RESOLVED': return 'bg-teal-100 text-teal-900 border-teal-300 font-bold';
      case 'CLOSED': return 'bg-slate-200 text-slate-800 border-slate-400 font-bold';
      case 'REJECTED': return 'bg-red-100 text-red-900 border-red-300 font-bold';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Official Header Banner */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Official Incident Control Center &bull; {activeDistrict ? `${activeDistrict} District` : 'Statewide Kerala'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {activeDistrict ? `${activeDistrict} District Incident Operations` : 'Incoming Citizen Reports & Operations'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-2xl font-normal">
            {activeDistrict
              ? `Real-time incident verification, dispatch assignment, status lifecycle tracking, and official remarks management for ${activeDistrict} District.`
              : 'Real-time incident verification, dispatch assignment, status lifecycle tracking, and official Remarks management.'}
          </p>
        </div>

        <button
          onClick={loadData}
          className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all shrink-0 flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feeds</span>
        </button>
      </div>

      {/* Dashboard Statistics Cards (Requirement Section 24) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Reports', value: stats?.total_incidents || 0, bg: 'bg-slate-900 text-white' },
          { label: 'New Submitted', value: stats?.new_reports || 0, bg: 'bg-blue-600 text-white font-black' },
          { label: 'Under Review', value: stats?.under_review || 0, bg: 'bg-amber-500 text-slate-950 font-black' },
          { label: 'Verified', value: stats?.verified || 0, bg: 'bg-emerald-700 text-white font-black' },
          { label: 'High/Critical', value: stats?.high_critical || 0, bg: 'bg-red-600 text-white font-black animate-pulse' },
          { label: 'In Progress', value: stats?.in_progress || 0, bg: 'bg-purple-600 text-white font-black' },
          { label: 'Resolved', value: stats?.resolved || 0, bg: 'bg-teal-700 text-white font-black' }
        ].map((card, idx) => (
          <div key={idx} className={`${card.bg} rounded-2xl p-4 shadow-md flex flex-col justify-between`}>
            <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">{card.label}</span>
            <span className="text-2xl sm:text-3xl font-black mt-1 font-mono">{card.value}</span>
          </div>
        ))}
      </div>

      {/* Filter & Search Toolbar (Requirement Section 25) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 text-slate-900">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Incident Code (e.g. INC-2026-000124), description, or citizen name..."
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
          <button
            type="submit"
            className="bg-[#043e2e] hover:bg-[#065f46] text-white px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-xs transition-all shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span>Filters:</span>
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="">All Incident Types</option>
            {types.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MODERATE">MODERATE</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="RESPONSE_ASSIGNED">RESPONSE ASSIGNED</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          {/* District Filter / Jurisdiction Badge */}
          {lockDistrict ? (
            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-black">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>District Jurisdiction: {activeDistrict}</span>
            </div>
          ) : (
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">All Districts</option>
              <option value="Thiruvananthapuram">Thiruvananthapuram</option>
              <option value="Kollam">Kollam</option>
              <option value="Pathanamthitta">Pathanamthitta</option>
              <option value="Alappuzha">Alappuzha</option>
              <option value="Kottayam">Kottayam</option>
              <option value="Idukki">Idukki</option>
              <option value="Ernakulam">Ernakulam</option>
              <option value="Thrissur">Thrissur</option>
              <option value="Palakkad">Palakkad</option>
              <option value="Malappuram">Malappuram</option>
              <option value="Kozhikode">Kozhikode</option>
              <option value="Wayanad">Wayanad</option>
              <option value="Kannur">Kannur</option>
              <option value="Kasaragod">Kasaragod</option>
            </select>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 font-bold transition-all"
            >
              Clear Filters
            </button>
          )}

          {/* Sort By */}
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-900 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="highest_severity">Sort: Highest Severity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incident Table (Requirement Section 25) */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-3 border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="font-bold text-sm">Loading incident registry records...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 space-y-3 border border-slate-200 shadow-xs">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-black text-slate-900">No Incidents Found</h3>
          <p className="text-xs text-slate-500">No reports match your selected filters or search query.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-900 text-white uppercase text-[11px] font-black tracking-wider">
                <tr>
                  <th className="py-4 px-4">Incident ID</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Severity</th>
                  <th className="py-4 px-4">Location</th>
                  <th className="py-4 px-4">Citizen</th>
                  <th className="py-4 px-4">Created Time</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="py-4 px-4 font-mono font-black text-emerald-950">
                      {inc.incidentCode}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {inc.incidentTypeName}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full ${getSeverityBadge(inc.severity)}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-700 max-w-xs truncate">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        {inc.locationAddress || `${inc.latitude.toFixed(3)}°, ${inc.longitude.toFixed(3)}°`}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-800 font-semibold">
                      {inc.citizen?.name || 'Citizen'} ({inc.citizen?.district || 'District'})
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-mono text-xs">
                      {new Date(inc.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] border ${getStatusBadge(inc.status)}`}>
                        {inc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => onViewIncident(inc.incidentCode)}
                        className="inline-flex items-center gap-1 bg-[#043e2e] hover:bg-[#065f46] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
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
