import React, { useEffect, useState } from 'react';
import { getStorageStats, exportPhotosAndCleanup, type StorageStats } from '../lib/storage';

export default function StorageBanner() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getStorageStats().then(setStats).catch(console.error);
    // Refresh every 30 minutes
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
      // Download the ZIP
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flot-photos-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // Refresh stats
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
    <div className="bg-orange-50 border border-orange-300 rounded-lg px-4 py-3 mx-4 mt-3 md:mx-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-orange-800">
            Stockage presque plein : {stats.totalMB} MB / 500 MB
          </p>
          <p className="text-xs text-orange-700 mt-1">
            {stats.buckets.map((b) => `${b.name}: ${b.sizeMB} MB (${b.fileCount} fichiers)`).join(' · ')}
          </p>
          {exporting && (
            <p className="text-xs text-orange-600 mt-1 font-medium">{progress}</p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 disabled:opacity-50"
            >
              {exporting ? 'Export en cours...' : 'Exporter ZIP + nettoyer'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 text-orange-700 text-xs font-medium rounded border border-orange-300 hover:bg-orange-100"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
