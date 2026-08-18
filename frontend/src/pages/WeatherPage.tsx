import React, { useState, useEffect, useCallback } from 'react';
import {
  CloudRain,
  Wind,
  Droplets,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Sun,
  CloudSun,
  Cloud,
  CloudLightning,
  CloudFog,
  Snowflake,
  ShieldAlert,
  Calendar,
  Navigation,
  Search
} from 'lucide-react';
import { fetchWeatherData, type WeatherData } from '../services/api';
import { useLocation } from '../context/LocationContext';

const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod'
];

export const WeatherPage: React.FC = () => {
  const { weatherData: globalWeather, loading: globalLoading, error: globalError, permissionState, requestLocation } = useLocation();

  const isPermissionDenied = permissionState === 'denied' || permissionState === 'unavailable' || permissionState === 'timeout';
  const [weather, setWeather] = useState<WeatherData | null>(globalWeather);
  const [loading, setLoading] = useState<boolean>(globalLoading);
  const [error, setError] = useState<string | null>(globalError);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(globalWeather?.district || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Sync with global location context when weather updates
  useEffect(() => {
    if (globalWeather) {
      setWeather(globalWeather);
      setSelectedDistrict(globalWeather.district);
      setLastUpdated(formatTime(globalWeather.updatedAt));
    }
  }, [globalWeather]);

  useEffect(() => {
    setLoading(globalLoading);
  }, [globalLoading]);

  useEffect(() => {
    setError(globalError);
  }, [globalError]);

  // Helper to render weather icon dynamically
  const renderWeatherIcon = (iconName: string, className: string = 'w-12 h-12') => {
    switch (iconName) {
      case 'sun':
        return <Sun className={`${className} text-amber-500`} />;
      case 'cloud-sun':
        return <CloudSun className={`${className} text-amber-400`} />;
      case 'cloud':
        return <Cloud className={`${className} text-slate-400`} />;
      case 'cloud-rain':
      case 'cloud-drizzle':
        return <CloudRain className={`${className} text-emerald-500 animate-pulse`} />;
      case 'cloud-lightning':
        return <CloudLightning className={`${className} text-purple-600 animate-bounce`} />;
      case 'cloud-fog':
        return <CloudFog className={`${className} text-slate-400`} />;
      case 'snowflake':
        return <Snowflake className={`${className} text-sky-400`} />;
      default:
        return <CloudRain className={`${className} text-emerald-600`} />;
    }
  };

  // Helper to format ISO timestamp into readable local time
  const formatTime = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Helper to render alert badge
  const renderAlertBadge = (alertLevel?: string) => {
    const level = (alertLevel || 'GREEN').toUpperCase();
    switch (level) {
      case 'RED':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-red-600 text-white tracking-wider uppercase shadow-md animate-pulse">
            <AlertTriangle className="w-4 h-4" /> RED ALERT
          </span>
        );
      case 'ORANGE':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-orange-600 text-white tracking-wider uppercase shadow-md">
            <AlertTriangle className="w-4 h-4" /> ORANGE ALERT
          </span>
        );
      case 'YELLOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-amber-500 text-slate-900 tracking-wider uppercase shadow-md">
            <AlertTriangle className="w-4 h-4" /> YELLOW ALERT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-emerald-600 text-white tracking-wider uppercase shadow-md">
            <CheckCircle className="w-4 h-4" /> GREEN ALERT (NORMAL)
          </span>
        );
    }
  };

  // Fetch Weather manually by District
  const loadWeather = useCallback(async (lat?: number, lon?: number, district?: string) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await fetchWeatherData(lat, lon, district);
      setWeather(data);
      setSelectedDistrict(data.district);
      setLastUpdated(formatTime(data.updatedAt));
    } catch (err: any) {
      console.error('Weather load error:', err);
      setError(err.message || 'Unable to fetch weather telemetry.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Request Geolocation & Load Weather using global requestLocation
  const requestLocationAndFetch = useCallback(() => {
    requestLocation();
  }, [requestLocation]);

  // Initial Load on Mount
  useEffect(() => {
    requestLocationAndFetch();
  }, []);

  // Auto-refresh every 5 minutes (300,000 ms)
  useEffect(() => {
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const interval = setInterval(() => {
      if (!isPermissionDenied && weather?.latitude && weather?.longitude) {
        loadWeather(weather.latitude, weather.longitude);
      } else {
        loadWeather(undefined, undefined, selectedDistrict);
      }
    }, FIVE_MINUTES_MS);

    return () => clearInterval(interval);
  }, [loadWeather, isPermissionDenied, weather?.latitude, weather?.longitude, selectedDistrict]);

  // Manual District Switch
  const handleDistrictSelect = (district: string) => {
    setSelectedDistrict(district);
    setLoading(true);
    loadWeather(undefined, undefined, district);
  };

  const filteredDistricts = KERALA_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn font-sans text-slate-900">

      {/* Portal Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-emerald-800">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-3 border border-emerald-500/30">
              <CloudRain className="w-4 h-4 text-emerald-400" />
              <span>SAHAY Automated Meteorology & Alert Telemetry</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Kerala Live Weather Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-2xl font-medium">
              Real-time telemetry powered by Open-Meteo & OpenStreetMap Nominatim. Automatic 5-minute telemetry refresh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => requestLocationAndFetch()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 bg-[#059669] hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Now'}</span>
            </button>

            <button
              onClick={() => requestLocationAndFetch()}
              className="inline-flex items-center gap-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Detect My Location</span>
            </button>
          </div>
        </div>
      </div>

      {/* Permission Denied Banner & Manual Kerala District Picker */}
      {isPermissionDenied && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-amber-900">
                Location permission denied
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 font-medium leading-relaxed">
                Browser location permission was denied or unavailable. Please select any of Kerala's 14 districts manually to view live weather & alert telemetry.
              </p>
            </div>
          </div>

          {/* District Quick Switcher Buttons */}
          <div className="pt-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Select Kerala District:
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 w-36"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 scrollbar-thin">
              {filteredDistricts.map((d) => (
                <button
                  key={d}
                  onClick={() => handleDistrictSelect(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${selectedDistrict === d
                      ? 'bg-[#059669] text-white shadow-md'
                      : 'bg-white text-slate-700 border border-amber-200 hover:bg-emerald-50 hover:border-emerald-300'
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* District Pill Bar (All 14 Kerala Districts) */}
      {!isPermissionDenied && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Kerala Districts Telemetry:
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#059669] w-40"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filteredDistricts.map((d) => (
              <button
                key={d}
                onClick={() => handleDistrictSelect(d)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all whitespace-nowrap ${selectedDistrict === d
                    ? 'bg-[#059669] text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-[#059669]'
                  }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-md flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 border-4 border-emerald-200 border-t-[#059669] rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-700 animate-pulse">
            Fetching live weather telemetry & OpenStreetMap location details...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-red-800 text-xs font-semibold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Telemetry Display Grid */}
      {!loading && weather && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Weather Metric Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">

            {/* Location & Alert Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#059669]">
                  <MapPin className="w-4 h-4 text-[#059669]" />
                  <span>{weather.placeName || weather.district}, {weather.state}, {weather.country}</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                  {weather.placeName || weather.district}
                </h2>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
                  <span>GPS: {weather.latitude.toFixed(4)}° N, {weather.longitude.toFixed(4)}° E</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">Updated: {lastUpdated}</span>
                </div>
              </div>

              <div>
                {renderAlertBadge(weather.alert?.alertLevel)}
              </div>
            </div>

            {/* Weather Temperature & Condition Banner */}
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50/50 p-6 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-emerald-100">
                  {renderWeatherIcon(weather.icon, 'w-12 h-12')}
                </div>
                <div>
                  <div className="text-5xl font-black text-slate-900 tracking-tight">
                    {weather.temperature}°C
                  </div>
                  <div className="text-sm font-extrabold text-emerald-800 mt-1">
                    {weather.condition}
                  </div>
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rain Chance</div>
                <div className="text-2xl font-black text-sky-600">{weather.rainProbability}%</div>
              </div>
            </div>

            {/* Core Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <Droplets className="w-6 h-6 text-sky-500 mx-auto mb-1.5" />
                <div className="text-[11px] font-bold text-slate-500 uppercase">Humidity</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{weather.humidity}%</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <Wind className="w-6 h-6 text-[#059669] mx-auto mb-1.5" />
                <div className="text-[11px] font-bold text-slate-500 uppercase">Wind Speed</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{weather.windSpeed} km/h</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <CloudRain className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
                <div className="text-[11px] font-bold text-slate-500 uppercase">Rain Prob</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{weather.rainProbability}%</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <Calendar className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                <div className="text-[11px] font-bold text-slate-500 uppercase">Weather Code</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">WMO {weather.weatherCode}</div>
              </div>
            </div>

          </div>

          {/* Active Disaster Alert & Advisory Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span>Disaster Alert Telemetry</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">IMD / KSDMA Feed</span>
              </div>

              {/* Official IMD/KSDMA Disaster Alert */}
              {(() => {
                const alertAny = weather.alert as any;
                const officialAlertLevel = alertAny?.officialAlert?.alertLevel || alertAny?.alertLevel;
                const officialSource = alertAny?.officialAlert?.source || alertAny?.source || 'IMD / KSDMA';
                const officialDesc = alertAny?.officialAlert?.description || alertAny?.description || `No official disaster warning issued for ${weather.district}.`;
                const localLevel = alertAny?.localRisk?.level || 'LOW';
                const localReason = alertAny?.localRisk?.reason || `Normal weather conditions detected from local sensors.`;

                return (
                  <>
                    <div className={`p-5 rounded-2xl border ${
                      officialAlertLevel === 'RED' ? 'bg-red-50 border-red-200 text-red-900' :
                      officialAlertLevel === 'ORANGE' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                      officialAlertLevel === 'YELLOW' ? 'bg-yellow-50 border-yellow-200 text-yellow-900' :
                      'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black tracking-wider uppercase flex items-center gap-1.5">
                          Official Alert: {officialAlertLevel || 'GREEN'}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white/80 shadow-xs">
                          Source: {officialSource}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-semibold mt-2">
                        {officialDesc}
                      </p>
                    </div>

                    {/* Local Weather Risk Analysis */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                          Local Telemetry Risk:
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                          localLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          localLevel === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                          localLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {localLevel} RISK
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium italic">
                        {localReason}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Telemetry Summary Metadata Footer */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold">District:</span>
                <span className="font-extrabold text-slate-900">{weather.district}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold">State & Country:</span>
                <span className="font-extrabold text-slate-900">{weather.state}, {weather.country}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold">Auto Refresh:</span>
                <span className="font-extrabold text-[#059669]">Every 5 minutes</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold">Last Updated:</span>
                <span className="font-extrabold text-slate-900">{lastUpdated}</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default WeatherPage;
