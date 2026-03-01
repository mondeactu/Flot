import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';
import { getStorageStats, exportPhotosAndCleanup, type StorageStats } from '../lib/storage';
import { Settings2, Database, RefreshCw, Download, Save, Zap } from 'lucide-react';

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
      setMessage('success:Parametres sauvegardes');
    } catch { setMessage('error:Erreur de sauvegarde'); }
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
      setMessage('success:Seuils appliques a tous les vehicules');
    } catch { setMessage('error:Erreur'); }
    finally { setApplying(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center border border-border-light">
          <Settings2 size={20} className="text-ink-secondary" />
        </div>
        <h1 className="page-title text-xl">Parametres</h1>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-xl font-medium animate-fade-in ${message.startsWith('success:') ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.replace(/^(success:|error:)/, '')}
        </div>
      )}

      {/* Alert settings */}
      {settings && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2.5">
            <Zap size={18} className="text-amber-500" />
            <h3 className="text-base font-bold text-ink">Seuils d'alerte globaux</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: 'CT : alerter J-X avant expiration (jours)', key: 'alert_inspection_days_before' as const },
              { label: 'Entretien : alerter J-X avant date (jours)', key: 'alert_maintenance_days_before' as const },
              { label: 'Entretien : alerter KM-X avant kilometrage', key: 'alert_maintenance_km_before' as const },
              { label: 'Consommation : alerter si > X L/100km', key: 'fuel_alert_threshold_l100' as const },
              { label: 'Sans plein : alerter apres X jours', key: 'no_fill_alert_days' as const },
            ].map((item) => (
              <div key={item.key} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <label className="text-sm text-ink-secondary flex-1">{item.label}</label>
                <input
                  type="number"
                  step={item.key === 'fuel_alert_threshold_l100' ? '0.1' : '1'}
                  value={settings[item.key]}
                  onChange={(e) => setSettings({ ...settings, [item.key]: parseFloat(e.target.value) || 0 })}
                  className="input-field w-full md:w-32 text-center font-semibold"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={saveSettings} disabled={saving} className="btn-primary">
              <Save size={16} />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={applyToAll} disabled={applying} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 transition-all duration-200">
              <Zap size={16} />
              {applying ? 'Application...' : 'Appliquer a tous'}
            </button>
          </div>
        </div>
      )}

      {/* Storage management */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database size={18} className="text-indigo-500" />
            <h3 className="text-base font-bold text-ink">Stockage Supabase</h3>
          </div>
          <button
            onClick={async () => {
              setStorageLoading(true);
              try { setStorageStats(await getStorageStats()); }
              catch { setMessage('error:Erreur chargement stockage'); }
              finally { setStorageLoading(false); }
            }}
            disabled={storageLoading}
            className="btn-secondary text-xs py-2 px-3"
          >
            <RefreshCw size={14} className={storageLoading ? 'animate-spin' : ''} />
            {storageLoading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>

        {storageStats ? (
          <>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-secondary">Utilisation totale</span>
                <span className={`font-bold ${storageStats.overThreshold ? 'text-amber-600' : 'text-brand-700'}`}>
                  {storageStats.totalMB} MB / 500 MB
                </span>
              </div>
              <div className="w-full bg-surface rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    storageStats.overThreshold ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${Math.min((storageStats.totalMB / 500) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {storageStats.buckets.map((b) => (
                <div key={b.name} className="bg-surface rounded-xl p-3.5 text-center">
                  <p className="text-[11px] text-ink-muted font-medium uppercase tracking-wide">{b.name}</p>
                  <p className="text-lg font-bold text-ink mt-1">{b.sizeMB} <span className="text-xs font-normal text-ink-muted">MB</span></p>
                  <p className="text-[11px] text-ink-muted">{b.fileCount} fichiers</p>
                </div>
              ))}
            </div>

            {exporting && (
              <p className="text-sm text-amber-600 font-medium">{exportProgress}</p>
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
                  setMessage('success:Export termine, stockage nettoye');
                } catch {
                  setMessage('error:Erreur export');
                } finally {
                  setExporting(false);
                  setExportProgress('');
                }
              }}
              disabled={exporting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
            >
              <Download size={16} />
              {exporting ? 'Export en cours...' : 'Exporter ZIP + nettoyer le stockage'}
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <Database size={32} className="mx-auto text-ink-faint mb-2" />
            <p className="text-sm text-ink-muted">Cliquez sur "Actualiser" pour voir l'utilisation du stockage.</p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-ink-faint text-center py-2">Flot v1.0</p>
    </div>
  );
}
