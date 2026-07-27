import React from 'react';
import { PhoneCall, Mail, MapPin } from 'lucide-react';
import logoSahay from '../assets/logo_sahay.png';

interface FooterProps {
  onOpenContacts: () => void;
  onOpenRegister: (role: 'citizen' | 'official') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenContacts, onOpenRegister }) => {
  return (
    <footer className="w-full bg-[#03291e] text-emerald-100 border-t border-emerald-900 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-emerald-900/80">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center shadow-md">
                <img 
                  src={logoSahay} 
                  alt="SAHAY Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/logo_sahay.png'; }}
                />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-white">SAHAY</span>
                <p className="text-xs text-emerald-300 font-semibold">Government of Kerala Disaster Management Portal</p>
              </div>
            </div>

            <p className="text-xs text-emerald-200/90 leading-relaxed font-normal max-w-sm">
              Statewide integrated platform for real-time weather monitoring, emergency response dispatch, river level telemetry, and citizen safety coordination under KSDMA.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={onOpenContacts}
                className="btn-primary text-xs px-4 py-2 font-bold bg-emerald-700 hover:bg-emerald-600"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Emergency Hotline 112
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-4">
              Portal Services
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-emerald-200">
              <li><a href="#weather" className="hover:text-white transition-colors">Live District Weather</a></li>
              <li><a href="#alerts" className="hover:text-white transition-colors">IMD Alert Bulletins</a></li>
              <li><a href="#river" className="hover:text-white transition-colors">River Telemetry & Dams</a></li>
              <li><a href="#shelters" className="hover:text-white transition-colors">Find Relief Camps</a></li>
              <li><a href="#guidelines" className="hover:text-white transition-colors">Safety Manuals & Kits</a></li>
            </ul>
          </div>

          {/* Registration Links */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-4">
              Portal Registration
            </h4>
            <ul className="space-y-2.5 text-xs font-medium text-emerald-200">
              <li>
                <button onClick={() => onOpenRegister('citizen')} className="hover:text-white transition-colors text-left">
                  Citizen SMS Alert Signup
                </button>
              </li>
              <li>
                <button onClick={() => onOpenRegister('official')} className="hover:text-white transition-colors text-left">
                  Responder Team Access
                </button>
              </li>
              <li>
                <button onClick={() => onOpenRegister('official')} className="hover:text-white transition-colors text-left">
                  NDRF / Fire Force Dispatch
                </button>
              </li>
              <li><a href="#control-room" className="hover:text-white transition-colors">Collectorate Desks</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-4">
              State Control Room
            </h4>
            <div className="space-y-2 text-xs font-medium text-emerald-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>KSDMA Observatory, Vikas Bhavan P.O., Thiruvananthapuram - 695033</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>ksdma.kerala@gov.in</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>0471-2331345 / 1077</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-emerald-300 font-medium">
          <div>
            © 2026 Government of Kerala — Department of Disaster Management. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-white">Privacy Policy</a>
            <span>•</span>
            <a href="#terms" className="hover:text-white">Terms of Use</a>
            <span>•</span>
            <a href="#accessibility" className="hover:text-white">Accessibility Statement</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
