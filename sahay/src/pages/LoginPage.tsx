import React, { useState } from 'react';
import { LogIn, Lock, Phone, UserCheck, ArrowRight, User, ShieldCheck } from 'lucide-react';
import logoSahay from '../assets/logo_sahay.png';
import type { Language } from '../translations';

interface LoginPageProps {
  currentLang: Language;
  onNavigateToRegister: (role: 'citizen' | 'official') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToRegister }) => {
  const [tab, setTab] = useState<'citizen' | 'official'>('citizen');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [passwordOrOtp, setPasswordOrOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggedIn(true);
  };

  return (
    <div className="min-h-[80vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center animate-fadeIn">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80">
        
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

          <h1 className="text-2xl font-black text-white tracking-tight">
            SAHAY Government Portal Login
          </h1>
          <p className="text-xs text-emerald-300 font-semibold mt-1">
            Government of Kerala — Department of Disaster Management
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-2 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => { setTab('citizen'); setLoggedIn(false); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'citizen' ? 'bg-[#059669] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Citizen Login</span>
          </button>

          <button
            onClick={() => { setTab('official'); setLoggedIn(false); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === 'official' ? 'bg-[#043e2e] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Official Login</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-7">
          {loggedIn ? (
            <div className="text-center py-8 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto">
                <UserCheck className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Welcome Back!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xs mx-auto">
                You are now logged into the SAHAY {tab === 'official' ? 'Official Emergency Command Console' : 'Citizen Alert Portal'}.
              </p>
              <button
                onClick={() => setLoggedIn(false)}
                className="btn-primary text-xs font-bold px-8 py-3"
              >
                Go to Control Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {tab === 'citizen' ? 'Registered Mobile Number *' : 'Govt Email / Employee Service ID *'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={tab === 'citizen' ? '+91 98765 43210' : 'officer@kerala.gov.in'}
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {tab === 'citizen' ? '6-Digit OTP Code *' : 'Account Password *'}
                  </label>
                  {tab === 'citizen' && (
                    <button
                      type="button"
                      onClick={() => setIsOtpSent(true)}
                      className="text-[11px] font-extrabold text-[#059669] hover:underline"
                    >
                      {isOtpSent ? 'Resend OTP' : 'Send OTP via SMS'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={tab === 'citizen' ? 'text' : 'password'}
                    required
                    placeholder={tab === 'citizen' ? 'Enter 6-digit OTP' : '••••••••'}
                    value={passwordOrOtp}
                    onChange={(e) => setPasswordOrOtp(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#059669] focus:outline-none"
                  />
                </div>
                {isOtpSent && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ✓ OTP code sent to your registered mobile phone!
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to {tab === 'official' ? 'Official Portal' : 'Citizen Dashboard'}</span>
              </button>
            </form>
          )}

          {/* Bottom link to Register page */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600 font-medium space-y-2">
            <div>Don't have an account yet?</div>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => onNavigateToRegister('citizen')}
                className="font-extrabold text-[#059669] hover:underline flex items-center gap-1"
              >
                Register as Citizen <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigateToRegister('official')}
                className="font-extrabold text-emerald-800 hover:underline flex items-center gap-1"
              >
                Register as Official <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
