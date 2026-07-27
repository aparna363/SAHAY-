import React from 'react';
import { Newspaper, Calendar, ArrowRight } from 'lucide-react';

export const NewsPage: React.FC = () => {
  const newsList = [
    {
      id: 1,
      category: 'PRESS RELEASE',
      date: '26 July 2026',
      title: 'Chief Minister Convenes Emergency High-Level Disaster Review Meeting',
      summary: 'State Cabinet reviews monsoon preparedness across 14 districts. District Collectors empowered to release emergency contingency funds and deploy additional rescue forces in high-risk zones.',
      author: 'PRD Kerala & KSDMA Secretariat',
      tag: 'Cabinet Advisory',
    },
    {
      id: 2,
      category: 'FIELD UPDATE',
      date: '25 July 2026',
      title: 'NDRF 4th Battalion Deploys 8 Additional Rescue Squads to Wayanad & Idukki',
      summary: 'Heavy earth-moving machinery, satellite phones, and inflatable motor boats airlifted to Vythiri and Munnar. Control room active round the clock.',
      author: 'State Emergency Operations Centre',
      tag: 'Rescue Operations',
    },
    {
      id: 3,
      category: 'PUBLIC ADVISORY',
      date: '25 July 2026',
      title: 'KSEB Issues Electrical Safety Advisory During Heavy Rainfall & Windstorms',
      summary: 'Citizens strictly advised not to touch fallen electric cables or stay near metallic posts. Report broken power lines immediately to 1912 hotline.',
      author: 'KSEB Safety Directorate',
      tag: 'Public Safety',
    },
    {
      id: 4,
      category: 'HEALTH BULLETIN',
      date: '24 July 2026',
      title: 'Health Department Opens Special Epidemic Control Cells in All Relief Camps',
      summary: 'Prophylactic medicines for Leptospirosis (Rat Fever) distributed free of cost in flood-affected panchayats. Mobile medical vans operating in rural sectors.',
      author: 'Directorate of Health Services',
      tag: 'Health Notice',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-[#043e2e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#065f46] px-3.5 py-1 rounded-full text-xs font-bold text-emerald-200 mb-2">
            <Newspaper className="w-4 h-4 text-emerald-400" />
            <span>KSDMA Official Press Desk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Official News & Media Advisories
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl font-normal">
            Verified government press bulletins, CM office statements, and public advisories.
          </p>
        </div>
      </div>

      {/* News Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {newsList.map((item) => (
          <div 
            key={item.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
                  {item.category}
                </span>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.date}
                </span>
              </div>

              <h2 className="text-xl font-black text-slate-900 group-hover:text-[#059669] transition-colors leading-snug">
                {item.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-3 leading-relaxed">
                {item.summary}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">{item.author}</span>
              <button className="text-[#059669] hover:underline flex items-center gap-1">
                Read Full Release <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
