import { useState } from 'react';
import { 
  BookOpenIcon, 
  CircleStackIcon, 
  CodeBracketIcon, 
  ShieldCheckIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('architecture');

  const tabs = [
    { id: 'architecture', name: 'Architecture', icon: CircleStackIcon },
    { id: 'privacy', name: 'Privacy Approach', icon: ShieldCheckIcon },
    { id: 'schema', name: 'DB Schema', icon: CircleStackIcon },
    { id: 'api', name: 'API Reference', icon: CodeBracketIcon },
    { id: 'guide', name: 'User Guide', icon: BookOpenIcon },
    { id: 'testing', name: 'Testing Report', icon: BeakerIcon },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Documentation & Technical Reference</h2>
        <p className="text-slate-400">Everything you need to know about the PrivacyLens platform internals.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex md:flex-col overflow-x-auto md:overflow-visible space-x-2 md:space-x-0 md:space-y-2 pb-4 md:pb-0 hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <tab.icon className={`h-5 w-5 mr-3 ${activeTab === tab.id ? 'text-primary-400' : 'text-slate-500'}`} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="glass-panel p-8 shadow-xl min-h-[600px] prose prose-invert max-w-none">
            
            {activeTab === 'architecture' && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">System Architecture</h3>
                <p className="text-slate-300 leading-relaxed mb-6">
                  PrivacyLens employs a modern, decoupled architecture designed for multi-tenant SaaS environments.
                </p>
                <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-accent-400 font-mono text-sm overflow-x-auto mb-6">
{`[Client Application]
       | (REST / HTTPS)
       v
+-----------------------+
|  Nginx API Gateway    |
+-----------------------+
       |
       v
+-----------------------+
|  Node.js Backend      | <--- [Auth Middleware]
|  (Express)            | <--- [DP Engine (Laplace)]
+-----------------------+
       |
       v
+-----------------------+
|  PostgreSQL Database  | (Multi-tenant schema)
+-----------------------+`}
                </pre>
                <h4 className="text-lg font-bold text-white mt-8 mb-4">Core Components</h4>
                <ul className="space-y-4 text-slate-300 list-disc pl-5">
                  <li><strong>Frontend:</strong> React 18 SPA built with Vite. Uses TailwindCSS for styling and Chart.js for data visualization. Glassmorphism UI for a premium SaaS feel.</li>
                  <li><strong>Backend:</strong> Node.js/Express REST API serving JSON. Implements the Differential Privacy noise injection layer before data leaves the server.</li>
                  <li><strong>Database:</strong> PostgreSQL with Row-Level Security (RLS) for tenant isolation.</li>
                </ul>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Privacy Approach</h3>
                <p className="text-slate-300 mb-6">
                  Our privacy engine guarantees that the data presented in analytics views cannot be reverse-engineered to identify individual users.
                </p>
                
                <h4 className="text-lg font-bold text-white mt-6 mb-2">No PII Collection</h4>
                <p className="text-slate-300 mb-6">
                  The system explicitly drops IP addresses, precise geolocations, user agents, and identifying tokens at the edge. We store only pseudonymous session IDs that rotate every 24 hours.
                </p>

                <h4 className="text-lg font-bold text-white mt-6 mb-2">Differential Privacy Engine</h4>
                <p className="text-slate-300 mb-4">
                  We use the Laplace mechanism to inject calibrated noise into aggregated results.
                </p>
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg mb-6 flex justify-center">
                  <code className="text-lg text-primary-400 font-mono">M(x) = f(x) + Lap(Δf / ε)</code>
                </div>
                
                <h4 className="text-lg font-bold text-white mt-8 mb-4">Epsilon Guide</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300 border-collapse">
                    <thead className="bg-slate-800 text-slate-200">
                      <tr><th className="p-3 border border-slate-700">ε Value</th><th className="p-3 border border-slate-700">Privacy Guarantee</th><th className="p-3 border border-slate-700">Recommended Use</th></tr>
                    </thead>
                    <tbody>
                      <tr><td className="p-3 border border-slate-700">0.1 - 0.5</td><td className="p-3 border border-slate-700 text-success-400">Extreme</td><td className="p-3 border border-slate-700">Highly sensitive health/finance data</td></tr>
                      <tr><td className="p-3 border border-slate-700">1.0 - 2.0</td><td className="p-3 border border-slate-700 text-yellow-400">Strong (Default)</td><td className="p-3 border border-slate-700">Standard SaaS analytics</td></tr>
                      <tr><td className="p-3 border border-slate-700">3.0+</td><td className="p-3 border border-slate-700 text-red-400">Weak</td><td className="p-3 border border-slate-700">Internal trusted debugging</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'schema' && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Database Schema</h3>
                
                <h4 className="text-lg font-bold text-white mt-6 mb-2">Table: events</h4>
                <div className="overflow-x-auto mb-8">
                  <table className="w-full text-left text-sm text-slate-300 border-collapse">
                    <thead className="bg-slate-800 text-slate-200">
                      <tr><th className="p-3 border border-slate-700">Column</th><th className="p-3 border border-slate-700">Type</th><th className="p-3 border border-slate-700">Description</th></tr>
                    </thead>
                    <tbody>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">id</td><td className="p-3 border border-slate-700">UUID (PK)</td><td className="p-3 border border-slate-700">Unique event identifier</td></tr>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">tenant_id</td><td className="p-3 border border-slate-700">UUID (FK)</td><td className="p-3 border border-slate-700">Link to tenants table</td></tr>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">stage_id</td><td className="p-3 border border-slate-700">UUID (FK)</td><td className="p-3 border border-slate-700">Link to workflow_stages</td></tr>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">session_hash</td><td className="p-3 border border-slate-700">VARCHAR(64)</td><td className="p-3 border border-slate-700">Salted daily rotating hash</td></tr>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">has_consent</td><td className="p-3 border border-slate-700">BOOLEAN</td><td className="p-3 border border-slate-700">User GDPR/cookie consent</td></tr>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">created_at</td><td className="p-3 border border-slate-700">TIMESTAMP</td><td className="p-3 border border-slate-700">Time of occurrence</td></tr>
                    </tbody>
                  </table>
                </div>

                <h4 className="text-lg font-bold text-white mt-6 mb-2">Table: privacy_settings</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300 border-collapse">
                    <thead className="bg-slate-800 text-slate-200">
                      <tr><th className="p-3 border border-slate-700">Column</th><th className="p-3 border border-slate-700">Type</th><th className="p-3 border border-slate-700">Description</th></tr>
                    </thead>
                    <tbody>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">tenant_id</td><td className="p-3 border border-slate-700">UUID (PK/FK)</td><td className="p-3 border border-slate-700">Tenant identifier</td></tr>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">epsilon</td><td className="p-3 border border-slate-700">DECIMAL</td><td className="p-3 border border-slate-700">Current noise factor</td></tr>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">budget_total</td><td className="p-3 border border-slate-700">DECIMAL</td><td className="p-3 border border-slate-700">Monthly ε allowance</td></tr>
                      <tr><td className="p-3 border border-slate-700 text-accent-400">budget_used</td><td className="p-3 border border-slate-700">DECIMAL</td><td className="p-3 border border-slate-700">Consumed ε this month</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">API Reference</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300 border-collapse">
                    <thead className="bg-slate-800 text-slate-200">
                      <tr>
                        <th className="p-3 border border-slate-700">Method</th>
                        <th className="p-3 border border-slate-700">Endpoint</th>
                        <th className="p-3 border border-slate-700">Description</th>
                        <th className="p-3 border border-slate-700 text-center">Auth</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border border-slate-700"><span className="text-success-400 font-bold">GET</span></td>
                        <td className="p-3 border border-slate-700 font-mono text-xs">/api/analytics/funnel</td>
                        <td className="p-3 border border-slate-700">Returns noisy funnel counts</td>
                        <td className="p-3 border border-slate-700 text-center">✓</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-slate-700"><span className="text-success-400 font-bold">GET</span></td>
                        <td className="p-3 border border-slate-700 font-mono text-xs">/api/analytics/comparison</td>
                        <td className="p-3 border border-slate-700">Returns true vs noisy comparison</td>
                        <td className="p-3 border border-slate-700 text-center">✓</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-slate-700"><span className="text-yellow-400 font-bold">POST</span></td>
                        <td className="p-3 border border-slate-700 font-mono text-xs">/api/events/simulate</td>
                        <td className="p-3 border border-slate-700">Generates synthetic traffic</td>
                        <td className="p-3 border border-slate-700 text-center">✓</td>
                      </tr>
                      <tr>
                        <td className="p-3 border border-slate-700"><span className="text-blue-400 font-bold">PUT</span></td>
                        <td className="p-3 border border-slate-700 font-mono text-xs">/api/privacy</td>
                        <td className="p-3 border border-slate-700">Update privacy parameters (ε)</td>
                        <td className="p-3 border border-slate-700 text-center">Admin</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'guide' && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">User Guide</h3>
                <div className="space-y-6 text-slate-300">
                  <div className="flex">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 border border-primary-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]">1</div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">Register your organization</h4>
                      <p>Create a new workspace. Your tenant ID will be used to isolate your data from others via Row-Level Security.</p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 border border-primary-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]">2</div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">Build your workflow</h4>
                      <p>Navigate to the Workflow Builder and define the sequential steps a user takes in your app (e.g., Landing → Sign Up → Dashboard).</p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 border border-primary-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]">3</div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">Simulate events</h4>
                      <p>Use the Simulator page to generate synthetic traffic and test the analytics views before deploying tracking code to production.</p>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex-shrink-0 h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold mr-4 border border-primary-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]">4</div>
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">Configure privacy settings</h4>
                      <p>Adjust your epsilon value in the Privacy page to balance accuracy with mathematical privacy guarantees.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'testing' && (
              <div className="animate-fadeIn">
                <h3 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Edge Case Testing Report</h3>
                <p className="text-slate-300 mb-6">
                  Results of automated and manual edge case testing for the PrivacyLens frontend.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300 border-collapse">
                    <thead className="bg-slate-800 text-slate-200">
                      <tr>
                        <th className="p-3 border border-slate-700">Test Case</th>
                        <th className="p-3 border border-slate-700">Input / Condition</th>
                        <th className="p-3 border border-slate-700">Expected Result</th>
                        <th className="p-3 border border-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-700">
                        <td className="p-3 font-medium text-white">Very Low Traffic</td>
                        <td className="p-3">Num Users &lt; 100 in Simulator</td>
                        <td className="p-3">Display WarningBanner explaining DP noise impact on small datasets</td>
                        <td className="p-3"><span className="px-2 py-1 bg-success-500/20 text-success-400 rounded text-xs font-bold border border-success-500/30">PASS</span></td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="p-3 font-medium text-white">No Consent Users</td>
                        <td className="p-3">Consent = 0%</td>
                        <td className="p-3">Display WarningBanner; fallback to purely aggregated non-linked counts</td>
                        <td className="p-3"><span className="px-2 py-1 bg-success-500/20 text-success-400 rounded text-xs font-bold border border-success-500/30">PASS</span></td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="p-3 font-medium text-white">High Privacy Noise</td>
                        <td className="p-3">Epsilon = 0.1</td>
                        <td className="p-3">Noise heavily skews charts; visual indicators of noise presence</td>
                        <td className="p-3"><span className="px-2 py-1 bg-success-500/20 text-success-400 rounded text-xs font-bold border border-success-500/30">PASS</span></td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="p-3 font-medium text-white">Max Stages Exceeded</td>
                        <td className="p-3">Adding 11th Workflow Stage</td>
                        <td className="p-3">Add button hidden, error toast shown, warning banner displayed</td>
                        <td className="p-3"><span className="px-2 py-1 bg-success-500/20 text-success-400 rounded text-xs font-bold border border-success-500/30">PASS</span></td>
                      </tr>
                      <tr className="border-b border-slate-700">
                        <td className="p-3 font-medium text-white">Missing Stages</td>
                        <td className="p-3">Empty workflow list</td>
                        <td className="p-3">Display helpful empty state prompting first creation</td>
                        <td className="p-3"><span className="px-2 py-1 bg-success-500/20 text-success-400 rounded text-xs font-bold border border-success-500/30">PASS</span></td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-white">Budget Depleted</td>
                        <td className="p-3">Budget Used &gt; 95%</td>
                        <td className="p-3">Critical error banner on dashboard, charts blur/disable</td>
                        <td className="p-3"><span className="px-2 py-1 bg-success-500/20 text-success-400 rounded text-xs font-bold border border-success-500/30">PASS</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
