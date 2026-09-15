import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  MapPin,
  Clock,
  RefreshCw,
  Search,
  X,
  Maximize2
} from 'lucide-react';
import {
  fetchCollectorEvidence,
  type RescueEvidenceItem
} from '../../services/api';

interface CollectorEvidenceViewProps {
  district: string;
  onSelectIncident?: (incidentId: number | string) => void;
}

export const CollectorEvidenceView: React.FC<CollectorEvidenceViewProps> = ({
  district,
  onSelectIncident
}) => {
  const [evidenceList, setEvidenceList] = useState<RescueEvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedItemForModal, setSelectedItemForModal] = useState<RescueEvidenceItem | null>(null);

  const loadEvidence = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchCollectorEvidence(district);
      setEvidenceList(data);
    } catch (err) {
      console.error('Failed to load collector evidence:', err);
    } finally {
      setIsLoading(false);
    }
  }, [district]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const filtered = evidenceList.filter((item) => {
    if (typeFilter !== 'ALL' && item.evidence_type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        item.incident_code.toLowerCase().includes(q) ||
        (item.uploaded_by_name || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.locationAddress || '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  // Calculate total lives saved in this district
  const totalRescued = evidenceList.reduce((acc, curr) => acc + (curr.people_rescued || 0), 0);
  const totalEvacuated = evidenceList.reduce((acc, curr) => acc + (curr.people_evacuated || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 mb-1">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>District Operational Evidence Audit</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Rescue &amp; Damage Field Evidence ({district} District)
            </h2>
            <p className="text-xs text-slate-500">
              Live field photos, damage assessments, and rescue counts submitted by deployed Rescue Teams.
            </p>
          </div>

          <button
            onClick={loadEvidence}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all border border-slate-200 disabled:opacity-50"
            title="Refresh Evidence"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Total Rescued</span>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-0.5">{totalRescued}</div>
            <div className="text-[10px] text-emerald-600">Lives Saved in District</div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Total Evacuated</span>
            <div className="text-2xl font-black text-blue-700 font-mono mt-0.5">{totalEvacuated}</div>
            <div className="text-[10px] text-blue-600">Moved to Safe Camps</div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Evidence Records</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{evidenceList.length}</div>
            <div className="text-[10px] text-slate-500">Field Reports &amp; Media</div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">Photos &amp; Videos</span>
            <div className="text-2xl font-black text-purple-700 font-mono mt-0.5">
              {evidenceList.filter((e) => e.file_url).length}
            </div>
            <div className="text-[10px] text-purple-600">Geo-tagged Media</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by incident code, team, address, or damage description..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
            <span className="text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-900 font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Evidence</option>
              <option value="PHOTO">Photos Only</option>
              <option value="VIDEO">Videos Only</option>
              <option value="REPORT">Structured Reports</option>
            </select>
          </div>
        </div>
      </div>

      {/* Evidence Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900">No evidence records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Rescue teams in {district} have not submitted damage/rescue evidence matching this filter yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Media preview */}
                {item.file_url ? (
                  <div
                    onClick={() => setSelectedItemForModal(item)}
                    className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center cursor-pointer group"
                  >
                    {item.evidence_type === 'VIDEO' ? (
                      <video src={`http://localhost:5000${item.file_url}`} className="max-h-full max-w-full" />
                    ) : (
                      <img
                        src={`http://localhost:5000${item.file_url}`}
                        alt="Damage Evidence"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="px-3 py-1.5 bg-slate-900/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>View Full Evidence</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 bg-slate-50 border-b border-slate-100 flex items-center justify-center text-xs text-slate-400 font-bold">
                    📝 Field Damage &amp; Rescue Assessment
                  </div>
                )}

                {/* Body details */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onSelectIncident?.(item.incident_id)}
                      className="font-mono text-xs font-black text-slate-900 hover:text-emerald-700 transition-colors text-left cursor-pointer"
                      title="View Incident Details"
                    >
                      {item.incident_code} &bull; <span className="text-emerald-700">{item.incidentTypeName || 'Incident'}</span>
                    </button>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                      {item.evidence_type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium line-clamp-2">
                    {item.description || item.other_observations || 'Operational field update submitted by rescue team.'}
                  </p>

                  {/* Rescue metrics */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100 font-bold">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Rescued</div>
                      <div className="text-emerald-700 font-black font-mono text-sm">{item.people_rescued}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Injured</div>
                      <div className="text-amber-700 font-black font-mono text-sm">{item.people_injured}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Missing</div>
                      <div className="text-red-700 font-black font-mono text-sm">{item.people_missing}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Evacuated</div>
                      <div className="text-blue-700 font-black font-mono text-sm">{item.people_evacuated}</div>
                    </div>
                  </div>

                  {/* Damage tags */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-600">
                    {item.flood_depth && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md border border-blue-200">
                        Flood: {item.flood_depth}
                      </span>
                    )}
                    {item.road_condition && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md border border-amber-200">
                        Road: {item.road_condition}
                      </span>
                    )}
                    {item.building_damage && item.building_damage !== 'None' && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-md border border-rose-200">
                        Building: {item.building_damage}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer with GPS & Timestamp */}
              <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div>
                  By: <strong className="text-slate-800">{item.uploaded_by_name || 'Rescue Team'}</strong>
                </div>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Full View Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Field Evidence Detail &bull; {selectedItemForModal.incident_code}
                </h3>
                <div className="text-xs text-slate-400">
                  Uploaded by {selectedItemForModal.uploaded_by_name} ({selectedItemForModal.rescue_unit_id})
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {selectedItemForModal.file_url && (
                <div className="bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center max-h-96">
                  {selectedItemForModal.evidence_type === 'VIDEO' ? (
                    <video src={`http://localhost:5000${selectedItemForModal.file_url}`} controls className="max-h-96 w-auto" />
                  ) : (
                    <img
                      src={`http://localhost:5000${selectedItemForModal.file_url}`}
                      alt="Full Evidence"
                      className="max-h-96 w-auto object-contain"
                    />
                  )}
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-900">Description &amp; Observations:</div>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200 leading-relaxed font-medium">
                  {selectedItemForModal.description || selectedItemForModal.other_observations || 'No additional notes provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Rescued</div>
                  <div className="text-xl font-black text-emerald-700 font-mono">{selectedItemForModal.people_rescued}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Injured</div>
                  <div className="text-xl font-black text-amber-700 font-mono">{selectedItemForModal.people_injured}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Missing</div>
                  <div className="text-xl font-black text-red-700 font-mono">{selectedItemForModal.people_missing}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Evacuated</div>
                  <div className="text-xl font-black text-blue-700 font-mono">{selectedItemForModal.people_evacuated}</div>
                </div>
              </div>

              {selectedItemForModal.latitude && selectedItemForModal.longitude && (
                <div className="text-xs text-slate-600 flex items-center gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>
                    Verified Field GPS: <strong>{Number(selectedItemForModal.latitude).toFixed(6)}, {Number(selectedItemForModal.longitude).toFixed(6)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
