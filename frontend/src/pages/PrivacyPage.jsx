import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  ShieldCheckIcon, 
  AdjustmentsHorizontalIcon, 
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PrivacyPage() {
  const [loading, setLoading] = useState(true);
  const [epsilon, setEpsilon] = useState(1.5);
  const [dpEnabled, setDpEnabled] = useState(true);
  const [retention, setRetention] = useState(90);
  const [mechanism, setMechanism] = useState('laplace');
  const [saving, setSaving] = useState(false);
  
  const [budgetUsed, setBudgetUsed] = useState(0);
  const [budgetTotal, setBudgetTotal] = useState(100);
  const [queryLogs, setQueryLogs] = useState([]);

  const fetchData = async () => {
    try {
      const [settingsRes, budgetRes] = await Promise.all([
        api.privacy.getSettings(),
        api.privacy.getBudget()
      ]);

      const settings = settingsRes.data.settings;
      if (settings) {
        setEpsilon(parseFloat(settings.epsilon_value) || 1.5);
        setDpEnabled(settings.privacy_mode === 'differential_privacy');
        setRetention(settings.retention_days || 90);
        setMechanism(settings.noise_mechanism || 'laplace');
      }

      setBudgetTotal(budgetRes.data.totalBudget);
      setBudgetUsed(budgetRes.data.usedBudget);
      setQueryLogs(budgetRes.data.queryLog || []);
    } catch (e) {
      console.error('Failed to load privacy data', e);
      toast.error('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.privacy.updateSettings({
        privacy_mode: dpEnabled ? 'differential_privacy' : 'aggregation_only',
        epsilon_value: epsilon,
        retention_days: retention,
        noise_mechanism: mechanism
      });
      toast.success('Privacy settings updated successfully');
      await fetchData(); // refresh stats
    } catch (e) {
      console.error('Failed to save settings', e);
      toast.error('Failed to update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetBudget = async () => {
    if (window.confirm('Resetting the privacy budget will clear your current epsilon spending limits. Continue?')) {
      try {
        await api.privacy.resetBudget();
        toast.success('Privacy budget reset for the new billing cycle');
        await fetchData(); // refresh budget
      } catch (e) {
        console.error('Failed to reset budget', e);
        toast.error('Failed to reset privacy budget');
      }
    }
  };

  const getPrivacyLevel = () => {
    if (!dpEnabled) return { label: 'None (Agg. Only)', color: 'text-red-500', bg: 'bg-red-500/20' };
    if (epsilon < 1.0) return { label: 'High Privacy', color: 'text-success-500', bg: 'bg-success-500/20' };
    if (epsilon <= 3.0) return { label: 'Medium Privacy', color: 'text-yellow-400', bg: 'bg-yellow-400/20' };
    return { label: 'Low Privacy', color: 'text-red-400', bg: 'bg-red-400/20' };
  };

  if (loading) return <LoadingSpinner />;

  const levelInfo = getPrivacyLevel();
  // Calculate est noise based on epsilon
  const estNoiseMagn = dpEnabled ? (1 / epsilon).toFixed(2) : '0.00';
  const percentageUsed = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Privacy & Compliance Engine</h2>
        <p className="text-slate-400">Configure cryptographic privacy parameters and manage your epsilon budget.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 shadow-xl">
            <h3 className="text-lg font-medium text-white mb-6 flex items-center border-b border-slate-700 pb-4">
              <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2 text-primary-400" />
              Engine Configuration
            </h3>

            <div className="space-y-8">
              {/* DP Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium text-white">Differential Privacy Mode</h4>
                  <p className="text-sm text-slate-400 mt-1 max-w-md">
                    When disabled, the system relies purely on anonymous aggregation. No mathematical noise is injected.
                  </p>
                </div>
                <button 
                  onClick={() => setDpEnabled(!dpEnabled)}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${dpEnabled ? 'bg-primary-600' : 'bg-slate-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${dpEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Epsilon Slider */}
              <div className={`transition-opacity ${!dpEnabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h4 className="text-base font-medium text-white flex items-center">
                      Privacy Budget Factor (ε)
                      <span className={`ml-3 px-2 py-0.5 text-xs rounded font-bold border border-current ${levelInfo.color} ${levelInfo.bg}`}>
                        {levelInfo.label}
                      </span>
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">Lower values = more noise (higher privacy)</p>
                  </div>
                  <span className="text-xl font-bold text-primary-400 bg-slate-800 px-3 py-1 rounded border border-slate-700">
                    {epsilon.toFixed(1)}
                  </span>
                </div>
                
                <input 
                  type="range" 
                  min="0.1" max="10.0" step="0.1" 
                  value={epsilon} 
                  onChange={(e) => setEpsilon(Number(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-success-500 via-yellow-500 to-red-500 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                  <span>0.1 (Max Privacy)</span>
                  <span>10.0 (Max Accuracy)</span>
                </div>
              </div>

              {/* Other settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700/50">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Noise Mechanism</label>
                  <select 
                    value={mechanism}
                    onChange={(e) => setMechanism(e.target.value)}
                    disabled={!dpEnabled}
                    className="block w-full rounded-md border-0 py-2.5 px-3 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm disabled:opacity-50 transition-colors"
                  >
                    <option value="laplace">Laplace (Standard)</option>
                    <option value="gaussian">Gaussian (Advanced)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Data Retention (Days)</label>
                  <input 
                    type="number" 
                    min="30" max="365"
                    value={retention}
                    onChange={(e) => setRetention(Number(e.target.value))}
                    className="block w-full rounded-md border-0 py-2 px-3 bg-slate-800 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-primary-500/20 transition-all flex items-center"
                >
                  {saving ? <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> : null}
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
          
          {/* Formula visualization */}
          <div className="glass-panel p-6 border-l-4 border-primary-500 bg-slate-900/80">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Cryptographic Implementation</h4>
            
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-sm text-center mb-4">
              <span className="text-white">Noisy_Count</span> = <span className="text-success-400">True_Count</span> + <span className="text-accent-400">Laplace(0, Δf/ε)</span>
            </div>
            
            <div className="text-sm text-slate-400">
              <p className="mb-2 flex justify-between"><span>Current Epsilon (ε):</span> <strong className="text-white">{dpEnabled ? epsilon.toFixed(1) : 'N/A'}</strong></p>
              <p className="mb-2 flex justify-between"><span>Sensitivity (Δf):</span> <strong className="text-white">1 (single user event)</strong></p>
              <p className="mb-0 flex justify-between pt-2 border-t border-slate-800">
                <span>Estimated Noise Magnitude:</span> 
                <strong className={dpEnabled ? 'text-accent-400' : 'text-slate-500'}>± {estNoiseMagn} events</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: Budget Tracking */}
        <div className="space-y-6">
          <div className="glass-panel p-6 shadow-xl border border-red-500/10">
            <h3 className="text-lg font-medium text-white mb-6 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2 text-red-400" />
              Privacy Budget
            </h3>

            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-slate-300">Monthly Usage</span>
                <span className="text-sm font-bold text-white">{parseFloat(budgetUsed).toFixed(2)} / {budgetTotal} ε</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${percentageUsed > 80 ? 'bg-red-500' : percentageUsed > 50 ? 'bg-yellow-500' : 'bg-success-500'}`}
                  style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-right">Resets automatically each billing cycle</p>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg mb-6 border border-slate-700">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                Why track budgets?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every query against the database consumes a fraction of your privacy budget. Tracking this ensures mathematically provable privacy limits across multiple, repeated queries over time.
              </p>
            </div>

            <button 
              onClick={handleResetBudget}
              className="w-full bg-slate-800 hover:bg-slate-700 text-red-400 px-4 py-2 rounded-lg font-medium border border-slate-700 hover:border-red-500/50 transition-all flex items-center justify-center text-sm"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Emergency Reset
            </button>
          </div>
          
          <div className="glass-panel p-6 opacity-70 max-h-[300px] overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-medium text-white mb-4 uppercase tracking-wider">Recent Queries Log</h3>
            <div className="space-y-3">
              {queryLogs.length === 0 ? (
                <p className="text-slate-500 text-sm">No recent queries</p>
              ) : (
                queryLogs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center text-xs border-b border-slate-800 pb-2 last:border-0">
                    <div>
                      <p className="text-slate-300 font-medium">{log.query_type}</p>
                      <p className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                    <span className="text-red-400 font-mono">- {parseFloat(log.epsilon_consumed).toFixed(2)}ε</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
