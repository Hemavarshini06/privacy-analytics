import { useState } from 'react';
import toast from 'react-hot-toast';
import { BoltIcon, ChartBarIcon, ShieldExclamationIcon, TrashIcon } from '@heroicons/react/24/outline';
import WarningBanner from '../components/WarningBanner';
import api from '../services/api';

export default function SimulatorPage() {
  const [numUsers, setNumUsers] = useState(5000);
  const [dropoff, setDropoff] = useState(0.3);
  const [consent, setConsent] = useState(70);
  const [dpMode, setDpMode] = useState(true);
  
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);

  const handleSimulate = async () => {
    setGenerating(true);
    try {
      const response = await api.events.simulate({
        numUsers,
        dropOffProbability: dropoff,
        consentPercentage: consent,
        privacyMode: dpMode ? 'differential_privacy' : 'aggregation_only'
      });
      
      const { eventsGenerated, summary } = response.data;
      
      setResults({
        totalSimulated: summary.total_users_simulated,
        consentedUsers: summary.consenting_users,
        funnelResults: summary.stages || [],
        completionRate: summary.completion_rate,
        eventsGenerated: eventsGenerated
      });
      
      toast.success(`Successfully generated ${eventsGenerated} events!`);
    } catch (error) {
      console.error('Simulation error', error);
      toast.error(error.response?.data?.error || 'Failed to generate events. Please ensure you have workflow stages set up first.');
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Clear all simulated events from the database? This cannot be undone.')) {
      try {
        await api.events.clearEvents();
        setResults(null);
        toast.success('Events cleared from database');
      } catch (error) {
        console.error('Clear error', error);
        toast.error('Failed to clear events');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Event Simulator</h2>
        <p className="text-slate-400">Generate synthetic user traffic to test the privacy engine and analytics views.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 shadow-xl relative overflow-hidden">
            {generating && (
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-white font-medium animate-pulse">Generating Events in Database...</p>
              </div>
            )}
            
            <h3 className="text-lg font-medium text-white mb-6 flex items-center">
              <BoltIcon className="h-5 w-5 mr-2 text-accent-400" />
              Simulation Parameters
            </h3>
            
            <div className="space-y-6">
              {/* Users Slider */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-medium text-slate-300">Total Users</label>
                  <span className="text-sm font-bold text-white bg-slate-800 px-2 py-1 rounded">{numUsers.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="100" max="10000" step="100" 
                  value={numUsers} 
                  onChange={(e) => setNumUsers(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
              </div>

              {/* Drop-off Slider */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-medium text-slate-300">Drop-off Prob. per Stage</label>
                  <span className="text-sm font-bold text-white bg-slate-800 px-2 py-1 rounded">{(dropoff * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.05" max="0.8" step="0.05" 
                  value={dropoff} 
                  onChange={(e) => setDropoff(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>

              {/* Consent Slider */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm font-medium text-slate-300">Consent Rate</label>
                  <span className="text-sm font-bold text-white bg-slate-800 px-2 py-1 rounded">{consent}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" step="5" 
                  value={consent} 
                  onChange={(e) => setConsent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-success-500"
                />
              </div>

              {/* Privacy Mode Toggle */}
              <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Differential Privacy</h4>
                  <p className="text-xs text-slate-400">Mark intent for this simulation run</p>
                </div>
                <button 
                  onClick={() => setDpMode(!dpMode)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${dpMode ? 'bg-primary-600' : 'bg-slate-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${dpMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleSimulate}
                  disabled={generating}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white rounded-lg font-bold shadow-lg shadow-primary-500/25 transition-all active:scale-[0.98]"
                >
                  Generate Events
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Warnings */}
          <div className="space-y-3">
            {numUsers < 1000 && dpMode && (
              <WarningBanner type="warning" message="Low traffic warning" details="With few users, DP noise will have a proportionally larger impact on accuracy in real analytics views." />
            )}
            {consent === 0 && (
              <WarningBanner type="info" message="Zero consent" details="No individual journeys will be tracked." />
            )}
            {dropoff > 0.6 && (
              <WarningBanner type="error" message="High drop-off rate" details="Most users won't reach the end of the funnel." />
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7">
          {results ? (
            <div className="glass-panel p-6 h-full shadow-xl animate-slideUp">
              <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                <h3 className="text-lg font-medium text-white flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-success-400" />
                  Simulation Results
                </h3>
                <button onClick={handleClear} className="text-sm text-red-400 hover:text-red-300 flex items-center bg-red-400/10 px-3 py-1.5 rounded-md transition-colors">
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Clear Events
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-sm text-slate-400 mb-1">Total Simulated Users</p>
                  <p className="text-2xl font-bold text-white">{results.totalSimulated.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">{results.eventsGenerated.toLocaleString()} raw events stored</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <p className="text-sm text-slate-400 mb-1">Overall Completion</p>
                  <p className="text-2xl font-bold text-accent-400">{results.completionRate}%</p>
                </div>
              </div>

              <h4 className="text-sm font-medium text-slate-300 mb-4 uppercase tracking-wider">Raw Funnel Traversal (No DP)</h4>
              
              <div className="space-y-4">
                {results.funnelResults.map((stage, idx) => {
                  const maxCount = results.funnelResults[0]?.entered || 1;
                  const widthPercent = Math.max(2, (stage.entered / maxCount) * 100);
                  
                  return (
                    <div key={idx} className="relative">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white font-medium">{idx + 1}. {stage.stage_name}</span>
                        <div className="text-right">
                          <span className="text-slate-300 mr-2">Count:</span>
                          <span className="font-bold text-white">
                            {stage.entered.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-6 overflow-hidden relative">
                        <div 
                          className="bg-primary-600/80 h-full rounded-full flex items-center px-3"
                          style={{ width: `${widthPercent}%` }}
                        >
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-8 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg flex items-start">
                <ShieldExclamationIcon className="h-5 w-5 text-primary-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-primary-200">
                  These are the TRUE simulated counts pushed to the database. To see how Differential Privacy affects these numbers, view the <a href="/analytics" className="underline hover:text-white">Analytics Dashboard</a>.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-panel h-full flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-slate-700 opacity-70">
              <BoltIcon className="h-16 w-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-medium text-slate-300">Ready to Simulate</h3>
              <p className="mt-2 text-slate-500 max-w-sm">
                Adjust the parameters on the left and click "Generate Events" to create realistic synthetic traffic and store it in your database.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
