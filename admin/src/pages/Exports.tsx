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
        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Download size={20} className="text-indigo-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Export Comptable</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Periode</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Debut</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Vehicules <span className="font-normal normal-case text-gray-400">(vide = tous)</span></h3>
          <div className="flex flex-wrap gap-2">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => toggleVehicle(v.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedVehicles.includes(v.id)
                    ? 'bg-green-700 text-white border-green-700'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Truck size={11} /> {v.plate}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => doExport('excel')}
          disabled={exporting || !startDate || !endDate}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg font-medium text-sm hover:bg-green-800 disabled:opacity-50 shadow-sm"
        >
          <FileSpreadsheet size={16} /> Export Excel
        </button>
        <button
          onClick={() => doExport('pdf')}
          disabled={exporting || !startDate || !endDate}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 shadow-sm"
        >
          <FileText size={16} /> Export PDF
        </button>
      </div>

      {exporting && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700" />
          Export en cours...
        </div>
      )}
    </div>
  );
}
