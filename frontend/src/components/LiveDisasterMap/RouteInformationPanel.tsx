import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  RefreshCw,
  Navigation,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';
import type {
  SafeRouteData,
  NormalRouteData,
  RouteComparisonData
} from '../../services/mapService';

interface RouteInformationPanelProps {
  routeData: SafeRouteData;
  normalRouteData?: NormalRouteData | null;
  comparison?: RouteComparisonData | null;
  destinationName?: string;
  isRouteInvalidated?: boolean;
  selectedRouteType?: 'safe' | 'normal';
  onSelectRouteType?: (type: 'safe' | 'normal') => void;
  onRecalculateRoute?: () => void;
  onClearRoute: () => void;
  onStartNavigation?: () => void;
}

export const RouteInformationPanel: React.FC<RouteInformationPanelProps> = ({
  routeData,
  normalRouteData,
  comparison,
  destinationName = 'Evacuation Destination',
  isRouteInvalidated = false,
  selectedRouteType = 'safe',
  onSelectRouteType,
  onRecalculateRoute,
  onClearRoute,
  onStartNavigation
}) => {
  const [showRiskBreakdown, setShowRiskBreakdown] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Active displayed route depends on user's selection (defaults to SAHAY Safe Route)
  const activeRoute = selectedRouteType === 'normal' && normalRouteData ? normalRouteData : routeData;

  const getRiskBadgeConfig = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return { color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-300', text: 'CRITICAL RISK', dot: 'bg-rose-500' };
      case 'HIGH':
        return { color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-200', text: 'HIGH RISK', dot: 'bg-rose-500' };
      case 'MODERATE':
        return { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200', text: 'MODERATE', dot: 'bg-amber-500' };
      case 'LOW':
      default:
        return { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'LOW', dot: 'bg-emerald-500' };
    }
  };

  const safeRiskBadge = getRiskBadgeConfig(routeData.riskLevel);
  const normalRiskBadge = getRiskBadgeConfig(normalRouteData?.riskLevel || 'LOW');
  const activeRiskBadge = getRiskBadgeConfig(activeRoute.riskLevel);

  const hasNormalRouteComparison = Boolean(normalRouteData && comparison);

  const handleStartRoute = () => {
    setIsNavigating(true);
    if (onStartNavigation) {
      onStartNavigation();
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-4 sm:p-5 space-y-4 max-w-md w-full animate-fadeIn max-h-[85vh] overflow-y-auto sahay-scrollbar">
      {/* 1. Route Invalidation Warning Banner (If newly reported hazard intersects active route) */}
      {isRouteInvalidated && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 animate-pulse">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>⚠️ ROUTE UPDATED</span>
          </div>
          <p className="text-xs text-rose-900 font-medium leading-relaxed">
            Flooding or new road hazard detected ahead. SAHAY recalculated a safer alternative route.
          </p>
          {onRecalculateRoute && (
            <button
              onClick={onRecalculateRoute}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>VIEW NEW SAFE ROUTE</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Main Route Card Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0E8F66] text-white text-[10px] font-black uppercase tracking-wider mb-1 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-emerald-200" />
            <span>SAFE ROUTE RECOMMENDED</span>
          </div>
          <h3 className="text-base font-black text-slate-900 leading-tight">
            Navigating to {destinationName}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Computed via Disaster-Aware Routing Algorithm
          </p>
        </div>

        <button
          onClick={onClearRoute}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          title="Clear Route"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3. ROUTE COMPARISON (NORMAL ROUTE vs SAHAY SAFE ROUTE) */}
      {hasNormalRouteComparison && normalRouteData && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-black text-slate-700 uppercase tracking-wider">
            <span>ROUTE COMPARISON</span>
            <span className="text-[10px] font-normal text-slate-400 lowercase">Click card to preview</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Normal Route Card */}
            <div
              onClick={() => onSelectRouteType && onSelectRouteType('normal')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer text-left relative ${
                selectedRouteType === 'normal'
                  ? 'border-blue-500 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>NORMAL</span>
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${normalRiskBadge.bg} ${normalRiskBadge.color}`}>
                  {normalRiskBadge.text}
                </span>
              </div>

              <div className="text-sm font-black text-slate-900">
                {normalRouteData.distanceKm} km
                <span className="text-xs font-semibold text-slate-500 ml-1.5">
                  {normalRouteData.travelTimeMinutes} min
                </span>
              </div>

              {normalRouteData.isBlocked ? (
                <div className="mt-1 text-[10px] font-bold text-rose-600 flex items-center gap-1">
                  <span>⛔ Blocked road ahead</span>
                </div>
              ) : normalRouteData.hazards && normalRouteData.hazards.length > 0 ? (
                <div className="mt-1 text-[10px] font-medium text-amber-800 line-clamp-1">
                  ⚠️ {normalRouteData.hazards[0]}
                </div>
              ) : (
                <div className="mt-1 text-[10px] font-medium text-emerald-700">
                  ✓ Direct road clear
                </div>
              )}
            </div>

            {/* SAHAY Safe Route Card */}
            <div
              onClick={() => onSelectRouteType && onSelectRouteType('safe')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer text-left relative ${
                selectedRouteType === 'safe'
                  ? 'border-emerald-600 bg-emerald-50/80 shadow-sm ring-2 ring-emerald-600/20'
                  : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                  <span>SAHAY SAFE</span>
                </span>
                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#0E8F66] text-white">
                  RECOMMENDED
                </span>
              </div>

              <div className="text-sm font-black text-slate-900">
                {routeData.distanceKm} km
                <span className="text-xs font-semibold text-slate-500 ml-1.5">
                  {routeData.travelTimeMinutes} min
                </span>
              </div>

              <div className="mt-1 text-[10px] font-bold flex items-center gap-1">
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${safeRiskBadge.bg} ${safeRiskBadge.color}`}>
                  🛡️ {safeRiskBadge.text}
                </span>
              </div>
            </div>
          </div>

          {/* SAHAY DIFFERENCE STRIP */}
          {comparison && (
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-[#0B4D3B] text-[11px]">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                <span>SAHAY DIFFERENCE:</span>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700">
                <span>
                  {comparison.extraDistanceKm > 0 ? `+${comparison.extraDistanceKm} km` : 'Same distance'}
                </span>
                <span>&bull;</span>
                <span>
                  {comparison.extraTimeMinutes > 0 ? `+${comparison.extraTimeMinutes} min` : 'Same time'}
                </span>
                <span>&bull;</span>
                <span className="text-emerald-700 font-black">
                  Risk: {comparison.riskReduction}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Active Route Metrics Grid (Distance, Est. Time, Risk Level) */}
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Distance</span>
          <span className="text-sm font-black text-slate-900">{activeRoute.distanceKm} km</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Est. Time</span>
          <span className="text-sm font-black text-slate-900">{activeRoute.travelTimeMinutes} min</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/70">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Risk Level</span>
          <span className={`text-sm font-black ${activeRiskBadge.color}`}>{activeRiskBadge.text}</span>
        </div>
      </div>

      {/* 5. Route Safety Explanation Checklist */}
      <div className="space-y-2 text-xs">
        <span className="font-bold text-slate-800 text-[11px] block uppercase tracking-wider">
          {selectedRouteType === 'safe' ? 'Why SAHAY Recommends This Route:' : 'Normal Route Analysis:'}
        </span>

        {selectedRouteType === 'safe' ? (
          <div className="space-y-1.5 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
            {routeData.safetyExplanation?.map((exp, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-slate-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0E8F66] shrink-0 mt-0.5" />
                <span>{exp}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 bg-rose-50/60 p-3 rounded-2xl border border-rose-100">
            {comparison?.normalRouteAvoidedReasons?.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-slate-800 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            )) || (
              <div className="text-slate-600 text-xs font-medium">
                Normal shortest route via primary road corridors.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. COMPACT ROUTE RISK BREAKDOWN TOGGLE */}
      {normalRouteData && (
        <div className="border-t border-slate-100 pt-2 text-xs">
          <button
            onClick={() => setShowRiskBreakdown(!showRiskBreakdown)}
            className="w-full flex items-center justify-between text-slate-600 hover:text-slate-900 font-bold text-[11px] py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Route Risk Breakdown Matrix</span>
            </span>
            {showRiskBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRiskBreakdown && (
            <div className="mt-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 space-y-2 animate-fadeIn">
              <div className="grid grid-cols-3 text-[10px] font-black text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
                <span>Hazard Category</span>
                <span className="text-center text-blue-700">Normal Route</span>
                <span className="text-right text-emerald-800">Safe Route</span>
              </div>

              {[
                { label: 'Flood Risk', normal: normalRouteData.riskBreakdown.floodRisk, safe: routeData.riskBreakdown?.floodRisk || 'LOW' },
                { label: 'Road Blockage', normal: normalRouteData.riskBreakdown.roadRisk, safe: routeData.riskBreakdown?.roadRisk || 'LOW' },
                { label: 'Incident Risk', normal: normalRouteData.riskBreakdown.incidentRisk, safe: routeData.riskBreakdown?.incidentRisk || 'LOW' },
                { label: 'Weather Risk', normal: normalRouteData.riskBreakdown.weatherRisk, safe: routeData.riskBreakdown?.weatherRisk || 'LOW' },
                { label: 'Overall Risk', normal: normalRouteData.riskBreakdown.overallRisk, safe: routeData.riskBreakdown?.overallRisk || 'LOW' }
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-3 text-[11px] font-medium items-center py-0.5">
                  <span className="text-slate-700 font-semibold">{row.label}</span>
                  <span className={`text-center font-bold ${
                    row.normal === 'HIGH' || row.normal === 'CRITICAL' || row.normal === 'BLOCKED'
                      ? 'text-rose-600'
                      : row.normal === 'MEDIUM'
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }`}>
                    {row.normal}
                  </span>
                  <span className={`text-right font-bold ${
                    row.safe === 'HIGH' || row.safe === 'CRITICAL' || row.safe === 'BLOCKED'
                      ? 'text-rose-600'
                      : row.safe === 'MEDIUM'
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }`}>
                    {row.safe}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Navigation Directions Steps */}
      {activeRoute.steps && activeRoute.steps.length > 0 && (
        <div className="space-y-1.5 text-xs pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-[11px] block">
              Navigation Instructions ({activeRoute.steps.length} Steps):
            </span>
            <span className="text-[10px] text-slate-400">
              {selectedRouteType === 'safe' ? 'Safe corridor' : 'Normal road'}
            </span>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1 sahay-scrollbar">
            {activeRoute.steps.slice(0, 5).map((step, idx) => (
              <div key={idx} className="p-2 bg-slate-50 rounded-lg text-slate-700 text-[11px] flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                  {idx + 1}
                </span>
                <span className="truncate">{step.instruction}</span>
                <span className="text-[10px] text-slate-400 ml-auto shrink-0">{step.distance}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Action Button: START SAFE ROUTE */}
      <div className="pt-2 border-t border-slate-100 flex gap-2">
        <button
          onClick={handleStartRoute}
          className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
            isNavigating
              ? 'bg-slate-900 text-white'
              : 'bg-[#0E8F66] hover:bg-[#0B7352] text-white'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>{isNavigating ? 'NAVIGATING ALONG SAFE ROUTE' : 'START SAFE ROUTE'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
