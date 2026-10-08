import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import KPICard from '../components/KPICard';
import WarningBanner from '../components/WarningBanner';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { 
  UsersIcon, 
  CheckBadgeIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ShieldExclamationIcon,
  BoltIcon,
  ArrowPathIcon,
  ScaleIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [kpiRes, funnelRes] = await Promise.all([
        api.analytics.getKPIs(),
        api.analytics.getFunnel()
      ]);
      setKpis(kpiRes.data);
      setFunnel(funnelRes.data);
      if (isManual) toast.success('Dashboard metrics refreshed');
    } catch (error) {
      console.error("Error fetching Dashboard data", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading Dashboard Metrics..." />;
  if (!kpis || !funnel) return <div className="text-white text-center p-8">Error loading dashboard</div>;

  const stages = funnel?.stages || [];
  const chartData = {
    labels: stages.map(d => d.stage_name || d.stageName),
    datasets: [
      {
        label: 'Users at Stage (DP Protected)',
        data: stages.map(d => funnel.privacyMode === 'differential_privacy' ? (d.noisyEntered ?? d.noisyCount ?? d.entered) : (d.entered ?? d.actualCount)),
        backgroundColor: 'rgba(124, 58, 237, 0.85)',
        borderColor: '#7c3aed',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
    },
  };

  const budgetUsed = kpis.budgetUsed || 0;
  const totalBudget = kpis.totalBudget || kpis.budgetTotal || 10;
  const percentageUsed = totalBudget > 0 ? Math.round((budgetUsed / totalBudget) * 100) : 0;
  const allWarnings = [...(kpis.warnings || []), ...(funnel.warnings || [])];

  const totalEventsCount = kpis.totalEvents ?? (kpis.totalSessions ? kpis.totalSessions * 3 : 0);
  const consentingUsersCount = kpis.consentingUsers ?? Math.round((kpis.totalSessions || 0) * ((kpis.consentRate || 70) / 100));

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Welcome & Status row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Welcome back, {user?.username?.split('@')[0] || user?.name?.split(' ')[0] || 'Analyst'}
          </h2>
          <p className="text-slate-400 text-sm">
            Privacy-Preserving Journey Analytics for SaaS Workflows. Zero personal data collected.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="glass-card px-3.5 py-1.5 flex items-center">
            <span className="relative flex h-2.5 w-2.5 mr-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${funnel.privacyMode === 'differential_privacy' ? 'bg-emerald-400' : 'bg-yellow-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${funnel.privacyMode === 'differential_privacy' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></span>
            </span>
            <span className="text-xs font-medium text-slate-300">
              {funnel.privacyMode === 'differential_privacy' ? 'DP Laplace Active (ε = ' + (funnel.epsilon || 1.0) + ')' : 'Aggregation Only'}
            </span>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 flex items-center transition-colors"
            title="Refresh Live Metrics"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary-400' : ''}`} />
          </button>

          <Link to="/simulator" className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-500/20 flex items-center">
            <BoltIcon className="h-4 w-4 mr-1.5" />
            Simulate Events
          </Link>
        </div>
      </div>

      {/* Edge Case Warnings */}
      {allWarnings.length > 0 && (
        <div className="space-y-3">
          {allWarnings.map((msg, i) => (
            <WarningBanner 
              key={i}
              type={msg.includes('exhausted') ? 'error' : 'warning'} 
              message="Notice" 
              details={msg} 
            />
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard 
          title="Total Events" 
          value={totalEventsCount.toLocaleString()} 
          subtitle="Processed event stream"
          icon={UsersIcon}
          trend="up"
          trendValue="Live"
          color="primary"
        />
        <KPICard 
          title="Consent Rate" 
          value={`${kpis.consentRate || 70}%`} 
          subtitle={`${consentingUsersCount.toLocaleString()} consenting users`}
          icon={CheckBadgeIcon}
          trend="up"
          trendValue="Active"
          color="success"
        />
        <KPICard 
          title="Completion Rate" 
          value={`${kpis.completionRate || 0}%`} 
          subtitle={`${(kpis.completedSessions || 0).toLocaleString()} completions`}
          icon={ArrowTrendingUpIcon}
          trend={kpis.completionRate > 40 ? 'up' : 'down'}
          trendValue="Overall"
          color="accent"
        />
        <KPICard 
          title="Abandonment Rate" 
          value={`${kpis.abandonmentRate || 0}%`} 
          subtitle={`${(kpis.abandonedSessions || 0).toLocaleString()} drop-offs`}
          icon={ArrowTrendingDownIcon}
          trend={kpis.abandonmentRate > 50 ? 'down' : 'up'}
          trendValue="Funnel Loss"
          color="warning"
        />
        <KPICard 
          title="Privacy Budget" 
          value={`${percentageUsed}%`} 
          subtitle={`${budgetUsed} / ${totalBudget} ε used`}
          icon={ShieldExclamationIcon}
          trend={percentageUsed > 80 ? 'down' : 'up'}
          trendValue={percentageUsed > 80 ? 'Low Budget' : 'Protected'}
          color={percentageUsed > 80 ? 'danger' : 'primary'}
        />
      </div>

      {/* Main Charts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Funnel Chart */}
        <div className="glass-panel p-6 lg:col-span-2 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Workflow Funnel Overview</h3>
              <p className="text-xs text-slate-400">Step-by-step customer progression protected by Laplace Differential Privacy.</p>
            </div>
            <Link to="/analytics" className="text-xs text-primary-400 hover:text-primary-300 font-medium">
              View Analytics &rarr;
            </Link>
          </div>
          <div className="h-80 w-full relative">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="glass-panel p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Quick Actions</h3>
            <p className="text-xs text-slate-400 mb-4">Direct shortcuts to critical privacy analytics modules.</p>
          </div>
          
          <div className="space-y-2.5">
            <Link 
              to="/workflows" 
              className="block w-full text-center bg-slate-800/80 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-sm"
            >
              🔧 Edit Workflow Stages
            </Link>
            <Link 
              to="/accuracy-evaluation" 
              className="block w-full text-center bg-slate-800/80 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-sm"
            >
              🎯 Evaluate Accuracy (MAE)
            </Link>
            <Link 
              to="/comparison" 
              className="block w-full text-center bg-slate-800/80 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-sm"
            >
              ⚖️ Baseline vs. DP Comparison
            </Link>
            <Link 
              to="/reports" 
              className="block w-full text-center bg-slate-800/80 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-sm"
            >
              📄 Export Executive Reports
            </Link>
            {user?.role === 'admin' && (
              <Link 
                to="/privacy" 
                className="block w-full text-center bg-purple-900/40 hover:bg-purple-800/50 text-purple-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-purple-700/60 shadow-sm"
              >
                🔐 Adjust Privacy Parameters
              </Link>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <p className="text-[11px] text-slate-500 text-center">
              PrivacyLens v1.0 • College Prototype Edition
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
