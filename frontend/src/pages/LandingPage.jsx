import { Link } from 'react-router-dom';
import { 
  ShieldCheckIcon, 
  ChartBarIcon, 
  BoltIcon, 
  ScaleIcon, 
  UserGroupIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  const features = [
    { name: 'Differential Privacy Engine', description: 'Add mathematically-proven noise to analytics, ensuring individual user actions cannot be reconstructed.', icon: ShieldCheckIcon },
    { name: 'Multi-Tenant Architecture', description: 'Securely manage multiple organizations or products within a single instance with strong data isolation.', icon: UserGroupIcon },
    { name: 'Workflow Abandonment Detection', description: 'Identify exactly where users drop off in your multi-step processes without tracking their specific journey.', icon: ArrowPathIcon },
    { name: 'Real-Time Analytics', description: 'Watch events flow in real-time and analyze trends without compromising speed or privacy.', icon: BoltIcon },
    { name: 'Privacy Budget Tracking', description: 'Monitor your epsilon spending over time to ensure you never violate your privacy guarantees.', icon: ChartBarIcon },
    { name: 'Baseline vs DP Comparison', description: 'Compare raw aggregated data with differentially private data to understand the exact accuracy trade-offs.', icon: ScaleIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-primary-500 selection:text-white">
      {/* Navbar */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1 items-center">
            <ShieldCheckIcon className="h-8 w-8 text-primary-500 mr-2" />
            <span className="text-xl font-bold text-white tracking-wide">Privacy<span className="text-primary-500">Lens</span></span>
          </div>
          <div className="flex flex-1 justify-end space-x-4">
            <Link to="/login" className="text-sm font-semibold leading-6 text-white hover:text-primary-400 transition-colors px-3 py-2">
              Log in
            </Link>
            <Link to="/register" className="text-sm font-semibold leading-6 text-white bg-primary-600 hover:bg-primary-500 px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary-500/30">
              Get Started Free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <div className="relative isolate pt-14 overflow-hidden">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary-600 to-accent-500 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
          </div>
          
          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <div className="mb-8 flex justify-center">
                  <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-primary-400 ring-1 ring-white/10 hover:ring-white/20 transition-all bg-white/5 backdrop-blur-sm">
                    Announcing PrivacyLens 2.0 with Advanced DP Engine.{' '}
                    <a href="#" className="font-semibold text-white"><span className="absolute inset-0" aria-hidden="true" />Read more <span aria-hidden="true">&rarr;</span></a>
                  </div>
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl animate-slideUp">
                  Privacy-First Analytics for Modern SaaS Teams
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-400 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                  Understand user behavior, identify drop-offs, and optimize your workflows without ever storing personally identifiable information. Powered by Differential Privacy.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                  <Link to="/register" className="rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 transition-all shadow-lg shadow-primary-500/25">
                    Start Building Free
                  </Link>
                  <Link to="/login" className="text-sm font-semibold leading-6 text-white hover:text-slate-300 transition-colors">
                    Sign In <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
            <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary-600 to-success-500 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
          <div className="glass-panel p-8 rounded-2xl grid grid-cols-1 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 shadow-2xl">
            <div className="flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-700/50 pb-8 sm:pb-0">
              <dt className="text-base leading-7 text-slate-400">Events Processed</dt>
              <dd className="text-3xl font-bold tracking-tight text-white mt-2">5M+</dd>
            </div>
            <div className="flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-700/50 pb-8 sm:pb-0">
              <dt className="text-base leading-7 text-slate-400">Error Rate</dt>
              <dd className="text-3xl font-bold tracking-tight text-white mt-2">&lt;5%</dd>
            </div>
            <div className="flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-700/50 pb-8 sm:pb-0">
              <dt className="text-base leading-7 text-slate-400">PII Collected</dt>
              <dd className="text-3xl font-bold tracking-tight text-success-400 mt-2">0%</dd>
            </div>
            <div className="flex flex-col items-center justify-center">
              <dt className="text-base leading-7 text-slate-400">Analytics Views</dt>
              <dd className="text-3xl font-bold tracking-tight text-white mt-2">12+</dd>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-primary-400">Deploy Faster</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything you need for secure analytics</p>
              <p className="mt-6 text-lg leading-8 text-slate-400">
                PrivacyLens combines the power of enterprise analytics with state-of-the-art cryptographic privacy guarantees.
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.name} className="glass-card p-8 group hover:-translate-y-2 transition-transform duration-300">
                    <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
                      <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary-500/10 border border-primary-500/20 group-hover:bg-primary-500/20 transition-colors">
                        <feature.icon className="h-6 w-6 text-primary-400" aria-hidden="true" />
                      </div>
                      {feature.name}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
                      <p className="flex-auto">{feature.description}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-6 w-6 text-slate-500 mr-2" />
            <span className="text-lg font-bold text-slate-500">PrivacyLens</span>
          </div>
          <p className="text-sm text-slate-500 text-center">
            &copy; 2026 PrivacyLens Analytics. All rights reserved. Built with React & Tailwind.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-slate-500 hover:text-white transition-colors">Twitter</a>
            <a href="#" className="text-slate-500 hover:text-white transition-colors">GitHub</a>
            <a href="#" className="text-slate-500 hover:text-white transition-colors">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
