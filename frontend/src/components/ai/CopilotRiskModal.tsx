import React from 'react';
import { X, AlertTriangle, ShieldCheck, ShieldAlert, MapPin, ArrowRight } from 'lucide-react';
import type { RiskAssessmentData } from '../../services/aiService';

interface CopilotRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  riskData: RiskAssessmentData | null;
  loading: boolean;
  onFindShelter: () => void;
}

export const CopilotRiskModal: React.FC<CopilotRiskModalProps> = ({
  isOpen,
  onClose,
  locationName,
  riskData,
  loading,
  onFindShelter
}) => {
  if (!isOpen) return null;

  const level = riskData?.level || 'Low';

  const badgeConfig = {
    Critical: {
      bg: 'bg-red-50 text-red-700 border-red-200',
      pill: 'bg-red-600 text-white',
      border: 'border-red-500',
      icon: ShieldAlert
    },
    High: {
      bg: 'bg-orange-50 text-orange-700 border-orange-200',
      pill: 'bg-orange-600 text-white',
      border: 'border-orange-500',
      icon: AlertTriangle
    },
    Moderate: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      pill: 'bg-amber-500 text-slate-950 font-bold',
      border: 'border-amber-400',
      icon: AlertTriangle
    },
    Low: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      pill: 'bg-emerald-600 text-white',
      border: 'border-emerald-500',
      icon: ShieldCheck
    }
  }[level] || {
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    pill: 'bg-slate-600 text-white',
    border: 'border-slate-400',
    icon: ShieldCheck
  };

  const Icon = badgeConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              🔍
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Your Current Risk Assessment</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{locationName || 'Live GPS Location'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-600">Evaluating PostGIS spatial layers & active weather warnings...</p>
            </div>
          ) : riskData ? (
            <>
              {/* Risk Level Banner */}
              <div className={`p-4.5 rounded-2xl border ${badgeConfig.bg} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${badgeConfig.pill} shadow-xs`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">Assessed Threat Level</span>
                    <h4 className="text-2xl font-black">{level.toUpperCase()}</h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Vulnerability Index</span>
                  <span className="text-2xl font-black font-mono">{riskData.score}/100</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Relative Risk Gauge</span>
                  <span>{riskData.score}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      level === 'Critical' ? 'bg-red-600' :
                      level === 'High' ? 'bg-orange-500' :
                      level === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(10, riskData.score)}%` }}
                  />
                </div>
              </div>

              {/* Reasons Breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-black uppercase text-slate-700 tracking-wider">Contributing Risk Factors</h5>
                <ul className="space-y-2 text-xs text-slate-700">
                  {riskData.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-emerald-700 font-bold shrink-0">•</span>
                      <span className="font-medium leading-relaxed">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Action */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-1">
                <h5 className="text-xs font-black text-emerald-900 uppercase">Recommended Action:</h5>
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  {riskData.recommendedAction}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              Unable to compute live risk assessment. Please check GPS settings.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onFindShelter();
            }}
            className="px-5 py-2.5 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>Find Safe Shelter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
