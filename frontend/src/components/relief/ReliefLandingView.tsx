import React, { useState, useEffect } from 'react';
import {
  Coins,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Search,
  Eye,
  Building2,
  HelpCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import {
  fetchMyReliefSummary,
  fetchMyReliefClaims,
  fetchReliefTransparencyStats
} from '../../services/api';
import type { ReliefSummary, ReliefClaim } from '../../services/api';

interface ReliefLandingViewProps {
  user: any;
  onApplyClick: () => void;
  onViewClaim: (claimId: string) => void;
  onContinueDraft: (draftId: string) => void;
  onOpenHowItWorks: () => void;
  onViewHistory?: () => void;
}

export const ReliefLandingView: React.FC<ReliefLandingViewProps> = ({
  user,
  onApplyClick,
  onViewClaim,
  onContinueDraft,
  onOpenHowItWorks,
  onViewHistory: _onViewHistory
}) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReliefSummary>({
    activeApplications: 0,
    underVerification: 0,
    approved: 0,
    disbursed: 0,
    draftCount: 0,
    totalApprovedAmount: 0,
    totalDisbursedAmount: 0
  });
  const [activeDraft, setActiveDraft] = useState<any>(null);
  const [claims, setClaims] = useState<ReliefClaim[]>([]);
  const [transparency, setTransparency] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, claimsRes, transRes] = await Promise.all([
        fetchMyReliefSummary(),
        fetchMyReliefClaims(),
        fetchReliefTransparencyStats(user?.district || 'All Kerala')
      ]);

      if (sumRes && sumRes.summary) {
        setSummary(sumRes.summary);
        setActiveDraft(sumRes.activeDraft);
      }
      if (claimsRes) {
        setClaims(claimsRes);
      }
      if (transRes && transRes.stats) {
        setTransparency(transRes.stats);
      }
    } catch (err) {
      console.warn('Backend load relief data note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Filter Claims
  const filteredClaims = claims.filter((claim) => {
    // Exclude drafts from main table; drafts are shown in the prominent draft banner
    if (claim.status === 'DRAFT') return false;

    const matchesSearch =
      !searchQuery ||
      claim.claim_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.disaster_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.assistance_category?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') {
      return ['SUBMITTED', 'UNDER_FIELD_VERIFICATION', 'FIELD_VERIFIED', 'UNDER_REVIEW', 'PAYMENT_PROCESSING'].includes(claim.status);
    }
    if (statusFilter === 'APPROVED') {
      return ['APPROVED', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED'].includes(claim.status);
    }
    if (statusFilter === 'DISBURSED') {
      return claim.payment_status === 'DISBURSED' || claim.status === 'DISBURSED';
    }
    if (statusFilter === 'REJECTED') {
      return claim.status === 'REJECTED';
    }
    return true;
  });

  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (paymentStatus === 'DISBURSED' || status === 'DISBURSED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disbursed
        </span>
      );
    }
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-600" /> Submitted
          </span>
        );
      case 'UNDER_FIELD_VERIFICATION':
      case 'FIELD_VERIFIED':
      case 'UNDER_REVIEW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" /> Under Verification
          </span>
        );
      case 'APPROVED':
      case 'PAYMENT_PROCESSING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal-600" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-[#0E8F66] text-white flex items-center justify-center shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Relief & Compensation</h1>
              <p className="text-xs font-semibold text-emerald-800">
                State Disaster Response Fund (SDRF) &bull; Official Citizen Portal
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Apply for eligible disaster assistance and track your application from submission to disbursement.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenHowItWorks}
            className="px-3.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>How Relief Works</span>
          </button>
          <button
            onClick={onApplyClick}
            className="px-4 py-2.5 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Apply for Relief</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Cards (Live from PostgreSQL DB) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Applications */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-blue-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Applications</p>
            <p className="text-2xl font-black text-slate-900">
              {loading ? '...' : summary.activeApplications}
            </p>
            <span className="text-[11px] font-bold text-blue-600">
              {summary.activeApplications > 0 ? 'Under Process' : 'No Active Cases'}
            </span>
          </div>
        </div>

        {/* Under Verification */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-amber-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Under Verification</p>
            <p className="text-2xl font-black text-slate-900">
              {loading ? '...' : summary.underVerification}
            </p>
            <span className="text-[11px] font-bold text-amber-600">
              {summary.underVerification > 0 ? 'Field Officer Survey' : 'Zero Pending'}
            </span>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-teal-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Approved Claims</p>
            <p className="text-2xl font-black text-slate-900">
              {loading ? '...' : summary.approved}
            </p>
            <span className="text-[11px] font-bold text-teal-700">
              ₹{summary.totalApprovedAmount.toLocaleString('en-IN')} Approved
            </span>
          </div>
        </div>

        {/* Disbursed */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-emerald-300 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0E8F66] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Relief Disbursed</p>
            <p className="text-2xl font-black text-slate-900">
              {loading ? '...' : summary.disbursed}
            </p>
            <span className="text-[11px] font-bold text-emerald-700">
              ₹{summary.totalDisbursedAmount.toLocaleString('en-IN')} Disbursed
            </span>
          </div>
        </div>
      </div>

      {/* 3. Draft Application Banner (If citizen has an incomplete draft saved) */}
      {activeDraft && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                  DRAFT APPLICATION
                </span>
                <span className="text-xs font-bold text-slate-800">{activeDraft.claim_id}</span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-900 mt-1">
                {activeDraft.assistance_category || 'Disaster Assistance'} &bull; {activeDraft.disaster_type || 'Disaster Claim'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saved {activeDraft.updated_at ? new Date(activeDraft.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                &bull; Ready to continue from your last completed step.
              </p>
            </div>
          </div>

          <button
            onClick={() => onContinueDraft(activeDraft.claim_id || activeDraft.id)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
          >
            <span>Continue Application</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Main Applications List & Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        
        {/* Top Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Application ID, disaster type, category..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0E8F66]"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold text-slate-600 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active / Pending' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'DISBURSED', label: 'Disbursed' },
              { id: 'REJECTED', label: 'Rejected' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 font-extrabold shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Claims Table / List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading your relief applications from PostgreSQL...
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0E8F66] flex items-center justify-center mx-auto shadow-xs">
              <Coins className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-base text-slate-800">
              {claims.length === 0 ? 'No Relief Applications Found' : 'No Matching Claims'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {claims.length === 0
                ? 'If you have suffered property damage, crop loss, or emergency expenses due to an active disaster, click "+ Apply for Relief" to submit an application.'
                : 'Try adjusting your search keywords or filter options above.'}
            </p>
            {claims.length === 0 && (
              <button
                onClick={onApplyClick}
                className="mt-2 px-4 py-2 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Relief Application</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Application ID</th>
                  <th className="py-3 px-3">Disaster</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Date Submitted</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Approved Assistance</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.map((claim) => {
                  const dateStr = claim.submitted_at
                    ? new Date(claim.submitted_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Recently';

                  return (
                    <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        {claim.claim_id}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800">{claim.disaster_type}</span>
                        {claim.incident_code && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            Inc: {claim.incident_code}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700">
                        {claim.assistance_category}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {dateStr}
                      </td>
                      <td className="py-3.5 px-3">
                        {getStatusBadge(claim.status, claim.payment_status)}
                      </td>
                      <td className="py-3.5 px-3 font-black text-slate-900">
                        {claim.approved_amount && Number(claim.approved_amount) > 0 ? (
                          <span className="text-[#0E8F66] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            ₹{Number(claim.approved_amount).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Under Survey</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => onViewClaim(claim.claim_id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#0B4D3B] font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#0E8F66]" />
                          <span>Track</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. District Relief Overview (Public Transparency Dashboard Widget) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-extrabold text-sm tracking-tight text-white uppercase">
                {user?.district || 'All Kerala'} District Relief Transparency Overview
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Public audit statistics for disaster relief distribution under State Disaster Response Fund
            </p>
          </div>
          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-800 shrink-0">
            Official DDMA Feed
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Applications Lodged</span>
            <p className="text-xl font-black text-white mt-1">
              {transparency ? transparency.applicationsReceived : '...'}
            </p>
            <span className="text-[10px] text-slate-400">Total verified claims</span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Collector Approved</span>
            <p className="text-xl font-black text-emerald-400 mt-1">
              {transparency ? transparency.applicationsApproved : '...'}
            </p>
            <span className="text-[10px] text-emerald-400/80">Sanctioned under norms</span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Completed Disbursements</span>
            <p className="text-xl font-black text-teal-300 mt-1">
              {transparency ? transparency.applicationsDisbursed : '...'}
            </p>
            <span className="text-[10px] text-teal-300/80">Credited to beneficiary accounts</span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Total Financial Assistance</span>
            <p className="text-xl font-black text-emerald-300 mt-1">
              ₹{transparency ? Number(transparency.totalAmountDisbursed).toLocaleString('en-IN') : '0'}
            </p>
            <span className="text-[10px] text-slate-400">Direct Benefit Transfer</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 pt-1 leading-relaxed">
          * Notice: Aggregated statistics are refreshed in real-time directly from official district records. No personal citizen credentials or bank details are displayed.
        </p>
      </div>

    </div>
  );
};
