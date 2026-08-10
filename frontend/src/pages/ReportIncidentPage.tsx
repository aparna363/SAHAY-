import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  Shield,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Camera
} from 'lucide-react';
import {
  fetchIncidentTypes,
  submitIncidentReport
} from '../services/api';
import type {
  IncidentType,
  IncidentSeverity
} from '../services/api';
import { IncidentMapPicker } from '../components/IncidentMapPicker';

interface ReportIncidentPageProps {
  onBackToDashboard: () => void;
  onViewIncidentDetails: (id: string) => void;
}

export const ReportIncidentPage: React.FC<ReportIncidentPageProps> = ({
  onBackToDashboard,
  onViewIncidentDetails
}) => {
  // Form State
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [severity, setSeverity] = useState<IncidentSeverity>('HIGH');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  // Validation & Modal State
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verified Backend Response State
  const [successData, setSuccessData] = useState<{
    incidentId: string;
    status: string;
    createdAt: string;
  } | null>(null);

  // Load Incident Types on mount
  useEffect(() => {
    fetchIncidentTypes().then(types => {
      setIncidentTypes(types);
      if (types.length > 0) setSelectedTypeId(types[0].id);
      setLoadingTypes(false);
    });
  }, []);

  // Handle Location Select callback from IncidentMapPicker
  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setLatitude(lat);
    setLongitude(lng);
    if (address) setLocationAddress(address);
    setFormErrors(prev => prev.filter(err => !err.includes('location')));
  };

  // Handle File Input Selection with Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    const validAllowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5 MB

    const validFiles: File[] = [];
    const fileErrors: string[] = [];

    for (const file of newFiles) {
      if (!validAllowedTypes.includes(file.type)) {
        fileErrors.push(`"${file.name}" is an unsupported file type. Only JPG, PNG, and WEBP images are allowed.`);
        continue;
      }
      if (file.size > maxFileSize) {
        fileErrors.push(`"${file.name}" exceeds the maximum limit of 5 MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (fileErrors.length > 0) {
      alert(fileErrors.join('\n'));
    }

    const updatedFiles = [...selectedFiles, ...validFiles].slice(0, 3);
    setSelectedFiles(updatedFiles);

    // Generate previews
    const newPreviews = updatedFiles.map(file => URL.createObjectURL(file));
    setFilePreviews(newPreviews);
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);

    const updatedPreviews = filePreviews.filter((_, i) => i !== index);
    setFilePreviews(updatedPreviews);
  };

  // Step 1 Form Validation before showing Preview
  const handleOpenPreview = () => {
    const errors: string[] = [];

    if (!selectedTypeId) {
      errors.push('Please select an incident type.');
    }

    if (!description || description.trim().length < 10) {
      errors.push('Please provide a detailed description (minimum 10 characters).');
    } else if (description.trim().length > 2000) {
      errors.push('Description cannot exceed 2000 characters.');
    }

    if (latitude === null || longitude === null) {
      errors.push('Please specify the incident location using your browser GPS, clicking on the map, or choosing a test location.');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFormErrors([]);
    setIsPreviewOpen(true);
  };

  // Step 2 Final Submission to Backend API
  const handleFinalSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('incident_type_id', String(selectedTypeId));
    formData.append('severity', severity);
    formData.append('description', description.trim());
    formData.append('latitude', String(latitude));
    formData.append('longitude', String(longitude));
    if (locationAddress) formData.append('location_address', locationAddress);

    selectedFiles.forEach((file) => {
      formData.append('media', file);
    });

    const result = await submitIncidentReport(formData);

    setIsSubmitting(false);

    if (result.success && result.data) {
      setIsPreviewOpen(false);
      setSuccessData({
        incidentId: result.data.incidentId,
        status: result.data.status,
        createdAt: result.data.createdAt
      });
    } else {
      alert(`Submission Error: ${result.error || 'Failed to submit incident. Please try again.'}`);
    }
  };

  const selectedTypeObj = incidentTypes.find(t => t.id === selectedTypeId);

  // Success Screen (Requirement Section 20 & 43)
  if (successData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn">
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-emerald-100 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-800 text-emerald-200">
              SUBMISSION VERIFIED & SAVED
            </span>
            <h1 className="text-3xl font-black text-slate-900 mt-2">✅ Incident Submitted</h1>
            <p className="text-slate-600 text-sm max-w-md mx-auto mt-1">
              Your report has been securely logged into the SAHAY PostgreSQL database and PostGIS spatial registry. An authorized official will review your report shortly.
            </p>
          </div>

          {/* Incident Info Box */}
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-3 max-w-md mx-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Incident ID</span>
              <span className="text-base font-black text-emerald-900 font-mono">{successData.incidentId}</span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {successData.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Reported At</span>
              <span className="text-xs font-mono text-slate-700">
                {new Date(successData.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => onViewIncidentDetails(successData.incidentId)}
              className="w-full sm:w-auto bg-[#043e2e] hover:bg-[#065f46] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all"
            >
              View Incident Details & Timeline
            </button>
            <button
              onClick={onBackToDashboard}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3 rounded-xl font-bold text-sm border border-slate-300 transition-all"
            >
              Back to Citizen Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-bold mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <span>🚨 Report Emergency Incident</span>
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl">
            Submit critical disaster alerts directly to KSDMA officials and nearby emergency response units.
          </p>
        </div>
      </div>

      {/* Validation Errors Box */}
      {formErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl space-y-1">
          <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span>Please complete all required fields:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-red-800 space-y-0.5 pl-2 font-medium">
            {formErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Form Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        
        {/* Section 1: Incident Type (Requirement Section 4) */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center font-mono">1</span>
            Select Incident Type <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500">Loaded directly from SAHAY Incident Registry API.</p>

          {loadingTypes ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Fetching active incident types...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {incidentTypes.map((type) => {
                const isSelected = selectedTypeId === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedTypeId(type.id)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all shadow-sm ${
                      isSelected
                        ? 'bg-emerald-900 border-emerald-950 text-white ring-2 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-emerald-50/60 hover:border-emerald-300'
                    }`}
                  >
                    <span className="text-xs font-black">{type.name}</span>
                    <span className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                      {type.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Section 2: Severity Selection (Requirement Section 5) */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center font-mono">2</span>
            Select Incident Severity <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { level: 'LOW' as IncidentSeverity, label: 'LOW', desc: 'Minor localized hazard', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
              { level: 'MODERATE' as IncidentSeverity, label: 'MODERATE', desc: 'Requires caution & monitoring', badge: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
              { level: 'HIGH' as IncidentSeverity, label: 'HIGH', desc: 'Active danger to property/people', badge: 'bg-orange-100 text-orange-900 border-orange-300' },
              { level: 'CRITICAL' as IncidentSeverity, label: 'CRITICAL', desc: 'Life threat / immediate rescue needed', badge: 'bg-red-100 text-red-900 border-red-300' }
            ].map((sev) => {
              const isSelected = severity === sev.level;
              return (
                <button
                  key={sev.level}
                  type="button"
                  onClick={() => setSeverity(sev.level)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? `${sev.badge} ring-2 ring-slate-900 font-extrabold shadow-md scale-102`
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">{sev.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
                  </div>
                  <p className="text-[10px] opacity-80 mt-1">{sev.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Section 3: Description Textarea (Requirement Section 6) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center font-mono">3</span>
              Incident Description <span className="text-red-500">*</span>
            </label>
            <span className={`text-xs font-mono font-bold ${description.length < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
              {description.length} / 2000 characters
            </span>
          </div>

          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened... Example: Heavy waterlogging has occurred near the main road and water has entered nearby houses."
            className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-normal"
          />
          <p className="text-[11px] text-slate-400">Minimum 10 characters required. Sanitized automatically before storage.</p>
        </div>

        <hr className="border-slate-100" />

        {/* Section 4: Location System (Requirement Sections 7, 8, 9) */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center font-mono">4</span>
            Incident Location & PostGIS Coordinates <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500">
            Choose your current browser location, click anywhere on the Leaflet map, or select a test hotspot below.
          </p>

          <IncidentMapPicker
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={handleLocationSelect}
          />
        </div>

        <hr className="border-slate-100" />

        {/* Section 5: Optional Evidence Upload (Requirement Section 10) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center font-mono">5</span>
              Upload Photo Evidence (Optional)
            </label>
            <span className="text-xs font-bold text-slate-400">Up to 3 images (Max 5 MB each)</span>
          </div>

          {/* Upload Area */}
          {selectedFiles.length < 3 && (
            <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-emerald-50/50 transition-all">
              <Camera className="w-8 h-8 text-emerald-700" />
              <span className="text-xs sm:text-sm font-bold text-slate-700">Click or drag photos here to upload</span>
              <span className="text-[11px] text-slate-400">Supports JPG, JPEG, PNG, WEBP. Executable files are strictly rejected.</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {/* Preview Image Thumbnails */}
          {filePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              {filePreviews.map((src, idx) => (
                <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100 h-28">
                  <img src={src} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full shadow-lg hover:bg-red-700 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded font-mono">
                    {(selectedFiles[idx].size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit & Preview Button Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOpenPreview}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-xs sm:text-sm text-white bg-[#043e2e] hover:bg-[#065f46] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4 text-emerald-300" />
            <span>Preview & Submit Incident</span>
          </button>
        </div>
      </div>

      {/* Incident Preview Modal (Requirement Section 11) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-700" />
                <h3 className="text-lg font-black text-slate-900">Incident Preview</h3>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 uppercase">Incident Type</span>
                <span className="font-black text-slate-900">{selectedTypeObj?.name || 'General'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 uppercase">Severity</span>
                <span className="font-black px-2.5 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300">
                  {severity}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase block mb-1">Description</span>
                <p className="bg-white p-3 rounded-xl border text-slate-800 whitespace-pre-wrap">{description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Latitude</span>
                  <span className="font-mono text-slate-900 font-bold">{latitude?.toFixed(6)}°</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Longitude</span>
                  <span className="font-mono text-slate-900 font-bold">{longitude?.toFixed(6)}°</span>
                </div>
              </div>
              {locationAddress && (
                <div>
                  <span className="font-bold text-slate-500 uppercase block">Selected Address</span>
                  <span className="text-slate-700 font-medium">{locationAddress}</span>
                </div>
              )}
              <div>
                <span className="font-bold text-slate-500 uppercase block">Uploaded Evidence</span>
                <span className="text-slate-800 font-bold">{selectedFiles.length} images attached</span>
              </div>
            </div>

            {/* Confirmation Alert Box (Requirement Section 12) */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-xs text-amber-900 font-medium">
              <p className="font-bold">⚠️ Please confirm that the information provided is accurate.</p>
              <p className="mt-0.5">False reporting of disaster emergencies is punishable under Section 54 of the Disaster Management Act, 2005.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-6 py-3 rounded-xl font-black text-xs sm:text-sm text-white bg-emerald-800 hover:bg-emerald-900 shadow-xl flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting to Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
