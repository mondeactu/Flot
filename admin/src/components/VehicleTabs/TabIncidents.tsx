import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PhotoViewer from '../PhotoViewer';
import { Check, Pencil, Euro, Calendar, Wrench, Zap, Search, FileText, Circle, StickyNote, HelpCircle } from 'lucide-react';

const TYPE_LABELS: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  panne: { icon: <Wrench size={12} />, label: 'Panne', color: 'bg-orange-50 text-orange-700' },
  accident: { icon: <Zap size={12} />, label: 'Accident', color: 'bg-red-50 text-red-600' },
  degat: { icon: <Search size={12} />, label: 'Degat', color: 'bg-amber-50 text-amber-700' },
  amende: { icon: <FileText size={12} />, label: 'Amende', color: 'bg-purple-50 text-purple-700' },
  pneu: { icon: <Circle size={12} />, label: 'Pneu', color: 'bg-surface text-ink-secondary' },
  autre: { icon: <StickyNote size={12} />, label: 'Autre', color: 'bg-blue-50 text-blue-700' },
};

interface Incident {
  id: string;
  type: string;
  description: string;
  amount: number | null;
  incident_date: string;
  photo_url: string | null;
  paid: boolean;
  paid_at: string | null;
  acknowledged: boolean;
  notes: string | null;
  driver: { full_name: string } | null;
}

export default function TabIncidents({ vehicleId }: { vehicleId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const fetchData = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('id, type, description, amount, incident_date, photo_url, paid, paid_at, acknowledged, notes, driver:profiles!driver_id(full_name)')
      .eq('vehicle_id', vehicleId)
      .order('incident_date', { ascending: false });
    setIncidents((data as unknown as Incident[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('flot:data-updated', handler);
    return () => window.removeEventListener('flot:data-updated', handler);
  }, [vehicleId]);

  const toggleAcknowledged = async (id: string, current: boolean) => {
    await supabase.from('incidents').update({ acknowledged: !current }).eq('id', id);
    fetchData();
  };

  const togglePaid = async (id: string, current: boolean) => {
    await supabase.from('incidents').update({
      paid: !current,
      paid_at: !current ? new Date().toISOString() : null,
    }).eq('id', id);
    fetchData();
  };

  const startEdit = (inc: Incident) => {
    setEditingId(inc.id);
    setEditAmount(inc.amount ? String(inc.amount) : '');
    setEditNotes(inc.notes ?? '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const amt = editAmount ? parseFloat(editAmount.replace(',', '.')) : null;
    await supabase.from('incidents').update({ amount: amt, notes: editNotes || null }).eq('id', editingId);
    setEditingId(null);
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-700" /></div>;
  if (incidents.length === 0) return <p className="text-ink-faint text-center py-8">Aucun incident signale</p>;

  const totalCost = incidents.reduce((s, i) => s + Number(i.amount ?? 0), 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {totalCost > 0 && (
        <div className="flex items-center gap-3 bg-red-50 rounded-lg px-4 py-3">
          <Euro size={16} className="text-red-600" />
          <span className="text-sm font-semibold text-red-700">
            Cout total : {totalCost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      )}

      {incidents.map((inc) => {
        const typeInfo = TYPE_LABELS[inc.type] ?? { icon: <HelpCircle size={12} />, label: inc.type, color: 'bg-surface text-ink-secondary' };
        const isEditing = editingId === inc.id;

        return (
          <div key={inc.id} className={`rounded-xl border p-4 transition-all ${inc.acknowledged ? 'bg-surface border-border opacity-75' : 'bg-surface-card border-border shadow-card'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${typeInfo.color}`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
                {inc.paid && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">
                    <Check size={10} /> Paye
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Calendar size={12} />
                {new Date(inc.incident_date).toLocaleDateString('fr-FR')}
              </div>
            </div>

            <p className="text-sm text-ink mb-2">{inc.description}</p>

            <div className="flex items-center gap-4 text-xs text-ink-muted mb-3">
              <span>{(inc.driver as unknown as { full_name: string })?.full_name ?? '---'}</span>
              {!isEditing && inc.amount != null && <span className="font-bold text-red-600 text-sm">{Number(inc.amount).toFixed(2)} EUR</span>}
              {!isEditing && !inc.amount && <span className="text-ink-faint italic">Pas de montant</span>}
            </div>

            {!isEditing && inc.notes && (
              <p className="text-xs text-ink-muted italic mb-3 bg-surface rounded px-3 py-2">{inc.notes}</p>
            )}

            {isEditing && (
              <div className="bg-surface rounded-lg p-3 mb-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Cout reparation (EUR)</label>
                  <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00" className="input-field w-full max-w-[200px]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Notes</label>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="input-field w-full resize-none" />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="btn-primary text-xs px-3 py-1.5">Enregistrer</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">Annuler</button>
                </div>
              </div>
            )}

            {inc.photo_url && <div className="mb-3"><PhotoViewer bucket="incidents" path={inc.photo_url} alt="Photo incident" /></div>}

            <div className="flex items-center gap-2 pt-2 border-t border-border-light">
              <button onClick={() => toggleAcknowledged(inc.id, inc.acknowledged)} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${inc.acknowledged ? 'btn-secondary' : 'btn-primary'}`}>
                {inc.acknowledged ? 'Traite' : 'Marquer traite'}
              </button>
              <button onClick={() => togglePaid(inc.id, inc.paid)} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${inc.paid ? 'bg-brand-50 text-brand-700' : 'bg-orange-50 text-orange-700'}`}>
                {inc.paid ? 'Paye' : 'Marquer paye'}
              </button>
              {!isEditing && (
                <button onClick={() => startEdit(inc)} className="text-xs px-3 py-1.5 rounded-lg font-medium text-ink-muted bg-surface hover:bg-border-light flex items-center gap-1">
                  <Pencil size={11} /> Modifier
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
