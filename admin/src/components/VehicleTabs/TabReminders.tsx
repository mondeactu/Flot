import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, Plus, Bell } from 'lucide-react';

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

  if (loading) return <p className="text-ink-muted">Chargement...</p>;

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-medium">
        {showForm ? 'Annuler' : <><Plus size={14} /> Ajouter rappel</>}
      </button>

      {showForm && (
        <div className="bg-surface rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3 border border-border-light">
          <input placeholder="Libelle *" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input-field" />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" />
          <input placeholder="Alerter J-X avant" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} className="input-field" />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" />
          <button onClick={addReminder} className="btn-primary px-4 py-2 text-sm">Ajouter</button>
        </div>
      )}

      {reminders.length === 0 ? (
        <p className="text-ink-muted">Aucun rappel</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${r.done ? 'bg-surface border-border opacity-60' : 'bg-surface-card border-border-input shadow-card'}`}>
              <button onClick={() => toggleDone(r.id, r.done)} className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${r.done ? 'bg-brand-700 border-brand-700 text-white' : 'border-border-input'}`}>
                {r.done && <Check size={12} />}
              </button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${r.done ? 'line-through text-ink-faint' : 'text-ink'}`}>{r.label}</p>
                <p className="text-xs text-ink-muted">{new Date(r.reminder_date).toLocaleDateString('fr-FR')} -- Alerte J-{r.alert_days_before}</p>
                {r.notes && <p className="text-xs text-ink-faint mt-1">{r.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
