import React, { useState, useEffect } from 'react';
import { AlertCircle, PhoneCall, CheckCircle2, Radio, MapPin } from 'lucide-react';
import { getDistricts, fetchPublicStats, type PublicPortalStats } from '../services/api';
import { useSystemSettings } from '../context/SettingsContext';

export const EmergencyPage: React.FC = () => {
  const { settings } = useSystemSettings();
  const [submitted, setSubmitted] = useState(false);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [portalStats, setPortalStats] = useState<PublicPortalStats>({
    activeRescueTeams: 0,
    openReliefCamps: 0,
    shelteredCitizens: 0,
    activeIncidents: 0
  });

  useEffect(() => {
    getDistricts().then((data) => {
      setDistrictsList(data);
      if (data.length > 0 && !formData.district) {
        setFormData((prev) => ({ ...prev, district: data[0] }));
      }
    });

    fetchPublicStats().then((stats) => {
      setPortalStats(stats);
    });
  }, []);

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
            <span>EMERGENCY DISPATCH LIVE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Report SOS & Emergency</h1>
          <p className="text-sm text-red-200 mt-1 max-w-xl">
            This high-priority submission dispatches immediate automated alerts to state & district disaster control rooms.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <a
            href="tel:112"
            className="btn-primary bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2 py-3 px-6 text-sm shadow-lg font-black"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call 112 Direct</span>
          </a>
          <a
            href="tel:1077"
            className="btn-outline border-red-700 hover:bg-red-900/50 text-white flex items-center justify-center gap-2 py-3 px-6 text-sm font-bold"
          >
            <Radio className="w-4 h-4" />
            <span>State Hotline (1077)</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Emergency Form */}
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="w-16 h-16 bg-[#059669] text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">SOS Alert Transmitted Successfully</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Control room personnel and nearest rescue teams in <strong className="text-slate-800">{formData.district}</strong> have received your location payload. Maintain line open.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="btn-secondary text-xs font-bold px-6 py-2.5 rounded-xl mt-4"
              >
                Submit Another Report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
              <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-4">
                Emergency Information Form
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field text-sm"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    District *
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="input-field text-sm bg-white"
                  >
                    {districtsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Emergency Nature *
                  </label>
                  <select
                    value={formData.emergencyType}
                    onChange={(e) => setFormData({ ...formData, emergencyType: e.target.value })}
                    className="input-field text-sm bg-white"
                  >
                    <option value="Flood / Water Entrapment">Flood / Water Entrapment</option>
                    <option value="Landslide / Debris Trapped">Landslide / Debris Trapped</option>
                    <option value="Medical Critical Emergency">Medical Critical Emergency</option>
                    <option value="Sea / Water Rescue">Sea / Water Rescue</option>
                    <option value="Structural Collapse / Fire">Structural Collapse / Fire</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Estimated Persons Trapped / Affected
                  </label>
                  <select
                    value={formData.personsCount}
                    onChange={(e) => setFormData({ ...formData, personsCount: e.target.value })}
                    className="input-field text-sm bg-white"
                  >
                    <option value="1 Person">1 Person</option>
                    <option value="2-4 People">2-4 People</option>
                    <option value="5-10 People">5-10 People</option>
                    <option value="10+ People (Group)">10+ People (Group)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Landmark / Address Details
                  </label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Near Bridge, Church, School..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Additional Crucial Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Describe medical conditions, water level height, specific access roads..."
                />
              </div>

              {/* Location attachment status from System Settings */}
              <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                settings.shareLocationInSos
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>GPS Location Transmission:</span>
                </div>
                <span>{settings.shareLocationInSos ? '● Attached to Dispatch' : '○ Disabled in Settings'}</span>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-base font-black uppercase tracking-wider shadow-lg transition-all"
              >
                Transmit High-Priority SOS Alert
              </button>
            </form>
          )}
        </div>

        {/* Side Info Cards */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#059669]">
              Important Emergency Helplines
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs font-bold text-slate-300">National Emergency</span>
                <a href="tel:112" className="text-base font-black text-[#059669] hover:underline">112</a>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs font-bold text-slate-300">State Control Room</span>
                <a href="tel:1077" className="text-base font-black text-[#059669] hover:underline">1077</a>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs font-bold text-slate-300">Fire & Rescue</span>
                <a href="tel:101" className="text-base font-black text-orange-400 hover:underline">101</a>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-xs font-bold text-slate-300">Ambulance Services</span>
                <a href="tel:108" className="text-base font-black text-sky-400 hover:underline">108</a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Active Rescue Assets Deployed
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xl font-black text-[#059669]">
                  {portalStats.activeRescueTeams > 0 ? portalStats.activeRescueTeams : '0'}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Rescue Teams</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-xl font-black text-sky-600">
                  {portalStats.openReliefCamps > 0 ? portalStats.openReliefCamps : '0'}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Relief Camps</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
