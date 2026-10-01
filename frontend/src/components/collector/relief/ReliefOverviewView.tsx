import React from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  XCircle,
  ChevronRight,
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Landmark,
  Layers,
  Activity
} from 'lucide-react';
import type { CollectorReliefSummary, CollectorCategoryStat, CollectorDisasterStat } from '../../../services/api';

interface ReliefOverviewViewProps {
  district: string;
  summary: CollectorReliefSummary | null;
  categories: CollectorCategoryStat[];
  disasters: CollectorDisasterStat[];
  loading: boolean;
  onNavigateTab: (tabId: string) => void;
}

export const ReliefOverviewView: React.FC<ReliefOverviewViewProps> = ({
  district,
  summary,
  categories,
  disasters,
  loading,
  onNavigateTab
}) => {
  // Currency Formatter
  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const s = summary || {
    totalApplications: 0,
    newApplications: 0,
    pendingVerification: 0,
    fieldVerified: 0,
    pendingReview: 0,
    reverificationRequired: 0,
    stateReview: 0,
    approved: 0,
    rejected: 0,
    paymentPending: 0,
    disbursed: 0,
    totalRequested: 0,
    totalVerified: 0,
    totalApproved: 0,
    totalDisbursed: 0,
    pendingDisbursement: 0
  };

  const disbursementPercentage = s.totalApproved > 0
    ? Math.min(100, Math.round((s.totalDisbursed / s.totalApproved) * 100))
    : 0;

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700">Loading District Relief & Compensation Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* WELCOME BANNER */}
      <div className="bg-gradient-to-r from-[#034d38] via-[#046347] to-[#023b2b] text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full text-xs font-bold border border-emerald-600/30">
            <Landmark className="w-3.5 h-3.5 text-emerald-400" />
            <span>District Disaster Management Authority (DDMA) &bull; Tier 2 Review</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Relief Fund & Compensation Operations &bull; {district}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
            Administrative decision desk for SDRF/NDRF financial assistance. Review ground-inspected claims, inspect officer GPS logs & field photographs, verify structural loss assessments, sanction assistance, and monitor electronic DBT disbursements.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-3">
            <button
              onClick={() => onNavigateTab('relief_review')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Claims for Review ({s.pendingReview})</span>
            </button>
            <button
              onClick={() => onNavigateTab('relief_new')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4 text-emerald-300" />
              <span>New Applications ({s.newApplications})</span>
            </button>
            <button
              onClick={() => onNavigateTab('relief_map')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5"
            >
              <MapPin className="w-4 h-4 text-amber-300" />
              <span>Relief GIS Map</span>
            </button>
            <button
              onClick={() => onNavigateTab('relief_reports')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-300" />
              <span>Export Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: APPLICATION SUMMARY CARDS (Real DB Counts) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Application Pipeline Status ({district})</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-500">Live PostgreSQL Database Aggregation</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Total */}
          <div
            onClick={() => onNavigateTab('relief_overview')}
            className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-emerald-400 cursor-pointer transition-all space-y-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Total Apps</span>
              <FileText className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{s.totalApplications}</div>
            <div className="text-[10px] text-slate-500 truncate">Submitted claims</div>
          </div>

          {/* Pending Verification */}
          <div
            onClick={() => onNavigateTab('relief_under_verification')}
            className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-amber-400 cursor-pointer transition-all space-y-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center justify-between">
              <span>In Verification</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{s.pendingVerification}</div>
            <div className="text-[10px] text-amber-600 truncate font-semibold">With Field Officers</div>
          </div>

          {/* Field Verified */}
          <div
            onClick={() => onNavigateTab('relief_verified')}
            className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-blue-400 cursor-pointer transition-all space-y-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center justify-between">
              <span>Field Verified</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{s.fieldVerified}</div>
            <div className="text-[10px] text-blue-600 truncate font-semibold">Ground facts verified</div>
          </div>

          {/* Pending Collector Review */}
          <div
            onClick={() => onNavigateTab('relief_review')}
            className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 shadow-2xs hover:border-emerald-500 cursor-pointer transition-all space-y-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center justify-between">
              <span>For Review</span>
              <AlertCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900 font-mono">{s.pendingReview}</div>
            <div className="text-[10px] text-emerald-700 truncate font-bold">Collector Action Needed</div>
          </div>

          {/* Re-verification */}
          <div
            onClick={() => onNavigateTab('relief_reverification')}
            className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-orange-400 cursor-pointer transition-all space-y-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-orange-600 flex items-center justify-between">
              <span>Re-verify</span>
              <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{s.reverificationRequired}</div>
            <div className="text-[10px] text-orange-600 truncate font-semibold">Returned to officer</div>
          </div>

          {/* Approved */}
          <div
            onClick={() => onNavigateTab('relief_approved')}
            className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-emerald-400 cursor-pointer transition-all space-y-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center justify-between">
              <span>Approved</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{s.approved}</div>
            <div className="text-[10px] text-emerald-700 truncate font-semibold">Sanctioned</div>
          </div>

          {/* Rejected */}
          <div
            onClick={() => onNavigateTab('relief_rejected')}
            className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-red-400 cursor-pointer transition-all space-y-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-red-600 flex items-center justify-between">
              <span>Rejected</span>
              <XCircle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="text-2xl font-black text-red-700 font-mono">{s.rejected}</div>
            <div className="text-[10px] text-slate-500 truncate">Not eligible</div>
          </div>

          {/* Disbursed */}
          <div
            onClick={() => onNavigateTab('relief_disbursed')}
            className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:border-teal-400 cursor-pointer transition-all space-y-1"
          >
            <div className="text-[10px] font-black uppercase tracking-wider text-teal-700 flex items-center justify-between">
              <span>Disbursed</span>
              <CreditCard className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{s.disbursed}</div>
            <div className="text-[10px] text-teal-700 truncate font-semibold">DBT Transferred</div>
          </div>
        </div>
      </div>

      {/* SECTION 5: FUND SUMMARY WIDGET (Real DB Financial Aggregation) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>District Relief Fund Telemetry & Financial Sanctions</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Cumulative financial aggregates derived directly from registered claims in {district} District.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black">
              {disbursementPercentage}% Disbursed
            </span>
          </div>
        </div>

        {/* 5-Column Fund Metric Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">Requested</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {formatINR(s.totalRequested)}
            </div>
            <div className="text-[10px] text-slate-500">Total citizen claims</div>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 block">Verified</span>
            <div className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
              {formatINR(s.totalVerified)}
            </div>
            <div className="text-[10px] text-blue-700">Physical loss assessed</div>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 block">Approved</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
              {formatINR(s.totalApproved)}
            </div>
            <div className="text-[10px] text-emerald-700">Collector sanctioned</div>
          </div>

          <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/70 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 block">Disbursed</span>
            <div className="text-xl sm:text-2xl font-black text-teal-950 font-mono">
              {formatINR(s.totalDisbursed)}
            </div>
            <div className="text-[10px] text-teal-700">DBT payment completed</div>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 block">Pending</span>
            <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
              {formatINR(s.pendingDisbursement)}
            </div>
            <div className="text-[10px] text-amber-700">Awaiting clearance</div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-extrabold text-slate-700">
            <span>Fund Disbursement Progress:</span>
            <span>
              {formatINR(s.totalDisbursed)} of {formatINR(s.totalApproved)} ({disbursementPercentage}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${disbursementPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 6: CATEGORY-WISE RELIEF ASSISTANCE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Assistance Category Breakdown ({district})</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Configurable relief norms with differential eligibility thresholds and fund sanction caps.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('relief_overview')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{categories.length} Categories Active</span>
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
            No categorized claims recorded in {district} yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3">Category Name</th>
                  <th className="py-2.5 px-3 text-center">Claims</th>
                  <th className="py-2.5 px-3 text-right">Requested</th>
                  <th className="py-2.5 px-3 text-right">Sanctioned</th>
                  <th className="py-2.5 px-3 text-right">Disbursed</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {categories.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{cat.category}</div>
                      <div className="text-[10px] text-slate-500">SDRF / NDRF Norm Schedule</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-xs">
                        {cat.claimsCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatINR(cat.requestedAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                      {formatINR(cat.approvedAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-teal-800">
                      {formatINR(cat.disbursedAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onNavigateTab('relief_review')}
                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        title="View Category Claims"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DISASTER-WISE DISTRIBUTION */}
      {disasters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {disasters.map((d, i) => (
            <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>{d.disasterType} Incident Claims</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black font-mono">
                  {d.claimsCount}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-slate-500">Sanctioned:</span>
                <span className="font-bold text-emerald-800 font-mono">{formatINR(d.totalApproved)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
