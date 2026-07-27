import React, { useState } from 'react';
import { User, ShieldCheck, CheckCircle2, Phone, Mail, MapPin, KeyRound, ArrowRight, UserPlus } from 'lucide-react';
import logoSahay from '../assets/logo_sahay.png';
import type { Language } from '../translations';

interface RegisterPageProps {
  currentLang: Language;
  initialRole: 'citizen' | 'official';
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  initialRole,
  onNavigateToLogin,
}) => {
  const [role, setRole] = useState<'citizen' | 'official'>(initialRole);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    district: 'Idukki',
    panchayat: '',
    emergencyContact: '',
    designation: 'KSDMA Officer',
    departmentId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center animate-fadeIn">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80">
        
        {/* Header */}
        <div className="bg-[#043e2e] text-white p-8 text-center relative">
          <div className="w-16 h-16 rounded-full bg-white p-1 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <img 
              src={logoSahay} 
              alt="SAHAY Logo" 
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).src = '/logo_sahay.png'; }}
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {role === 'citizen' ? 'Citizen Registration' : 'Official Government Registration'}
          </h1>
          <p className="text-xs text-emerald-300 font-semibold mt-1">
            Government of Kerala — Disaster Alert & Emergency Response Portal
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="bg-emerald-50 p-2.5 border-b border-emerald-100 flex gap-2">
          <button
            type="button"
            onClick={() => { setRole('citizen'); setSubmitted(false); }}
            className={`flex-1 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              role === 'citizen'
                ? 'bg-[#059669] text-white shadow-md'
                : 'text-slate-700 hover:bg-emerald-100/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen Portal</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('official'); setSubmitted(false); }}
            className={`flex-1 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              role === 'official'
                ? 'bg-[#043e2e] text-white shadow-md'
                : 'text-slate-700 hover:bg-emerald-100/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Official / Responder</span>
          </button>
        </div>

        {/* Form Body or Success Confirmation */}
        <div className="p-8">
          {submitted ? (
            <div className="text-center py-8 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Registration Successful!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
                {role === 'citizen'
                  ? 'Your citizen alert profile has been created. Emergency SMS alerts will be sent to your phone number.'
                  : 'Your official credentials have been submitted for verification by the KSDMA Nodal Officer.'}
              </p>
              <div className="pt-4">
                <button
                  onClick={onNavigateToLogin}
                  className="btn-primary px-8 py-3 text-xs font-bold"
                >
                  Proceed to Login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={role === 'citizen' ? 'e.g., Rajesh Nair' : 'e.g., Dr. Ananya Varma, IAS'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
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
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {role === 'official' ? 'Official Govt Email *' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required={role === 'official'}
                      placeholder={role === 'official' ? 'officer@kerala.gov.in' : 'name@example.com'}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* District & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      Panchayat / Municipality
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Munnar / Aluva"
                      value={formData.panchayat}
                      onChange={(e) => setFormData({ ...formData, panchayat: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official Designation <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    >
                      <option value="KSDMA Officer">KSDMA Control Room Officer</option>
                      <option value="District Collectorate">District Collectorate Official</option>
                      <option value="NDRF Commander">NDRF Response Unit Leader</option>
                      <option value="Fire Force Commander">Fire & Rescue Force Officer</option>
                      <option value="Irrigation Engineer">Dam Telemetry Engineer</option>
                      <option value="Medical Officer">Health Dept Emergency Doctor</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Role Specific Extra Field */}
              {role === 'official' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Government Employee / Service ID Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. KSDMA-2026-9941"
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2 pt-2">
                <input type="checkbox" required id="terms" className="mt-0.5 rounded border-slate-300 text-[#059669] focus:ring-[#059669]" />
                <label htmlFor="terms" className="text-[11px] text-slate-600 font-medium">
                  I hereby confirm the information provided is accurate for disaster alert & emergency response purposes.
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className={`w-full py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                    role === 'official' ? 'bg-[#043e2e] hover:bg-[#032e22]' : 'bg-[#059669] hover:bg-[#047857]'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Submit {role === 'citizen' ? 'Citizen Alert Profile' : 'Official Credentials'}</span>
                </button>
              </div>

            </form>
          )}

          {/* Bottom link to Login */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600 font-medium flex items-center justify-center gap-2">
            <span>Already have an account?</span>
            <button
              onClick={onNavigateToLogin}
              className="font-extrabold text-[#059669] hover:underline flex items-center gap-1"
            >
              Sign In to Account <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
