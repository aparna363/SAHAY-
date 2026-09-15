import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera,
  Video,
  Upload,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Trash2,
  Save,
  Send,
  Users,
  Building,
  X,
  RotateCw
} from 'lucide-react';
import {
  submitMissionEvidence,
  fetchMissionEvidence,
  type RescueEvidenceItem,
  type MissionEvidenceResponse
} from '../../services/api';

interface DamageEvidenceSectionProps {
  incidentId: string | number;
  incidentCode?: string;
  incidentLocation?: string;
  missionCode?: string;
  onMissionCompleted?: () => void;
  onClose?: () => void;
}

interface LocalFilePreview {
  id: string;
  file: File;
  previewUrl: string;
  type: 'PHOTO' | 'VIDEO';
  description: string;
}

export const DamageEvidenceSection: React.FC<DamageEvidenceSectionProps> = ({
  incidentId,
  incidentCode = 'INC-104',
  incidentLocation = 'Field Sector',
  missionCode = 'MISSION-204',
  onMissionCompleted,
  onClose
}) => {
  // Automatic GPS & Timestamp
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [capturedTimestamp, setCapturedTimestamp] = useState<string>(new Date().toISOString());

  // Rescue Statistics Form
  const [peopleRescued, setPeopleRescued] = useState<number>(0);
  const [peopleInjured, setPeopleInjured] = useState<number>(0);
  const [peopleMissing, setPeopleMissing] = useState<number>(0);
  const [peopleEvacuated, setPeopleEvacuated] = useState<number>(0);
  const [medicalAssistanceNeeded, setMedicalAssistanceNeeded] = useState<boolean>(false);

  // Damage Information Form
  const [floodDepth, setFloodDepth] = useState<string>('');
  const [roadCondition, setRoadCondition] = useState<string>('Normal');
  const [buildingDamage, setBuildingDamage] = useState<string>('None');
  const [infrastructureDamage, setInfrastructureDamage] = useState<string>('None');
  const [otherObservations, setOtherObservations] = useState<string>('');

  // Evidence Files State
  const [selectedFiles, setSelectedFiles] = useState<LocalFilePreview[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  // Previously Submitted Evidence History (DB Loaded)
  const [evidenceHistory, setEvidenceHistory] = useState<RescueEvidenceItem[]>([]);
  const [summaryStats, setSummaryStats] = useState<{
    totalRescued: number;
    totalInjured: number;
    totalMissing: number;
    totalEvacuated: number;
    photoCount: number;
    videoCount: number;
  }>({
    totalRescued: 0,
    totalInjured: 0,
    totalMissing: 0,
    totalEvacuated: 0,
    photoCount: 0,
    videoCount: 0
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // File Inputs Refs
  const photoCaptureInputRef = useRef<HTMLInputElement>(null);
  const photoUploadInputRef = useRef<HTMLInputElement>(null);
  const videoCaptureInputRef = useRef<HTMLInputElement>(null);
  const videoUploadInputRef = useRef<HTMLInputElement>(null);

  // 1. Capture Live GPS & Timestamp Automatically
  const acquireGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS unavailable. Evidence can be saved, but location could not be automatically captured.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsError(null);
        setCapturedTimestamp(new Date().toISOString());
      },
      () => {
        setGpsError('GPS unavailable. Evidence can be saved, but location could not be automatically captured.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    acquireGps();
  }, [acquireGps]);

  // 2. Fetch Previously Submitted Evidence for this Mission
  const loadEvidenceHistory = useCallback(async () => {
    if (!incidentId) return;
    try {
      setIsLoadingHistory(true);
      const res: MissionEvidenceResponse = await fetchMissionEvidence(incidentId);
      setEvidenceHistory(res.evidence || []);
      if (res.summary) {
        setSummaryStats(res.summary);
        // Pre-fill rescue statistics with latest reported counts
        if (res.summary.totalRescued > 0) setPeopleRescued(res.summary.totalRescued);
        if (res.summary.totalInjured > 0) setPeopleInjured(res.summary.totalInjured);
        if (res.summary.totalMissing > 0) setPeopleMissing(res.summary.totalMissing);
        if (res.summary.totalEvacuated > 0) setPeopleEvacuated(res.summary.totalEvacuated);
      }
    } catch (err: any) {
      console.warn('Could not load mission evidence history:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [incidentId]);

  useEffect(() => {
    loadEvidenceHistory();
  }, [loadEvidenceHistory]);

  // 3. Handle File Selection (Photo or Video)
  const handleFilesAdded = (files: FileList | null, isVideo: boolean = false) => {
    if (!files || files.length === 0) return;

    const newPreviews: LocalFilePreview[] = [];
    const maxFiles = 5;

    if (selectedFiles.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} evidence files can be uploaded per batch.`);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // File type validation
      const isAllowedImg = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type);
      const isAllowedVid = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'].includes(file.type);

      if (!isAllowedImg && !isAllowedVid) {
        alert(`File "${file.name}" is not a valid format. Only JPG, PNG, WEBP and MP4/WEBM videos are allowed.`);
        continue;
      }

      // Size limit (35 MB)
      if (file.size > 35 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 35 MB maximum file size.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newPreviews.push({
        id: `local-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        type: isVideo || isAllowedVid ? 'VIDEO' : 'PHOTO',
        description: ''
      });
    }

    setSelectedFiles((prev) => [...prev, ...newPreviews]);
  };

  // Remove local preview
  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      const removed = prev.find((p) => p.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return filtered;
    });
  };

  // Update description of local file
  const handleUpdateDescription = (id: string, desc: string) => {
    setSelectedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description: desc } : item))
    );
  };

  // 4. Save Draft to LocalStorage
  const handleSaveDraft = () => {
    try {
      const draftData = {
        peopleRescued,
        peopleInjured,
        peopleMissing,
        peopleEvacuated,
        medicalAssistanceNeeded,
        floodDepth,
        roadCondition,
        buildingDamage,
        infrastructureDamage,
        otherObservations,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(`sahay_evidence_draft_${incidentId}`, JSON.stringify(draftData));
      alert('Draft saved locally. You can resume filling the report anytime.');
    } catch {
      alert('Failed to save draft to browser storage.');
    }
  };

  // Load draft if present
  useEffect(() => {
    const raw = localStorage.getItem(`sahay_evidence_draft_${incidentId}`);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.peopleRescued !== undefined) setPeopleRescued(d.peopleRescued);
        if (d.peopleInjured !== undefined) setPeopleInjured(d.peopleInjured);
        if (d.peopleMissing !== undefined) setPeopleMissing(d.peopleMissing);
        if (d.peopleEvacuated !== undefined) setPeopleEvacuated(d.peopleEvacuated);
        if (d.medicalAssistanceNeeded !== undefined) setMedicalAssistanceNeeded(d.medicalAssistanceNeeded);
        if (d.floodDepth) setFloodDepth(d.floodDepth);
        if (d.roadCondition) setRoadCondition(d.roadCondition);
        if (d.buildingDamage) setBuildingDamage(d.buildingDamage);
        if (d.infrastructureDamage) setInfrastructureDamage(d.infrastructureDamage);
        if (d.otherObservations) setOtherObservations(d.otherObservations);
      } catch {
        // Ignore
      }
    }
  }, [incidentId]);

  // 5. Submit Evidence & Report to Backend
  const handleSubmitReport = async () => {
    try {
      setIsSubmitting(true);
      setSubmitErrorMsg(null);
      setSubmitSuccessMsg(null);

      const formData = new FormData();
      formData.append('peopleRescued', String(peopleRescued));
      formData.append('peopleInjured', String(peopleInjured));
      formData.append('peopleMissing', String(peopleMissing));
      formData.append('peopleEvacuated', String(peopleEvacuated));
      formData.append('medicalAssistanceNeeded', String(medicalAssistanceNeeded));
      formData.append('floodDepth', floodDepth);
      formData.append('roadCondition', roadCondition);
      formData.append('buildingDamage', buildingDamage);
      formData.append('infrastructureDamage', infrastructureDamage);
      formData.append('otherObservations', otherObservations);
      formData.append('capturedAt', capturedTimestamp);

      if (currentGps) {
        formData.append('latitude', String(currentGps.lat));
        formData.append('longitude', String(currentGps.lng));
      }

      // Attach description of primary observation
      const fullDesc = selectedFiles.map((f) => f.description).filter(Boolean).join('; ') || otherObservations;
      formData.append('description', fullDesc);

      // Append files
      selectedFiles.forEach((p) => {
        formData.append('files', p.file);
      });

      await submitMissionEvidence(incidentId, formData);

      setSubmitSuccessMsg(`Report & Evidence submitted successfully! Collector has been notified.`);
      setSelectedFiles([]);
      localStorage.removeItem(`sahay_evidence_draft_${incidentId}`);

      // Refresh history
      loadEvidenceHistory();
    } catch (err: any) {
      console.error('Evidence submit failed:', err);
      setSubmitErrorMsg(err.message || 'Failed to submit evidence. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl space-y-6 animate-fadeIn">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-400 tracking-wider">
            <Camera className="w-4 h-4" />
            <span>DAMAGE & RESCUE EVIDENCE COLLECTION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Incident: {incidentCode} &bull; <span className="text-emerald-400">{missionCode}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium pt-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>{incidentLocation}</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{new Date(capturedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all self-end sm:self-auto"
            title="Close Evidence Section"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Automatic GPS & Timestamp Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentGps ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>Automatically Captured Coordinates:</span>
              <strong className="font-mono text-slate-900">
                {currentGps ? `${currentGps.lat.toFixed(6)}, ${currentGps.lng.toFixed(6)}` : 'Detecting GPS...'}
              </strong>
            </div>
            {gpsError && <p className="text-[11px] text-amber-800 font-medium">{gpsError}</p>}
          </div>

          <button
            onClick={acquireGps}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh GPS</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. RESCUE INFORMATION FORM */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>RESCUE INFORMATION</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500">People Rescued</label>
              <input
                type="number"
                min="0"
                value={peopleRescued}
                onChange={(e) => setPeopleRescued(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-2xl font-black text-emerald-600 font-mono bg-transparent focus:outline-none"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500">People Injured</label>
              <input
                type="number"
                min="0"
                value={peopleInjured}
                onChange={(e) => setPeopleInjured(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-2xl font-black text-amber-600 font-mono bg-transparent focus:outline-none"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500">People Missing</label>
              <input
                type="number"
                min="0"
                value={peopleMissing}
                onChange={(e) => setPeopleMissing(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-2xl font-black text-red-600 font-mono bg-transparent focus:outline-none"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <label className="text-[11px] font-black uppercase text-slate-500">People Evacuated</label>
              <input
                type="number"
                min="0"
                value={peopleEvacuated}
                onChange={(e) => setPeopleEvacuated(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full text-2xl font-black text-blue-600 font-mono bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="text-xs font-bold text-slate-700">Medical Assistance Required:</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMedicalAssistanceNeeded(true)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${medicalAssistanceNeeded ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setMedicalAssistanceNeeded(false)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${!medicalAssistanceNeeded ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'}`}
              >
                No
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. DAMAGE INFORMATION FORM */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>DAMAGE INFORMATION</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
            <div className="space-y-1">
              <label className="text-slate-500">Flood Depth (meters / cm)</label>
              <input
                type="text"
                placeholder="e.g. 1.2m or Waist-level"
                value={floodDepth}
                onChange={(e) => setFloodDepth(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500">Road Condition</label>
              <select
                value={roadCondition}
                onChange={(e) => setRoadCondition(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-bold"
              >
                <option value="Normal">Normal</option>
                <option value="Damaged">Damaged</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500">Building Damage</label>
              <select
                value={buildingDamage}
                onChange={(e) => setBuildingDamage(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-bold"
              >
                <option value="None">None</option>
                <option value="Minor">Minor</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500">Infrastructure Damage</label>
              <select
                value={infrastructureDamage}
                onChange={(e) => setInfrastructureDamage(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-bold"
              >
                <option value="None">None</option>
                <option value="Minor">Minor</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 text-xs font-bold pt-2">
            <label className="text-slate-500">Other Observations & Field Intelligence</label>
            <textarea
              rows={3}
              placeholder="Describe ongoing water current, elderly stranded individuals, structural instability, or electricity line status..."
              value={otherObservations}
              onChange={(e) => setOtherObservations(e.target.value)}
              className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-normal leading-relaxed"
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. EVIDENCE CAPTURE & UPLOAD (Photos & Video) */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>EVIDENCE FILES (PHOTOS &amp; VIDEOS)</span>
            </h3>
          </div>

          {/* Hidden inputs for camera capture & file picking */}
          <input
            ref={photoCaptureInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFilesAdded(e.target.files, false)}
          />
          <input
            ref={photoUploadInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesAdded(e.target.files, false)}
          />
          <input
            ref={videoCaptureInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFilesAdded(e.target.files, true)}
          />
          <input
            ref={videoUploadInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFilesAdded(e.target.files, true)}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => photoCaptureInputRef.current?.click()}
              className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 shadow-xs"
            >
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>TAKE PHOTO</span>
            </button>

            <button
              type="button"
              onClick={() => photoUploadInputRef.current?.click()}
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-800 text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 shadow-xs"
            >
              <Upload className="w-5 h-5 text-slate-600" />
              <span>UPLOAD PHOTO</span>
            </button>

            <button
              type="button"
              onClick={() => videoCaptureInputRef.current?.click()}
              className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-2xl text-blue-800 text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 shadow-xs"
            >
              <Video className="w-5 h-5 text-blue-600" />
              <span>RECORD VIDEO</span>
            </button>

            <button
              type="button"
              onClick={() => videoUploadInputRef.current?.click()}
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-800 text-xs font-black transition-all flex flex-col items-center justify-center gap-1.5 shadow-xs"
            >
              <Upload className="w-5 h-5 text-slate-600" />
              <span>UPLOAD VIDEO</span>
            </button>
          </div>

          {/* Previews Grid */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-700">Selected Evidence Items ({selectedFiles.length}/5):</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {selectedFiles.map((item) => (
                  <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 z-10 shadow-md"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-32 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                      {item.type === 'VIDEO' ? (
                        <video src={item.previewUrl} controls className="max-h-full max-w-full" />
                      ) : (
                        <img src={item.previewUrl} alt="Preview" className="h-full w-full object-cover" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-mono text-slate-500 truncate">{item.file.name}</div>
                      <input
                        type="text"
                        placeholder="Add caption or observation..."
                        value={item.description}
                        onChange={(e) => handleUpdateDescription(item.id, e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Alerts */}
        {submitSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{submitSuccessMsg}</span>
          </div>
        )}

        {submitErrorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{submitErrorMsg}</span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 5. ACTION BUTTONS: SAVE DRAFT / SUBMIT REPORT */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-black text-xs transition-all flex items-center gap-2 border border-slate-200"
          >
            <Save className="w-4 h-4" />
            <span>SAVE DRAFT</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitReport}
            disabled={isSubmitting}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'SUBMITTING EVIDENCE...' : 'SUBMIT REPORT'}</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 6. SUBMITTED EVIDENCE HISTORY & MISSION STATS */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Submitted Mission Evidence Log ({evidenceHistory.length})
                </h3>
                {isLoadingHistory && (
                  <RotateCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                )}
              </div>
              <p className="text-xs text-slate-500">
                Audit trail submitted by this rescue team for Incident {incidentCode}. Visible to District Collector live.
              </p>
              {evidenceHistory.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-bold text-slate-700">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">Rescued: {summaryStats.totalRescued}</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">Injured: {summaryStats.totalInjured}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">Photos: {summaryStats.photoCount} • Videos: {summaryStats.videoCount}</span>
                </div>
              )}
            </div>

            {/* Complete Mission button */}
            {onMissionCompleted && (
              <button
                type="button"
                onClick={onMissionCompleted}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>COMPLETE MISSION</span>
              </button>
            )}
          </div>

          {evidenceHistory.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 font-medium">
              No evidence submitted yet for this mission. Take or upload photos to record field evidence.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {evidenceHistory.map((ev) => (
                <div key={ev.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-slate-900">Evidence #EV-{ev.id}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Submitted
                    </span>
                  </div>

                  {ev.file_url ? (
                    <div className="h-32 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                      {ev.evidence_type === 'VIDEO' ? (
                        <video src={`http://localhost:5000${ev.file_url}`} controls className="max-h-full max-w-full" />
                      ) : (
                        <img src={`http://localhost:5000${ev.file_url}`} alt="Evidence" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ) : (
                    <div className="h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-medium text-xs">
                      Structured Damage Report (No Media)
                    </div>
                  )}

                  <div className="space-y-1 text-slate-600 font-medium">
                    <p className="line-clamp-2 font-normal text-slate-800">{ev.description || 'Field rescue observation'}</p>
                    <div className="text-[11px] flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200">
                      <span>Saved: <strong className="text-emerald-700">{ev.people_rescued}</strong> &bull; Injured: <strong className="text-amber-700">{ev.people_injured}</strong></span>
                      <span className="font-mono text-[10px]">{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {ev.latitude && ev.longitude && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        GPS: {parseFloat(String(ev.latitude)).toFixed(4)}, {parseFloat(String(ev.longitude)).toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
