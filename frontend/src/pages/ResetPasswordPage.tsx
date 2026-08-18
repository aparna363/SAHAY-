import React, { useState, useEffect } from 'react';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import { resetPassword } from '../services/api';

interface ResetPasswordPageProps {
  onNavigateToLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigateToLogin }) => {
  const [token, setToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmNewPassword?: string }>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token') || urlParams.get('resetToken') || '';
    setToken(tokenFromUrl);
  }, []);

  // Password Validation Checklist Rules
  const passChecks = {
    length: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(newPassword),
    noSpaceOrFiller: newPassword.length > 0 && !newPassword.includes(' ') && !/---|___|\.\.\./.test(newPassword)
  };

  const validateForm = (): boolean => {
    const newErrs: { newPassword?: string; confirmNewPassword?: string } = {};

    if (!newPassword) {
      newErrs.newPassword = 'New Password is required';
    } else if (newPassword.includes(' ')) {
      newErrs.newPassword = 'Password cannot contain spaces';
    } else if (/---|___|\.\.\./.test(newPassword)) {
      newErrs.newPassword = 'Password cannot contain filler patterns like "---"';
    } else if (newPassword.length < 8) {
      newErrs.newPassword = 'Password must be at least 8 characters long';
    } else if (!passChecks.hasUpper || !passChecks.hasLower || !passChecks.hasNumber || !passChecks.hasSymbol) {
      newErrs.newPassword = 'Password must contain uppercase (A-Z), lowercase (a-z), number (0-9), and a special symbol (@,#,$,!,etc.)';
    }

    if (!confirmNewPassword) {
      newErrs.confirmNewPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmNewPassword) {
      newErrs.confirmNewPassword = 'Passwords do not match';
    }

    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMsg(null);

    if (!token) {
      setServerError('Password reset token is missing. Please use the link sent to your email or request a new reset link.');
      return;
    }

    if (validateForm()) {
      try {
        setIsSubmitting(true);
        const res = await resetPassword({
          token,
          newPassword
        });

        setSuccessMsg(res.message || 'Password reset successfully! Please sign in with your new password.');

        if (window.history.pushState) {
          window.history.pushState({}, document.title, window.location.pathname);
        }

        setTimeout(() => {
          onNavigateToLogin();
        }, 2200);
      } catch (err: any) {
        setServerError(err.message || 'Failed to reset password. The link may have expired.');
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
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/65 to-slate-950/85 backdrop-brightness-[0.8]" />

      <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/80">
        
        {/* Header */}
        <div className="bg-emerald-50/90 border-b border-emerald-100 py-6 px-6 text-center relative">
          <div className="max-w-[200px] sm:max-w-[220px] mx-auto">
            <img
              src={fullLogoSahay}
              alt="SAHAY Kerala Disaster Portal"
              className="w-full h-auto object-contain drop-shadow-xs"
            />
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-2 uppercase tracking-wider">
            Password Recovery Portal
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#059669]" />
              <span>Create New Password</span>
            </h2>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Sign In
            </button>
          </div>

          {/* Error Banner */}
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{serverError}</span>
                {!token && (
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="mt-2 block text-xs font-bold text-red-800 underline hover:text-red-950"
                  >
                    Click here to request a new reset link
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 animate-fadeIn">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-sm text-emerald-900">{successMsg}</p>
                  <p className="text-slate-600 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    Redirecting to sign in page...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1"
              >
                <span>Go to Sign In Now</span>
              </button>
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn" noValidate>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Please choose a strong password with at least 8 characters, uppercase, lowercase, numbers, and special symbols (@, #, $, etc.).
              </p>

              {/* New Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, e.g. Pass@2026"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
                    }}
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      errors.newPassword
                        ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                        : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
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

                {/* Live Password Requirements Checklist */}
                <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] space-y-1">
                  <p className="font-bold text-slate-600 mb-1">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-1 font-semibold">
                    <span className={passChecks.length ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {passChecks.length ? '✓' : '•'} At least 8 characters
                    </span>
                    <span className={passChecks.hasUpper && passChecks.hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {passChecks.hasUpper && passChecks.hasLower ? '✓' : '•'} Upper (A-Z) & Lower (a-z)
                    </span>
                    <span className={passChecks.hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {passChecks.hasNumber ? '✓' : '•'} Number (0-9)
                    </span>
                    <span className={passChecks.hasSymbol ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {passChecks.hasSymbol ? '✓' : '•'} Symbol (@, #, $, !, %, etc.)
                    </span>
                  </div>
                  <div className="pt-1 text-[10px]">
                    <span className={newPassword.length > 0 && passChecks.noSpaceOrFiller ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                      {newPassword.length > 0 && passChecks.noSpaceOrFiller ? '✓' : '•'} No spaces or filler patterns (e.g. "---")
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm New Password Input */}
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
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      errors.confirmNewPassword
                        ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400'
                        : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Reset Password & Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400 font-semibold">
            SAHAY Emergency Response & Disaster Management Authority
          </div>
        </div>
      </div>
    </div>
  );
};
