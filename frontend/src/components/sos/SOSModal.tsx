import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Radio,
  MapPin,
  Camera,
  CheckCircle2,
  X,
  Loader2,
  ShieldAlert,
  Flame,
  Waves,
  Mountain,
  HeartPulse,
  Car,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import {
  createSOS,
  reverseGeocodeLatLng,
  type SOSEmergencyType,
  type SOSRequest
} from '../../services/sosService';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  defaultDistrict?: string;
  onSuccess: (sos: SOSRequest) => void;
  onOpenTracker?: () => void;
}

type ModalStep = 'confirm' | 'locating' | 'details' | 'submitting' | 'success';

const EMERGENCY_TYPES: { type: SOSEmergencyType; icon: any; color: string; desc: string }[] = [
  { type: 'Flood', icon: Waves, color: 'border-sky-500 bg-sky-50 text-sky-700', desc: 'Water rise, marooned, submerged' },
  { type: 'Landslide', icon: Mountain, color: 'border-amber-600 bg-amber-50 text-amber-800', desc: 'Debris flow, mudslide, rockfall' },
  { type: 'Fire', icon: Flame, color: 'border-rose-600 bg-rose-50 text-rose-700', desc: 'Structural fire, wildfire, gas leak' },
  { type: 'Medical Emergency', icon: HeartPulse, color: 'border-red-600 bg-red-50 text-red-700', desc: 'Severe injury, cardiac, trauma' },
  { type: 'Accident', icon: Car, color: 'border-orange-500 bg-orange-50 text-orange-700', desc: 'Road crash, structural collapse' },
  { type: 'Other', icon: HelpCircle, color: 'border-slate-600 bg-slate-50 text-slate-700', desc: 'Other acute life threat' }
];

const KERALA_DISTRICTS = [
  'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
  'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
  'Thiruvananthapuram', 'Thrissur', 'Wayanad'
];

export const SOSModal: React.FC<SOSModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  defaultDistrict = 'Kottayam',
  onSuccess,
  onOpenTracker
}) => {
  const [step, setStep] = useState<ModalStep>('confirm');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Location State
  const [gpsDenied, setGpsDenied] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('');
  const [district, setDistrict] = useState<string>(defaultDistrict);
  const [taluk, setTaluk] = useState<string>('');
  const [capturedTime, setCapturedTime] = useState<string>('');

  // Emergency Form State
  const [emergencyType, setEmergencyType] = useState<SOSEmergencyType>('Flood');
  const [affectedPeople, setAffectedPeople] = useState<number>(1);
  const [description, setDescription] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Success State
  const [createdSOS, setCreatedSOS] = useState<SOSRequest | null>(null);

  // Reset modal on open
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setErrorMsg(null);
      setGpsDenied(false);
      setCapturedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (defaultDistrict) setDistrict(defaultDistrict);
    }
  }, [isOpen, defaultDistrict]);

  if (!isOpen) return null;

  // Step 1: Citizen Confirms SOS -> Trigger GPS capture
  const handleConfirmSOS = () => {
    setStep('locating');
    setErrorMsg(null);
    acquireGPSLocation();
  };

  // Step 2: Automatic GPS Location Capture
  const acquireGPSLocation = () => {
    setGpsDenied(false);

    if (!navigator.geolocation) {
      setGpsDenied(true);
      setErrorMsg('Geolocation is not supported by your browser. Please enter your location manually.');
      setStep('details');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setCapturedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        try {
          const geo = await reverseGeocodeLatLng(lat, lng);
          if (geo.address) setAddress(geo.address);
          if (geo.district) setDistrict(geo.district);
          if (geo.taluk) setTaluk(geo.taluk);
        } catch {
          setAddress(`GPS (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
        } finally {
          setStep('details');
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsDenied(true);
        // Fallback default coordinates if denied, but let user enter address
        setLatitude(9.5916);
        setLongitude(76.5222);
        setErrorMsg('Location access was denied or unavailable. Please verify and confirm your district and location below.');
        setStep('details');
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  // Step 3: Quick SOS Submission
  const handleSubmitSOS = async () => {
    if (latitude === null || longitude === null) {
      setErrorMsg('Please specify a valid emergency location.');
      return;
    }

    setStep('submitting');
    setErrorMsg(null);

    try {
      const res = await createSOS({
        emergencyType,
        description: description.trim() || undefined,
        affectedPeople,
        latitude,
        longitude,
        address: address.trim() || `${district}, Kerala`,
        district,
        taluk: taluk.trim() || undefined,
        photo: photoFile,
        reporterName: currentUser?.name,
        reporterPhone: currentUser?.phone
      });

      setCreatedSOS(res.sos);
      setStep('success');
      onSuccess(res.sos);
    } catch (err: any) {
      console.error('SOS Submit Error:', err);
      if (err.code === 'DUPLICATE_ACTIVE_SOS') {
        setErrorMsg('You already have an active SOS in progress (' + (err.existingSOS?.sos_code || '') + '). Responders are working on it.');
        if (err.existingSOS) {
          setCreatedSOS(err.existingSOS);
          setStep('success');
        } else {
          setStep('details');
        }
      } else {
        setErrorMsg(err.message || 'Failed to dispatch emergency SOS. Please dial 112 directly.');
        setStep('details');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
        {/* Top Emergency Indicator Bar */}
        <div className="h-2.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-700 animate-pulse" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 shadow-sm animate-pulse">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                EMERGENCY SOS
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white tracking-wider">
                  HIGH PRIORITY
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">SAHAY Rapid Distress Dispatch System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {/* ================= STEP 1: CONFIRMATION DIALOG ================= */}
          {step === 'confirm' && (
            <div className="space-y-6 text-center py-2">
              <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-200 flex items-center justify-center mx-auto text-red-600 animate-bounce">
                <ShieldAlert className="w-10 h-10" />
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900">
                  Are you sure you want to send an emergency SOS?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed px-4">
                  Your current location will be shared with the emergency response team, Kerala Police ERSS (112), and District Disaster Control Room.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Emergency Use Only:</strong> Please only activate this during genuine acute distress, floods, landslides, accidents, or life-threatening hazards.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSOS}
                  className="px-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-extrabold text-sm shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  Confirm SOS
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: GPS LOCATING ================= */}
          {step === 'locating' && (
            <div className="space-y-6 text-center py-8">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30"></div>
                <div className="relative w-20 h-20 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center text-red-600">
                  <MapPin className="w-8 h-8 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Obtaining High-Accuracy Device GPS...
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Pinpointing your exact geographical coordinates and nearest emergency rescue stations.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-red-600 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to satellite GPS</span>
              </div>
            </div>
          )}

          {/* ================= STEP 3: EMERGENCY INFORMATION ================= */}
          {step === 'details' && (
            <div className="space-y-5">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Location Summary & Confirmation */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                    Captured GPS Location
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {capturedTime || 'Just now'}
                  </span>
                </div>

                <div className="text-xs text-slate-800 font-medium">
                  {address || `${district}, Kerala`}
                </div>

                {latitude && longitude && (
                  <div className="text-[11px] font-mono text-slate-500">
                    GPS: {latitude.toFixed(5)}° N, {longitude.toFixed(5)}° E
                  </div>
                )}

                {/* If GPS Denied or manual edit required */}
                {gpsDenied && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 mt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-medium"
                      >
                        {KERALA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Taluk / Area</label>
                      <input
                        type="text"
                        placeholder="e.g. Kanjirappally"
                        value={taluk}
                        onChange={(e) => setTaluk(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 1. Emergency Type Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Emergency Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EMERGENCY_TYPES.map((et) => {
                    const Icon = et.icon;
                    const isSelected = emergencyType === et.type;
                    return (
                      <button
                        key={et.type}
                        type="button"
                        onClick={() => setEmergencyType(et.type)}
                        className={`p-2.5 rounded-2xl border-2 text-left transition-all flex flex-col gap-1.5 ${
                          isSelected
                            ? 'border-red-600 bg-red-50/80 shadow-sm ring-2 ring-red-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-red-600' : 'text-slate-600'}`} />
                          {isSelected && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-red-900' : 'text-slate-800'}`}>
                          {et.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Number of Affected People */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Number of People Requiring Help</span>
                  <span className="text-xs font-bold text-red-600">{affectedPeople} {affectedPeople === 1 ? 'person' : 'people'}</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAffectedPeople(num)}
                      className={`flex-1 py-2 text-xs font-black rounded-xl border transition-all ${
                        affectedPeople === num
                          ? 'bg-red-600 border-red-600 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num === 10 ? '10+' : num}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Optional Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Situation Details <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Water level rising fast, elder person with mobility impairment trapped upstairs..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none placeholder:text-slate-400 resize-none font-medium"
                />
              </div>

              {/* 4. Optional Photo Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Photo / Evidence <span className="text-slate-400 font-normal">(Optional)</span></span>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="text-[11px] text-red-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </label>

                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-24 bg-slate-900">
                    <img src={photoPreview} alt="Evidence Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-600">Take Photo or Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSOS}
                  className="col-span-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  DISPATCH EMERGENCY SOS NOW
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: SUBMITTING ================= */}
          {step === 'submitting' && (
            <div className="space-y-6 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center mx-auto text-red-600 animate-spin">
                <Loader2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">Broadcasting Distress Call...</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Alerting nearest Fire & Rescue, Police, NDRF battalions, and District Emergency Operations Center.
                </p>
              </div>
            </div>
          )}

          {/* ================= STEP 5: SUCCESS CONFIRMATION SCREEN ================= */}
          {step === 'success' && createdSOS && (
            <div className="space-y-6 text-center py-2">
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ✅ SOS REQUEST SENT
                </h3>
                <div className="inline-block px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-mono font-bold">
                  SOS ID: {createdSOS.sos_code}
                </div>
                <p className="text-xs text-emerald-700 font-bold pt-1">
                  Emergency Team has been notified.
                </p>
              </div>

              {/* Status Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <span className="font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {createdSOS.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Location:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[240px]">
                    {createdSOS.address || `${createdSOS.district}, Kerala`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Emergency:</span>
                  <span className="font-bold text-red-600">
                    {createdSOS.emergency_type} ({createdSOS.affected_people} affected)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenTracker) onOpenTracker();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Track SOS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
