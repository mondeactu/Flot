import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PhotoViewer from '../PhotoViewer';

interface FuelFill {
  id: string;
  price_ht: number;
  price_ttc: number;
  liters: number | null;
  km_at_fill: number;
  fuel_type: string | null;
  station_name: string | null;
  receipt_photo_url: string | null;
  filled_at: string;
  driver: { full_name: string } | null;
}

export default function TabFills({ vehicleId }: { vehicleId: string }) {
  const [fills, setFills] = useState<FuelFill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('fuel_fills')
        .select('id, price_ht, price_ttc, liters, km_at_fill, fuel_type, station_name, receipt_photo_url, filled_at, driver:profiles!driver_id(full_name)')
        .eq('vehicle_id', vehicleId)
        .order('filled_at', { ascending: false });
      setFills((data as unknown as FuelFill[]) ?? []);
      setLoading(false);
    };
    fetch();

    // Listen for realtime refresh
    const handler = () => fetch();
    window.addEventListener('flot:data-updated', handler);
    return () => window.removeEventListener('flot:data-updated', handler);
  }, [vehicleId]);

  if (loading) return <p className="text-ink-muted">Chargement...</p>;
  if (fills.length === 0) return <p className="text-ink-muted">Aucun plein enregistre</p>;

  const fmt = (n: number) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="table-header">Date</th>
            <th className="table-header">HT</th>
            <th className="table-header">TTC</th>
            <th className="table-header">Litres</th>
            <th className="table-header">KM</th>
            <th className="table-header">Type</th>
            <th className="table-header">Conducteur</th>
            <th className="table-header">Ticket</th>
          </tr>
        </thead>
        <tbody>
          {fills.map((f) => (
            <tr key={f.id} className="border-b border-border-light hover:bg-surface">
              <td className="table-cell">{fmtDate(f.filled_at)}</td>
              <td className="table-cell">{fmt(f.price_ht)} EUR</td>
              <td className="table-cell font-medium">{fmt(f.price_ttc)} EUR</td>
              <td className="table-cell">{f.liters ? fmt(f.liters) : '—'}</td>
              <td className="table-cell">{f.km_at_fill.toLocaleString('fr-FR')}</td>
              <td className="table-cell">
                {f.fuel_type ? (
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                    f.fuel_type === 'diesel'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-brand-50 text-brand-700'
                  }`}>
                    {f.fuel_type === 'diesel' ? 'Diesel' : 'Essence'}
                  </span>
                ) : (
                  f.station_name ?? '—'
                )}
              </td>
              <td className="table-cell">{(f.driver as unknown as { full_name: string })?.full_name ?? '—'}</td>
              <td className="table-cell">
                <PhotoViewer bucket="receipts" path={f.receipt_photo_url} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
