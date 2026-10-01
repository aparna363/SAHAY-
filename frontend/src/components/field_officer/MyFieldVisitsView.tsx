import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Camera,
  ArrowRight,
  ClipboardCheck,
  User,
  Phone,
  RotateCw,
  CalendarDays
} from 'lucide-react';
import { fetchFieldOfficerVisits } from '../../services/api';

interface MyFieldVisitsViewProps {
  onConductInspection: (claim: any) => void;
  onViewClaim: (claim: any) => void;
}

export const MyFieldVisitsView: React.FC<MyFieldVisitsViewProps> = ({
  onConductInspection,
  onViewClaim
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [completedVisits, setCompletedVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVisits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFieldOfficerVisits();
      setUpcomingVisits(data.upcomingVisits || []);
      setCompletedVisits(data.completedVisits || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load field visits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Header & Tabs */}
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/60">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            <span>My Field Visits Schedule & History</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage upcoming ground inspections and view archive of verified disaster sites
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming Visits ({upcomingVisits.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed Visits ({completedVisits.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <RotateCw className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Loading visit schedules...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        ) : activeTab === 'upcoming' ? (
          upcomingVisits.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">No upcoming field visits scheduled</p>
              <p className="text-slate-400 mt-0.5">Select a claim from the table above to schedule a new visit.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {upcomingVisits.map((visit) => {
                const isToday =
                  visit.scheduled_visit_date &&
                  new Date(visit.scheduled_visit_date).toDateString() === new Date().toDateString();

                return (
                  <div
                    key={visit.id}
                    className={`p-4 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between ${
                      isToday
                        ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div>
                      {/* Top Tag & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-bold text-xs text-emerald-800">
                          {visit.claim_id}
                        </span>
                        {isToday ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white animate-pulse">
                            TODAY
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                            Scheduled
                          </span>
                        )}
                      </div>

                      {/* Applicant Info */}
                      <div className="text-xs">
                        <div className="font-bold text-slate-900">{visit.applicant_name}</div>
                        {visit.applicant_phone && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {visit.applicant_phone}
                          </div>
                        )}
                      </div>

                      {/* Address */}
                      <div className="mt-2.5 text-[11px] text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{visit.village || visit.taluk || ''}, {visit.district}</span>
                      </div>

                      {/* Disaster & Damage */}
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {visit.disaster_type}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200 truncate">
                          {visit.damage_category || 'Assessment Pending'}
                        </span>
                      </div>

                      {/* Scheduled Time Banner */}
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center gap-2 text-xs">
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900">
                            {visit.scheduled_visit_date
                              ? new Date(visit.scheduled_visit_date).toLocaleDateString('en-IN', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short'
                                })
                              : 'Pending Date'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {visit.scheduled_visit_date
                              ? new Date(visit.scheduled_visit_date).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : ''}
                          </div>
                        </div>
                      </div>

                      {visit.scheduled_visit_notes && (
                        <p className="mt-2 text-[11px] text-slate-500 italic line-clamp-2">
                          "{visit.scheduled_visit_notes}"
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onViewClaim(visit)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900"
                      >
                        View Dossier
                      </button>

                      <button
                        onClick={() => onConductInspection(visit)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Start Inspection</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : completedVisits.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No completed visits recorded yet</p>
            <p className="text-slate-400 mt-0.5">Completed field visits will be archived here with verification reports.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedVisits.map((visit) => (
              <div
                key={visit.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs text-emerald-800">
                      {visit.claim_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      visit.status === 'REQUIRES_CORRECTION'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {visit.status === 'REQUIRES_CORRECTION' ? 'Correction Required' : 'Inspection Verified'}
                    </span>
                  </div>

                  <div className="text-xs">
                    <div className="font-bold text-slate-900">{visit.applicant_name}</div>
                    <div className="text-[11px] text-slate-500">{visit.village || visit.taluk || ''}, {visit.district}</div>
                  </div>

                  <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Damage Category:</span>
                      <span className="font-bold text-slate-800">{visit.damage_category}</span>
                    </div>
                    {visit.verified_loss && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Verified Loss:</span>
                        <span className="font-mono font-bold text-emerald-700">₹{parseFloat(visit.verified_loss).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {visit.officer_photos_count > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Field Photos:</span>
                        <span className="font-bold text-slate-700">{visit.officer_photos_count} photo(s)</span>
                      </div>
                    )}
                  </div>

                  {visit.damage_observed && (
                    <p className="mt-2 text-[11px] text-slate-600 line-clamp-2 italic">
                      "{visit.damage_observed}"
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {visit.inspection_completed_at
                      ? `Completed: ${new Date(visit.inspection_completed_at).toLocaleDateString('en-IN')}`
                      : 'Completed'}
                  </span>
                  <button
                    onClick={() => onViewClaim(visit)}
                    className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    View Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
