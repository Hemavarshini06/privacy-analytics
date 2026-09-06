import { DocumentArrowDownIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const handleDownloadPDF = async () => {
    try {
      const toastId = toast.loading('Generating PDF report...');
      const response = await api.reports.downloadPDF();
      downloadFile(response.data, `privacy-analytics-${Date.now()}.pdf`);
      toast.success('PDF report downloaded', { id: toastId });
    } catch (e) {
      console.error('Download PDF error', e);
      toast.error('Failed to generate PDF report');
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const toastId = toast.loading('Generating CSV report...');
      const response = await api.reports.downloadCSV();
      downloadFile(response.data, `privacy-analytics-${Date.now()}.csv`);
      toast.success('CSV report downloaded', { id: toastId });
    } catch (e) {
      console.error('Download CSV error', e);
      toast.error('Failed to generate CSV report');
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Export & Reports</h2>
        <p className="text-slate-400">Download privacy-preserved analytics data for external presentation or analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Report Card */}
        <div className="glass-panel p-6 shadow-xl border-primary-500/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <DocumentArrowDownIcon className="h-32 w-32 text-primary-500" />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-2">Executive Summary (PDF)</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-[80%]">
              A formatted document containing funnel metrics, abandonment analysis, active privacy settings, and recommendations.
            </p>
            
            <div className="space-y-2 mb-8 text-sm text-slate-300">
              <p className="flex items-center"><span className="text-primary-500 mr-2">✓</span> Visual Charts & Graphs</p>
              <p className="flex items-center"><span className="text-primary-500 mr-2">✓</span> Privacy Guarantee Statement</p>
              <p className="flex items-center"><span className="text-primary-500 mr-2">✓</span> Drop-off Recommendations</p>
            </div>
            
            <button 
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Download PDF Report
            </button>
          </div>
        </div>

        {/* CSV Data Card */}
        <div className="glass-panel p-6 shadow-xl border-accent-500/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <DocumentArrowDownIcon className="h-32 w-32 text-accent-500" />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-2">Raw Metrics Data (CSV)</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-[80%]">
              Tabular data of all aggregated and differentially private metrics suitable for import into Excel or BI tools.
            </p>
            
            <div className="space-y-2 mb-8 text-sm text-slate-300">
              <p className="flex items-center"><span className="text-accent-500 mr-2">✓</span> Stage-by-stage Counts</p>
              <p className="flex items-center"><span className="text-accent-500 mr-2">✓</span> Conversion Percentages</p>
              <p className="flex items-center"><span className="text-accent-500 mr-2">✓</span> Epsilon Noise Values</p>
            </div>
            
            <button 
              onClick={handleDownloadCSV}
              className="w-full sm:w-auto bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled Reports Placeholder */}
      <div className="mt-8 glass-panel p-6 border-dashed border-2 border-slate-700 flex items-center justify-between opacity-80">
        <div className="flex items-center">
          <CalendarDaysIcon className="h-10 w-10 text-slate-500 mr-4" />
          <div>
            <h4 className="text-lg font-medium text-white">Scheduled Reports</h4>
            <p className="text-sm text-slate-400">Automated weekly and monthly email digests.</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold uppercase rounded border border-slate-700">Coming Soon</span>
      </div>
    </div>
  );
}
