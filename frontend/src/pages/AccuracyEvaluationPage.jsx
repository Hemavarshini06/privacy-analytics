import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { 
  ShieldCheckIcon, 
  ScaleIcon, 
  ArrowPathIcon, 
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  Title, 
  Tooltip, 
  Legend
);

export default function AccuracyEvaluationPage() {
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationData, setEvaluationData] = useState(null);
  const [selectedIterations, setSelectedIterations] = useState(10);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      const res = await api.analytics.getAccuracyEvaluation();
      setEvaluationData(res.data);
    } catch (err) {
      console.error('Failed to load accuracy evaluation:', err);
      toast.error('Failed to load accuracy evaluation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluation();
  }, []);

  const handleRunCustomEvaluation = async (iterations = selectedIterations) => {
    try {
      setEvaluating(true);
      toast.loading(`Running multi-iteration evaluation (${iterations} trials)...`, { id: 'eval-run' });
      const res = await api.analytics.runAccuracyEvaluation({
        epsilons: [0.1, 0.5, 1.0],
        iterations: parseInt(iterations) || 10
      });
      setEvaluationData(res.data);
      toast.success(`Evaluation complete across ε ∈ [0.1, 0.5, 1.0]!`, { id: 'eval-run' });
    } catch (err) {
      console.error('Evaluation run failed:', err);
      toast.error('Evaluation run failed: ' + (err.response?.data?.error || err.message), { id: 'eval-run' });
    } finally {
      setEvaluating(false);
    }
  };

  const handleExportCSV = () => {
    if (!evaluationData || !evaluationData.evaluations) return;
    
    let csv = "Privacy-Preserving Journey Analytics - Accuracy Evaluation Report\n";
    csv += `Evaluated At: ${evaluationData.evaluatedAt || new Date().toISOString()}\n\n`;
    csv += "--- SUMMARY METRICS BY EPSILON ---\n";
    csv += "Epsilon,Privacy Tier,Theoretical MAE (1/ε),Empirical MAE,Accuracy %,Error %\n";
    
    evaluationData.evaluations.forEach(ev => {
      csv += `${ev.epsilon},"${ev.privacyLevel}",${ev.theoreticalMAE},${ev.empiricalMAE},${ev.accuracyPercent}%,${ev.errorPercent}%\n`;
    });

    csv += "\n--- STAGE-BY-STAGE ACTUAL VS NOISY BREAKDOWN ---\n";
    csv += "Stage Name,Actual Count,ε=0.1 Noisy,ε=0.1 Abs Error,ε=0.5 Noisy,ε=0.5 Abs Error,ε=1.0 Noisy,ε=1.0 Abs Error\n";

    const stages = evaluationData.stages || [];
    stages.forEach(stg => {
      const e01 = evaluationData.evaluations.find(e => e.epsilon === 0.1)?.stageEstimates?.find(s => s.stage_name === stg.stage_name);
      const e05 = evaluationData.evaluations.find(e => e.epsilon === 0.5)?.stageEstimates?.find(s => s.stage_name === stg.stage_name);
      const e10 = evaluationData.evaluations.find(e => e.epsilon === 1.0)?.stageEstimates?.find(s => s.stage_name === stg.stage_name);
      
      csv += `"${stg.stage_name}",${stg.actualCount},${e01?.noisyCount ?? ''},${e01?.absoluteError ?? ''},${e05?.noisyCount ?? ''},${e05?.absoluteError ?? ''},${e10?.noisyCount ?? ''},${e10?.absoluteError ?? ''}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `accuracy-evaluation-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Accuracy Evaluation CSV downloaded');
  };

  if (loading) return <LoadingSpinner message="Calculating Accuracy Metrics across ε ∈ [0.1, 0.5, 1.0]..." />;

  const evaluations = evaluationData?.evaluations || [];
  const stages = evaluationData?.stages || [];

  const eval01 = evaluations.find(e => e.epsilon === 0.1) || {};
  const eval05 = evaluations.find(e => e.epsilon === 0.5) || {};
  const eval10 = evaluations.find(e => e.epsilon === 1.0) || {};

  // Grouped Bar Chart Data: Actual vs Noisy across stages
  const stageLabels = stages.map(s => s.stage_name);
  const barChartData = {
    labels: stageLabels,
    datasets: [
      {
        label: 'Actual Ground Truth',
        data: stages.map(s => s.actualCount),
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Noisy Count (ε = 0.1, High Privacy)',
        data: eval01.stageEstimates?.map(s => s.noisyCount) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Noisy Count (ε = 0.5, Balanced)',
        data: eval05.stageEstimates?.map(s => s.noisyCount) || [],
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
        borderColor: '#f59e0b',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Noisy Count (ε = 1.0, High Utility)',
        data: eval10.stageEstimates?.map(s => s.noisyCount) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  // Tradeoff Curve Line Chart: MAE vs Epsilon
  const sortedEvals = [...evaluations].sort((a, b) => a.epsilon - b.epsilon);
  const lineChartData = {
    labels: sortedEvals.map(e => `ε = ${e.epsilon}`),
    datasets: [
      {
        label: 'Empirical Mean Absolute Error (MAE)',
        data: sortedEvals.map(e => e.empiricalMAE),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        tension: 0.35,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Theoretical Expected MAE (Scale b = 1/ε)',
        data: sortedEvals.map(e => e.theoreticalMAE),
        borderColor: '#f97316',
        borderDash: [5, 5],
        pointRadius: 5,
        fill: false,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xl">
              🎯
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Accuracy Evaluation Module
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Rigorous empirical comparison of <strong>Actual Analytics vs. Differential Privacy Analytics</strong> across standardized privacy budgets (ε = 0.1, 0.5, 1.0).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRunCustomEvaluation()}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            <ArrowPathIcon className={`h-4 w-4 ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Evaluating...' : 'Re-Run Evaluation'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-300 dark:border-gray-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Accuracy KPI Cards for ε = 0.1, 0.5, 1.0 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ε = 0.1 Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/40 p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                ε = 0.1 • Very High Privacy
              </span>
              <p className="mt-3 text-3xl font-extrabold text-gray-900 dark:text-white">
                {eval01.empiricalMAE ?? '--'}
                <span className="text-sm font-normal text-gray-500 ml-1">MAE</span>
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Accuracy: <strong className="text-gray-900 dark:text-white">{eval01.accuracyPercent}%</strong></span>
            <span>Theoretical Scale: <strong className="text-gray-900 dark:text-white">b = 10.00</strong></span>
          </div>
        </div>

        {/* ε = 0.5 Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-900/40 p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                ε = 0.5 • Balanced Privacy
              </span>
              <p className="mt-3 text-3xl font-extrabold text-gray-900 dark:text-white">
                {eval05.empiricalMAE ?? '--'}
                <span className="text-sm font-normal text-gray-500 ml-1">MAE</span>
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl">
              <ScaleIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Accuracy: <strong className="text-gray-900 dark:text-white">{eval05.accuracyPercent}%</strong></span>
            <span>Theoretical Scale: <strong className="text-gray-900 dark:text-white">b = 2.00</strong></span>
          </div>
        </div>

        {/* ε = 1.0 Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-emerald-200 dark:border-emerald-900/40 p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                ε = 1.0 • High Analytical Utility
              </span>
              <p className="mt-3 text-3xl font-extrabold text-gray-900 dark:text-white">
                {eval10.empiricalMAE ?? '--'}
                <span className="text-sm font-normal text-gray-500 ml-1">MAE</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
              <CheckBadgeIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Accuracy: <strong className="text-gray-900 dark:text-white">{eval10.accuracyPercent}%</strong></span>
            <span>Theoretical Scale: <strong className="text-gray-900 dark:text-white">b = 1.00</strong></span>
          </div>
        </div>
      </div>

      {/* Multi-Iteration Simulation Config */}
      <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white">Empirical Law of Large Numbers Verification</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Run multiple synthetic Laplace iterations to witness empirical MAE converging toward the expected noise magnitude E[|Laplace|] = 1/&epsilon;.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[5, 10, 25, 50].map(cnt => (
            <button
              key={cnt}
              onClick={() => {
                setSelectedIterations(cnt);
                handleRunCustomEvaluation(cnt);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedIterations === cnt 
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {cnt} Trials
            </button>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Grouped Bar Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Actual vs. DP Stage Counts Comparison
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Visualizes how noise perturbation diminishes as privacy budget parameter ε increases from 0.1 to 1.0.
            </p>
          </div>
          <div className="h-72">
            <Bar 
              data={barChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                  tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, grid: { color: 'rgba(156, 163, 175, 0.15)' } }
                }
              }} 
            />
          </div>
        </div>

        {/* Chart 2: Privacy vs Utility Tradeoff Line Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Privacy-Utility Tradeoff Curve (MAE vs. ε)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Demonstrates the fundamental Differential Privacy tradeoff: higher privacy (lower ε) increases analytical error.
            </p>
          </div>
          <div className="h-72">
            <Line 
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                  tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                  y: { beginAtZero: true, title: { display: true, text: 'Mean Absolute Error' }, grid: { color: 'rgba(156, 163, 175, 0.15)' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Comprehensive Evaluation Comparison Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Stage-by-Stage Error & Accuracy Metrics
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Complete breakdown of raw baseline counts vs. noisy outcomes for each workflow step.
            </p>
          </div>
          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700">
            Formula: MAE = (1/N) Σ |Actual - Noisy|
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-5 py-3">Stage Name</th>
                <th className="px-5 py-3 text-blue-600 dark:text-blue-400 font-bold">Actual Count</th>
                <th className="px-5 py-3 text-red-600 dark:text-red-400">ε = 0.1 (Noisy / Error)</th>
                <th className="px-5 py-3 text-amber-600 dark:text-amber-400">ε = 0.5 (Noisy / Error)</th>
                <th className="px-5 py-3 text-emerald-600 dark:text-emerald-400">ε = 1.0 (Noisy / Error)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {stages.map((stage, idx) => {
                const e01Stage = eval01.stageEstimates?.find(s => s.stage_name === stage.stage_name);
                const e05Stage = eval05.stageEstimates?.find(s => s.stage_name === stage.stage_name);
                const e10Stage = eval10.stageEstimates?.find(s => s.stage_name === stage.stage_name);

                return (
                  <tr key={stage.stage_id || idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 text-[11px] font-bold flex items-center justify-center text-gray-600 dark:text-gray-300">
                        {stage.stage_order || idx + 1}
                      </span>
                      {stage.stage_name}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {stage.actualCount}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="text-gray-900 dark:text-gray-100">{e01Stage?.noisyCount ?? '--'}</span>
                      <span className="ml-2 text-xs text-red-500">
                        (Δ {e01Stage?.absoluteError ?? '--'}, {e01Stage?.relativeError ?? '--'}%)
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="text-gray-900 dark:text-gray-100">{e05Stage?.noisyCount ?? '--'}</span>
                      <span className="ml-2 text-xs text-amber-500">
                        (Δ {e05Stage?.absoluteError ?? '--'}, {e05Stage?.relativeError ?? '--'}%)
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="text-gray-900 dark:text-gray-100">{e10Stage?.noisyCount ?? '--'}</span>
                      <span className="ml-2 text-xs text-emerald-500">
                        (Δ {e10Stage?.absoluteError ?? '--'}, {e10Stage?.relativeError ?? '--'}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800/90 font-semibold border-t-2 border-gray-300 dark:border-gray-700">
              <tr>
                <td className="px-5 py-3 text-gray-900 dark:text-white">Summary Metrics</td>
                <td className="px-5 py-3 text-xs text-gray-500 font-normal">Baseline Truth</td>
                <td className="px-5 py-3 font-mono text-red-600 dark:text-red-400 text-xs">
                  MAE: {eval01.empiricalMAE} | Acc: {eval01.accuracyPercent}%
                </td>
                <td className="px-5 py-3 font-mono text-amber-600 dark:text-amber-400 text-xs">
                  MAE: {eval05.empiricalMAE} | Acc: {eval05.accuracyPercent}%
                </td>
                <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                  MAE: {eval10.empiricalMAE} | Acc: {eval10.accuracyPercent}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mathematical Accuracy Reference Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span>📐</span> Differential Privacy Accuracy Theory Reference
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="font-semibold text-purple-600 dark:text-purple-400 mb-1">Mean Absolute Error (MAE)</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Defined as MAE = (1/N) * &Sigma; |Actual[i] - Noisy[i]|. For the Laplace mechanism with sensitivity &Delta;f = 1, the theoretical expected error is E[|X|] = 1/&epsilon;.
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Empirical Convergence</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              When averaging over multiple trials, empirical MAE closely approximates the theoretical scale factor (b = 10.0 for &epsilon;=0.1; b = 2.0 for &epsilon;=0.5; b = 1.0 for &epsilon;=1.0).
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Zero-Bound Enforcement</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Raw Laplace distributions can produce negative values when counts are small. PrivacyLens enforces Noisy Count = max(0, round(Actual + Noise)), preventing negative counts without destroying privacy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
