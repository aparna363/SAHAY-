import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, Send } from 'lucide-react';
import { collectorRequestReverification } from '../../../services/api';

interface ReverificationModalProps {
  claim: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReverificationModal: React.FC<ReverificationModalProps> = ({
  claim,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('Roof damage and foundation integrity require supplementary physical inspection.');
  const [evidenceRequired, setEvidenceRequired] = useState('Additional clear daylight photographs of external support walls and structural foundation.');
  const [instructions, setInstructions] = useState('Conduct repeat field inspection with local Panchayat Engineer. Verify silt marks and cross-check boundary fence.');
  const [priority, setPriority] = useState<'HIGH' | 'CRITICAL' | 'MEDIUM'>('HIGH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Official reason for re-verification is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await collectorRequestReverification(claim.claim_id || claim.id, {
        reason: reason.trim(),
        evidenceRequired: evidenceRequired.trim(),
        instructions: instructions.trim(),
        priority
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit re-verification request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-orange-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-800 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Request Field Re-verification</h3>
              <p className="text-xs text-orange-800 font-bold">Claim ID: {claim?.claim_id}</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-semibold">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-extrabold">
              Official Reason for Re-verification: <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Roof damage requires additional structural assessment."
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
              required
            />
          </div>

          {/* Additional Evidence Required */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-extrabold">
              Supplementary Evidence Required:
            </label>
            <input
              type="text"
              value={evidenceRequired}
              onChange={(e) => setEvidenceRequired(e.target.value)}
              placeholder="e.g. Additional close-up roof and foundation photographs."
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Instructions to Verification Officer */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-extrabold">
              Directives / Instructions to Verification Officer:
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Capture interior and exterior roof damage. Validate with ward member."
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Priority Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-extrabold">
              Inspection Priority:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['MEDIUM', 'HIGH', 'CRITICAL'] as const).map((pr) => (
                <button
                  key={pr}
                  type="button"
                  onClick={() => setPriority(pr)}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
                    priority === pr
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pr}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
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
              disabled={submitting}
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Sending Request...' : 'Issue Re-verification Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
