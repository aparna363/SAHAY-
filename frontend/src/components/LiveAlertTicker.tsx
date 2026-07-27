import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { translations } from '../translations';
import type { Language } from '../translations';

interface LiveAlertTickerProps {
  currentLang: Language;
  onAlertClick: () => void;
}

export const LiveAlertTicker: React.FC<LiveAlertTickerProps> = ({ currentLang, onAlertClick }) => {
  const t = translations[currentLang];

  const alerts = [
    {
      type: currentLang === 'ml' ? 'റെഡ് അലർട്ട്' : currentLang === 'hi' ? 'रेड अलर्ट' : 'RED ALERT',
      color: 'bg-red-600',
      text: t.ticker1
    },
    {
      type: currentLang === 'ml' ? 'പ്രളയ മുന്നറിയിപ്പ്' : currentLang === 'hi' ? 'बाढ़ चेतावनी' : 'FLOOD WARNING',
      color: 'bg-orange-600',
      text: t.ticker2
    },
    {
      type: currentLang === 'ml' ? 'തീരദേശ മുന്നറിയിപ്പ്' : currentLang === 'hi' ? 'तटीय चेतावनी' : 'COASTAL ADVISORY',
      color: 'bg-yellow-600',
      text: t.ticker3
    }
  ];

  return (
    <div className="w-full bg-[#03291e] border-b border-emerald-950 flex items-center shadow-inner z-40 relative overflow-hidden">
      {/* Live Alerts Red Badge */}
      <div 
        onClick={onAlertClick}
        className="bg-red-600 text-white font-extrabold text-xs tracking-wider uppercase px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-red-700 transition-colors shadow-md z-10 flex-shrink-0"
      >
        <AlertTriangle className="w-4 h-4 animate-bounce" />
        <span className="whitespace-nowrap">{t.liveAlerts}</span>
      </div>

      {/* Standard Continuous Ticker Bar */}
      <div 
        className="flex-1 overflow-hidden relative py-2.5 px-3 text-xs sm:text-sm font-medium text-emerald-100 flex items-center"
      >
        <div className="ticker-wrap flex items-center w-full">
          <div 
            className="ticker-content flex items-center gap-12"
          >
            {alerts.concat(alerts).concat(alerts).map((alert, idx) => (
              <div 
                key={idx} 
                onClick={onAlertClick}
                className="inline-flex items-center gap-2.5 cursor-pointer hover:text-white transition-colors flex-shrink-0"
              >
                <span className="pulse-dot"></span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold text-white ${alert.color}`}>
                  {alert.type}
                </span>
                <span className="font-semibold text-emerald-50 tracking-tight">
                  {alert.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
