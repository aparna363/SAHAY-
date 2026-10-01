import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, AlertCircle } from 'lucide-react';
import { fetchCollectorReliefOfficers, assignCollectorReliefOfficer } from '../../../services/api';

interface AssignOfficerModalProps {
  claim: any;
  district: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignOfficerModal: React.FC<AssignOfficerModalProps> = ({
  claim,
  district,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [officers, setOfficers] = useState<any[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOfficers();
      setInstructions(`Please verify physical damage for claim ${claim?.claim_id || ''}. Confirm applicant identity, GPS boundary and capture structural damage photographs.`);
    }
  }, [isOpen, claim]);

  const loadOfficers = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCollectorReliefOfficers(district);
      setOfficers(list);
      if (list.length > 0 && !selectedOfficerId) {
        setSelectedOfficerId(String(list[0].id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load verification officers');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficerId) {
      setError('Please select an authorized Verification Officer.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await assignCollectorReliefOfficer(claim.claim_id || claim.id, parseInt(selectedOfficerId, 10), instructions);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign officer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Assign Verification Officer</h3>
              <p className="text-xs text-slate-500">Claim ID: {claim?.claim_id} &bull; {district} District</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAssign} className="p-5 space-y-4 text-xs font-semibold">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Claim Summary Box */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Applicant:</span>
              <strong className="text-slate-900">{claim?.applicant_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Location:</span>
              <strong className="text-slate-800">{claim?.village || 'Village'}, {claim?.taluk || 'Taluk'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Category & Damage:</span>
              <strong className="text-emerald-800">{claim?.assistance_category} ({claim?.damage_severity || 'Damaged'})</strong>
            </div>
          </div>

          {/* Officer Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-extrabold flex items-center justify-between">
              <span>Select Station / Verification Officer:</span>
              <span className="text-[10px] text-slate-500 font-normal">Active Responders in {district}</span>
            </label>

            {loading ? (
              <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                Loading available officers...
              </div>
            ) : officers.length === 0 ? (
              <div className="p-4 text-center text-amber-800 bg-amber-50 rounded-2xl border border-amber-200 font-bold">
                No active station officers found in {district}. Ensure stations are approved.
              </div>
            ) : (
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {officers.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.name} ({off.panchayat || off.district}) &bull; {off.phone}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Special Instructions */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-extrabold">
              Instructions / Priorities for Ground Inspection:
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Specify structural checkpoints or evidence requirements..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || officers.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Shield className="w-4 h-4" />
              <span>{submitting ? 'Assigning...' : 'Dispatch Verification Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
