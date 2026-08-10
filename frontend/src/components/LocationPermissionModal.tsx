import React from 'react';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import logoSahay from '../assets/logo_sahay.png';
import type { Language } from '../translations';

interface LocationPermissionModalProps {
  currentLang?: Language;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({ currentLang = 'en' }) => {
  const { isPromptOpen, requestLocation, denyLocation, loading } = useLocation();

  if (!isPromptOpen) return null;

  // Localized text dictionary for permission prompt
  const texts = {
    en: {
      title: 'Allow "SAHAY" to access your location?',
      subtitle: 'Your location is used to display live weather telemetry, real-time disaster alerts, dam water levels, and nearest rescue shelters based on where you are.',
      allow: 'Allow Location',
      deny: "Don't Allow",
      securityNote: 'Location data is processed locally for safety telemetry and is never shared with third parties.',
    },
    ml: {
      title: '"സഹായ്" നിങ്ങളുടെ ലൊക്കേഷൻ ആക്സസ് ചെയ്യാൻ അനുവദിക്കുമോ?',
      subtitle: 'നിങ്ങൾ നിലവിലുള്ള സ്ഥലത്തെ അടിസ്ഥാനമാക്കി തത്സമയ കാലാവസ്ഥാ വിവരങ്ങൾ, ദുരന്ത മുന്നറിയിപ്പുകൾ, ഡാം ജലനിരപ്പ്, സമീപത്തുള്ള ദുരിതാശ്വാസ ക്യാമ്പുകൾ എന്നിവ ലഭ്യമാക്കാനാണ് ലൊക്കേഷൻ ഉപയോഗിക്കുന്നത്.',
      allow: 'അനുവദിക്കുക',
      deny: 'വേണ്ട',
      securityNote: 'നിങ്ങളുടെ ലൊക്കേഷൻ വിവരങ്ങൾ സുരക്ഷിതമായി സൂക്ഷിക്കപ്പെടുന്നതാണ്.',
    },
    hi: {
      title: 'क्या "सहाय" को आपकी लोकेशन एक्सेस करने की अनुमति दें?',
      subtitle: 'आपकी वर्तमान स्थिति के आधार पर लाइव मौसम, आपदा अलर्ट, बांध जल स्तर और नजदीकी राहत शिविरों की जानकारी दिखाने के लिए आपकी लोकेशन का उपयोग किया जाता है।',
      allow: 'अनुमति दें',
      deny: 'अनुमति न दें',
      securityNote: 'आपकी लोकेशन जानकारी पूरी तरह सुरक्षित रखी जाती है।',
    },
  };

  const content = texts[currentLang] || texts.en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      {/* Modal Card - App Prompt Container */}
      <div 
        className="relative w-full max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/60 dark:border-slate-800 p-6 flex flex-col items-center text-center overflow-hidden transition-all transform scale-100 hover:scale-[1.01] duration-300"
      >
        {/* Subtle decorative glow accent behind app icon */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Circular SAHAY App Icon Badge */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-xl flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] p-2 flex items-center justify-center relative overflow-hidden">
              <img
                src={logoSahay}
                alt="SAHAY App Icon"
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full border-2 border-white dark:border-slate-900 shadow-md">
                <Navigation className="w-3.5 h-3.5 fill-current animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Title */}
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
          {content.title}
        </h2>

        {/* Modal Description */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-normal px-1">
          {content.subtitle}
        </p>

        {/* Security & Privacy Badge */}
        <div className="w-full mb-6 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-2 text-left">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
            {content.securityNote}
          </span>
        </div>

        {/* Modal Action Buttons (iOS / App Dialog Layout: Two buttons side by side or stacked) */}
        <div className="w-full grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Don't Allow Button */}
          <button
            onClick={denyLocation}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {content.deny}
          </button>

          {/* Allow Button */}
          <button
            onClick={requestLocation}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <MapPin className="w-4 h-4 fill-emerald-200" />
                <span>{content.allow}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
