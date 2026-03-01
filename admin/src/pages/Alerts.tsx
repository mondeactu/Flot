import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, CheckCircle, Filter, FileText, Wrench, Fuel, Clock, AlertTriangle, RefreshCw, BarChart3, Shield } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  ct_expiry: { icon: <FileText size={14} />, label: 'CT', color: 'bg-blue-50 text-blue-600' },
  maintenance_due: { icon: <Wrench size={14} />, label: 'Entretien', color: 'bg-amber-50 text-amber-600' },
  high_consumption: { icon: <Fuel size={14} />, label: 'Conso elevee', color: 'bg-red-50 text-red-600' },
  no_fill: { icon: <Fuel size={14} />, label: 'Sans plein', color: 'bg-yellow-50 text-yellow-700' },
  document_expiry: { icon: <FileText size={14} />, label: 'Document', color: 'bg-purple-50 text-purple-600' },
  custom_reminder: { icon: <Clock size={14} />, label: 'Rappel', color: 'bg-surface text-ink-secondary' },
  replacement_ending: { icon: <RefreshCw size={14} />, label: 'Remplacement', color: 'bg-teal-50 text-teal-600' },
  monthly_report: { icon: <BarChart3 size={14} />, label: 'Rapport', color: 'bg-indigo-50 text-indigo-600' },
  incident: { icon: <AlertTriangle size={14} />, label: 'Incident', color: 'bg-red-50 text-red-600' },
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
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Bell size={20} className="text-amber-600" />
          </div>
          <h1 className="page-title text-xl">Alertes</h1>
        </div>
        <button onClick={bulkAcknowledge} className="btn-primary">
          <CheckCircle size={16} /> Tout acquitter
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="pl-10 pr-8 py-2.5 border border-border-input rounded-xl text-sm bg-white text-ink focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none appearance-none cursor-pointer">
            <option value="">Tous les types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <select value={filterAck} onChange={(e) => setFilterAck(e.target.value as any)} className="px-4 py-2.5 border border-border-input rounded-xl text-sm bg-white text-ink focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 outline-none cursor-pointer">
          <option value="all">Toutes</option>
          <option value="pending">Non traitees</option>
          <option value="acknowledged">Traitees</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-ink-faint" />
          </div>
          <p className="text-ink-muted font-medium">Aucune alerte</p>
          <p className="text-ink-faint text-sm mt-1">Tout est en ordre</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const cfg = TYPE_CONFIG[a.type] ?? { icon: <AlertTriangle size={14} />, label: a.type, color: 'bg-surface text-ink-secondary' };
            return (
              <div key={a.id} className={`card p-4 flex items-start gap-3.5 transition-all ${a.acknowledged ? 'opacity-50' : ''}`}>
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge text-[10px] ${cfg.color}`}>{cfg.label}</span>
                    {(a.vehicle as any)?.plate && (
                      <span className="text-[11px] text-ink-muted font-medium">{(a.vehicle as any).plate}</span>
                    )}
                  </div>
                  <p className="text-sm text-ink leading-snug">{a.message}</p>
                  <p className="text-[11px] text-ink-muted mt-1.5">{new Date(a.triggered_at).toLocaleString('fr-FR')}</p>
                </div>
                {!a.acknowledged && (
                  <button onClick={() => acknowledge(a.id)} className="flex-shrink-0 btn-primary text-xs py-1.5 px-3">
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
