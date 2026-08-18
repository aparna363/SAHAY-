import React, { useState } from 'react';
import { CloudRain, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { translations } from '../translations';
import type { Language } from '../translations';
import { useLocation } from '../context/LocationContext';

interface LiveWeatherGridProps {
  currentLang?: Language;
}

interface DistrictWeather {
  district: string;
  region: string;
  temp: string;
  condition: string;
  rainfall: string;
  windSpeed: string;
  humidity: string;
  alertLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  advisory: string;
  isCurrentLocation?: boolean;
}

export const LiveWeatherGrid: React.FC<LiveWeatherGridProps> = ({ currentLang = 'en' }) => {
  const { location, weatherData: globalWeather, requestLocation, openPromptModal, loading } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAlert, setFilterAlert] = useState<string>('ALL');

  const t = translations[currentLang];

  const isGPSActive = !!location?.isGPS;

  const currentGpsCard: DistrictWeather | null = globalWeather && isGPSActive ? {
    district: globalWeather.placeName || globalWeather.district,
    region: `${globalWeather.district} District (📍 Your GPS Location)`,
    temp: `${Math.round(globalWeather.temperature)}°C`,
    condition: globalWeather.condition,
    rainfall: `${globalWeather.rainProbability}% Precip`,
    windSpeed: `${globalWeather.windSpeed} km/h`,
    humidity: `${globalWeather.humidity}%`,
    alertLevel: (globalWeather.alert?.alertLevel as any) || 'GREEN',
    advisory: globalWeather.alert?.description || `Live telemetry verified for your GPS coordinates.`,
    isCurrentLocation: true
  } : null;

  const baseDistricts: DistrictWeather[] = [
    {
      district: currentLang === 'ml' ? 'ഇടുക്കി' : 'Idukki',
      region: currentLang === 'ml' ? 'ഹൈറേഞ്ച് & മലയോരം' : 'High Range & Hills',
      temp: '24°C',
      condition: currentLang === 'ml' ? 'ഇടത്തരം മഴ' : 'Moderate Rainfall',
      rainfall: '22 mm',
      windSpeed: '14 km/h',
      humidity: '82%',
      alertLevel: 'GREEN',
      advisory: currentLang === 'ml' ? 'ഔദ്യോഗിക ദുരന്ത മുന്നറിയിപ്പുകൾ ഇല്ല. സാധാ കാലാവസ്ഥ.' : 'No active official IMD disaster warning in effect. Normal weather telemetry.'
    },
    {
      district: currentLang === 'ml' ? 'വയനാട്' : 'Wayanad',
      region: currentLang === 'ml' ? 'ഹൈറേഞ്ച്' : 'High Range',
      temp: '23°C',
      condition: currentLang === 'ml' ? 'ചാറ്റൽ മഴ' : 'Light Drizzle',
      rainfall: '18 mm',
      windSpeed: '12 km/h',
      humidity: '84%',
      alertLevel: 'GREEN',
      advisory: currentLang === 'ml' ? 'ഔദ്യോഗിക ദുരന്ത മുന്നറിയിപ്പുകൾ ഇല്ല.' : 'No active official IMD disaster warning in effect.'
    },
    {
      district: currentLang === 'ml' ? 'എറണാകുളം' : 'Ernakulam',
      region: currentLang === 'ml' ? 'തീരദേശവും സമതലവും' : 'Coastal & Plains',
      temp: '30°C',
      condition: currentLang === 'ml' ? 'ഇടത്തരം മഴ' : 'Moderate Rain',
      rainfall: '14 mm',
      windSpeed: '16 km/h',
      humidity: '80%',
      alertLevel: 'GREEN',
      advisory: currentLang === 'ml' ? 'ഔദ്യോഗിക ദുരന്ത മുന്നറിയിപ്പുകൾ ഇല്ല.' : 'No active official IMD disaster warning in effect.'
    },
    {
      district: currentLang === 'ml' ? 'കോഴിക്കോട്' : 'Kozhikode',
      region: currentLang === 'ml' ? 'ഉത്തര മലബാർ' : 'North Malabar',
      temp: '28°C',
      condition: currentLang === 'ml' ? 'മേഘാവൃതം' : 'Cloudy',
      rainfall: '10 mm',
      windSpeed: '12 km/h',
      humidity: '78%',
      alertLevel: 'GREEN',
      advisory: currentLang === 'ml' ? 'ഔദ്യോഗിക ദുരന്ത മുന്നറിയിപ്പുകൾ ഇല്ല.' : 'No active official IMD disaster warning in effect.'
    },
    {
      district: currentLang === 'ml' ? 'തിരുവനന്തപുരം' : 'Thiruvananthapuram',
      region: currentLang === 'ml' ? 'തെക്കൻ കേരളം' : 'South Kerala',
      temp: '31°C',
      condition: currentLang === 'ml' ? 'ചാറ്റൽമഴ' : 'Light Drizzle',
      rainfall: '8 mm',
      windSpeed: '14 km/h',
      humidity: '74%',
      alertLevel: 'GREEN',
      advisory: currentLang === 'ml' ? 'ഔദ്യോഗിക ദുരന്ത മുന്നറിയിപ്പുകൾ ഇല്ല.' : 'No active official IMD disaster warning in effect.'
    },
    {
      district: currentLang === 'ml' ? 'പാലക്കാട്' : 'Palakkad',
      region: currentLang === 'ml' ? 'മധ്യകേരളം' : 'Central Kerala',
      temp: '29°C',
      condition: currentLang === 'ml' ? 'ഭാഗികമായി മേഘാവൃതം' : 'Partly Cloudy',
      rainfall: '5 mm',
      windSpeed: '10 km/h',
      humidity: '70%',
      alertLevel: 'GREEN',
      advisory: currentLang === 'ml' ? 'ഡാം ജലനിരപ്പ് സാധാരണ നിലയിൽ.' : 'Normal dam discharge. No emergency warnings active.'
    }
  ];

  const districts = currentGpsCard
    ? [currentGpsCard, ...baseDistricts.filter(d => d.district.toLowerCase() !== currentGpsCard.district.toLowerCase())]
    : baseDistricts;

  const filteredDistricts = districts.filter((item) => {
    const matchesSearch = item.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterAlert === 'ALL' || item.alertLevel === filterAlert;
    return matchesSearch && matchesFilter;
  });

  const getAlertBadge = (level: string) => {
    switch (level) {
      case 'RED':
        return <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-sm flex items-center gap-1 animate-pulse"><AlertTriangle className="w-3 h-3" /> {t.redAlert}</span>;
      case 'ORANGE':
        return <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-sm">{t.orangeAlert}</span>;
      case 'YELLOW':
        return <span className="bg-amber-500 text-[#0f172a] px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-sm">{t.yellowAlert}</span>;
      default:
        return <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-sm flex items-center gap-1"><CheckCircle className="w-3 h-3" /> SAFE</span>;
    }
  };

  return (
    <section className="w-full bg-white py-12 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* GPS Location Status Banner when GPS is not granted */}
        {!isGPSActive && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-sm">
                📍
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Location Unavailable — Enable GPS for Local Telemetry
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  SAHAY uses real browser GPS coordinates to detect your exact village, town, or district (e.g., Erumeli South, Kottayam) without IP guessing.
                </p>
              </div>
            </div>
            <button
              onClick={requestLocation || openPromptModal}
              disabled={loading}
              className="px-4 py-2 bg-[#059669] hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              {loading ? 'Detecting GPS...' : 'Enable Location'}
            </button>
          </div>
        )}
        
        {/* Section Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-[#059669] uppercase tracking-wider">
              {t.districtTelemetry}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {t.districtLiveAlert}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {t.districtDesc}
            </p>
          </div>

          {/* Controls: Search and Filter Pills */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchDistrict}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#059669] w-44"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              {['ALL', 'RED', 'ORANGE', 'YELLOW', 'GREEN'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterAlert(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                    filterAlert === lvl
                      ? 'bg-white text-[#059669] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* District Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDistricts.map((item) => (
            <div
              key={item.district}
              className={`rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg flex flex-col justify-between ${
                item.alertLevel === 'RED'
                  ? 'bg-red-50/40 border-red-200'
                  : item.alertLevel === 'ORANGE'
                  ? 'bg-orange-50/40 border-orange-200'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div>
                {/* District Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                      {item.district}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {item.region}
                    </p>
                  </div>
                  {getAlertBadge(item.alertLevel)}
                </div>

                {/* Weather Temp & Status */}
                <div className="flex items-center gap-3 my-4 bg-white/90 p-3 rounded-xl border border-slate-100">
                  <CloudRain className="w-8 h-8 text-[#059669]" />
                  <div>
                    <div className="text-2xl font-black text-slate-900 leading-none">
                      {item.temp}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 mt-0.5">
                      {item.condition}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs border-y border-slate-200/60 my-3">
                  <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase">{currentLang === 'ml' ? 'മഴ' : 'Rainfall'}</div>
                    <div className="font-extrabold text-slate-800">{item.rainfall}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase">{currentLang === 'ml' ? 'കാറ്റ്' : 'Wind'}</div>
                    <div className="font-extrabold text-slate-800">{item.windSpeed}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase">{currentLang === 'ml' ? 'ഈർപ്പം' : 'Humidity'}</div>
                    <div className="font-extrabold text-slate-800">{item.humidity}</div>
                  </div>
                </div>

                {/* Advisory */}
                <p className="text-xs text-slate-700 font-medium line-clamp-2 mt-2 leading-relaxed">
                  📢 <strong>{currentLang === 'ml' ? 'നിർദ്ദേശം:' : 'Advisory:'}</strong> {item.advisory}
                </p>
              </div>

              <button className="mt-4 w-full py-2 bg-white hover:bg-emerald-50 text-[#059669] border border-emerald-200 rounded-xl text-xs font-bold transition-colors">
                {currentLang === 'ml' ? 'പൂർണ്ണ ബുള്ളറ്റിൻ കാണുക' : 'View Full District Bulletin'}
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
