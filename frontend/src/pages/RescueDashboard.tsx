import React, { useState } from 'react';
import { LifeBuoy, LogOut, ArrowLeft } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import { OfficialIncidentsPage } from './OfficialIncidentsPage';
import { OfficialIncidentDetailsPage } from './OfficialIncidentDetailsPage';

interface RescueDashboardProps {
  user?: any;
  onSignOut: () => void;
}

export const RescueDashboard: React.FC<RescueDashboardProps> = ({ user, onSignOut }) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  return (
    <div className="min-h-[85vh] bg-slate-950 text-slate-100 py-6 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-950/80 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400">
              <LifeBuoy className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-1">
                Rescue Operations Center
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Rescue Team Command Dashboard
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Responder: <strong className="text-white">{user?.name || 'NDRF / Station Specialist'}</strong> ({user?.district || 'State'} Sector)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedIncidentId && (
              <button
                onClick={() => setSelectedIncidentId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Incidents</span>
              </button>
            )}

            <div className="max-w-[130px] hidden sm:block">
              <img src={fullLogoSahay} alt="SAHAY" className="w-full h-auto object-contain brightness-125" />
            </div>

            <button
              onClick={onSignOut}
              className="px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dynamic Incident View */}
        {selectedIncidentId ? (
          <OfficialIncidentDetailsPage
            incidentId={selectedIncidentId}
            onBack={() => setSelectedIncidentId(null)}
          />
        ) : (
          <OfficialIncidentsPage
            onViewIncident={(id) => setSelectedIncidentId(id)}
          />
        )}

      </div>
    </div>
  );
};
