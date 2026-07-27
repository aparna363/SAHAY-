import React from 'react';
import { LifeBuoy, ShieldAlert, LogOut, Radio, Compass } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';

interface RescueDashboardProps {
  user?: any;
  onSignOut: () => void;
}

export const RescueDashboard: React.FC<RescueDashboardProps> = ({ user, onSignOut }) => {
  return (
    <div className="min-h-[85vh] bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-950/80 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400">
              <LifeBuoy className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-1">
                Rescue Operations Center
              </div>
              <h1 className="text-2xl font-black text-white">
                Rescue Team Command Dashboard
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Responder: {user?.name || 'NDRF / Fire Rescue Specialist'} ({user?.district || 'Idukki'} Sector)
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
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Sector</span>
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-white">
              NDRF Sector {user?.district || 'Idukki'}
            </div>
            <p className="text-xs text-slate-400">
              Rapid Response Team Deployment Console.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comms Channel</span>
              <Radio className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              Radio Frequency Active
            </div>
            <p className="text-xs text-slate-400">
              Direct Link with State Emergency Operations Center.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Badge Code</span>
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-white">
              {user?.departmentId || 'NDRF-KLA-4BN'}
            </div>
            <p className="text-xs text-slate-400">
              Verified Emergency Responder Specialist ID.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
