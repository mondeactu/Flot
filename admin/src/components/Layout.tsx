import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { path: '/', label: 'Tableau de bord', icon: '🏠' },
  { path: '/vehicles', label: 'Véhicules', icon: '🚗' },
  { path: '/drivers', label: 'Conducteurs', icon: '👤' },
  { path: '/alerts', label: 'Alertes', icon: '🔔' },
  { path: '/exports', label: 'Exports', icon: '📊' },
  { path: '/settings', label: 'Paramètres', icon: '⚙️' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-extrabold text-green-700">🚛 Flot</h1>
          <p className="text-sm text-gray-500 mt-1">{profile?.full_name ?? 'Admin'}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:px-6">
          <h2 className="text-lg font-bold text-gray-800 md:hidden">🚛 Flot</h2>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>

      {/* Bottom tab bar — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center text-xs ${
              location.pathname === item.path ? 'text-green-700' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="mt-0.5">{item.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
