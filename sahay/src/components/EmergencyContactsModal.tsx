import React from 'react';
import { X, PhoneCall, Radio, Shield, Flame, Ambulance, HeartPulse, Building2 } from 'lucide-react';

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const helplines = [
    { name: 'National Emergency Toll Free', number: '112', icon: PhoneCall, bg: 'bg-red-500 text-white' },
    { name: 'Disaster Management Helpline', number: '1077', icon: Radio, bg: 'bg-emerald-600 text-white' },
    { name: 'Fire & Rescue Services', number: '101', icon: Flame, bg: 'bg-orange-500 text-white' },
    { name: 'Police Control Room', number: '100 / 112', icon: Shield, bg: 'bg-sky-600 text-white' },
    { name: 'Ambulance Emergency', number: '108', icon: Ambulance, bg: 'bg-rose-600 text-white' },
    { name: 'Coastal Security Police', number: '1093', icon: HeartPulse, bg: 'bg-teal-600 text-white' },
  ];

  const districtControlRooms = [
    { district: 'Idukki Collectorate Control Room', phone: '04862-233111' },
    { district: 'Wayanad Emergency Cell', phone: '04936-204151' },
    { district: 'Ernakulam Collectorate Desk', phone: '0484-2423001' },
    { district: 'Thiruvananthapuram Control Room', phone: '0471-2330077' },
    { district: 'Kozhikode Disaster Cell', phone: '0495-2371000' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn border border-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-[#043e2e] text-white p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#065f46] flex items-center justify-center text-emerald-400">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Emergency Helplines & Control Rooms</h3>
              <p className="text-xs text-emerald-300 font-medium">Government of Kerala 24/7 Response</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-full hover:bg-emerald-950 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Top Quick Dial Grid */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
              Statewide Primary Emergency Numbers
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {helplines.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <a
                    key={idx}
                    href={`tel:${item.number.split(' ')[0]}`}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${item.bg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#059669]">
                          {item.name}
                        </div>
                        <div className="text-base font-black text-slate-900 leading-tight">
                          {item.number}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#059669] bg-white px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                      Call Now
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* District Control Rooms */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
              District Collectorate Disaster Control Desks
            </h4>
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {districtControlRooms.map((room, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-slate-200/60 last:border-none text-xs font-semibold">
                  <span className="text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    {room.district}
                  </span>
                  <a href={`tel:${room.phone}`} className="font-extrabold text-[#059669] hover:underline">
                    {room.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
