import React, { useState, useEffect } from 'react';
import { ShieldCheck, Building2, Lock, User, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { loginUser, registerUser, getDistricts } from '../services/api';

interface OfficialLoginPageProps {
  currentLang: Language;
  onLoginSuccess: (user: any) => void;
  onNavigateToCitizen: () => void;
}

export const OfficialLoginPage: React.FC<OfficialLoginPageProps> = ({
  onLoginSuccess,
  onNavigateToCitizen,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Official Login Form state
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Station Registration Form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDistrict, setRegDistrict] = useState('Idukki');
  const [regPanchayat, setRegPanchayat] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regDepartmentId, setRegDepartmentId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [keralaDistricts, setKeralaDistricts] = useState<string[]>([]);

  useEffect(() => {
    getDistricts().then((data) => {
      setKeralaDistricts(data);
      if (data.length > 0 && !regDistrict) {
        setRegDistrict(data[0]);
      }
    });
  }, []);

  const handleOfficialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!phoneOrEmail.trim() || !password.trim()) {
      setServerError('Please enter both Mobile/Email and Password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await loginUser({
        phoneOrEmail: phoneOrEmail.trim(),
        password: password.trim(),
      });

      onLoginSuccess(res.user);
    } catch (err: any) {
      setServerError(err.message || 'Official authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStationRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!regName.trim() || !regPhone.trim() || !regPassword.trim() || !regDistrict.trim()) {
      setServerError('Please complete all required fields (Name, Phone, Password, District).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await registerUser({
        name: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim() || undefined,
        password: regPassword.trim(),
        role: 'station' as any,
        district: regDistrict,
        panchayat: regPanchayat.trim() || undefined,
        designation: regDesignation.trim() || 'Station Officer / Emergency Admin',
        departmentId: regDepartmentId.trim() || undefined,
      });

      setSuccessMessage(res.message);
      // Reset form
      setRegName('');
      setRegPhone('');
      setRegEmail('');
      setRegPassword('');
      setRegPanchayat('');
      setRegDesignation('');
      setRegDepartmentId('');
    } catch (err: any) {
      setServerError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-[85vh] py-14 px-4 sm:px-6 lg:px-8 flex flex-col justify-center bg-slate-900 bg-cover bg-center bg-no-repeat animate-fadeIn font-sans"
      style={{
        backgroundImage: `url(${loginBg})`,
      }}
    >
      {/* Dark Vignette Overlay for monsoon background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/65 to-slate-950/85 backdrop-brightness-[0.8]" />

      <div className="relative z-10 max-w-xl mx-auto w-full">
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={onNavigateToCitizen}
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-white/90 hover:bg-white border border-emerald-200 px-3.5 py-2 rounded-xl transition-all shadow-md backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-700" />
            <span>Switch to Public Citizen Portal</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-black uppercase tracking-wider shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Official Portal
          </div>
        </div>

        <div className="bg-white/95 border border-white/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="bg-emerald-50/90 border-b border-emerald-100 p-6 text-center relative">
            <div className="max-w-[200px] sm:max-w-[220px] mx-auto mb-2">
              <img src={fullLogoSahay} alt="SAHAY Emblem" className="w-full h-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/full_logo_sahay.png'; }} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Official Administration Portal
            </h2>
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              Admin, District Collector & Station Duty Access
            </p>
          </div>

          {successMessage ? (
            <div className="p-8 sm:p-10 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-center mx-auto shadow-sm ring-4 ring-emerald-50/60">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Application Submitted
                </h3>
              </div>

              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 font-medium leading-relaxed">
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
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Return to Official Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 p-2 bg-slate-100/80 border-b border-slate-200 gap-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setServerError(null); setSuccessMessage(null); }}
                  className={`py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                    mode === 'login'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Official Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setServerError(null); setSuccessMessage(null); }}
                  className={`py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                    mode === 'register'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Station Sign Up</span>
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {serverError && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-start gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-red-900">Authentication Error</div>
                      <div className="mt-0.5 leading-relaxed">{serverError}</div>
                    </div>
                  </div>
                )}

                {mode === 'login' ? (
                  /* --- OFFICIAL LOGIN FORM --- */
                  <form onSubmit={handleOfficialLogin} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Official Mobile Number or Govt Email
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={phoneOrEmail}
                          onChange={(e) => setPhoneOrEmail(e.target.value)}
                          placeholder="Mobile number or Official Email"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter official password"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-800 text-xs font-bold"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Authenticating Credentials...</span>
                      ) : (
                        <>
                          <span>Access Official Portal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[11px] text-slate-600 space-y-1">
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Official Role Governance:</span>
                      </div>
                      <p>
                        District Collectors are added directly by the Platform Admin. Station accounts register via this portal and require approval by their District Collector.
                      </p>
                    </div>
                  </form>
                ) : (
                  /* --- STATION REGISTRATION FORM --- */
                  <form onSubmit={handleStationRegister} className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                      <div className="font-bold text-emerald-900 mb-0.5">Station Sign-Up Notice:</div>
                      Upon registration, your station application will be submitted in <strong>PENDING</strong> status to the <strong>District Collector</strong> for verification and approval.
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name / Officer Name *</label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Officer Rajesh Kumar"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="10-digit phone"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">District *</label>
                        <select
                          value={regDistrict}
                          onChange={(e) => setRegDistrict(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-bold"
                        >
                          {keralaDistricts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Govt / Official Email</label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="officer@kerala.gov.in"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Station / Panchayat Name</label>
                        <input
                          type="text"
                          value={regPanchayat}
                          onChange={(e) => setRegPanchayat(e.target.value)}
                          placeholder="e.g. Munnar Control Station"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Service / Department ID</label>
                        <input
                          type="text"
                          value={regDepartmentId}
                          onChange={(e) => setRegDepartmentId(e.target.value)}
                          placeholder="e.g. KFS-IDK-882"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Official Designation</label>
                      <input
                        type="text"
                        value={regDesignation}
                        onChange={(e) => setRegDesignation(e.target.value)}
                        placeholder="e.g. Fire & Rescue Station Officer / Relief Commander"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Submitting Application to Collector...</span>
                      ) : (
                        <span>Submit Station Registration for Approval</span>
                      )}
                    </button>
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
