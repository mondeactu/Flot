import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';
import { getStorageStats, exportPhotosAndCleanup, type StorageStats } from '../lib/storage';

interface AlertSettings {
  id: string;
  alert_inspection_days_before: number;
  alert_maintenance_days_before: number;
  alert_maintenance_km_before: number;
  fuel_alert_threshold_l100: number;
  no_fill_alert_days: number;
}

export default function Settings() {
  const { session } = useAuthStore();
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const sRes = await supabase.from('alert_settings').select('id, alert_inspection_days_before, alert_maintenance_days_before, alert_maintenance_km_before, fuel_alert_threshold_l100, no_fill_alert_days').limit(1).single();
      setSettings(sRes.data as AlertSettings | null);
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

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Chargement...</p></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-3xl">
      <h1 className="text-2xl font-extrabold text-gray-800">Paramètres</h1>
      {message && <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}

      {/* Alert settings */}
      {settings && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-800">Seuils d'alerte globaux</h3>

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

      {/* Storage management */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Stockage Supabase</h3>
          <button
            onClick={async () => {
              setStorageLoading(true);
              try { setStorageStats(await getStorageStats()); }
              catch { setMessage('❌ Erreur chargement stockage'); }
              finally { setStorageLoading(false); }
            }}
            disabled={storageLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            {storageLoading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>

        {storageStats ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Utilisation totale</span>
                <span className={`font-bold ${storageStats.overThreshold ? 'text-orange-600' : 'text-green-600'}`}>
                  {storageStats.totalMB} MB / 500 MB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    storageStats.overThreshold ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((storageStats.totalMB / 500) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {storageStats.buckets.map((b) => (
                <div key={b.name} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 capitalize">{b.name}</p>
                  <p className="text-sm font-bold text-gray-800">{b.sizeMB} MB</p>
                  <p className="text-xs text-gray-400">{b.fileCount} fichiers</p>
                </div>
              ))}
            </div>

            {exporting && (
              <p className="text-sm text-orange-600 font-medium">{exportProgress}</p>
            )}

            <button
              onClick={async () => {
                if (!window.confirm(
                  'Exporter toutes les photos en ZIP puis les supprimer du stockage ?\n\n' +
                  'Organisation : Plaque / Carburant | Nettoyage | Incident\n' +
                  'Cette action est irreversible.'
                )) return;
                setExporting(true);
                setExportProgress('Demarrage...');
                try {
                  const blob = await exportPhotosAndCleanup((msg) => setExportProgress(msg));
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `flot-photos-${new Date().toISOString().slice(0, 10)}.zip`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setStorageStats(await getStorageStats());
                  setMessage('✅ Export termine, stockage nettoye');
                } catch {
                  setMessage('❌ Erreur export');
                } finally {
                  setExporting(false);
                  setExportProgress('');
                }
              }}
              disabled={exporting}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {exporting ? 'Export en cours...' : 'Exporter ZIP + nettoyer le stockage'}
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-500">Cliquez sur "Actualiser" pour voir l'utilisation du stockage.</p>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">Flot v1.0.0</p>
    </div>
  );
}
