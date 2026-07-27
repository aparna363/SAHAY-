import React from 'react';
import { RiverDamStatus } from '../components/RiverDamStatus';
import { Waves, Download } from 'lucide-react';

export const RiverStatusPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      
      {/* Page Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
            <Waves className="w-4 h-4 text-sky-400" />
            <span>State Water Resources & Irrigation Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            River Gauges & Dam Reservoir Portal
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl font-normal">
            Real-time telemetry water level monitoring, flood gauge sensors, dam shutter release notices, and storage capacity statistics.
          </p>
        </div>

        <button className="btn-primary text-xs font-bold px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span>Telemetry PDF Report</span>
        </button>
      </div>

      {/* Embedded Telemetry Component */}
      <RiverDamStatus />

    </div>
  );
};
