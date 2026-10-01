import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, Phone, User } from 'lucide-react';
import { scheduleFieldOfficerVisit } from '../../services/api';

interface ScheduleVisitModalProps {
  claim: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedClaim?: any) => void;
}

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({
  claim,
  isOpen,
  onClose,
  onSuccess
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [visitDate, setVisitDate] = useState(defaultDate);
  const [visitTime, setVisitTime] = useState('10:30');
  const [notes, setNotes] = useState(
    `Field inspection for damage verification at ${claim?.village || claim?.locality || claim?.district || 'site'}. Contact applicant prior to arrival.`
  );
  const [contactApplicant, setContactApplicant] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !claim) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDate) {
      setError('Please select a visit date');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fullNotes = contactApplicant
        ? `${notes} [Applicant pre-notified by phone: ${claim.applicant_phone || 'N/A'}]`
        : notes;

      const res = await scheduleFieldOfficerVisit(claim.claim_id || claim.id, {
        visitDate,
        visitTime,
        notes: fullNotes
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule field visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-teal-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Schedule Field Visit</h3>
              <p className="text-xs text-emerald-200 font-medium">
                Claim: <span className="font-mono font-bold text-amber-300">{claim.claim_id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Claim Summary Strip */}
        <div className="px-5 py-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-slate-800">{claim.applicant_name}</span>
            {claim.applicant_phone && (
              <span className="text-slate-500 flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3 text-slate-400" />
                {claim.applicant_phone}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            <span>{claim.village || claim.taluk || claim.district}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-semibold">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Visit Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 font-sans"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Visit Time (Approx.)
              </label>
              <input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Field Officer Visit Notes / Special Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Inspect collapsed boundary wall, verify identity with ration card, bring GPS device..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 font-sans resize-none"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={contactApplicant}
              onChange={(e) => setContactApplicant(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <div>
              <span className="text-slate-800 font-bold block">Notify Applicant via SMS / App Notification</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Citizen will receive an instant schedule alert with officer contact & expected arrival window.
              </span>
            </div>
          </label>

          {/* Workflow Notice */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium leading-relaxed">
            ℹ️ <strong>Workflow:</strong> Scheduling moves this application to <strong>Visit Scheduled</strong> status. You can conduct ground inspection, capture GPS & photos, and submit the verification report afterwards.
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Scheduling...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Scheduled Visit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
