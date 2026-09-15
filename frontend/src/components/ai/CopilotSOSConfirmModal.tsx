import React, { useState } from 'react';
import { X, AlertOctagon, Radio, ShieldAlert, CheckCircle2, Phone } from 'lucide-react';
import { dispatchCopilotSOS } from '../../services/aiService';

interface CopilotSOSConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  disasterType?: string;
  severity?: string;
}

export const CopilotSOSConfirmModal: React.FC<CopilotSOSConfirmModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  locationName,
  disasterType = 'Flood',
  severity = 'CRITICAL'
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [dispatchedIncident, setDispatchedIncident] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const lat = latitude || 9.5916;
  const lng = longitude || 76.5222;

  const handleConfirmSOS = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await dispatchCopilotSOS({
        latitude: lat,
        longitude: lng,
        disasterType,
        severity,
        description: `Emergency rescue required! Incident reported through SAHAY AI Disaster Copilot at ${locationName || 'GPS Location'}.`
      });

      setDispatchedIncident(res.incident || { incidentCode: 'INC-2026-SOS' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch SOS alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDispatchedIncident(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border-2 border-red-500 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Top Bar */}
        <div className="p-5 border-b border-red-100 flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xs animate-pulse">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base text-red-900">
                {dispatchedIncident ? 'Emergency SOS Broadcasted' : 'Confirm Emergency SOS Dispatch'}
              </h3>
              <p className="text-xs text-red-700 font-semibold">Immediate Rapid Rescue & Control Room Broadcast</p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-200/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {dispatchedIncident ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900">SOS Distress Signal Active!</h4>
                <p className="text-xs text-slate-500 font-mono font-bold">
                  Incident Reference: <span className="text-red-600 font-black">{dispatchedIncident.incidentCode || dispatchedIncident.code}</span>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-700 space-y-2 text-left">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-600 animate-ping" />
                  <span>Dispatched to Emergency Responders:</span>
                </p>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  <li>Kerala Police Emergency Response Support System (ERSS 112)</li>
                  <li>District Disaster Management Authority Control Room (1077)</li>
                  <li>Nearest Active Fire & Rescue Services Station</li>
                </ul>
              </div>

              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-800 font-bold">
                Stay in a safe, visible spot. Keep your phone line clear for rescue verification.
              </div>
            </div>
          ) : (
            <>
              <div className="bg-red-50/80 border border-red-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Important User Confirmation</span>
                </div>
                <p className="text-xs text-red-950 font-medium leading-relaxed">
                  Triggering an Emergency SOS will immediately dispatch your precise GPS coordinates to the <strong>District Disaster Operations Center</strong> and <strong>Rescue Station Teams</strong>.
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Reported Disaster:</span>
                  <span className="font-bold text-slate-900">{disasterType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Assessed Threat:</span>
                  <span className="font-black text-red-600">{severity}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">GPS Location:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Sector:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">{locationName}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-100 text-rose-800 text-xs font-bold rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <a
                  href="tel:112"
                  className="flex-1 py-3 px-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold border border-indigo-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Dial 112 Directly</span>
                </a>

                <a
                  href="tel:1077"
                  className="flex-1 py-3 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#0B4D3B] text-xs font-extrabold border border-emerald-200 flex items-center justify-center gap-2 transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Dial 1077 (DDMA)</span>
                </a>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            {dispatchedIncident ? 'Close' : 'Cancel'}
          </button>

          {!dispatchedIncident && (
            <button
              onClick={handleConfirmSOS}
              disabled={submitting}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Radio className={`w-4 h-4 ${submitting ? 'animate-spin' : 'animate-ping'}`} />
              <span>{submitting ? 'Broadcasting SOS...' : '🚨 CONFIRM & DISPATCH SOS'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
