import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Eye,
  UserCheck,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { fetchCollectorReliefClaims } from '../../../services/api';
import type { CollectorReliefClaimItem } from '../../../services/api';
import { AssignOfficerModal } from './AssignOfficerModal';

interface ReliefClaimsTableViewProps {
  district: string;
  activeTab: string;
  onSelectClaim: (claimId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ReliefClaimsTableView: React.FC<ReliefClaimsTableViewProps> = ({
  district,
  activeTab,
  onSelectClaim
}) => {
  const [claims, setClaims] = useState<CollectorReliefClaimItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [taluk, setTaluk] = useState('');
  const [category, setCategory] = useState('');
  const [disaster, setDisaster] = useState('');

  // Assign Officer Modal
  const [assignClaim, setAssignClaim] = useState<CollectorReliefClaimItem | null>(null);

  // Map Tab to API 'tab' parameter
  const getApiTab = (tab: string) => {
    switch (tab) {
      case 'relief_new': return 'new';
      case 'relief_under_verification': return 'under_verification';
      case 'relief_verified': return 'verified';
      case 'relief_review': return 'review';
      case 'relief_reverification': return 'reverification';
      case 'relief_state_review': return 'state_review';
      case 'relief_approved': return 'approved';
      case 'relief_rejected': return 'rejected';
      case 'relief_payments': return 'payments';
      case 'relief_disbursed': return 'disbursed';
      default: return 'overview';
    }
  };

  const getTabTitleInfo = (tab: string) => {
    switch (tab) {
      case 'relief_new':
        return {
          title: 'New Relief Applications',
          subtitle: 'Recently submitted citizen claims requiring initial screening and Verification Officer assignment.',
          badge: 'Unassigned Queue'
        };
      case 'relief_under_verification':
        return {
          title: 'Claims Under Field Verification',
          subtitle: 'Assigned to Verification Officers and Station Teams for on-ground physical inspection.',
          badge: 'Ground Inspection'
        };
      case 'relief_verified':
        return {
          title: 'Field-Verified Claims',
          subtitle: 'Completed ground verifications with officer loss estimates and GPS coordinates ready for review.',
          badge: 'Inspection Complete'
        };
      case 'relief_review':
        return {
          title: 'Claims for Collector Decision',
          subtitle: 'Verified damage dossiers requiring District Collector sanction, rejection, or re-verification.',
          badge: 'Immediate Action'
        };
      case 'relief_reverification':
        return {
          title: 'Re-verification Queue',
          subtitle: 'Claims returned to Verification Officers due to discrepancies, missing photographs, or incomplete assessments.',
          badge: 'Under Re-inspection'
        };
      case 'relief_state_review':
        return {
          title: 'High-Value / State Review Claims',
          subtitle: 'Claims exceeding District Collector financial sanction limits requiring State Disaster Management Authority review.',
          badge: 'State Escalation'
        };
      case 'relief_approved':
        return {
          title: 'Approved Relief Assistance',
          subtitle: 'Claims officially sanctioned under SDRF norms awaiting or queued for electronic payment disbursement.',
          badge: 'Sanctioned'
        };
      case 'relief_rejected':
        return {
          title: 'Rejected Applications',
          subtitle: 'Applications not satisfying statutory relief norms, with recorded official reasons and audit trail.',
          badge: 'Not Sanctioned'
        };
      case 'relief_payments':
        return {
          title: 'Payment Processing Queue',
          subtitle: 'Sanctioned claims scheduled for electronic Direct Benefit Transfer (DBT) batch clearance.',
          badge: 'Payment Scheduled'
        };
      case 'relief_disbursed':
        return {
          title: 'Disbursed Compensation Records',
          subtitle: 'Successfully executed DBT transfers with official transaction references and bank acknowledgements.',
          badge: 'Completed Transfers'
        };
      default:
        return {
          title: 'Relief Claims Ledger',
          subtitle: 'District-wide registry of disaster relief assistance applications.',
          badge: 'All Claims'
        };
    }
  };

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCollectorReliefClaims({
        tab: getApiTab(activeTab),
        taluk: taluk || undefined,
        category: category || undefined,
        disaster: disaster || undefined,
        search: search.trim() || undefined,
        district,
        page,
        limit: 15
      });
      setClaims(data.claims);
      setTotal(data.total);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load relief claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [activeTab, taluk, category, disaster, search]);

  useEffect(() => {
    loadClaims();
  }, [activeTab, taluk, category, disaster, search, page]);

  const tabInfo = getTabTitleInfo(activeTab);

  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-900 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'MEDIUM': return 'bg-amber-100 text-amber-900 border-amber-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'SUBMITTED':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-black">SUBMITTED</span>;
      case 'UNDER_FIELD_VERIFICATION':
      case 'ASSIGNED_FOR_VERIFICATION':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black">INSPECTION</span>;
      case 'FIELD_VERIFIED':
      case 'COLLECTOR_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black">REVIEW READY</span>;
      case 'REVERIFICATION_REQUIRED':
        return <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200 text-[10px] font-black">RE-VERIFY</span>;
      case 'STATE_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-black">STATE LEVEL</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">APPROVED</span>;
      case 'PAYMENT_PROCESSING':
        return <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300 text-[10px] font-black">PROCESSING</span>;
      case 'DISBURSED':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-xs">DISBURSED</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300 text-[10px] font-black">REJECTED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">{st}</span>;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* TABLE HEADER & TITLE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1.5 border border-emerald-200">
            {tabInfo.badge} &bull; {district} District
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {tabInfo.title}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {tabInfo.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
            Total Matching: <strong className="text-slate-900 font-mono">{total}</strong> claims
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Claim ID, Applicant name, Village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Taluk Filter */}
        <select
          value={taluk}
          onChange={(e) => setTaluk(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Taluks</option>
          <option value="Kanjirappally">Kanjirappally</option>
          <option value="Meenachil">Meenachil</option>
          <option value="Changanassery">Changanassery</option>
          <option value="Kottayam">Kottayam</option>
          <option value="Vaikom">Vaikom</option>
          <option value="Devikulam">Devikulam</option>
          <option value="Thodupuzha">Thodupuzha</option>
          <option value="Peerumade">Peerumade</option>
          <option value="Udumbanchola">Udumbanchola</option>
        </select>

        {/* Disaster Type Filter */}
        <select
          value={disaster}
          onChange={(e) => setDisaster(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Disasters</option>
          <option value="Flood">Flood</option>
          <option value="Landslide">Landslide</option>
          <option value="Heavy Rainfall">Heavy Rainfall</option>
          <option value="Cyclone">Cyclone</option>
          <option value="Fire">Fire</option>
        </select>

        {/* Assistance Category Filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Assistance Categories</option>
          <option value="Immediate Relief">Immediate Relief</option>
          <option value="Damage Assistance">Damage Assistance</option>
          <option value="Death / Injury Assistance">Death / Injury Assistance</option>
          <option value="Recovery Assistance">Recovery Assistance</option>
        </select>
      </div>

      {/* ERROR NOTICE */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold">
          {error}
        </div>
      )}

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Querying relief claims database...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-base font-extrabold text-slate-800">No Claims Found in this Category</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no relief applications matching the selected criteria in {district} District.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Claim ID / Priority</th>
                  <th className="py-3 px-4">Applicant & Contact</th>
                  <th className="py-3 px-4">Disaster & Category</th>
                  <th className="py-3 px-4">Taluk & Village</th>
                  <th className="py-3 px-4 text-right">Requested</th>
                  <th className="py-3 px-4 text-right">Sanctioned</th>
                  <th className="py-3 px-4">Officer / Inspection</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {claims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Claim ID & Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-black text-slate-900 text-xs">
                        {c.claim_id}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${getPriorityColor(c.priority)}`}>
                          {c.priority || 'NORMAL'}
                        </span>
                        {c.days_pending !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {c.days_pending}d pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Applicant & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {c.applicant_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {c.applicant_phone}
                      </div>
                    </td>

                    {/* Disaster & Category */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-bold text-slate-800 truncate">
                        {c.damage_type || c.assistance_category}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {c.disaster_type} &bull; {new Date(c.disaster_date).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {c.village || 'Village Ward'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Taluk: {c.taluk || district}
                      </div>
                    </td>

                    {/* Requested Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                      {formatINR(c.requested_amount)}
                    </td>

                    {/* Sanctioned Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                      {c.approved_amount > 0 ? formatINR(c.approved_amount) : '—'}
                    </td>

                    {/* Verification Officer / Inspection */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {c.verification_officer_name ? (
                        <div>
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{c.verification_officer_name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {c.is_field_verified ? 'Ground verified' : 'Inspection pending'}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssignClaim(c)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Assign Officer</span>
                        </button>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(c.status)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectClaim(c.claim_id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-2xs transition-all flex items-center gap-1"
                          title="View Full Claim Review"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50/50">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ASSIGN OFFICER MODAL */}
      {assignClaim && (
        <AssignOfficerModal
          claim={assignClaim}
          district={district}
          isOpen={true}
          onClose={() => setAssignClaim(null)}
          onSuccess={() => {
            loadClaims();
          }}
        />
      )}
    </div>
  );
};
