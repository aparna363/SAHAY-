import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Building2,
  Loader2,
  Check,
  AlertTriangle
} from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { registerUser, getDistricts, checkAuthAvailability, type UserRole } from '../services/api';
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

  // Field focus states
  const [activeField, setActiveField] = useState<string | null>(null);

  // Input element refs for focusing one by one
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const panchayatRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  // Single active error field (for one-by-one sequential validation)
  const [focusedErrorField, setFocusedErrorField] = useState<string | null>(null);

  // Duplicate Check States
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null); // true = unique, false = existing
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null); // true = unique, false = existing

  // Debounce timer refs
  const phoneTimerRef = useRef<any>(null);
  const emailTimerRef = useRef<any>(null);

  // Fetch districts list
  useEffect(() => {
    getDistricts().then((data) => {
      setDistrictsList(data);
      if (data.length > 0 && !formData.district) {
        setFormData((prev) => ({ ...prev, district: data[0] }));
      }
    });

    return () => {
      if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current);
    };
  }, []);

  // --- LIVE VALIDATION STATUS FOR EACH FIELD ---

  // 1. Full Name
  const nameTrimmed = formData.name.trim();
  const isNameEmpty = formData.name.length === 0;
  const isNameValid = nameTrimmed.length >= 3 && /^[a-zA-Z\s.']+$/.test(nameTrimmed);
  const nameError = !isNameEmpty && !isNameValid
    ? nameTrimmed.length < 3
      ? 'Name must be at least 3 characters'
      : 'Name should contain letters only'
    : focusedErrorField === 'name' && isNameEmpty
    ? 'Full Name is required'
    : null;

  // 2. Mobile Phone
  const cleanPhone = formData.phone.replace(/\D/g, '');
  const isPhoneEmpty = formData.phone.length === 0;
  const isPhoneFormatValid = cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone);
  const phoneFormatError = !isPhoneEmpty && cleanPhone.length > 0 && !isPhoneFormatValid
    ? cleanPhone.length < 10
      ? `Enter 10 digits (${cleanPhone.length}/10)`
      : !/^[6-9]/.test(cleanPhone)
      ? 'Number must start with 6, 7, 8, or 9'
      : 'Invalid phone format'
    : focusedErrorField === 'phone' && isPhoneEmpty
    ? 'Mobile Phone Number is required'
    : null;

  // 3. Email
  const emailTrimmed = formData.email.trim();
  const isEmailEmpty = emailTrimmed.length === 0;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailFormatValid = emailRegex.test(emailTrimmed);
  const emailFormatError = !isEmailEmpty && !isEmailFormatValid
    ? 'Please enter a valid email format (e.g. name@example.com)'
    : focusedErrorField === 'email' && role !== 'citizen' && isEmailEmpty
    ? 'Official Email is required'
    : null;

  // 4. Password
  const isPasswordEmpty = formData.password.length === 0;
  const isPasswordValid = formData.password.length >= 8;
  const passwordError = !isPasswordEmpty && !isPasswordValid
    ? `Password must be at least 8 characters (${formData.password.length}/8)`
    : focusedErrorField === 'password' && isPasswordEmpty
    ? 'Password is required'
    : null;

  // Password Strength Calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200', width: '0%' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-red-500', width: '25%' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500', width: '50%' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-blue-500', width: '75%' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-emerald-500', width: '100%' };
      default:
        return { score: 0, label: 'Very Weak', color: 'bg-red-400', width: '15%' };
    }
  };
  const passwordStrength = getPasswordStrength(formData.password);

  // 5. Confirm Password
  const isConfirmEmpty = formData.confirmPassword.length === 0;
  const isConfirmMatch = !isConfirmEmpty && formData.password === formData.confirmPassword;
  const confirmError = !isConfirmEmpty && !isConfirmMatch
    ? 'Passwords do not match yet'
    : focusedErrorField === 'confirmPassword' && isConfirmEmpty
    ? 'Confirm Password is required'
    : null;

  // 6. Panchayat
  const isPanchayatEmpty = formData.panchayat.trim().length === 0;
  const isPanchayatValid = formData.panchayat.trim().length >= 2;
  const panchayatError = focusedErrorField === 'panchayat' && role === 'citizen' && isPanchayatEmpty
    ? 'Panchayat or Municipality is required'
    : null;

  // 7. Terms
  const termsError = focusedErrorField === 'termsAccepted' && !formData.termsAccepted
    ? 'You must accept the registration terms'
    : null;

  // --- LIVE CHANGE HANDLERS WITH INSTANT DUPLICATE CHECKING ---

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({ ...prev, name: val }));
    if (focusedErrorField === 'name' && val.trim().length >= 3) {
      setFocusedErrorField(null);
    }
  };

  const handlePhoneChange = (val: string) => {
    const rawDigits = val.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: rawDigits }));

    if (focusedErrorField === 'phone' && rawDigits.length === 10) {
      setFocusedErrorField(null);
    }

    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);

    if (rawDigits.length !== 10 || !/^[6-9]\d{9}$/.test(rawDigits)) {
      setPhoneAvailable(null);
      setCheckingPhone(false);
      return;
    }

    // Trigger instant check for 10-digit number
    setCheckingPhone(true);
    setPhoneAvailable(null);

    phoneTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkAuthAvailability({ phone: rawDigits });
        setCheckingPhone(false);
        setPhoneAvailable(!res.phoneExists);
      } catch (err) {
        setCheckingPhone(false);
      }
    }, 300);
  };

  const handleEmailChange = (val: string) => {
    const trimmed = val.trim();
    setFormData((prev) => ({ ...prev, email: val }));

    if (focusedErrorField === 'email' && emailRegex.test(trimmed)) {
      setFocusedErrorField(null);
    }

    if (emailTimerRef.current) clearTimeout(emailTimerRef.current);

    if (!trimmed || !emailRegex.test(trimmed)) {
      setEmailAvailable(null);
      setCheckingEmail(false);
      return;
    }

    // Trigger instant check for valid email format
    setCheckingEmail(true);
    setEmailAvailable(null);

    emailTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkAuthAvailability({ email: trimmed });
        setCheckingEmail(false);
        setEmailAvailable(!res.emailExists);
      } catch (err) {
        setCheckingEmail(false);
      }
    }, 300);
  };

  const handlePasswordChange = (val: string) => {
    setFormData((prev) => ({ ...prev, password: val }));
    if (focusedErrorField === 'password' && val.length >= 8) {
      setFocusedErrorField(null);
    }
  };

  const handleConfirmPasswordChange = (val: string) => {
    setFormData((prev) => ({ ...prev, confirmPassword: val }));
    if (focusedErrorField === 'confirmPassword' && val === formData.password) {
      setFocusedErrorField(null);
    }
  };

  const handlePanchayatChange = (val: string) => {
    setFormData((prev) => ({ ...prev, panchayat: val }));
    if (focusedErrorField === 'panchayat' && val.trim().length >= 2) {
      setFocusedErrorField(null);
    }
  };

  const handleTermsChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, termsAccepted: checked }));
    if (focusedErrorField === 'termsAccepted' && checked) {
      setFocusedErrorField(null);
    }
  };

  // --- SUBMIT WITH ONE-BY-ONE FIELD VALIDATION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Step 1: Check Name
    if (!isNameValid) {
      setFocusedErrorField('name');
      nameRef.current?.focus();
      return;
    }

    // Step 2: Check Phone
    if (!isPhoneFormatValid) {
      setFocusedErrorField('phone');
      phoneRef.current?.focus();
      return;
    }

    if (checkingPhone) {
      setServerError('Please wait while verifying mobile number availability...');
      return;
    }

    if (phoneAvailable === false) {
      setFocusedErrorField('phone');
      phoneRef.current?.focus();
      return;
    }

    // Step 3: Check Email (if official or if entered)
    if (role !== 'citizen' && !isEmailFormatValid) {
      setFocusedErrorField('email');
      emailRef.current?.focus();
      return;
    }

    if (!isEmailEmpty && !isEmailFormatValid) {
      setFocusedErrorField('email');
      emailRef.current?.focus();
      return;
    }

    if (checkingEmail) {
      setServerError('Please wait while verifying email availability...');
      return;
    }

    if (emailAvailable === false) {
      setFocusedErrorField('email');
      emailRef.current?.focus();
      return;
    }

    // Step 4: Check Password
    if (!isPasswordValid) {
      setFocusedErrorField('password');
      passwordRef.current?.focus();
      return;
    }

    // Step 5: Check Confirm Password
    if (!isConfirmMatch) {
      setFocusedErrorField('confirmPassword');
      confirmPasswordRef.current?.focus();
      return;
    }

    // Step 6: Check Panchayat (for citizen)
    if (role === 'citizen' && !isPanchayatValid) {
      setFocusedErrorField('panchayat');
      panchayatRef.current?.focus();
      return;
    }

    // Step 7: Check Terms Checkbox
    if (!formData.termsAccepted) {
      setFocusedErrorField('termsAccepted');
      termsRef.current?.focus();
      return;
    }

    // All fields are valid -> Submit registration
    setFocusedErrorField(null);
    setIsSubmitting(true);
    try {
      await registerUser({
        name: formData.name.trim(),
        phone: cleanPhone,
        email: emailTrimmed || undefined,
        password: formData.password.trim(),
        role: role,
        district: formData.district,
        panchayat: formData.panchayat.trim(),
        designation:
          role === 'rescue_team'
            ? 'NDRF / Fire Rescue Specialist'
            : role === 'collector'
            ? 'District Collector & Magistrate'
            : 'Citizen',
        departmentId: formData.departmentId.trim() || undefined,
      });

      setSubmitted(true);
    } catch (err: any) {
      setServerError(err.message || 'Registration failed. Please check connection.');
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

      <div className="relative z-10 max-w-xl w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/80">
        {/* Seamless Header */}
        <div className="bg-emerald-50/90 border-b border-emerald-100 py-6 px-6 text-center relative">
          <div className="max-w-[200px] sm:max-w-[220px] mx-auto">
            <img
              src={fullLogoSahay}
              alt="SAHAY"
              className="w-full h-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/full_logo_sahay.png';
              }}
            />
          </div>
        </div>

        {/* Dedicated Public Citizen Registration Header */}
        <div className="bg-emerald-50/50 py-3 px-6 border-b border-emerald-100 text-center">
          <h3 className="text-sm font-extrabold text-emerald-900 uppercase tracking-wider">
            Public Citizen Registration
          </h3>
        </div>

        {/* Form Body or Success Confirmation */}
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
              <div className="w-16 h-16 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Registered Successfully!
              </h2>
              <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                Your citizen account is ready. You can now sign in to report incidents and receive real-time alerts.
              </p>
              <div className="pt-2">
                <button
                  onClick={onNavigateToLogin}
                  className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-sm font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center justify-center gap-2 max-w-xs mx-auto"
                >
                  <span>Sign In Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* FIELD 1: Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  {isNameValid && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 animate-fadeIn">
                      <Check className="w-3 h-3" /> Valid Name
                    </span>
                  )}
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={nameRef}
                    type="text"
                    placeholder="e.g. Rajesh Nair"
                    value={formData.name}
                    onFocus={() => setActiveField('name')}
                    onBlur={() => setActiveField(null)}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      nameError
                        ? 'border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400 text-red-900'
                        : isNameValid
                        ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                    }`}
                  />
                  {isNameValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {nameError && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              {/* FIELD 2 & 3: Mobile Phone & Email Address (with Instant Live Duplicate Detection) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mobile Phone Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Mobile Phone <span className="text-red-500">*</span>
                    </label>
                    {checkingPhone && (
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                        Checking...
                      </span>
                    )}
                    {phoneAvailable === true && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 animate-fadeIn">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={phoneRef}
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onFocus={() => setActiveField('phone')}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`w-full pl-9 pr-8 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        phoneAvailable === false || phoneFormatError
                          ? 'border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400 text-red-900'
                          : phoneAvailable === true
                          ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    {checkingPhone ? (
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : phoneAvailable === true ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : phoneAvailable === false || phoneFormatError ? (
                      <AlertCircle className="w-4 h-4 text-red-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : null}
                  </div>

                  {/* Live Mobile Validation Feedback */}
                  {phoneAvailable === false ? (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
                      <span>Already registered mobile number! Please log in.</span>
                    </p>
                  ) : phoneFormatError ? (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{phoneFormatError}</span>
                    </p>
                  ) : phoneAvailable === true ? (
                    <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1 animate-fadeIn">
                      <Check className="w-3 h-3 flex-shrink-0" />
                      <span>Mobile number is available</span>
                    </p>
                  ) : null}
                </div>

                {/* Email Address Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Email Address {role !== 'citizen' && <span className="text-red-500">*</span>}
                    </label>
                    {checkingEmail && (
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                        Checking...
                      </span>
                    )}
                    {emailAvailable === true && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 animate-fadeIn">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={emailRef}
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onFocus={() => setActiveField('email')}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={`w-full pl-9 pr-8 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        emailAvailable === false || emailFormatError
                          ? 'border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400 text-red-900'
                          : emailAvailable === true
                          ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    {checkingEmail ? (
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : emailAvailable === true ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : emailAvailable === false || emailFormatError ? (
                      <AlertCircle className="w-4 h-4 text-red-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    ) : null}
                  </div>

                  {/* Live Email Validation Feedback */}
                  {emailAvailable === false ? (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
                      <span>Already registered email ID! Please log in.</span>
                    </p>
                  ) : emailFormatError ? (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{emailFormatError}</span>
                    </p>
                  ) : emailAvailable === true ? (
                    <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1 animate-fadeIn">
                      <Check className="w-3 h-3 flex-shrink-0" />
                      <span>Email ID is available</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* FIELD 4 & 5: Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-[#059669]" />
                      <span>Password <span className="text-red-500">*</span></span>
                    </label>
                    {formData.password.length >= 8 && (
                      <span className={`text-[10px] font-black uppercase ${
                        passwordStrength.score >= 3 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      value={formData.password}
                      onFocus={() => setActiveField('password')}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className={`w-full pl-3 pr-9 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        passwordError
                          ? 'border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400'
                          : isPasswordValid
                          ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Bar */}
                  {formData.password.length > 0 && (
                    <div className="mt-1.5 space-y-1 animate-fadeIn">
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: passwordStrength.width }}
                        />
                      </div>
                    </div>
                  )}

                  {passwordError ? (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{passwordError}</span>
                    </p>
                  ) : activeField === 'password' ? (
                    <p className="text-[10px] text-emerald-700 font-semibold mt-1 animate-fadeIn">
                      💡 Use 8+ characters with letters & numbers
                    </p>
                  ) : null}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    {isConfirmMatch && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 animate-fadeIn">
                        <Check className="w-3 h-3" /> Matches
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      ref={confirmPasswordRef}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onFocus={() => setActiveField('confirmPassword')}
                      onBlur={() => setActiveField(null)}
                      onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                      className={`w-full pl-3 pr-9 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        confirmError
                          ? 'border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400'
                          : isConfirmMatch
                          ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                          : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{confirmError}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* FIELD 6: District & Panchayat */}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Panchayat / Municipality <span className="text-red-500">*</span>
                    </label>
                    {isPanchayatValid && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 animate-fadeIn">
                        <Check className="w-3 h-3" /> Valid
                      </span>
                    )}
                  </div>
                  <input
                    ref={panchayatRef}
                    type="text"
                    placeholder="e.g. Munnar / Aluva"
                    value={formData.panchayat}
                    onFocus={() => setActiveField('panchayat')}
                    onBlur={() => setActiveField(null)}
                    onChange={(e) => handlePanchayatChange(e.target.value)}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                      panchayatError
                        ? 'border-red-400 bg-red-50/40 focus:ring-2 focus:ring-red-400'
                        : isPanchayatValid
                        ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500'
                        : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                    }`}
                  />
                  {panchayatError && (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{panchayatError}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* FIELD 7: Terms Checkbox */}
              <div>
                <div className="flex items-start gap-2 pt-2">
                  <input
                    ref={termsRef}
                    type="checkbox"
                    id="terms"
                    checked={formData.termsAccepted}
                    onChange={(e) => handleTermsChange(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-600 font-medium cursor-pointer">
                    I hereby confirm the information provided is accurate for disaster alert & emergency response database. <span className="text-red-500">*</span>
                  </label>
                </div>
                {termsError && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{termsError}</span>
                  </p>
                )}
              </div>

              {/* Clean "Register" Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || checkingPhone || checkingEmail}
                  className="w-full py-3.5 rounded-xl text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] active:scale-[0.99] disabled:opacity-80"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : checkingPhone || checkingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking Availability...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Register</span>
                    </>
                  )}
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
