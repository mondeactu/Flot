import React from 'react';

interface ReportData {
  period: string;
  vehicles_count: number;
  fuel: { total_ht: number; total_ttc: number; total_liters: number; fills_count: number };
  cleaning: { total_ttc: number; count: number };
  maintenance: { total: number; count: number };
  incidents: { total_amount: number; count: number };
  grand_total: number;
}

interface MonthlyReportModalProps {
  report: { period: string; data: ReportData };
  onClose: () => void;
}

export default function MonthlyReportModal({ report, onClose }: MonthlyReportModalProps) {
  const d = report.data;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">📊 Rapport — {report.period}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Véhicules actifs</p>
            <p className="text-2xl font-bold text-green-700">{d.vehicles_count}</p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-600">Catégorie</th>
                <th className="text-right py-2 text-gray-600">Nombre</th>
                <th className="text-right py-2 text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2">⛽ Carburant</td>
                <td className="text-right">{d.fuel.fills_count}</td>
                <td className="text-right font-medium">{fmt(d.fuel.total_ttc)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">🧹 Nettoyage</td>
                <td className="text-right">{d.cleaning.count}</td>
                <td className="text-right font-medium">{fmt(d.cleaning.total_ttc)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">🔧 Entretiens</td>
                <td className="text-right">{d.maintenance.count}</td>
                <td className="text-right font-medium">{fmt(d.maintenance.total)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">🚨 Incidents</td>
                <td className="text-right">{d.incidents.count}</td>
                <td className="text-right font-medium">{fmt(d.incidents.total_amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="py-3">TOTAL</td>
                <td></td>
                <td className="text-right text-green-700">{fmt(d.grand_total)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="text-xs text-gray-400 mt-2">
            Carburant : {d.fuel.total_liters.toFixed(0)} L — HT : {fmt(d.fuel.total_ht)} — TVA : {fmt(d.fuel.total_ttc - d.fuel.total_ht)}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-sm font-medium"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
