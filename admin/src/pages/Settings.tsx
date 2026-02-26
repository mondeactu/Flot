import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';

interface AlertSettings {
  id: string;
  alert_inspection_days_before: number;
  alert_maintenance_days_before: number;
  alert_maintenance_km_before: number;
  fuel_alert_threshold_l100: number;
  no_fill_alert_days: number;
}

interface DriverRow { id: string; full_name: string; phone: string | null; }

export default function Settings() {
  const { session } = useAuthStore();
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [driverForm, setDriverForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [addingDriver, setAddingDriver] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [sRes, dRes] = await Promise.all([
        supabase.from('alert_settings').select('id, alert_inspection_days_before, alert_maintenance_days_before, alert_maintenance_km_before, fuel_alert_threshold_l100, no_fill_alert_days').limit(1).single(),
        supabase.from('profiles').select('id, full_name, phone').eq('role', 'driver').order('full_name'),
      ]);
      setSettings(sRes.data as AlertSettings | null);
      setDrivers(dRes.data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase.from('alert_settings').update({
        alert_inspection_days_before: settings.alert_inspection_days_before,
        alert_maintenance_days_before: settings.alert_maintenance_days_before,
        alert_maintenance_km_before: settings.alert_maintenance_km_before,
        fuel_alert_threshold_l100: settings.fuel_alert_threshold_l100,
        no_fill_alert_days: settings.no_fill_alert_days,
      }).eq('id', settings.id);
      if (error) throw error;
      setMessage('✅ Paramètres sauvegardés');
    } catch { setMessage('❌ Erreur'); }
    finally { setSaving(false); }
  };

  const applyToAll = async () => {
    setApplying(true);
    setMessage('');
    try {
      const token = session?.access_token;
      const res = await supabase.functions.invoke('admin-actions', {
        body: { action: 'apply_global_settings' },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.error) throw res.error;
      setMessage('✅ Seuils appliqués à tous les véhicules');
    } catch { setMessage('❌ Erreur'); }
    finally { setApplying(false); }
  };

  const addDriver = async () => {
    if (!driverForm.full_name || !driverForm.email || !driverForm.password) return;
    setAddingDriver(true);
    try {
      const token = session?.access_token;
      const res = await supabase.functions.invoke('admin-actions', {
        body: { action: 'create_driver', ...driverForm },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.error) throw res.error;
      const data = res.data as Record<string, unknown>;
      if (data.error) throw new Error(data.error as string);
      setDriverForm({ full_name: '', email: '', password: '', phone: '' });
      setShowAddDriver(false);
      const { data: dRes } = await supabase.from('profiles').select('id, full_name, phone').eq('role', 'driver').order('full_name');
      setDrivers(dRes ?? []);
      setMessage('✅ Conducteur créé');
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : 'Erreur'}`);
    } finally { setAddingDriver(false); }
  };

  const deleteDriver = async (driverId: string) => {
    if (!window.confirm('Supprimer ce conducteur ?')) return;
    try {
      const token = session?.access_token;
      await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_driver', driver_id: driverId },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setDrivers((prev) => prev.filter((d) => d.id !== driverId));
    } catch { setMessage('❌ Erreur suppression'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Chargement...</p></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-3xl">
      <h1 className="text-2xl font-extrabold text-gray-800">Paramètres</h1>
      {message && <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}

      {/* Drivers management */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Gestion des conducteurs</h3>
          <button onClick={() => setShowAddDriver(!showAddDriver)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800">
            {showAddDriver ? 'Annuler' : '+ Ajouter'}
          </button>
        </div>

        {showAddDriver && (
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Nom complet *" value={driverForm.full_name} onChange={(e) => setDriverForm({ ...driverForm, full_name: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Email *" type="email" value={driverForm.email} onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Mot de passe *" type="password" value={driverForm.password} onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Téléphone" value={driverForm.phone} onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <button onClick={addDriver} disabled={addingDriver} className="md:col-span-2 px-4 py-2 bg-green-700 text-white rounded text-sm disabled:opacity-50">
              {addingDriver ? 'Création...' : 'Créer le conducteur'}
            </button>
          </div>
        )}

        {drivers.map((d) => (
          <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">{d.full_name}</p>
              <p className="text-xs text-gray-500">{d.phone ?? '—'}</p>
            </div>
            <button onClick={() => deleteDriver(d.id)} className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">
              Supprimer
            </button>
          </div>
        ))}
      </div>

      {/* Alert settings */}
      {settings && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">⚠️ Seuils d'alerte globaux</h3>

          {[
            { label: 'CT : alerter J-X avant expiration (jours)', key: 'alert_inspection_days_before' as const },
            { label: 'Entretien : alerter J-X avant date (jours)', key: 'alert_maintenance_days_before' as const },
            { label: 'Entretien : alerter KM-X avant kilométrage', key: 'alert_maintenance_km_before' as const },
            { label: 'Consommation : alerter si > X L/100km', key: 'fuel_alert_threshold_l100' as const },
            { label: 'Sans plein : alerter après X jours', key: 'no_fill_alert_days' as const },
          ].map((item) => (
            <div key={item.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{item.label}</label>
              <input
                type="number"
                step={item.key === 'fuel_alert_threshold_l100' ? '0.1' : '1'}
                value={settings[item.key]}
                onChange={(e) => setSettings({ ...settings, [item.key]: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded-lg px-3 py-2 text-sm max-w-xs"
              />
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={saveSettings} disabled={saving} className="px-6 py-2 bg-green-700 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? '...' : 'Sauvegarder'}
            </button>
            <button onClick={applyToAll} disabled={applying} className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm disabled:opacity-50">
              {applying ? '...' : 'Appliquer à tous les véhicules'}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">Flot v1.0.0</p>
    </div>
  );
}
