import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth.store';
import { Users, Plus, Phone, Truck, AlertTriangle, Pencil, Trash2, X, Search } from 'lucide-react';

interface Driver {
  id: string;
  full_name: string;
  phone: string | null;
  vehicle_plate: string | null;
  incidentCount: number;
}

export default function Drivers() {
  const { session } = useAuthStore();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', phone: '' });
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');

  const fetchDrivers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('role', 'driver')
      .order('full_name');

    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const rows: Driver[] = [];
    for (const p of profiles ?? []) {
      const [vRes, iRes] = await Promise.all([
        supabase.from('vehicles').select('plate').eq('driver_id', p.id).limit(1).single(),
        supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('driver_id', p.id).gte('incident_date', startOfMonth),
      ]);
      rows.push({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        vehicle_plate: vRes.data?.plate ?? null,
        incidentCount: iRes.count ?? 0,
      });
    }
    setDrivers(rows);
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleAdd = async () => {
    if (!addForm.full_name.trim()) return;
    setAdding(true);
    try {
      const token = session?.access_token;
      const slug = addForm.full_name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
      const email = `driver.${slug}.${Date.now()}@saveursetvie.fr`;
      const password = `Flot${Date.now()}`;

      const res = await supabase.functions.invoke('admin-actions', {
        body: { action: 'create_driver', full_name: addForm.full_name.trim(), email, password, phone: addForm.phone || '' },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.error) throw res.error;
      const data = res.data as Record<string, unknown>;
      if (data.error) throw new Error(data.error as string);

      setAddForm({ full_name: '', phone: '' });
      setShowAdd(false);
      setMessage('success:Conducteur ajoute avec succes');
      setTimeout(() => setMessage(''), 3000);
      fetchDrivers();
    } catch (err) {
      setMessage('error:' + (err instanceof Error ? err.message : 'Erreur'));
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (d: Driver) => {
    setEditing(d);
    setEditForm({ full_name: d.full_name, phone: d.phone ?? '' });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        full_name: editForm.full_name.trim(),
        phone: editForm.phone || null,
      }).eq('id', editing.id);
      setEditing(null);
      setMessage('success:Conducteur modifie');
      setTimeout(() => setMessage(''), 3000);
      fetchDrivers();
    } catch {
      setMessage('error:Erreur modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: Driver) => {
    if (!window.confirm(`Supprimer ${d.full_name} ?`)) return;
    try {
      const token = session?.access_token;
      await supabase.functions.invoke('admin-actions', {
        body: { action: 'delete_driver', driver_id: d.id },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchDrivers();
      setMessage('success:Conducteur supprime');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('error:Erreur suppression');
    }
  };

  const filtered = drivers.filter((d) =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone ?? '').includes(search) ||
    (d.vehicle_plate ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-brand-700" />
          </div>
          <div>
            <h1 className="page-title text-xl">{drivers.length} conducteur{drivers.length > 1 ? 's' : ''}</h1>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-xl font-medium animate-fade-in ${message.startsWith('success:') ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.replace(/^(success:|error:)/, '')}
        </div>
      )}

      {showAdd && (
        <div className="card p-5 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-ink">Nouveau conducteur</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Nom complet *</label>
              <input value={addForm.full_name} onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })} placeholder="Jean Dupont" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Telephone</label>
              <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="06 12 34 56 78" className="input-field" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Annuler</button>
            <button onClick={handleAdd} disabled={adding || !addForm.full_name.trim()} className="btn-primary">
              {adding ? 'Creation...' : 'Creer le conducteur'}
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un conducteur..." className="input-field pl-11" />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-light bg-surface/50">
              <th className="table-header">Conducteur</th>
              <th className="table-header hidden md:table-cell">Telephone</th>
              <th className="table-header">Vehicule</th>
              <th className="table-header text-center">Incidents</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-surface/60 transition-colors">
                <td className="table-cell">
                  <p className="font-medium text-ink">{d.full_name}</p>
                  <p className="text-[11px] text-ink-muted md:hidden">{d.phone ?? ''}</p>
                </td>
                <td className="table-cell hidden md:table-cell">
                  {d.phone ? (
                    <span className="flex items-center gap-1.5 text-ink-secondary">
                      <Phone size={13} className="text-ink-muted" />
                      {d.phone}
                    </span>
                  ) : <span className="text-ink-faint">--</span>}
                </td>
                <td className="table-cell">
                  {d.vehicle_plate ? (
                    <span className="plate-badge"><Truck size={12} />{d.vehicle_plate}</span>
                  ) : <span className="text-ink-faint text-xs">Non assigne</span>}
                </td>
                <td className="table-cell text-center">
                  {d.incidentCount > 0 ? (
                    <span className="badge bg-red-50 text-red-600"><AlertTriangle size={11} />{d.incidentCount}</span>
                  ) : <span className="text-ink-faint text-xs">0</span>}
                </td>
                <td className="table-cell text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleEdit(d)} className="p-2 text-ink-muted hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors" title="Modifier">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(d)} className="p-2 text-ink-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="py-16 text-center text-ink-muted">{search ? 'Aucun resultat' : 'Aucun conducteur'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Modifier le conducteur</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-surface rounded-lg"><X size={18} className="text-ink-muted" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Nom complet</label>
              <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Telephone</label>
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
