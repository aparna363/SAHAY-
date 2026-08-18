import React, { useState } from 'react';
import { X, LogIn, Lock, Phone, UserCheck } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'citizen' | 'official'>('citizen');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggedIn(true);
  };

  const handleReset = () => {
    setLoggedIn(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn border border-slate-100">
        
        {/* Header */}
        <div className="bg-[#043e2e] text-white p-6 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#065f46] flex items-center justify-center text-emerald-400">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">SAHAY Login</h3>
              <p className="text-xs text-emerald-300 font-medium">Disaster Portal Access</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-full hover:bg-emerald-950 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 p-2 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => { setTab('citizen'); setLoggedIn(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'citizen' ? 'bg-[#059669] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Citizen Login
          </button>
          <button
            onClick={() => { setTab('official'); setLoggedIn(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'official' ? 'bg-[#043e2e] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Official Login
          </button>
        </div>

        <div className="p-6">
          {loggedIn ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-extrabold text-slate-900">Welcome Back!</h4>
              <p className="text-xs text-slate-600 font-medium">
                You are now logged into the SAHAY {tab === 'official' ? 'Official Response Console' : 'Citizen Dashboard'}.
              </p>
              <button
                onClick={handleReset}
                className="btn-primary text-xs font-bold px-6 py-2 mt-2"
              >
                Proceed to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {tab === 'citizen' ? 'Registered Mobile Number or Email' : 'Govt Email / Employee Code'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={tab === 'citizen' ? '9876543210 or name@gmail.com' : 'officer@kerala.gov.in'}
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Account Password *
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold shadow-md transition-all mt-2"
              >
                Sign In to {tab === 'official' ? 'Official Portal' : 'Citizen Account'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
