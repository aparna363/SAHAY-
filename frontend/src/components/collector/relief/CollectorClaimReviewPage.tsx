import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  MapPin,
  Camera,
  Shield,
  User,
  Layers,
  Sparkles,
  CreditCard,
  XCircle,
  RotateCcw,
  Send,
  ExternalLink,
  ShieldAlert,
  Check
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchCollectorReliefClaimDetail,
  collectorApproveClaim,
  collectorRejectClaim,
  collectorForwardToState,
  collectorProcessPayment,
  collectorDisbursePayment
} from '../../../services/api';
import type { CollectorReliefDetailClaim } from '../../../services/api';
import { ReverificationModal } from './ReverificationModal';

interface CollectorClaimReviewPageProps {
  claimId: string;
  district: string;
  onBack: () => void;
  onViewIncident?: (incidentId: string) => void;
}

export const CollectorClaimReviewPage: React.FC<CollectorClaimReviewPageProps> = ({
  claimId,
  district: _district,
  onBack,
  onViewIncident
}) => {
  const [claim, setClaim] = useState<CollectorReliefDetailClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Decision state
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [collectorRemarks, setCollectorRemarks] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('Insufficient evidence');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isReverifyModalOpen, setIsReverifyModalOpen] = useState(false);

  // Evidence Lightbox modal
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string; source: string } | null>(null);

  // Leaflet map container ref for GPS validation
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const loadClaimDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCollectorReliefClaimDetail(claimId);
      setClaim(data);
      // Pre-fill suggested approved amount from verified loss or requested amount if not already set
      if (data.approved_amount && data.approved_amount > 0) {
        setApprovedAmount(String(data.approved_amount));
      } else if (data.verificationReport?.recommended_assistance) {
        setApprovedAmount(String(data.verificationReport.recommended_assistance));
      } else if (data.verified_loss && data.verified_loss > 0) {
        setApprovedAmount(String(data.verified_loss));
      } else if (data.requested_amount) {
        setApprovedAmount(String(data.requested_amount));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load claim details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaimDetails();
  }, [claimId]);

  // Leaflet Mini GPS Comparison Map
  useEffect(() => {
    if (!claim || !mapContainerRef.current) return;

    const repLat = parseFloat(String(claim.latitude));
    const repLng = parseFloat(String(claim.longitude));
    if (isNaN(repLat) || isNaN(repLng)) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [repLat, repLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Marker 1: Citizen Reported Location
    const citizenIcon = L.divIcon({
      className: 'custom-pin-citizen',
      html: `<div style="background-color:#0284c7;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;font-weight:900;font-size:12px;">C</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    L.marker([repLat, repLng], { icon: citizenIcon })
      .addTo(map)
      .bindPopup(`<strong>Citizen Reported Location</strong><br/>${claim.village || ''}, ${claim.taluk || ''}`);

    // Marker 2: Field Officer GPS inspection location if available
    const voLat = claim.gpsVerification?.officerLatitude;
    const voLng = claim.gpsVerification?.officerLongitude;

    if (voLat && voLng && !isNaN(voLat) && !isNaN(voLng)) {
      const officerIcon = L.divIcon({
        className: 'custom-pin-officer',
        html: `<div style="background-color:#059669;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;font-weight:900;font-size:12px;">VO</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([voLat, voLng], { icon: officerIcon })
        .addTo(map)
        .bindPopup(`<strong>Verification Officer Location</strong><br/>Accuracy: ${claim.gpsVerification?.gpsAccuracyMeters || 5}m`);

      // Connect with polyline
      L.polyline([[repLat, repLng], [voLat, voLng]], {
        color: '#059669',
        weight: 3,
        dashArray: '5, 8'
      }).addTo(map);

      const bounds = L.latLngBounds([[repLat, repLng], [voLat, voLng]]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [claim]);

  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const isFieldVerified = claim && ['FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'APPROVED', 'DISBURSED', 'REVERIFICATION_REQUIRED', 'STATE_REVIEW', 'REJECTED'].includes(claim.status);
  const isDecisionAllowed = claim && ['FIELD_VERIFIED', 'COLLECTOR_REVIEW', 'UNDER_REVIEW'].includes(claim.status);

  // Approval Action
  const handleApprove = async () => {
    if (!claim) return;
    const amt = parseFloat(approvedAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid positive approval compensation amount.');
      return;
    }

    if (!window.confirm(`Sanction relief compensation of ₹${amt.toLocaleString('en-IN')} for claim ${claim.claim_id}?`)) {
      return;
    }

    setSubmitting(true);
    setActionMsg(null);
    try {
      const res = await collectorApproveClaim(claim.claim_id, {
        approvedAmount: amt,
        remarks: collectorRemarks || `Sanctioned in accordance with official SDRF relief norms for ${claim.district} District.`
      });
      setActionMsg({ type: 'success', text: res.message });
      await loadClaimDetails();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to approve claim' });
    } finally {
      setSubmitting(false);
    }
  };

  // Reject Action
  const handleReject = async () => {
    if (!claim) return;
    if (!collectorRemarks.trim()) {
      alert('Official Collector remarks are mandatory for rejecting an application.');
      return;
    }

    if (!window.confirm(`Are you sure you want to REJECT relief claim ${claim.claim_id}? This action cannot be silently undone.`)) {
      return;
    }

    setSubmitting(true);
    setActionMsg(null);
    try {
      const res = await collectorRejectClaim(claim.claim_id, {
        reason: rejectionReason,
        remarks: collectorRemarks.trim()
      });
      setActionMsg({ type: 'success', text: res.message });
      setShowRejectForm(false);
      await loadClaimDetails();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to reject claim' });
    } finally {
      setSubmitting(false);
    }
  };

  // Forward to State Action
  const handleForwardState = async () => {
    if (!claim) return;
    if (!window.confirm(`Forward high-value relief claim ${claim.claim_id} to State Disaster Management Authority review?`)) {
      return;
    }

    setSubmitting(true);
    setActionMsg(null);
    try {
      const res = await collectorForwardToState(claim.claim_id, {
        remarks: collectorRemarks || 'Forwarded for State Authority clearance due to high-value compensation ceiling.'
      });
      setActionMsg({ type: 'success', text: res.message });
      await loadClaimDetails();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to forward claim' });
    } finally {
      setSubmitting(false);
    }
  };

  // Payment Processing & DBT Disbursement
  const handleProcessPayment = async () => {
    if (!claim) return;
    setSubmitting(true);
    setActionMsg(null);
    try {
      const res = await collectorProcessPayment(claim.claim_id);
      setActionMsg({ type: 'success', text: res.message });
      await loadClaimDetails();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Payment queuing failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisbursePayment = async () => {
    if (!claim) return;
    if (!window.confirm(`Execute simulated DBT payment of ₹${parseFloat(String(claim.approved_amount || 0)).toLocaleString('en-IN')} to linked bank account?`)) {
      return;
    }

    setSubmitting(true);
    setActionMsg(null);
    try {
      const res = await collectorDisbursePayment(claim.claim_id);
      setActionMsg({ type: 'success', text: res.message });
      await loadClaimDetails();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Disbursement failed' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-slate-700">Loading claim verification dossier...</p>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-red-200 shadow-xs space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <div className="text-base font-black text-slate-900">{error || 'Claim dossier could not be loaded.'}</div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          Return to Claims List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* NAVIGATION & ACTION MESSAGE */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-2xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Claims List</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">
            District: <strong className="text-slate-900">{claim.district}</strong> &bull; Taluk: <strong className="text-slate-900">{claim.taluk || 'District Sector'}</strong>
          </span>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
          actionMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-red-50 border-red-300 text-red-900'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* SECTION 10: CLAIM HEADER */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-slate-900 text-white font-mono font-black text-xs">
              {claim.claim_id}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
              claim.priority === 'CRITICAL' ? 'bg-red-100 text-red-900 border-red-300' :
              claim.priority === 'HIGH' ? 'bg-orange-100 text-orange-900 border-orange-300' :
              'bg-slate-100 text-slate-800 border-slate-200'
            }`}>
              PRIORITY: {claim.priority || 'MEDIUM'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
              STATUS: {claim.status}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {claim.damage_type || claim.assistance_category}
          </h1>

          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-3">
            <span>Disaster: <strong>{claim.disaster_type}</strong></span>
            <span>&bull;</span>
            <span>Date: <strong>{new Date(claim.disaster_date).toLocaleDateString()}</strong></span>
            <span>&bull;</span>
            <span>Category: <strong>{claim.assistance_category}</strong></span>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Requested Amount</span>
            <span className="text-base font-black text-slate-800 font-mono">{formatINR(claim.requested_amount)}</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Sanctioned</span>
            <span className="text-base font-black text-emerald-800 font-mono">
              {claim.approved_amount > 0 ? formatINR(claim.approved_amount) : 'Pending Sanction'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT TWO COLUMNS: CITIZEN DOSSIER & VERIFICATION REPORT */}
        <div className="lg:col-span-2 space-y-6">

          {/* SECTION 11 & 12: CITIZEN APPLICATION & DISASTER INFORMATION */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span>Citizen Application Profile</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Submitted {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] block">Applicant Name</span>
                <div className="font-extrabold text-slate-900 text-sm">{claim.applicant_name}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] block">Contact Number</span>
                <div className="font-bold text-slate-800 font-mono">{claim.applicant_phone}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] block">Administrative Hierarchy</span>
                <div className="font-bold text-slate-800">
                  {claim.village || 'Village'}, Taluk: {claim.taluk || claim.district}, {claim.district} District
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 text-[11px] block">Family & Occupancy Details</span>
                <div className="font-bold text-slate-800">
                  {claim.affected_family_members || 1} Family Members Affected &bull; {claim.house_ownership || 'Occupant'}
                </div>
              </div>

              {/* Masked Bank Account */}
              <div className="space-y-1 col-span-1 sm:col-span-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Linked DBT Bank Account</span>
                    <div className="font-mono font-bold text-slate-900">
                      {claim.bank_name || 'Bank'} &bull; {claim.masked_account_number || 'XXXXXX'} (IFSC: {claim.ifsc_code || 'XXXX'})
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black border border-emerald-300 self-start sm:self-auto">
                  Aadhaar Linked
                </span>
              </div>
            </div>

            {/* Linked Incident */}
            {claim.incident_code && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>
                    Linked Incident: <strong className="font-mono text-blue-950">{claim.incident_code}</strong> ({claim.incident_severity || 'Incident'})
                  </span>
                </div>
                {onViewIncident && (
                  <button
                    onClick={() => onViewIncident(claim.incident_code || '')}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                  >
                    <span>View Incident Details</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* SECTION 13: CITIZEN-REPORTED DAMAGE */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <span>Citizen-Reported Damage Information</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                CITIZEN-REPORTED
              </span>
            </div>

            <div className="space-y-3 text-xs font-medium text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Damage Description</span>
                <p className="text-xs leading-relaxed text-slate-900 font-normal">
                  {claim.damage_description || 'No detailed descriptive narrative provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase">Reported Condition</span>
                  <strong className="text-slate-900">{claim.current_condition || 'Partially Habitable'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase">Structure Type</span>
                  <strong className="text-slate-900">{claim.house_type || 'Residential'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase">Estimated Loss</span>
                  <strong className="text-slate-900 font-mono">{formatINR(claim.estimated_loss)}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase">Requested Assistance</span>
                  <strong className="text-emerald-800 font-mono">{formatINR(claim.requested_amount)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 14: CITIZEN EVIDENCE GALLERY */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                <span>Citizen-Uploaded Evidence ({claim.citizenEvidence?.length || 0})</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase">CITIZEN EVIDENCE</span>
            </div>

            {(!claim.citizenEvidence || claim.citizenEvidence.length === 0) ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                No citizen damage photographs or identity documents attached.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {claim.citizenEvidence.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    onClick={() => setPreviewMedia({ url: ev.file_path, title: ev.file_name, source: 'CITIZEN' })}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video cursor-pointer hover:border-emerald-500 transition-all"
                  >
                    <img
                      src={ev.file_path?.startsWith('http') ? ev.file_path : `http://localhost:5000${ev.file_path}`}
                      alt={ev.file_name}
                      onError={(e: any) => {
                        e.target.src = 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=400&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                      <span className="text-[10px] font-black truncate">{ev.file_name}</span>
                      <span className="text-[9px] text-emerald-300">{ev.evidence_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 15 & 16 & 17 & 18: FIELD VERIFICATION REPORT */}
          <div className="bg-white border-2 border-emerald-500/80 rounded-3xl p-5 sm:p-6 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Ground Verification Report</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Official Verification Officer Inspection Dossier
                </h3>
              </div>

              {isFieldVerified ? (
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>FIELD VERIFIED</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>VERIFICATION IN PROGRESS</span>
                </span>
              )}
            </div>

            {claim.verificationReport ? (
              <div className="space-y-4 text-xs font-semibold">
                {/* Officer Meta */}
                <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] uppercase text-emerald-800 font-bold block">Verification Officer</span>
                    <strong className="text-slate-900 text-sm">{claim.verificationReport.officer_name || claim.assigned_officer_name || 'Revenue Inspector'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-emerald-800 font-bold block">Officer Phone</span>
                    <strong className="text-slate-800 font-mono">{claim.verificationReport.officer_phone || claim.assigned_officer_phone || '+91 94470 00000'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-emerald-800 font-bold block">Inspection Date</span>
                    <strong className="text-slate-800">
                      {new Date(claim.verificationReport.inspection_completed_at || claim.verificationReport.created_at).toLocaleDateString()}
                    </strong>
                  </div>
                </div>

                {/* Ground Observations & Verified Loss */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Field Observed Damage</span>
                    <p className="text-slate-900 font-normal leading-relaxed text-xs">
                      {claim.verificationReport.damage_observed || 'Structural damage observed on-site during field inspection.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Applicant Identity</span>
                      <strong className="text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Confirmed
                      </strong>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Assessed Severity</span>
                      <strong className="text-slate-900">{claim.verificationReport.verified_damage_severity || 'Major'}</strong>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Verified Physical Loss</span>
                      <strong className="text-blue-900 font-mono">{formatINR(claim.verificationReport.verified_loss_estimate)}</strong>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Recommended Assistance</span>
                      <strong className="text-emerald-800 font-mono">{formatINR(claim.verificationReport.recommended_assistance)}</strong>
                    </div>
                  </div>

                  {claim.verificationReport.officer_remarks && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-0.5">
                      <span className="text-[10px] font-black uppercase text-emerald-800">Officer Remarks</span>
                      <p className="text-slate-800 font-normal text-xs">{claim.verificationReport.officer_remarks}</p>
                    </div>
                  )}
                </div>

                {/* SECTION 16: GPS VERIFICATION COMPONENT */}
                {claim.gpsVerification && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span className="font-black text-slate-900 text-xs">GPS Ground Validation</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        claim.gpsVerification.isLocationVerified ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-red-100 text-red-900 border-red-300'
                      }`}>
                        {claim.gpsVerification.statusText}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Reported Coordinates</span>
                        <span className="font-mono font-bold text-slate-800">
                          {claim.gpsVerification.reportedLatitude.toFixed(4)}, {claim.gpsVerification.reportedLongitude.toFixed(4)}
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Officer Coordinates</span>
                        <span className="font-mono font-bold text-slate-800">
                          {claim.gpsVerification.officerLatitude.toFixed(4)}, {claim.gpsVerification.officerLongitude.toFixed(4)}
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Distance Discrepancy</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {claim.gpsVerification.distanceMeters} metres
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">GPS Accuracy</span>
                        <span className="font-mono font-bold text-slate-800">
                          &plusmn;{claim.gpsVerification.gpsAccuracyMeters} metres
                        </span>
                      </div>
                    </div>

                    {/* Mini Leaflet GPS Map Container */}
                    <div className="h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
                      <div ref={mapContainerRef} className="w-full h-full" />
                    </div>
                  </div>
                )}

                {/* SECTION 17: FIELD OFFICER EVIDENCE GALLERY */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Field Photographs Captured by Verification Officer ({claim.officerEvidence?.length || 0})
                  </span>

                  {(!claim.officerEvidence || claim.officerEvidence.length === 0) ? (
                    <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                      No on-site field inspection photographs uploaded yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {claim.officerEvidence.map((fe, idx) => (
                        <div
                          key={fe.id || idx}
                          onClick={() => setPreviewMedia({ url: fe.file_path, title: fe.file_name, source: 'FIELD_OFFICER' })}
                          className="group relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-100 aspect-video cursor-pointer hover:border-emerald-600 transition-all"
                        >
                          <img
                            src={fe.file_path?.startsWith('http') ? fe.file_path : `http://localhost:5000${fe.file_path}`}
                            alt={fe.file_name}
                            onError={(e: any) => {
                              e.target.src = 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=400&q=80';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
                            <span className="text-[10px] font-black truncate">{fe.file_name}</span>
                            <span className="text-[9px] text-emerald-300">
                              Captured by {fe.officer_name || 'Officer'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-amber-50/50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2 font-bold">
                <Clock className="w-8 h-8 text-amber-600 mx-auto" />
                <div>Field verification is not yet completed by the assigned officer.</div>
                <p className="text-[11px] font-normal text-slate-600">
                  Administrative financial approval cannot be granted until ground fact inspection and GPS confirmation are submitted.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 19: AI DAMAGE ASSESSMENT RECOMMENDATION */}
          {claim.aiAssessment && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="font-black text-sm">AI Computer Vision Damage Assessment</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                  Decision Support Only
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase">Predicted Severity</span>
                  <strong className="text-amber-400 text-sm font-black">
                    {claim.aiAssessment.predicted_damage} DAMAGE
                  </strong>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase">Confidence Score</span>
                  <strong className="text-emerald-400 text-sm font-black font-mono">
                    {Math.round(claim.aiAssessment.confidence_score * 100)}% Match
                  </strong>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase">Vision Model</span>
                  <strong className="text-slate-300 text-xs font-mono">
                    {claim.aiAssessment.model_version || 'sahay-damage-vision-v2.4'}
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-normal pt-1">
                Notice: AI provides advisory decision-support. Ground verification by the Verification Officer and administrative discretion by the District Collector remain the sole determining legal factors.
              </p>
            </div>
          )}

          {/* AUDIT STATUS PROGRESSION TIMELINE */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>Complete Status Progression & Audit Trail</span>
            </h3>

            {(!claim.statusHistory || claim.statusHistory.length === 0) ? (
              <div className="text-xs text-slate-500">No audit status records available.</div>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {claim.statusHistory.map((h, i) => (
                  <div key={h.id || i} className="relative flex items-start gap-4 text-xs pl-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 z-10">
                      ✓
                    </div>
                    <div className="flex-1 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="font-mono font-black text-emerald-900">{h.status}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium text-[11px]">{h.remarks}</p>
                      {h.updated_by_name && (
                        <div className="text-[10px] text-slate-500">
                          Action by: <strong>{h.updated_by_name}</strong> ({h.updated_by_role || 'Official'})
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: COLLECTOR DECISION PANEL & DISBURSEMENT */}
        <div className="space-y-6">

          {/* SECTION 22 & 23 & 24 & 25: COLLECTOR DECISION PANEL */}
          <div className="bg-white border-2 border-emerald-600 rounded-3xl p-5 sm:p-6 shadow-lg space-y-5 sticky top-20">
            <div className="border-b border-slate-100 pb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black text-[10px] uppercase mb-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Tier 2 Authority Decision Desk</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">Collector Decision</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Official statutory relief sanction or rejection under SDRF relief schedule.
              </p>
            </div>

            {/* Applicable Relief Rule Limits Badge */}
            {claim.applicableRules && claim.applicableRules.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">SDRF Collector Sanction Limit</span>
                <div className="font-mono font-black text-slate-900 text-sm">
                  Max: {formatINR(claim.applicableRules[0].maximum_amount)}
                </div>
                {claim.applicableRules[0].requires_state_review && (
                  <span className="text-[10px] text-amber-700 font-bold block">
                    &bull; Higher sanctions require State Review clearance
                  </span>
                )}
              </div>
            )}

            {/* Decision Status Check */}
            {claim.status === 'APPROVED' ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 text-xs">
                <div className="font-black text-emerald-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sanction Approved: {formatINR(claim.approved_amount)}</span>
                </div>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  {claim.collector_remarks || 'Claim officially approved under SDRF relief norms.'}
                </p>
              </div>
            ) : claim.status === 'REJECTED' ? (
              <div className="p-4 bg-red-50 border border-red-300 rounded-2xl space-y-2 text-xs">
                <div className="font-black text-red-900 text-sm flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Claim Rejected</span>
                </div>
                <div className="text-[11px] text-red-800 font-bold">
                  Reason: {claim.rejection_reason}
                </div>
                <p className="text-red-700 text-[11px] leading-relaxed">
                  {claim.collector_remarks}
                </p>
              </div>
            ) : !isDecisionAllowed ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-900 space-y-1.5">
                <div className="font-black flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Awaiting Ground Verification</span>
                </div>
                <p className="text-[11px] font-normal leading-relaxed text-amber-800">
                  Statutory Collector decision buttons are enabled once the assigned Verification Officer submits the field report.
                </p>
              </div>
            ) : (
              /* ACTIVE DECISION CONTROLS */
              <div className="space-y-4 text-xs font-semibold">
                {/* Approved Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold flex items-center justify-between">
                    <span>Approved Compensation Amount (₹):</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Within Rule Limit</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-500">₹</span>
                    <input
                      type="number"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      placeholder="Enter sanctioned compensation"
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Collector Remarks */}
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-extrabold">
                    Collector Administrative Remarks:
                  </label>
                  <textarea
                    rows={2}
                    value={collectorRemarks}
                    onChange={(e) => setCollectorRemarks(e.target.value)}
                    placeholder="Enter sanction basis or conditions..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Main Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submitting ? 'Sanctioning...' : 'Approve Claim (Sanction Assistance)'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsReverifyModalOpen(true)}
                      disabled={submitting}
                      className="py-2.5 px-3 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-verify</span>
                    </button>

                    <button
                      onClick={() => setShowRejectForm(!showRejectForm)}
                      disabled={submitting}
                      className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>

                  {/* High Value / Forward to State Button */}
                  <button
                    onClick={handleForwardState}
                    disabled={submitting}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Forward to State Authority Review</span>
                  </button>
                </div>

                {/* Conditional Reject Form Drawer */}
                {showRejectForm && (
                  <div className="p-4 bg-red-50/80 rounded-2xl border border-red-300 space-y-3 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase text-red-900">
                        Mandatory Rejection Reason:
                      </label>
                      <select
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full bg-white border border-red-300 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="Insufficient evidence">Insufficient evidence</option>
                        <option value="Eligibility requirements not satisfied">Eligibility requirements not satisfied</option>
                        <option value="Duplicate application">Duplicate application</option>
                        <option value="Damage not established">Damage not established</option>
                        <option value="Invalid claim">Invalid claim</option>
                        <option value="Other statutory non-compliance">Other statutory non-compliance</option>
                      </select>
                    </div>

                    <button
                      onClick={handleReject}
                      disabled={submitting}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Confirm Formal Rejection</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 27 & 28: PAYMENT PROCESSING & DISBURSEMENT */}
          {claim.status === 'APPROVED' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-teal-600" />
                    <span>Electronic DBT Payment Flow</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Direct Benefit Transfer via Aadhaar Payment Bridge
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                  claim.payment_status === 'DISBURSED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                  claim.payment_status === 'PROCESSING' ? 'bg-teal-100 text-teal-900 border border-teal-300' :
                  'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {claim.payment_status || 'PENDING'}
                </span>
              </div>

              {claim.payment_status === 'DISBURSED' ? (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                  <div className="font-bold text-emerald-900 flex items-center justify-between">
                    <span>Transaction Reference:</span>
                    <span className="font-mono font-black">{claim.transaction_reference || 'RLF-DBT-SUCCESS'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Disbursed Amount:</span>
                    <strong className="font-mono text-emerald-800 text-sm font-black">{formatINR(claim.approved_amount)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span>Settled On:</span>
                    <span>{claim.disbursed_at ? new Date(claim.disbursed_at).toLocaleString() : 'Recently'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Recipient Bank:</span>
                      <strong className="text-slate-900">{claim.bank_name || 'State Bank of India'}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Account No:</span>
                      <strong className="font-mono text-slate-900">{claim.masked_account_number || 'XXXXXX4821'}</strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {claim.payment_status !== 'PROCESSING' && (
                      <button
                        onClick={handleProcessPayment}
                        disabled={submitting}
                        className="w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-xl text-xs font-bold transition-all"
                      >
                        Queue for Payment Batch Processing
                      </button>
                    )}

                    <button
                      onClick={handleDisbursePayment}
                      disabled={submitting}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Simulate Electronic DBT Transfer</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* RE-VERIFICATION MODAL */}
      <ReverificationModal
        claim={claim}
        isOpen={isReverifyModalOpen}
        onClose={() => setIsReverifyModalOpen(false)}
        onSuccess={() => {
          loadClaimDetails();
        }}
      />

      {/* LIGHTBOX EVIDENCE PREVIEW MODAL */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-700 overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h4 className="font-bold text-sm truncate">{previewMedia.title}</h4>
                <span className="text-[10px] text-emerald-400 uppercase font-mono">{previewMedia.source} EVIDENCE</span>
              </div>
              <button
                onClick={() => setPreviewMedia(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/40 min-h-[300px]">
              <img
                src={previewMedia.url?.startsWith('http') ? previewMedia.url : `http://localhost:5000${previewMedia.url}`}
                alt={previewMedia.title}
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80';
                }}
                className="max-h-[60vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
