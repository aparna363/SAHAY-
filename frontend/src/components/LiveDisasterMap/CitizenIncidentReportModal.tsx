import React, { useState } from 'react';
import {
  AlertTriangle,
  MapPin,
  Camera,
  X,
  Send,
  CheckCircle2
} from 'lucide-react';
import { submitIncidentReport } from '../../services/api';

interface CitizenIncidentReportModalProps {
  gpsCoords?: { latitude: number; longitude: number } | null;
  userDistrict?: string;
  onSuccess: (newIncident: any) => void;
  onClose: () => void;
}

export const CitizenIncidentReportModal: React.FC<CitizenIncidentReportModalProps> = ({
  gpsCoords,
  userDistrict = 'Kottayam',
  onSuccess,
  onClose
}) => {
  const [incidentType, setIncidentType] = useState('Flood');
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('');
  const locationAddress = gpsCoords
    ? `GPS (${gpsCoords.latitude.toFixed(4)}°, ${gpsCoords.longitude.toFixed(4)}°)`
    : `${userDistrict} Sector`;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incidentTypes = [
    { value: 'Flood', label: '🚨 Flood / Waterlogging' },
    { value: 'Landslide', label: '🪨 Landslide / Mudflow' },
    { value: 'Road Hazard', label: '🚧 Blocked / Damaged Road' },
    { value: 'Fallen Tree', label: '🌳 Fallen Tree on Road' },
    { value: 'Fire', label: '🔥 Fire Hazard' },
    { value: 'Building Collapse', label: '🏚️ Building Damage' },
    { value: 'Electrical Hazard', label: '⚡ Fallen Power Line' },
    { value: 'Rescue Required', label: '🆘 Citizen Stranded / Rescue Needed' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a brief description of the incident.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const lat = gpsCoords ? gpsCoords.latitude : 11.5510;
      const lng = gpsCoords ? gpsCoords.longitude : 76.1260;

      const formData = new FormData();
      formData.append('type', incidentType);
      formData.append('severity', severity);
      formData.append('description', description);
      formData.append('latitude', String(lat));
      formData.append('longitude', String(lng));
      formData.append('location_address', locationAddress);
      if (selectedFile) {
        formData.append('media', selectedFile);
      }

      const res = await submitIncidentReport(formData);
      if (res && res.success) {
        setSubmitted(true);
        setTimeout(() => {
          onSuccess(res.data || res);
        }, 1200);
      } else {
        setError(res?.error || 'Failed to submit incident. Please retry.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error submitting incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-slideDown">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-amber-700 tracking-wider">
                COMMUNITY EARLY WARNING
              </span>
              <h2 className="text-lg font-black text-slate-900">REPORT LIVE INCIDENT</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-[#0E8F66] rounded-full mx-auto flex items-center justify-center shadow-xs animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-900">Incident Reported Successfully</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your report with live GPS coordinates has been broadcast to District Emergency Operations and nearby rescue units.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            {/* GPS Tagged Indicator */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <MapPin className="w-4 h-4 text-[#0E8F66]" />
                <span>GPS Location Attached Automatically</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-700 font-extrabold">
                {gpsCoords ? `${gpsCoords.latitude.toFixed(4)}°, ${gpsCoords.longitude.toFixed(4)}°` : 'Default Sector'}
              </span>
            </div>

            {/* Incident Type Selector */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Incident Type</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0E8F66] outline-none"
              >
                {incidentTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Level */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Severity Assessment</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { level: 'LOW', label: 'Low', color: 'peer-checked:bg-emerald-600' },
                  { level: 'MODERATE', label: 'Moderate', color: 'peer-checked:bg-amber-500' },
                  { level: 'HIGH', label: 'High', color: 'peer-checked:bg-orange-600' },
                  { level: 'CRITICAL', label: 'Critical', color: 'peer-checked:bg-red-600' }
                ].map((s) => (
                  <label key={s.level} className="cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      value={s.level}
                      checked={severity === s.level}
                      onChange={() => setSeverity(s.level)}
                      className="sr-only peer"
                    />
                    <div className="p-2 text-center rounded-xl border border-slate-200 font-bold text-slate-600 peer-checked:text-white transition-all peer-checked:border-transparent peer-checked:shadow-xs hover:bg-slate-50">
                      {s.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Description of Hazard / Situation</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe current road blockage, water height, fallen debris, or urgent assistance required..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#0E8F66] outline-none resize-none"
              />
            </div>

            {/* Photo Upload Optional */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Attach Evidence Photo (Optional)</label>
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-[#0E8F66] cursor-pointer bg-slate-50 transition-colors">
                <Camera className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 font-medium">
                  {selectedFile ? selectedFile.name : 'Select or capture photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Transmit Report'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
