import React from 'react';
import { Building2, ShieldAlert, LogOut, FileText, Activity } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';

interface CollectorDashboardProps {
  user?: any;
  onSignOut: () => void;
}

export const CollectorDashboard: React.FC<CollectorDashboardProps> = ({ user, onSignOut }) => {
  return (
    <div className="min-h-[85vh] bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-amber-400">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-wider mb-1">
                District Collectorate Portal
              </div>
              <h1 className="text-2xl font-black text-white">
                District Collector Command Dashboard
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Official Authority: {user?.name || 'District Collector & Magistrate'} ({user?.district || 'Idukki'} District)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="max-w-[150px] hidden sm:block">
              <img src={fullLogoSahay} alt="SAHAY" className="w-full h-auto object-contain brightness-125" />
            </div>
            <button
              onClick={onSignOut}
              className="px-5 py-2.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">District Authority</span>
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-white">
              DDMA {user?.district || 'Idukki'}
            </div>
            <p className="text-xs text-slate-400">
              District Disaster Management Authority Executive Command Console.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              Control Room Active
            </div>
            <p className="text-xs text-slate-400">
              High Priority Weather Monitoring & Telemetry Connected.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official Code</span>
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-xl font-extrabold text-white">
              {user?.departmentId || 'IAS-KLA-2026'}
            </div>
            <p className="text-xs text-slate-400">
              Magistrate Service Verification Active.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
