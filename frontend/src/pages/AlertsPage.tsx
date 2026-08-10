import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  ShieldAlert,
  Download,
  MapPin,
  CheckCircle,
  Clock,
  Navigation,
  RefreshCw,
} from 'lucide-react';

import { useLocation } from '../context/LocationContext';
import { fetchAllKeralaAlerts } from '../services/api';

export const AlertsPage: React.FC = () => {
  const {
    location,
    weatherData,
    loading,
    error,
    refreshLocation,
  } = useLocation();

  const [allKeralaAlerts, setAllKeralaAlerts] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingAll(true);
    fetchAllKeralaAlerts()
      .then((alerts) => {
        if (isMounted) {
          setAllKeralaAlerts(alerts);
          setLoadingAll(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingAll(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // =========================================================
  // CURRENT GPS LOCATION
  // =========================================================

  const userDistrict = location?.district || '';
  const placeDisplay =
    location?.placeName ||
    location?.district ||
    'Location unavailable';

  const isGPS = location?.isGPS === true;

  // =========================================================
  // CURRENT ALERT FROM BACKEND
  //
  // weather.js returns:
  // data.alert = alertInfo
  //
  // alertInfo comes from alertService.js
  // =========================================================

  const currentAlert = weatherData?.alert || null;

  // =========================================================
  // ALERT LEVEL
  // =========================================================

  const alertLevel =
    currentAlert?.alertLevel?.toUpperCase() || 'GREEN';

  // =========================================================
  // ALERT STYLE
  // =========================================================

  const getAlertStyles = (level: string) => {
    switch (level.toUpperCase()) {
      case 'RED':
        return {
          container:
            'bg-red-50 border-red-200',
          iconContainer:
            'bg-red-100 border-red-200',
          icon:
            'text-red-600',
          title:
            'text-red-700',
          badge:
            'bg-red-600 text-white',
          badgeLight:
            'bg-red-100 text-red-700 border-red-200',
          action:
            'bg-red-50 border-red-200 text-red-900',
        };

      case 'ORANGE':
        return {
          container:
            'bg-orange-50 border-orange-200',
          iconContainer:
            'bg-orange-100 border-orange-200',
          icon:
            'text-orange-600',
          title:
            'text-orange-700',
          badge:
            'bg-orange-600 text-white',
          badgeLight:
            'bg-orange-100 text-orange-700 border-orange-200',
          action:
            'bg-orange-50 border-orange-200 text-orange-900',
        };

      case 'YELLOW':
        return {
          container:
            'bg-amber-50 border-amber-200',
          iconContainer:
            'bg-amber-100 border-amber-200',
          icon:
            'text-amber-600',
          title:
            'text-amber-700',
          badge:
            'bg-amber-500 text-slate-950',
          badgeLight:
            'bg-amber-100 text-amber-800 border-amber-200',
          action:
            'bg-amber-50 border-amber-200 text-amber-900',
        };

      default:
        return {
          container:
            'bg-emerald-50 border-emerald-200',
          iconContainer:
            'bg-emerald-100 border-emerald-200',
          icon:
            'text-emerald-600',
          title:
            'text-emerald-700',
          badge:
            'bg-emerald-600 text-white',
          badgeLight:
            'bg-emerald-100 text-emerald-700 border-emerald-200',
          action:
            'bg-emerald-50 border-emerald-200 text-emerald-900',
        };
    }
  };

  const alertStyles = getAlertStyles(alertLevel);

  // =========================================================
  // ALERT STATUS
  // =========================================================

  const hasActiveAlert =
    currentAlert &&
    currentAlert.alertLevel &&
    currentAlert.alertLevel.toUpperCase() !== 'GREEN';

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (time?: string | null) => {
    if (!time) return 'Not available';

    try {
      return new Date(time).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return time;
    }
  };

  return (
    <div className="space-y-6 pb-10">

      {/* =====================================================
          CURRENT LOCATION TELEMETRY
      ====================================================== */}

      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 border border-emerald-700/60 rounded-3xl p-5 sm:p-6 shadow-lg text-white">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

          {/* Location */}
          <div className="flex items-center gap-4">

            <div className="w-12 h-12 rounded-2xl bg-emerald-700/50 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-emerald-300" />
            </div>

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Current Location
                </span>

                {isGPS && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase">
                    <Navigation className="w-3 h-3" />
                    GPS Verified
                  </span>
                )}

              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {placeDisplay}
              </h2>

              <p className="text-sm text-emerald-200 mt-0.5">
                {userDistrict
                  ? `${userDistrict}, Kerala`
                  : 'Detecting your current location...'}
              </p>

            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={refreshLocation}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''
                }`}
            />

            {loading
              ? 'Updating Location...'
              : 'Refresh Location'}
          </button>

        </div>
      </div>


      {/* =====================================================
          ERROR MESSAGE
      ====================================================== */}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">

          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />

          <div>
            <p className="font-bold text-red-800">
              Location / Weather Error
            </p>

            <p className="text-sm text-red-700 mt-1">
              {error}
            </p>
          </div>

        </div>
      )}


      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">

        <div>

          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-3">

            <Bell className="w-4 h-4 text-red-400 animate-pulse" />

            <span>
              LOCATION-BASED SAFETY MONITORING
            </span>

          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Live Emergency Alerts
          </h1>

          <p className="text-sm text-emerald-200 mt-2 max-w-2xl">
            Disaster warnings and safety advisories for your
            currently detected location.
          </p>

        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-5 py-3 transition"
        >
          <Download className="w-4 h-4" />
          Download Bulletin
        </button>

      </div>


      {/* =====================================================
          LOCATION STATUS
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* District */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Detected District
              </p>

              <p className="text-lg font-black text-slate-900">
                {userDistrict || 'Detecting...'}
              </p>
            </div>

          </div>

        </div>


        {/* GPS Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Location Source
              </p>

              <p className="text-lg font-black text-slate-900">
                {isGPS ? 'Browser GPS' : 'Manual'}
              </p>

            </div>

          </div>

        </div>


        {/* Alert Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alertStyles.iconContainer}`}>

              {alertLevel === 'GREEN' ? (
                <CheckCircle
                  className={`w-5 h-5 ${alertStyles.icon}`}
                />
              ) : (
                <ShieldAlert
                  className={`w-5 h-5 ${alertStyles.icon}`}
                />
              )}

            </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Current Alert
              </p>

              <p className={`text-lg font-black ${alertStyles.title}`}>
                {alertLevel === 'GREEN'
                  ? 'No Active Alert'
                  : `${alertLevel} Alert`}
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          ALERT SEVERITY LEGEND
      ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3">

          <div className="w-4 h-4 rounded-full bg-red-600" />

          <div>
            <div className="text-xs font-black text-red-700">
              RED
            </div>

            <div className="text-[11px] text-slate-600 font-medium">
              Take Action Immediately
            </div>
          </div>

        </div>


        <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-3">

          <div className="w-4 h-4 rounded-full bg-orange-600" />

          <div>
            <div className="text-xs font-black text-orange-700">
              ORANGE
            </div>

            <div className="text-[11px] text-slate-600 font-medium">
              Be Prepared & Vigilant
            </div>
          </div>

        </div>


        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">

          <div className="w-4 h-4 rounded-full bg-amber-500" />

          <div>
            <div className="text-xs font-black text-amber-800">
              YELLOW
            </div>

            <div className="text-[11px] text-slate-600 font-medium">
              Watch & Stay Updated
            </div>
          </div>

        </div>


        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">

          <div className="w-4 h-4 rounded-full bg-emerald-600" />

          <div>
            <div className="text-xs font-black text-emerald-800">
              GREEN
            </div>

            <div className="text-[11px] text-slate-600 font-medium">
              No Active Advisory
            </div>
          </div>

        </div>

      </div>


      {/* =====================================================
          CURRENT LOCATION ALERT
      ====================================================== */}

      <div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">

            <ShieldAlert
              className={`w-6 h-6 ${alertLevel === 'GREEN'
                  ? 'text-emerald-600'
                  : 'text-red-600'
                }`}
            />

            Alert for Your Location

          </h2>

          {userDistrict && (
            <span className="text-sm font-bold text-slate-500">
              {userDistrict}, Kerala
            </span>
          )}

        </div>


        {/* ===================================================
            LOADING
        ==================================================== */}

        {loading && (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm text-center">

            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />

            <p className="font-bold text-slate-800">
              Loading location-based alert...
            </p>

            <p className="text-sm text-slate-500 mt-1">
              Checking your current GPS location and disaster
              alert information.
            </p>

          </div>
        )}


        {/* ===================================================
            NO ALERT DATA
        ==================================================== */}

        {!loading && !currentAlert && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">

            <div className="max-w-xl mx-auto text-center">

              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">

                <AlertTriangle className="w-8 h-8 text-amber-500" />

              </div>

              <h3 className="text-xl font-black text-slate-900">
                Alert Information Unavailable
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                SAHAY could not retrieve disaster alert
                information for your current location.
              </p>

              <button
                onClick={refreshLocation}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>

            </div>

          </div>
        )}


        {/* ===================================================
            ACTIVE / CURRENT ALERT
        ==================================================== */}

        {!loading && currentAlert && (
          <div className="space-y-5">

            {/* Main Alert Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">

              {/* Alert Header */}
              <div className={`p-5 sm:p-7 border-b ${alertStyles.container}`}>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                  <div className="flex items-start gap-4">

                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${alertStyles.iconContainer}`}>

                      {alertLevel === 'GREEN' ? (
                        <CheckCircle
                          className={`w-6 h-6 ${alertStyles.icon}`}
                        />
                      ) : (
                        <AlertTriangle
                          className={`w-6 h-6 ${alertStyles.icon}`}
                        />
                      )}

                    </div>

                    <div>

                      <div className="flex flex-wrap items-center gap-2 mb-2">

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${alertStyles.badge}`}
                        >
                          {alertLevel === 'GREEN'
                            ? 'NO ACTIVE ALERT'
                            : `${alertLevel} ALERT`}
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          Live Location Alert
                        </span>

                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                        {currentAlert.alertType ||
                          'Weather / Disaster Advisory'}
                      </h3>

                    </div>

                  </div>

                </div>

              </div>


              {/* Alert Body */}
              <div className="p-5 sm:p-7 space-y-6">

                {/* Description */}
                <div>

                  <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Advisory
                  </p>

                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                    {currentAlert.description ||
                      `No additional advisory information is available for ${userDistrict}.`}
                  </p>

                </div>


                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">

                    <div className="flex items-center gap-2 mb-2">

                      <MapPin className="w-4 h-4 text-emerald-600" />

                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Affected Location
                      </span>

                    </div>

                    <p className="font-black text-slate-900">
                      {placeDisplay}
                    </p>

                    <p className="text-sm text-slate-500">
                      {userDistrict
                        ? `${userDistrict}, Kerala`
                        : 'Kerala'}
                    </p>

                  </div>


                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">

                    <div className="flex items-center gap-2 mb-2">

                      <ShieldAlert className="w-4 h-4 text-emerald-600" />

                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Alert Source
                      </span>

                    </div>

                    <p className="font-black text-slate-900">
                      {currentAlert.source ||
                        'SAHAY Disaster Monitoring System'}
                    </p>

                  </div>

                </div>


                {/* Action Required */}
                {alertLevel !== 'GREEN' && (
                  <div className={`rounded-2xl border p-4 ${alertStyles.action}`}>

                    <div className="flex items-start gap-3">

                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />

                      <div>

                        <p className="font-black text-sm">
                          Action Recommended
                        </p>

                        <p className="text-sm mt-1 leading-relaxed">
                          Follow instructions issued by official
                          disaster-management authorities. Avoid
                          high-risk areas and move to a safe location
                          if authorities issue an evacuation order.
                        </p>

                      </div>

                    </div>

                  </div>
                )}


                {/* Time / Source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">

                  <div>

                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                      Alert Started
                    </p>

                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {formatTime(currentAlert.startTime)}
                    </p>

                  </div>


                  <div>

                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                      Alert Valid Until
                    </p>

                    <p className="text-sm font-bold text-slate-700 mt-1">
                      {formatTime(currentAlert.endTime)}
                    </p>

                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                GREEN / SAFE STATUS
            ================================================== */}

            {!hasActiveAlert && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6">

                <div className="flex items-start gap-4">

                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">

                    <CheckCircle className="w-6 h-6 text-emerald-600" />

                  </div>

                  <div>

                    <h3 className="font-black text-emerald-900">
                      No Active Disaster Alert
                    </h3>

                    <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
                      There is currently no severe disaster warning
                      recorded for {userDistrict || 'your current location'}.
                      Continue monitoring SAHAY for updates.
                    </p>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </div>


      {/* =====================================================
          ALL KERALA DISTRICT DISASTER ALERTS
      ====================================================== */}

      <div className="space-y-5 pt-4 border-t border-slate-200">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-emerald-600" />
              Disaster Alerts Across All Kerala Districts
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Live disaster monitoring and emergency status across all 14 districts of Kerala.
            </p>
          </div>

          <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full self-start sm:self-auto">
            14 Districts Monitored
          </span>

        </div>

        {loadingAll ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Loading all Kerala district alerts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allKeralaAlerts.map((item, idx) => {
              const lvl = item.alertLevel?.toUpperCase() || 'GREEN';
              const isRed = lvl === 'RED';
              const isOrange = lvl === 'ORANGE';
              const isYellow = lvl === 'YELLOW';

              const cardBg = isRed
                ? 'bg-red-50/60 border-red-200'
                : isOrange
                  ? 'bg-orange-50/60 border-orange-200'
                  : isYellow
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-slate-50/60 border-slate-200';

              const badgeClass = isRed
                ? 'bg-red-600 text-white'
                : isOrange
                  ? 'bg-orange-600 text-white'
                  : isYellow
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-600 text-white';

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-5 transition-all hover:shadow-md flex flex-col justify-between ${cardBg}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-black text-slate-900">
                        {item.district}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClass}`}>
                        {lvl === 'GREEN' ? 'SAFE' : `${lvl} ALERT`}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-700 mb-1">
                      {item.alertType || 'Weather Advisory'}
                    </h4>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3">
                      {item.description || `No severe emergency warning active in ${item.district}.`}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>Source: {item.source || 'IMD / KSDMA'}</span>
                    <span>Updated Live</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>


      {/* =====================================================
          DATA SOURCE INFORMATION
      ====================================================== */}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">

        <div className="flex items-start gap-3">

          <ShieldAlert className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />

          <div>

            <p className="text-sm font-black text-slate-700">
              SAHAY Location-Based Alert System
            </p>

            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Alert information is associated with your detected
              district. Your location is obtained through browser
              GPS and reverse-geocoded using OpenStreetMap
              Nominatim. No IP-based location detection is used
              by this page.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AlertsPage;