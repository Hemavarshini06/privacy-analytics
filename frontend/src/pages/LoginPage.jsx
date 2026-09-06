import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheckIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { SmallSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-900 selection:bg-primary-500 selection:text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-600/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent-600/10 blur-[120px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <Link to="/">
            <ShieldCheckIcon className="h-12 w-12 text-primary-500 hover:text-primary-400 transition-colors" />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or{' '}
          <Link to="/register" className="font-medium text-primary-400 hover:text-primary-300 transition-colors">
            create a new tenant workspace
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="glass-panel py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-white/10 animate-slideUp">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-300">
                Email address
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 py-2.5 pl-10 bg-slate-900/50 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 transition-all"
                  placeholder="alice@techflow.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-300">
                Password
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-0 py-2.5 pl-10 pr-10 bg-slate-900/50 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 transition-all"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900/50 text-primary-600 focus:ring-primary-600 focus:ring-offset-slate-900"
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm leading-6 text-slate-400">
                  Remember me
                </label>
              </div>

              <div className="text-sm leading-6">
                <a href="#" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-primary-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? <SmallSpinner className="mr-2" /> : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-700/50 pt-6">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center">
              <ShieldCheckIcon className="h-4 w-4 text-blue-400 mr-1.5" />
              Quick Fill Demo Credentials
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@privacyanalytics.dev');
                  setPassword('admin123');
                  toast.success('Filled Admin credentials');
                }}
                className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 flex items-center justify-between">
                  <span>Admin Login</span>
                  <span className="text-[10px] bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-300">Click</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">admin@privacyanalytics.dev</div>
                <div className="text-[10px] text-slate-500">pass: admin123</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('analyst@privacyanalytics.dev');
                  setPassword('analyst123');
                  toast.success('Filled Analyst credentials');
                }}
                className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-green-400 group-hover:text-green-300 flex items-center justify-between">
                  <span>Analyst Login</span>
                  <span className="text-[10px] bg-green-900/50 px-1.5 py-0.5 rounded text-green-300">Click</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">analyst@privacyanalytics.dev</div>
                <div className="text-[10px] text-slate-500">pass: analyst123</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
