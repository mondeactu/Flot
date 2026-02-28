import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Truck, Plus, Search, Calendar, X } from 'lucide-react';

interface VehicleRow {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  next_inspection_date: string | null;
  driver: { full_name: string } | null;
}

// Auto-format plate: XX-XXX-XX
function formatPlate(raw: string): string {
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let result = '';
  for (let i = 0; i < clean.length && i < 7; i++) {
    if (i === 2 || i === 5) result += '-';
    result += clean[i];
  }
  return result;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const getCTStatus = (dateStr: string | null) => {
    if (!dateStr) return { color: 'text-gray-400', bg: '' };
    const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
    if (diff < 0) return { color: 'text-red-600 font-semibold', bg: 'bg-red-50' };
    if (diff < 30) return { color: 'text-orange-600 font-medium', bg: 'bg-orange-50' };
    return { color: 'text-green-600', bg: '' };
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
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = vehicles.filter((v) =>
    v.plate.toLowerCase().includes(search.toLowerCase()) ||
    (v.brand ?? '').toLowerCase().includes(search.toLowerCase()) ||
    ((v.driver as any)?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" /></div>;

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Truck size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vehicules</h1>
            <p className="text-sm text-gray-500">{vehicles.length} vehicule{vehicles.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 shadow-sm">
          <Plus size={16} /> Nouveau
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Plaque</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Vehicule</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Conducteur</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">CT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((v) => {
              const ct = getCTStatus(v.next_inspection_date);
              return (
                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <Link to={`/vehicles/${v.id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-md hover:bg-green-100 transition-colors">
                      <Truck size={12} /> {v.plate}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 hidden md:table-cell">{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="py-3.5 px-4 text-gray-600">{(v.driver as any)?.full_name ?? <span className="text-gray-300">Non assigne</span>}</td>
                  <td className={`py-3.5 px-4 ${ct.color}`}>
                    {v.next_inspection_date ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${ct.bg}`}>
                        <Calendar size={11} />
                        {new Date(v.next_inspection_date).toLocaleDateString('fr-FR')}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal creation */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Nouveau vehicule</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Plaque d'immatriculation *</label>
              <input
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: formatPlate(e.target.value) })}
                placeholder="AA-123-BB"
                maxLength={9}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-center text-lg font-bold tracking-widest uppercase focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Marque</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Renault" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Modele</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Master" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Annee</label>
              <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
              <button onClick={handleCreate} disabled={saving || !form.plate} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50">{saving ? '...' : 'Creer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
