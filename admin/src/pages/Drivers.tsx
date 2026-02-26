import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Driver { id: string; full_name: string; phone: string | null; vehicle_plate: string | null; incidentCount: number; }

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const fetchDrivers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone').eq('role', 'driver').order('full_name');
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const rows: Driver[] = [];
    for (const p of profiles ?? []) {
      const [vRes, iRes] = await Promise.all([
        supabase.from('vehicles').select('plate').eq('driver_id', p.id).limit(1).single(),
        supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('driver_id', p.id).gte('incident_date', startOfMonth),
      ]);
      rows.push({ id: p.id, full_name: p.full_name, phone: p.phone, vehicle_plate: vRes.data?.plate ?? null, incidentCount: iRes.count ?? 0 });
    }
    setDrivers(rows);
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleSelect = (d: Driver) => {
    setSelected(d);
    setEditForm({ full_name: d.full_name, phone: d.phone ?? '' });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: editForm.full_name, phone: editForm.phone || null }).eq('id', selected.id);
      if (error) throw error;
      setSelected(null);
      fetchDrivers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Chargement...</p></div>;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <h1 className="text-2xl font-extrabold text-gray-800">Conducteurs ({drivers.length})</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-left">
              <th className="py-3 px-4 font-semibold text-gray-600">Nom</th>
              <th className="py-3 px-4 font-semibold text-gray-600">Téléphone</th>
              <th className="py-3 px-4 font-semibold text-gray-600">Véhicule</th>
              <th className="py-3 px-4 font-semibold text-gray-600">Incidents ce mois</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => handleSelect(d)}>
                <td className="py-3 px-4 text-green-700 font-medium">{d.full_name}</td>
                <td className="py-3 px-4 text-gray-600">{d.phone ?? '—'}</td>
                <td className="py-3 px-4 text-gray-600">{d.vehicle_plate ?? '—'}</td>
                <td className="py-3 px-4">
                  {d.incidentCount > 0 ? <span className="text-red-600 font-bold">{d.incidentCount}</span> : <span className="text-gray-400">0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Modifier — {selected.full_name}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg text-sm disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
