import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/workflows', label: 'Workflows', icon: '🔧' },
  { to: '/events', label: 'Event Generator', icon: '⚡' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/privacy', label: 'Privacy Settings', icon: '🔐' },
  { to: '/simulation', label: 'DP Simulation', icon: '🧮' },
  { to: '/comparison', label: 'Comparison', icon: '⚖️' },
  { to: '/reports', label: 'Reports', icon: '📄' },
  { to: '/feedback', label: 'Feedback', icon: '💬' },
  { to: '/docs', label: 'Documentation', icon: '📚' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useDarkMode();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">🔐</div>
          {sidebarOpen && (
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">PrivacyLens</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Analytics Tool</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          {sidebarOpen && (
            <div className="mb-2 px-2">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={!sidebarOpen ? 'Logout' : undefined}>
            <span>🚪</span>
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 py-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          <div className="flex items-center gap-3">
            <span className="badge badge-green text-xs">🔒 Privacy Mode: Active</span>
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              title="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
