import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AlertThresholdButtonProps {
  vehicleId: string;
  field: string;
  currentValue: number | null;
  unit: string;
  label: string;
  onSaved?: (newValue: number) => void;
}

export default function AlertThresholdButton({
  vehicleId,
  field,
  currentValue,
  unit,
  label,
  onSaved,
}: AlertThresholdButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentValue?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const isApproaching = () => {
    if (!currentValue) return false;
    return currentValue <= 7; // Simple heuristic
  };

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ [field]: parsed })
        .eq('id', vehicleId);

      if (error) throw error;
      onSaved?.(parsed);
      setOpen(false);
    } catch (err) {
      console.error('Erreur sauvegarde seuil :', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`p-1.5 rounded border text-sm transition-colors ${
          isApproaching()
            ? 'bg-orange-50 border-orange-400 text-orange-600'
            : 'bg-yellow-50 border-yellow-300 text-yellow-700'
        }`}
        title={`Seuil d'alerte : ${label}`}
      >
        ⚠️
      </button>

      {open && (
        <div className="absolute z-10 mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64">
          <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
          <p className="text-xs text-gray-500 mb-3">Seuil d'alerte ({unit})</p>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
            placeholder={`Ex: ${currentValue ?? 30}`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-3 py-2 text-sm bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? '...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
