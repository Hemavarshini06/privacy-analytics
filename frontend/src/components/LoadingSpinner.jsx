import { ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function LoadingSpinner({ message = 'Loading PrivacyLens...' }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center">
      <div className="relative flex justify-center items-center">
        <div className="absolute animate-ping h-16 w-16 rounded-full bg-primary-500/20"></div>
        <div className="absolute animate-pulse-slow h-20 w-20 rounded-full border border-primary-500/30"></div>
        <ShieldCheckIcon className="h-10 w-10 text-primary-500 relative z-10 animate-bounce" />
      </div>
      <p className="mt-6 text-slate-400 font-medium animate-pulse">{message}</p>
    </div>
  );
}

export function SmallSpinner({ size = 'h-5 w-5', color = 'text-primary-500' }) {
  return (
    <svg className={`animate-spin ${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
