import React, { useState } from 'react';
import { User, Phone, Mail, MapPin, Save, CheckCircle2, ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import fullLogoSahay from '../assets/full_logo_sahay.png';
import loginBg from '../assets/loginbg.jpg';
import type { Language } from '../translations';
import { resetPassword } from '../services/api';

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
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [district, setDistrict] = useState(user?.district || 'Idukki');
  const [panchayat, setPanchayat] = useState(user?.panchayat || '');
  const [designation] = useState(user?.designation || '');
  const [departmentId] = useState(user?.departmentId || user?.department_id || '');

  // Password Change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...user,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      district,
      panchayat: panchayat.trim(),
    };
    onUpdateUser(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);
    setPassError(null);

    if (!newPassword.trim()) {
      setPassError('New password cannot be empty or spaces only');
      return;
    }
    if (newPassword.trim().length < 6) {
      setPassError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match');
      return;
    }

    try {
      const response = await resetPassword({
        phoneOrEmail: user?.phone || user?.email || phone,
        newPassword: newPassword.trim(),
      });

      setPassMessage(response.message || 'Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
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
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900">Profile & Security Settings</h1>
              <p className="text-xs text-slate-500 font-semibold">
                Manage your SAHAY portal account credentials & alert location
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
            <span>Your profile settings have been updated successfully!</span>
          </div>
        )}

        {/* Profile Card & Form */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/80 p-8 space-y-8">
          
          {/* User Badge Top Banner */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-emerald-50/80 border border-emerald-100 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#043e2e] text-amber-400 font-black text-2xl flex items-center justify-center shadow-md">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg font-black text-slate-900">{name || 'User Profile'}</h2>
                <span className="px-2.5 py-0.5 bg-emerald-800 text-amber-300 text-[10px] font-black uppercase rounded-md">
                  {user?.role || 'Citizen'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Registered Phone: <strong>{phone || 'N/A'}</strong> • District: <strong>{district}</strong>
              </p>
            </div>
          </div>

          {/* Section 1: Profile Information */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#059669]" />
              <span>Personal Information</span>
            </h3>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone (For Emergency SMS)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* District & Panchayat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Panchayat / Municipality</label>
                <input
                  type="text"
                  value={panchayat}
                  onChange={(e) => setPanchayat(e.target.value)}
                  placeholder="e.g. Munnar / Aluva"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                />
              </div>
            </div>

            {/* Official Designation if present */}
            {designation && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Designation</label>
                  <input
                    type="text"
                    readOnly
                    value={designation}
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                  />
                </div>
                {departmentId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Employee Badge / Service ID</label>
                    <input
                      type="text"
                      readOnly
                      value={departmentId}
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>

          {/* Section 2: Security & Password Update */}
          <form onSubmit={handlePasswordChange} className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>Update Account Password</span>
            </h3>

            {passMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{passMessage}</span>
              </div>
            )}

            {passError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold animate-fadeIn">
                <span>{passError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
