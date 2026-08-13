import React, { useState, useEffect } from 'react';
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
  KeyRound
} from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { loginUser, registerUser, getDistricts, verifyStationUnit, type VerifiedStationUnit } from '../services/api';

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

  // Official Sign-In Form State (Matching Sign-In Model)
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Station Registration Form State (Matching Sign-Up Model)
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

  // Unit ID Verification State (Similar to Collector ID verification in Admin Dashboard)
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
  }, []);

  // Unit ID Verification Handler (Queries rescue_units table)
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
        if (res.unit.officialEmail) setOfficialEmail(res.unit.officialEmail);
        if (res.unit.contactNumber) setEmergencyContact(res.unit.contactNumber);

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

  // Official Sign-In Submission
  const handleOfficialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

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

    // Form Validations
    if (!agencyType || !district || !officialUnitId.trim() || !stationName.trim() || !officialEmail.trim() || !emergencyContact.trim() || !createPassword.trim()) {
      setServerError('Please complete all required form fields.');
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
      // Reset form fields
      setOfficialUnitId('');
      setStationName('');
      setOfficialEmail('');
      setEmergencyContact('');
      setCreatePassword('');
      setConfirmPassword('');
      setVerifiedUnit(null);
      setUnitVerificationMsg(null);
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
                onError={(e) => { (e.target as HTMLImageElement).src = '/full_logo_sahay.png'; }}
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
              {/* Tabs Toggle */}
              <div className="grid grid-cols-2 p-2 bg-slate-950/90 border-b border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('register'); setServerError(null); setSuccessMessage(null); }}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    mode === 'register'
                      ? 'bg-emerald-600 text-white shadow-lg ring-1 ring-emerald-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-emerald-300" />
                  <span>SIGN-UP PANEL</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setServerError(null); setSuccessMessage(null); }}
                  className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    mode === 'login'
                      ? 'bg-emerald-600 text-white shadow-lg ring-1 ring-emerald-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Lock className="w-4 h-4 text-emerald-300" />
                  <span>SIGN-IN PANEL</span>
                </button>
              </div>

              {/* Form Container */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Global Server Error Banner */}
                {serverError && (
                  <div className="p-4 bg-red-950/80 border border-red-800/80 text-red-200 text-xs rounded-2xl flex items-start gap-3 shadow-md animate-fadeIn">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-red-300">Authentication Error</div>
                      <div className="mt-0.5 leading-relaxed">{serverError}</div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* MODE 1: STATION SIGN-UP PANEL (MODEL MATCH) */}
                {/* ========================================================= */}
                {mode === 'register' && (
                  <form onSubmit={handleStationRegister} className="space-y-4">
                    
                    {/* Header Banner */}
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl text-xs text-slate-300 font-medium">
                      <div className="font-bold text-emerald-400 mb-0.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Station Duty Registration Governance:</span>
                      </div>
                      Registered stations enter <strong>PENDING</strong> status and are reviewed & approved by the <strong>District Collector</strong> of your selected district.
                    </div>

                    {/* 1. Select Agency Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Select Agency Type <span className="text-red-400">*</span></span>
                      </label>
                      <select
                        value={agencyType}
                        onChange={(e) => setAgencyType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold"
                      >
                        {AGENCY_TYPES.map(agency => (
                          <option key={agency} value={agency} className="bg-slate-900 text-white">
                            ▼ {agency}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Select District */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Select District <span className="text-red-400">*</span></span>
                      </label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold"
                      >
                        {keralaDistricts.map(d => (
                          <option key={d} value={d} className="bg-slate-900 text-white">
                            ▼ {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Official Unit ID with VERIFY Button (Collector Verification Model) */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Official Unit ID (e.g., arr.frs) <span className="text-red-400">*</span></span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">Directory Verification</span>
                      </label>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={officialUnitId}
                          onChange={(e) => setOfficialUnitId(e.target.value.toLowerCase())}
                          placeholder="Official Unit ID (e.g., arr.frs)"
                          className="flex-1 bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyUnitId}
                          disabled={isVerifyingUnit}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                        >
                          {isVerifyingUnit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          <span>Verify Unit ID</span>
                        </button>
                      </div>

                      {/* Preset Unit ID Quick Buttons */}
                      <div className="flex items-center gap-2 pt-0.5 overflow-x-auto text-[10px]">
                        <span className="text-slate-400 font-medium">Demo Unit IDs:</span>
                        <button
                          type="button"
                          onClick={() => { setOfficialUnitId('arr.frs'); }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono border border-slate-700"
                        >
                          arr.frs (Pathanamthitta)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOfficialUnitId('idk.frs'); }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono border border-slate-700"
                        >
                          idk.frs (Idukki)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOfficialUnitId('ekm.ndrf'); }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono border border-slate-700"
                        >
                          ekm.ndrf (Ernakulam)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setOfficialUnitId('tvm.pol'); }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono border border-slate-700"
                        >
                          tvm.pol (Trivandrum)
                        </button>
                      </div>

                      {/* Unit ID Verification Alert Banner */}
                      {unitVerificationMsg && (
                        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
                          unitVerificationMsg.type === 'success'
                            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                            : unitVerificationMsg.type === 'warning'
                            ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                            : 'bg-red-950/80 border-red-700 text-red-300'
                        }`}>
                          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                          <span>{unitVerificationMsg.text}</span>
                        </div>
                      )}
                    </div>

                    {/* 4. Station/Unit Display Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Station/Unit Display Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        placeholder="Station/Unit Display Name"
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                      />
                    </div>

                    {/* 5. Official Government Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Official Government Email <span className="text-red-400">*</span></span>
                      </label>
                      <input
                        type="email"
                        required
                        value={officialEmail}
                        onChange={(e) => setOfficialEmail(e.target.value)}
                        placeholder="Official Government Email"
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                      />
                    </div>

                    {/* 6. Emergency Contact Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Emergency Contact Number <span className="text-red-400">*</span></span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="Emergency Contact Number"
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-medium"
                      />
                    </div>

                    {/* 7 & 8. Create Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Create Password <span className="text-red-400">*</span></span>
                        </label>
                        <div className="relative">
                          <input
                            type={showCreatePassword ? 'text' : 'password'}
                            required
                            value={createPassword}
                            onChange={(e) => setCreatePassword(e.target.value)}
                            placeholder="Create Password"
                            className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreatePassword(!showCreatePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Confirm Password <span className="text-red-400">*</span></span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm Password"
                            className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 9. Submit REGISTER Button (Model Match) */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>REGISTERING STATION...</span>
                          </>
                        ) : (
                          <span>[ REGISTER ]</span>
                        )}
                      </button>
                    </div>

                  </form>
                )}

                {/* ========================================================= */}
                {/* MODE 2: OFFICIAL SIGN-IN PANEL (MODEL MATCH) */}
                {/* ========================================================= */}
                {mode === 'login' && (
                  <form onSubmit={handleOfficialLogin} className="space-y-5">
                    
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
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Official Unit ID or Email <span className="text-red-400">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        value={phoneOrEmail}
                        onChange={(e) => setPhoneOrEmail(e.target.value)}
                        placeholder="Official Unit ID or Email"
                        className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                      />
                    </div>

                    {/* 2. Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Password <span className="text-red-400">*</span></span>
                      </label>
                      <div className="relative">
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full bg-slate-950 border border-slate-700/90 rounded-xl px-4 py-3 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 3. Submit LOG IN Button (Model Match) */}
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
