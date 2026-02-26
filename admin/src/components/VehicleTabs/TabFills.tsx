import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PhotoViewer from '../PhotoViewer';

interface FuelFill {
  id: string;
  price_ht: number;
  price_ttc: number;
  liters: number | null;
  km_at_fill: number;
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
        .select('id, price_ht, price_ttc, liters, km_at_fill, station_name, receipt_photo_url, filled_at, driver:profiles!driver_id(full_name)')
        .eq('vehicle_id', vehicleId)
        .order('filled_at', { ascending: false });
      setFills((data as unknown as FuelFill[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [vehicleId]);

  if (loading) return <p className="text-gray-500">Chargement...</p>;
  if (fills.length === 0) return <p className="text-gray-500">Aucun plein enregistré</p>;

  const fmt = (n: number) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 px-2">Date</th>
            <th className="py-2 px-2">HT</th>
            <th className="py-2 px-2">TTC</th>
            <th className="py-2 px-2">Litres</th>
            <th className="py-2 px-2">KM</th>
            <th className="py-2 px-2">Station</th>
            <th className="py-2 px-2">Conducteur</th>
            <th className="py-2 px-2">Ticket</th>
          </tr>
        </thead>
        <tbody>
          {fills.map((f) => (
            <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-2">{fmtDate(f.filled_at)}</td>
              <td className="py-2 px-2">{fmt(f.price_ht)} €</td>
              <td className="py-2 px-2 font-medium">{fmt(f.price_ttc)} €</td>
              <td className="py-2 px-2">{f.liters ? fmt(f.liters) : '—'}</td>
              <td className="py-2 px-2">{f.km_at_fill.toLocaleString('fr-FR')}</td>
              <td className="py-2 px-2">{f.station_name ?? '—'}</td>
              <td className="py-2 px-2">{(f.driver as unknown as { full_name: string })?.full_name ?? '—'}</td>
              <td className="py-2 px-2">
                <PhotoViewer bucket="receipts" path={f.receipt_photo_url} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
