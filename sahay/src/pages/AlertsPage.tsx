import React from 'react';
import { AlertTriangle, Bell, ShieldAlert, Download } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const activeAlerts = [
    {
      id: 1,
      severity: 'RED ALERT',
      color: 'bg-red-600 border-red-200 text-white',
      badgeBg: 'bg-red-100 text-red-700',
      title: 'Extremely Heavy Rainfall & Landslide Threat',
      districts: ['Idukki', 'Wayanad', 'Kozhikode'],
      date: '26 July 2026 - 18:00 hrs',
      description: 'IMD issues Red Alert for hill districts. Rainfall exceeding 204 mm in 24 hours expected. High risk of landslides, earth slips, and sudden swollen streams in Munnar, Vythiri, and Thamarasery ghats.',
      actionRequired: 'All educational institutions closed. Residents near steep slopes to move to designated relief shelters immediately.'
    },
    {
      id: 2,
      severity: 'ORANGE ALERT',
      color: 'bg-orange-600 border-orange-200 text-white',
      badgeBg: 'bg-orange-100 text-orange-700',
      title: 'Periyar & Chalakudy River Basin Inundation Warning',
      districts: ['Ernakulam', 'Thrissur', 'Kottayam'],
      date: '26 July 2026 - 16:30 hrs',
      description: 'Water levels in Chalakudy and Periyar rivers approaching danger mark due to heavy catchment discharge. Waterlogging reported in low-lying areas of Aluva and Kanayannur.',
      actionRequired: 'Avoid visiting riverbanks, bathing, or taking selfies near overflowing water bodies.'
    },
    {
      id: 3,
      severity: 'YELLOW ALERT',
      color: 'bg-amber-500 border-amber-200 text-slate-900',
      badgeBg: 'bg-amber-100 text-amber-800',
      title: 'High Waves & Squally Wind Warning along Kerala Coast',
      districts: ['Thiruvananthapuram', 'Kollam', 'Alappuzha'],
      date: '26 July 2026 - 12:00 hrs',
      description: 'Squally weather with wind speeds reaching 45-55 km/h gusting to 65 km/h along Kerala and Lakshadweep coasts. High ocean waves expected.',
      actionRequired: 'Fishermen are strictly advised not to venture into sea. Coastal residents stay vigilant.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      
      {/* Page Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
            <Bell className="w-4 h-4 text-red-400 animate-pulse" />
            <span>KSDMA Official Weather & Safety Warnings</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Live Emergency Alerts & Warnings
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl">
            Real-time emergency advisories published by Kerala State Disaster Management Authority & IMD.
          </p>
        </div>

        <button className="btn-primary text-xs font-bold px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span>Download Bulletin (PDF)</span>
        </button>
      </div>

      {/* Alert Severity Legend Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-red-600 animate-ping" />
          <div>
            <div className="text-xs font-black text-red-700">RED ALERT</div>
            <div className="text-[11px] text-slate-600 font-medium">Take Action Immediately</div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-orange-600" />
          <div>
            <div className="text-xs font-black text-orange-700">ORANGE ALERT</div>
            <div className="text-[11px] text-slate-600 font-medium">Be Prepared & Vigilant</div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-amber-500" />
          <div>
            <div className="text-xs font-black text-amber-800">YELLOW ALERT</div>
            <div className="text-[11px] text-slate-600 font-medium">Watch & Stay Updated</div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-[#059669]" />
          <div>
            <div className="text-xs font-black text-emerald-800">GREEN ALERT</div>
            <div className="text-[11px] text-slate-600 font-medium">No Advisory Active</div>
          </div>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-600" />
          Active Official Bulletins ({activeAlerts.length})
        </h2>

        <div className="space-y-5">
          {activeAlerts.map((alert) => (
            <div 
              key={alert.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden transition-all hover:shadow-lg"
            >
              <div className="p-6 sm:p-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase ${alert.color}`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{alert.date}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {alert.title}
                </h3>

                <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-slate-600">
                  <span>Affected Districts:</span>
                  {alert.districts.map((d, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                      {d}
                    </span>
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-slate-700 font-normal leading-relaxed">
                  {alert.description}
                </p>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs sm:text-sm font-semibold text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Action Required:</strong> {alert.actionRequired}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
