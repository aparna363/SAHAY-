import React, { useState } from 'react';
import { AlertCircle, PhoneCall, CheckCircle2, Radio } from 'lucide-react';

export const EmergencyPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    district: 'Idukki',
    landmark: '',
    emergencyType: 'Flood / Water Entrapment',
    personsCount: '2-4 People',
    details: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-red-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-red-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-800 px-3.5 py-1 rounded-full text-xs font-bold text-red-100 mb-2">
            <AlertCircle className="w-4 h-4 text-red-300 animate-pulse" />
            <span>24/7 Rapid Emergency Response Unit</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Emergency Assistance & SOS Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-red-200 mt-1 max-w-xl font-normal">
            Direct high-priority alert dispatch to KSDMA Control Room, NDRF Search & Rescue, and District Collectorate Desks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="tel:112"
            className="btn-primary text-xs font-bold px-6 py-3 bg-red-600 hover:bg-red-500 shadow-xl flex items-center gap-2"
          >
            <PhoneCall className="w-4 h-4 animate-bounce" />
            <span>Call SOS Helpline (112)</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SOS Report Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
          {submitted ? (
            <div className="text-center py-10 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                SOS Alert Dispatched!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
                Your emergency SOS ticket has been logged in KSDMA Central Console. Control room team is dispatching nearest rescue unit to your provided location.
              </p>
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs font-bold text-red-800 max-w-sm mx-auto">
                Reference ID: KSDMA-SOS-2026-8834
              </div>
              <button
                onClick={() => setSubmitted(false)}
                className="btn-primary px-8 py-2.5 text-xs font-bold mt-4"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-xl font-black text-slate-900">
                  Request Immediate Rescue / Emergency Aid
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Fill out this high-priority dispatch form. Fields marked * are mandatory.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    District Location *
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Idukki">Idukki</option>
                    <option value="Wayanad">Wayanad</option>
                    <option value="Ernakulam">Ernakulam</option>
                    <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                    <option value="Kozhikode">Kozhikode</option>
                    <option value="Thrissur">Thrissur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nature of Emergency *
                  </label>
                  <select
                    value={formData.emergencyType}
                    onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Flood / Water Entrapment">Flood / Water Inundation Trap</option>
                    <option value="Landslide / Mudslip">Landslide / Debris Trapped</option>
                    <option value="Medical Emergency">Medical Emergency / Evacuation</option>
                    <option value="Structure Damage">Building / Roof Collapse</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specific Landmark / House Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near St. George Church, Munnar Town Rd, Ward 4"
                  value={formData.landmark}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Situation Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Mention number of senior citizens, children, or immediate medical assistance required..."
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold tracking-wide uppercase shadow-lg transition-all"
              >
                Dispatch Emergency SOS Alert
              </button>
            </form>
          )}
        </div>

        {/* Right Info Cards */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Radio className="w-5 h-5 text-red-600" />
              Primary Disaster Helplines
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200">
                <span className="text-xs font-bold text-red-900">National Emergency Number</span>
                <a href="tel:112" className="text-base font-black text-red-600 hover:underline">112</a>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#f0fdf4] border border-emerald-200">
                <span className="text-xs font-bold text-emerald-900">Disaster Management Helpline</span>
                <a href="tel:1077" className="text-base font-black text-[#059669] hover:underline">1077</a>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-200">
                <span className="text-xs font-bold text-orange-900">Fire & Rescue Services</span>
                <a href="tel:101" className="text-base font-black text-orange-600 hover:underline">101</a>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-sky-50 border border-sky-200">
                <span className="text-xs font-bold text-sky-900">Ambulance Services</span>
                <a href="tel:108" className="text-base font-black text-sky-600 hover:underline">108</a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Active Rescue Assets Deployed
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xl font-black text-[#059669]">142</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">NDRF Teams</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xl font-black text-sky-600">68</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Rescue Boats</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
