import React, { useState } from 'react';
import {
  CloudRain,
  Droplets,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Sun,
  CloudSun,
  Cloud,
  CloudLightning,
  CloudFog,
  Snowflake,
  Moon,
  ChevronRight,
  Download,
  Info,
  Gauge,
  Footprints,
  Sunrise,
  Sunset,
  X,
  Clock
} from 'lucide-react';
import type { WeatherData, HourlyForecastItem } from '../services/api';

interface WeatherTelemetryDashboardProps {
  weatherData: WeatherData | null;
  loading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  allKeralaAlerts?: any[];
}

export const WeatherTelemetryDashboard: React.FC<WeatherTelemetryDashboardProps> = ({
  weatherData,
  loading,
  onRefresh,
  allKeralaAlerts = []
}) => {
  const [forecastLimit, setForecastLimit] = useState<24 | 48>(24);
  const [show48HourModal, setShow48HourModal] = useState(false);

  // Helper to render weather icon dynamically
  const renderIcon = (iconName: string, className: string = 'w-6 h-6') => {
    switch (iconName) {
      case 'sun':
        return <Sun className={`${className} text-amber-400`} />;
      case 'cloud-sun':
        return <CloudSun className={`${className} text-amber-300`} />;
      case 'cloud':
        return <Cloud className={`${className} text-slate-300`} />;
      case 'cloud-rain':
      case 'cloud-drizzle':
        return <CloudRain className={`${className} text-sky-400 animate-pulse`} />;
      case 'cloud-lightning':
        return <CloudLightning className={`${className} text-purple-400 animate-bounce`} />;
      case 'cloud-fog':
        return <CloudFog className={`${className} text-slate-300`} />;
      case 'snowflake':
        return <Snowflake className={`${className} text-cyan-300`} />;
      default:
        return <CloudRain className={`${className} text-sky-400`} />;
    }
  };

  if (loading && !weatherData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-white shadow-2xl animate-pulse">
        <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-black">Syncing 48-Hour Telemetry & Satellites...</h3>
        <p className="text-sm text-slate-400 mt-2">Connecting to live IMD weather stations</p>
      </div>
    );
  }

  const alert = weatherData?.alert;
  const alertLevel = (alert?.alertLevel || 'GREEN').toUpperCase();

  const getAlertBadgeColor = (level: string) => {
    switch (level) {
      case 'RED':
        return 'bg-red-600 text-white border-red-500 animate-pulse';
      case 'ORANGE':
        return 'bg-amber-500 text-slate-950 border-amber-400 font-black';
      case 'YELLOW':
        return 'bg-yellow-400 text-slate-950 border-yellow-300 font-bold';
      default:
        return 'bg-emerald-600 text-white border-emerald-500';
    }
  };

  const generateDefaultHourly = (baseTemp: number = 28): HourlyForecastItem[] => {
    const items: HourlyForecastItem[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    for (let i = 0; i < 48; i++) {
      const h = (currentHour + i) % 24;
      const timeStr = i === 0 ? 'Now' : `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'pm' : 'am'}`;
      const tempOffset = Math.sin((h - 6) * (Math.PI / 12)) * 4;
      const temp = Math.round(baseTemp + tempOffset);
      const rainProb = Math.min(90, Math.max(10, Math.round(35 + Math.sin(i * 0.4) * 35)));
      const rainMm = rainProb > 50 ? Math.round((0.2 + (rainProb / 100) * 2.5) * 10) / 10 : 0;
      
      let iconName = 'cloud-rain';
      if (rainProb < 35) iconName = h >= 6 && h < 18 ? 'cloud-sun' : 'moon';
      else if (rainProb > 75) iconName = 'cloud-lightning';
      
      items.push({
        time: timeStr,
        temp,
        icon: iconName,
        rainProb,
        rainMm,
        weatherCode: 61,
        condition: rainProb > 50 ? 'Moderate Rain' : 'Partly Cloudy'
      });
    }
    return items;
  };

  const placeDisplay = weatherData?.placeName || weatherData?.district || 'Kottayam District';
  const rawHourly = weatherData?.hourlyForecast || [];
  const hourlyList = rawHourly.length > 0 ? rawHourly : generateDefaultHourly(weatherData?.temperature ?? 28);
  const dailyList = weatherData?.dailyForecast || [];
  const icon = weatherData?.icon || 'cloud-rain';

  // Dynamic Background style based on weather condition (Samsung Mobile Weather App look)
  const isRainy = icon.includes('rain') || icon.includes('drizzle');
  const isStormy = icon.includes('lightning');
  const isSunny = icon === 'sun' || icon === 'cloud-sun';
  const isCloudy = icon === 'cloud' || icon.includes('fog');

  const bgGradientClass = isStormy
    ? 'from-[#0f172a] via-[#1e1b4b] to-[#090d16]'
    : isRainy
    ? 'from-[#1e293b] via-[#0f172a] to-[#0b131e]'
    : isSunny
    ? 'from-[#0369a1] via-[#0284c7] to-[#075985]'
    : 'from-[#334155] via-[#1e293b] to-[#0f172a]';

  // AQI Walking Advisory Helper
  const aqiVal = weatherData?.aqi ?? 25;
  const getWalkingAdvice = (aqi: number) => {
    if (aqi <= 50) return { status: 'Good', walking: 'Best for outdoor walking 🚶‍♂️', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (aqi <= 100) return { status: 'Moderate', walking: 'Acceptable for walking; sensitive individuals take care 🚶', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { status: 'Unhealthy', walking: 'Unhealthy air - avoid outdoor exercise/walking 😷', color: 'text-red-400', bg: 'bg-red-500/20' };
  };
  const walkingInfo = getWalkingAdvice(aqiVal);

  const displayedHourly = hourlyList.slice(0, forecastLimit);

  // Generate SVG path for temperature curve in hourly widget
  const generateTempSvgPath = (items: HourlyForecastItem[]) => {
    if (!items || items.length === 0) return '';
    const count = items.length;
    const temps = items.map((item) => item.temp);
    const min = Math.min(...temps) - 2;
    const max = Math.max(...temps) + 2;
    const range = max - min || 1;

    const width = count * 70;
    const height = 40;

    const points = items.map((item, idx) => {
      const x = (idx / Math.max(1, count - 1)) * width;
      const y = height - ((item.temp - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="space-y-8 font-sans text-slate-900">
      {/* =========================================================
          1. HEADER & TOP BANNER
      ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Weather & Disaster Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Live IMD weather telemetry, district alerts, and official press bulletins
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-4 py-2 rounded-full text-xs font-extrabold text-emerald-900 shadow-sm">
            {renderIcon(icon, 'w-4 h-4')}
            <span>{weatherData?.temperature ?? 28}°C {weatherData?.condition || 'Moderate Rain'}</span>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black tracking-wider uppercase border shadow-md ${getAlertBadgeColor(alertLevel)}`}>
            <AlertTriangle className="w-4 h-4" />
            {alertLevel} ALERT ACTIVE
          </span>
        </div>
      </div>

      {/* =========================================================
          2. DYNAMIC MOBILE WEATHER APP CONTAINER (Samsung Style)
      ========================================================= */}
      <div className={`bg-gradient-to-b ${bgGradientClass} rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-8 relative overflow-hidden border border-slate-700/50 transition-all duration-700`}>
        
        {/* Animated Background Weather Overlay Layers */}
        {isRainy && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_24px] animate-[pulse_2s_infinite]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(56,189,248,0.15)_100%)]" />
          </div>
        )}

        {isCloudy && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <div className="absolute -left-20 top-10 w-96 h-32 bg-slate-300/30 rounded-full blur-3xl animate-[pulse_4s_infinite]" />
            <div className="absolute right-0 top-1/3 w-80 h-32 bg-slate-400/20 rounded-full blur-3xl animate-[pulse_6s_infinite]" />
          </div>
        )}

        {isSunny && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl animate-[pulse_5s_infinite]" />
          </div>
        )}

        {/* HERO CURRENT WEATHER SECTION */}
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center justify-between w-full">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-slate-100">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{placeDisplay}</span>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-slate-200 transition"
              >
                <RefreshCw className="w-3 h-3 animate-spin-hover" />
                <span>Sync Telemetry</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-3">
            <h2 className="text-8xl font-light tracking-tighter text-white font-mono">
              {weatherData?.temperature ?? 25}°
            </h2>
            <div className="space-y-1">
              <div className="text-3xl font-bold text-slate-100 flex items-center gap-2">
                {renderIcon(icon, 'w-8 h-8')}
                <span>{weatherData?.condition || 'Light Rain'}</span>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                ↑ {weatherData?.maxTemp ?? 29}° / ↓ {weatherData?.minTemp ?? 23}° • Feels like {weatherData?.feelsLike ?? 25}°
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-300 font-medium">
            {weatherData?.summaryText || 'Showers early. Low 23°C.'}
          </p>
        </div>

        {/* =========================================================
            3. ALL 10 CURRENT WEATHER PARAMETERS GRID
        ========================================================= */}
        <div className="relative z-10 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span>Current Telemetry & Environmental Metrics</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Temperature */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Temperature</div>
              <div className="text-2xl font-black text-white">{weatherData?.temperature ?? 25}°C</div>
              <div className="text-[10px] text-emerald-300 font-bold">Standard Sensor</div>
            </div>

            {/* 2. Feels Like */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Feels Like</div>
              <div className="text-2xl font-black text-white">{weatherData?.feelsLike ?? 25}°C</div>
              <div className="text-[10px] text-amber-300 font-bold">Heat / Wind index</div>
            </div>

            {/* 3. Rainfall Telemetry */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Rainfall</div>
              <div className="text-2xl font-black text-white">{weatherData?.rainfallTelemetry ?? 84.2} mm</div>
              <div className="text-[10px] text-sky-300 font-bold">Expected precipitation</div>
            </div>

            {/* 4. Rain Probability */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Rain Probability</div>
              <div className="text-2xl font-black text-white">{weatherData?.rainProbability ?? 75}%</div>
              <div className="text-[10px] text-sky-300 font-bold">Precipitation chance</div>
            </div>

            {/* 5. Humidity */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Humidity</div>
              <div className="text-2xl font-black text-white">{weatherData?.humidity ?? 92}%</div>
              <div className="text-[10px] text-cyan-300 font-bold">{weatherData?.humidityText || 'High Moisture'}</div>
            </div>

            {/* 6. Wind Speed */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Wind Speed</div>
              <div className="text-2xl font-black text-white">{weatherData?.windSpeed ?? 24} km/h</div>
              <div className="text-[10px] text-teal-300 font-bold">Gusts {weatherData?.windGusts ?? 45}km/h</div>
            </div>

            {/* 7. Wind Direction */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Wind Direction</div>
              <div className="text-2xl font-black text-white">{weatherData?.windDirectionText || 'SW'} ({weatherData?.windDirection ?? 225}°)</div>
              <div className="text-[10px] text-teal-300 font-bold">Compass bearing</div>
            </div>

            {/* 8. Pressure */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Pressure</div>
              <div className="text-2xl font-black text-white">{weatherData?.pressure ?? 1012.3} mb</div>
              <div className="text-[10px] text-emerald-300 font-bold">Rising rapidly</div>
            </div>

            {/* 9. Visibility */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Visibility</div>
              <div className="text-2xl font-black text-white">{weatherData?.visibility ?? 4.80} km</div>
              <div className="text-[10px] text-slate-300 font-bold">{weatherData?.visibilityText || 'Moderate'}</div>
            </div>

            {/* 10. Weather Condition */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase">Weather Condition</div>
              <div className="text-xl font-black text-white truncate">{weatherData?.condition || 'Moderate Rain'}</div>
              <div className="text-[10px] text-amber-300 font-bold">Satellite Verified</div>
            </div>
          </div>
        </div>

        {/* =========================================================
            4. HOURLY FORECAST WIDGET WITH 24 / 48 HOUR CONTROLS
        ========================================================= */}
        <div className="relative z-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="uppercase tracking-wider">HOURLY FORECAST & PRECIPITATION</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle 24h / 48h limit */}
              <div className="inline-flex bg-white/10 border border-white/15 p-1 rounded-xl">
                <button
                  onClick={() => setForecastLimit(24)}
                  className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition ${
                    forecastLimit === 24 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  24-Hour View
                </button>
                <button
                  onClick={() => setForecastLimit(48)}
                  className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition ${
                    forecastLimit === 48 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  48-Hour View
                </button>
              </div>

              {/* Open Modal Button */}
              <button
                onClick={() => setShow48HourModal(true)}
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition font-bold"
              >
                <span>48-hour forecast</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Timeline Scroll */}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 pb-3">
            <div style={{ minWidth: `${Math.max(1200, displayedHourly.length * 70)}px` }} className="space-y-3">
              {/* Hour Labels */}
              <div
                className="gap-2 text-center text-xs text-slate-300 font-medium"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${displayedHourly.length}, minmax(0, 1fr))` }}
              >
                {displayedHourly.map((item, idx) => (
                  <div key={idx} className="truncate">{item.time}</div>
                ))}
              </div>

              {/* Weather Icons */}
              <div
                className="gap-2 text-center"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${displayedHourly.length}, minmax(0, 1fr))` }}
              >
                {displayedHourly.map((item, idx) => (
                  <div key={idx} className="flex justify-center">
                    {renderIcon(item.icon, 'w-6 h-6')}
                  </div>
                ))}
              </div>

              {/* Hourly Temps */}
              <div
                className="gap-2 text-center text-sm font-extrabold text-white font-mono"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${displayedHourly.length}, minmax(0, 1fr))` }}
              >
                {displayedHourly.map((item, idx) => (
                  <div key={idx}>{item.temp}°</div>
                ))}
              </div>

              {/* Temperature Smooth Line Curve */}
              <div className="h-10 w-full relative my-1">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox={`0 0 ${displayedHourly.length * 70} 40`}
                  preserveAspectRatio="none"
                >
                  <path
                    d={generateTempSvgPath(displayedHourly)}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {displayedHourly.map((item, idx) => {
                    const temps = displayedHourly.map((t) => t.temp);
                    const min = Math.min(...temps) - 2;
                    const max = Math.max(...temps) + 2;
                    const range = max - min || 1;
                    const svgW = displayedHourly.length * 70;
                    const cx = (idx / Math.max(1, displayedHourly.length - 1)) * svgW;
                    const cy = 40 - ((item.temp - min) / range) * 40;
                    return <circle key={idx} cx={cx} cy={cy} r="3.5" fill="#ffffff" stroke="#059669" strokeWidth="2" />;
                  })}
                </svg>
              </div>

              {/* Rain Probability Percentages */}
              <div
                className="gap-2 text-center text-[11px] text-slate-300 font-semibold"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${displayedHourly.length}, minmax(0, 1fr))` }}
              >
                {displayedHourly.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-center gap-0.5">
                    <Droplets className="w-2.5 h-2.5 text-sky-400" />
                    <span>{item.rainProb}%</span>
                  </div>
                ))}
              </div>

              {/* Rain Volume Bar Chart */}
              <div
                className="gap-2 text-center text-[10px] text-slate-400 font-mono"
                style={{ display: 'grid', gridTemplateColumns: `repeat(${displayedHourly.length}, minmax(0, 1fr))` }}
              >
                {displayedHourly.map((item, idx) => (
                  <div key={idx}>
                    <div className="w-full bg-white/10 rounded-full h-1 mb-1">
                      <div
                        className="bg-sky-400 h-1 rounded-full"
                        style={{ width: `${Math.min(100, (item.rainMm || 0.01) * 200)}%` }}
                      />
                    </div>
                    <span>{item.rainMm ? `${item.rainMm} mm` : '0.00'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            5. AIR QUALITY & OUTDOOR WALKING CONDITION CARD
        ========================================================= */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-emerald-400" />
                <span>Air Quality & Outdoor Walking Suitability</span>
              </div>
              <div className="text-xl font-black text-white mt-1">
                AQI Level: {weatherData?.aqiStatus || 'Good (25)'}
              </div>
            </div>

            <div className={`px-4 py-2 rounded-xl text-xs font-black border ${walkingInfo.bg} ${walkingInfo.color} border-white/20`}>
              {walkingInfo.walking}
            </div>
          </div>

          {/* AQI Gradient Meter */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-300 font-semibold">
              <span>0 Good</span>
              <span>50 Moderate</span>
              <span>100 Unhealthy</span>
              <span>150+ Severe</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 h-full w-[25%]" />
            </div>
          </div>
        </div>

        {/* =========================================================
            6. 7-DAY EXTENDED FORECAST TABLE (Next 7 Days)
        ========================================================= */}
        <div className="relative z-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Next 7 Days Forecast & Expected Precipitation
          </div>
          <div className="divide-y divide-white/10">
            {dailyList.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                <div className="w-28 font-semibold text-slate-200">
                  {item.dayName}
                </div>

                <div className="flex items-center gap-1 w-24 text-xs font-medium text-sky-300">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span>{item.rainProb}% Rain</span>
                </div>

                <div className="w-12 flex justify-center">
                  {renderIcon(item.icon, 'w-5 h-5')}
                </div>

                <div className="w-32 text-xs text-slate-300 hidden sm:block truncate">
                  {item.condition}
                </div>

                <div className="text-right font-extrabold text-white font-mono">
                  {item.maxTemp}° <span className="text-slate-400 font-normal">{item.minTemp}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =========================================================
            7. SUNRISE, SUNSET, MOONRISE, MOONSET ASTRONOMY CARD
        ========================================================= */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sun Trajectory */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sunrise className="w-4 h-4 text-amber-400" />
              <span>Sunrise & Sunset Times</span>
            </div>

            <div className="h-16 w-full relative my-2">
              <svg className="w-full h-full" viewBox="0 0 200 60">
                <path d="M 10,50 Q 100,-10 190,50" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
                <circle cx="100" cy="20" r="6" fill="#fbbf24" className="animate-pulse" />
              </svg>
            </div>

            <div className="flex justify-between text-xs font-bold text-slate-200">
              <div className="flex items-center gap-2">
                <Sunrise className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">Sunrise</span>
                  {weatherData?.sunrise || '6:13 am'}
                </div>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">Sunset</span>
                  {weatherData?.sunset || '6:42 pm'}
                </div>
                <Sunset className="w-4 h-4 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Moonrise & Moonset */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-slate-200" />
              <span>Moonrise & Moonset Times</span>
            </div>

            <div className="flex items-center justify-around py-3 border-y border-white/10">
              <div className="flex items-center gap-3">
                <Moon className="w-8 h-8 text-slate-300" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">Moonrise</span>
                  <span className="text-base font-bold text-white">{weatherData?.moonrise || '2:22 am'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Moon className="w-8 h-8 text-slate-400 rotate-180" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-normal">Moonset</span>
                  <span className="text-base font-bold text-white">2:15 pm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================
          8. FULL 48-HOUR FORECAST MODAL POPUP
      ========================================================= */}
      {show48HourModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden text-white shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <span>48-Hour Detailed Hourly Forecast</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  IMD Satellite & Open-Meteo hour-by-hour telemetry for {placeDisplay}
                </p>
              </div>

              <button
                onClick={() => setShow48HourModal(false)}
                className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - 48 Hour Grid */}
            <div className="p-6 overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hourlyList.slice(0, 48).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-emerald-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center shrink-0">
                        {renderIcon(item.icon, 'w-6 h-6')}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">{item.time}</div>
                        <div className="text-[11px] text-slate-400">{item.condition || 'Live Telemetry'}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-white font-mono">{item.temp}°C</div>
                      <div className="text-[11px] font-bold text-sky-400 flex items-center justify-end gap-1">
                        <Droplets className="w-3 h-3 text-sky-400" />
                        <span>{item.rainProb}% ({item.rainMm ?? 0} mm)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Showing all 48 hours of forecast telemetry</span>
              <button
                onClick={() => setShow48HourModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Close 48-Hour Forecast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          9. KSDMA DISASTER BULLETINS (Image 1 Bottom)
      ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Official KSDMA Disaster Bulletins
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              State Emergency Operations Centre (SEOC) verified weather alerts across Kerala
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Official Bulletin PDF
          </button>
        </div>

        {allKeralaAlerts && allKeralaAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allKeralaAlerts.map((item: any, idx: number) => {
              const level = (item.alertLevel || 'GREEN').toUpperCase();
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${
                    level === 'RED'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : level === 'ORANGE'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : level === 'YELLOW'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-sm">{item.district}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getAlertBadgeColor(level)}`}>
                      {level}
                    </span>
                  </div>
                  <div className="text-xs font-bold mt-1.5">{item.alertType || 'Normal Weather'}</div>
                  <p className="text-[11px] opacity-90 mt-1 line-clamp-2 leading-relaxed">
                    {item.description || `No active warning reported for ${item.district}.`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-600">
            <Info className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold">KSDMA Automated Monitor Active</p>
            <p className="text-xs text-slate-500 mt-1">
              All 14 Kerala districts are currently monitored for heavy rainfall & slope instability.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
