import { useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function WarningBanner({ type = 'warning', message, details }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const config = {
    warning: {
      icon: ExclamationTriangleIcon,
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      text: 'text-yellow-200',
      iconColor: 'text-yellow-500',
    },
    error: {
      icon: XCircleIcon,
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-200',
      iconColor: 'text-red-500',
    },
    info: {
      icon: InformationCircleIcon,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-200',
      iconColor: 'text-blue-500',
    }
  };

  const style = config[type] || config.warning;
  const Icon = style.icon;

  return (
    <div className={`rounded-lg border p-4 ${style.bg} ${style.border}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${style.iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <p className={`text-sm font-medium ${style.text}`}>{message}</p>
            {details && <p className={`mt-1 text-xs ${style.text} opacity-80`}>{details}</p>}
          </div>
          <p className="mt-3 text-sm md:ml-6 md:mt-0">
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className={`whitespace-nowrap font-medium ${style.text} hover:opacity-75 transition-opacity`}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
