import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { exportExcel, exportPDF } from '../lib/exports';

interface VehicleOption { id: string; plate: string; }

export default function Exports() {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(today);

    supabase.from('vehicles').select('id, plate').order('plate').then(({ data }) => {
      setVehicles(data ?? []);
    });
  }, []);

  const toggleVehicle = (id: string) => {
    setSelectedVehicles((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportExcel({
        startDate,
        endDate,
        vehicleIds: selectedVehicles.length > 0 ? selectedVehicles : undefined,
      });
    } catch (err) {
      console.error('Erreur export Excel :', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportPDF({
        startDate,
        endDate,
        vehicleIds: selectedVehicles.length > 0 ? selectedVehicles : undefined,
      });
    } catch (err) {
      console.error('Erreur export PDF :', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-extrabold text-gray-800">Export Comptable</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Filtres</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Véhicules (laisser vide = tous)</label>
          <div className="flex flex-wrap gap-2">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => toggleVehicle(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedVehicles.includes(v.id)
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {v.plate}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleExportExcel}
          disabled={exporting || !startDate || !endDate}
          className="px-6 py-3 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 disabled:opacity-50 flex items-center gap-2"
        >
          📊 Export Excel
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting || !startDate || !endDate}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
        >
          📄 Export PDF
        </button>
      </div>

      {exporting && <p className="text-sm text-gray-500">Export en cours...</p>}
    </div>
  );
}
