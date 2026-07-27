import React, { useState } from 'react';
import { ShieldCheck, CheckSquare, ChevronDown, Download } from 'lucide-react';

export const PreparednessGuide: React.FC = () => {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);

  const guides = [
    {
      title: 'Cyclone & High Wind Safety Measures',
      icon: '🌪️',
      items: [
        'Secure loose roof sheets, solar panels, and outdoor items before high winds hit.',
        'Keep emergency battery lights, power banks, and essential medicines charged.',
        'Disconnect electrical appliances if lightning occurs or water enters home.',
        'Do not stand near old trees, electric poles, or weak structures during wind warnings.'
      ]
    },
    {
      title: 'Heavy Flood & Inundation Protocol',
      icon: '🌊',
      items: [
        'Move to higher ground or upper floors immediately if water begins entering premises.',
        'Store drinking water in clean containers before tap supply is contaminated.',
        'Keep important identity documents, cash, and medical records in waterproof pouches.',
        'Never drive or wade through flowing flood water — fast currents can sweep vehicles away.'
      ]
    },
    {
      title: 'Landslide Warning Signs in High Ranges (Munnar/Wayanad)',
      icon: '⛰️',
      items: [
        'Watch for sudden muddy water flow from hillside springs or cracks in retaining walls.',
        'Listen for unusual sounds like trees snapping or rumbling earth movements.',
        'Evacuate immediately if local revenue officials issue red alert warnings for hillsides.'
      ]
    }
  ];

  const kitChecklist = [
    'Drinking water (3-day supply per person)',
    'Non-perishable packed food items & energy bars',
    'First Aid kit with antiseptic & prescription medicines',
    'High-intensity LED torch with extra batteries',
    'Fully charged power bank & phone cables',
    'Emergency whistle & waterproof ID pouch',
    'Raincoats, sturdy footwear & spare warm clothes'
  ];

  return (
    <section className="w-full bg-white py-12 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-[#059669] uppercase tracking-wider">
              Disaster Management Handbook
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Citizen Preparedness & Safety Advisories
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Official safety checklists and response guidelines verified by Kerala State Disaster Management Authority (KSDMA).
            </p>
          </div>

          <button className="btn-outline text-xs font-bold flex items-center gap-2 self-start md:self-auto">
            <Download className="w-4 h-4" />
            <span>Download Disaster Manual (PDF)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Accordion Guides */}
          <div className="lg:col-span-7 space-y-4">
            {guides.map((guide, idx) => {
              const isOpen = activeAccordion === idx;
              return (
                <div 
                  key={idx} 
                  className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all"
                >
                  <button
                    onClick={() => setActiveAccordion(isOpen ? null : idx)}
                    className="w-full p-5 bg-slate-50 hover:bg-emerald-50/60 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{guide.icon}</span>
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                        {guide.title}
                      </h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#059669]' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="p-5 bg-white border-t border-slate-100 animate-fadeIn space-y-3">
                      {guide.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 font-medium">
                          <CheckSquare className="w-4 h-4 text-[#059669] flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: 72-Hour Emergency Kit Checklist */}
          <div className="lg:col-span-5">
            <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">72-Hour Emergency Kit</h3>
                  <p className="text-xs text-emerald-300">Essential survival checklist for every home</p>
                </div>
              </div>

              <div className="space-y-3 my-5">
                {kitChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-emerald-900/60 p-2.5 rounded-xl border border-emerald-800/80 text-xs sm:text-sm font-semibold text-emerald-100">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/80 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center text-xs text-emerald-300 font-medium">
                Keep emergency kit easily accessible near front entrance.
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
