import React from 'react';
import { Waves, ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';

export const RiverDamStatus: React.FC = () => {
  const riverData = [
    {
      name: 'Periyar River',
      station: 'Aluva Gauge',
      currentLevel: '6.45 m',
      dangerLevel: '6.50 m',
      status: 'WARNING LEVEL',
      percent: 94,
      trend: 'RISING',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      barColor: 'bg-amber-500',
    },
    {
      name: 'Chalakudy River',
      station: 'Arangali Gauge',
      currentLevel: '7.80 m',
      dangerLevel: '7.50 m',
      status: 'FLOOD ALERT',
      percent: 104,
      trend: 'RISING FAST',
      color: 'text-red-600 bg-red-50 border-red-200',
      barColor: 'bg-red-600',
    },
    {
      name: 'Pamba River',
      station: 'Ranni Gauge',
      currentLevel: '4.20 m',
      dangerLevel: '5.80 m',
      status: 'NORMAL LEVEL',
      percent: 72,
      trend: 'STABLE',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      barColor: 'bg-[#059669]',
    },
    {
      name: 'Muvattupuzha River',
      station: 'Ramamangalam',
      currentLevel: '5.10 m',
      dangerLevel: '6.00 m',
      status: 'NORMAL LEVEL',
      percent: 85,
      trend: 'SLOWLY RISING',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      barColor: 'bg-[#059669]',
    },
  ];

  const damData = [
    {
      name: 'Idukki Arch Dam',
      district: 'Idukki',
      capacity: '2403.00 ft',
      current: '2398.50 ft',
      storage: '92%',
      shutters: '2 Shutters Opened (100 cm)',
      alert: 'RED ALERT',
      alertBg: 'bg-red-600 text-white',
    },
    {
      name: 'Mullaperiyar Dam',
      district: 'Idukki',
      capacity: '142.00 ft',
      current: '139.80 ft',
      storage: '88%',
      shutters: '4 Shutters Opened',
      alert: 'ORANGE ALERT',
      alertBg: 'bg-orange-600 text-white',
    },
    {
      name: 'Banasura Sagar Dam',
      district: 'Wayanad',
      capacity: '775.60 m',
      current: '774.10 m',
      storage: '95%',
      shutters: '1 Shutter Opened (15 cm)',
      alert: 'RED ALERT',
      alertBg: 'bg-red-600 text-white',
    },
    {
      name: 'Idamalayar Dam',
      district: 'Ernakulam',
      capacity: '169.00 m',
      current: '158.40 m',
      storage: '68%',
      shutters: 'Shutters Closed',
      alert: 'YELLOW ALERT',
      alertBg: 'bg-amber-500 text-slate-900',
    },
  ];

  return (
    <section className="w-full bg-slate-50 py-12 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-[#059669] uppercase tracking-wider">
            <Waves className="w-4 h-4" />
            <span>State Water Resources Telemetry</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            River Gauges & Dam Reservoir Telemetry
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Automated sensor feeds from Irrigation Department monitoring stations across Kerala rivers and reservoirs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Rivers Telemetry */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Waves className="w-5 h-5 text-sky-600" />
                Major River Telemetry Gauges
              </h3>
              <span className="text-xs font-bold text-slate-500">Telemetry Live</span>
            </div>

            <div className="space-y-4">
              {riverData.map((river, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{river.name}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">{river.station}</span>
                    </div>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${river.color}`}>
                      {river.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden my-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${river.barColor}`}
                      style={{ width: `${Math.min(river.percent, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mt-1">
                    <span>Level: {river.currentLevel} (Danger: {river.dangerLevel})</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> {river.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dam Reservoir Telemetry */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Dam Storage & Shutter Status
              </h3>
              <span className="text-xs font-bold text-slate-500">KSEB & Irrigation Data</span>
            </div>

            <div className="space-y-4">
              {damData.map((dam, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{dam.name}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">District: {dam.district}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${dam.alertBg}`}>
                      {dam.alert}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-200/60 mb-2">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Current / Max</div>
                      <div className="font-extrabold text-slate-800 text-[11px]">{dam.current}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Storage</div>
                      <div className="font-extrabold text-emerald-600 text-[11px]">{dam.storage}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Capacity</div>
                      <div className="font-extrabold text-slate-800 text-[11px]">{dam.capacity}</div>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Shutters: <strong className="text-slate-900">{dam.shutters}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
