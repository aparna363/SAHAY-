import React from 'react';
import { Flame, AlertTriangle, ArrowRight, X } from 'lucide-react';
import type { SafetyStatusResponse } from '../../services/mapService';

interface EmergencyBannerProps {
  safetyStatus: SafetyStatusResponse | null;
  onViewSafeRoute: () => void;
  onDismiss?: () => void;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  safetyStatus,
  onViewSafeRoute,
  onDismiss
}) => {
  if (!safetyStatus || safetyStatus.safetyStatus === 'SAFE' || !safetyStatus.emergencyAlert) {
    return null;
  }

  const isCritical = safetyStatus.safetyStatus === 'EMERGENCY';
  const alert = safetyStatus.emergencyAlert;

  return (
    <div
      className={`rounded-3xl p-4 sm:p-5 border shadow-md animate-fadeIn flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isCritical
          ? 'bg-gradient-to-r from-red-900 via-rose-800 to-red-900 text-white border-red-700'
          : 'bg-gradient-to-r from-amber-700 via-yellow-700 to-amber-800 text-white border-amber-600'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-2xl flex-shrink-0 ${isCritical ? 'bg-red-950/60 text-red-200' : 'bg-amber-900/60 text-amber-200'}`}>
          {isCritical ? (
            <Flame className="w-6 h-6 text-red-400 animate-pulse" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-yellow-300" />
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase font-black tracking-widest px-2 py-0.5 rounded bg-black/30">
              {isCritical ? 'CRITICAL DISASTER ALERT' : 'SAFETY WARNING'}
            </span>
            <span className="text-xs text-white/80 font-semibold">&bull; Automated PostGIS Proximity Alert</span>
          </div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
            {alert.title}
          </h2>
          <p className="text-xs text-white/90 leading-relaxed max-w-2xl font-medium">
            {alert.description} A safer evacuation route avoiding dangerous sectors is calculated.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end md:self-center flex-shrink-0">
        <button
          onClick={onViewSafeRoute}
          className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-black rounded-xl shadow transition-all flex items-center gap-1.5 active:scale-95"
        >
          <span>VIEW SAFE ROUTE</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
        </button>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Dismiss Alert"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
