import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SystemSettingsModal } from '../components/SystemSettingsModal';
import loginBg from '../assets/loginbg.jpg';
import fullLogoSahay from '../assets/full_logo_sahay.png';

interface SystemSettingsPageProps {
  onBack: () => void;
}

export const SystemSettingsPage: React.FC<SystemSettingsPageProps> = ({ onBack }) => {
  return (
    <div
      className="relative min-h-[90vh] py-10 px-4 sm:px-6 lg:px-8 bg-slate-900 bg-cover bg-center bg-no-repeat animate-fadeIn"
      style={{
        backgroundImage: `url(${loginBg})`,
      }}
    >
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-slate-950/95 backdrop-brightness-[0.75]" />

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-white/80 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center shadow-xs cursor-pointer"
              title="Return to Previous Screen"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">⚙️ System Settings</h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md">
                  Preferences
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Manage appearance, alert subscriptions, language & accessibility preferences
              </p>
            </div>
          </div>

          <div className="max-w-[140px] hidden sm:block">
            <img
              src={fullLogoSahay}
              alt="SAHAY"
              className="w-full h-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/full_logo_sahay.png';
              }}
            />
          </div>
        </div>

        {/* Inline Rendered System Settings Panel */}
        <div className="shadow-2xl rounded-3xl overflow-hidden">
          <SystemSettingsModal isOpen={true} onClose={onBack} isInline={true} />
        </div>
      </div>
    </div>
  );
};
