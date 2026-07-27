import React from 'react';
import { AlertCircle, Home, Waves, FileText, PhoneCall, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface EmergencyQuickBarProps {
  onSelectAction: (actionId: string) => void;
  onOpenContacts: () => void;
}

export const EmergencyQuickBar: React.FC<EmergencyQuickBarProps> = ({ onSelectAction, onOpenContacts }) => {
  const quickActions = [
    {
      id: 'report',
      title: 'Report Emergency / SOS',
      subtitle: 'Instant alert dispatch to KSDMA control room',
      icon: AlertCircle,
      badge: 'URGENT',
      color: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100/80',
      iconBg: 'bg-red-600 text-white',
    },
    {
      id: 'shelter',
      title: 'Find Nearest Shelter',
      subtitle: 'Locate active relief camps & capacity',
      icon: Home,
      badge: 'LIVE MAP',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80',
      iconBg: 'bg-[#059669] text-white',
    },
    {
      id: 'river-status',
      title: 'River & Dam Levels',
      subtitle: 'Real-time telemetry water level gauges',
      icon: Waves,
      badge: 'UPDATED',
      color: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100/80',
      iconBg: 'bg-sky-600 text-white',
    },
    {
      id: 'bulletin',
      title: 'Government Advisories',
      subtitle: 'Official PDF press releases & bulletins',
      icon: FileText,
      badge: 'OFFICIAL',
      color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80',
      iconBg: 'bg-amber-600 text-white',
    },
  ];

  return (
    <section className="w-full bg-slate-50 py-10 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#059669] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Rapid Disaster Response System</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Emergency Action Portal
            </h2>
          </div>

          <button
            onClick={onOpenContacts}
            className="btn-outline text-xs font-bold self-start md:self-auto flex items-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Control Room Hotline (1077)</span>
          </button>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                onClick={() => onSelectAction(action.id)}
                className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between group ${action.color}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${action.iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/80 border border-current shadow-2xs">
                      {action.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-[#059669] transition-colors leading-snug">
                    {action.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    {action.subtitle}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-[#059669]">
                  <span>Access Service</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Strip */}
        <div className="mt-8 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#059669]">142</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
              Active Rescue Teams
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-sky-600">85</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
              Open Relief Camps
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">12,450</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
              Sheltered Citizens
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-red-600">24/7</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
              Live Monitoring
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
