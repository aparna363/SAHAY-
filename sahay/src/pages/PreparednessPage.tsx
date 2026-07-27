import React from 'react';
import { PreparednessGuide } from '../components/PreparednessGuide';
import { BookOpen, Download } from 'lucide-react';

export const PreparednessPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>KSDMA Community Resilience Handbook</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Citizen Safety & Disaster Preparedness
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl font-normal">
            Step-by-step safety manuals, emergency survival checklists, landslide indicators, and flood safety protocols.
          </p>
        </div>

        <button className="btn-primary text-xs font-bold px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2">
          <Download className="w-4 h-4" />
          <span>Download Safety Handbook (PDF)</span>
        </button>
      </div>

      {/* Embedded Preparedness Guide */}
      <PreparednessGuide />

    </div>
  );
};
