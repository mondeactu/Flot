import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface RecurringCost { id: string; label: string; amount: number; frequency: string; start_date: string; end_date: string | null; active: boolean; }
interface ExtraCost { id: string; label: string; amount: number; cost_date: string; notes: string | null; }

export default function TabCosts({ vehicleId }: { vehicleId: string }) {
  const [recurring, setRecurring] = useState<RecurringCost[]>([]);
  const [extras, setExtras] = useState<ExtraCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecForm, setShowRecForm] = useState(false);
  const [showExtForm, setShowExtForm] = useState(false);
  const [recForm, setRecForm] = useState({ label: '', amount: '', frequency: 'monthly', start_date: '' });
  const [extForm, setExtForm] = useState({ label: '', amount: '', cost_date: '', notes: '' });

  const fetchData = async () => {
    const [r, e] = await Promise.all([
      supabase.from('recurring_costs').select('id, label, amount, frequency, start_date, end_date, active').eq('vehicle_id', vehicleId).order('start_date', { ascending: false }),
      supabase.from('extra_costs').select('id, label, amount, cost_date, notes').eq('vehicle_id', vehicleId).order('cost_date', { ascending: false }),
    ]);
    setRecurring(r.data ?? []);
    setExtras(e.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  const addRecurring = async () => {
    if (!recForm.label || !recForm.amount || !recForm.start_date) return;
    await supabase.from('recurring_costs').insert({ vehicle_id: vehicleId, label: recForm.label, amount: parseFloat(recForm.amount), frequency: recForm.frequency, start_date: recForm.start_date });
    setRecForm({ label: '', amount: '', frequency: 'monthly', start_date: '' });
    setShowRecForm(false);
    fetchData();
  };

  const addExtra = async () => {
    if (!extForm.label || !extForm.amount || !extForm.cost_date) return;
    await supabase.from('extra_costs').insert({ vehicle_id: vehicleId, label: extForm.label, amount: parseFloat(extForm.amount), cost_date: extForm.cost_date, notes: extForm.notes || null });
    setExtForm({ label: '', amount: '', cost_date: '', notes: '' });
    setShowExtForm(false);
    fetchData();
  };

  if (loading) return <p className="text-ink-muted">Chargement...</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-ink">Frais recurrents</h4>
          <button onClick={() => setShowRecForm(!showRecForm)} className="btn-primary text-xs px-3 py-1">+ Ajouter</button>
        </div>
        {showRecForm && (
          <div className="bg-surface rounded-lg p-3 grid grid-cols-2 gap-2 mb-3 border border-border-light">
            <input placeholder="Libelle *" value={recForm.label} onChange={(e) => setRecForm({ ...recForm, label: e.target.value })} className="input-field" />
            <input placeholder="Montant (EUR) *" value={recForm.amount} onChange={(e) => setRecForm({ ...recForm, amount: e.target.value })} className="input-field" />
            <select value={recForm.frequency} onChange={(e) => setRecForm({ ...recForm, frequency: e.target.value })} className="input-field">
              <option value="monthly">Mensuel</option>
              <option value="annual">Annuel</option>
            </select>
            <input type="date" value={recForm.start_date} onChange={(e) => setRecForm({ ...recForm, start_date: e.target.value })} className="input-field" />
            <button onClick={addRecurring} className="btn-primary col-span-2 py-1 text-sm">Ajouter</button>
          </div>
        )}
        {recurring.length === 0 ? <p className="text-ink-faint text-sm">Aucun</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left"><th className="table-header py-1 px-2">Libelle</th><th className="table-header py-1 px-2">Montant</th><th className="table-header py-1 px-2">Frequence</th><th className="table-header py-1 px-2">Debut</th></tr></thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r.id} className="border-b border-border-light">
                  <td className="table-cell py-1 px-2">{r.label}</td>
                  <td className="table-cell py-1 px-2">{Number(r.amount).toFixed(2)} EUR</td>
                  <td className="table-cell py-1 px-2">{r.frequency === 'monthly' ? 'Mensuel' : 'Annuel'}</td>
                  <td className="table-cell py-1 px-2">{new Date(r.start_date).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-ink">Frais ponctuels</h4>
          <button onClick={() => setShowExtForm(!showExtForm)} className="btn-primary text-xs px-3 py-1">+ Ajouter</button>
        </div>
        {showExtForm && (
          <div className="bg-surface rounded-lg p-3 grid grid-cols-2 gap-2 mb-3 border border-border-light">
            <input placeholder="Libelle *" value={extForm.label} onChange={(e) => setExtForm({ ...extForm, label: e.target.value })} className="input-field" />
            <input placeholder="Montant (EUR) *" value={extForm.amount} onChange={(e) => setExtForm({ ...extForm, amount: e.target.value })} className="input-field" />
            <input type="date" value={extForm.cost_date} onChange={(e) => setExtForm({ ...extForm, cost_date: e.target.value })} className="input-field" />
            <input placeholder="Notes" value={extForm.notes} onChange={(e) => setExtForm({ ...extForm, notes: e.target.value })} className="input-field" />
            <button onClick={addExtra} className="btn-primary col-span-2 py-1 text-sm">Ajouter</button>
          </div>
        )}
        {extras.length === 0 ? <p className="text-ink-faint text-sm">Aucun</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left"><th className="table-header py-1 px-2">Date</th><th className="table-header py-1 px-2">Libelle</th><th className="table-header py-1 px-2">Montant</th><th className="table-header py-1 px-2">Notes</th></tr></thead>
            <tbody>
              {extras.map((e) => (
                <tr key={e.id} className="border-b border-border-light">
                  <td className="table-cell py-1 px-2">{new Date(e.cost_date).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell py-1 px-2">{e.label}</td>
                  <td className="table-cell py-1 px-2">{Number(e.amount).toFixed(2)} EUR</td>
                  <td className="table-cell py-1 px-2 text-ink-muted">{e.notes ?? '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
