import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PhotoViewer from '../PhotoViewer';

interface Cleaning {
  id: string;
  price_ttc: number | null;
  photo_front_url: string | null;
  photo_rear_url: string | null;
  photo_left_url: string | null;
  photo_right_url: string | null;
  photo_interior_url: string | null;
  vehicle_state_photo_url: string | null;
  receipt_photo_url: string | null;
  notes: string | null;
  cleaned_at: string;
  driver: { full_name: string } | null;
}

export default function TabCleanings({ vehicleId }: { vehicleId: string }) {
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('cleanings')
        .select('id, price_ttc, photo_front_url, photo_rear_url, photo_left_url, photo_right_url, photo_interior_url, vehicle_state_photo_url, receipt_photo_url, notes, cleaned_at, driver:profiles!driver_id(full_name)')
        .eq('vehicle_id', vehicleId)
        .order('cleaned_at', { ascending: false });
      setCleanings((data as unknown as Cleaning[]) ?? []);
      setLoading(false);
    };
    fetch();

    // Listen for realtime refresh
    const handler = () => fetch();
    window.addEventListener('flot:data-updated', handler);
    return () => window.removeEventListener('flot:data-updated', handler);
  }, [vehicleId]);

  if (loading) return <p className="text-gray-500">Chargement...</p>;
  if (cleanings.length === 0) return <p className="text-gray-500">Aucun nettoyage enregistre</p>;

  return (
    <div className="space-y-4">
      {cleanings.map((c) => (
        <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-sm font-medium text-gray-800">
                {new Date(c.cleaned_at).toLocaleDateString('fr-FR')}
              </span>
              <span className="text-sm text-gray-500 ml-3">
                {(c.driver as unknown as { full_name: string })?.full_name ?? '—'}
              </span>
            </div>
            {c.price_ttc && (
              <span className="text-sm font-bold text-green-700">
                {Number(c.price_ttc).toFixed(2)} EUR
              </span>
            )}
          </div>

          <div className="mb-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Photos</p>
            <div className="flex gap-2 flex-wrap">
              {/* New vehicle state photo (new flow) */}
              {c.vehicle_state_photo_url && (
                <PhotoViewer bucket="cleanings" path={c.vehicle_state_photo_url} alt="Etat vehicule" />
              )}
              {/* Receipt photo */}
              <PhotoViewer bucket="cleanings" path={c.receipt_photo_url} alt="Ticket" />
              {/* Old flow photos (backward compat) */}
              {c.photo_front_url && <PhotoViewer bucket="cleanings" path={c.photo_front_url} alt="Avant" />}
              {c.photo_rear_url && <PhotoViewer bucket="cleanings" path={c.photo_rear_url} alt="Arriere" />}
              {c.photo_left_url && <PhotoViewer bucket="cleanings" path={c.photo_left_url} alt="Gauche" />}
              {c.photo_right_url && <PhotoViewer bucket="cleanings" path={c.photo_right_url} alt="Droite" />}
              {c.photo_interior_url && <PhotoViewer bucket="cleanings" path={c.photo_interior_url} alt="Interieur" />}
            </div>
          </div>

          {c.notes && <p className="text-sm text-gray-500 mt-2">{c.notes}</p>}
        </div>
      ))}
    </div>
  );
}
