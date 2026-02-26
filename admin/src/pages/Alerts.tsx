import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  ct_expiry: { icon: '📋', label: 'CT à renouveler' },
  maintenance_due: { icon: '🔧', label: 'Entretien prévu' },
  high_consumption: { icon: '⛽', label: 'Consommation élevée' },
  no_fill: { icon: '⛽', label: 'Sans plein' },
  document_expiry: { icon: '📄', label: 'Document expirant' },
  custom_reminder: { icon: '📌', label: 'Rappel' },
  replacement_ending: { icon: '🔄', label: 'Fin de remplacement' },
  monthly_report: { icon: '📊', label: 'Rapport mensuel' },
  incident: { icon: '🚨', label: 'Incident signalé' },
};

interface AlertRow {
  id: string;
  type: string;
  message: string;
  triggered_at: string;
  acknowledged: boolean;
  vehicle: { plate: string } | null;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterAck, setFilterAck] = useState<'all' | 'pending' | 'acknowledged'>('pending');

  const fetchAlerts = async () => {
    let query = supabase
      .from('alerts')
      .select('id, type, message, triggered_at, acknowledged, vehicle:vehicles!vehicle_id(plate)')
      .order('triggered_at', { ascending: false })
      .limit(100);

    if (filterType) query = query.eq('type', filterType);
    if (filterAck === 'pending') query = query.eq('acknowledged', false);
    if (filterAck === 'acknowledged') query = query.eq('acknowledged', true);

    const { data } = await query;
    setAlerts((data as unknown as AlertRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, [filterType, filterAck]);

  const acknowledge = async (id: string) => {
    await supabase.from('alerts').update({ acknowledged: true }).eq('id', id);
    fetchAlerts();
  };

  const bulkAcknowledge = async () => {
    const pendingIds = alerts.filter((a) => !a.acknowledged).map((a) => a.id);
    if (pendingIds.length === 0) return;
    await supabase.from('alerts').update({ acknowledged: true }).in('id', pendingIds);
    fetchAlerts();
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800">Alertes</h1>
        <button onClick={bulkAcknowledge} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
          Tout acquitter
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <select value={filterAck} onChange={(e) => setFilterAck(e.target.value as 'all' | 'pending' | 'acknowledged')} className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Toutes</option>
          <option value="pending">Non traitées</option>
          <option value="acknowledged">Traitées</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Aucune alerte</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const typeInfo = TYPE_LABELS[a.type] ?? { icon: '⚠️', label: a.type };
            return (
              <div key={a.id} className={`bg-white border rounded-lg p-4 flex items-start gap-3 ${a.acknowledged ? 'border-gray-200 opacity-60' : 'border-orange-300'}`}>
                <span className="text-xl">{typeInfo.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium">{typeInfo.label}</span>
                    <span className="text-xs text-gray-400">{(a.vehicle as unknown as { plate: string })?.plate ?? ''}</span>
                  </div>
                  <p className="text-sm text-gray-700">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(a.triggered_at).toLocaleString('fr-FR')}</p>
                </div>
                {!a.acknowledged && (
                  <button onClick={() => acknowledge(a.id)} className="text-xs px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800 whitespace-nowrap">
                    Acquitter
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
