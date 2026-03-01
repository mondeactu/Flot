import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import NotificationBell from './NotificationBell';
import RealtimeNotifications from './RealtimeNotifications';
import ToastContainer from './Toast';
import PWAInstallPrompt from './PWAInstallPrompt';
import StorageBanner from './StorageBanner';
import {
  LayoutDashboard,
  Truck,
  Users,
  Bell,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: '/vehicles', label: 'Vehicules', icon: Truck },
  { path: '/drivers', label: 'Conducteurs', icon: Users },
  { path: '/alerts', label: 'Alertes', icon: Bell },
  { path: '/exports', label: 'Exports', icon: FileSpreadsheet },
  { path: '/settings', label: 'Parametres', icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col md:w-[240px] bg-sidebar min-h-screen sticky top-0 h-screen">
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center">
              <Truck size={18} className="text-white" />
            </div>
            <div>
              <span className="text-[15px] font-bold text-white tracking-tight">Flot</span>
              <p className="text-[11px] text-ink-muted mt-0.5">{profile?.full_name ?? 'Admin'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sidebar-active text-white'
                    : 'text-ink-muted hover:bg-sidebar-hover hover:text-white'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-ink-muted hover:text-red-400 hover:bg-sidebar-hover rounded-xl transition-all duration-200"
          >
            <LogOut size={18} strokeWidth={1.6} />
            Deconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-border-light px-4 py-3 flex items-center justify-between md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 hover:bg-surface rounded-xl transition-colors">
              <Menu size={20} className="text-ink-secondary" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-brand-700 rounded-lg flex items-center justify-center">
                <Truck size={14} className="text-white" />
              </div>
              <span className="font-bold text-ink text-[15px]">Flot</span>
            </div>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <StorageBanner />
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>

      {/* Realtime + Toast + PWA */}
      <RealtimeNotifications />
      <ToastContainer />
      <PWAInstallPrompt />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-sidebar shadow-elevated flex flex-col animate-slide-in">
            <div className="px-5 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center">
                  <Truck size={18} className="text-white" />
                </div>
                <span className="text-[15px] font-bold text-white">Flot</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 hover:bg-sidebar-hover rounded-lg transition-colors">
                <X size={18} className="text-ink-muted" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-2 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      active ? 'bg-sidebar-active text-white' : 'text-ink-muted hover:bg-sidebar-hover hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4 border-t border-sidebar-border">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-ink-muted hover:text-red-400 rounded-xl transition-colors">
                <LogOut size={18} />
                Deconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
