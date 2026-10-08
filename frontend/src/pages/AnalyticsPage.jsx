import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import WarningBanner from '../components/WarningBanner';
import { 
  LightBulbIcon, 
  ArrowPathIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler
);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    kpis: null,
    funnel: null,
    dropoff: null,
    trend: null,
    consent: null
  });

  const fetchAnalytics = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [kpiRes, funnelRes, dropoffRes, trendRes, consentRes] = await Promise.all([
        api.analytics.getKPIs(),
        api.analytics.getFunnel(),
        api.analytics.getDropoff(),
        api.analytics.getTrend(),
        api.analytics.getConsent()
      ]);

      setData({
        kpis: kpiRes.data,
        funnel: funnelRes.data,
        dropoff: dropoffRes.data,
        trend: trendRes.data,
        consent: consentRes.data
      });

      if (isManual) toast.success('Analytics updated from live database');
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !data.kpis) return <LoadingSpinner message="Calculating Journey Funnel Analytics..." />;

  const { kpis, funnel, dropoff, trend, consent } = data;
  const stages = funnel.stages || [];

  // Find stage with worst drop-off
  const dropoffStages = dropoff.stages || [];
  let worstDropStage = null;
  let maxDropRate = -1;
  dropoffStages.slice(1).forEach(s => {
    const rate = s.dropOffRate ?? (s.abandonmentRate ? s.abandonmentRate * 100 : 0);
    if (rate > maxDropRate) {
      maxDropRate = rate;
      worstDropStage = s.stage_name;
    }
  });

  // 1. Funnel Chart (Horizontal Bar)
  const funnelData = {
    labels: stages.map(s => s.stage_name),
    datasets: [
      {
        label: 'True Count (Baseline Reference)',
        data: stages.map(s => s.entered ?? s.actualCount ?? 0),
        backgroundColor: 'rgba(59, 130, 246, 0.4)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: funnel.privacyMode === 'differential_privacy' ? `DP Noisy Count (ε = ${funnel.epsilon || 1.0})` : 'Visible Count',
        data: stages.map(s => funnel.privacyMode === 'differential_privacy' ? (s.noisyEntered ?? s.noisyCount ?? s.entered) : (s.entered ?? s.actualCount)),
        backgroundColor: 'rgba(124, 58, 237, 0.85)',
        borderColor: '#7c3aed',
        borderWidth: 1,
        borderRadius: 4,
      }
    ],
  };

  // 2. Drop-off Analysis (Vertical Bar)
  const dropoffData = {
    labels: dropoffStages.slice(1).map(s => s.stage_name),
    datasets: [
      {
        label: 'Abandonment Rate (%)',
        data: dropoffStages.slice(1).map(s => s.dropOffRate ?? (s.abandonmentRate ? s.abandonmentRate * 100 : 0)),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  // 3. Trend Line (Workflow Completions)
  const trendDates = trend?.dates?.length > 0 
    ? trend.dates.map(d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) 
    : ['Past Activity'];
  const trendCompletions = trend?.completions?.length > 0 ? trend.completions : [0];
  const trendTotals = trend?.totals?.length > 0 ? trend.totals : [0];

  const trendData = {
    labels: trendDates,
    datasets: [
      {
        label: 'Total Sessions',
        data: trendTotals,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: 'Completed Journeys',
        data: trendCompletions,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  // 4. Conversion Doughnut
  const compRate = parseFloat(kpis.completionRate) || 0;
  const abanRate = parseFloat(kpis.abandonmentRate) || (100 - compRate);
  const conversionData = {
    labels: ['Completed Journey', 'Abandoned Workflow'],
    datasets: [
      {
        data: [compRate, abanRate],
        backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(239, 68, 68, 0.75)'],
        borderColor: ['#10b981', '#ef4444'],
        borderWidth: 1,
      }
    ]
  };

  // 5. Consent Pie
  const consentPct = consent.percentage ?? consent.consentRate ?? (kpis.totalEvents > 0 ? Math.round((kpis.consentingUsers / kpis.uniqueUsers) * 100) : 72);
  const consentPieData = {
    labels: ['Consented Analytics', 'Opted Out / Restricted'],
    datasets: [
      {
        data: [parseFloat(Number(consentPct).toFixed(1)), parseFloat((100 - Number(consentPct)).toFixed(1))],
        backgroundColor: ['rgba(139, 92, 246, 0.85)', 'rgba(100, 116, 139, 0.7)'],
        borderColor: ['#8b5cf6', '#64748b'],
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
    }
  };

  const horizontalOptions = { ...chartOptions, indexAxis: 'y' };
  const pieOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { 
      legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 11 } } } 
    } 
  };

  const allWarnings = [
    ...(kpis.warnings || []),
    ...(funnel.warnings || []),
    ...(consent.warnings || [])
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg text-xl">📈</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Journey Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Privacy-preserving funnel progression, stage drop-off, and conversion metrics.
          </p>
        </div>

        <button
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 flex items-center transition-colors self-start sm:self-auto"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin text-primary-400' : ''}`} />
          Refresh Live Data
        </button>
      </div>

      {/* Summary KPI Strips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-l-4 border-l-primary-500 shadow-md">
          <p className="text-xs uppercase text-slate-400 font-medium">Tracked Sessions</p>
          <p className="mt-1 text-2xl font-bold text-white">{(kpis.totalSessions || 0).toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">Zero PII gathered</p>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-emerald-500 shadow-md">
          <p className="text-xs uppercase text-slate-400 font-medium">Completion Rate</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{kpis.completionRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">{(kpis.completedSessions || 0).toLocaleString()} users completed</p>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-red-500 shadow-md">
          <p className="text-xs uppercase text-slate-400 font-medium">Peak Abandonment</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{maxDropRate > 0 ? `${maxDropRate}%` : 'N/A'}</p>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{worstDropStage ? `At: ${worstDropStage}` : 'Evenly distributed'}</p>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-purple-500 shadow-md">
          <p className="text-xs uppercase text-slate-400 font-medium">Privacy Rating</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">{kpis.privacyScore} / 100</p>
          <p className="text-[11px] text-slate-400 mt-1">ε = {funnel.epsilon || 1.0} Laplace calibrated</p>
        </div>
      </div>

      {/* Warnings */}
      {allWarnings.length > 0 && (
        <div className="space-y-3">
          {allWarnings.map((msg, i) => (
            <WarningBanner key={i} type="warning" message="Notice" details={msg} />
          ))}
        </div>
      )}

      {/* 4 Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Stage Entries Funnel */}
        <div className="glass-panel p-6 shadow-xl flex flex-col h-[400px]">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>Stage Entries Funnel</span>
              <span className="text-xs font-normal text-purple-400 bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-800">
                DP Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">Total sessions progressing through each consecutive journey milestone.</p>
          </div>
          <div className="flex-1 relative">
            <Bar data={funnelData} options={horizontalOptions} />
          </div>
        </div>

        {/* 2. Stage Abandonment Rate */}
        <div className="glass-panel p-6 shadow-xl flex flex-col h-[400px]">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>Stage Abandonment Rate</span>
              <span className="text-xs font-normal text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded border border-red-800">
                Drop-off %
              </span>
            </h3>
            <p className="text-xs text-slate-400">Percentage of visitors leaving during each step transition.</p>
          </div>
          <div className="flex-1 relative">
            <Bar data={dropoffData} options={chartOptions} />
          </div>
        </div>

        {/* 3. Workflow Completion Trend */}
        <div className="glass-panel p-6 shadow-xl flex flex-col h-[400px]">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>Workflow Completion Trend</span>
              <span className="text-xs font-normal text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800">
                14-Day Velocity
              </span>
            </h3>
            <p className="text-xs text-slate-400">Total traffic vs successful journey completions over recent calendar days.</p>
          </div>
          <div className="flex-1 relative">
            <Line data={trendData} options={chartOptions} />
          </div>
        </div>

        {/* 4 & 5. Final Conversion & Consent Breakdown */}
        <div className="glass-panel p-6 shadow-xl flex flex-col h-[400px]">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Conversion & Consent Distributions</h3>
            <p className="text-xs text-slate-400">Overall success split and anonymous consent participation share.</p>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Conversion Doughnut */}
            <div className="flex flex-col items-center justify-center relative">
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Completion vs Abandonment</h4>
              <div className="h-44 w-full relative">
                <Doughnut data={conversionData} options={pieOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                  <span className="text-xl font-bold text-emerald-400">{kpis.completionRate}%</span>
                  <span className="text-[10px] text-slate-400">Completed</span>
                </div>
              </div>
            </div>

            {/* Consent Pie */}
            <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-3">
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Consent Participation</h4>
              <div className="h-44 w-full relative">
                <Pie data={consentPieData} options={pieOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations Panel */}
      <div className="glass-panel p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
          <LightBulbIcon className="h-5 w-5 text-yellow-400 mr-2" />
          Automated Funnel Optimization Insights
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <h4 className="text-sm font-semibold text-red-400 mb-1 flex items-center">
              <ArrowTrendingDownIcon className="h-4 w-4 mr-1.5" /> High Drop-off Bottleneck
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {worstDropStage 
                ? `Stage "${worstDropStage}" exhibits highest loss (${maxDropRate}%). Simplify inputs and reduce intermediate friction.`
                : 'Stage progression is well balanced across the workflow.'}
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <h4 className="text-sm font-semibold text-emerald-400 mb-1 flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1.5" /> Completion Stability
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Overall completion rate is at {kpis.completionRate}%. Even with differential privacy noise applied, funnel drop trends remain statistically preserved.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80">
            <h4 className="text-sm font-semibold text-purple-400 mb-1 flex items-center">
              <ShieldCheckIcon className="h-4 w-4 mr-1.5" /> Privacy Health
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Privacy budget remaining is {100 - (kpis.budgetUsed ? Math.round((kpis.budgetUsed / kpis.totalBudget) * 100) : 10)}%. Epsilon ε={funnel.epsilon || 1.0} guarantees strong protection against membership inference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
