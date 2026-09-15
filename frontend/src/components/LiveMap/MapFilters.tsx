import React from 'react';
import { Filter, Search, RotateCcw, MapPin } from 'lucide-react';

export const KERALA_DISTRICTS = [
  'All Kerala',
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad'
];

interface MapFiltersProps {
  role: 'citizen' | 'rescue_team' | 'collector' | 'admin';
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedSeverity: string;
  onSeverityChange: (severity: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  incidentCount: number;
  className?: string;
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  role,
  selectedDistrict,
  onDistrictChange,
  selectedSeverity,
  onSeverityChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  onReset,
  incidentCount,
  className = ''
}) => {
  const allowDistrictSwitch = role === 'admin' || role === 'citizen';

  return (
    <div className={`bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-lg space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#059669]" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Operational Filters
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
            {incidentCount} Visible
          </span>
        </div>

        <button
          onClick={onReset}
          className="text-[11px] font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* District Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            District Sector
          </label>
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={(e) => onDistrictChange(e.target.value)}
              disabled={!allowDistrictSwitch}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            >
              {KERALA_DISTRICTS.map((dist) => (
                <option key={dist} value={dist === 'All Kerala' ? 'all' : dist}>
                  {dist}
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Severity Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Severity Level
          </label>
          <select
            value={selectedSeverity}
            onChange={(e) => onSeverityChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">🔴 Critical Only</option>
            <option value="HIGH">🟠 High Only</option>
            <option value="MODERATE">🟡 Moderate Only</option>
            <option value="LOW">🟢 Low Only</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Incident Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">All Active Statuses</option>
            <option value="SUBMITTED">Submitted / New</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="RESPONSE_ASSIGNED">Rescue Dispatched</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {/* Search Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Quick Search
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search code, area, type..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
