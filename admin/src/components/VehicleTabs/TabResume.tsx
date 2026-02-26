import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import AlertThresholdButton from '../AlertThresholdButton';

interface Vehicle {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  notes: string | null;
  next_inspection_date: string | null;
  next_maintenance_date: string | null;
  next_maintenance_km: number | null;
  alert_inspection_days_before: number;
  alert_maintenance_days_before: number;
  alert_maintenance_km_before: number;
  fuel_alert_threshold_l100: number;
  no_fill_alert_days: number;
  driver_id: string | null;
  documents: Record<string, unknown>;
}

interface TabResumeProps {
  vehicle: Vehicle;
  onUpdated: () => void;
}

export default function TabResume({ vehicle, onUpdated }: TabResumeProps) {
  const [form, setForm] = useState({ ...vehicle });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          brand: form.brand,
          model: form.model,
          year: form.year,
          notes: form.notes,
          next_inspection_date: form.next_inspection_date || null,
          next_maintenance_date: form.next_maintenance_date || null,
          next_maintenance_km: form.next_maintenance_km,
        })
        .eq('id', vehicle.id);

      if (error) throw error;
      setMessage('✅ Véhicule mis à jour');
      onUpdated();
    } catch {
      setMessage('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plaque</label>
          <input value={vehicle.plate} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
          <input value={form.brand ?? ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
          <input value={form.model ?? ''} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
          <input type="number" value={form.year ?? ''} onChange={(e) => setForm({ ...form, year: e.target.value ? parseInt(e.target.value) : null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Prochain CT</label>
            <input type="date" value={form.next_inspection_date ?? ''} onChange={(e) => setForm({ ...form, next_inspection_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <AlertThresholdButton vehicleId={vehicle.id} field="alert_inspection_days_before" currentValue={vehicle.alert_inspection_days_before} unit="jours" label="CT" />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Prochain entretien (date)</label>
            <input type="date" value={form.next_maintenance_date ?? ''} onChange={(e) => setForm({ ...form, next_maintenance_date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <AlertThresholdButton vehicleId={vehicle.id} field="alert_maintenance_days_before" currentValue={vehicle.alert_maintenance_days_before} unit="jours" label="Entretien (jours)" />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Prochain entretien (km)</label>
            <input type="number" value={form.next_maintenance_km ?? ''} onChange={(e) => setForm({ ...form, next_maintenance_km: e.target.value ? parseInt(e.target.value) : null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <AlertThresholdButton vehicleId={vehicle.id} field="alert_maintenance_km_before" currentValue={vehicle.alert_maintenance_km_before} unit="km" label="Entretien (km)" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>

      <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 text-sm font-medium">
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  );
}
