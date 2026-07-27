import React, { useState } from 'react';
import { CloudRain, Wind, Droplets, Compass, MapPin, Search, Calendar } from 'lucide-react';

export const WeatherPage: React.FC = () => {
  const [selectedDistrict, setSelectedDistrict] = useState('Idukki');
  const [search, setSearch] = useState('');

  const districtData: Record<string, {
    temp: string;
    condition: string;
    humidity: string;
    wind: string;
    rainfall: string;
    pressure: string;
    uvIndex: string;
    alert: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
    forecast: Array<{ day: string; condition: string; high: string; low: string; rain: string }>;
  }> = {
    Idukki: {
      temp: '24°C',
      condition: 'Heavy Downpour & Thunderstorms',
      humidity: '94%',
      wind: '28 km/h (WSW)',
      rainfall: '142 mm',
      pressure: '1006 hPa',
      uvIndex: '2 (Low)',
      alert: 'RED',
      forecast: [
        { day: 'Today', condition: 'Heavy Rain', high: '24°C', low: '19°C', rain: '95%' },
        { day: 'Mon', condition: 'Torrential Rain', high: '23°C', low: '18°C', rain: '90%' },
        { day: 'Tue', condition: 'Moderate Rain', high: '25°C', low: '20°C', rain: '75%' },
        { day: 'Wed', condition: 'Scattered Showers', high: '26°C', low: '21°C', rain: '50%' },
        { day: 'Thu', condition: 'Partly Cloudy', high: '27°C', low: '21°C', rain: '30%' },
      ],
    },
    Wayanad: {
      temp: '23°C',
      condition: 'Heavy Rainfall & High Wind',
      humidity: '96%',
      wind: '32 km/h (SW)',
      rainfall: '168 mm',
      pressure: '1004 hPa',
      uvIndex: '1 (Low)',
      alert: 'RED',
      forecast: [
        { day: 'Today', condition: 'Heavy Rain', high: '23°C', low: '18°C', rain: '98%' },
        { day: 'Mon', condition: 'Torrential Downpour', high: '22°C', low: '17°C', rain: '92%' },
        { day: 'Tue', condition: 'Heavy Showers', high: '24°C', low: '19°C', rain: '80%' },
        { day: 'Wed', condition: 'Moderate Rain', high: '25°C', low: '20°C', rain: '60%' },
        { day: 'Thu', condition: 'Cloudy', high: '26°C', low: '20°C', rain: '35%' },
      ],
    },
    Ernakulam: {
      temp: '30°C',
      condition: 'Moderate Rain & Thunder',
      humidity: '84%',
      wind: '20 km/h (W)',
      rainfall: '58 mm',
      pressure: '1008 hPa',
      uvIndex: '4 (Moderate)',
      alert: 'ORANGE',
      forecast: [
        { day: 'Today', condition: 'Moderate Rain', high: '30°C', low: '24°C', rain: '80%' },
        { day: 'Mon', condition: 'Thundershowers', high: '29°C', low: '24°C', rain: '75%' },
        { day: 'Tue', condition: 'Light Rain', high: '31°C', low: '25°C', rain: '50%' },
        { day: 'Wed', condition: 'Partly Cloudy', high: '32°C', low: '25°C', rain: '30%' },
        { day: 'Thu', condition: 'Sunny Spells', high: '32°C', low: '26°C', rain: '20%' },
      ],
    },
    Thiruvananthapuram: {
      temp: '31°C',
      condition: 'Light Drizzle & Breeze',
      humidity: '76%',
      wind: '16 km/h (SSW)',
      rainfall: '18 mm',
      pressure: '1010 hPa',
      uvIndex: '6 (High)',
      alert: 'YELLOW',
      forecast: [
        { day: 'Today', condition: 'Light Drizzle', high: '31°C', low: '25°C', rain: '40%' },
        { day: 'Mon', condition: 'Passing Showers', high: '31°C', low: '25°C', rain: '45%' },
        { day: 'Tue', condition: 'Partly Cloudy', high: '32°C', low: '26°C', rain: '25%' },
        { day: 'Wed', condition: 'Sunny Spells', high: '33°C', low: '26°C', rain: '15%' },
        { day: 'Thu', condition: 'Clear Sky', high: '33°C', low: '26°C', rain: '10%' },
      ],
    },
  };

  const current = districtData[selectedDistrict] || districtData['Idukki'];

  const allDistricts = ['Idukki', 'Wayanad', 'Ernakulam', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Palakkad', 'Kottayam'];

  const filteredList = allDistricts.filter(d => d.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
              <CloudRain className="w-4 h-4 text-emerald-400" />
              <span>IMD Weather Telemetry Station</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Kerala Live Weather & Monsoon Portal
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-2xl font-normal">
              Official meteorology data, radar updates, district rainfall statistics, and 5-day forecasts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search district..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-white text-slate-900 text-xs font-bold focus:outline-none w-44 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* District Buttons Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filteredList.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDistrict(d)}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap ${
              selectedDistrict === d
                ? 'bg-[#059669] text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Selected District Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Weather Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <MapPin className="w-4 h-4 text-[#059669]" />
                <span>Station: {selectedDistrict} Collectorate Observatory</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mt-1">{selectedDistrict}</h2>
              <p className="text-sm font-semibold text-emerald-700 mt-0.5">{current.condition}</p>
            </div>

            <span className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border shadow-sm ${
              current.alert === 'RED' ? 'bg-red-600 text-white' :
              current.alert === 'ORANGE' ? 'bg-orange-600 text-white' : 'bg-amber-500 text-slate-900'
            }`}>
              {current.alert} ALERT
            </span>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#059669]">
              <CloudRain className="w-12 h-12 animate-bounce" />
            </div>
            <div>
              <div className="text-5xl font-black text-slate-900 tracking-tight">{current.temp}</div>
              <div className="text-xs font-bold text-slate-500 mt-1">RealFeel: {current.temp}</div>
            </div>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <Droplets className="w-5 h-5 text-sky-500 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-500 uppercase">Humidity</div>
              <div className="text-lg font-black text-slate-900">{current.humidity}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <Wind className="w-5 h-5 text-[#059669] mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-500 uppercase">Wind Speed</div>
              <div className="text-lg font-black text-slate-900">{current.wind}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <CloudRain className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-500 uppercase">24h Rainfall</div>
              <div className="text-lg font-black text-slate-900">{current.rainfall}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
              <Compass className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-500 uppercase">Pressure</div>
              <div className="text-lg font-black text-slate-900">{current.pressure}</div>
            </div>
          </div>
        </div>

        {/* 5-Day Outlook */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#059669]" />
              5-Day Regional Outlook
            </h3>
            <span className="text-xs font-bold text-slate-400">Updated hourly</span>
          </div>

          <div className="space-y-3">
            {current.forecast.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-emerald-50/50 transition-colors">
                <div className="w-20 font-extrabold text-slate-900 text-sm">{f.day}</div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-1">
                  <CloudRain className="w-4 h-4 text-[#059669]" />
                  <span>{f.condition}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900">{f.high} / {f.low}</div>
                  <div className="text-[10px] font-bold text-sky-600">{f.rain} Rain</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
