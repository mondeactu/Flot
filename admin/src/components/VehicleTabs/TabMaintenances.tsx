import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Maintenance {
  id: string;
  type: string;
  cost: number | null;
  km_at_service: number | null;
  service_date: string;
  next_service_date: string | null;
  next_service_km: number | null;
  notes: string | null;
}

export default function TabMaintenances({ vehicleId }: { vehicleId: string }) {
  const [items, setItems] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: '', cost: '', km: '', date: '', nextDate: '', nextKm: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase
      .from('maintenances')
      .select('id, type, cost, km_at_service, service_date, next_service_date, next_service_km, notes')
      .eq('vehicle_id', vehicleId)
      .order('service_date', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  const handleAdd = async () => {
    if (!form.type || !form.date) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('maintenances').insert({
        vehicle_id: vehicleId,
        type: form.type,
        cost: form.cost ? parseFloat(form.cost) : null,
        km_at_service: form.km ? parseInt(form.km) : null,
        service_date: form.date,
        next_service_date: form.nextDate || null,
        next_service_km: form.nextKm ? parseInt(form.nextKm) : null,
        notes: form.notes || null,
      });
      if (error) throw error;
      setForm({ type: '', cost: '', km: '', date: '', nextDate: '', nextKm: '', notes: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error('Erreur ajout entretien :', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium">
        {showForm ? 'Annuler' : '+ Ajouter entretien'}
      </button>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Type d'entretien *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input type="date" placeholder="Date *" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input placeholder="Coût (€)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input placeholder="KM au service" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input type="date" placeholder="Prochain entretien" value={form.nextDate} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input placeholder="Prochain KM" value={form.nextKm} onChange={(e) => setForm({ ...form, nextKm: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm" />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border border-gray-300 rounded px-3 py-2 text-sm md:col-span-2" />
          <button onClick={handleAdd} disabled={saving} className="px-4 py-2 bg-green-700 text-white rounded text-sm disabled:opacity-50">
            {saving ? '...' : 'Ajouter'}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500">Aucun entretien</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-2 px-2">Date</th>
              <th className="py-2 px-2">Type</th>
              <th className="py-2 px-2">Coût</th>
              <th className="py-2 px-2">KM</th>
              <th className="py-2 px-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-b border-gray-100">
                <td className="py-2 px-2">{new Date(m.service_date).toLocaleDateString('fr-FR')}</td>
                <td className="py-2 px-2">{m.type}</td>
                <td className="py-2 px-2">{m.cost ? `${Number(m.cost).toFixed(2)} €` : '—'}</td>
                <td className="py-2 px-2">{m.km_at_service?.toLocaleString('fr-FR') ?? '—'}</td>
                <td className="py-2 px-2 text-gray-500">{m.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
