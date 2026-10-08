import { useState, useEffect } from 'react';
import { 
  DocumentArrowDownIcon, 
  TableCellsIcon,
  PrinterIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [reportPreview, setReportPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      const res = await api.reports.downloadCSV();
      // Fetch JSON preview if available or get KPIs
      const kpisRes = await api.analytics.getKPIs();
      const funnelRes = await api.analytics.getFunnel();
      setReportPreview({
        kpis: kpisRes.data,
        stages: funnelRes.data?.stages || []
      });
    } catch (e) {
      console.error('Failed to load report preview', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, []);

  const downloadBlob = (blobData, filename, mimeType) => {
    const blob = new Blob([blobData], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    const toastId = toast.loading('Generating Executive PDF Report...');
    try {
      const response = await api.reports.downloadPDF();
      downloadBlob(response.data, `privacylens-executive-report-${Date.now()}.pdf`, 'application/pdf');
      toast.success('Executive PDF report downloaded successfully!', { id: toastId });
    } catch (e) {
      console.error('Download PDF error', e);
      toast.error('Failed to generate PDF report. Please try again.', { id: toastId });
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadCSV = async () => {
    setDownloadingCSV(true);
    const toastId = toast.loading('Compiling Journey Metrics CSV...');
    try {
      const response = await api.reports.downloadCSV();
      downloadBlob(response.data, `privacylens-metrics-export-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
      toast.success('Analytics CSV dataset exported successfully!', { id: toastId });
    } catch (e) {
      console.error('Download CSV error', e);
      toast.error('Failed to export CSV dataset. Please try again.', { id: toastId });
    } finally {
      setDownloadingCSV(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const kpis = reportPreview?.kpis || {};
  const stages = reportPreview?.stages || [];

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn pb-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary-500/10 text-primary-400 rounded-lg text-xl">📄</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Reports & Export Center</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Export privacy-preserved customer journey analytics for executive reviews, audit archives, or BI analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-lg text-sm font-medium border border-slate-700 flex items-center transition-colors"
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print Report
          </button>
        </div>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Executive Report */}
        <div className="glass-panel p-6 shadow-xl border-primary-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="p-3 bg-primary-500/20 text-primary-400 rounded-xl">
                <DocumentTextIcon className="h-8 w-8" />
              </span>
              <span className="text-xs px-2.5 py-1 bg-primary-950 text-primary-300 rounded-full border border-primary-800 font-medium">
                Standard PDF/A
              </span>
            </div>

            <h3 className="text-xl font-bold text-white">Executive Summary (PDF)</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Formatted document containing high-level journey funnel statistics, completion rates, 
              mathematical privacy guarantees, and drop-off mitigation guidance.
            </p>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" /> Executive KPIs & Drop-off Overview</li>
              <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" /> Differential Privacy Statement (Laplace calibrated)</li>
              <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" /> Zero PII Compliance Certification</li>
            </ul>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="mt-6 w-full bg-primary-600 hover:bg-primary-500 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center disabled:opacity-50"
          >
            {downloadingPDF ? (
              <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            )}
            Download PDF Report
          </button>
        </div>

        {/* CSV Raw Data */}
        <div className="glass-panel p-6 shadow-xl border-emerald-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <TableCellsIcon className="h-8 w-8" />
              </span>
              <span className="text-xs px-2.5 py-1 bg-emerald-950 text-emerald-300 rounded-full border border-emerald-800 font-medium">
                CSV / Excel Ready
              </span>
            </div>

            <h3 className="text-xl font-bold text-white">Granular Metrics Dataset (CSV)</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tabular breakdown of raw and differentially private stage counts, step-by-step drop-off ratios, 
              and privacy noise parameters for analysis in Tableau or Excel.
            </p>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" /> Stage-by-Stage Entry & Drop-off Volumes</li>
              <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" /> Noise Added & Preservation Delta</li>
              <li className="flex items-center"><CheckBadgeIcon className="h-4 w-4 text-emerald-400 mr-2 flex-shrink-0" /> Timestamped Metadata & Epsilon Config</li>
            </ul>
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={downloadingCSV}
            className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-5 py-3 rounded-xl font-medium transition-all shadow-md flex items-center justify-center disabled:opacity-50"
          >
            {downloadingCSV ? (
              <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            )}
            Export CSV Dataset
          </button>
        </div>
      </div>

      {/* Live Data Preview Section */}
      <div className="glass-panel p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Live Report Data Preview</h3>
            <p className="text-xs text-slate-400">Current aggregated metrics that will be compiled into the export.</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
            Real-time Aggregation
          </span>
        </div>

        {/* Snapshot KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
          <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
            <p className="text-[11px] text-slate-400 uppercase">Total Sessions</p>
            <p className="text-xl font-bold text-white mt-1">{(kpis.totalSessions || 0).toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
            <p className="text-[11px] text-slate-400 uppercase">Completion Rate</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{kpis.completionRate || 0}%</p>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
            <p className="text-[11px] text-slate-400 uppercase">Abandonment Rate</p>
            <p className="text-xl font-bold text-red-400 mt-1">{kpis.abandonmentRate || 0}%</p>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
            <p className="text-[11px] text-slate-400 uppercase">Active Epsilon</p>
            <p className="text-xl font-bold text-purple-400 mt-1">ε = {kpis.epsilon || 1.0}</p>
          </div>
        </div>

        {/* Stages mini table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Stage Name</th>
                <th className="px-4 py-2.5">Raw User Count</th>
                <th className="px-4 py-2.5">DP Count (Exported)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {stages.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-center text-slate-500">
                    No stages configured. Create workflow stages in Workflow Builder.
                  </td>
                </tr>
              ) : (
                stages.map(stg => (
                  <tr key={stg.stage_id || stg.stageId} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono text-slate-400">{stg.stage_order || stg.stageOrder}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{stg.stage_name || stg.stageName}</td>
                    <td className="px-4 py-2.5 font-mono text-blue-400">{(stg.entered || stg.actualCount || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-purple-400">{(stg.noisyEntered || stg.noisyCount || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy & Compliance Assurance Notice */}
      <div className="glass-panel p-5 border-l-4 border-l-primary-500 flex items-start gap-4">
        <ShieldCheckIcon className="h-6 w-6 text-primary-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <p className="font-semibold text-white">Compliance Guarantee</p>
          <p>
            All generated reports contain strictly aggregated and Laplace-noised statistics. 
            No usernames, email addresses, cookies, or user IP addresses are ever stored or exposed in exports.
          </p>
        </div>
      </div>
    </div>
  );
}
