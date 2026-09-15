import React from 'react';

interface WeatherCardProps {
  weatherData: any;
  district?: string;
  weatherAlert?: any;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weatherData,
  district = 'Kottayam',
  weatherAlert
}) => {
  const temp = weatherData?.temperature ?? 24;
  const condition = weatherData?.condition || 'Heavy Rain';
  const humidity = weatherData?.humidity ?? 92;
  const windSpeed = weatherData?.windSpeed ?? 28;
  const rainfall = weatherData?.rainfall ?? 42;
  const warningLevel = String(weatherAlert?.alert_level || 'ORANGE');

  const warningConfigMap: Record<string, { color: string; label: string }> = {
    RED: { color: 'text-rose-700 bg-rose-100 border-rose-200', label: 'RED ALERT' },
    ORANGE: { color: 'text-amber-800 bg-amber-100 border-amber-200', label: 'ORANGE WARNING' },
    YELLOW: { color: 'text-yellow-800 bg-yellow-100 border-yellow-200', label: 'YELLOW ADVISORY' },
    GREEN: { color: 'text-emerald-800 bg-emerald-100 border-emerald-200', label: 'NORMAL' }
  };
  const warningConfig = warningConfigMap[warningLevel.toUpperCase()] || { color: 'text-amber-800 bg-amber-100 border-amber-200', label: 'WARNING' };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3 max-w-xs w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            IMD TELEMETRY
          </span>
          <h3 className="text-xs font-black text-slate-900">{district} Weather</h3>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${warningConfig.color}`}>
          {warningConfig.label}
        </span>
      </div>

      {/* Main Condition & Temperature */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            🌧️
          </div>
          <div>
            <p className="text-base font-black text-slate-900">{condition}</p>
            <p className="text-[11px] text-slate-500">Monitored Weather Station</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-slate-900">{temp}°C</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-50 text-center text-xs">
        <div className="p-1.5 bg-slate-50 rounded-xl">
          <span className="text-[10px] text-slate-400 font-semibold block">Rainfall</span>
          <span className="font-mono font-bold text-slate-800">{rainfall} mm</span>
        </div>
        <div className="p-1.5 bg-slate-50 rounded-xl">
          <span className="text-[10px] text-slate-400 font-semibold block">Wind</span>
          <span className="font-mono font-bold text-slate-800">{windSpeed} km/h</span>
        </div>
        <div className="p-1.5 bg-slate-50 rounded-xl">
          <span className="text-[10px] text-slate-400 font-semibold block">Humidity</span>
          <span className="font-mono font-bold text-slate-800">{humidity}%</span>
        </div>
      </div>
    </div>
  );
};
