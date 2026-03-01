import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import Layout from './components/Layout';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Drivers from './pages/Drivers';
import Alerts from './pages/Alerts';
import Exports from './pages/Exports';
import Settings from './pages/Settings';
import { Truck, ArrowRight } from 'lucide-react';
import './index.css';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}

function LoginPage() {
  const { login, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const stateMessage = (location.state as Record<string, string> | null)?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      // Error shown from store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-700/30">
            <Truck size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Flot</h1>
          <p className="text-ink-muted text-sm mt-1.5">Gestion de flotte Saveurs et Vie</p>
        </div>

        {stateMessage && (
          <div className="bg-brand-700/10 border border-brand-700/20 text-brand-400 text-sm p-3.5 rounded-xl mb-5 text-center font-medium">{stateMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3.5 rounded-xl font-medium">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { clearError(); setEmail(e.target.value); }}
              required
              className="w-full bg-sidebar-hover border border-sidebar-border rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-ink-muted/60 focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 outline-none transition-all"
              placeholder="admin@saveursetvie.fr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { clearError(); setPassword(e.target.value); }}
              required
              className="w-full bg-sidebar-hover border border-sidebar-border rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-ink-muted/60 focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-700 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition-all duration-200 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-brand-700/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Se connecter <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-center text-ink-muted/40 text-xs mt-8">Flot v1.0 — Panel administrateur</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuthStore();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-8 h-8 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" />
    </div>
  );
  if (!session || !profile) return <Navigate to="/login" replace />;
  if (profile.role !== 'admin') return <Navigate to="/login" replace />;

  return <Layout>{children}</Layout>;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
        <Route path="/vehicles/:id" element={<ProtectedRoute><VehicleDetail /></ProtectedRoute>} />
        <Route path="/drivers" element={<ProtectedRoute><Drivers /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/exports" element={<ProtectedRoute><Exports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
