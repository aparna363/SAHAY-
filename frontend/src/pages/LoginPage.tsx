import React, { useState } from 'react';
import { LogIn, Lock, Phone, UserCheck, ArrowRight, AlertCircle, Building2, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft, Mail, Send } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { loginUser, sendResetLink, sendOtp, loginWithOtp } from '../services/api';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

interface LoginPageProps {
  currentLang: Language;
  onNavigateToRegister: (role: 'citizen' | 'official') => void;
  onLoginSuccess?: (user: any) => void;
  onOpenOfficialLogin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToRegister, onLoginSuccess, onOpenOfficialLogin }) => {
  const tab = 'citizen';
  const [citizenLoginMethod, setCitizenLoginMethod] = useState<'password' | 'otp'>('password');

  // Login State
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [passwordOrOtp, setPasswordOrOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);

  // Forgot Password State
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetPhoneOrEmail, setResetPhoneOrEmail] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Errors state
  const [errors, setErrors] = useState<{ phoneOrEmail?: string; passwordOrOtp?: string; resetPhoneOrEmail?: string; newPassword?: string; confirmNewPassword?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const trimmedVal = phoneOrEmail.trim();

    if (!trimmedVal) {
      newErrors.phoneOrEmail = 'Registered Mobile Number or Email is required';
    } else if (trimmedVal.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedVal)) {
        newErrors.phoneOrEmail = 'Please enter a valid email address format';
      }
    } else {
      const cleanPhone = trimmedVal.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        newErrors.phoneOrEmail = 'Please enter a valid mobile number or email address';
      }
    }

    const trimmedSecret = passwordOrOtp.trim();

    if (tab === 'citizen' && citizenLoginMethod === 'otp') {
      if (!trimmedSecret) {
        newErrors.passwordOrOtp = '6-digit OTP code is required';
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



  const handleSendOtp = async () => {
    const trimmed = phoneOrEmail.trim();
    if (!trimmed) {
      setErrors({ phoneOrEmail: 'Please enter your Registered Mobile Number or Email first' });
      return;
    }
    setErrors({});
    setServerError(null);
    setIsSubmitting(true);
    try {
      const res = await sendOtp(trimmed);
      setIsOtpSent(true);
      setResetSuccessMsg(`${res.message}${res.otp ? ` (Demo OTP Code: ${res.otp})` : ''}`);
    } catch (err: any) {
      setServerError(err.message || 'Failed to send OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (validateForm()) {
      setIsSubmitting(true);
      try {
        let response;
        if (citizenLoginMethod === 'otp') {
          response = await loginWithOtp(phoneOrEmail.trim(), passwordOrOtp.trim());
        } else {
          response = await loginUser({
            phoneOrEmail: phoneOrEmail.trim(),
            password: passwordOrOtp.trim(),
            role: tab,
          });
        }

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

  const handleSendResetMail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setServerError(null);
    setResetSuccessMsg(null);

    const trimmedVal = resetPhoneOrEmail.trim();
    if (!trimmedVal) {
      setErrors({ resetPhoneOrEmail: 'Registered Mobile Phone or Email is required' });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await sendResetLink(trimmedVal);
      setResetSuccessMsg(response.message);
    } catch (err: any) {
      setServerError(err.message || 'Failed to send reset email link.');
    } finally {
      setIsSubmitting(false);
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
            /* Forgot Password / Send Reset Link Mode */
            <form onSubmit={handleSendResetMail} className="space-y-4 animate-fadeIn" noValidate>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#059669]" />
                  <span>Forgot Password</span>
                </h3>
                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setErrors({}); setServerError(null); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              </div>

              <p className="text-xs font-medium text-slate-600">
                Enter your registered Email or Mobile number below. We will send a secure link to reset your password.
              </p>

              {/* Reset Input 1: Registered Phone or Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered Mobile / Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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

              {/* Action: Send Reset Link to Mail */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
              >
                <Send className="w-4 h-4 text-white" />
                <span>{isSubmitting ? 'Sending Reset Link...' : 'Send Password Reset Link'}</span>
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

              {/* Field 1: Mobile Phone or Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Registered Mobile Number or Email *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. 9876543210 or name@gmail.com"
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
                className="w-full py-3.5 rounded-xl text-sm font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center justify-center gap-2 mt-2 text-white bg-[#059669] hover:bg-[#047857]"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
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

                  <GoogleAuthButton
                    mode="login"
                    label="Sign in with Google"
                    onSuccess={(user) => {
                      setLoggedInUser(user);
                      if (onLoginSuccess) onLoginSuccess(user);
                    }}
                    onError={(err) => setServerError(err)}
                  />
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

          {/* Official Portal Access Banner */}
          {onOpenOfficialLogin && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onOpenOfficialLogin}
                className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>Govt Official / Station Admin Portal →</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
