import React from 'react';
import { BarChart3, Fuel, Sparkles, Wrench, AlertTriangle, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <BarChart3 size={18} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-ink">Rapport — {report.period}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-brand-50 rounded-xl p-4">
            <p className="text-xs font-medium text-ink-secondary uppercase tracking-wide">Vehicules actifs</p>
            <p className="text-2xl font-bold text-brand-700 mt-1">{d.vehicles_count}</p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Categorie</th>
                <th className="text-right py-2.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Nombre</th>
                <th className="text-right py-2.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-light">
                <td className="py-3 flex items-center gap-2"><Fuel size={14} className="text-brand-700" /> Carburant</td>
                <td className="text-right text-ink-secondary">{d.fuel.fills_count}</td>
                <td className="text-right font-semibold text-ink">{fmt(d.fuel.total_ttc)}</td>
              </tr>
              <tr className="border-b border-border-light">
                <td className="py-3 flex items-center gap-2"><Sparkles size={14} className="text-blue-600" /> Nettoyage</td>
                <td className="text-right text-ink-secondary">{d.cleaning.count}</td>
                <td className="text-right font-semibold text-ink">{fmt(d.cleaning.total_ttc)}</td>
              </tr>
              <tr className="border-b border-border-light">
                <td className="py-3 flex items-center gap-2"><Wrench size={14} className="text-amber-600" /> Entretiens</td>
                <td className="text-right text-ink-secondary">{d.maintenance.count}</td>
                <td className="text-right font-semibold text-ink">{fmt(d.maintenance.total)}</td>
              </tr>
              <tr className="border-b border-border-light">
                <td className="py-3 flex items-center gap-2"><AlertTriangle size={14} className="text-red-500" /> Incidents</td>
                <td className="text-right text-ink-secondary">{d.incidents.count}</td>
                <td className="text-right font-semibold text-ink">{fmt(d.incidents.total_amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="py-3 text-ink">TOTAL</td>
                <td></td>
                <td className="text-right text-brand-700 text-base">{fmt(d.grand_total)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="text-[11px] text-ink-muted mt-2">
            Carburant : {d.fuel.total_liters.toFixed(0)} L — HT : {fmt(d.fuel.total_ht)} — TVA : {fmt(d.fuel.total_ttc - d.fuel.total_ht)}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 btn-primary w-full"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
