import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { exportExcel, exportPDF } from '../lib/exports';
import { FileSpreadsheet, FileText, Download, Truck } from 'lucide-react';

interface VehicleOption { id: string; plate: string; }

export default function Exports() {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const now = new Date();
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
    supabase.from('vehicles').select('id, plate').order('plate').then(({ data }) => setVehicles(data ?? []));
  }, []);

  const toggleVehicle = (id: string) => {
    setSelectedVehicles((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  const doExport = async (type: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const opts = { startDate, endDate, vehicleIds: selectedVehicles.length > 0 ? selectedVehicles : undefined };
      type === 'excel' ? await exportExcel(opts) : await exportPDF(opts);
    } catch (err) { console.error(err); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Download size={20} className="text-indigo-600" />
        </div>
        <h1 className="page-title text-xl">Export Comptable</h1>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-4">Periode</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Debut</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">
            Vehicules <span className="font-normal normal-case text-ink-muted">(vide = tous)</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => toggleVehicle(v.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  selectedVehicles.includes(v.id)
                    ? 'bg-brand-700 text-white border-brand-700 shadow-sm'
                    : 'bg-white text-ink-secondary border-border hover:bg-surface hover:border-ink-faint'
                }`}
              >
                <Truck size={12} /> {v.plate}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => doExport('excel')}
          disabled={exporting || !startDate || !endDate}
          className="btn-primary"
        >
          <FileSpreadsheet size={16} /> Export Excel
        </button>
        <button
          onClick={() => doExport('pdf')}
          disabled={exporting || !startDate || !endDate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 shadow-sm"
        >
          <FileText size={16} /> Export PDF
        </button>
      </div>

      {exporting && (
        <div className="flex items-center gap-2.5 text-sm text-ink-secondary">
          <div className="w-4 h-4 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" />
          Export en cours...
        </div>
      )}
    </div>
  );
}
