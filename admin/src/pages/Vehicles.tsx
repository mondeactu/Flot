import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Truck, Plus, Search, Calendar, X, ChevronRight } from 'lucide-react';

interface VehicleRow {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  next_inspection_date: string | null;
  driver: { full_name: string } | null;
}

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
    if (!dateStr) return { label: '--', color: 'text-ink-muted', bg: '' };
    const diff = Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
    const formatted = new Date(dateStr).toLocaleDateString('fr-FR');
    if (diff < 0) return { label: formatted, color: 'text-red-600 font-semibold', bg: 'bg-red-50 text-red-600' };
    if (diff < 30) return { label: formatted, color: 'text-amber-600 font-medium', bg: 'bg-amber-50 text-amber-600' };
    return { label: formatted, color: 'text-brand-700', bg: 'bg-brand-50 text-brand-700' };
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Truck size={20} className="text-brand-700" />
          </div>
          <div>
            <h1 className="page-title text-xl">{vehicles.length} vehicule{vehicles.length > 1 ? 's' : ''}</h1>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Nouveau
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par plaque, marque, conducteur..." className="input-field pl-11" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light bg-surface/50">
              <th className="table-header">Plaque</th>
              <th className="table-header hidden md:table-cell">Vehicule</th>
              <th className="table-header">Conducteur</th>
              <th className="table-header">Controle technique</th>
              <th className="table-header w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {filtered.map((v) => {
              const ct = getCTStatus(v.next_inspection_date);
              return (
                <tr key={v.id} className="hover:bg-surface/60 transition-colors group">
                  <td className="table-cell">
                    <Link to={`/vehicles/${v.id}`} className="plate-badge">
                      <Truck size={12} /> {v.plate}
                    </Link>
                  </td>
                  <td className="table-cell text-ink-secondary hidden md:table-cell">{[v.brand, v.model].filter(Boolean).join(' ') || <span className="text-ink-faint">--</span>}</td>
                  <td className="table-cell text-ink-secondary">{(v.driver as any)?.full_name ?? <span className="text-ink-faint">Non assigne</span>}</td>
                  <td className="table-cell">
                    {v.next_inspection_date ? (
                      <span className={`badge ${ct.bg}`}>
                        <Calendar size={11} />
                        {ct.label}
                      </span>
                    ) : <span className="text-ink-faint">--</span>}
                  </td>
                  <td className="table-cell">
                    <Link to={`/vehicles/${v.id}`} className="text-ink-faint group-hover:text-ink-secondary transition-colors">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-16 text-center text-ink-muted">{search ? 'Aucun resultat' : 'Aucun vehicule'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal creation */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Nouveau vehicule</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-surface rounded-lg transition-colors"><X size={18} className="text-ink-muted" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Plaque d'immatriculation *</label>
              <input
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: formatPlate(e.target.value) })}
                placeholder="AA-123-BB"
                maxLength={9}
                className="input-field text-center text-lg font-bold tracking-widest uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Marque</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Renault" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Modele</label>
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Master" className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Annee</label>
              <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" className="input-field" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleCreate} disabled={saving || !form.plate} className="btn-primary flex-1">{saving ? 'Creation...' : 'Creer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
