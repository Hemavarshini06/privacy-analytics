import { useState } from 'react';
import { 
  BookOpenIcon, 
  CircleStackIcon, 
  CodeBracketIcon, 
  ShieldCheckIcon,
  BeakerIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('architecture');

  const tabs = [
    { id: 'architecture', name: 'Architecture', icon: CircleStackIcon },
    { id: 'privacy', name: 'Privacy Approach', icon: ShieldCheckIcon },
    { id: 'schema', name: 'Database Schema', icon: CircleStackIcon },
    { id: 'api', name: 'API Reference', icon: CodeBracketIcon },
    { id: 'guide', name: 'User Guide', icon: BookOpenIcon },
    { id: 'testing', name: 'Testing Report', icon: BeakerIcon },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn pb-12 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-primary-500/10 text-primary-400 rounded-lg text-xl">📚</span>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Technical Documentation</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Architecture overview, mathematical Differential Privacy formulation, database schema, and test verification report.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-60 flex-shrink-0">
          <nav className="flex md:flex-col overflow-x-auto md:overflow-visible space-x-2 md:space-x-0 md:space-y-1.5 pb-2 md:pb-0 hide-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/40 shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <tab.icon className={`h-5 w-5 mr-3 flex-shrink-0 ${activeTab === tab.id ? 'text-primary-400' : 'text-slate-500'}`} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Panel */}
        <div className="flex-1 min-w-0">
          <div className="glass-panel p-8 shadow-xl min-h-[600px] text-slate-300">
            
            {/* 1. Architecture Tab */}
            {activeTab === 'architecture' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">System Architecture</h3>
                <p className="text-sm leading-relaxed">
                  PrivacyLens employs a decoupled, zero-Docker full-stack architecture built specifically for collegiate evaluation and SaaS journey analytics.
                </p>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 font-mono text-xs text-primary-300 overflow-x-auto">
{`+--------------------------------------------------------------+
|                   React 18 SPA (Vite + Tailwind)             |
|   Dashboard | Workflows | Analytics | Comparison | Reports   |
+--------------------------------------------------------------+
                                |
                   REST HTTPS / JSON API
                                v
+--------------------------------------------------------------+
|                Express.js Server (Port 5000)                 |
|   [JWT Auth & RBAC]  --->  [Differential Privacy Engine]     |
|   - Admin / Analyst        - Laplace Noise Generator         |
|   - Route Protection       - Privacy Budget Monitor          |
+--------------------------------------------------------------+
                                |
                     Node.js Built-in SQLite
                                v
+--------------------------------------------------------------+
|              SQLite Database (node:sqlite DatabaseSync)      |
|   - Zero C++ Compilation      - WAL Mode & Transactions      |
|   - 100% Native on Windows    - Fully Isolated Tenants       |
+--------------------------------------------------------------+`}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-white text-sm mb-1">Frontend Layer</h4>
                    <p className="text-xs text-slate-400">React 18 with Vite, Tailwind CSS glassmorphic theme, and Chart.js visualizations.</p>
                  </div>
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-white text-sm mb-1">Privacy API Layer</h4>
                    <p className="text-xs text-slate-400">Express REST backend with Laplace noise injection, budget tracking, and JWT RBAC.</p>
                  </div>
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-white text-sm mb-1">Data Storage</h4>
                    <p className="text-xs text-slate-400">Embedded SQLite via Node.js v24 built-in <code className="text-primary-300">node:sqlite</code> with zero external C++ dependencies.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Privacy Approach Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">Differential Privacy Formulation</h3>
                
                <p className="text-sm leading-relaxed">
                  Differential Privacy (DP) guarantees that any analytical query output does not significantly depend on whether 
                  any single individual's session is present or absent in the dataset.
                </p>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-sm font-bold text-purple-400">The Laplace Mechanism</h4>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono text-base text-emerald-400">
                    Noisy Count = Actual Count + Laplace(0, &Delta;f / &epsilon;)
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Where <strong>&Delta;f</strong> is Global Query Sensitivity (equal to 1 for count queries, since one user joining or leaving 
                    alters any funnel step by at most &plusmn;1), and <strong>&epsilon;</strong> is the privacy budget parameter.
                  </p>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-sm font-bold text-blue-400">Inverse Transform Sampling (CDF)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    To sample true Laplace distributed noise in Javascript without external libraries:
                  </p>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                    X = - (1 / &epsilon;) &times; sign(U) &times; ln(1 - 2|U|), &nbsp; where U ~ Uniform(-0.5, 0.5)
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="text-sm font-bold text-white">Epsilon Guidance & Privacy Tiers</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300 border-collapse">
                      <thead className="bg-slate-950 text-slate-400">
                        <tr>
                          <th className="p-2.5 border border-slate-800">Epsilon (&epsilon;)</th>
                          <th className="p-2.5 border border-slate-800">Theoretical Scale (b=1/&epsilon;)</th>
                          <th className="p-2.5 border border-slate-800">Privacy Level</th>
                          <th className="p-2.5 border border-slate-800">Evaluation Context</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2.5 border border-slate-800 font-mono text-purple-400">&epsilon; = 0.1</td>
                          <td className="p-2.5 border border-slate-800 font-mono">b = 10.0</td>
                          <td className="p-2.5 border border-slate-800 text-emerald-400 font-semibold">Very High Privacy</td>
                          <td className="p-2.5 border border-slate-800 text-slate-400">Strict regulatory compliance (HIPAA/GDPR)</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 border border-slate-800 font-mono text-amber-400">&epsilon; = 0.5</td>
                          <td className="p-2.5 border border-slate-800 font-mono">b = 2.0</td>
                          <td className="p-2.5 border border-slate-800 text-amber-400 font-semibold">Balanced Privacy</td>
                          <td className="p-2.5 border border-slate-800 text-slate-400">General SaaS conversion analytics</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 border border-slate-800 font-mono text-blue-400">&epsilon; = 1.0</td>
                          <td className="p-2.5 border border-slate-800 font-mono">b = 1.0</td>
                          <td className="p-2.5 border border-slate-800 text-blue-400 font-semibold">Standard Privacy</td>
                          <td className="p-2.5 border border-slate-800 text-slate-400">High analytical utility baseline</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Database Schema Tab */}
            {activeTab === 'schema' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">SQLite Database Schema</h3>
                <p className="text-sm leading-relaxed">
                  PrivacyLens persists data in an embedded SQLite database (<code className="text-primary-300">data/analytics.db</code>).
                </p>

                <div className="space-y-6">
                  {/* Table: sessions */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center justify-between">
                      <span>Table: <code className="text-primary-400">sessions</code> (Zero PII)</span>
                      <span className="text-xs text-slate-500">Anonymous UUIDs</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="text-slate-400 border-b border-slate-800">
                          <tr><th className="py-2">Column</th><th className="py-2">Type</th><th className="py-2">Description</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          <tr><td className="py-1.5 text-primary-300">id</td><td>TEXT (PK)</td><td>Anonymous UUID v4</td></tr>
                          <tr><td className="py-1.5 text-primary-300">workflow_id</td><td>INTEGER (FK)</td><td>Reference to workflows table</td></tr>
                          <tr><td className="py-1.5 text-primary-300">started_at</td><td>DATETIME</td><td>Session start timestamp</td></tr>
                          <tr><td className="py-1.5 text-primary-300">is_completed</td><td>INTEGER (0/1)</td><td>Workflow completion boolean flag</td></tr>
                          <tr><td className="py-1.5 text-primary-300">consent_given</td><td>INTEGER (0/1)</td><td>Explicit privacy consent status</td></tr>
                          <tr><td className="py-1.5 text-primary-300">last_stage_reached</td><td>INTEGER</td><td>Final sequential milestone index</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Table: events */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center justify-between">
                      <span>Table: <code className="text-primary-400">events</code></span>
                      <span className="text-xs text-slate-500">Milestone Entry Stream</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="text-slate-400 border-b border-slate-800">
                          <tr><th className="py-2">Column</th><th className="py-2">Type</th><th className="py-2">Description</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          <tr><td className="py-1.5 text-primary-300">id</td><td>INTEGER (PK)</td><td>Auto-increment event sequence ID</td></tr>
                          <tr><td className="py-1.5 text-primary-300">session_id</td><td>TEXT (FK)</td><td>Links to anonymous sessions table</td></tr>
                          <tr><td className="py-1.5 text-primary-300">stage_id</td><td>INTEGER (FK)</td><td>Target journey milestone</td></tr>
                          <tr><td className="py-1.5 text-primary-300">stage_order</td><td>INTEGER</td><td>Sequential order index</td></tr>
                          <tr><td className="py-1.5 text-primary-300">timestamp</td><td>DATETIME</td><td>Stage arrival timestamp</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Table: privacy_settings */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                    <h4 className="font-bold text-white text-sm mb-2">
                      Table: <code className="text-primary-400">privacy_settings</code>
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">Stores epsilon parameter (&epsilon;), budget used, budget total allowance, and active privacy mode.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. API Reference Tab */}
            {activeTab === 'api' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">REST API Endpoints</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-slate-900 text-slate-400 uppercase">
                      <tr>
                        <th className="p-3 border border-slate-800">Method</th>
                        <th className="p-3 border border-slate-800">Endpoint</th>
                        <th className="p-3 border border-slate-800">Access</th>
                        <th className="p-3 border border-slate-800">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      <tr>
                        <td className="p-3 text-emerald-400 font-bold">GET</td>
                        <td className="p-3 text-white">/api/analytics/kpis</td>
                        <td className="p-3 text-slate-400">Analyst / Admin</td>
                        <td className="p-3 font-sans text-slate-300">Returns total sessions, completion, abandonment, and privacy score</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-emerald-400 font-bold">GET</td>
                        <td className="p-3 text-white">/api/analytics/funnel</td>
                        <td className="p-3 text-slate-400">Analyst / Admin</td>
                        <td className="p-3 font-sans text-slate-300">Returns stage counts with Laplace differential privacy applied</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-emerald-400 font-bold">GET</td>
                        <td className="p-3 text-white">/api/analytics/accuracy-evaluation</td>
                        <td className="p-3 text-slate-400">Analyst / Admin</td>
                        <td className="p-3 font-sans text-slate-300">Multi-epsilon evaluation comparing Ground Truth vs &epsilon; &isin; [0.1, 0.5, 1.0]</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-emerald-400 font-bold">GET</td>
                        <td className="p-3 text-white">/api/analytics/comparison</td>
                        <td className="p-3 text-slate-400">Analyst / Admin</td>
                        <td className="p-3 font-sans text-slate-300">Side-by-side Baseline Aggregation vs Differential Privacy data</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-blue-400 font-bold">POST</td>
                        <td className="p-3 text-white">/api/events/simulate</td>
                        <td className="p-3 text-slate-400">Analyst / Admin</td>
                        <td className="p-3 font-sans text-slate-300">Generates synthetic anonymous user sessions and stage transitions</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-yellow-400 font-bold">PUT</td>
                        <td className="p-3 text-white">/api/privacy</td>
                        <td className="p-3 text-amber-400 font-bold">Admin Only</td>
                        <td className="p-3 font-sans text-slate-300">Updates epsilon parameter and active privacy mode</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-emerald-400 font-bold">GET</td>
                        <td className="p-3 text-white">/api/reports/pdf</td>
                        <td className="p-3 text-slate-400">Analyst / Admin</td>
                        <td className="p-3 font-sans text-slate-300">Generates and downloads formal executive PDF analytics summary</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-emerald-400 font-bold">GET</td>
                        <td className="p-3 text-white">/api/reports/csv</td>
                        <td className="p-3 text-slate-400">Analyst / Admin</td>
                        <td className="p-3 font-sans text-slate-300">Exports tabular journey metrics with noise delta calculations</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-blue-400 font-bold">POST</td>
                        <td className="p-3 text-white">/api/feedback</td>
                        <td className="p-3 text-slate-400">Public / All</td>
                        <td className="p-3 font-sans text-slate-300">Records star ratings, category feedback, and review comments in SQLite</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. User Guide Tab */}
            {activeTab === 'guide' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">User & Evaluator Guide</h3>
                <div className="space-y-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex gap-4">
                    <span className="h-7 w-7 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">1</span>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Authenticate with Role-Based Credentials</h4>
                      <p className="text-xs text-slate-400">Login as <strong>Admin</strong> (<code className="text-slate-300">admin@privacyanalytics.dev</code>) for full control including privacy tuning, or <strong>Analyst</strong> (<code className="text-slate-300">analyst@privacyanalytics.dev</code>) for read/evaluation access.</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex gap-4">
                    <span className="h-7 w-7 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">2</span>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Define or Inspect Workflow Stages</h4>
                      <p className="text-xs text-slate-400">Navigate to <strong>Workflows</strong> to customize the sequential steps in your SaaS customer journey (e.g., Product View &rarr; Cart Review &rarr; Payment).</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex gap-4">
                    <span className="h-7 w-7 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">3</span>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Generate Synthetic Anonymous Traffic</h4>
                      <p className="text-xs text-slate-400">Use the <strong>Event Generator</strong> to simulate up to 5,000+ sessions with configurable drop-off rates and consent rates.</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex gap-4">
                    <span className="h-7 w-7 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">4</span>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Evaluate Accuracy & Baseline Tradeoffs</h4>
                      <p className="text-xs text-slate-400">Open <strong>Accuracy Evaluation</strong> and <strong>Comparison</strong> to observe how empirical MAE converges onto theoretical noise limits across &epsilon; &isin; [0.1, 0.5, 1.0].</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex gap-4">
                    <span className="h-7 w-7 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm">5</span>
                    <div>
                      <h4 className="font-bold text-white text-sm mb-1">Export Executive PDF & CSV Reports</h4>
                      <p className="text-xs text-slate-400">Navigate to <strong>Reports</strong> to download executive PDF summaries or export granular CSV data for external analysis.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Testing Report Tab */}
            {activeTab === 'testing' && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">Automated Test Suite Report</h3>
                <div className="bg-emerald-950/40 border border-emerald-800/80 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-emerald-400 text-sm">Test Suite Status: 100% Passing</h4>
                    <p className="text-xs text-slate-300 mt-0.5">20 Automated Unit Tests across 6 Verification Suites (Node.js Native Test Runner).</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-900 text-emerald-300 font-mono text-xs rounded-full font-bold">
                    20 PASS / 0 FAIL
                  </span>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="font-bold text-white mb-1">Suite 1: Laplace Noise Generation (3 tests)</h5>
                    <p className="text-slate-400">Verifies zero-mean convergence (&plusmn;0.15 standard error tolerance), inverse variance scaling (&epsilon;=0.1 dispersion &gt; &epsilon;=1.0), and non-positive sensitivity rejection.</p>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="font-bold text-white mb-1">Suite 2: Privacy Budget Accounting (5 tests)</h5>
                    <p className="text-slate-400">Validates warning thresholds: Normal (&lt;50%), Moderate (50-70%), Low (70-90%), and Critical Exhaustion (&ge;90%).</p>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="font-bold text-white mb-1">Suite 3: Epsilon Parameter Validation (4 tests)</h5>
                    <p className="text-slate-400">Accepts valid positive floats/integers and strictly rejects &epsilon;&le;0, negative values, NaN, and non-finite numbers.</p>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="font-bold text-white mb-1">Suite 4: Edge Cases & Failure Detection (5 tests)</h5>
                    <p className="text-slate-400">Verifies Low Traffic alert (&lt;100 sessions), Low Consent bias alert (&lt;50%), Very Small Epsilon caution (&epsilon;&lt;0.1), and empty cohort arrays.</p>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="font-bold text-white mb-1">Suite 5: Zero-Bound Enforcement (2 tests)</h5>
                    <p className="text-slate-400">Tests 500 random trials with &epsilon;=0.05 and count=0, guaranteeing noisy counts never become negative.</p>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="font-bold text-white mb-1">Suite 6: Multi-Epsilon Evaluation (1 test)</h5>
                    <p className="text-slate-400">Evaluates ground truth across &epsilon; &isin; [0.1, 0.5, 1.0], verifying theoretical vs empirical MAE convergence.</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
