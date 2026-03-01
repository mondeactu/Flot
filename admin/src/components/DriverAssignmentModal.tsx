import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Driver {
  id: string;
  full_name: string;
}

interface DriverAssignmentModalProps {
  vehicleId: string;
  currentDriverId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function DriverAssignmentModal({
  vehicleId,
  currentDriverId,
  onClose,
  onSaved,
}: DriverAssignmentModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState(currentDriverId ?? '');
  const [assignmentType, setAssignmentType] = useState<'titular' | 'replacement'>('titular');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDrivers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'driver')
        .order('full_name');
      setDrivers(data ?? []);
    };
    fetchDrivers();
  }, []);

  const handleSave = async () => {
    if (!selectedDriverId) {
      setError('Veuillez sélectionner un conducteur');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (assignmentType === 'titular') {
        // Update vehicle.driver_id
        const { error: vErr } = await supabase
          .from('vehicles')
          .update({ driver_id: selectedDriverId })
          .eq('id', vehicleId);
        if (vErr) throw vErr;
      }

      // Create assignment record
      const { error: aErr } = await supabase.from('driver_assignments').insert({
        vehicle_id: vehicleId,
        driver_id: selectedDriverId,
        type: assignmentType,
        start_date: startDate,
        end_date: assignmentType === 'replacement' && endDate ? endDate : null,
        confirmed: true,
      });
      if (aErr) throw aErr;

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'affectation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-card rounded-2xl shadow-modal w-full max-w-md p-6 animate-fade-in">
        <h3 className="text-lg font-bold text-ink mb-4">Affectation conducteur</h3>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Type</label>
            <select
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value as 'titular' | 'replacement')}
              className="input-field"
            >
              <option value="titular">Titulaire</option>
              <option value="replacement">Remplaçant</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Conducteur</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="input-field"
            >
              <option value="">-- Selectionner --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Date de debut</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>

          {assignmentType === 'replacement' && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Date de fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
