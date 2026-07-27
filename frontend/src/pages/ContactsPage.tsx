import React from 'react';
import { PhoneCall, Radio, Building2, Shield, Flame, Ambulance, HeartPulse, MapPin } from 'lucide-react';

export const ContactsPage: React.FC = () => {
  const primaryNumbers = [
    { name: 'National Emergency Toll Free', number: '112', desc: 'Single emergency number for Police, Fire, Ambulance & Rescue', icon: PhoneCall, bg: 'bg-red-600 text-white' },
    { name: 'Disaster Management Helpline', number: '1077', desc: 'Statewide Disaster Management Control Room', icon: Radio, bg: 'bg-[#059669] text-white' },
    { name: 'Fire & Rescue Services', number: '101', desc: 'State Fire Station Emergency Dispatch', icon: Flame, bg: 'bg-orange-600 text-white' },
    { name: 'Police Emergency', number: '100 / 112', desc: 'Police Control Room & Rapid Action Unit', icon: Shield, bg: 'bg-sky-600 text-white' },
    { name: 'Ambulance Hotline', number: '108', desc: '108 Kerala Emergency Medical Services', icon: Ambulance, bg: 'bg-rose-600 text-white' },
    { name: 'Coastal Security Police', number: '1093', desc: 'Marine & Coastal Police Helpline', icon: HeartPulse, bg: 'bg-teal-600 text-white' },
  ];

  const collectorates = [
    { district: 'Idukki Collectorate Control Room', phone: '04862-233111', address: 'Painavu, Idukki - 685603' },
    { district: 'Wayanad Emergency Cell', phone: '04936-204151', address: 'Kalpetta, Wayanad - 673121' },
    { district: 'Ernakulam Collectorate Desk', phone: '0484-2423001', address: 'Kakkanad, Kochi - 682030' },
    { district: 'Thiruvananthapuram Control Desk', phone: '0471-2330077', address: 'Kudappanakkunnu, TVM - 695043' },
    { district: 'Kozhikode Disaster Cell', phone: '0495-2371000', address: 'Civil Station, Kozhikode - 673020' },
    { district: 'Thrissur Control Room', phone: '0487-2362200', address: 'Ayyanthole, Thrissur - 680003' },
    { district: 'Palakkad Disaster Cell', phone: '0491-2505300', address: 'Civil Station, Palakkad - 678001' },
    { district: 'Kottayam Emergency Desk', phone: '0481-2562201', address: 'Collectorate, Kottayam - 686002' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <span>24/7 Government Directory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Emergency Contacts & Control Rooms Directory
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl font-normal">
            Complete list of statewide emergency helplines, District Collectorate desks, and emergency responders.
          </p>
        </div>
      </div>

      {/* Primary Helplines Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-slate-900">Statewide Primary Emergency Numbers</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {primaryNumbers.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={`tel:${item.number.split(' ')[0]}`}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md hover:shadow-lg hover:border-emerald-300 transition-all flex items-start justify-between group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold shadow-sm ${item.bg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.name}</div>
                    <div className="text-2xl font-black text-slate-900 group-hover:text-[#059669] transition-colors">{item.number}</div>
                    <p className="text-[11px] text-slate-600 font-medium mt-1 leading-snug">{item.desc}</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* District Collectorates Grid */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-black text-slate-900">District Collectorate Disaster Control Rooms</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {collectorates.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#059669]">
                <Building2 className="w-4 h-4 text-[#059669]" />
                <span>Control Room</span>
              </div>
              <h3 className="text-base font-black text-slate-900 leading-snug">{item.district}</h3>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.address}
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">Phone:</span>
                <a href={`tel:${item.phone}`} className="text-xs font-black text-[#059669] hover:underline">
                  {item.phone}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
