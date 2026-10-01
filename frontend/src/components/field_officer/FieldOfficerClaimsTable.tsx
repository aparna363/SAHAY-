import React from 'react';
import {
  Search,
  Filter,
  Eye,
  Calendar,
  ClipboardCheck,
  MapPin,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Phone,
  ArrowUpDown,
  Building,
  Home
} from 'lucide-react';
import type { FieldOfficerClaim } from '../../services/api';

interface FieldOfficerClaimsTableProps {
  claims: FieldOfficerClaim[];
  loading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  priorityFilter: string;
  onPriorityChange: (priority: string) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  onRefresh: () => void;
  onViewClaim: (claim: FieldOfficerClaim) => void;
  onScheduleVisit: (claim: FieldOfficerClaim) => void;
  onConductInspection: (claim: FieldOfficerClaim) => void;
}

export const FieldOfficerClaimsTable: React.FC<FieldOfficerClaimsTableProps> = ({
  claims,
  loading,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  categoryFilter,
  onCategoryChange,
  onRefresh,
  onViewClaim,
  onScheduleVisit,
  onConductInspection
}) => {
  const tabs = [
    { id: 'all', label: 'All Assigned' },
    { id: 'pending', label: 'Pending Visits' },
    { id: 'today', label: "Today's Visits" },
    { id: 'completed', label: 'Visits Completed' },
    { id: 'verified', label: 'Verified (Collector Review)' },
    { id: 'requires_correction', label: 'Requires Correction' }
  ];

  // Helper for status badge rendering
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3 h-3 text-slate-500" />
            Submitted
          </span>
        );
      case 'UNDER_FIELD_VERIFICATION':
      case 'ASSIGNED_FOR_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Officer Assigned
          </span>
        );
      case 'VISIT_SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-xs">
            <Calendar className="w-3 h-3 text-blue-600" />
            Visit Scheduled
          </span>
        );
      case 'FIELD_VISIT_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <CheckCircle2 className="w-3 h-3 text-purple-600" />
            Field Visit Completed
          </span>
        );
      case 'FIELD_VERIFIED':
      case 'COLLECTOR_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified (Collector Review)
          </span>
        );
      case 'REQUIRES_CORRECTION':
      case 'REVERIFICATION_REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Requires Correction
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-800 border border-green-300">
            ✓ Collector Approved
          </span>
        );
      case 'DISBURSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
            💳 DBT Disbursed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: string = 'MEDIUM') => {
    switch (priority.toUpperCase()) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700 border border-red-300">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-normal bg-slate-100 text-slate-600">LOW</span>;
    }
  };

  const renderDamageCategoryBadge = (category: string) => {
    switch (category) {
      case 'Fully Destroyed':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Fully Destroyed</span>;
      case 'Severely Damaged':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Severely Damaged</span>;
      case 'Partially Damaged':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Partially Damaged</span>;
      case 'No Significant Damage':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-normal bg-slate-100 text-slate-700 border border-slate-200">No Significant Damage</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-normal bg-slate-100 text-slate-700">{category || 'Pending'}</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Top Filter and Search Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls: Search & Refresh */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, name, village..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Priority: All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Damage Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="hidden sm:block px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Damage: All</option>
            <option value="Fully Destroyed">Fully Destroyed</option>
            <option value="Severely Damaged">Severely Damaged</option>
            <option value="Partially Damaged">Partially Damaged</option>
            <option value="No Significant Damage">No Significant Damage</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh table"
            className="p-2 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all shrink-0"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Application ID</th>
              <th className="py-3 px-4">Applicant Name</th>
              <th className="py-3 px-4">District / Taluk / Village</th>
              <th className="py-3 px-4">Disaster Type</th>
              <th className="py-3 px-4">Damage Category</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Date / Scheduled</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RotateCw className="w-6 h-6 animate-spin text-emerald-600" />
                    <span>Loading assigned applications...</span>
                  </div>
                </td>
              </tr>
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    <p className="font-bold text-slate-700">No applications found in this view</p>
                    <p className="text-xs text-slate-400">Try changing your filters or searching another term.</p>
                  </div>
                </td>
              </tr>
            ) : (
              claims.map((claim) => {
                const isScheduledToday =
                  claim.scheduled_visit_date &&
                  new Date(claim.scheduled_visit_date).toDateString() === new Date().toDateString();

                return (
                  <tr
                    key={claim.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isScheduledToday ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* 1. Application ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="hover:underline cursor-pointer" onClick={() => onViewClaim(claim)}>
                          {claim.claim_id}
                        </span>
                        {isScheduledToday && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Scheduled today" />
                        )}
                      </div>
                    </td>

                    {/* 2. Applicant Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{claim.applicant_name}</div>
                      {claim.applicant_phone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {claim.applicant_phone}
                        </div>
                      )}
                    </td>

                    {/* 3. District / Taluk / Village */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{claim.district}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{claim.taluk || 'Taluk'} &bull; {claim.village || claim.locality || 'Village'}</span>
                      </div>
                    </td>

                    {/* 4. Disaster Type */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {claim.disaster_type}
                    </td>

                    {/* 5. Damage Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderDamageCategoryBadge(claim.damage_category || claim.damage_severity)}
                    </td>

                    {/* 6. Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderPriorityBadge(claim.priority)}
                    </td>

                    {/* 7. Date / Scheduled */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {claim.scheduled_visit_date ? (
                        <div>
                          <div className={`font-bold flex items-center gap-1 ${isScheduledToday ? 'text-emerald-700 font-black' : 'text-slate-800'}`}>
                            <Calendar className="w-3 h-3 text-emerald-600" />
                            {new Date(claim.scheduled_visit_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(claim.scheduled_visit_date).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">
                          {claim.submitted_at
                            ? new Date(claim.submitted_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short'
                              })
                            : 'Pending'}
                        </span>
                      )}
                    </td>

                    {/* 8. Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(claim.status)}
                    </td>

                    {/* 9. Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Claim Details */}
                        <button
                          onClick={() => onViewClaim(claim)}
                          title="View Full Claim Dossier"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Schedule / Reschedule Visit Action */}
                        <button
                          onClick={() => onScheduleVisit(claim)}
                          title="Schedule / Reschedule Field Visit"
                          className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all font-semibold flex items-center gap-1 text-[11px]"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{claim.status === 'VISIT_SCHEDULED' ? 'Reschedule' : 'Schedule'}</span>
                        </button>

                        {/* Conduct Inspection / Submit Report Action */}
                        <button
                          onClick={() => onConductInspection(claim)}
                          title="Conduct Inspection / Submit Verification Report"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs flex items-center gap-1 text-[11px]"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Inspect & Verify</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Showing {claims.length} application(s)</span>
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Officer Action: Verify ground damage and submit findings for Collector sanction
        </span>
      </div>
    </div>
  );
};
