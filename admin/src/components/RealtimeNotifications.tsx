import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { showToast } from './Toast';

export default function RealtimeNotifications() {
  useEffect(() => {
    // Channel for fuel fills
    const fuelChannel = supabase
      .channel('realtime-fuel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fuel_fills' },
        async (payload) => {
          const record = payload.new as Record<string, unknown>;
          const info = await fetchDriverAndVehicle(
            record.driver_id as string,
            record.vehicle_id as string
          );
          showToast({
            type: 'fuel',
            title: 'Nouveau plein enregistre',
            message: `${info.driver} — ${info.plate} — ${Number(record.price_ttc || 0).toFixed(2)} EUR ${record.fuel_type ? `(${record.fuel_type})` : ''}`,
          });
          notifyDataUpdated();
        }
      )
      .subscribe();

    // Channel for cleanings
    const cleaningChannel = supabase
      .channel('realtime-cleaning')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cleanings' },
        async (payload) => {
          const record = payload.new as Record<string, unknown>;
          const info = await fetchDriverAndVehicle(
            record.driver_id as string,
            record.vehicle_id as string
          );
          showToast({
            type: 'cleaning',
            title: 'Nouveau nettoyage enregistre',
            message: `${info.driver} — ${info.plate} — ${record.price_ttc ? Number(record.price_ttc).toFixed(2) + ' EUR' : 'Sans prix'}`,
          });
          notifyDataUpdated();
        }
      )
      .subscribe();

    // Channel for incidents
    const incidentChannel = supabase
      .channel('realtime-incident')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        async (payload) => {
          const record = payload.new as Record<string, unknown>;
          const info = await fetchDriverAndVehicle(
            record.driver_id as string,
            record.vehicle_id as string
          );
          const typeLabel = getIncidentTypeLabel(record.type as string);
          showToast({
            type: 'incident',
            title: `Incident signale : ${typeLabel}`,
            message: `${info.driver} — ${info.plate}`,
          });
          notifyDataUpdated();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(fuelChannel);
      supabase.removeChannel(cleaningChannel);
      supabase.removeChannel(incidentChannel);
    };
  }, []);

  return null; // Invisible component, only manages subscriptions
}

async function fetchDriverAndVehicle(
  driverId: string,
  vehicleId: string
): Promise<{ driver: string; plate: string }> {
  try {
    const [driverRes, vehicleRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', driverId).single(),
      supabase.from('vehicles').select('plate').eq('id', vehicleId).single(),
    ]);
    return {
      driver: driverRes.data?.full_name ?? 'Conducteur inconnu',
      plate: vehicleRes.data?.plate ?? '—',
    };
  } catch {
    return { driver: 'Conducteur', plate: '—' };
  }
}

function getIncidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    panne: 'Panne',
    accident: 'Accident',
    degat: 'Degat',
    amende: 'Amende',
    pneu: 'Pneu',
    autre: 'Autre',
  };
  return labels[type] || type;
}

function notifyDataUpdated() {
  window.dispatchEvent(new CustomEvent('flot:data-updated'));
}
