import React, { useState, useEffect } from 'react';
import {
  User, Phone, Mail, MapPin, Save, CheckCircle2, ArrowLeft, KeyRound, Lock,
  ShieldCheck, AlertCircle, Eye, EyeOff, HeartHandshake, Stethoscope, Shield,
  Edit3, X, Users
} from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { resetPassword, getDistricts } from '../services/api';

interface ProfileSettingsPageProps {
  currentLang: Language;
  user: any;
  onUpdateUser: (updatedUser: any) => void;
  onBack: () => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  user,
  onUpdateUser,
  onBack,
}) => {
  // Edit mode toggle: false = Completed Profile View, true = Edit Mode Form
  const isProfileIncomplete = !user?.name || user?.name === '--------' || !user?.phone || user?.phone === '7000000000';
  const [isEditMode, setIsEditMode] = useState<boolean>(isProfileIncomplete);

  // Personal Info state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  // Email is strictly read-only (Primary ID)
  const email = user?.email || 'registered_user@sahay.kerala.gov.in';
  const [district, setDistrict] = useState(user?.district || 'Idukki');
  const [panchayat, setPanchayat] = useState(user?.panchayat || '');
  const [designation] = useState(user?.designation || '');
  const [departmentId] = useState(user?.departmentId || user?.department_id || '');
  const [districtsList, setDistrictsList] = useState<string[]>([]);

  // Emergency & Disaster Assistance state
  const [emergencyContactName, setEmergencyContactName] = useState(user?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.emergencyContactPhone || '');
  const [emergencyRelation, setEmergencyRelation] = useState(user?.emergencyRelation || 'Family Member');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [specialAssistance, setSpecialAssistance] = useState(user?.specialAssistance || 'None');
  const [alertLanguage, setAlertLanguage] = useState(user?.alertLanguage || 'English');

  // Family Household state
  const [familyMembersCount, setFamilyMembersCount] = useState<number>(user?.familyMembersCount || 4);
  const [childrenCount, setChildrenCount] = useState<number>(user?.childrenCount || 0);
  const [seniorCitizensCount, setSeniorCitizensCount] = useState<number>(user?.seniorCitizensCount || 0);
  const [nearestReliefCamp, setNearestReliefCamp] = useState<string>(user?.nearestReliefCamp || '');

  // Touched states for live validation
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Password Change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    getDistricts().then((data) => {
      setDistrictsList(data);
    });
  }, []);

  // --------------------------------------------------------------------------
  // Live Validation Functions
  // --------------------------------------------------------------------------
  const getProfileErrors = () => {
    const errors: {
      name?: string;
      phone?: string;
      panchayat?: string;
      emergencyContactName?: string;
      emergencyPhone?: string;
    } = {};

    // 1. Name Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Full Name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Full Name must be at least 2 characters long';
    } else if (/^[-_.\s]+$/.test(trimmedName) || /---|___|\.\.\./.test(trimmedName) || !/[a-zA-Z]/.test(trimmedName)) {
      errors.name = 'Please enter a valid full name with real letters. Dummy patterns like "--------" are not allowed.';
    }

    // 2. Mobile Phone Validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.phone = 'Mobile Phone Number is required for Emergency SMS Alerts';
    } else if (cleanPhone.length !== 10) {
      errors.phone = 'Mobile Phone Number must be exactly 10 numeric digits';
    } else if (!/^[6-9]/.test(cleanPhone)) {
      errors.phone = 'Mobile number must start with 6, 7, 8, or 9';
    } else if (
      /^(\d)\1{9}$/.test(cleanPhone) ||
      /^(6|7|8|9)0{9}$/.test(cleanPhone) ||
      cleanPhone.endsWith('000000') ||
      cleanPhone === '1234567890' ||
      cleanPhone === '9876543210'
    ) {
      errors.phone = 'Fake or dummy phone numbers (e.g. 7000000000) are not allowed. Please enter a valid mobile number.';
    }

    // 3. Panchayat Location Validation
    const trimmedPanchayat = panchayat.trim();
    if (!trimmedPanchayat) {
      errors.panchayat = 'Panchayat / Municipality location is required for geo-targeted disaster alerts';
    } else if (/^[-_.\s]+$/.test(trimmedPanchayat) || /---|___|\.\.\./.test(trimmedPanchayat) || !/[a-zA-Z0-9]/.test(trimmedPanchayat)) {
      errors.panchayat = 'Please enter a valid location name. Dummy patterns like "--------" are not allowed.';
    }

    // 4. Emergency Contact Name Validation (Required Field)
    const trimmedEmName = emergencyContactName.trim();
    if (!trimmedEmName) {
      errors.emergencyContactName = 'Emergency Contact Name is required for high-risk SOS evacuations';
    } else if (trimmedEmName.length < 2) {
      errors.emergencyContactName = 'Emergency Contact Name must be at least 2 characters long';
    } else if (/^[-_.\s]+$/.test(trimmedEmName) || /---|___|\.\.\./.test(trimmedEmName) || !/[a-zA-Z]/.test(trimmedEmName)) {
      errors.emergencyContactName = 'Emergency Contact Name must contain real letters (e.g. "Rahul Sharma"). Dummy patterns like "--------" are not allowed.';
    }

    // 5. Emergency Contact Phone Validation (Required Field)
    const cleanEmPhone = emergencyContactPhone.replace(/\D/g, '');
    if (!cleanEmPhone) {
      errors.emergencyPhone = 'Emergency Contact Phone is required for SOS rescue team dispatch';
    } else if (cleanEmPhone.length !== 10) {
      errors.emergencyPhone = 'Emergency Contact Phone must be a valid 10-digit mobile number';
    } else if (!/^[6-9]/.test(cleanEmPhone)) {
      errors.emergencyPhone = 'Emergency Contact Phone must start with 6, 7, 8, or 9';
    } else if (
      /^(\d)\1{9}$/.test(cleanEmPhone) ||
      /^(6|7|8|9)0{9}$/.test(cleanEmPhone) ||
      cleanEmPhone.endsWith('000000') ||
      cleanEmPhone === '1234567890' ||
      cleanEmPhone === '9876543210'
    ) {
      errors.emergencyPhone = 'Fake or dummy emergency phone numbers (e.g. 7000000000) are not allowed.';
    }

    return errors;
  };

  const profileErrors = getProfileErrors();
  const isProfileValid = Object.keys(profileErrors).length === 0;

  // Password Strong Rules Check
  const passChecks = {
    length: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(newPassword),
    noSpaceOrFiller: newPassword.length > 0 && !newPassword.includes(' ') && !/---|___|\.\.\./.test(newPassword)
  };

  const isPasswordValid =
    passChecks.length &&
    passChecks.hasUpper &&
    passChecks.hasLower &&
    passChecks.hasNumber &&
    passChecks.hasSymbol &&
    passChecks.noSpaceOrFiller;

  const isConfirmMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------
  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleCancelEdit = () => {
    // Revert form values to saved user profile
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setDistrict(user?.district || 'Idukki');
    setPanchayat(user?.panchayat || '');
    setEmergencyContactName(user?.emergencyContactName || '');
    setEmergencyContactPhone(user?.emergencyContactPhone || '');
    setEmergencyRelation(user?.emergencyRelation || 'Family Member');
    setBloodGroup(user?.bloodGroup || 'O+');
    setSpecialAssistance(user?.specialAssistance || 'None');
    setAlertLanguage(user?.alertLanguage || 'English');
    setFamilyMembersCount(user?.familyMembersCount || 4);
    setChildrenCount(user?.childrenCount || 0);
    setSeniorCitizensCount(user?.seniorCitizensCount || 0);
    setNearestReliefCamp(user?.nearestReliefCamp || '');
    setTouched({});
    setIsEditMode(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched on submit
    setTouched({
      name: true,
      phone: true,
      panchayat: true,
      emergencyContactName: true,
      emergencyPhone: true
    });

    if (!isProfileValid) return;

    const updated = {
      ...user,
      name: name.trim(),
      phone: phone.trim(),
      district,
      panchayat: panchayat.trim(),
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      emergencyRelation,
      bloodGroup,
      specialAssistance,
      alertLanguage,
      familyMembersCount,
      childrenCount,
      seniorCitizensCount,
      nearestReliefCamp: nearestReliefCamp.trim(),
    };

    onUpdateUser(updated);
    setSaveSuccess(true);
    setIsEditMode(false);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);
    setPassError(null);

    if (!isPasswordValid) {
      setPassError('Please ensure your new password meets all strong password security requirements.');
      return;
    }

    if (!isConfirmMatch) {
      setPassError('New Password and Confirm Password do not match.');
      return;
    }

    try {
      setIsUpdatingPass(true);
      const response = await resetPassword({
        phoneOrEmail: user?.phone || user?.email || phone,
        newPassword: newPassword,
      });

      setPassMessage(response.message || 'Password updated successfully! Next time sign in with your new password.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  return (
    <div
      className="relative min-h-[90vh] py-10 px-4 sm:px-6 lg:px-8 bg-slate-900 bg-cover bg-center bg-no-repeat animate-fadeIn"
      style={{
        backgroundImage: `url(${loginBg})`,
      }}
    >
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/70 to-slate-950/90 backdrop-brightness-[0.8]" />

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center shadow-xs"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900">Profile & Security Settings</h1>
              <p className="text-xs text-slate-500 font-semibold">
                Manage your SAHAY portal account credentials, emergency contacts & alert location
              </p>
            </div>
          </div>

          <div className="max-w-[160px] hidden sm:block">
            <img
              src={fullLogoSahay}
              alt="SAHAY"
              className="w-full h-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/full_logo_sahay.png'; }}
            />
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Your profile details have been updated successfully!</span>
          </div>
        )}

        {/* Main Form Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/80 p-6 sm:p-8 space-y-8">

          {/* User Badge Top Banner with SINGLE EDIT PROFILE Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#043e2e] text-amber-400 font-black text-2xl flex items-center justify-center shadow-md">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-center sm:text-left space-y-1 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg font-black text-slate-900">{name || 'User Profile'}</h2>
                <span className="px-2.5 py-0.5 bg-emerald-800 text-amber-300 text-[10px] font-black uppercase rounded-md shadow-2xs">
                  {user?.role || 'Citizen'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Registered Phone: <strong className="text-slate-900">{phone || 'N/A'}</strong> • Family Members: <strong className="text-slate-900">{familyMembersCount}</strong>
              </p>
              <div className="text-[11px] text-slate-500 font-semibold flex items-center justify-center sm:justify-start gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Primary Email: </span>
                <span className="font-bold text-slate-700">{email}</span>
              </div>
            </div>

            {/* SINGLE EDIT PROFILE Action Button */}
            {!isEditMode && (
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-md transition-all flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* MODE 1: Completed Profile View (Read-Only Summary) */}
          {/* ========================================================================= */}
          {!isEditMode ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                  <span>Completed Profile Overview</span>
                </div>
              </div>

              {/* Grid 1: Personal Information Card */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 text-[#059669]">
                  <User className="w-4 h-4" />
                  <span>Personal Information</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Full Name:</span>
                    <span className="font-extrabold text-slate-900 text-sm">{name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Mobile Phone (Emergency SMS):</span>
                    <span className="font-extrabold text-slate-900 text-sm">{phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Primary Email:</span>
                    <span className="font-extrabold text-slate-900">{email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">District & Location:</span>
                    <span className="font-extrabold text-slate-900">{district} District ({panchayat || 'N/A'})</span>
                  </div>
                </div>

                {designation && (
                  <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-amber-800 font-bold block mb-0.5">Official Designation:</span>
                      <span className="font-black text-amber-950">{designation}</span>
                    </div>
                    {departmentId && (
                      <div>
                        <span className="text-amber-800 font-bold block mb-0.5">Badge / Service ID:</span>
                        <span className="font-black text-amber-950">{departmentId}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grid 2: Family Household Details */}
              <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Family Household Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Total Family Members:</span>
                    <span className="font-extrabold text-slate-900 text-sm">{familyMembersCount} Persons</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Children (&lt;12 yrs):</span>
                    <span className="font-extrabold text-slate-900 text-sm">{childrenCount} Children</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Seniors (&gt;60 yrs):</span>
                    <span className="font-extrabold text-slate-900 text-sm">{seniorCitizensCount} Seniors</span>
                  </div>
                </div>

                {nearestReliefCamp && (
                  <div className="pt-2 border-t border-amber-200/60 text-xs">
                    <span className="text-slate-500 font-bold block mb-0.5">Nearest Relief Shelter Landmark:</span>
                    <span className="font-extrabold text-emerald-900">{nearestReliefCamp}</span>
                  </div>
                )}
              </div>

              {/* Grid 3: Emergency Contact Card */}
              <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-red-800 uppercase tracking-wider flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-red-600" />
                  <span>Emergency Contact & Next of Kin</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Emergency Contact Name:</span>
                    <span className="font-extrabold text-slate-900">{emergencyContactName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Relationship:</span>
                    <span className="font-extrabold text-slate-900">{emergencyRelation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Emergency Phone:</span>
                    <span className="font-extrabold text-slate-900">{emergencyContactPhone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Grid 4: Evacuation & Medical Profile Card */}
              <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#059669]" />
                  <span>Evacuation & Medical Profile</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Blood Group:</span>
                    <span className="font-extrabold text-emerald-900">{bloodGroup}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">Special Assistance:</span>
                    <span className="font-extrabold text-slate-900">{specialAssistance}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block mb-0.5">SMS Alert Language:</span>
                    <span className="font-extrabold text-slate-900">{alertLanguage}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* MODE 2: Edit Profile Form (Editable with Live Validations) */
            /* ========================================================================= */
            <form onSubmit={handleSaveProfile} className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#059669]" />
                  <span>Edit Profile Information</span>
                </h3>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>

              {/* Section 1: Personal Information */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#059669]" /> Personal Information
                </h4>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onBlur={() => markTouched('name')}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!touched.name) markTouched('name');
                      }}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        touched.name && profileErrors.name
                          ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400 text-red-900'
                          : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                  </div>
                  {touched.name && profileErrors.name && (
                    <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{profileErrors.name}</span>
                    </p>
                  )}
                </div>

                {/* Phone & Email (Email Read-Only) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Phone (For Emergency SMS) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onBlur={() => markTouched('phone')}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (!touched.phone) markTouched('phone');
                        }}
                        placeholder="10-digit mobile number"
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                          touched.phone && profileErrors.phone
                            ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400 text-red-900'
                            : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                        }`}
                      />
                    </div>
                    {touched.phone && profileErrors.phone && (
                      <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{profileErrors.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Email Address - Clean Read-Only */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        readOnly
                        disabled
                        value={email}
                        className="w-full pl-10 pr-4 py-3 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed select-none focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* District & Panchayat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* District */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">District *</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                      >
                        {districtsList.map((d) => (
                          <option key={d} value={d}>
                            {d} District
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Panchayat */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Panchayat / Municipality *
                    </label>
                    <input
                      type="text"
                      value={panchayat}
                      onBlur={() => markTouched('panchayat')}
                      onChange={(e) => {
                        setPanchayat(e.target.value);
                        if (!touched.panchayat) markTouched('panchayat');
                      }}
                      placeholder="e.g. Munnar / Aluva / Elappara"
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        touched.panchayat && profileErrors.panchayat
                          ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400 text-red-900'
                          : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    {touched.panchayat && profileErrors.panchayat && (
                      <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{profileErrors.panchayat}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Official Designation if present (Official Roles) */}
                {designation && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span>Official Authority Credentials (Read-Only)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Designation</label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={designation}
                          className="w-full px-3.5 py-2.5 bg-white/80 border border-amber-200 rounded-xl text-xs font-bold text-amber-950 cursor-not-allowed"
                        />
                      </div>
                      {departmentId && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Employee Badge / Service ID</label>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={departmentId}
                            className="w-full px-3.5 py-2.5 bg-white/80 border border-amber-200 rounded-xl text-xs font-bold text-amber-950 cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Family Household Details */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600" /> Family Household Details
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Helps SAHAY disaster teams allocate proper food ration kits, milk, and rescue capacity.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Family Members Count */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Family Members *</label>
                    <select
                      value={familyMembersCount}
                      onChange={(e) => setFamilyMembersCount(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} Person{n > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Children Under 12 Yrs */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Children (&lt;12 Yrs)</label>
                    <select
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} Child{n !== 1 ? 'ren' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Senior Citizens Above 60 Yrs */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Seniors (&gt;60 Yrs)</label>
                    <select
                      value={seniorCitizensCount}
                      onChange={(e) => setSeniorCitizensCount(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} Senior{n !== 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nearest Relief Camp Landmark */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nearest Relief Shelter / Camp Landmark</label>
                  <input
                    type="text"
                    value={nearestReliefCamp}
                    onChange={(e) => setNearestReliefCamp(e.target.value)}
                    placeholder="e.g. Munnar Govt Higher Secondary School Relief Camp"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>

              {/* Section 3: Emergency Contact & Next of Kin */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-red-600" /> Emergency Contact & Next of Kin
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    SAHAY Disaster Rescue Teams use this contact during high-risk SOS evacuations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Contact Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Name *</label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onBlur={() => markTouched('emergencyContactName')}
                      onChange={(e) => {
                        setEmergencyContactName(e.target.value);
                        if (!touched.emergencyContactName) markTouched('emergencyContactName');
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                        touched.emergencyContactName && profileErrors.emergencyContactName
                          ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400 text-red-900'
                          : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    {touched.emergencyContactName && profileErrors.emergencyContactName && (
                      <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{profileErrors.emergencyContactName}</span>
                      </p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Relationship *</label>
                    <select
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      <option value="Family Member">Family Member</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Child">Child</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Relative">Relative</option>
                      <option value="Friend">Friend / Neighbor</option>
                    </select>
                  </div>

                  {/* Emergency Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Phone *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={emergencyContactPhone}
                        onBlur={() => markTouched('emergencyPhone')}
                        onChange={(e) => {
                          setEmergencyContactPhone(e.target.value);
                          if (!touched.emergencyPhone) markTouched('emergencyPhone');
                        }}
                        placeholder="10-digit mobile number"
                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                          touched.emergencyPhone && profileErrors.emergencyPhone
                            ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400 text-red-900'
                            : 'border-slate-200 focus:ring-2 focus:ring-[#059669]'
                        }`}
                      />
                    </div>
                    {touched.emergencyPhone && profileErrors.emergencyPhone && (
                      <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{profileErrors.emergencyPhone}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Evacuation & Medical Emergency Profile */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#059669]" /> Evacuation & Medical Profile
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Helps NDRF & Fire Force prioritize specialized medical aid and wheelchair transport during evacuations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Blood Group */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      <option value="A+">A+ (A Positive)</option>
                      <option value="A-">A- (A Negative)</option>
                      <option value="B+">B+ (B Positive)</option>
                      <option value="B-">B- (B Negative)</option>
                      <option value="O+">O+ (O Positive)</option>
                      <option value="O-">O- (O Negative)</option>
                      <option value="AB+">AB+ (AB Positive)</option>
                      <option value="AB-">AB- (AB Negative)</option>
                    </select>
                  </div>

                  {/* Evacuation Special Assistance */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Special Assistance Needed</label>
                    <select
                      value={specialAssistance}
                      onChange={(e) => setSpecialAssistance(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      <option value="None">None (Standard Evacuation)</option>
                      <option value="Elderly">Senior Citizen / Elderly Person</option>
                      <option value="Mobility Impaired">Wheelchair / Mobility Impaired</option>
                      <option value="Medical Oxygen">Medical Oxygen / Critical Care Patient</option>
                      <option value="Visually/Hearing Impaired">Visually or Hearing Impaired</option>
                    </select>
                  </div>

                  {/* SMS Alert Language */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Disaster Alert Language</label>
                    <select
                      value={alertLanguage}
                      onChange={(e) => setAlertLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      <option value="English">English SMS & Push</option>
                      <option value="Malayalam">Malayalam (മലയാളം SMS)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons: Save Profile Changes & Cancel */}
              <div className="pt-3 flex flex-wrap items-center justify-end gap-3">
                {!isProfileIncomplete && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!isProfileValid}
                  className="px-8 py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* Section 4: Security & Password Update (Create New Password) */}
          {/* ========================================================================= */}
          <form onSubmit={handlePasswordChange} className="space-y-4 pt-6 border-t border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <span>Create New Account Password</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                Choose a strong password with at least 8 characters, uppercase, lowercase, numbers, and special symbols (@, #, $, etc.).
              </p>
            </div>

            {passMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{passMessage}</span>
              </div>
            )}

            {passError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, e.g. Pass@2026"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

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

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Match indicator badge */}
                {confirmPassword.length > 0 && (
                  <div className="mt-2.5">
                    {isConfirmMatch ? (
                      <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Passwords match successfully</span>
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span>Passwords do not match</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Update Password Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={!isPasswordValid || !isConfirmMatch || isUpdatingPass}
                className="px-8 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isUpdatingPass ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
