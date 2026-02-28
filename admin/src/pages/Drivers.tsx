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

  // Add driver
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', phone: '' });
  const [adding, setAdding] = useState(false);

  // Edit driver
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
      // Generate a placeholder email/password for Supabase auth
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
      setMessage('Conducteur ajoute');
      setTimeout(() => setMessage(''), 3000);
      fetchDrivers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur');
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
      fetchDrivers();
    } catch {
      setMessage('Erreur modification');
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
      setMessage('Conducteur supprime');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Erreur suppression');
    }
  };

  const filtered = drivers.filter((d) =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone ?? '').includes(search) ||
    (d.vehicle_plate ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <Users size={20} className="text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Conducteurs</h1>
            <p className="text-sm text-gray-500">{drivers.length} conducteur{drivers.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2.5 rounded-lg">
          {message}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Nouveau conducteur</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
              <input
                value={addForm.full_name}
                onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                placeholder="Jean Dupont"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telephone</label>
              <input
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="06 12 34 56 78"
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !addForm.full_name.trim()}
              className="px-5 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"
            >
              {adding ? 'Creation...' : 'Creer le conducteur'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un conducteur..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Conducteur</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide hidden md:table-cell">Telephone</th>
              <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Vehicule</th>
              <th className="py-3 px-4 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">Incidents</th>
              <th className="py-3 px-4 text-right font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3.5 px-4">
                  <p className="font-medium text-gray-900">{d.full_name}</p>
                  <p className="text-xs text-gray-400 md:hidden">{d.phone ?? ''}</p>
                </td>
                <td className="py-3.5 px-4 hidden md:table-cell">
                  {d.phone ? (
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Phone size={13} className="text-gray-400" />
                      {d.phone}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {d.vehicle_plate ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-md">
                      <Truck size={12} />
                      {d.vehicle_plate}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">Non assigne</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {d.incidentCount > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-full">
                      <AlertTriangle size={11} />
                      {d.incidentCount}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">0</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleEdit(d)} className="p-2 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors" title="Modifier">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(d)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  {search ? 'Aucun resultat' : 'Aucun conducteur'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Modifier</h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
              <input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telephone</label>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 disabled:opacity-50"
              >
                {saving ? '...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
