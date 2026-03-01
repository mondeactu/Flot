import React, { useEffect, useState } from 'react';
import { AlertTriangle, Download, X } from 'lucide-react';
import { getStorageStats, exportPhotosAndCleanup, type StorageStats } from '../lib/storage';

export default function StorageBanner() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getStorageStats().then(setStats).catch(console.error);
    const interval = setInterval(() => {
      getStorageStats().then(setStats).catch(console.error);
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = async () => {
    if (!window.confirm(
      'Exporter toutes les photos en ZIP puis les supprimer de Supabase ?\n\n' +
      'Les photos seront organisees par plaque > type.\n' +
      'Cette action est irreversible.'
    )) return;

    setExporting(true);
    setProgress('Demarrage...');
    try {
      const blob = await exportPhotosAndCleanup((msg) => setProgress(msg));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flot-photos-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const newStats = await getStorageStats();
      setStats(newStats);
      setProgress('');
    } catch (err) {
      console.error('Export error:', err);
      setProgress('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (!stats || !stats.overThreshold || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 md:px-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            Stockage presque plein : {stats.totalMB} MB / 500 MB
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            {stats.buckets.map((b) => `${b.name}: ${b.sizeMB} MB`).join(' · ')}
          </p>
          {exporting && <p className="text-xs text-amber-600 mt-1 font-medium">{progress}</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors">
              <Download size={12} />
              {exporting ? 'Export...' : 'Exporter ZIP + nettoyer'}
            </button>
            <button onClick={() => setDismissed(true)} className="px-3 py-1.5 text-amber-700 text-xs font-medium rounded-lg border border-amber-300 hover:bg-amber-100 transition-colors">
              Plus tard
            </button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="flex-shrink-0 p-1 hover:bg-amber-100 rounded-lg transition-colors">
          <X size={14} className="text-amber-500" />
        </button>
      </div>
    </div>
  );
}
