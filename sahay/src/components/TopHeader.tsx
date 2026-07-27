import React, { useState } from 'react';
import { PhoneCall, Radio, Globe, ShieldAlert } from 'lucide-react';

interface TopHeaderProps {
  onOpenContacts: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenContacts }) => {
  const [lang, setLang] = useState('English (EN)');

  return (
    <header className="w-full bg-[#043e2e] text-white text-xs sm:text-sm py-2 px-4 sm:px-8 border-b border-[#065f46] flex flex-wrap items-center justify-between gap-3 z-50 relative">
      {/* Left: Government Title */}
      <div className="flex items-center gap-3">
        <div className="bg-[#065f46] p-1.5 rounded-md flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="font-bold tracking-wide uppercase text-[13px] text-emerald-100">
            Government of Kerala
          </div>
          <div className="text-[11px] text-emerald-300 font-medium">
            Department of Disaster Management
          </div>
        </div>
      </div>

      {/* Right: Emergency Numbers & Language Selector */}
      <div className="flex items-center flex-wrap gap-3 sm:gap-5">
        {/* Emergency Call Pill */}
        <button
          onClick={onOpenContacts}
          className="flex items-center gap-2 bg-[#065f46]/80 hover:bg-[#065f46] text-white px-3 py-1.5 rounded-full border border-emerald-500/30 transition-all cursor-pointer text-xs font-semibold"
          title="Click to view all emergency helplines"
        >
          <PhoneCall className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Emergency: <strong className="text-white font-extrabold">112</strong></span>
        </button>

        {/* Disaster Helpline Pill */}
        <button
          onClick={onOpenContacts}
          className="flex items-center gap-2 bg-[#065f46]/80 hover:bg-[#065f46] text-white px-3 py-1.5 rounded-full border border-emerald-500/30 transition-all cursor-pointer text-xs font-semibold"
          title="Disaster Management Helpline"
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span>Helpline: <strong className="text-white font-extrabold">1077</strong></span>
        </button>

        {/* Language Selector */}
        <div className="relative flex items-center bg-[#032e22] px-3 py-1.5 rounded-lg border border-emerald-600/40 text-xs text-emerald-200">
          <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-transparent text-emerald-100 text-xs font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="English (EN)" className="bg-[#043e2e] text-white">English (EN)</option>
            <option value="Malayalam (ML)" className="bg-[#043e2e] text-white">മലയാളം (ML)</option>
            <option value="Hindi (HI)" className="bg-[#043e2e] text-white">ഹിन्दी (HI)</option>
          </select>
        </div>
      </div>
    </header>
  );
};
