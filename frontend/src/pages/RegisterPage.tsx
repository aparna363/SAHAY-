import React, { useState, useEffect } from 'react';
import { User, CheckCircle2, Phone, Mail, MapPin, ArrowRight, UserPlus, AlertCircle, Eye, EyeOff, Lock, Building2 } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { registerUser, getDistricts, type UserRole } from '../services/api';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

interface RegisterPageProps {
  currentLang: Language;
  initialRole?: 'citizen' | 'official' | UserRole;
  onNavigateToLogin: () => void;
  onOpenOfficialLogin?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  initialRole = 'citizen',
  onNavigateToLogin,
  onOpenOfficialLogin,
}) => {
  const role: UserRole = (initialRole === 'official' ? 'station' : initialRole) as UserRole;
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [districtsList, setDistrictsList] = useState<string[]>([]);

  // Fetch district list from PostgreSQL database table
  useEffect(() => {
    getDistricts().then((data) => {
      setDistrictsList(data);
      if (data.length > 0 && !formData.district) {
        setFormData((prev) => ({ ...prev, district: data[0] }));
      }
    });
  }, []);

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

        {/* Dedicated Public Citizen Registration Header */}
        <div className="bg-emerald-50/50 py-3 px-6 border-b border-emerald-100 text-center">
          <h3 className="text-sm font-extrabold text-emerald-900 uppercase tracking-wider">
            Public Citizen Registration
          </h3>
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
                    placeholder="e.g. Rajesh Nair"
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
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="name@example.com"
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
                      {districtsList.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
              </div>

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
                  className="w-full py-3.5 rounded-xl text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857]"
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

                  <GoogleAuthButton
                    mode="register"
                    label="Sign up with Google"
                    onSuccess={() => {
                      setSubmitted(true);
                    }}
                    onError={(err) => setServerError(err)}
                  />
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

          {/* Official Station Sign Up Access Banner */}
          {onOpenOfficialLogin && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onOpenOfficialLogin}
                className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>Station Duty Registration & Officer Sign-Up →</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
