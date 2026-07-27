import React, { useState } from 'react';
import { MapPin, Layers, Home, Waves, Shield, Navigation, CheckCircle2 } from 'lucide-react';

export const LiveMapPage: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<'all' | 'camps' | 'dams' | 'floods' | 'units'>('all');
  const [selectedPin, setSelectedPin] = useState<string | null>('Munnar Relief Shelter');

  const mapLocations = [
    {
      id: 'Munnar Relief Shelter',
      type: 'camps',
      title: 'Munnar Govt High School Relief Camp',
      district: 'Idukki',
      capacity: '450 / 600 Beds',
      status: 'OPEN & ACTIVE',
      lat: '10.0889° N',
      lng: '77.0595° E',
      contact: '04862-233111',
    },
    {
      id: 'Aluva Flood Camp',
      type: 'camps',
      title: 'Aluva St. Xavier College Relief Camp',
      district: 'Ernakulam',
      capacity: '320 / 500 Beds',
      status: 'OPEN & ACTIVE',
      lat: '10.1080° N',
      lng: '76.3570° E',
      contact: '0484-2423001',
    },
    {
      id: 'Idukki Arch Dam',
      type: 'dams',
      title: 'Idukki Hydroelectric Reservoir',
      district: 'Idukki',
      capacity: '2398.50 ft (92% Storage)',
      status: 'RED ALERT - 2 Shutters Open',
      lat: '9.8433° N',
      lng: '76.9744° E',
      contact: '04862-232200',
    },
    {
      id: 'Meppadi Rescue Post',
      type: 'units',
      title: 'NDRF 4th Battalion Rescue Post',
      district: 'Wayanad',
      capacity: '45 Personnel + 6 Boats',
      status: 'DEPLOYED & OPERATIONAL',
      lat: '11.5516° N',
      lng: '76.1264° E',
      contact: '1077',
    },
    {
      id: 'Periyar River Basin',
      type: 'floods',
      title: 'Periyar River Overflow Hazard Zone',
      district: 'Ernakulam & Thrissur',
      capacity: 'Level 6.45m (Danger line 6.50m)',
      status: 'WARNING ACTIVE',
      lat: '10.1500° N',
      lng: '76.2500° E',
      contact: '112',
    },
  ];

  const filteredPins = mapLocations.filter(p => activeLayer === 'all' || p.type === activeLayer);
  const currentPin = mapLocations.find(p => p.id === selectedPin) || mapLocations[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      
      {/* Page Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>KSDMA Spatial GIS Telemetry System</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Interactive Disaster & Shelter Map
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl font-normal">
            Real-time geolocation telemetry for active relief camps, dam shutter positions, flood zones, and rescue team positions.
          </p>
        </div>

        {/* Layer Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-[#032e22] p-1.5 rounded-2xl border border-emerald-800">
          {[
            { id: 'all', label: 'All Layers' },
            { id: 'camps', label: 'Relief Camps' },
            { id: 'dams', label: 'Dam Storage' },
            { id: 'floods', label: 'Flood Hazard' },
            { id: 'units', label: 'NDRF Units' },
          ].map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                activeLayer === layer.id
                  ? 'bg-[#059669] text-white shadow-sm'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-800/60'
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Interactive GIS Map Canvas View */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl relative min-h-[480px] lg:min-h-[540px] overflow-hidden flex flex-col justify-between p-6">
          
          {/* Map Vector Grid & Satellite Simulation Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/40 pointer-events-none" />

          {/* Top Bar inside Map */}
          <div className="relative z-10 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800/80 text-xs font-bold text-white">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Kerala GIS Satellite Feed (Live 2026)</span>
            </div>
            <div className="text-emerald-400 font-mono text-[11px]">
              GPS: 10.8505° N, 76.2711° E
            </div>
          </div>

          {/* Map Interactive Markers Grid */}
          <div className="relative z-10 my-auto grid grid-cols-2 sm:grid-cols-3 gap-4 py-8">
            {filteredPins.map((pin) => (
              <button
                key={pin.id}
                onClick={() => setSelectedPin(pin.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer shadow-lg group ${
                  selectedPin === pin.id
                    ? 'bg-emerald-950 border-emerald-400 ring-2 ring-emerald-400/50 scale-105'
                    : 'bg-slate-950/90 border-slate-800 hover:border-emerald-600 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    pin.type === 'camps' ? 'bg-emerald-600 text-white' :
                    pin.type === 'dams' ? 'bg-amber-600 text-white' :
                    pin.type === 'floods' ? 'bg-red-600 text-white' : 'bg-sky-600 text-white'
                  }`}>
                    {pin.type === 'camps' ? <Home className="w-4 h-4" /> :
                     pin.type === 'dams' ? <Waves className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">{pin.district}</span>
                </div>

                <div className="text-xs font-black text-white group-hover:text-emerald-300 line-clamp-1">
                  {pin.title}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1 line-clamp-1">
                  {pin.status}
                </div>
              </button>
            ))}
          </div>

          {/* Map Footer Bar */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 font-medium pt-3 border-t border-slate-800">
            <span>Layers: Camps • Dams • Hazard Zones • NDRF Teams</span>
            <span className="text-emerald-400 font-semibold">Coordinates Synced</span>
          </div>

        </div>

        {/* Right Info Drawer for Selected Marker */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669]">
              <MapPin className="w-6 h-6 text-[#059669]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Location Details
              </span>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {currentPin.title}
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">District & Division</div>
              <div className="text-sm font-black text-slate-900">{currentPin.district}</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Capacity / Status Parameter</div>
              <div className="text-sm font-black text-emerald-700">{currentPin.capacity}</div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-1">
              <div className="text-[10px] font-bold text-emerald-800 uppercase">Current Operational State</div>
              <div className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                {currentPin.status}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Nodal Hotline:</span>
              <a href={`tel:${currentPin.contact}`} className="text-[#059669] hover:underline font-extrabold">
                {currentPin.contact}
              </a>
            </div>
          </div>

          <button className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2">
            <Navigation className="w-4 h-4" />
            <span>Get GPS Navigation Directions</span>
          </button>
        </div>

      </div>
    </div>
  );
};
