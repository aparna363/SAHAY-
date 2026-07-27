import React, { useState } from 'react';
import { Bell, Phone, CloudRain, Droplets, Wind, ShieldCheck, RefreshCw, MapPin } from 'lucide-react';
import cycloneBg from '../assets/cyclone.png';
import { translations } from '../translations';
import type { Language } from '../translations';

interface HeroSectionProps {
  currentLang: Language;
  onOpenAlerts: () => void;
  onOpenContacts: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ currentLang, onOpenAlerts, onOpenContacts }) => {
  const [selectedDistrict, setSelectedDistrict] = useState('Idukki & Wayanad');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const t = translations[currentLang];

  const weatherData: Record<string, { temp: string; status: string; humidity: string; wind: string; alert: string; alertBg: string }> = {
    'Idukki & Wayanad': {
      temp: '28°C',
      status: currentLang === 'ml' ? 'കനത്ത മഴ' : currentLang === 'hi' ? 'भारी बारिश' : 'Heavy Rain',
      humidity: '89%',
      wind: '14 km/h',
      alert: t.redAlert,
      alertBg: 'bg-red-100 text-red-700 border-red-200'
    },
    'Ernakulam (Kochi)': {
      temp: '30°C',
      status: currentLang === 'ml' ? 'ഇടത്തരം മഴ' : currentLang === 'hi' ? 'मध्यम बारिश' : 'Moderate Rain',
      humidity: '82%',
      wind: '18 km/h',
      alert: t.orangeAlert,
      alertBg: 'bg-orange-100 text-orange-700 border-orange-200'
    },
    'Thiruvananthapuram': {
      temp: '31°C',
      status: currentLang === 'ml' ? 'ചാറ്റൽമഴ' : currentLang === 'hi' ? 'हल्की बूंदबांदी' : 'Light Drizzle',
      humidity: '76%',
      wind: '22 km/h',
      alert: t.yellowAlert,
      alertBg: 'bg-amber-100 text-amber-700 border-amber-200'
    },
    'Kozhikode': {
      temp: '29°C',
      status: currentLang === 'ml' ? 'ശക്തമായ മഴ' : currentLang === 'hi' ? 'मूसलाधार बारिश' : 'Heavy Downpour',
      humidity: '87%',
      wind: '16 km/h',
      alert: t.redAlert,
      alertBg: 'bg-red-100 text-red-700 border-red-200'
    }
  };

  const currentWeather = weatherData[selectedDistrict] || weatherData['Idukki & Wayanad'];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <section className="relative w-full min-h-[560px] lg:min-h-[620px] flex items-center overflow-hidden bg-slate-900">
      {/* Cyclone Satellite Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 transform scale-105"
        style={{
          backgroundImage: `url(${cycloneBg})`,
        }}
      />

      {/* Dark Vignette & Gradient Overlay for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-slate-950/40 backdrop-brightness-[0.85]" />

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Left Hero Content */}
        <div className="lg:col-span-7 space-y-6 text-white animate-fade-in">
          
          {/* Government Portal Badge */}
          <div className="inline-flex items-center gap-2 bg-[#ecfdf5]/95 backdrop-blur-md text-[#065f46] px-4 py-1.5 rounded-full border border-emerald-300 shadow-lg text-xs sm:text-sm font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-[#059669]" />
            <span>{t.portalBadge}</span>
          </div>

          {/* Main Title */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-6xl lg:text-6xl font-extrabold tracking-tight text-white leading-none drop-shadow-md">
              {t.heroTitle1}
            </h1>
            <h1 className="text-4xl sm:text-6xl lg:text-6xl font-extrabold tracking-tight text-emerald-400 leading-none drop-shadow-md">
              {t.heroTitle2}
            </h1>
          </div>

          {/* Subtitle / Description */}
          <p className="text-slate-200 text-base sm:text-lg max-w-2xl font-normal leading-relaxed drop-shadow-sm">
            {t.heroDesc}
          </p>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            {/* Live Alerts CTA Button */}
            <button
              onClick={onOpenAlerts}
              className="btn-primary text-sm sm:text-base px-6 py-3.5 flex items-center gap-2.5 font-bold shadow-xl hover:scale-105 transition-all"
            >
              <Bell className="w-5 h-5 text-white animate-pulse" />
              <span>{t.btnLiveAlerts}</span>
            </button>

            {/* Emergency Contacts CTA Button */}
            <button
              onClick={onOpenContacts}
              className="btn-white text-sm sm:text-base px-6 py-3.5 flex items-center gap-2.5 font-bold text-[#043e2e] shadow-xl hover:bg-emerald-50 hover:scale-105 transition-all"
            >
              <Phone className="w-5 h-5 text-[#059669]" />
              <span>{t.btnEmergencyContacts}</span>
            </button>
          </div>

          {/* Emergency Taglines */}
          <div className="pt-2 flex items-center gap-6 text-xs text-emerald-200 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {t.controlRoomActive}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {t.ndrfDeployed}
            </span>
          </div>

        </div>

        {/* Right Hero Weather Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/80 transition-all duration-300 hover:shadow-emerald-900/20">
            
            {/* Weather Header Top Row */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669] shadow-inner">
                  <CloudRain className="w-8 h-8 text-[#059669] animate-bounce" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {currentWeather.status}
                  </h3>
                  <div className="text-3xl sm:text-4xl font-black text-[#059669] tracking-tight">
                    {currentWeather.temp}
                  </div>
                </div>
              </div>

              <button
                onClick={handleRefresh}
                className={`p-2 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                title="Refresh Live Weather"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* District Selector Pill */}
            <div className="mb-5 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {t.location}:
              </span>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="Idukki & Wayanad">Idukki & Wayanad</option>
                <option value="Ernakulam (Kochi)">Ernakulam (Kochi)</option>
                <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                <option value="Kozhikode">Kozhikode</option>
              </select>
            </div>

            {/* Weather Metrics List */}
            <div className="space-y-4">
              {/* Humidity */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-500" />
                  {t.humidity}
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  {currentWeather.humidity}
                </span>
              </div>

              {/* Wind Speed */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-[#059669]" />
                  {t.windSpeed}
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  {currentWeather.wind}
                </span>
              </div>

              {/* Alert Level */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-slate-600">
                  {t.alertLevel}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border shadow-sm ${currentWeather.alertBg}`}>
                  {currentWeather.alert}
                </span>
              </div>
            </div>

            {/* Live Weather Source Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{t.sourceImd}</span>
              <span className="text-emerald-600 font-semibold">{t.updatedAgo}</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
