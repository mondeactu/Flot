import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
        <AlertTriangle size={14} />
      </button>

      {open && (
        <div className="absolute z-10 mt-2 right-0 bg-surface-card border border-border rounded-xl shadow-elevated p-4 w-64 animate-fade-in">
          <p className="text-sm font-semibold text-ink mb-1">{label}</p>
          <p className="text-xs text-ink-muted mb-3">Seuil d'alerte ({unit})</p>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input-field mb-3"
            placeholder={`Ex: ${currentValue ?? 30}`}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="btn-secondary flex-1 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 text-sm"
            >
              {saving ? '...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
