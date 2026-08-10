import React from 'react';
import { PhoneCall, Radio, Globe, ShieldAlert, ShieldCheck, MapPin } from 'lucide-react';
import { translations } from '../translations';
import type { Language } from '../translations';
import { useLocation } from '../context/LocationContext';

interface TopHeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenContacts: () => void;
  onOpenOfficialLogin?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentLang,
  onLanguageChange,
  onOpenContacts,
  onOpenOfficialLogin,
}) => {
  const t = translations[currentLang];
  const { location, openPromptModal, loading } = useLocation();

  const isGPS = location?.isGPS;
  const locationText = location?.placeName || location?.district || 'Location unavailable';

  return (
    <header className="w-full bg-[#043e2e] text-white text-xs sm:text-sm py-2 px-4 sm:px-8 border-b border-[#065f46] flex flex-wrap items-center justify-between gap-3 z-50 relative">
      {/* Left: Government Title */}
      <div className="flex items-center gap-3">
        <div className="bg-[#065f46] p-1.5 rounded-md flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="font-bold tracking-wide uppercase text-[13px] text-emerald-100">
            {t.govtKerala}
          </div>
          <div className="text-[11px] text-emerald-300 font-medium">
            {t.deptDisaster}
          </div>
        </div>
      </div>

      {/* Right: Location Badge, Emergency Numbers, Official Portal & Language Selector */}
      <div className="flex items-center flex-wrap gap-2 sm:gap-3">
        
        {/* Live Detected Location Pill */}
        <button
          onClick={openPromptModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm cursor-pointer ${
            isGPS
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
          }`}
          title={isGPS ? `GPS Position Verified: ${locationText}` : 'Click to enable live GPS location'}
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <MapPin className={`w-3.5 h-3.5 ${isGPS ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          )}
          <span className="truncate max-w-[180px] sm:max-w-[240px]">
            {isGPS ? `📍 ${locationText}` : 'Enable GPS Location'}
          </span>
        </button>

        {/* Official Government Portal Link */}
        {onOpenOfficialLogin && (
          <button
            onClick={onOpenOfficialLogin}
            className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-full border border-amber-500/40 transition-all cursor-pointer text-xs font-extrabold shadow-sm"
            title="Official Government Administration Portal"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Official Portal</span>
          </button>
        )}

        {/* Emergency Call Pill */}
        <button
          onClick={onOpenContacts}
          className="flex items-center gap-2 bg-[#065f46]/80 hover:bg-[#065f46] text-white px-3 py-1.5 rounded-full border border-emerald-500/30 transition-all cursor-pointer text-xs font-semibold"
          title="Click to view all emergency helplines"
        >
          <PhoneCall className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>{t.emergency}: <strong className="text-white font-extrabold">112</strong></span>
        </button>

        {/* Disaster Helpline Pill */}
        <button
          onClick={onOpenContacts}
          className="flex items-center gap-2 bg-[#065f46]/80 hover:bg-[#065f46] text-white px-3 py-1.5 rounded-full border border-emerald-500/30 transition-all cursor-pointer text-xs font-semibold"
          title="Disaster Management Helpline"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.helpline}: <strong className="text-white font-extrabold">1077</strong></span>
        </button>

        {/* Language Selector */}
        <div className="relative flex items-center bg-[#032e22] px-3 py-1.5 rounded-lg border border-emerald-600/40 text-xs text-emerald-200 shadow-sm">
          <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
          <select
            value={currentLang}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="bg-transparent text-emerald-100 text-xs font-bold focus:outline-none cursor-pointer pr-1"
          >
            <option value="en" className="bg-[#043e2e] text-white">English (EN)</option>
            <option value="ml" className="bg-[#043e2e] text-white">മലയാളം (ML)</option>
            <option value="hi" className="bg-[#043e2e] text-white">ഹിन्दी (HI)</option>
          </select>
        </div>
      </div>
    </header>
  );
};

