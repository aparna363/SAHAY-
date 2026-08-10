import React, { useState, useEffect } from 'react';
import { X, User, ShieldCheck, CheckCircle2, Phone, Mail, MapPin, KeyRound } from 'lucide-react';
import { getDistricts, getDesignations } from '../services/api';

interface RegistrationModalProps {
  isOpen: boolean;
  initialRole: 'citizen' | 'official';
  onClose: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  initialRole,
  onClose,
}) => {
  const [role, setRole] = useState<'citizen' | 'official'>(initialRole);
  const [submitted, setSubmitted] = useState(false);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [designationsList, setDesignationsList] = useState<string[]>([]);

  useEffect(() => {
    getDistricts().then((data) => {
      setDistrictsList(data);
      if (data.length > 0 && !formData.district) {
        setFormData((prev) => ({ ...prev, district: data[0] }));
      }
    });
    getDesignations().then((data) => {
      setDesignationsList(data);
    });
  }, []);

  // Form states
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
        
        {/* Modal Header */}
        <div className="bg-[#043e2e] text-white p-6 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#065f46] flex items-center justify-center text-emerald-400 border border-emerald-500/30">
              {role === 'citizen' ? <User className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">
                {role === 'citizen' ? 'Citizen Registration' : 'Government Official Registration'}
              </h3>
              <p className="text-xs text-emerald-300 font-medium">
                Official Government Portal Access (SAHAY)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-full hover:bg-emerald-950 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Role Toggle Tabs */}
        <div className="bg-emerald-50 p-2 border-b border-emerald-100 flex gap-2">
          <button
            type="button"
            onClick={() => { setRole('citizen'); setSubmitted(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              role === 'citizen'
                ? 'bg-[#059669] text-white shadow-sm'
                : 'text-slate-700 hover:bg-emerald-100/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen Portal</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('official'); setSubmitted(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              role === 'official'
                ? 'bg-[#043e2e] text-white shadow-sm'
                : 'text-slate-700 hover:bg-emerald-100/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Official / Responder</span>
          </button>
        </div>

        {/* Form Body or Success Confirmation */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-2xl font-black text-slate-900">
                Registration Successful!
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-sm mx-auto">
                {role === 'citizen'
                  ? 'Your citizen alert profile has been created. Emergency SMS alerts will be sent to your phone number.'
                  : 'Your official credentials have been submitted for verification by the KSDMA Nodal Officer.'}
              </p>
              <div className="pt-3">
                <button
                  onClick={handleReset}
                  className="btn-primary px-8 py-2.5 text-xs font-bold"
                >
                  Done & Continue to Portal
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
                      {districtsList.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
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
                      {designationsList.map((desig) => (
                        <option key={desig} value={desig}>
                          {desig}
                        </option>
                      ))}
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
                  className={`w-full py-3 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                    role === 'official' ? 'bg-[#043e2e] hover:bg-[#032e22]' : 'bg-[#059669] hover:bg-[#047857]'
                  }`}
                >
                  Submit {role === 'citizen' ? 'Citizen Alert Profile' : 'Official Credentials'}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
