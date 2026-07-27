import React, { useState } from 'react';
import { LogIn, Lock, Phone, UserCheck, ArrowRight, User, AlertCircle, LifeBuoy, Building2, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { loginUser, resetPassword } from '../services/api';
import type { UserRole } from '../services/api';

interface LoginPageProps {
  currentLang: Language;
  onNavigateToRegister: (role: 'citizen' | 'official') => void;
  onLoginSuccess?: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToRegister, onLoginSuccess }) => {
  const [tab, setTab] = useState<UserRole>('citizen');
  const [citizenLoginMethod, setCitizenLoginMethod] = useState<'password' | 'otp'>('password');

  // Login State
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [passwordOrOtp, setPasswordOrOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Forgot Password State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetPhoneOrEmail, setResetPhoneOrEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Errors state
  const [errors, setErrors] = useState<{ phoneOrEmail?: string; passwordOrOtp?: string; resetPhoneOrEmail?: string; newPassword?: string; confirmNewPassword?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const trimmedPhoneOrEmail = phoneOrEmail.trim();

    if (!trimmedPhoneOrEmail) {
      newErrors.phoneOrEmail = tab === 'citizen'
        ? 'Mobile number cannot be empty or spaces only'
        : 'Govt Email or Employee Service ID cannot be empty or spaces only';
    } else if (tab === 'citizen') {
      const cleanPhone = phoneOrEmail.replace(/\D/g, '');
      if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        newErrors.phoneOrEmail = 'Please enter a valid 10-digit mobile number';
      }
    } else if (trimmedPhoneOrEmail.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedPhoneOrEmail)) {
      newErrors.phoneOrEmail = 'Please enter a valid email address format';
    }

    const trimmedSecret = passwordOrOtp.trim();

    if (tab === 'citizen' && citizenLoginMethod === 'otp') {
      if (!trimmedSecret) {
        newErrors.passwordOrOtp = 'OTP code cannot be empty or spaces only';
      } else if (!/^\d{6}$/.test(trimmedSecret)) {
        newErrors.passwordOrOtp = 'OTP must be exactly 6 numeric digits';
      }
    } else {
      if (!passwordOrOtp || !trimmedSecret) {
        newErrors.passwordOrOtp = 'Password cannot be empty or spaces only';
      } else if (trimmedSecret.length < 6) {
        newErrors.passwordOrOtp = 'Password must be at least 6 characters long';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateResetForm = () => {
    const newErrors: typeof errors = {};
    const trimmedVal = resetPhoneOrEmail.trim();

    if (!trimmedVal) {
      newErrors.resetPhoneOrEmail = 'Registered Mobile Phone or Email is required';
    }

    const trimmedNewPass = newPassword.trim();
    if (!newPassword || !trimmedNewPass) {
      newErrors.newPassword = 'New password cannot be empty or spaces only';
    } else if (trimmedNewPass.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long';
    }

    const trimmedConfirm = confirmNewPassword.trim();
    if (!confirmNewPassword || !trimmedConfirm) {
      newErrors.confirmNewPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = () => {
    const trimmedPhone = phoneOrEmail.trim();
    const cleanPhone = phoneOrEmail.replace(/\D/g, '');
    if (!trimmedPhone) {
      setErrors({ phoneOrEmail: 'Mobile number cannot be empty or spaces only' });
      return;
    }
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrors({ phoneOrEmail: 'Please enter a valid 10-digit mobile number to receive OTP' });
      return;
    }
    setErrors({});
    setIsOtpSent(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (validateForm()) {
      setIsSubmitting(true);
      try {
        const response = await loginUser({
          phoneOrEmail: phoneOrEmail.trim(),
          password: passwordOrOtp.trim(),
          role: tab,
        });

        const user = response.user;
        setLoggedInUser(user);

        if (onLoginSuccess) {
          onLoginSuccess(user);
        }
      } catch (err: any) {
        setServerError(err.message || 'Login failed. Check server connection.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setResetSuccessMsg(null);

    if (validateResetForm()) {
      setIsSubmitting(true);
      try {
        const response = await resetPassword({
          phoneOrEmail: resetPhoneOrEmail.trim(),
          newPassword: newPassword.trim(),
        });

        setResetSuccessMsg(response.message || 'Password reset successfully! Please sign in.');
        setPhoneOrEmail(resetPhoneOrEmail.trim());
        setResetPhoneOrEmail('');
        setNewPassword('');
        setConfirmNewPassword('');
        setIsResetMode(false);
      } catch (err: any) {
        setServerError(err.message || 'Failed to reset password.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      className="relative min-h-[85vh] py-14 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-slate-900 bg-cover bg-center bg-no-repeat animate-fadeIn"
      style={{
        backgroundImage: `url(${loginBg})`,
      }}
    >
      {/* Dark Vignette Overlay for monsoon background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/65 to-slate-950/85 backdrop-brightness-[0.8]" />

      <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/80">

        {/* Seamless Header */}
        <div className="bg-emerald-50/90 border-b border-emerald-100 py-6 px-6 text-center relative">
          <div className="max-w-[200px] sm:max-w-[220px] mx-auto">
            <img
              src={fullLogoSahay}
              alt="SAHAY"
              className="w-full h-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/full_logo_sahay.png'; }}
            />
          </div>
        </div>

        {/* Tab Switcher for 3 Roles: Citizen, Rescue Team, Collector */}
        {!isResetMode && !loggedInUser && (
          <div className="bg-slate-100 p-2 grid grid-cols-3 gap-1 border-b border-slate-200">
            {/* Citizen */}
            <button
              onClick={() => { setTab('citizen'); setLoggedInUser(null); setErrors({}); setServerError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${tab === 'citizen' ? 'bg-[#059669] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
                }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Citizen</span>
            </button>

            {/* Rescue Team */}
            <button
              onClick={() => { setTab('rescue_team'); setLoggedInUser(null); setErrors({}); setServerError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${tab === 'rescue_team' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
                }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Rescue</span>
            </button>

            {/* Collector */}
            <button
              onClick={() => { setTab('collector'); setLoggedInUser(null); setErrors({}); setServerError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${tab === 'collector' ? 'bg-[#043e2e] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
                }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Collector</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-7">

          {/* Success Reset Banner */}
          {resetSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{resetSuccessMsg}</span>
            </div>
          )}

          {/* Server Error Alert Banner */}
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          {loggedInUser ? (
            <div className="text-center py-8 space-y-5 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Signed In Successfully!
              </h2>
              <div className="pt-2">
                <button
                  onClick={() => setLoggedInUser(null)}
                  className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-sm font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center justify-center gap-2 max-w-xs mx-auto"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : isResetMode ? (
            /* Forgot Password / Reset Password Mode */
            <form onSubmit={handleResetPassword} className="space-y-4 animate-fadeIn" noValidate>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#059669]" />
                  <span>Reset Your Password</span>
                </h3>
                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setErrors({}); setServerError(null); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              </div>

              {/* Reset Input 1: Registered Phone or Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Mobile / Email *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Enter phone or email"
                    value={resetPhoneOrEmail}
                    onChange={(e) => {
                      setResetPhoneOrEmail(e.target.value);
                      if (errors.resetPhoneOrEmail) setErrors({ ...errors, resetPhoneOrEmail: undefined });
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.resetPhoneOrEmail ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                  />
                </div>
                {errors.resetPhoneOrEmail && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{errors.resetPhoneOrEmail}</span>
                  </p>
                )}
              </div>

              {/* Reset Input 2: New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
                    }}
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.newPassword ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{errors.newPassword}</span>
                  </p>
                )}
              </div>

              {/* Reset Input 3: Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (errors.confirmNewPassword) setErrors({ ...errors, confirmNewPassword: undefined });
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.confirmNewPassword ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                  />
                </div>
                {errors.confirmNewPassword && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{errors.confirmNewPassword}</span>
                  </p>
                )}
              </div>

              {/* Submit Reset Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-md transition-all mt-2"
              >
                {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleLogin} className="space-y-4" noValidate>

              {/* Citizen Login Sub-Method Selector: Password vs OTP */}
              {tab === 'citizen' && (
                <div className="flex bg-slate-100 p-1 rounded-xl mb-3 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => { setCitizenLoginMethod('password'); setErrors({}); }}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${citizenLoginMethod === 'password' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <KeyRound className="w-3 h-3 text-[#059669]" />
                    <span>Password Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setCitizenLoginMethod('otp'); setErrors({}); }}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${citizenLoginMethod === 'otp' ? 'bg-white text-[#059669] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <Phone className="w-3 h-3 text-[#059669]" />
                    <span>OTP via SMS</span>
                  </button>
                </div>
              )}

              {/* Field 1: Mobile Phone or Govt Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tab === 'citizen' ? 'Registered Mobile Number *' : 'Govt Email / Employee Service ID *'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={tab === 'citizen' ? 'e.g. 9876543210' : tab === 'collector' ? 'collector.idk@kerala.gov.in' : 'ndrf.kerala@gov.in'}
                    value={phoneOrEmail}
                    onChange={(e) => {
                      setPhoneOrEmail(e.target.value);
                      if (errors.phoneOrEmail) setErrors({ ...errors, phoneOrEmail: undefined });
                    }}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.phoneOrEmail
                        ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                        : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                  />
                </div>
                {errors.phoneOrEmail && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{errors.phoneOrEmail}</span>
                  </p>
                )}
              </div>

              {/* Field 2: Password Input (or OTP for SMS sub-tab) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {tab === 'citizen' && citizenLoginMethod === 'otp' ? '6-Digit OTP Code *' : 'Account Password *'}
                  </label>

                  {/* Forgot Password Link */}
                  {(tab !== 'citizen' || citizenLoginMethod === 'password') ? (
                    <button
                      type="button"
                      onClick={() => { setIsResetMode(true); setResetPhoneOrEmail(phoneOrEmail); setServerError(null); }}
                      className="text-[11px] font-extrabold text-[#059669] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[11px] font-extrabold text-[#059669] hover:underline"
                    >
                      {isOtpSent ? 'Resend OTP' : 'Send OTP via SMS'}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword || (tab === 'citizen' && citizenLoginMethod === 'otp') ? 'text' : 'password'}
                    placeholder={tab === 'citizen' && citizenLoginMethod === 'otp' ? 'Enter 6-digit OTP' : 'Enter your password'}
                    value={passwordOrOtp}
                    onChange={(e) => {
                      setPasswordOrOtp(e.target.value);
                      if (errors.passwordOrOtp) setErrors({ ...errors, passwordOrOtp: undefined });
                    }}
                    className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.passwordOrOtp
                        ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                        : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                  />
                  {/* Eye Toggle for Password Login */}
                  {(tab !== 'citizen' || citizenLoginMethod === 'password') && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {errors.passwordOrOtp ? (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{errors.passwordOrOtp}</span>
                  </p>
                ) : isOtpSent && citizenLoginMethod === 'otp' ? (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ✓ OTP code sent to your registered mobile phone!
                  </p>
                ) : null}
              </div>

              {/* Clean "Sign In" Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl text-sm font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center justify-center gap-2 mt-2 text-white ${tab === 'collector'
                    ? 'bg-[#043e2e] hover:bg-[#032e22]'
                    : tab === 'rescue_team'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-[#059669] hover:bg-[#047857]'
                  }`}
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Authenticating...' : `Sign In as ${tab.replace('_', ' ')}`}</span>
              </button>

              {/* Sign in with Google (Only for Citizen Login) */}
              {tab === 'citizen' && (
                <>
                  <div className="relative my-3 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative bg-white/95 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      OR
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const citizenUser = { name: 'Citizen User', phone: '9876543210', role: 'citizen', district: 'Idukki' };
                      setLoggedInUser(citizenUser);
                      if (onLoginSuccess) onLoginSuccess(citizenUser);
                    }}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300/90 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2.5 hover:shadow-sm"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                </>
              )}
            </form>
          )}

          {/* Bottom link to Register page */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600 font-medium flex items-center justify-center gap-2">
            <span>Don't have an account?</span>
            <button
              onClick={() => onNavigateToRegister('citizen')}
              className="font-extrabold text-[#059669] hover:underline flex items-center gap-1"
            >
              Register <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
