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

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-700">Frais récurrents</h4>
          <button onClick={() => setShowRecForm(!showRecForm)} className="text-xs px-3 py-1 bg-green-700 text-white rounded">+ Ajouter</button>
        </div>
        {showRecForm && (
          <div className="bg-gray-50 rounded p-3 grid grid-cols-2 gap-2 mb-3">
            <input placeholder="Libellé *" value={recForm.label} onChange={(e) => setRecForm({ ...recForm, label: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            <input placeholder="Montant (€) *" value={recForm.amount} onChange={(e) => setRecForm({ ...recForm, amount: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            <select value={recForm.frequency} onChange={(e) => setRecForm({ ...recForm, frequency: e.target.value })} className="border rounded px-2 py-1 text-sm">
              <option value="monthly">Mensuel</option>
              <option value="annual">Annuel</option>
            </select>
            <input type="date" value={recForm.start_date} onChange={(e) => setRecForm({ ...recForm, start_date: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            <button onClick={addRecurring} className="col-span-2 bg-green-700 text-white rounded py-1 text-sm">Ajouter</button>
          </div>
        )}
        {recurring.length === 0 ? <p className="text-gray-400 text-sm">Aucun</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1 px-2">Libellé</th><th className="py-1 px-2">Montant</th><th className="py-1 px-2">Fréquence</th><th className="py-1 px-2">Début</th></tr></thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-1 px-2">{r.label}</td>
                  <td className="py-1 px-2">{Number(r.amount).toFixed(2)} €</td>
                  <td className="py-1 px-2">{r.frequency === 'monthly' ? 'Mensuel' : 'Annuel'}</td>
                  <td className="py-1 px-2">{new Date(r.start_date).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-700">Frais ponctuels</h4>
          <button onClick={() => setShowExtForm(!showExtForm)} className="text-xs px-3 py-1 bg-green-700 text-white rounded">+ Ajouter</button>
        </div>
        {showExtForm && (
          <div className="bg-gray-50 rounded p-3 grid grid-cols-2 gap-2 mb-3">
            <input placeholder="Libellé *" value={extForm.label} onChange={(e) => setExtForm({ ...extForm, label: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            <input placeholder="Montant (€) *" value={extForm.amount} onChange={(e) => setExtForm({ ...extForm, amount: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            <input type="date" value={extForm.cost_date} onChange={(e) => setExtForm({ ...extForm, cost_date: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            <input placeholder="Notes" value={extForm.notes} onChange={(e) => setExtForm({ ...extForm, notes: e.target.value })} className="border rounded px-2 py-1 text-sm" />
            <button onClick={addExtra} className="col-span-2 bg-green-700 text-white rounded py-1 text-sm">Ajouter</button>
          </div>
        )}
        {extras.length === 0 ? <p className="text-gray-400 text-sm">Aucun</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1 px-2">Date</th><th className="py-1 px-2">Libellé</th><th className="py-1 px-2">Montant</th><th className="py-1 px-2">Notes</th></tr></thead>
            <tbody>
              {extras.map((e) => (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className="py-1 px-2">{new Date(e.cost_date).toLocaleDateString('fr-FR')}</td>
                  <td className="py-1 px-2">{e.label}</td>
                  <td className="py-1 px-2">{Number(e.amount).toFixed(2)} €</td>
                  <td className="py-1 px-2 text-gray-500">{e.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
