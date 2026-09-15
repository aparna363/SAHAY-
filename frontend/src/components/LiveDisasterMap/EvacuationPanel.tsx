import React from 'react';
import {
  X,
  Radio,
  CheckCircle2,
  Navigation,
  Phone,
  ShieldCheck,
  ArrowRight,
  MapPin
} from 'lucide-react';
import type { EvacuateMeResponse } from '../../services/mapService';

interface EvacuationPanelProps {
  evacuationData: EvacuateMeResponse;
  onStartRoute: (shelter: any) => void;
  onClose: () => void;
}

export const EvacuationPanel: React.FC<EvacuationPanelProps> = ({
  evacuationData,
  onStartRoute,
  onClose
}) => {
  const recommended = evacuationData.recommendedShelter;
  const explanation = evacuationData.explanation;
  const otherShelters = evacuationData.rankedShelters.filter(s => s.id !== recommended?.id);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-5 animate-slideDown max-w-xl w-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600">
              DECISION SUPPORT PROTOCOL
            </span>
            <h2 className="text-lg font-black text-slate-900">EVACUATION RECOMMENDATION</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Recommended Shelter Card */}
      {recommended ? (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white rounded-2xl border-2 border-emerald-500/80 p-4 sm:p-5 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute -top-3 -right-3 w-16 h-16 bg-emerald-200/50 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0E8F66] text-white text-[10px] font-black tracking-wider uppercase mb-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-200" />
                <span>RECOMMENDED SAFEST CENTER</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                🏫 {recommended.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#0E8F66]" />
                <span>{recommended.address}</span>
              </p>
            </div>

            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              🟢 OPEN
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 font-bold block">Distance</span>
              <span className="text-sm font-black text-slate-800">{recommended.distanceKm} km</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 font-bold block">Travel Time</span>
              <span className="text-sm font-black text-slate-800">
                {recommended.route?.travelTimeMinutes || 15} min
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 font-bold block">Route Risk</span>
              <span className="text-sm font-black text-emerald-600">
                {recommended.route?.riskLevel || 'LOW'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 font-bold block">Available Beds</span>
              <span className="text-sm font-black text-emerald-700">
                {recommended.availableCapacity} / {recommended.capacity}
              </span>
            </div>
          </div>

          {/* Rationale Checklist (Why this shelter?) */}
          {explanation?.reasons && (
            <div className="space-y-1.5 pt-2 border-t border-emerald-200/60 text-xs">
              <span className="text-[11px] font-bold text-slate-700">Evacuation Rationale:</span>
              <ul className="space-y-1 text-slate-600 font-medium">
                {explanation.reasons.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0E8F66] shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Start Safe Route Action Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => onStartRoute(recommended)}
              className="flex-1 py-3 bg-[#043e2e] hover:bg-[#065f46] active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-emerald-900"
            >
              <Navigation className="w-4 h-4 text-emerald-300" />
              <span>START SAFE ROUTE</span>
            </button>

            {recommended.contactNumber && (
              <a
                href={`tel:${recommended.contactNumber}`}
                className="p-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition-all"
                title="Call Camp Officer"
              >
                <Phone className="w-4 h-4 text-slate-700" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 text-xs">
          No available evacuation centers currently found matching criteria. Contact emergency desk at 1077.
        </div>
      )}

      {/* Alternative Ranked Shelters */}
      {otherShelters.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 block">
            Alternative Safe Evacuation Centers ({otherShelters.length}):
          </span>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {otherShelters.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100/70 flex items-center justify-between text-xs gap-3 transition-colors"
              >
                <div>
                  <p className="font-bold text-slate-900">{s.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {s.distanceKm} km &bull; {s.availableCapacity} beds open &bull; Risk: {s.route?.riskLevel || 'LOW'}
                  </p>
                </div>

                <button
                  onClick={() => onStartRoute(s)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-[#0B4D3B] border border-emerald-200 font-bold text-[11px] rounded-lg transition-all shrink-0 flex items-center gap-1"
                >
                  <span>Route</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
