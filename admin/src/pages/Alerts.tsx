import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, CheckCircle, Filter, FileText, Wrench, Fuel, Clock, AlertTriangle, RefreshCw, BarChart3, Shield } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  ct_expiry: { icon: <FileText size={14} />, label: 'CT', color: 'bg-blue-50 text-blue-700' },
  maintenance_due: { icon: <Wrench size={14} />, label: 'Entretien', color: 'bg-orange-50 text-orange-700' },
  high_consumption: { icon: <Fuel size={14} />, label: 'Conso elevee', color: 'bg-red-50 text-red-700' },
  no_fill: { icon: <Fuel size={14} />, label: 'Sans plein', color: 'bg-yellow-50 text-yellow-700' },
  document_expiry: { icon: <FileText size={14} />, label: 'Document', color: 'bg-purple-50 text-purple-700' },
  custom_reminder: { icon: <Clock size={14} />, label: 'Rappel', color: 'bg-gray-100 text-gray-700' },
  replacement_ending: { icon: <RefreshCw size={14} />, label: 'Remplacement', color: 'bg-teal-50 text-teal-700' },
  monthly_report: { icon: <BarChart3 size={14} />, label: 'Rapport', color: 'bg-indigo-50 text-indigo-700' },
  incident: { icon: <AlertTriangle size={14} />, label: 'Incident', color: 'bg-red-50 text-red-700' },
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
    const ids = alerts.filter((a) => !a.acknowledged).map((a) => a.id);
    if (!ids.length) return;
    await supabase.from('alerts').update({ acknowledged: true }).in('id', ids);
    fetchAlerts();
  };

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Bell size={20} className="text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Alertes</h1>
        </div>
        <button onClick={bulkAcknowledge} className="flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 shadow-sm">
          <CheckCircle size={16} /> Tout acquitter
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none appearance-none">
            <option value="">Tous les types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <select value={filterAck} onChange={(e) => setFilterAck(e.target.value as any)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 outline-none">
          <option value="all">Toutes</option>
          <option value="pending">Non traitees</option>
          <option value="acknowledged">Traitees</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20">
          <Shield size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">Aucune alerte</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const cfg = TYPE_CONFIG[a.type] ?? { icon: <AlertTriangle size={14} />, label: a.type, color: 'bg-gray-100 text-gray-700' };
            return (
              <div key={a.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all ${a.acknowledged ? 'border-gray-100 opacity-60' : 'border-gray-200 shadow-sm'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cfg.color}`}>{cfg.label}</span>
                    {(a.vehicle as any)?.plate && (
                      <span className="text-xs text-gray-400 font-medium">{(a.vehicle as any).plate}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(a.triggered_at).toLocaleString('fr-FR')}</p>
                </div>
                {!a.acknowledged && (
                  <button onClick={() => acknowledge(a.id)} className="flex-shrink-0 text-xs px-3 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium">
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
