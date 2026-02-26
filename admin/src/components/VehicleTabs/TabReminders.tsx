import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Reminder { id: string; label: string; reminder_date: string; alert_days_before: number; notes: string | null; done: boolean; }

export default function TabReminders({ vehicleId }: { vehicleId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', date: '', days: '14', notes: '' });

  const fetchData = async () => {
    const { data } = await supabase.from('custom_reminders').select('id, label, reminder_date, alert_days_before, notes, done').eq('vehicle_id', vehicleId).order('reminder_date');
    setReminders(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  const addReminder = async () => {
    if (!form.label || !form.date) return;
    await supabase.from('custom_reminders').insert({ vehicle_id: vehicleId, label: form.label, reminder_date: form.date, alert_days_before: parseInt(form.days) || 14, notes: form.notes || null });
    setForm({ label: '', date: '', days: '14', notes: '' });
    setShowForm(false);
    fetchData();
  };

  const toggleDone = async (id: string, current: boolean) => {
    await supabase.from('custom_reminders').update({ done: !current }).eq('id', id);
    fetchData();
  };

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium">
        {showForm ? 'Annuler' : '+ Ajouter rappel'}
      </button>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input placeholder="Libellé *" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          <input placeholder="Alerter J-X avant" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          <button onClick={addReminder} className="px-4 py-2 bg-green-700 text-white rounded text-sm">Ajouter</button>
        </div>
      )}

      {reminders.length === 0 ? (
        <p className="text-gray-500">Aucun rappel</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border ${r.done ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-300'}`}>
              <button onClick={() => toggleDone(r.id, r.done)} className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${r.done ? 'bg-green-700 border-green-700 text-white' : 'border-gray-300'}`}>
                {r.done ? '✓' : ''}
              </button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${r.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{r.label}</p>
                <p className="text-xs text-gray-500">{new Date(r.reminder_date).toLocaleDateString('fr-FR')} — Alerte J-{r.alert_days_before}</p>
                {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
