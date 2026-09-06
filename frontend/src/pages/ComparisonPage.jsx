import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ShieldCheckIcon, ScaleIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ComparisonPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [experiments, setExperiments] = useState([]);
  
  const fetchExperiments = async () => {
    try {
      const res = await api.experiments.list();
      setExperiments(res.data.experiments || []);
    } catch (e) {
      console.error('Failed to load experiments', e);
    }
  };

  const loadCurrentComparison = async () => {
    try {
      const res = await api.analytics.getComparison();
      setComparison(res.data);
    } catch (e) {
      console.error('Failed to load comparison', e);
      toast.error('Failed to load baseline vs DP comparison');
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([loadCurrentComparison(), fetchExperiments()]);
      setLoading(false);
    };
    initData();
  }, []);

  const handleRunExperiment = async () => {
    setRunning(true);
    toast.success('Running new A/B comparison experiment...');
    try {
      const res = await api.experiments.create({
        experiment_name: `Experiment ${new Date().toISOString().slice(0,10)}`,
        description: 'Auto-run comparison experiment'
      });
      setComparison(res.data.comparison);
      toast.success('Experiment completed and saved');
      await fetchExperiments();
    } catch (e) {
      console.error('Experiment failed', e);
      toast.error(e.response?.data?.error || 'Experiment failed');
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!comparison || !comparison.baseline) {
    return (
      <div className="max-w-7xl mx-auto animate-fadeIn pb-12 text-center text-slate-400 mt-20">
        <h2 className="text-xl mb-4">No data available for comparison</h2>
        <p>Please define workflow stages and generate events in the simulator first.</p>
      </div>
    );
  }

  const { baseline, dp, errorPct, accuracyPct, epsilon } = comparison;
  const stages = baseline.stages.map(s => s.stage_name);
  const baselineData = baseline.stages.map(s => s.entered);
  const dpData = dp.map(s => s.noisyEntered);
  
  const privacyLevel = epsilon < 1 ? 'High' : epsilon < 3 ? 'Medium' : 'Low';
  const privacyColor = epsilon < 1 ? 'text-green-400' : epsilon < 3 ? 'text-yellow-400' : 'text-red-400';

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Baseline vs. DP Comparison</h2>
          <p className="text-slate-400">Evaluate the exact impact of Differential Privacy noise on your analytics accuracy.</p>
        </div>
        <button 
          onClick={handleRunExperiment}
          disabled={running}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-slate-600 flex items-center disabled:opacity-50"
        >
          {running ? <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> : <PlayCircleIcon className="h-5 w-5 mr-2" />}
          Run New Experiment
        </button>
      </div>

      {/* Metrics Header */}
      <div className="glass-panel p-6 mb-8 flex flex-col md:flex-row items-center justify-between shadow-xl">
        <div className="flex items-center mb-4 md:mb-0">
          <ScaleIcon className="h-10 w-10 text-primary-500 mr-4" />
          <div>
            <h3 className="text-lg font-bold text-white">Current Accuracy Trade-off</h3>
            <p className="text-sm text-slate-400">Comparing pure aggregation vs DP at ε={epsilon}</p>
          </div>
        </div>
        
        <div className="flex space-x-8">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Avg Error Rate</p>
            <p className="text-2xl font-bold text-success-400">{errorPct}%</p>
          </div>
          <div className="text-center border-l border-slate-700 pl-8">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Overall Accuracy</p>
            <p className="text-2xl font-bold text-white">{accuracyPct}%</p>
          </div>
          <div className="text-center border-l border-slate-700 pl-8">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Privacy Level</p>
            <div className="flex items-center justify-center">
              <ShieldCheckIcon className={`h-5 w-5 mr-1 ${privacyColor}`} />
              <p className={`text-lg font-bold ${privacyColor}`}>{privacyLevel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Left: Baseline */}
        <div className="glass-card p-6 border-blue-500/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-blue-400">Standard Aggregation</h3>
            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">Baseline</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-900/50 p-3 rounded">
              <p className="text-xs text-slate-500">Final Completion</p>
              <p className="text-xl font-bold text-white">{(baseline.completionRate * 100).toFixed(2)}%</p>
            </div>
          </div>

          <div className="h-64 relative">
            <Bar 
              data={{
                labels: stages,
                datasets: [{ data: baselineData, backgroundColor: 'rgba(59, 130, 246, 0.8)' }]
              }} 
              options={chartOptions} 
            />
          </div>
        </div>

        {/* Right: DP */}
        <div className="glass-card p-6 border-primary-500/30 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 pointer-events-none rounded-xl"></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h3 className="text-xl font-bold text-primary-400 flex items-center">
              Differential Privacy <span className="ml-2 text-sm text-slate-400 font-normal">(ε={epsilon})</span>
            </h3>
            <span className="text-xs px-2 py-1 bg-primary-500/20 text-primary-300 rounded border border-primary-500/30">Active Mode</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
            <div className="bg-slate-900/50 p-3 rounded">
              <p className="text-xs text-slate-500">Final Completion</p>
              <p className="text-xl font-bold text-white flex items-center">
                {(dp.completionRate * 100).toFixed(2)}% 
                {dp.completionRate !== baseline.completionRate && (
                  <span className={`text-xs ml-2 ${dp.completionRate > baseline.completionRate ? 'text-red-400' : 'text-yellow-400'}`}>
                    ({((dp.completionRate - baseline.completionRate) * 100).toFixed(2)}%)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="h-64 relative z-10">
            <Bar 
              data={{
                labels: stages,
                datasets: [{ data: dpData, backgroundColor: 'rgba(124, 58, 237, 0.8)' }]
              }} 
              options={chartOptions} 
            />
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="glass-panel p-6 border-l-4 border-l-primary-500 mb-8">
        <h4 className="text-lg font-medium text-white mb-2">Understanding the Trade-off</h4>
        <p className="text-sm text-slate-400 leading-relaxed">
          Differential Privacy guarantees that the output of our analytics does not reveal whether any specific individual's data was included in the dataset. We achieve this by adding calibrated statistical noise (Laplace distribution) to the raw counts. 
          <br/><br/>
          As demonstrated above, the noise introduced at <strong className="text-white">ε={epsilon}</strong> slightly alters the exact numbers, but preserves the overall statistical trends and insights.
        </p>
      </div>

      {/* Experiment History */}
      <div className="glass-panel p-6">
        <h4 className="text-lg font-medium text-white mb-4">Past Experiments</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-300 uppercase bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Epsilon</th>
                <th className="px-4 py-3">Error Rate</th>
                <th className="px-4 py-3">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {experiments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-6 text-center">No experiments found. Run one above!</td>
                </tr>
              ) : (
                experiments.map(exp => (
                  <tr key={exp.experiment_id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-white">{new Date(exp.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{exp.experiment_name}</td>
                    <td className="px-4 py-3">{parseFloat(exp.epsilon_used).toFixed(2)}</td>
                    <td className={`px-4 py-3 ${parseFloat(exp.error_percentage) > 5 ? 'text-red-400' : 'text-success-400'}`}>{exp.error_percentage}%</td>
                    <td className="px-4 py-3 text-white">{exp.accuracy_percentage}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
