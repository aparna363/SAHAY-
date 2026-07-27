import React, { useState } from 'react';
import { User, CheckCircle2, Phone, Mail, MapPin, KeyRound, ArrowRight, UserPlus, AlertCircle, Eye, EyeOff, Lock, LifeBuoy, Building2 } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { registerUser } from '../services/api';
import type { UserRole } from '../services/api';

interface RegisterPageProps {
  currentLang: Language;
  initialRole: 'citizen' | 'official';
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateToLogin,
}) => {
  const [role, setRole] = useState<UserRole>('citizen');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    district: 'Idukki',
    panchayat: '',
    designation: 'KSDMA Control Room Officer',
    departmentId: '',
    termsAccepted: false,
  });

  // UI state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Errors State
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    panchayat?: string;
    departmentId?: string;
    termsAccepted?: string;
  }>({});

  // Form Validation
  const validateForm = () => {
    const newErrors: typeof errors = {};

    // 1. Full Name
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      newErrors.name = 'Full Name cannot be empty or spaces only';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
    }

    // 2. Mobile Phone (10-digit Indian number)
    const trimmedPhone = formData.phone.trim();
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!trimmedPhone) {
      newErrors.phone = 'Mobile Phone Number cannot be empty or spaces only';
    } else if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    // 3. Email
    const trimmedEmail = formData.email.trim();
    if (role !== 'citizen') {
      if (!trimmedEmail) {
        newErrors.email = 'Official Email cannot be empty or spaces only';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        newErrors.email = 'Please enter a valid email address';
      }
    } else if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // 4. Password
    const trimmedPassword = formData.password.trim();
    if (!formData.password || !trimmedPassword) {
      newErrors.password = 'Password cannot be empty or spaces only';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // 5. Confirm Password
    const trimmedConfirm = formData.confirmPassword.trim();
    if (!formData.confirmPassword || !trimmedConfirm) {
      newErrors.confirmPassword = 'Confirm Password cannot be empty or spaces only';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // 6. Citizen Panchayat / Municipality
    const trimmedPanchayat = formData.panchayat.trim();
    if (role === 'citizen') {
      if (!trimmedPanchayat) {
        newErrors.panchayat = 'Panchayat or Municipality cannot be empty or spaces only';
      }
    }

    // 7. Official / Rescue Team / Collector Employee ID
    const trimmedId = formData.departmentId.trim();
    if (role !== 'citizen') {
      if (!trimmedId) {
        newErrors.departmentId = 'Employee Service ID / Badge Code cannot be empty or spaces only';
      }
    }

    // 8. Terms Checkbox
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the registration terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (validateForm()) {
      setIsSubmitting(true);
      try {
        await registerUser({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          role: role,
          district: formData.district,
          panchayat: formData.panchayat.trim(),
          designation: role === 'rescue_team' ? 'NDRF / Fire Rescue Specialist' : role === 'collector' ? 'District Collector & Magistrate' : 'Citizen',
          departmentId: formData.departmentId.trim(),
        });

        setSubmitted(true);
      } catch (err: any) {
        setServerError(err.message || 'Registration failed. Please check backend connection.');
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

      <div className="relative z-10 max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/80">

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

        {/* Role Toggle Tabs for 3 Roles: Citizen, Rescue Team, Collector */}
        <div className="bg-emerald-50/50 p-2 border-b border-emerald-100 grid grid-cols-3 gap-1.5">
          {/* Role 1: Citizen */}
          <button
            type="button"
            onClick={() => { setRole('citizen'); setSubmitted(false); setErrors({}); setServerError(null); }}
            className={`py-2.5 rounded-xl text-xs font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${role === 'citizen'
                ? 'bg-[#059669] text-white shadow-md'
                : 'text-slate-700 hover:bg-emerald-100/60'
              }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Citizen</span>
          </button>

          {/* Role 2: Rescue Team */}
          <button
            type="button"
            onClick={() => { setRole('rescue_team'); setSubmitted(false); setErrors({}); setServerError(null); }}
            className={`py-2.5 rounded-xl text-xs font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${role === 'rescue_team'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-amber-100/60'
              }`}
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Rescue Team</span>
          </button>

          {/* Role 3: Collector */}
          <button
            type="button"
            onClick={() => { setRole('collector'); setSubmitted(false); setErrors({}); setServerError(null); }}
            className={`py-2.5 rounded-xl text-xs font-extrabold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${role === 'collector'
                ? 'bg-[#043e2e] text-white shadow-md'
                : 'text-slate-700 hover:bg-emerald-100/60'
              }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Collector</span>
          </button>
        </div>

        {/* Form Body or Clean Success Confirmation */}
        <div className="p-8">

          {/* Server Error Alert Banner */}
          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          {submitted ? (
            <div className="text-center py-8 space-y-5 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Registered Successfully!
              </h2>
              <div className="pt-2">
                <button
                  onClick={onNavigateToLogin}
                  className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-sm font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center justify-center gap-2 max-w-xs mx-auto"
                >
                  <span>Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      role === 'citizen'
                        ? 'e.g. Rajesh Nair'
                        : role === 'rescue_team'
                          ? 'e.g. Capt. Suresh Kumar (NDRF)'
                          : 'e.g. Dr. Ananya Varma, IAS (District Collector)'
                    }
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.name ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              {/* Contact Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Phone (For Alerts) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (errors.phone) setErrors({ ...errors, phone: undefined });
                      }}
                      className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.phone ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                        }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{errors.phone}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {role !== 'citizen' ? 'Official Govt Email *' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder={role === 'collector' ? 'collector.idk@kerala.gov.in' : role === 'rescue_team' ? 'ndrf.kerala@gov.in' : 'name@example.com'}
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.email ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                        }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Password & Confirm Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-[#059669]" />
                    <span>Password <span className="text-red-500">*</span></span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      value={formData.password}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      className={`w-full pl-3 pr-9 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.password ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{errors.password}</span>
                    </p>
                  ) : isPasswordFocused ? (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1 animate-fadeIn">
                      💡 Use 8 or more characters with letters, numbers & symbols
                    </p>
                  ) : null}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                      }}
                      className={`w-full pl-3 pr-9 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.confirmPassword ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{errors.confirmPassword}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* District & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    District <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      <option value="Idukki">Idukki</option>
                      <option value="Wayanad">Wayanad</option>
                      <option value="Ernakulam">Ernakulam</option>
                      <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                      <option value="Kozhikode">Kozhikode</option>
                      <option value="Thrissur">Thrissur</option>
                      <option value="Palakkad">Palakkad</option>
                      <option value="Kottayam">Kottayam</option>
                    </select>
                  </div>
                </div>

                {role === 'citizen' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Panchayat / Municipality <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Munnar / Aluva"
                      value={formData.panchayat}
                      onChange={(e) => {
                        setFormData({ ...formData, panchayat: e.target.value });
                        if (errors.panchayat) setErrors({ ...errors, panchayat: undefined });
                      }}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.panchayat ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                        }`}
                    />
                    {errors.panchayat && (
                      <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{errors.panchayat}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official Title / Rank
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={role === 'collector' ? 'District Collector & Magistrate' : 'NDRF / Fire Rescue Commander'}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Role Specific Employee Code Field for Rescue Team & Collector */}
              {role !== 'citizen' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {role === 'collector' ? 'IAS / Collectorate Official Code *' : 'NDRF / Rescue Team Badge ID *'}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={role === 'collector' ? 'e.g. KLA-IAS-2026-09' : 'e.g. NDRF-4BN-8820'}
                      value={formData.departmentId}
                      onChange={(e) => {
                        setFormData({ ...formData, departmentId: e.target.value });
                        if (errors.departmentId) setErrors({ ...errors, departmentId: undefined });
                      }}
                      className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${errors.departmentId ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400' : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                        }`}
                    />
                  </div>
                  {errors.departmentId && (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{errors.departmentId}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Terms Checkbox */}
              <div>
                <div className="flex items-start gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.termsAccepted}
                    onChange={(e) => {
                      setFormData({ ...formData, termsAccepted: e.target.checked });
                      if (errors.termsAccepted) setErrors({ ...errors, termsAccepted: undefined });
                    }}
                    className="mt-0.5 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-600 font-medium">
                    I hereby confirm the information provided is accurate for disaster alert & emergency response database. <span className="text-red-500">*</span>
                  </label>
                </div>
                {errors.termsAccepted && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{errors.termsAccepted}</span>
                  </p>
                )}
              </div>

              {/* Clean "Register" Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3.5 rounded-xl text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 ${role === 'collector'
                      ? 'bg-[#043e2e] hover:bg-[#032e22]'
                      : role === 'rescue_team'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-[#059669] hover:bg-[#047857]'
                    }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Registering...' : 'Register'}</span>
                </button>
              </div>

              {/* Sign up with Google (Only for Citizen Registration) */}
              {role === 'citizen' && (
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
                    onClick={() => setSubmitted(true)}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300/90 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2.5 hover:shadow-sm"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign up with Google</span>
                  </button>
                </>
              )}

            </form>
          )}

          {/* Bottom link to Login */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600 font-medium flex items-center justify-center gap-2">
            <span>Already have an account?</span>
            <button
              onClick={onNavigateToLogin}
              className="font-extrabold text-[#059669] hover:underline flex items-center gap-1"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
