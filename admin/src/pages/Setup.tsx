import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Setup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const check = async () => {
      const { data: exists } = await supabase.rpc('admin_exists');

      if (exists) {
        navigate('/login', { replace: true });
      }
      setChecking(false);
    };
    check();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'setup_admin',
          email: email.trim(),
          password,
          full_name: fullName.trim(),
        },
      });

      if (res.error) throw new Error(res.error.message);

      const data = res.data as Record<string, unknown>;
      if (data.error) throw new Error(data.error as string);

      navigate('/login', { replace: true, state: { message: 'Compte administrateur cree avec succes' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la creation du compte');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-ink-muted">Verification...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><Truck size={32} className="text-brand-700" /></div>
          <h1 className="text-3xl font-extrabold text-brand-700">Flot</h1>
          <p className="text-ink-muted mt-2">Configuration initiale</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <h2 className="text-lg font-bold text-ink">Creer le compte administrateur</h2>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border-l-4 border-red-500">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="input-field"
              placeholder="Jean Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="admin@saveursetvie.fr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="input-field"
              placeholder="Minimum 8 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Creation en cours...' : 'Creer le compte'}
          </button>
        </form>
      </div>
    </div>
  );
}
