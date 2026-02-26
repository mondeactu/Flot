import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import MonthlyReportModal from '../components/MonthlyReportModal';

const COLORS = ['#2E7D32', '#42A5F5', '#FF9800', '#D32F2F', '#9C27B0', '#607D8B'];

export default function Dashboard() {
  const [kpis, setKpis] = useState({ vehicles: 0, alerts: 0, fuelHT: 0, fuelTVA: 0, fuelTTC: 0, cleaning: 0, recurring: 0, extra: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; fuel: number; cleaning: number; maintenance: number; incidents: number }[]>([]);
  const [donutData, setDonutData] = useState<{ name: string; value: number }[]>([]);
  const [report, setReport] = useState<{ period: string; data: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const [vehiclesR, alertsR, fuelR, cleanR, recurR, extraR, reportR] = await Promise.all([
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('acknowledged', false),
        supabase.from('fuel_fills').select('price_ht, price_ttc').gte('filled_at', startOfMonth),
        supabase.from('cleanings').select('price_ttc').gte('cleaned_at', startOfMonth),
        supabase.from('recurring_costs').select('amount, frequency').eq('active', true),
        supabase.from('extra_costs').select('amount').gte('cost_date', startOfMonth),
        supabase.from('monthly_reports').select('period, data').order('created_at', { ascending: false }).limit(1).single(),
      ]);

      const fuelHT = (fuelR.data ?? []).reduce((s, r) => s + Number(r.price_ht), 0);
      const fuelTTC = (fuelR.data ?? []).reduce((s, r) => s + Number(r.price_ttc), 0);
      const cleanTotal = (cleanR.data ?? []).reduce((s, r) => s + Number(r.price_ttc ?? 0), 0);
      const recurTotal = (recurR.data ?? []).reduce((s, r) => {
        return s + (r.frequency === 'annual' ? Number(r.amount) / 12 : Number(r.amount));
      }, 0);
      const extraTotal = (extraR.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

      setKpis({
        vehicles: vehiclesR.count ?? 0,
        alerts: alertsR.count ?? 0,
        fuelHT,
        fuelTVA: fuelTTC - fuelHT,
        fuelTTC,
        cleaning: cleanTotal,
        recurring: recurTotal,
        extra: extraTotal,
      });

      setDonutData([
        { name: 'Carburant', value: fuelTTC },
        { name: 'Nettoyage', value: cleanTotal },
        { name: 'Frais récurrents', value: recurTotal },
        { name: 'Frais ponctuels', value: extraTotal },
      ].filter((d) => d.value > 0));

      if (reportR.data) {
        setReport(reportR.data as { period: string; data: Record<string, unknown> });
      }

      // Monthly data (12 months)
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = d.toISOString().split('T')[0];
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        const label = d.toLocaleDateString('fr-FR', { month: 'short' });

        const [f, c, m, inc] = await Promise.all([
          supabase.from('fuel_fills').select('price_ttc').gte('filled_at', start).lte('filled_at', end),
          supabase.from('cleanings').select('price_ttc').gte('cleaned_at', start).lte('cleaned_at', end),
          supabase.from('maintenances').select('cost').gte('service_date', start).lte('service_date', end),
          supabase.from('incidents').select('amount').gte('incident_date', start).lte('incident_date', end),
        ]);

        months.push({
          month: label,
          fuel: (f.data ?? []).reduce((s, r) => s + Number(r.price_ttc ?? 0), 0),
          cleaning: (c.data ?? []).reduce((s, r) => s + Number(r.price_ttc ?? 0), 0),
          maintenance: (m.data ?? []).reduce((s, r) => s + Number(r.cost ?? 0), 0),
          incidents: (inc.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0),
        });
      }
      setMonthlyData(months);
      setLoading(false);
    };

    fetchDashboard();
  }, []);

  const [showReport, setShowReport] = useState(false);
  const fmt = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const total = kpis.fuelTTC + kpis.cleaning + kpis.recurring + kpis.extra;

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Chargement...</p></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-extrabold text-gray-800">Tableau de bord</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Véhicules actifs" value={kpis.vehicles.toString()} />
        <KPICard label="Alertes" value={kpis.alerts.toString()} alert={kpis.alerts > 0} />
        <KPICard label="Carburant HT" value={fmt(kpis.fuelHT)} sub={`TVA: ${fmt(kpis.fuelTVA)} — TTC: ${fmt(kpis.fuelTTC)}`} />
        <KPICard label="Coût total flotte" value={fmt(total)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Dépenses mensuelles</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="fuel" stackId="a" fill="#2E7D32" name="Carburant" />
              <Bar dataKey="cleaning" stackId="a" fill="#42A5F5" name="Nettoyage" />
              <Bar dataKey="maintenance" stackId="a" fill="#FF9800" name="Entretien" />
              <Bar dataKey="incidents" stackId="a" fill="#D32F2F" name="Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Répartition ce mois</h3>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-20">Aucune donnée ce mois</p>
          )}
        </div>
      </div>

      {report && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-blue-800">📊 Rapport mensuel {report.period} disponible</span>
          <button onClick={() => setShowReport(true)} className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">Voir</button>
        </div>
      )}

      {showReport && report && (
        <MonthlyReportModal report={report as { period: string; data: Record<string, unknown> }} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

function KPICard({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${alert ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <p className={`text-2xl font-extrabold ${alert ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
