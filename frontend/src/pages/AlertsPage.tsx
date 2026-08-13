import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Navigation,
  RefreshCw,
  Download,
  ExternalLink,
  Wind,
  CloudRain,
  Shield,
  Info,
  ChevronRight,
  Sparkles,
  X,
  Radio,
} from 'lucide-react';

import { useLocation } from '../context/LocationContext';
import { fetchAllKeralaAlerts } from '../services/api';
import { KeralaAlertMap } from '../components/KeralaAlertMap';
import type { DistrictAlertItem } from '../components/KeralaAlertMap';
import {
  cleanDistrictName,
  KERALA_DISTRICTS_LIST,
} from '../utils/districtUtils';

interface AlertsPageProps {
  onNavigateToMap?: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigateToMap }) => {
  const { location, weatherData, loading: locationLoading, error: locationError, refreshLocation } = useLocation();

  const [allAlerts, setAllAlerts] = useState<DistrictAlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [alertFetchError, setAlertFetchError] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Fetch all Kerala alerts from Backend
  const loadKeralaAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setAlertFetchError(null);
    try {
      const data = await fetchAllKeralaAlerts();
      setAllAlerts(data || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to fetch Kerala district alerts:', err);
      setAlertFetchError('Unable to load real-time district alerts. Please try again.');
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    loadKeralaAlerts();

    // Periodic auto-refresh every 5 minutes
    const intervalId = setInterval(() => {
      loadKeralaAlerts();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [loadKeralaAlerts]);

  // Handle View on Live Map Navigation
  const handleViewOnLiveMap = () => {
    if (onNavigateToMap) {
      onNavigateToMap();
    } else {
      sessionStorage.setItem('sahay_active_tab', 'map');
      window.location.href = '/map';
    }
  };

  // Map backend alert list to all 14 standard districts
  const normalizedDistrictAlerts = useMemo(() => {
    const alertsMap: Record<string, DistrictAlertItem> = {};

    allAlerts.forEach((item) => {
      if (item && item.district) {
        const canonical = cleanDistrictName(item.district);
        alertsMap[canonical] = {
          ...item,
          district: canonical,
          alertLevel: (item.alertLevel || 'GREEN').toUpperCase(),
        };
      }
    });

    return KERALA_DISTRICTS_LIST.map((dist) => {
      if (alertsMap[dist]) {
        return alertsMap[dist];
      }
      // Default GREEN alert if no alert object returned for district
      return {
        district: dist,
        alertLevel: 'GREEN',
        alertType: 'No Active Advisory',
        description: 'Weather conditions are normal. No disaster warnings issued.',
        source: 'Dynamic Weather Telemetry',
        rainProbability: 15,
        windSpeed: 4.2,
      };
    });
  }, [allAlerts]);

  // Current User Location Details
  const userDistrict = location?.district ? cleanDistrictName(location.district) : '';
  const isGPS = location?.isGPS === true;
  const userLocationCoords = useMemo(() => {
    if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        district: userDistrict,
      };
    }
    return null;
  }, [location, userDistrict]);

  // Current User District Alert Object
  const userDistrictAlert = useMemo(() => {
    if (!userDistrict) {
      // Fallback to weatherData alert if location district is pending
      if (weatherData?.alert) {
        return {
          district: weatherData.district || 'Current Location',
          alertLevel: (weatherData.alert.alertLevel || 'GREEN').toUpperCase(),
          alertType: weatherData.alert.alertType || 'Weather Telemetry',
          description: weatherData.alert.description || 'Dynamic status based on live telemetry.',
          source: weatherData.alert.source || 'Dynamic Weather Telemetry',
          rainProbability: weatherData.rainProbability || 20,
          windSpeed: weatherData.windSpeed || 5.0,
        };
      }
      return null;
    }
    return normalizedDistrictAlerts.find((a) => a.district === userDistrict) || null;
  }, [userDistrict, normalizedDistrictAlerts, weatherData]);

  // Currently Selected District Object for Details Panel
  const selectedDistrictAlert = useMemo(() => {
    if (!selectedDistrict) return null;
    const canonical = cleanDistrictName(selectedDistrict);
    return normalizedDistrictAlerts.find((a) => a.district === canonical) || null;
  }, [selectedDistrict, normalizedDistrictAlerts]);

  // Dynamic Alert Level Counts
  const alertCounts = useMemo(() => {
    let green = 0;
    let yellow = 0;
    let orange = 0;
    let red = 0;

    normalizedDistrictAlerts.forEach((a) => {
      const level = (a.alertLevel || 'GREEN').toUpperCase();
      if (level === 'RED') red++;
      else if (level === 'ORANGE') orange++;
      else if (level === 'YELLOW') yellow++;
      else green++;
    });

    return { green, yellow, orange, red };
  }, [normalizedDistrictAlerts]);

  // Filtered District Table
  const filteredDistricts = useMemo(() => {
    if (!searchFilter.trim()) return normalizedDistrictAlerts;
    const query = searchFilter.toLowerCase().trim();
    return normalizedDistrictAlerts.filter((a) =>
      a.district.toLowerCase().includes(query) ||
      (a.alertType && a.alertType.toLowerCase().includes(query)) ||
      (a.alertLevel && a.alertLevel.toLowerCase().includes(query))
    );
  }, [normalizedDistrictAlerts, searchFilter]);

  // Format Alert Level Badges
  const getBadgeStyle = (level?: string) => {
    switch (String(level).toUpperCase()) {
      case 'RED':
        return 'bg-red-600 text-white border-red-700 shadow-sm';
      case 'ORANGE':
        return 'bg-orange-500 text-white border-orange-600 shadow-sm';
      case 'YELLOW':
        return 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm font-bold';
      case 'GREEN':
      default:
        return 'bg-emerald-600 text-white border-emerald-700 shadow-sm';
    }
  };

  return (
    <div className="space-y-8 pb-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* =====================================================
          1. TITLE & HEADER SECTION
      ====================================================== */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-800/60 border border-emerald-600/40 px-3.5 py-1 rounded-full text-xs font-black tracking-wide text-emerald-200 mb-3 shadow-inner">
            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>INTELLIGENT KERALA EMERGENCY OPERATIONS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            🔔 Disaster Alerts Across Kerala
          </h1>

          <p className="text-sm sm:text-base text-emerald-200/90 mt-2 max-w-2xl font-medium leading-relaxed">
            Real-time district-wise disaster monitoring, weather telemetry, and emergency warnings across all 14 districts of Kerala.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-bold text-emerald-300">
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl border border-white/15">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              14 Districts Monitored
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl border border-white/15">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAlerts ? 'animate-spin text-emerald-400' : 'text-emerald-300'}`} />
              Updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={loadKeralaAlerts}
            disabled={loadingAlerts}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold px-4 py-3 transition disabled:opacity-50 shadow-md backdrop-blur-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAlerts ? 'animate-spin' : ''}`} />
            Refresh Alerts
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-5 py-3 transition shadow-lg hover:shadow-emerald-600/30"
          >
            <Download className="w-4 h-4" />
            Download Bulletin
          </button>
        </div>
      </div>

      {/* =====================================================
          2. API FETCH ERROR STATE
      ====================================================== */}
      {alertFetchError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-900 text-base">⚠️ Unable to load current alerts</p>
              <p className="text-sm text-red-700 mt-0.5">{alertFetchError}</p>
            </div>
          </div>
          <button
            onClick={loadKeralaAlerts}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition shadow-md shrink-0"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* =====================================================
          3. GPS PERMISSION WARNING (If denied/unsupported)
      ====================================================== */}
      {locationError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-900 text-sm">📍 Location unavailable</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Enable location access to see your district-specific alert automatically highlighted on the map. The rest of the Kerala district map continues working normally.
            </p>
          </div>
          <button
            onClick={refreshLocation}
            disabled={locationLoading}
            className="text-xs font-extrabold text-amber-900 bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition"
          >
            {locationLoading ? 'Detecting...' : 'Enable GPS'}
          </button>
        </div>
      )}

      {/* =====================================================
          4. PROMINENT USER CURRENT LOCATION ALERT BANNER
      ====================================================== */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/80 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          {/* Left: Location & Badge */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border-2 border-sky-200 flex items-center justify-center shrink-0 shadow-inner">
              <MapPin className="w-7 h-7 text-sky-600" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-600 text-white text-[11px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-sky-200" />
                  YOUR CURRENT LOCATION
                </span>

                {isGPS && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    GPS Verified
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight flex items-center gap-2">
                {userDistrict ? `${userDistrict}, Kerala` : (location?.placeName || 'Kerala')}
              </h2>

              <p className="text-sm text-slate-500 font-medium mt-0.5">
                {userDistrict
                  ? `Automated district hazard monitoring active for ${userDistrict}`
                  : 'Detecting your current location coordinates...'}
              </p>
            </div>
          </div>

          {/* Right: Current District Alert Card details */}
          {userDistrictAlert ? (
            <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:min-w-[440px] ${
              userDistrictAlert.alertLevel === 'RED'
                ? 'bg-red-50/90 border-red-200 text-red-950'
                : userDistrictAlert.alertLevel === 'ORANGE'
                ? 'bg-orange-50/90 border-orange-200 text-orange-950'
                : userDistrictAlert.alertLevel === 'YELLOW'
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${getBadgeStyle(userDistrictAlert.alertLevel)}`}>
                    {userDistrictAlert.alertLevel} ALERT
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {userDistrictAlert.alertType || 'District Status'}
                  </span>
                </div>

                <p className="text-sm font-extrabold text-slate-900 mt-2 leading-snug">
                  {userDistrictAlert.description || 'No severe hazards reported for your location.'}
                </p>

                <div className="flex items-center gap-4 mt-2.5 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-sky-600" />
                    Rain: {userDistrictAlert.rainProbability ?? 20}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-teal-600" />
                    Wind: {userDistrictAlert.windSpeed ?? 5.0} km/h
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedDistrict(userDistrict)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shrink-0 shadow-md"
              >
                Inspect District
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center min-w-[280px]">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-600">Detecting location alert...</p>
            </div>
          )}

        </div>
      </div>

      {/* =====================================================
          5. MAIN INTERACTIVE KERALA DISTRICT MAP SECTION
      ====================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-emerald-700" />
              Interactive Kerala District Alert Map
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Click any district polygon on the map to inspect full telemetry, weather risk warnings, and official instructions.
            </p>
          </div>

          {selectedDistrict && (
            <button
              onClick={() => setSelectedDistrict(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              Clear Selection ({selectedDistrict})
            </button>
          )}
        </div>

        {/* Map Container + Floating Side Inspector Overlay */}
        <div className="relative">
          <KeralaAlertMap
            alerts={normalizedDistrictAlerts}
            userLocation={userLocationCoords}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={(dist) => setSelectedDistrict(dist)}
            onLocateUser={refreshLocation}
            loading={loadingAlerts}
          />

          {/* District Details Overlay Inspector Panel (When district clicked) */}
          {selectedDistrictAlert && (
            <div className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-30 bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-2 border-slate-200 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${getBadgeStyle(selectedDistrictAlert.alertLevel)}`}>
                    {selectedDistrictAlert.alertLevel} ALERT
                  </span>
                  {selectedDistrictAlert.district === userDistrict && (
                    <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                      YOUR LOCATION
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setSelectedDistrict(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <h3 className="text-2xl font-black text-slate-900">
                    {selectedDistrictAlert.district}
                  </h3>
                  <p className="text-sm font-extrabold text-emerald-800 mt-1">
                    {selectedDistrictAlert.alertType || 'District Weather & Emergency Status'}
                  </p>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  {selectedDistrictAlert.description || 'No severe disaster advisories reported for this district. Continue monitoring local weather updates.'}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-sky-50 border border-sky-100 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider flex items-center gap-1">
                      <CloudRain className="w-3.5 h-3.5 text-sky-600" /> Rain Prob.
                    </span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                      {selectedDistrictAlert.rainProbability ?? 20}%
                    </span>
                  </div>

                  <div className="bg-teal-50 border border-teal-100 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-teal-600" /> Wind Speed
                    </span>
                    <span className="text-lg font-black text-slate-900 mt-0.5 block">
                      {selectedDistrictAlert.windSpeed ?? 5.0} <span className="text-xs font-bold">km/h</span>
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-medium space-y-0.5 pt-1">
                  <div>Source: <span className="font-bold text-slate-600">{selectedDistrictAlert.source || 'Dynamic Weather Telemetry'}</span></div>
                  <div>Updated: <span className="font-bold text-slate-600">Just now</span></div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleViewOnLiveMap}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs transition shadow-md"
                  >
                    View on Live Map
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          6. DYNAMIC ALERT SUMMARY CARDS
      ====================================================== */}
      <div className="space-y-3">
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Info className="w-5 h-5 text-emerald-700" />
          Kerala District Alert Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Safe GREEN */}
          <div className="bg-emerald-50/90 border-2 border-emerald-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                🟢 Safe Districts
              </span>
              <div className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse" />
            </div>
            <div className="text-3xl font-black text-emerald-950 mt-2">
              {alertCounts.green}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              Low to moderate risk — Normal status
            </p>
          </div>

          {/* Watch YELLOW */}
          <div className="bg-amber-50/90 border-2 border-amber-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                🟡 Yellow Alerts
              </span>
              <div className="w-3 h-3 rounded-full bg-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-950 mt-2">
              {alertCounts.yellow}
            </div>
            <p className="text-[11px] text-amber-800 font-medium mt-1">
              Watch & stay updated on telemetry
            </p>
          </div>

          {/* Warning ORANGE */}
          <div className="bg-orange-50/90 border-2 border-orange-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-orange-900">
                🟠 Orange Alerts
              </span>
              <div className="w-3 h-3 rounded-full bg-orange-600" />
            </div>
            <div className="text-3xl font-black text-orange-950 mt-2">
              {alertCounts.orange}
            </div>
            <p className="text-[11px] text-orange-800 font-medium mt-1">
              Warning — Be prepared for heavy weather
            </p>
          </div>

          {/* Critical RED */}
          <div className="bg-red-50/90 border-2 border-red-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-red-900">
                🔴 Red Alerts
              </span>
              <div className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
            </div>
            <div className="text-3xl font-black text-red-950 mt-2">
              {alertCounts.red}
            </div>
            <p className="text-[11px] text-red-800 font-medium mt-1">
              Critical — High disaster / severe risk
            </p>
          </div>

        </div>
      </div>

      {/* =====================================================
          7. DISTRICT ALERT DETAILS (SECONDARY COMPACT TABLE)
      ====================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-700" />
              14 District Alert Details
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comprehensive list of real-time alert advisories and telemetry for all Kerala districts.
            </p>
          </div>

          {/* Search Filter */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search district name or alert..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider text-[10px] bg-slate-50/50">
                <th className="py-3 px-4 rounded-l-xl">District</th>
                <th className="py-3 px-4">Alert Level</th>
                <th className="py-3 px-4">Disaster / Weather Type</th>
                <th className="py-3 px-4">Rainfall</th>
                <th className="py-3 px-4">Wind</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredDistricts.map((item) => {
                const isSelected = selectedDistrict === item.district;
                const isUserLoc = item.district === userDistrict;

                return (
                  <tr
                    key={item.district}
                    onClick={() => setSelectedDistrict(item.district)}
                    className={`hover:bg-slate-50/80 transition cursor-pointer ${
                      isSelected ? 'bg-emerald-50/60 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{item.district}</span>
                        {isUserLoc && (
                          <span className="bg-sky-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide border ${getBadgeStyle(item.alertLevel)}`}>
                        {item.alertLevel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-800 font-semibold">
                      {item.alertType || 'No Active Advisory'}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.rainProbability ?? 20}%
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.windSpeed ?? 5.0} km/h
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDistrict(item.district);
                        }}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-black text-xs hover:underline"
                      >
                        View Map →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};