import React, { useState } from 'react';
import { AlertTriangle, ChevronRight, Pause, Play } from 'lucide-react';

interface LiveAlertTickerProps {
  onAlertClick: () => void;
}

export const LiveAlertTicker: React.FC<LiveAlertTickerProps> = ({ onAlertClick }) => {
  const [isPaused, setIsPaused] = useState(false);

  const alerts = [
    {
      type: 'RED ALERT',
      color: 'bg-red-600',
      text: 'Heavy to extremely heavy rainfall forecast for Idukki & Wayanad. Avoid hilly tracks and landslide-prone areas.'
    },
    {
      type: 'FLOOD WARNING',
      color: 'bg-orange-600',
      text: 'Water level rising rapidly in Periyar and Chalakudy rivers. Residents in vulnerable zones advised to stay vigilant.'
    },
    {
      type: 'COASTAL ADVISORY',
      color: 'bg-yellow-600',
      text: 'High winds (45-55 km/h) along Kerala coast. Fishermen strictly instructed not to venture into sea.'
    }
  ];

  return (
    <div className="w-full bg-[#03291e] border-b border-emerald-950 flex items-center shadow-inner z-40 relative">
      {/* Live Alerts Red Badge */}
      <div 
        onClick={onAlertClick}
        className="bg-red-600 text-white font-extrabold text-xs tracking-wider uppercase px-4 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-red-700 transition-colors shadow-md z-10 flex-shrink-0"
      >
        <AlertTriangle className="w-4 h-4 animate-bounce" />
        <span className="whitespace-nowrap">LIVE ALERTS</span>
      </div>

      {/* Scrolling Alerts Content */}
      <div 
        className="flex-1 overflow-hidden relative py-2 px-3 text-xs sm:text-sm font-medium text-emerald-100 flex items-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="ticker-wrap flex items-center w-full">
          <div 
            className="ticker-content flex items-center gap-8"
            style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
          >
            {alerts.concat(alerts).map((alert, idx) => (
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

      {/* Play/Pause & View All Controls */}
      <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#043e2e] border-l border-emerald-800/50 flex-shrink-0">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="text-emerald-300 hover:text-white p-1 transition-colors"
          title={isPaused ? "Resume ticker" : "Pause ticker"}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onAlertClick}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-white transition-colors"
        >
          <span>All Bulletins</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
