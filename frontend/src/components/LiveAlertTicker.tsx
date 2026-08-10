import React from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';
import { translations } from '../translations';
import type { Language } from '../translations';
import { useLocation } from '../context/LocationContext';

interface LiveAlertTickerProps {
  currentLang: Language;
  onAlertClick: () => void;
}

interface TickerItem {
  type: string;
  color: string;
  text: string;
  isLocation: boolean;
  action?: () => void;
}

export const LiveAlertTicker: React.FC<LiveAlertTickerProps> = ({ currentLang, onAlertClick }) => {
  const t = translations[currentLang];
  const { location, weatherData, loading, requestLocation, openPromptModal } = useLocation();

  const placeName = location?.placeName || location?.district || '';
  const district = location?.district || '';
  const alertInfo = weatherData?.alert;
  const isGPS = !!location?.isGPS;

  // Build the location-based alert item
  const getLocationAlert = (): TickerItem => {
    if (loading) {
      return {
        type: currentLang === 'ml' ? 'ആരംഭിക്കുന്നു...' : currentLang === 'hi' ? 'खोज रहा है...' : 'DETECTING LOCATION',
        color: 'bg-emerald-600',
        text: currentLang === 'ml' 
          ? 'നിങ്ങളുടെ നിലവിലെ സ്ഥലത്തെ തത്സമയ കാലാവസ്ഥാ മുന്നറിയിപ്പുകൾ പരിശോധിക്കുന്നു...' 
          : currentLang === 'hi' 
          ? 'आपके वर्तमान स्थान के लिए लाइव अलर्ट प्राप्त किए जा रहे हैं...' 
          : 'Detecting live weather & disaster alerts for your current location...',
        isLocation: true
      };
    }

    if (!location || !district) {
      return {
        type: currentLang === 'ml' ? 'ജി.പി.എസ് സജീവം അല്ല' : currentLang === 'hi' ? 'जीपीएस सक्षम करें' : 'LOCATION ALERT',
        color: 'bg-emerald-700',
        text: currentLang === 'ml'
          ? '📍 നിങ്ങളുടെ സ്ഥലത്തെ തത്സമയ മുന്നറിയിപ്പുകൾ കാണാൻ GPS അനുവദിക്കുക (ഇവിടെ ക്ലിക്ക് ചെയ്യുക)'
          : currentLang === 'hi'
          ? '📍 अपने स्थान के लिए लाइव अलर्ट प्राप्त करने हेतु जीपीएस सक्षम करें (क्लिक करें)'
          : '📍 Click here to enable GPS location for live emergency alerts tailored to your exact area',
        isLocation: true,
        action: requestLocation || openPromptModal
      };
    }

    // Dynamic alert level & descriptions for current location
    const level = alertInfo?.alertLevel?.toUpperCase() || 'GREEN';
    let badgeColor = 'bg-emerald-600';
    let levelLabel = level === 'RED' ? (currentLang === 'ml' ? 'റെഡ് അലർട്ട്' : currentLang === 'hi' ? 'रेड अलर्ट' : 'RED ALERT')
      : level === 'ORANGE' ? (currentLang === 'ml' ? 'ഓറഞ്ച് അലർട്ട്' : currentLang === 'hi' ? 'ऑरेंज अलर्ट' : 'ORANGE ALERT')
      : level === 'YELLOW' ? (currentLang === 'ml' ? 'മഞ്ഞ അലർട്ട്' : currentLang === 'hi' ? 'पीला अलर्ट' : 'YELLOW ALERT')
      : (currentLang === 'ml' ? 'സുരക്ഷിത മേഖല' : currentLang === 'hi' ? 'सुरक्षित' : 'SAFE / GREEN ALERT');

    if (level === 'RED') badgeColor = 'bg-red-600 animate-pulse';
    else if (level === 'ORANGE') badgeColor = 'bg-orange-600';
    else if (level === 'YELLOW') badgeColor = 'bg-amber-600';

    const alertDesc = alertInfo?.description || alertInfo?.alertType || (
      level === 'GREEN' 
        ? (currentLang === 'ml' ? 'കടുത്ത ദുരന്ത മുന്നറിയിപ്പുകൾ ഒന്നുമില്ല. കാലാവസ്ഥ സാധാരണ നിലയിലാണ്.' : 'No severe disaster warning active. Normal weather conditions.')
        : ''
    );

    const locationPrefix = isGPS 
      ? `📍 ${placeName} (${district} District - GPS Verified): `
      : `📍 ${district} District: `;

    return {
      type: levelLabel,
      color: badgeColor,
      text: `${locationPrefix}${alertDesc}`,
      isLocation: true
    };
  };

  const currentLocationAlert = getLocationAlert();

  // Regional emergency advisories across Kerala
  const regionalAlerts: TickerItem[] = [
    {
      type: currentLang === 'ml' ? 'ഇടുക്കി അലർട്ട്' : currentLang === 'hi' ? 'इडुक्की अलर्ट' : 'IDUKKI HIGH RANGE',
      color: 'bg-red-600',
      text: currentLang === 'ml' 
        ? 'മൂന്നാർ, ദേവികുളം മേഖലകളിൽ കനത്ത മഴ ഭീഷണി. മലയോര യാത്രകൾ ഒഴിവാക്കുക.'
        : currentLang === 'hi'
        ? 'इडुक्की उच्च पहाड़ी क्षेत्रों में भूस्खलन की चेतावनी। यात्रा सीमित रखें।'
        : 'Red Alert advisory in Idukki high ranges & Munnar. High risk of landslides & swollen streams.',
      isLocation: false
    },
    {
      type: currentLang === 'ml' ? 'നദീതീര മുന്നറിയിപ്പ്' : currentLang === 'hi' ? 'नदी चेतावनी' : 'RIVER BASIN ADVISORY',
      color: 'bg-orange-600',
      text: currentLang === 'ml'
        ? 'പെരിയാർ, ചാലക്കുടി, പമ്പ നദികളിൽ ജലനിരപ്പ് നിരീക്ഷിക്കുന്നു. തീരവാസികൾ ജാഗ്രത പാലിക്കുക.'
        : currentLang === 'hi'
        ? 'पेरियार और पंबा नदी के जलस्तर में वृद्धि। तटवर्ती निवासी सावधान रहें।'
        : 'Periyar, Chalakudy & Pamba river discharge monitored. Low-lying riverbank areas on high alert.',
      isLocation: false
    },
    {
      type: currentLang === 'ml' ? 'തീരദേശ മുന്നറിയിപ്പ്' : currentLang === 'hi' ? 'तटीय सलाह' : 'COASTAL WAVE WARNING',
      color: 'bg-amber-600',
      text: currentLang === 'ml'
        ? 'തീരദേശത്ത് ശക്തമായ കാറ്റും കടലാക്രമണ സാധ്യതയും. മീൻപിടുത്തക്കാർ കടലിൽ പോകരുത്.'
        : currentLang === 'hi'
        ? 'केरल तट पर तेज हवाएं और ऊंची लहरें। मछुआरे समुद्र में न जाएं।'
        : 'High wave surge & squally winds along Kerala coast. Fishermen advised not to venture into sea.',
      isLocation: false
    }
  ];

  // Exclude duplicate district if user's location is already Idukki
  const filteredRegional = district.toLowerCase() === 'idukki'
    ? regionalAlerts.slice(1)
    : regionalAlerts;

  const alerts: TickerItem[] = [currentLocationAlert, ...filteredRegional];

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
                onClick={() => alert.action ? alert.action() : onAlertClick()}
                className={`inline-flex items-center gap-2.5 cursor-pointer hover:text-white transition-colors flex-shrink-0 ${
                  alert.isLocation ? 'font-bold' : ''
                }`}
              >
                {alert.isLocation ? (
                  <span className="flex items-center justify-center bg-emerald-500/30 p-1 rounded-full text-emerald-300">
                    <MapPin className="w-3.5 h-3.5 animate-pulse text-emerald-300" />
                  </span>
                ) : (
                  <span className="pulse-dot"></span>
                )}
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold text-white ${alert.color}`}>
                  {alert.type}
                </span>
                <span className={`tracking-tight ${alert.isLocation ? 'text-white font-bold' : 'text-emerald-50 font-semibold'}`}>
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
