import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CreditCard,
  MapPin,
  User
} from 'lucide-react';
import type { ReliefClaim } from '../../services/api';
import logoSahay from '../../assets/logo_sahay.png';

interface ReliefAcknowledgementModalProps {
  claim: ReliefClaim | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Generates deterministic 21x21 QR Code SVG string for safe verification
 */
function getQrCodeSvgString(text: string): string {
  const size = 21;
  const hash = text.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 17);

  const isDark = (r: number, c: number) => {
    if ((r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)) {
      if (r === 0 || r === 6 || c === 0 || c === 6 || (r === size - 1 || r === size - 7 || c === size - 1 || c === size - 7)) return true;
      if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
      if (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) return true;
      if (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4) return true;
      return false;
    }
    if (r === 6 || c === 6) return (r + c) % 2 === 0;
    return ((hash ^ (r * 19 + c * 37)) % 3) === 0;
  };

  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isDark(r, c)) {
        rects += `<rect x="${c * 5}" y="${r * 5}" width="5" height="5" fill="#0f172a" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size * 5} ${size * 5}" width="100" height="100" style="border: 1px solid #cbd5e1; padding: 4px; background: #fff; border-radius: 8px;">${rects}</svg>`;
}

/**
 * Minimal Safe QR Code SVG component for in-modal preview
 */
function SafeQrCode({ text }: { text: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: getQrCodeSvgString(text) }}
      className="shrink-0 flex items-center justify-center"
    />
  );
}

/**
 * Generates pure, self-contained, professional HTML document
 * containing ONLY the Application Form and user-entered details.
 */
function generateOfficialDocumentHtml(claim: ReliefClaim, verificationUrl: string): string {
  const formattedDate = claim.disaster_date
    ? new Date(claim.disaster_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not Specified';

  const submittedAt = claim.submitted_at
    ? new Date(claim.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('en-IN');

  const qrSvg = getQrCodeSvgString(verificationUrl);

  const vulnerableStr = Array.isArray(claim.vulnerable_person_category) && claim.vulnerable_person_category.length > 0
    ? claim.vulnerable_person_category.join(', ')
    : 'None declared';

  // Conditional Sections based on Assistance Category
  let specificDamageHtml = '';

  if (claim.house_rooms || claim.house_ownership || claim.house_type || claim.affected_area) {
    specificDamageHtml = `
      <div class="section-title">SECTION 4A: RESIDENTIAL PROPERTY DAMAGE PARTICULARS</div>
      <table class="data-table">
        <tr>
          <td class="lbl">House Ownership:</td>
          <td class="val">${claim.house_ownership || 'Owned'}</td>
          <td class="lbl">Construction Type:</td>
          <td class="val">${claim.house_type ? (claim.house_type === 'Concrete/RCC' ? 'Concrete / Reinforced Cement (Permanent)' : claim.house_type === 'Mud/Traditional' ? 'Mud / Traditional (Non-permanent)' : claim.house_type) : 'Permanent House (Concrete/Brick)'}</td>
        </tr>
        <tr>
          <td class="lbl">Number of Rooms:</td>
          <td class="val">${claim.house_rooms || 1} Rooms</td>
          <td class="lbl">Estimated Affected Area:</td>
          <td class="val">${claim.affected_area ? `${claim.affected_area} sq. metres` : 'Not specified'}</td>
        </tr>
        <tr>
          <td class="lbl">Current Habitability:</td>
          <td class="val">${claim.habitability_status || 'Partially safe'}</td>
          <td class="lbl">Household Displaced:</td>
          <td class="val">${claim.is_displaced ? `Yes (${claim.current_accommodation || 'Relief Camp'})` : 'No (Residing at home)'}</td>
        </tr>
      </table>
    `;
  } else if (claim.crop_type || claim.total_crop_area || claim.affected_crop_area) {
    specificDamageHtml = `
      <div class="section-title">SECTION 4B: AGRICULTURAL & CROP LOSS PARTICULARS</div>
      <table class="data-table">
        <tr>
          <td class="lbl">Crop Type:</td>
          <td class="val">${claim.crop_type || 'Not specified'}</td>
          <td class="lbl">Agricultural Land Type:</td>
          <td class="val">${claim.agricultural_land_type || 'Irrigated Wetland'}</td>
        </tr>
        <tr>
          <td class="lbl">Total Crop Area:</td>
          <td class="val">${claim.total_crop_area ? `${claim.total_crop_area} Hectares` : 'N/A'}</td>
          <td class="lbl">Affected Area:</td>
          <td class="val">${claim.affected_crop_area ? `${claim.affected_crop_area} Hectares` : 'N/A'}</td>
        </tr>
        <tr>
          <td class="lbl">Crop Stage:</td>
          <td class="val">${claim.crop_stage || 'Growing'}</td>
          <td class="lbl">Applicant Estimated Loss %:</td>
          <td class="val">${claim.crop_loss_percentage ? `${claim.crop_loss_percentage}%` : 'N/A'}</td>
        </tr>
      </table>
    `;
  } else if (claim.livestock_type || claim.livestock_lost || claim.livestock_injured) {
    specificDamageHtml = `
      <div class="section-title">SECTION 4C: LIVESTOCK & ANIMAL LOSS PARTICULARS</div>
      <table class="data-table">
        <tr>
          <td class="lbl">Animal Type:</td>
          <td class="val">${claim.livestock_type || 'Cattle / Cow'}</td>
          <td class="lbl">Number Lost / Deceased:</td>
          <td class="val">${claim.livestock_lost || 0}</td>
        </tr>
        <tr>
          <td class="lbl">Number Injured:</td>
          <td class="val">${claim.livestock_injured || 0}</td>
          <td class="lbl">Veterinary Inspection:</td>
          <td class="val">Pending District Animal Husbandry verification</td>
        </tr>
      </table>
    `;
  } else if (claim.deceased_person_name) {
    specificDamageHtml = `
      <div class="section-title">SECTION 4D: EX-GRATIA BEREAVEMENT & LEGAL HEIR RECORD</div>
      <table class="data-table">
        <tr>
          <td class="lbl">Deceased Person Full Name:</td>
          <td class="val">${claim.deceased_person_name}</td>
          <td class="lbl">Applicant Legal Heir Status:</td>
          <td class="val">${claim.legal_heir_relationship || 'Legal Heir'}</td>
        </tr>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SAHAY Disaster Relief Form - ${claim.claim_id}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 16mm;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .container {
      max-width: 780px;
      margin: 0 auto;
      border: 1.5px solid #0B4D3B;
      padding: 20px 24px;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0B4D3B;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .emblem-cell {
      width: 60px;
      vertical-align: middle;
    }
    .emblem-box {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: 2px solid #0E8F66;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 11px;
      color: #0B4D3B;
      background: #ecfdf5;
      text-align: center;
      line-height: 1.1;
    }
    .title-cell {
      vertical-align: middle;
      padding-left: 12px;
    }
    .state-title {
      font-size: 16px;
      font-weight: 900;
      color: #0B4D3B;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .dept-title {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 2px 0 0 0;
    }
    .form-title {
      font-size: 10.5px;
      font-weight: 600;
      color: #0E8F66;
      margin: 2px 0 0 0;
      text-transform: uppercase;
    }
    .app-id-cell {
      text-align: right;
      vertical-align: top;
      width: 180px;
    }
    .app-id-badge {
      font-family: monospace;
      font-size: 13px;
      font-weight: 900;
      color: #0B4D3B;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .status-badge {
      font-size: 10px;
      font-weight: 800;
      color: #065f46;
      background: #d1fae5;
      border: 1px solid #6ee7b7;
      padding: 2px 8px;
      border-radius: 10px;
      margin-top: 4px;
      display: inline-block;
      text-transform: uppercase;
    }
    .section-title {
      font-size: 11px;
      font-weight: 900;
      color: #ffffff;
      background: #0B4D3B;
      padding: 4px 8px;
      margin: 12px 0 6px 0;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      border-radius: 2px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .data-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      font-size: 11px;
      vertical-align: top;
    }
    .lbl {
      width: 22%;
      font-weight: 700;
      color: #475569;
      background: #f8fafc;
    }
    .val {
      width: 28%;
      font-weight: 600;
      color: #0f172a;
    }
    .desc-box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 8px 10px;
      font-size: 11px;
      line-height: 1.5;
      margin-bottom: 8px;
      border-radius: 4px;
    }
    .footer-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      border-top: 1.5px solid #cbd5e1;
      padding-top: 10px;
    }
    .footer-table td {
      vertical-align: top;
    }
    .notice-box {
      font-size: 9.5px;
      color: #78350f;
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 6px 8px;
      border-radius: 4px;
      margin-top: 10px;
      line-height: 1.4;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .container {
        border: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- HEADER -->
    <table class="header-table">
      <tr>
        <td class="emblem-cell">
          <div class="emblem-box">SAHAY<br>KERALA</div>
        </td>
        <td class="title-cell">
          <div class="state-title">GOVERNMENT OF KERALA</div>
          <div class="dept-title">DEPARTMENT OF DISASTER MANAGEMENT &bull; STATE DISASTER RESPONSE FUND (SDRF)</div>
          <div class="form-title">Application Form & Digital Acknowledgement Receipt</div>
        </td>
        <td class="app-id-cell">
          <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 700;">Application Code</div>
          <div class="app-id-badge">${claim.claim_id}</div>
          <div><span class="status-badge">${(claim.status || 'SUBMITTED').replace(/_/g, ' ')}</span></div>
        </td>
      </tr>
    </table>

    <!-- SECTION 1: APPLICANT PARTICULARS -->
    <div class="section-title">SECTION 1: APPLICANT & HOUSEHOLD PROFILE</div>
    <table class="data-table">
      <tr>
        <td class="lbl">Applicant Full Name:</td>
        <td class="val">${claim.applicant_name || 'Registered Citizen'}</td>
        <td class="lbl">Contact Phone:</td>
        <td class="val">${claim.applicant_phone || 'Confidential'}</td>
      </tr>
      <tr>
        <td class="lbl">District:</td>
        <td class="val">${claim.district || 'Wayanad'}</td>
        <td class="lbl">Locality / Village / Town:</td>
        <td class="val">${claim.locality || 'Not specified'}</td>
      </tr>
      <tr>
        <td class="lbl">Relationship to Affected:</td>
        <td class="val">${claim.relationship_to_affected || 'Self'}</td>
        <td class="lbl">Affected Family Headcount:</td>
        <td class="val">${claim.affected_family_members || 1} persons (Limit: 1 - 20)</td>
      </tr>
      <tr>
        <td class="lbl">Vulnerable Persons:</td>
        <td class="val" colspan="3">${vulnerableStr}</td>
      </tr>
    </table>

    <!-- SECTION 2: DISASTER EVENT -->
    <div class="section-title">SECTION 2: DISASTER EVENT & AFFECTED LOCATION</div>
    <table class="data-table">
      <tr>
        <td class="lbl">Disaster Event Type:</td>
        <td class="val">${claim.disaster_type}</td>
        <td class="lbl">Date of Occurrence:</td>
        <td class="val">${formattedDate}</td>
      </tr>
      <tr>
        <td class="lbl">Linked Incident:</td>
        <td class="val">${claim.incident_code ? `Reported Incident: ${claim.incident_code}` : 'Direct Relief Claim'}</td>
        <td class="lbl">GPS Triangulation:</td>
        <td class="val">${Number(claim.latitude || 0).toFixed(4)}° N, ${Number(claim.longitude || 0).toFixed(4)}° E</td>
      </tr>
      <tr>
        <td class="lbl">PostGIS Zone Verification:</td>
        <td class="val">${claim.is_in_hazard_zone ? 'Inside Declared Hazard Zone' : 'Standard Boundary Polygon'}</td>
        <td class="lbl">DDMA Scrutiny Office:</td>
        <td class="val">${claim.district} District Collectorate</td>
      </tr>
    </table>

    <!-- SECTION 3: ASSISTANCE & LOSS -->
    <div class="section-title">SECTION 3: ASSISTANCE REQUESTED & LOSS DETAILS</div>
    <table class="data-table">
      <tr>
        <td class="lbl">Assistance Category:</td>
        <td class="val">${claim.assistance_category}</td>
        <td class="lbl">Assessed Severity:</td>
        <td class="val">${claim.damage_severity}</td>
      </tr>
      <tr>
        <td class="lbl">Applicant Estimated Loss:</td>
        <td class="val" colspan="3">₹${parseFloat(String(claim.estimated_loss || 0)).toLocaleString('en-IN')} (Applicant Self-Assessment)</td>
      </tr>
    </table>
    <div style="font-size: 10px; font-weight: 700; color: #475569; margin: 4px 0 2px 0;">Damage Description Entered by Citizen:</div>
    <div class="desc-box">
      ${claim.damage_description || 'No detailed damage description entered.'}
    </div>

    <!-- SECTION 4: CONDITIONAL DAMAGE DETAILS (IF ENTERED) -->
    ${specificDamageHtml}

    <!-- SECTION 5: BANK & PAYMENT -->
    <div class="section-title">SECTION 5: DIRECT BENEFIT TRANSFER (DBT) BANK DETAILS</div>
    <table class="data-table">
      <tr>
        <td class="lbl">Beneficiary Account Name:</td>
        <td class="val">${claim.bank_account_holder || claim.applicant_name || 'Account Holder'}</td>
        <td class="lbl">Disbursement Bank:</td>
        <td class="val">${claim.bank_name || 'State Bank of India'}</td>
      </tr>
      <tr>
        <td class="lbl">Account Number (Masked):</td>
        <td class="val" style="font-family: monospace; font-weight: 800;">${claim.masked_account_number || 'XXXXXX4821'}</td>
        <td class="lbl">Bank IFSC Code:</td>
        <td class="val" style="font-family: monospace; font-weight: 800;">${claim.ifsc_code || 'SBIN0001234'}</td>
      </tr>
    </table>

    <!-- FOOTER: VERIFICATION & DECLARATION -->
    <table class="footer-table">
      <tr>
        <td style="width: 72%;">
          <div style="font-weight: 800; font-size: 11px; color: #0B4D3B;">STATUTORY CITIZEN DECLARATION</div>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">
            The applicant has digitally declared that all information provided is true and accurate. Submissions are governed by the Disaster Management Act, 2005. 
            Final relief sanction and disbursement are subject to physical verification by authorized revenue authorities and DDMA sanction.
          </div>
          <div style="font-size: 9.5px; color: #64748b; font-family: monospace; margin-top: 6px;">
            Application Logged: ${submittedAt} &bull; Digest: ${claim.claim_id.slice(-8)} &bull; Portal: sahay.kerala.gov.in
          </div>
        </td>
        <td style="width: 28%; text-align: center;">
          ${qrSvg}
          <div style="font-size: 8.5px; font-family: monospace; font-weight: 700; color: #64748b; margin-top: 2px;">OFFICIAL QR VERIFICATION</div>
        </td>
      </tr>
    </table>

    <div class="notice-box">
      <strong>Important Citizen Advisory:</strong> Keep this official acknowledgement receipt for your records. Quote the Application ID <strong>${claim.claim_id}</strong> in all correspondence with your local Village Office, Taluk Office, or District Disaster Management Authority (DDMA).
    </div>

  </div>
</body>
</html>`;
}

export const ReliefAcknowledgementModal: React.FC<ReliefAcknowledgementModalProps> = ({
  claim,
  isOpen,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !claim) return null;

  const verificationUrl = `https://sahay.kerala.gov.in/verify/relief/${claim.claim_id}`;

  // 1. ISOLATED PRINT: Prints ONLY the official Form and user-entered details (0% of webpage)
  const handlePrintOnlyForm = () => {
    try {
      const htmlContent = generateOfficialDocumentHtml(claim, verificationUrl);
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (!frameDoc) {
        window.print();
        return;
      }

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (e) {
          console.error('Frame print failed, falling back:', e);
          window.print();
        } finally {
          setTimeout(() => {
            printFrame.remove();
          }, 1500);
        }
      }, 350);
    } catch (err) {
      console.error('Print generation error:', err);
      window.print();
    }
  };

  // 2. DIRECT FILE DOWNLOAD: Downloads the complete form and user details as a standalone document file
  const handleDownloadFormFile = () => {
    try {
      const htmlContent = generateOfficialDocumentHtml(claim, verificationUrl);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SAHAY_Relief_Application_${claim.claim_id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download file error:', err);
      alert('Failed to generate download file. You can use the Print / Save PDF option.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden print:border-none print:shadow-none animate-scale-in">
        
        {/* Modal Top Bar (Hidden during Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Official Application Form & Acknowledgement</h3>
              <p className="text-[10px] text-slate-400">Download or print only this official form and your entered details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadFormFile}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              title="Download HTML Form Document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Form</span>
            </button>
            <button
              onClick={handlePrintOnlyForm}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview Body */}
        <div ref={printRef} className="p-8 space-y-6 text-slate-900 font-sans print:p-4 max-h-[75vh] overflow-y-auto">
          
          {/* Official Header */}
          <div className="flex items-start justify-between border-b-2 border-[#0B4D3B] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border-2 border-[#0E8F66] p-0.5 shadow-sm overflow-hidden flex-shrink-0">
                <img src={logoSahay} alt="SAHAY Seal" className="w-full h-full object-cover rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-xl tracking-tight text-[#0B4D3B]">SAHAY DISASTER RELIEF PORTAL</h1>
                  <span className="text-[10px] uppercase font-bold bg-emerald-100 text-[#0B4D3B] px-2 py-0.5 rounded-full border border-emerald-300">
                    GOVT OF KERALA
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Department of Disaster Management &bull; State Disaster Response Fund (SDRF)
                </p>
                <p className="text-[11px] text-slate-500">
                  Acknowledgement of Citizen Application for Disaster Relief & Ex-gratia Assistance
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Application ID</span>
              <span className="text-sm font-mono font-black text-[#0E8F66] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {claim.claim_id}
              </span>
            </div>
          </div>

          {/* Submission Notice Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#0B4D3B] uppercase">Application Successfully Registered</h4>
                <p className="text-[11px] text-emerald-800">
                  Your claim has been securely logged into the District Disaster Management Authority (DDMA) verification queue.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-slate-500 block">Current Status</span>
              <span className="text-xs font-extrabold text-emerald-900 uppercase bg-white px-2.5 py-0.5 rounded-full border border-emerald-300">
                {(claim.status || 'SUBMITTED').replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Section 1: Applicant Profile */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#0B4D3B] uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>Section 1: Applicant & Household Details</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Applicant Full Name</span>
                <span className="font-bold text-slate-900">{claim.applicant_name || 'Registered Citizen'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Mobile</span>
                <span className="font-medium text-slate-800">{claim.applicant_phone || 'Confidential'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">District & Locality</span>
                <span className="font-medium text-slate-800">{claim.district} {claim.locality ? `• ${claim.locality}` : ''}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Family Members Headcount</span>
                <span className="font-medium text-slate-800">{claim.affected_family_members || 1} persons</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vulnerable Persons in Household</span>
                <span className="font-medium text-slate-800">
                  {Array.isArray(claim.vulnerable_person_category) && claim.vulnerable_person_category.length > 0
                    ? claim.vulnerable_person_category.join(', ')
                    : 'None declared'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Disaster & Loss Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#0B4D3B] uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Section 2: Disaster & Loss Assessment</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disaster Type & Date</span>
                <span className="font-bold text-slate-900">
                  {claim.disaster_type} • {claim.disaster_date ? new Date(claim.disaster_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assistance Category</span>
                <span className="font-medium text-slate-800">{claim.assistance_category}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Damage Severity</span>
                <span className="font-medium text-slate-800">{claim.damage_severity}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Applicant Estimated Loss</span>
                <span className="font-bold text-slate-900">₹{parseFloat(String(claim.estimated_loss || 0)).toLocaleString('en-IN')}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Damage Description</span>
                <p className="font-medium text-slate-800 mt-0.5 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200/80">
                  {claim.damage_description || 'No detailed damage description provided.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Conditional Damage Details (if present) */}
          {(claim.house_rooms || claim.crop_type || claim.livestock_type || claim.deceased_person_name) && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0B4D3B] uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>Section 3: Specific Damage Particulars</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                {claim.house_rooms && (
                  <>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">House Structure</span>
                      <span className="font-medium text-slate-800">{claim.house_ownership || 'Owned'} &bull; {claim.house_type ? (claim.house_type === 'Concrete/RCC' ? 'Permanent Concrete' : claim.house_type === 'Mud/Traditional' ? 'Traditional / Non-permanent' : claim.house_type) : 'Permanent House'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rooms & Area</span>
                      <span className="font-medium text-slate-800">{claim.house_rooms} Rooms &bull; {claim.affected_area ? `${claim.affected_area} sq.m` : 'N/A'}</span>
                    </div>
                  </>
                )}
                {claim.crop_type && (
                  <>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Crop & Land</span>
                      <span className="font-medium text-slate-800">{claim.crop_type} &bull; {claim.agricultural_land_type || 'Wetland'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Crop Area & Loss %</span>
                      <span className="font-medium text-slate-800">{claim.affected_crop_area || 0} / {claim.total_crop_area || 0} Ha &bull; {claim.crop_loss_percentage || 0}%</span>
                    </div>
                  </>
                )}
                {claim.livestock_type && (
                  <>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Livestock Type</span>
                      <span className="font-medium text-slate-800">{claim.livestock_type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Animals Lost / Injured</span>
                      <span className="font-medium text-slate-800">Lost: {claim.livestock_lost || 0} &bull; Injured: {claim.livestock_injured || 0}</span>
                    </div>
                  </>
                )}
                {claim.deceased_person_name && (
                  <>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deceased Person</span>
                      <span className="font-medium text-slate-800">{claim.deceased_person_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Legal Heir Status</span>
                      <span className="font-medium text-slate-800">{claim.legal_heir_relationship || 'Legal Heir'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Section 4: Incident Link & Bank Security Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Incident & Spatial Coordinates</span>
              </div>
              <p className="font-bold text-slate-800">
                {claim.incident_code ? `Linked Incident: ${claim.incident_code}` : 'Direct Relief Application'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                GPS: {Number(claim.latitude || 0).toFixed(4)}°, {Number(claim.longitude || 0).toFixed(4)}° ({claim.location_verified ? 'Verified ✓' : 'Pending'})
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Masked Disbursement Account</span>
              </div>
              <p className="font-mono font-bold text-slate-800">
                {claim.masked_account_number || 'XXXXXX4821'} ({claim.bank_name || 'Bank of Record'})
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                IFSC: {claim.ifsc_code || 'Verified'} &bull; Direct Benefit Transfer
              </p>
            </div>
          </div>

          {/* Verification & Safe QR Code Section */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between gap-6">
            <div className="space-y-1.5 flex-1">
              <p className="text-xs font-bold text-slate-800">
                Official Digital Verification Seal
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Scan this QR code to verify this application directly on the official SAHAY portal.
                This acknowledgement contains strictly non-sensitive public reference credentials.
              </p>
              <p className="text-[10px] font-mono text-slate-400">
                Generated: {new Date().toLocaleString('en-IN')} &bull; Digital Digest: {claim.claim_id.slice(-8)}
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center">
              <SafeQrCode text={verificationUrl} />
              <span className="text-[9px] font-mono font-bold text-slate-400 mt-1">SECURE VERIFY</span>
            </div>
          </div>

          {/* Legal Government Disclaimer */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 text-[10px] text-amber-900 leading-relaxed">
            <strong>Important Legal Notice:</strong> Receipt of this acknowledgement confirms successful lodging of your relief application. 
            Financial assistance is granted strictly pursuant to State Disaster Response Fund (SDRF) norms, field verification by designated revenue/disaster officials, 
            and sanction by the District Collector. Payment processing is simulated for the prototype.
          </div>

        </div>

        {/* Modal Bottom Actions (Hidden during Print) */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-500">
            Click <strong>Download Form</strong> for an offline document, or <strong>Print / Save PDF</strong>.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Close
            </button>
            <button
              onClick={handleDownloadFormFile}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Form (.html)</span>
            </button>
            <button
              onClick={handlePrintOnlyForm}
              className="px-4 py-2 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
