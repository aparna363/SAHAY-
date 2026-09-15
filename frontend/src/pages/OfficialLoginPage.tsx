import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Building2,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  Loader2
} from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import {
  loginUser,
  registerUser,
  getDistricts,
  verifyStationUnit,
  checkAuthAvailability,
  type VerifiedStationUnit
} from '../services/api';

interface OfficialLoginPageProps {
  currentLang: Language;
  onLoginSuccess: (user: any) => void;
  onNavigateToCitizen: () => void;
}

const AGENCY_TYPES = [
  'Fire & Safety',
  'Police',
  'NDRF',
  'KSDMA'
];

export const OfficialLoginPage: React.FC<OfficialLoginPageProps> = ({
  onLoginSuccess,
  onNavigateToCitizen,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');

  // Official Sign-In Form State
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginTouched, setLoginTouched] = useState<Record<string, boolean>>({});
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Station Registration Form State
  const [agencyType, setAgencyType] = useState(AGENCY_TYPES[0]);
  const [district, setDistrict] = useState('Pathanamthitta');
  const [officialUnitId, setOfficialUnitId] = useState('');
  const [stationName, setStationName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Registration Validation & Live Check States
  const [regTouched, setRegTouched] = useState<Record<string, boolean>>({});
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [contactAvailable, setContactAvailable] = useState<boolean | null>(null);

  const emailTimerRef = useRef<any>(null);

  // Unit ID Verification State
  const [isVerifyingUnit, setIsVerifyingUnit] = useState(false);
  const [_verifiedUnit, setVerifiedUnit] = useState<VerifiedStationUnit | null>(null);
  const [unitVerificationMsg, setUnitVerificationMsg] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [keralaDistricts, setKeralaDistricts] = useState<string[]>([]);

  useEffect(() => {
    getDistricts().then((data) => {
      if (data && data.length > 0) {
        setKeralaDistricts(data);
        if (!district) {
          setDistrict(data[0]);
        }
      }
    });

    return () => {
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    };
  }, []);

  // Unit ID Verification Handler
  const handleVerifyUnitId = async () => {
    if (!officialUnitId.trim()) {
      setUnitVerificationMsg({
        type: 'error',
        text: 'Please enter an Official Unit ID (e.g., arr.frs) to verify.'
      });
      return;
    }

    try {
      setIsVerifyingUnit(true);
      setUnitVerificationMsg(null);
      setVerifiedUnit(null);

      const res = await verifyStationUnit(officialUnitId.trim());

      if (res.verified && res.unit) {
        setVerifiedUnit(res.unit);
        setAgencyType(res.unit.unitType || res.unit.agencyType || AGENCY_TYPES[0]);
        setDistrict(res.unit.district || 'Pathanamthitta');
        setStationName(res.unit.unitName);
        if (res.unit.officialEmail) handleOfficialEmailChange(res.unit.officialEmail);
        if (res.unit.contactNumber) handleEmergencyContactChange(res.unit.contactNumber);

        const leaderInfo = res.unit.teamLeader ? ` | Team Leader: ${res.unit.teamLeader}` : '';
        const sizeInfo = res.unit.teamSize ? ` (Team Size: ${res.unit.teamSize})` : '';

        if (res.isAlreadyRegistered) {
          setUnitVerificationMsg({
            type: 'warning',
            text: `⚠ Unit '${res.unit.unitId}' is verified in rescue_units (${res.unit.unitName}), but has ALREADY been registered. Use Sign In to access.`
          });
        } else {
          setUnitVerificationMsg({
            type: 'success',
            text: `✓ Official Unit ID Verified in rescue_units table: ${res.unit.unitName} (${res.unit.unitType || res.unit.agencyType}) for ${res.unit.district} District.${leaderInfo}${sizeInfo}`
          });
        }
      } else {
        setUnitVerificationMsg({
          type: 'warning',
          text: res.message || `Unit ID '${officialUnitId}' not in pre-authorized rescue_units table. Manual entry enabled for Collector review.`
        });
      }
    } catch (err: any) {
      setUnitVerificationMsg({
        type: 'error',
        text: err.message || 'Unit ID verification failed.'
      });
    } finally {
      setIsVerifyingUnit(false);
    }
  };

  // Live Login Validation Handlers
  const handleLoginIdChange = (val: string) => {
    setPhoneOrEmail(val);
    setLoginTouched((prev) => ({ ...prev, phoneOrEmail: true }));

    if (!val.trim()) {
      setLoginErrors((prev) => ({ ...prev, phoneOrEmail: 'Official Unit ID or Email is required' }));
    } else {
      setLoginErrors((prev) => ({ ...prev, phoneOrEmail: '' }));
    }
  };

  const handleLoginPasswordChange = (val: string) => {
    setLoginPassword(val);
    setLoginTouched((prev) => ({ ...prev, loginPassword: true }));

    if (!val.trim()) {
      setLoginErrors((prev) => ({ ...prev, loginPassword: 'Password is required' }));
    } else if (val.trim().length < 6) {
      setLoginErrors((prev) => ({ ...prev, loginPassword: 'Password must be at least 6 characters' }));
    } else {
      setLoginErrors((prev) => ({ ...prev, loginPassword: '' }));
    }
  };

  // Live Registration Handlers
  const handleStationNameChange = (val: string) => {
    setStationName(val);
    setRegTouched((prev) => ({ ...prev, stationName: true }));

    if (!val.trim()) {
      setRegErrors((prev) => ({ ...prev, stationName: 'Station/Unit Display Name is required' }));
    } else if (val.trim().length < 3) {
      setRegErrors((prev) => ({ ...prev, stationName: 'Name must be at least 3 characters' }));
    } else {
      setRegErrors((prev) => ({ ...prev, stationName: '' }));
    }
  };

  const handleOfficialEmailChange = (val: string) => {
    const trimmed = val.trim();
    setOfficialEmail(val);
    setRegTouched((prev) => ({ ...prev, officialEmail: true }));

    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);

    if (!trimmed) {
      setEmailAvailable(null);
      setCheckingEmail(false);
      setRegErrors((prev) => ({ ...prev, officialEmail: 'Official Email is required' }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailAvailable(null);
      setCheckingEmail(false);
      setRegErrors((prev) => ({ ...prev, officialEmail: 'Please enter a valid official email format' }));
      return;
    }

    setRegErrors((prev) => ({ ...prev, officialEmail: '' }));
    setCheckingEmail(true);
    setEmailAvailable(null);

    emailTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkAuthAvailability({ email: trimmed, role: 'station' });
        setCheckingEmail(false);
        if (res.emailExists) {
          setEmailAvailable(false);
          setRegErrors((prev) => ({
            ...prev,
            officialEmail: 'This email is already registered in SAHAY. Use Official Sign In.',
          }));
        } else {
          setEmailAvailable(true);
          setRegErrors((prev) => ({ ...prev, officialEmail: '' }));
        }
      } catch (e) {
        setCheckingEmail(false);
      }
    }, 350);
  };

  const handleEmergencyContactChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '').slice(0, 10);
    setEmergencyContact(cleanDigits);
    setRegTouched((prev) => ({ ...prev, emergencyContact: true }));

    if (!cleanDigits) {
      setContactAvailable(null);
      setRegErrors((prev) => ({ ...prev, emergencyContact: 'Emergency Contact Number is required' }));
      return;
    }

    if (cleanDigits.length < 10) {
      setContactAvailable(null);
      setRegErrors((prev) => ({
        ...prev,
        emergencyContact: `Mobile number must be 10 digits (${cleanDigits.length}/10)`,
      }));
      return;
    }

    setContactAvailable(true);
    setRegErrors((prev) => ({ ...prev, emergencyContact: '' }));
  };

  const handleCreatePasswordChange = (val: string) => {
    setCreatePassword(val);
    setRegTouched((prev) => ({ ...prev, createPassword: true }));

    if (!val.trim()) {
      setRegErrors((prev) => ({ ...prev, createPassword: 'Create Password is required' }));
    } else if (val.length < 6) {
      setRegErrors((prev) => ({ ...prev, createPassword: 'Password must be at least 6 characters' }));
    } else {
      setRegErrors((prev) => ({ ...prev, createPassword: '' }));
    }

    if (confirmPassword) {
      if (val !== confirmPassword) {
        setRegErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setRegErrors((prev) => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    setRegTouched((prev) => ({ ...prev, confirmPassword: true }));

    if (!val.trim()) {
      setRegErrors((prev) => ({ ...prev, confirmPassword: 'Confirm Password is required' }));
    } else if (createPassword !== val) {
      setRegErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setRegErrors((prev) => ({ ...prev, confirmPassword: '' }));
    }
  };

  // Official Sign-In Submission
  const handleOfficialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    setLoginTouched({ phoneOrEmail: true, loginPassword: true });

    if (!phoneOrEmail.trim() || !loginPassword.trim()) {
      setServerError('Please enter both Official Unit ID / Email and Password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await loginUser({
        phoneOrEmail: phoneOrEmail.trim(),
        password: loginPassword.trim(),
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      setServerError(err.message || 'Official authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Station Sign-Up Submission
  const handleStationRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    setRegTouched({
      officialUnitId: true,
      stationName: true,
      officialEmail: true,
      emergencyContact: true,
      createPassword: true,
      confirmPassword: true,
    });

    if (
      !agencyType ||
      !district ||
      !officialUnitId.trim() ||
      !stationName.trim() ||
      !officialEmail.trim() ||
      !emergencyContact.trim() ||
      !createPassword.trim()
    ) {
      setServerError('Please complete all required form fields.');
      return;
    }

    if (emailAvailable === false) {
      setServerError('The entered official email is already registered in SAHAY.');
      return;
    }

    if (createPassword.trim().length < 6) {
      setServerError('Password must be at least 6 characters long.');
      return;
    }

    if (createPassword !== confirmPassword) {
      setServerError('Passwords do not match. Please verify Create Password and Confirm Password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await registerUser({
        name: stationName.trim(),
        phone: emergencyContact.trim(),
        email: officialEmail.trim(),
        password: createPassword.trim(),
        role: 'station' as any,
        district: district,
        panchayat: stationName.trim(),
        designation: agencyType,
        departmentId: officialUnitId.trim().toLowerCase(),
      });

      setSuccessMessage(res.message);
      setOfficialUnitId('');
      setStationName('');
      setOfficialEmail('');
      setEmergencyContact('');
      setCreatePassword('');
      setConfirmPassword('');
      setVerifiedUnit(null);
      setUnitVerificationMsg(null);
      setRegTouched({});
      setRegErrors({});
    } catch (err: any) {
      setServerError(err.message || 'Station registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-[90vh] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center bg-slate-950 bg-cover bg-center bg-no-repeat animate-fadeIn font-sans"
      style={{
        backgroundImage: `url(${loginBg})`,
      }}
    >
      {/* Dark Vignette Overlay for monsoon background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/75 to-slate-950/90 backdrop-brightness-[0.75]" />

      <div className="relative z-10 max-w-xl mx-auto w-full">
        {/* Top Header Navigation */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={onNavigateToCitizen}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 px-4 py-2.5 rounded-xl transition-all shadow-md backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Switch to Public Citizen Portal</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Official Portal
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Brand Header */}
          <div className="bg-gradient-to-r from-slate-950 via-[#043e2e] to-slate-950 border-b border-emerald-800/40 p-6 text-center relative">
            <div className="max-w-[200px] sm:max-w-[220px] mx-auto mb-2">
              <img
                src={fullLogoSahay}
                alt="SAHAY Emblem"
                className="w-full h-auto object-contain brightness-110 drop-shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/full_logo_sahay.png';
                }}
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Station Duty & Official Portal
            </h2>
            <p className="text-xs text-emerald-300 font-semibold mt-1">
              Kerala State Disaster Management & Station Emergency Network
            </p>
          </div>

          {/* Registration Success View */}
          {successMessage ? (
            <div className="p-8 sm:p-10 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center justify-center mx-auto shadow-lg ring-4 ring-emerald-500/20">
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Station Registration Submitted
                </h3>
              </div>

              <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-2xl text-left shadow-inner">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 font-medium leading-relaxed">
                    {successMessage}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setMode('login');
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Return to Official Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dual Mode Switcher Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setServerError(null);
                  }}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                    mode === 'register'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Station Sign-Up</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setServerError(null);
                  }}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                    mode === 'login'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Official Sign-In</span>
                </button>
              </div>

              <div className="p-6 sm:p-8">
                {/* Server Error Alert */}
                {serverError && (
                  <div className="mb-5 p-3.5 bg-red-950/80 border border-red-800 rounded-xl text-xs font-semibold text-red-300 flex items-center gap-2.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* MODE 1: STATION REGISTRATION */}
                {mode === 'register' && (
                  <form onSubmit={handleStationRegister} className="space-y-4" noValidate>
                    {/* Header Note */}
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl text-xs text-slate-300 font-medium">
                      <div className="font-bold text-emerald-400 mb-0.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Kerala Emergency Station Self-Registration:</span>
                      </div>
                      Enter your official unit details. Station registrations are reviewed and activated by the District Collector.
                    </div>

                    {/* Agency Type & District */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Agency / Unit Type <span className="text-red-400">*</span></span>
                        </label>
                        <select
                          value={agencyType}
                          onChange={(e) => setAgencyType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          {AGENCY_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Jurisdiction District <span className="text-red-400">*</span></span>
                        </label>
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          {keralaDistricts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Official Unit ID */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Official Unit ID / Department Code <span className="text-red-400">*</span></span>
                        </span>
                      </label>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={officialUnitId}
                          onChange={(e) => {
                            setOfficialUnitId(e.target.value);
                            setUnitVerificationMsg(null);
                          }}
                          placeholder="e.g. arr.frs / idk.frs / ekm.ndrf"
                          className="flex-1 bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyUnitId}
                          disabled={isVerifyingUnit}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                        >
                          {isVerifyingUnit ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Verify Unit ID</span>
                        </button>
                      </div>

                      {unitVerificationMsg && (
                        <div
                          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
                            unitVerificationMsg.type === 'success'
                              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                              : unitVerificationMsg.type === 'warning'
                              ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                              : 'bg-red-950/80 border-red-700 text-red-300'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                          <span>{unitVerificationMsg.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Station/Unit Display Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-300">
                          Station/Unit Display Name <span className="text-red-400">*</span>
                        </label>
                        {regTouched.stationName && !regErrors.stationName && stationName.trim().length >= 3 && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 animate-fadeIn">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={stationName}
                        onChange={(e) => handleStationNameChange(e.target.value)}
                        onBlur={() => setRegTouched((prev) => ({ ...prev, stationName: true }))}
                        placeholder="e.g. Adoor Fire & Rescue Station"
                        className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium ${
                          regTouched.stationName && regErrors.stationName
                            ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                            : regTouched.stationName && stationName.trim().length >= 3
                            ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                            : 'border-slate-700/90 focus:ring-2 focus:ring-emerald-500'
                        }`}
                      />
                      {regTouched.stationName && regErrors.stationName && (
                        <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{regErrors.stationName}</span>
                        </p>
                      )}
                    </div>

                    {/* Official Government Email with Duplicate Check */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Official Government Email <span className="text-red-400">*</span></span>
                        </label>
                        {checkingEmail && (
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                            Checking...
                          </span>
                        )}
                        {emailAvailable === true && !regErrors.officialEmail && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 animate-fadeIn">
                            <Check className="w-3 h-3" /> Available
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={officialEmail}
                          onChange={(e) => handleOfficialEmailChange(e.target.value)}
                          onBlur={() => setRegTouched((prev) => ({ ...prev, officialEmail: true }))}
                          placeholder="officer@kerala.gov.in"
                          className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium ${
                            regTouched.officialEmail && (regErrors.officialEmail || emailAvailable === false)
                              ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                              : emailAvailable === true
                              ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                              : 'border-slate-700/90 focus:ring-2 focus:ring-emerald-500'
                          }`}
                        />
                        {checkingEmail ? (
                          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        ) : emailAvailable === true && !regErrors.officialEmail ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                        ) : (regTouched.officialEmail && regErrors.officialEmail) || emailAvailable === false ? (
                          <AlertCircle className="w-4 h-4 text-red-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                        ) : null}
                      </div>
                      {regTouched.officialEmail && regErrors.officialEmail && (
                        <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{regErrors.officialEmail}</span>
                        </p>
                      )}
                    </div>

                    {/* Emergency Contact Number */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Emergency Contact Number <span className="text-red-400">*</span></span>
                        </label>
                        {contactAvailable && !regErrors.emergencyContact && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 animate-fadeIn">
                            <Check className="w-3 h-3" /> Valid 10-digit
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={emergencyContact}
                          onChange={(e) => handleEmergencyContactChange(e.target.value)}
                          onBlur={() => setRegTouched((prev) => ({ ...prev, emergencyContact: true }))}
                          placeholder="e.g. 9847000000"
                          className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-mono font-medium ${
                            regTouched.emergencyContact && regErrors.emergencyContact
                              ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                              : contactAvailable
                              ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                              : 'border-slate-700/90 focus:ring-2 focus:ring-emerald-500'
                          }`}
                        />
                        {contactAvailable && !regErrors.emergencyContact && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      {regTouched.emergencyContact && regErrors.emergencyContact && (
                        <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{regErrors.emergencyContact}</span>
                        </p>
                      )}
                    </div>

                    {/* Create Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Create Password <span className="text-red-400">*</span></span>
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type={showCreatePassword ? 'text' : 'password'}
                            required
                            value={createPassword}
                            onChange={(e) => handleCreatePasswordChange(e.target.value)}
                            onBlur={() => setRegTouched((prev) => ({ ...prev, createPassword: true }))}
                            placeholder="Min 6 characters"
                            className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium ${
                              regTouched.createPassword && regErrors.createPassword
                                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                : regTouched.createPassword && createPassword.length >= 6
                                ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                                : 'border-slate-700/90 focus:ring-2 focus:ring-emerald-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {regTouched.createPassword && regErrors.createPassword && (
                          <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{regErrors.createPassword}</span>
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Confirm Password <span className="text-red-400">*</span></span>
                          </label>
                          {regTouched.confirmPassword && !regErrors.confirmPassword && confirmPassword && (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 animate-fadeIn">
                              <Check className="w-3 h-3" /> Matches
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                            onBlur={() => setRegTouched((prev) => ({ ...prev, confirmPassword: true }))}
                            placeholder="Re-enter password"
                            className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium ${
                              regTouched.confirmPassword && regErrors.confirmPassword
                                ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                : regTouched.confirmPassword && confirmPassword && !regErrors.confirmPassword
                                ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                                : 'border-slate-700/90 focus:ring-2 focus:ring-emerald-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {regTouched.confirmPassword && regErrors.confirmPassword && (
                          <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span>{regErrors.confirmPassword}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Submit REGISTER Button */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || checkingEmail || emailAvailable === false}
                        className={`w-full py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest font-black text-sm text-white ${
                          emailAvailable === false
                            ? 'bg-slate-700 cursor-not-allowed opacity-70'
                            : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-600/30'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>REGISTERING STATION...</span>
                          </>
                        ) : checkingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>CHECKING CREDENTIALS...</span>
                          </>
                        ) : (
                          <span>[ REGISTER ]</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* MODE 2: OFFICIAL SIGN-IN */}
                {mode === 'login' && (
                  <form onSubmit={handleOfficialLogin} className="space-y-5" noValidate>
                    {/* Header Note */}
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl text-xs text-slate-300 font-medium">
                      <div className="font-bold text-emerald-400 mb-0.5 flex items-center gap-1.5">
                        <Lock className="w-4 h-4" />
                        <span>Official Sign-In Credentials:</span>
                      </div>
                      Enter your registered <strong>Official Unit ID (e.g. arr.frs)</strong> or <strong>Official Email</strong> along with your password.
                    </div>

                    {/* 1. Official Unit ID or Email */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Official Unit ID or Email <span className="text-red-400">*</span></span>
                        </label>
                        {loginTouched.phoneOrEmail && !loginErrors.phoneOrEmail && phoneOrEmail.trim() && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 animate-fadeIn">
                            <Check className="w-3 h-3" /> Ready
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={phoneOrEmail}
                        onChange={(e) => handleLoginIdChange(e.target.value)}
                        onBlur={() => setLoginTouched((prev) => ({ ...prev, phoneOrEmail: true }))}
                        placeholder="e.g. arr.frs or officer@kerala.gov.in"
                        className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium ${
                          loginTouched.phoneOrEmail && loginErrors.phoneOrEmail
                            ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                            : loginTouched.phoneOrEmail && phoneOrEmail.trim()
                            ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                            : 'border-slate-700/90 focus:ring-2 focus:ring-emerald-500'
                        }`}
                      />
                      {loginTouched.phoneOrEmail && loginErrors.phoneOrEmail && (
                        <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{loginErrors.phoneOrEmail}</span>
                        </p>
                      )}
                    </div>

                    {/* 2. Password */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Password <span className="text-red-400">*</span></span>
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => handleLoginPasswordChange(e.target.value)}
                          onBlur={() => setLoginTouched((prev) => ({ ...prev, loginPassword: true }))}
                          placeholder="Password"
                          className={`w-full bg-slate-950 border rounded-xl px-4 py-3 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium ${
                            loginTouched.loginPassword && loginErrors.loginPassword
                              ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                              : loginTouched.loginPassword && loginPassword.trim().length >= 6
                              ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                              : 'border-slate-700/90 focus:ring-2 focus:ring-emerald-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {loginTouched.loginPassword && loginErrors.loginPassword && (
                        <p className="text-[11px] font-bold text-red-400 mt-1 flex items-center gap-1 animate-fadeIn">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span>{loginErrors.loginPassword}</span>
                        </p>
                      )}
                    </div>

                    {/* 3. Submit LOG IN Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>AUTHENTICATING...</span>
                          </>
                        ) : (
                          <span>[ LOG IN ]</span>
                        )}
                      </button>
                    </div>

                    {/* Informational Box */}
                    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                      <div className="font-bold text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>System Access Information:</span>
                      </div>
                      <p>
                        District Collectors access using their appointed email/credentials. Station units log in using their verified Official Unit ID (e.g. <code>arr.frs</code>) or email once approved by the Collector.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
