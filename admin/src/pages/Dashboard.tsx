import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';
import MonthlyReportModal from '../components/MonthlyReportModal';
import { Truck, Fuel, AlertTriangle, TrendingUp, FileText } from 'lucide-react';

const COLORS = ['#2E7D32', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

export default function Dashboard() {
  const [kpis, setKpis] = useState({ vehicles: 0, alerts: 0, fuelHT: 0, fuelTVA: 0, fuelTTC: 0, cleaning: 0, recurring: 0, extra: 0, incidents: 0, incidentCount: 0 });
  const [monthlyData, setMonthlyData] = useState<{ month: string; fuel: number; cleaning: number; maintenance: number; incidents: number }[]>([]);
  const [donutData, setDonutData] = useState<{ name: string; value: number }[]>([]);
  const [report, setReport] = useState<{ period: string; data: Record<string, unknown> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const [vehiclesR, alertsR, fuelR, cleanR, recurR, extraR, reportR, incR] = await Promise.all([
        supabase.from('vehicles').select('id', { count: 'exact', head: true }),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('acknowledged', false),
        supabase.from('fuel_fills').select('price_ht, price_ttc').gte('filled_at', startOfMonth),
        supabase.from('cleanings').select('price_ttc').gte('cleaned_at', startOfMonth),
        supabase.from('recurring_costs').select('amount, frequency').eq('active', true),
        supabase.from('extra_costs').select('amount').gte('cost_date', startOfMonth),
        supabase.from('monthly_reports').select('period, data').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('incidents').select('amount').gte('incident_date', startOfMonth),
      ]);

      const fuelHT = (fuelR.data ?? []).reduce((s, r) => s + Number(r.price_ht), 0);
      const fuelTTC = (fuelR.data ?? []).reduce((s, r) => s + Number(r.price_ttc), 0);
      const cleanTotal = (cleanR.data ?? []).reduce((s, r) => s + Number(r.price_ttc ?? 0), 0);
      const recurTotal = (recurR.data ?? []).reduce((s, r) => {
        return s + (r.frequency === 'annual' ? Number(r.amount) / 12 : Number(r.amount));
      }, 0);
      const extraTotal = (extraR.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const incTotal = (incR.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);

      setKpis({
        vehicles: vehiclesR.count ?? 0,
        alerts: alertsR.count ?? 0,
        fuelHT,
        fuelTVA: fuelTTC - fuelHT,
        fuelTTC,
        cleaning: cleanTotal,
        recurring: recurTotal,
        extra: extraTotal,
        incidents: incTotal,
        incidentCount: (incR.data ?? []).length,
      });

      setDonutData([
        { name: 'Carburant', value: fuelTTC },
        { name: 'Nettoyage', value: cleanTotal },
        { name: 'Frais recurrents', value: recurTotal },
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="page-title">Tableau de bord</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Vehicules actifs"
          value={kpis.vehicles.toString()}
          icon={<Truck size={20} />}
          iconBg="bg-brand-50"
          iconColor="text-brand-700"
        />
        <KPICard
          label="Carburant HT"
          value={fmt(kpis.fuelHT)}
          sub={`TTC: ${fmt(kpis.fuelTTC)}`}
          icon={<Fuel size={20} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          label="Incidents ce mois"
          value={kpis.incidentCount > 0 ? `${kpis.incidentCount}` : '0'}
          sub={kpis.incidentCount > 0 ? fmt(kpis.incidents) : undefined}
          alert={kpis.incidentCount > 0}
          icon={<AlertTriangle size={20} />}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <KPICard
          label="Cout total flotte"
          value={fmt(total)}
          icon={<TrendingUp size={20} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-ink mb-5">Depenses mensuelles</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E9EE" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E7491' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6E7491' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E8E9EE', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
              />
              <Bar dataKey="fuel" stackId="a" fill="#2E7D32" name="Carburant" radius={[0, 0, 0, 0]} />
              <Bar dataKey="cleaning" stackId="a" fill="#3B82F6" name="Nettoyage" />
              <Bar dataKey="maintenance" stackId="a" fill="#F59E0B" name="Entretien" />
              <Bar dataKey="incidents" stackId="a" fill="#EF4444" name="Incidents" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink mb-5">Repartition ce mois</h3>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E8E9EE', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-ink-muted text-sm">Aucune donnee ce mois</p>
            </div>
          )}
          {/* Legend */}
          {donutData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {donutData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[11px] text-ink-secondary">{d.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {report && (
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-ink">Rapport mensuel {report.period} disponible</span>
          </div>
          <button onClick={() => setShowReport(true)} className="btn-primary text-xs py-2 px-4">Consulter</button>
        </div>
      )}

      {showReport && report && (
        <MonthlyReportModal report={report as any} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

function KPICard({ label, value, sub, alert, icon, iconBg, iconColor }: {
  label: string; value: string; sub?: string; alert?: boolean;
  icon?: React.ReactNode; iconBg?: string; iconColor?: string;
}) {
  return (
    <div className={`card-hover p-5 ${alert ? 'border-red-200 bg-red-50/30' : ''}`}>
      {icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${alert ? 'bg-red-100 text-red-500' : (iconBg ?? 'bg-surface')} ${alert ? '' : (iconColor ?? 'text-ink-secondary')}`}>
          {icon}
        </div>
      )}
      <p className={`text-[22px] font-bold tracking-tight ${alert ? 'text-red-600' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-ink-muted mt-1 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-ink-muted/70 mt-0.5">{sub}</p>}
    </div>
  );
}
