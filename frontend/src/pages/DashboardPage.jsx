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
  BoltIcon
} from '@heroicons/react/24/outline';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [kpiRes, funnelRes] = await Promise.all([
          api.analytics.getKPIs(),
          api.analytics.getFunnel()
        ]);
        setKpis(kpiRes.data);
        setFunnel(funnelRes.data);
      } catch (error) {
        console.error("Error fetching Dashboard data", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading Dashboard..." />;
  if (!kpis || !funnel) return <div className="text-white text-center p-8">Error loading dashboard</div>;

  const chartData = {
    labels: funnel.stages.map(d => d.stage_name),
    datasets: [
      {
        label: 'Users at Stage',
        data: funnel.stages.map(d => funnel.privacyMode === 'differential_privacy' ? d.noisyEntered : d.entered),
        backgroundColor: 'rgba(124, 58, 237, 0.8)',
        borderColor: 'rgb(124, 58, 237)',
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
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
    },
  };

  const percentageUsed = kpis.totalBudget > 0 ? Math.round((kpis.budgetUsed / kpis.totalBudget) * 100) : 0;
  const allWarnings = [...(kpis.warnings || []), ...(funnel.warnings || [])];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome & Status row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0] || 'User'}</h2>
          <p className="text-slate-400">Here's what's happening in your application today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="glass-card px-4 py-2 flex items-center">
            <span className="relative flex h-3 w-3 mr-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${funnel.privacyMode === 'differential_privacy' ? 'bg-success-400' : 'bg-yellow-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${funnel.privacyMode === 'differential_privacy' ? 'bg-success-500' : 'bg-yellow-500'}`}></span>
            </span>
            <span className="text-sm font-medium text-slate-300">
              {funnel.privacyMode === 'differential_privacy' ? 'DP Engine Active' : 'Aggregation Only'}
            </span>
          </div>
          <Link to="/simulator" className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-500/20 flex items-center">
            <BoltIcon className="h-4 w-4 mr-2" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard 
          title="Total Events" 
          value={(kpis.totalEvents || 0).toLocaleString()} 
          icon={UsersIcon}
          trend="up"
          trendValue="Live"
          color="primary"
        />
        <KPICard 
          title="Consenting Users" 
          value={`${kpis.totalEvents > 0 ? Math.round((kpis.consentingUsers / kpis.uniqueUsers) * 100) : 0}%`} 
          subtitle={`${(kpis.consentingUsers || 0).toLocaleString()} total`}
          icon={CheckBadgeIcon}
          trend="up"
          trendValue="Active"
          color="success"
        />
        <KPICard 
          title="Completion Rate" 
          value={`${kpis.completionRate || 0}%`} 
          icon={ArrowTrendingUpIcon}
          trend={kpis.completionRate > 50 ? 'up' : 'down'}
          trendValue="Overall"
          color="accent"
        />
        <KPICard 
          title="Abandonment" 
          value={`${kpis.abandonmentRate || 0}%`} 
          icon={ArrowTrendingDownIcon}
          trend={kpis.abandonmentRate > 30 ? 'up' : 'down'}
          trendValue="Overall"
          color="warning"
        />
        <KPICard 
          title="Budget Used" 
          value={`${percentageUsed}%`} 
          subtitle={`${kpis.budgetUsed} / ${kpis.totalBudget} ε`}
          icon={ShieldExclamationIcon}
          trend={percentageUsed > 80 ? 'down' : 'up'}
          trendValue={percentageUsed > 80 ? 'Critical' : 'Healthy'}
          color={percentageUsed > 80 ? 'danger' : 'primary'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="glass-panel p-6 lg:col-span-2 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Workflow Funnel Overview</h3>
            <Link to="/analytics" className="text-sm text-primary-400 hover:text-primary-300">View detailed analytics &rarr;</Link>
          </div>
          <div className="h-80 w-full relative">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Quick Actions / Activity */}
        <div className="glass-panel p-6 shadow-xl flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
          
          <div className="flex-1 space-y-4 pr-2">
            <Link to="/workflow" className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-md">
              Edit Workflow Stages
            </Link>
            <Link to="/comparison" className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-md">
              Run Privacy Experiment
            </Link>
            <Link to="/reports" className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-md">
              Download Reports
            </Link>
            <Link to="/privacy" className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-md">
              Adjust Privacy Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
