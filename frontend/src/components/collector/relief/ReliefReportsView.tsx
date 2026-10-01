import React, { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Award
} from 'lucide-react';
import { fetchCollectorReliefReports } from '../../../services/api';
import type { CollectorReliefSummary, CollectorCategoryStat, CollectorDisasterStat } from '../../../services/api';

interface ReliefReportsViewProps {
  district: string;
  summary?: CollectorReliefSummary | null;
  categories?: CollectorCategoryStat[];
  disasters?: CollectorDisasterStat[];
  onSelectClaim?: (claimId: string) => void;
}

export const ReliefReportsView: React.FC<ReliefReportsViewProps> = ({
  district,
  summary,
  categories,
  disasters,
  onSelectClaim
}) => {
  const [reportRecords, setReportRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState('');
  const [disaster, setDisaster] = useState('');
  const [taluk, setTaluk] = useState('');
  const [status, setStatus] = useState('');

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCollectorReliefReports({
        district,
        category: category || undefined,
        disaster: disaster || undefined,
        taluk: taluk || undefined,
        status: status || undefined
      });
      setReportRecords(data.records || []);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [district, category, disaster, taluk, status]);

  // CSV Export
  const handleExportCSV = () => {
    if (!reportRecords || reportRecords.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = Object.keys(reportRecords[0]);
    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.map(h => `"${h}"`).join(','));

    // Data rows
    reportRecords.forEach(row => {
      const values = headers.map(header => {
        const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DDMA_${district}_Relief_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Official SITREP
  const handlePrint = () => {
    window.print();
  };

  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ERROR ALERT */}
      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black uppercase tracking-wider mb-1.5 border border-teal-200">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Official Reporting Desk &bull; {district} District</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Relief & Compensation Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Generate, filter, and export official District Disaster Management Authority (DDMA) situation reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({reportRecords.length})</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* SECTION 31: DISTRICT RELIEF ANALYTICS METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Claims by Status</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Registered:</span>
              <strong className="text-slate-900 font-mono">{summary?.totalApplications || 0}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Ground Verified:</span>
              <strong className="text-blue-700 font-mono">{summary?.fieldVerified || 0}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Collector Sanctioned:</span>
              <strong className="text-emerald-700 font-mono">{summary?.approved || 0}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Disbursed via DBT:</span>
              <strong className="text-teal-700 font-mono">{summary?.disbursed || 0}</strong>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Disaster Incident Impact</span>
            <BarChart3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            {(disasters || []).slice(0, 4).map((d, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-slate-600">{d.disasterType}:</span>
                <strong className="text-slate-900 font-mono">{d.claimsCount} claims ({formatINR(d.totalApproved)})</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Financial Sanctions</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Assistance Requested:</span>
              <strong className="text-slate-900 font-mono">{formatINR(summary?.totalRequested)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Assistance Verified:</span>
              <strong className="text-blue-900 font-mono">{formatINR(summary?.totalVerified)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Assistance Sanctioned:</span>
              <strong className="text-emerald-900 font-mono">{formatINR(summary?.totalApproved)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Assistance Disbursed:</span>
              <strong className="text-teal-900 font-mono">{formatINR(summary?.totalDisbursed)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR FOR REPORT COMPILATION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-wrap items-center gap-3">
        <select
          value={taluk}
          onChange={(e) => setTaluk(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
        >
          <option value="">All Taluks</option>
          <option value="Kanjirappally">Kanjirappally</option>
          <option value="Meenachil">Meenachil</option>
          <option value="Changanassery">Changanassery</option>
          <option value="Kottayam">Kottayam</option>
          <option value="Vaikom">Vaikom</option>
        </select>

        <select
          value={disaster}
          onChange={(e) => setDisaster(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
        >
          <option value="">All Disasters</option>
          <option value="Flood">Flood</option>
          <option value="Landslide">Landslide</option>
          <option value="Heavy Rainfall">Heavy Rainfall</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories && categories.length > 0 ? (
            categories.map((c, idx) => (
              <option key={idx} value={c.category}>{c.category}</option>
            ))
          ) : (
            <>
              <option value="Immediate Relief">Immediate Relief</option>
              <option value="Damage Assistance">Damage Assistance</option>
              <option value="Death / Injury Assistance">Death / Injury Assistance</option>
            </>
          )}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="FIELD_VERIFIED">FIELD_VERIFIED</option>
          <option value="APPROVED">APPROVED</option>
          <option value="DISBURSED">DISBURSED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        <button
          onClick={loadReports}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 ml-auto"
          title="Reload Report Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* REPORT PREVIEW TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <span className="text-xs font-black text-slate-900">
            Official Report Dataset Preview ({reportRecords.length} records)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Generated: {new Date().toLocaleString()}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Compiling official DDMA situation report...</p>
          </div>
        ) : reportRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No matching relief records found for the selected filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Claim ID</th>
                  <th className="py-2.5 px-3">Applicant Name</th>
                  <th className="py-2.5 px-3">Taluk</th>
                  <th className="py-2.5 px-3">Village</th>
                  <th className="py-2.5 px-3">Disaster</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Sanctioned</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Verification Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reportRecords.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {onSelectClaim ? (
                        <button
                          onClick={() => onSelectClaim(r['Claim ID'])}
                          className="hover:underline text-emerald-700 text-left font-bold"
                        >
                          {r['Claim ID']}
                        </button>
                      ) : (
                        r['Claim ID']
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{r['Applicant Name']}</td>
                    <td className="py-2.5 px-3 text-slate-700">{r['Taluk']}</td>
                    <td className="py-2.5 px-3 text-slate-700">{r['Revenue Village']}</td>
                    <td className="py-2.5 px-3 text-slate-700">{r['Disaster Type']}</td>
                    <td className="py-2.5 px-3 text-slate-700">{r['Assistance Category']}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                      {parseFloat(r['Sanctioned Amount']) > 0 ? formatINR(parseFloat(r['Sanctioned Amount'])) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                        {r['Workflow Status']}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r['Verification Officer'] || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
