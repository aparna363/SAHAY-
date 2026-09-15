import React from 'react';
import { X, Home, Navigation, Phone, MapPin, ExternalLink } from 'lucide-react';
import type { NearestShelter } from '../../services/aiService';

interface CopilotShelterModalProps {
  isOpen: boolean;
  onClose: () => void;
  shelters: NearestShelter[];
  loading: boolean;
  onViewOnMap: (shelter: NearestShelter) => void;
}

export const CopilotShelterModal: React.FC<CopilotShelterModalProps> = ({
  isOpen,
  onClose,
  shelters,
  loading,
  onViewOnMap
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Verified Nearby Relief Shelters</h3>
              <p className="text-xs text-slate-500">Government designated relief camps sorted by PostGIS distance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shelter List Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-600">Querying PostGIS spatial database for open shelters...</p>
            </div>
          ) : shelters.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Home className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No Active Shelters within 25 km</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No registered camps are active nearby. Contact the District Control Room at <strong>1077</strong> for emergency evacuation assistance.
              </p>
            </div>
          ) : (
            shelters.map((shelter, idx) => {
              const capacity = shelter.capacity || 100;
              const available = shelter.availableCapacity ?? capacity;
              const used = capacity - available;
              const pctUsed = Math.min(100, Math.round((used / capacity) * 100));

              return (
                <div
                  key={shelter.id || idx}
                  className="bg-slate-50 hover:bg-emerald-50/20 border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                          #{idx + 1}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{shelter.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{shelter.address || shelter.district}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-700 font-mono block">
                        {shelter.distanceKm} km
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Proximity</span>
                    </div>
                  </div>

                  {/* Bed Capacity Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Available Bed Space:</span>
                      <span className="font-bold text-emerald-700">{available} / {capacity} Beds</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pctUsed >= 90 ? 'bg-red-500' : pctUsed >= 70 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                        style={{ width: `${pctUsed}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onViewOnMap(shelter);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 transition-all flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>View on Map</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {shelter.contactNumber && (
                        <a
                          href={`tel:${shelter.contactNumber}`}
                          className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all"
                          title="Call Shelter Manager"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude || 9.59},${shelter.longitude || 76.52}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#0E8F66] hover:bg-[#0B4D3B] text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Navigate</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
