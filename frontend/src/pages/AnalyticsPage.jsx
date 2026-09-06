import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import WarningBanner from '../components/WarningBanner';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    kpis: null,
    funnel: null,
    dropoff: null,
    trend: null,
    consent: null
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
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
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading || !data.kpis) return <LoadingSpinner />;

  const { kpis, funnel, dropoff, trend, consent } = data;
  const stages = funnel.stages || [];

  // 1. Funnel Chart
  const funnelData = {
    labels: stages.map(s => s.stage_name),
    datasets: [
      {
        label: 'True Count (Hidden in Prod)',
        data: stages.map(s => s.entered),
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
        borderColor: 'rgba(51, 65, 85, 1)',
        borderWidth: 1,
        borderRadius: 4,
        hidden: true,
      },
      {
        label: funnel.privacyMode === 'differential_privacy' ? 'DP Count (Visible)' : 'Count (Visible)',
        data: stages.map(s => funnel.privacyMode === 'differential_privacy' ? s.noisyEntered : s.entered),
        backgroundColor: 'rgba(124, 58, 237, 0.8)',
        borderColor: 'rgb(124, 58, 237)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ],
  };

  // 2. Drop-off Analysis
  const dropoffStages = dropoff.stages || [];
  const dropoffData = {
    labels: dropoffStages.slice(1).map(s => s.stage_name), // First stage has no dropoff entering it
    datasets: [
      {
        label: 'Abandonment Rate (%)',
        data: dropoffStages.slice(1).map(s => s.abandonmentRate * 100),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  // 3. Trend Line
  const trendData = {
    labels: trend.dates ? trend.dates.map(d => new Date(d).toLocaleDateString()) : [],
    datasets: [
      {
        label: 'Completions',
        data: trend.completions || [],
        borderColor: 'rgb(6, 182, 212)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  // 4. Conversion Doughnut (for overall)
  const conversionData = {
    labels: ['Completed', 'Dropped Off'],
    datasets: [
      {
        data: [kpis.completionRate, kpis.abandonmentRate],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(51, 65, 85, 0.8)'],
        borderColor: ['rgb(16, 185, 129)', 'rgb(51, 65, 85)'],
        borderWidth: 1,
      }
    ]
  };

  // 5. Consent Pie
  const consentPieData = {
    labels: ['Consented', 'Not Consented'],
    datasets: [
      {
        data: [consent.percentage, 100 - consent.percentage],
        backgroundColor: ['rgba(124, 58, 237, 0.8)', 'rgba(51, 65, 85, 0.8)'],
        borderColor: ['rgb(124, 58, 237)', 'rgb(51, 65, 85)'],
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#cbd5e1' } },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
    }
  };

  const horizontalOptions = { ...chartOptions, indexAxis: 'y' };
  const pieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } } };

  const allWarnings = [
    ...(kpis.warnings || []),
    ...(funnel.warnings || []),
    ...(consent.warnings || [])
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h2>
        <p className="text-slate-400">Deep dive into workflow performance with privacy guarantees intact.</p>
      </div>

      {/* Warnings */}
      {allWarnings.length > 0 && (
        <div className="space-y-3 mb-6">
          {allWarnings.map((msg, i) => (
            <WarningBanner key={i} type="warning" message="Notice" details={msg} />
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Funnel */}
        <div className="glass-panel p-6 shadow-xl h-96">
          <h3 className="text-lg font-medium text-white mb-4">Stage Entries Funnel</h3>
          <div className="h-full pb-8">
            <Bar data={funnelData} options={horizontalOptions} />
          </div>
        </div>

        {/* 2. Dropoff */}
        <div className="glass-panel p-6 shadow-xl h-96">
          <h3 className="text-lg font-medium text-white mb-4">Stage Abandonment Rate</h3>
          <div className="h-full pb-8">
            <Bar data={dropoffData} options={chartOptions} />
          </div>
        </div>

        {/* 3. Trend */}
        <div className="glass-panel p-6 shadow-xl h-96">
          <h3 className="text-lg font-medium text-white mb-4">Workflow Completion Trend</h3>
          <div className="h-full pb-8">
            <Line data={trendData} options={chartOptions} />
          </div>
        </div>

        {/* 4 & 5. Ratios */}
        <div className="glass-panel p-6 shadow-xl h-96 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2 flex flex-col">
            <h3 className="text-sm font-medium text-slate-300 mb-4 text-center">Final Conversion</h3>
            <div className="flex-1 relative">
              <Doughnut data={conversionData} options={pieOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                <span className="text-2xl font-bold text-white">{kpis.completionRate}%</span>
              </div>
            </div>
          </div>
          <div className="w-full sm:w-1/2 flex flex-col border-t sm:border-t-0 sm:border-l border-slate-700/50 pt-4 sm:pt-0 sm:pl-4">
            <h3 className="text-sm font-medium text-slate-300 mb-4 text-center">Consent Distribution</h3>
            <div className="flex-1 relative">
              <Pie data={consentPieData} options={pieOptions} />
            </div>
          </div>
        </div>

      </div>

      {/* Recommendations */}
      <div className="glass-panel p-6 shadow-xl mt-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center">
          <LightBulbIcon className="h-6 w-6 text-yellow-400 mr-2" />
          AI-Driven Recommendations
        </h3>
        
        {dropoff.recommendations && dropoff.recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dropoff.recommendations.map((rec, i) => (
              <div key={i} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors">
                <h4 className={`${rec.priority === 'critical' ? 'text-red-400' : 'text-yellow-400'} font-medium mb-2`}>
                  {rec.stage}
                </h4>
                <p className="text-sm text-slate-400">{rec.message}</p>
              </div>
            ))}
          </div>
        ) : (
           <p className="text-slate-400">No recommendations available at this time.</p>
        )}
      </div>
    </div>
  );
}
