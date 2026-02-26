import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface VehicleRow {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  next_inspection_date: string | null;
  driver: { full_name: string } | null;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ plate: '', brand: '', model: '', year: '' });
  const [saving, setSaving] = useState(false);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, plate, brand, model, next_inspection_date, driver:profiles!driver_id(full_name)')
      .order('plate');
    setVehicles((data as unknown as VehicleRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const getCTColor = (dateStr: string | null) => {
    if (!dateStr) return 'text-gray-400';
    const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'text-red-600 font-bold';
    if (diff < 30) return 'text-orange-500 font-semibold';
    return 'text-green-600';
  };

  const handleCreate = async () => {
    if (!form.plate) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('vehicles').insert({
        plate: form.plate.toUpperCase().trim(),
        brand: form.brand || null,
        model: form.model || null,
        year: form.year ? parseInt(form.year) : null,
      });
      if (error) throw error;
      setForm({ plate: '', brand: '', model: '', year: '' });
      setShowModal(false);
      fetchVehicles();
    } catch (err) {
      console.error('Erreur création véhicule :', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Chargement...</p></div>;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-800">Véhicules ({vehicles.length})</h1>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
          + Nouveau véhicule
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Plaque</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Marque / Modèle</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Conducteur</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-600">Prochain CT</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link to={`/vehicles/${v.id}`} className="text-green-700 font-bold hover:underline">{v.plate}</Link>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{(v.driver as unknown as { full_name: string })?.full_name ?? '—'}</td>
                  <td className={`py-3 px-4 ${getCTColor(v.next_inspection_date)}`}>
                    {v.next_inspection_date ? new Date(v.next_inspection_date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Nouveau véhicule</h3>
            <input placeholder="Plaque *" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Marque" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Modèle" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Année" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm">Annuler</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg text-sm disabled:opacity-50">{saving ? '...' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
