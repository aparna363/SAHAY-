import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  RefreshCw,
  MapPin,
  Camera,
  Download,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  fetchReliefClaimById,
  fieldVerifyReliefClaim,
  collectorReliefDecision,
  simulateReliefDisbursement
} from '../../services/api';
import type { ReliefClaim } from '../../services/api';
import { ReliefAcknowledgementModal } from './ReliefAcknowledgementModal';

interface ReliefClaimDetailViewProps {
  claimId: string;
  user?: any;
  onBack: () => void;
  onResubmit?: (claim: ReliefClaim) => void;
}

export const ReliefClaimDetailView: React.FC<ReliefClaimDetailViewProps> = ({
  claimId,
  user: _user,
  onBack,
  onResubmit
}) => {
  const [claim, setClaim] = useState<ReliefClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReliefClaimById(claimId);
      setClaim(data);
    } catch (err: any) {
      console.error('Error loading claim:', err);
      setError(err.message || 'Failed to load relief claim details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaim();
  }, [claimId]);

  // Visual Progression Stepper (Generated dynamically from database status history)
  const timelineStages = [
    { key: 'SUBMITTED', label: 'Application Submitted' },
    { key: 'UNDER_FIELD_VERIFICATION', label: 'Field Verification' },
    { key: 'FIELD_VERIFIED', label: 'Damage Assessment' },
    { key: 'UNDER_REVIEW', label: 'Collector Review' },
    { key: 'APPROVED', label: 'Sanctioned / Approved' },
    { key: 'PAYMENT_PROCESSING', label: 'Payment Processing' },
    { key: 'DISBURSED', label: 'Relief Disbursed' }
  ];

  const getStageStatus = (stageKey: string) => {
    if (!claim) return 'pending';
    const statusOrder = [
      'SUBMITTED',
      'UNDER_FIELD_VERIFICATION',
      'FIELD_VERIFIED',
      'UNDER_REVIEW',
      'APPROVED',
      'PAYMENT_PROCESSING',
      'DISBURSED',
      'COMPLETED'
    ];

    if (claim.status === 'REJECTED') {
      if (stageKey === 'APPROVED') return 'rejected';
    }

    const currentIdx = statusOrder.indexOf(claim.status);
    const stageIdx = statusOrder.indexOf(stageKey);

    if (stageIdx <= currentIdx) return 'completed';
    if (stageIdx === currentIdx + 1) return 'current';
    return 'pending';
  };

  // Interactive Testing Handlers for Demonstration & Verification
  const handleSimulateFieldVerification = async () => {
    if (!claim) return;
    setActionLoading(true);
    try {
      await fieldVerifyReliefClaim(claim.claim_id, {
        verifiedSeverity: claim.damage_severity || 'Severely Damaged',
        fieldRemarks: 'Ground inspection completed by Revenue Inspector. GPS location verified with drone damage mapping.',
        isLocationConfirmed: true
      });
      await loadClaim();
    } catch (err: any) {
      alert('Field verification simulation error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateCollectorApproval = async () => {
    if (!claim) return;
    setActionLoading(true);
    try {
      const grantAmount = claim.assistance_category === 'Immediate Relief' ? 10000 : 40000;
      await collectorReliefDecision(claim.claim_id, {
        decision: 'APPROVE',
        approvedAmount: grantAmount,
        remarks: `Approved in accordance with SDRF relief norms for ${claim.district} District.`
      });
      await loadClaim();
    } catch (err: any) {
      alert('Collector approval simulation error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateDisbursement = async () => {
    if (!claim) return;
    setActionLoading(true);
    try {
      await simulateReliefDisbursement(claim.claim_id);
      await loadClaim();
    } catch (err: any) {
      alert('Disbursement simulation error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 animate-pulse space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
        <p>Loading application timeline and audit history from PostgreSQL database...</p>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="p-12 text-center space-y-4 max-w-lg mx-auto bg-white rounded-3xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="font-extrabold text-base text-slate-800">Application Not Found</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || 'Unable to retrieve records for this claim reference.'}
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
        >
          Back to Relief Dashboard
        </button>
      </div>
    );
  }

  const isApproved = ['APPROVED', 'PAYMENT_PROCESSING', 'DISBURSED', 'COMPLETED'].includes(claim.status);
  const isDisbursed = claim.payment_status === 'DISBURSED' || claim.status === 'DISBURSED';
  const isRejected = claim.status === 'REJECTED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      
      {/* Top Navigation & Action Buttons */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Applications</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAckModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#0E8F66]" />
            <span>Digital Acknowledgement</span>
          </button>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-[#0B4D3B] px-2.5 py-0.5 rounded-full border border-emerald-200">
              CLAIM DOSSIER
            </span>
            <span className="text-xs text-slate-400 font-medium">&bull; {claim.district} District DDMA</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Relief Application Status
          </h1>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-black text-[#0E8F66] text-sm">{claim.claim_id}</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500 font-medium">
              Submitted on {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
            </span>
          </div>
        </div>

        {/* Prominent Status Pill */}
        <div className="text-right shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Current State</span>
          <span
            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 border shadow-xs ${
              isDisbursed
                ? 'bg-emerald-600 text-white border-emerald-700'
                : isApproved
                ? 'bg-teal-500 text-white border-teal-600'
                : isRejected
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-amber-500 text-white border-amber-600'
            }`}
          >
            {isDisbursed ? '✓ Relief Disbursed' : isApproved ? '✓ Assistance Approved' : isRejected ? '✕ Application Rejected' : '● Under Verification'}
          </span>
        </div>
      </div>

      {/* 2. REJECTION NOTICE CARD (If rejected) */}
      {isRejected && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-rose-950">Application Rejected</h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Official verification feedback: <strong className="font-bold">"{claim.rejection_reason || 'Submitted damage could not be substantiated during official field verification.'}"</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-rose-200/80">
            {onResubmit && (
              <button
                onClick={() => onResubmit(claim)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Correct & Resubmit Application</span>
              </button>
            )}
            <p className="text-[11px] text-rose-700 italic">
              You can submit additional documents or rectified coordinates under a revised dossier.
            </p>
          </div>
        </div>
      )}

      {/* 3. APPROVED ASSISTANCE CARD (If approved) */}
      {isApproved && (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-[#EAF8F3] border-2 border-emerald-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-full">
                  SANCTIONED BY COLLECTOR
                </span>
                <span className="text-xs text-emerald-800 font-semibold">{claim.district} District Administration</span>
              </div>
              <h3 className="text-xl font-black text-[#0B4D3B]">Relief Assistance Approved</h3>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Assistance category: <strong>{claim.assistance_category}</strong> &bull; {claim.damage_severity}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-right shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Sanctioned Financial Relief</span>
              <span className="text-2xl font-black text-[#0E8F66]">
                ₹{Number(claim.approved_amount).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                {isDisbursed ? '✓ Credited via DBT' : 'Payment Advice in Process'}
              </span>
            </div>
          </div>

          {/* Payment Status Bar */}
          <div className="p-4 bg-white/90 rounded-2xl border border-emerald-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Disbursement Details</span>
              </span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
                {claim.payment_status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 block">Beneficiary Account:</span>
                <span className="font-mono font-bold text-slate-900">{claim.masked_account_number || 'XXXXXX4821'} ({claim.bank_name})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Transaction Reference:</span>
                <span className="font-mono font-bold text-slate-900">{claim.transaction_reference || 'RLF' + claim.id + '9082'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mode:</span>
                <span className="font-bold text-slate-900">Direct Benefit Transfer (Simulated)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VISUAL STATUS TIMELINE (Driven directly by database status) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Application Progression Timeline</h3>
            <p className="text-xs text-slate-500">Live milestone tracker from the official database verification queue</p>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
            Real DB Progression
          </span>
        </div>

        {/* Milestone Steps Bar */}
        <div className="pt-4 pb-2 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[650px] relative">
            {/* Connecting Bar */}
            <div className="absolute top-4 left-6 right-6 h-1 bg-slate-100 -z-0" />

            {timelineStages.map((stage, idx) => {
              const stageState = getStageStatus(stage.key);
              const isDone = stageState === 'completed';
              const isCurr = stageState === 'current';
              const isRej = stageState === 'rejected';

              return (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-2 max-w-[90px]">
                  <div
                    className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-[#0E8F66] text-white shadow-xs'
                        : isCurr
                        ? 'bg-amber-500 text-white shadow-sm ring-4 ring-amber-100'
                        : isRej
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : isRej ? '✕' : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold leading-tight ${
                      isDone ? 'text-slate-900' : isCurr ? 'text-amber-700' : isRej ? 'text-rose-700' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. AUDIT HISTORY CHRONOLOGICAL LOG */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0E8F66]" />
            <span>Official Application Audit Trail</span>
          </h3>
          <span className="text-[10px] text-slate-400">Chronological history</span>
        </div>

        {claim.statusHistory && claim.statusHistory.length > 0 ? (
          <div className="space-y-3">
            {claim.statusHistory.map((item, hIdx) => {
              const dateStr = item.created_at || item.createdAt;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'Recorded';

              return (
                <div key={hIdx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 uppercase font-mono text-[11px]">
                        {item.status.replace(/_/g, ' ')}
                      </span>
                      {item.updated_by_name && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                          {item.updated_by_name} ({item.updated_by_role || 'Official'})
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{item.remarks || 'Status update logged.'}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 mt-0.5">
                    {formattedDate}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No previous audit records found.</p>
        )}
      </div>

      {/* 6. CLAIM SUMMARY & EVIDENCE DOSSIER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Disaster & Location Dossier */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
          <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#0E8F66]" />
            <span>Disaster & Location Record</span>
          </h3>

          <div className="space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Disaster Event:</span>
              <span className="font-bold text-slate-900">{claim.disaster_type} ({claim.disaster_date ? new Date(claim.disaster_date).toLocaleDateString() : ''})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assistance Requested:</span>
              <span className="font-bold text-slate-900">{claim.assistance_category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Severity Level:</span>
              <span className="font-bold text-slate-900">{claim.damage_severity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GPS Coordinates:</span>
              <span className="font-mono font-bold text-slate-900">{Number(claim.latitude || 0).toFixed(4)}, {Number(claim.longitude || 0).toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Affected Locality:</span>
              <span className="font-bold text-slate-900">{claim.locality || 'District Centre'}, {claim.district}</span>
            </div>
            {claim.is_in_hazard_zone && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px]">
                ✓ Confirmed inside active hazard perimeter
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Evidence Dossier */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              <span>Attached Evidence & AI Review</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              {claim.evidence?.length || 0} Files
            </span>
          </div>

          {claim.evidence && claim.evidence.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5">
              {claim.evidence.map((ev, eIdx) => (
                <div key={eIdx} className="rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 relative group">
                  <img
                    src={`http://localhost:5000${ev.file_path}`}
                    alt={ev.file_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo_sahay.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] p-1 text-center font-bold">
                    View
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs italic">No photos uploaded.</p>
          )}

          {/* AI Preliminary Assessment Snippet */}
          {claim.aiAssessment && (
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> AI Damage Analysis
                </span>
                <span className="font-extrabold text-indigo-950 font-mono">
                  {Math.round(parseFloat(String(claim.aiAssessment.confidence_score || claim.aiAssessment.confidenceScore || 0.82)) * 100)}% Conf.
                </span>
              </div>
              <p className="text-indigo-800">
                Predicted Severity: <strong>{claim.aiAssessment.predicted_damage || claim.aiAssessment.predictedDamage || claim.damage_severity}</strong>
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 7. INTERACTIVE DEMO WORKFLOW CONTROLS (Allows test evaluation of the complete lifecycle) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h4 className="font-black text-xs uppercase tracking-wider text-emerald-400">
              Interactive Test Simulation Controls
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Test Officer & Collector Lifecycle
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          The buttons below allow test simulation of the official government verification workflow for this claim without needing to switch browser sessions:
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Step A: Field Verify */}
          {['SUBMITTED', 'UNDER_FIELD_VERIFICATION'].includes(claim.status) && (
            <button
              onClick={handleSimulateFieldVerification}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              1. Simulate Field Officer Verification
            </button>
          )}

          {/* Step B: Collector Approve */}
          {['FIELD_VERIFIED', 'UNDER_REVIEW'].includes(claim.status) && (
            <button
              onClick={handleSimulateCollectorApproval}
              disabled={actionLoading}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              2. Simulate Collector Approval (Sanction SDRF Grant)
            </button>
          )}

          {/* Step C: Simulate Disbursement */}
          {['APPROVED', 'PAYMENT_PROCESSING'].includes(claim.status) && (
            <button
              onClick={handleSimulateDisbursement}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              3. Simulate DBT Payment Disbursement
            </button>
          )}

          {isDisbursed && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Full lifecycle completed successfully.
            </span>
          )}
        </div>
      </div>

      {/* Digital Acknowledgement Modal */}
      <ReliefAcknowledgementModal
        isOpen={isAckModalOpen}
        claim={claim}
        onClose={() => setIsAckModalOpen(false)}
      />

    </div>
  );
};
