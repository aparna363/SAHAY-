import React from 'react';
import { X, CheckCircle2, FileText, ShieldCheck, ArrowRight, Clock, Building2 } from 'lucide-react';

interface ReliefHowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyClick?: () => void;
}

export const ReliefHowItWorksModal: React.FC<ReliefHowItWorksModalProps> = ({
  isOpen,
  onClose,
  onApplyClick
}) => {
  if (!isOpen) return null;

  const workflowSteps = [
    {
      num: '1',
      title: 'Citizen Lodges Application',
      desc: 'Fill the 9-step online application form with disaster details, applicant info, damage category, GPS location, and bank account.',
      badge: 'Step 1'
    },
    {
      num: '2',
      title: 'Preliminary AI Assessment',
      desc: 'Uploaded damage photographs are evaluated by SAHAY AI to generate a preliminary severity confidence indicator for officials.',
      badge: 'Step 2'
    },
    {
      num: '3',
      title: 'Field Officer Inspection',
      desc: 'A designated local revenue or rescue officer visits the affected site to cross-verify physical damage and coordinates.',
      badge: 'Step 3'
    },
    {
      num: '4',
      title: 'District Collector Sanction',
      desc: 'The District Collector reviews verified inspection reports and sanctions assistance amounts according to SDRF/NDRF norms.',
      badge: 'Step 4'
    },
    {
      num: '5',
      title: 'Direct Benefit Transfer (DBT)',
      desc: 'Approved relief funds are credited directly to the validated bank account via automated payment advice.',
      badge: 'Step 5'
    }
  ];

  const norms = [
    { category: 'Fully Destroyed Permanent House', amount: '₹1,30,000 max', note: 'Concrete / brick structure - subject to land tenure verification' },
    { category: 'Fully Destroyed Temporary House', amount: '₹95,000 max', note: 'Traditional mud / thatch / non-permanent residential dwelling' },
    { category: 'Severely Damaged House', amount: '₹40,000 max', note: 'Structural repair & restoration assistance' },
    { category: 'Partially Damaged House', amount: '₹15,000 max', note: 'Desilting and minor restoration grant' },
    { category: 'Immediate Gratuitous Relief', amount: '₹10,000', note: 'Emergency essential clothing and food necessities' },
    { category: 'Agricultural Crop Loss', amount: '₹25,000 / ha', note: 'Crop loss exceeding 33% per revenue survey' },
    { category: 'Loss of Milch Cattle / Buffalo', amount: '₹37,500 / animal', note: 'Maximum 3 milch animals per household' },
    { category: 'Death Ex-gratia Assistance', amount: '₹4,00,000', note: 'Disaster fatality compensation to next of kin' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#043e2e] via-[#065f46] to-[#043e2e] text-white p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-800 text-emerald-200 px-2.5 py-0.5 rounded-full">
                OFFICIAL GUIDELINES
              </span>
            </div>
            <h2 className="text-xl font-black mt-1">How Disaster Relief & Compensation Works</h2>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              State Disaster Response Fund (SDRF) eligibility, verification, and disbursement workflow.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar text-slate-800">
          
          {/* Important Rule Banner */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#0E8F66] shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-1">
              <p className="font-extrabold text-[#0B4D3B]">Zero Agent Fees &bull; 100% Direct Citizen Service</p>
              <p className="text-emerald-800 leading-relaxed">
                Relief assistance under SDRF/NDRF is an official entitlement for disaster victims. No fee or intermediary is authorized.
                All applications are audited with GPS coordinates and verified by the District Administration.
              </p>
            </div>
          </div>

          {/* Workflow Stepper */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0E8F66]" />
              <span>5-Stage Application Lifecycle</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {workflowSteps.map((step, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-[#0E8F66] text-white font-black text-xs flex items-center justify-center">
                      {step.num}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{step.badge}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{step.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Applicable Norms Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0E8F66]" />
                <span>Indicative Assistance Norms (SDRF Kerala)</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500">Official SDRF Table</span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-100 p-2.5 font-bold text-slate-700 grid grid-cols-12 gap-2 text-[11px] uppercase">
                <span className="col-span-5">Category</span>
                <span className="col-span-3">Maximum Norm</span>
                <span className="col-span-4">Eligibility Condition</span>
              </div>
              <div className="divide-y divide-slate-100">
                {norms.map((norm, nIdx) => (
                  <div key={nIdx} className="p-2.5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50">
                    <span className="col-span-5 font-bold text-slate-900">{norm.category}</span>
                    <span className="col-span-3 font-extrabold text-[#0E8F66]">{norm.amount}</span>
                    <span className="col-span-4 text-slate-500 text-[11px]">{norm.note}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * Final approved compensation is calculated strictly based on official field survey reports and government gazette notifications.
            </p>
          </div>

          {/* Required Documents Checklist */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Recommended Supporting Documents</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Damage photographs (Clear photos from multiple angles)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Bank passbook / cancelled cheque copy with IFSC</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Ration Card / Voter ID / Aadhaar for identity verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Land tax receipt or lease agreement (for house/crop claims)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            For assistance, contact District Control Room: <strong className="text-slate-800">1077</strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
            {onApplyClick && (
              <button
                onClick={() => {
                  onClose();
                  onApplyClick();
                }}
                className="px-4 py-2 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>Apply for Relief Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
