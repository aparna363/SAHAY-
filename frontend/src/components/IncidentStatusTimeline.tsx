import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, Truck, RefreshCw, CheckCheck, XCircle } from 'lucide-react';
import type { IncidentStatus, StatusHistoryItem } from '../services/api';

interface IncidentStatusTimelineProps {
  currentStatus: IncidentStatus;
  statusHistory?: StatusHistoryItem[];
}

const ALL_STEPS: { key: IncidentStatus; label: string; icon: any }[] = [
  { key: 'SUBMITTED', label: 'Submitted', icon: Clock },
  { key: 'UNDER_REVIEW', label: 'Under Review', icon: RefreshCw },
  { key: 'VERIFIED', label: 'Verified', icon: ShieldCheck },
  { key: 'RESPONSE_ASSIGNED', label: 'Response Assigned', icon: Truck },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: RefreshCw },
  { key: 'RESOLVED', label: 'Resolved', icon: CheckCheck },
  { key: 'CLOSED', label: 'Closed', icon: CheckCircle2 }
];

export const IncidentStatusTimeline: React.FC<IncidentStatusTimelineProps> = ({
  currentStatus,
  statusHistory = []
}) => {
  const isRejected = currentStatus === 'REJECTED';

  // Map occurrences into lookup table
  const historyMap = new Map<string, StatusHistoryItem>();
  statusHistory.forEach(item => {
    historyMap.set(item.newStatus, item);
  });

  const getStepState = (stepKey: IncidentStatus) => {
    if (isRejected && stepKey === 'VERIFIED') return 'rejected';
    const hasOccurred = historyMap.has(stepKey) || stepKey === currentStatus;
    if (stepKey === currentStatus) return 'active';
    return hasOccurred ? 'completed' : 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Horizontal / Wrapped Step Indicator Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Incident Progression Lifecycle</span>
        </h4>

        {isRejected ? (
          <div className="bg-red-950/80 border border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-200">
            <XCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <p className="font-bold text-red-100">Incident Report Rejected</p>
              <p className="text-xs text-red-300 mt-0.5">
                This report was reviewed by officials and marked as invalid or duplicated.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {ALL_STEPS.map((step) => {
              const state = getStepState(step.key);
              const historyItem = historyMap.get(step.key);
              const Icon = step.icon;

              let badgeClasses = 'bg-slate-800 border-slate-700 text-slate-400';
              if (state === 'completed') {
                badgeClasses = 'bg-emerald-950 border-emerald-600 text-emerald-300';
              } else if (state === 'active') {
                badgeClasses = 'bg-emerald-600 border-emerald-400 text-white font-bold ring-4 ring-emerald-500/30 animate-pulse';
              }

              return (
                <div
                  key={step.key}
                  className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${badgeClasses}`}
                >
                  <div className="mb-1.5">
                    {state === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs font-bold leading-tight">{step.label}</span>
                  {historyItem && (
                    <span className="text-[10px] text-slate-300 mt-1 font-mono">
                      {new Date(historyItem.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Official Audit History & Remarks Timeline */}
      {statusHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Official Status Audit Log & Remarks</span>
          </h4>

          <div className="relative pl-6 border-l-2 border-emerald-200 space-y-5">
            {statusHistory.map((item, idx) => (
              <div key={item.id || idx} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] top-1 bg-emerald-700 text-white rounded-full p-1 border-2 border-white shadow">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {item.newStatus.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-medium text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>

                  {item.changedByName && (
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Updated by: <span className="font-bold text-slate-700">{item.changedByName}</span> ({item.changedByRole || 'Official'})
                    </p>
                  )}

                  {item.remarks && (
                    <div className="mt-2 bg-emerald-50/70 border-l-3 border-emerald-600 p-2.5 rounded-r-lg text-xs text-slate-800 italic">
                      "{item.remarks}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
