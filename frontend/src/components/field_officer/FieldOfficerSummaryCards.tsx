import React from 'react';
import {
  ClipboardList,
  Clock,
  CalendarCheck,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import type { FieldOfficerReliefSummary } from '../../services/api';

interface FieldOfficerSummaryCardsProps {
  summary: FieldOfficerReliefSummary;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const FieldOfficerSummaryCards: React.FC<FieldOfficerSummaryCardsProps> = ({
  summary,
  activeTab,
  onTabChange
}) => {
  const cards = [
    {
      id: 'all',
      title: 'Assigned Applications',
      count: summary.assignedApplications,
      icon: ClipboardList,
      color: 'blue',
      bgGradient: 'from-blue-500/10 to-indigo-500/5',
      borderColor: 'border-blue-200',
      activeRing: 'ring-2 ring-blue-500 bg-blue-50/50',
      badgeColor: 'bg-blue-100 text-blue-800',
      description: 'Total claims assigned to your officer queue'
    },
    {
      id: 'pending',
      title: 'Pending Visits',
      count: summary.pendingVisits,
      icon: Clock,
      color: 'amber',
      bgGradient: 'from-amber-500/10 to-orange-500/5',
      borderColor: 'border-amber-200',
      activeRing: 'ring-2 ring-amber-500 bg-amber-50/50',
      badgeColor: 'bg-amber-100 text-amber-800',
      description: 'Awaiting scheduling or ground visit'
    },
    {
      id: 'today',
      title: "Today's Visits",
      count: summary.todaysVisits,
      icon: CalendarCheck,
      color: 'emerald',
      bgGradient: 'from-emerald-500/15 to-teal-500/10',
      borderColor: 'border-emerald-300',
      activeRing: 'ring-2 ring-emerald-600 bg-emerald-50',
      badgeColor: 'bg-emerald-600 text-white font-extrabold animate-pulse',
      description: 'Field inspections scheduled for today'
    },
    {
      id: 'completed',
      title: 'Completed Visits',
      count: summary.completedVisits,
      icon: CheckCircle2,
      color: 'purple',
      bgGradient: 'from-purple-500/10 to-violet-500/5',
      borderColor: 'border-purple-200',
      activeRing: 'ring-2 ring-purple-500 bg-purple-50/50',
      badgeColor: 'bg-purple-100 text-purple-800',
      description: 'Site inspection finished on the ground'
    },
    {
      id: 'verified',
      title: 'Verified Applications',
      count: summary.verifiedApplications,
      icon: ShieldCheck,
      color: 'teal',
      bgGradient: 'from-teal-500/10 to-emerald-500/5',
      borderColor: 'border-teal-200',
      activeRing: 'ring-2 ring-teal-500 bg-teal-50/50',
      badgeColor: 'bg-teal-100 text-teal-800',
      description: 'Report submitted & forwarded to Collector'
    },
    {
      id: 'requires_correction',
      title: 'Requires Correction',
      count: summary.requiringCorrection,
      icon: AlertTriangle,
      color: 'rose',
      bgGradient: 'from-rose-500/10 to-pink-500/5',
      borderColor: 'border-rose-200',
      activeRing: 'ring-2 ring-rose-500 bg-rose-50/50',
      badgeColor: 'bg-rose-100 text-rose-800',
      description: 'Flagged for applicant docs / discrepancies'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeTab === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onTabChange(card.id)}
            className={`text-left p-4 rounded-3xl bg-white border ${card.borderColor} shadow-xs hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col justify-between ${
              isSelected ? card.activeRing : 'hover:border-slate-300'
            }`}
          >
            {/* Ambient Background Gradient Accent */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-60 pointer-events-none`} />

            <div>
              {/* Header Icon + Badge */}
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                    card.color === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800'
                      : card.color === 'amber'
                      ? 'bg-amber-100 text-amber-800'
                      : card.color === 'purple'
                      ? 'bg-purple-100 text-purple-800'
                      : card.color === 'teal'
                      ? 'bg-teal-100 text-teal-800'
                      : card.color === 'rose'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {card.id === 'today' && card.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase tracking-wider shadow-xs">
                    Live
                  </span>
                )}
              </div>

              {/* Count */}
              <div className="mt-3.5 relative z-10">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {card.count}
                </div>
                <div className="text-xs font-bold text-slate-700 mt-0.5 line-clamp-1">
                  {card.title}
                </div>
              </div>
            </div>

            {/* Bottom Subtitle / Link */}
            <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-500 font-medium relative z-10">
              <span className="truncate pr-1">{card.description}</span>
              <ArrowRight className={`w-3 h-3 transition-transform text-slate-400 group-hover:translate-x-0.5 ${isSelected ? 'text-emerald-600' : ''}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
