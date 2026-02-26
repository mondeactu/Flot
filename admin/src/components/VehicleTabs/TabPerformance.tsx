import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../../lib/supabase';

interface FuelPoint { date: string; consumption: number; }
interface CostPoint { month: string; fuel: number; cleaning: number; maintenance: number; }

export default function TabPerformance({ vehicleId }: { vehicleId: string }) {
  const [fuelData, setFuelData] = useState<FuelPoint[]>([]);
  const [costData, setCostData] = useState<CostPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgConsumption, setAvgConsumption] = useState(0);

  useEffect(() => {
    const fetchPerformance = async () => {
      // Fuel consumption
      const { data: fills } = await supabase
        .from('fuel_fills')
        .select('liters, km_at_fill, filled_at')
        .eq('vehicle_id', vehicleId)
        .order('filled_at', { ascending: true })
        .limit(13);

      if (fills && fills.length > 1) {
        const points: FuelPoint[] = [];
        for (let i = 1; i < fills.length; i++) {
          const kmDiff = fills[i].km_at_fill - fills[i - 1].km_at_fill;
          if (kmDiff > 0 && fills[i].liters) {
            const consumption = (Number(fills[i].liters) / kmDiff) * 100;
            points.push({
              date: new Date(fills[i].filled_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
              consumption: Math.round(consumption * 10) / 10,
            });
          }
        }
        setFuelData(points);
        if (points.length > 0) {
          setAvgConsumption(Math.round((points.reduce((s, p) => s + p.consumption, 0) / points.length) * 10) / 10);
        }
      }

      // Monthly costs (last 12 months)
      const now = new Date();
      const months: CostPoint[] = [];

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = d.toISOString().split('T')[0];
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        const label = d.toLocaleDateString('fr-FR', { month: 'short' });

        const [fuelRes, cleanRes, maintRes] = await Promise.all([
          supabase.from('fuel_fills').select('price_ttc').eq('vehicle_id', vehicleId).gte('filled_at', start).lte('filled_at', end),
          supabase.from('cleanings').select('price_ttc').eq('vehicle_id', vehicleId).gte('cleaned_at', start).lte('cleaned_at', end),
          supabase.from('maintenances').select('cost').eq('vehicle_id', vehicleId).gte('service_date', start).lte('service_date', end),
        ]);

        months.push({
          month: label,
          fuel: (fuelRes.data ?? []).reduce((s, r) => s + Number(r.price_ttc ?? 0), 0),
          cleaning: (cleanRes.data ?? []).reduce((s, r) => s + Number(r.price_ttc ?? 0), 0),
          maintenance: (maintRes.data ?? []).reduce((s, r) => s + Number(r.cost ?? 0), 0),
        });
      }

      setCostData(months);
      setLoading(false);
    };

    fetchPerformance();
  }, [vehicleId]);

  if (loading) return <p className="text-gray-500">Chargement des statistiques...</p>;

  return (
    <div className="space-y-8">
      {/* Consumption chart */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2">
          Consommation (L/100km) — Moyenne : {avgConsumption} L/100km
        </h4>
        {fuelData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={fuelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="consumption" stroke="#2E7D32" strokeWidth={2} dot={{ r: 4 }} name="L/100km" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm">Pas assez de données</p>
        )}
      </div>

      {/* Monthly costs chart */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2">Coûts mensuels (12 mois)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`} />
            <Bar dataKey="fuel" stackId="a" fill="#2E7D32" name="Carburant" />
            <Bar dataKey="cleaning" stackId="a" fill="#42A5F5" name="Nettoyage" />
            <Bar dataKey="maintenance" stackId="a" fill="#FF9800" name="Entretien" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
