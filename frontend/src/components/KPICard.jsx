import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }) {
  const colorMap = {
    primary: 'text-primary-400 bg-primary-400/10 border-primary-400/20',
    accent: 'text-accent-400 bg-accent-400/10 border-accent-400/20',
    success: 'text-success-400 bg-success-400/10 border-success-400/20',
    warning: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    danger: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  const selectedColor = colorMap[color] || colorMap.primary;

  return (
    <div className="glass-card p-6 flex flex-col group hover:-translate-y-1 transition-transform duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{title}</h3>
        {Icon && (
          <div className={`p-2 rounded-lg border ${selectedColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
        {trend && (
          <span className={`inline-flex items-center text-xs font-medium ${trend === 'up' ? 'text-success-400' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
            {trendValue}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
