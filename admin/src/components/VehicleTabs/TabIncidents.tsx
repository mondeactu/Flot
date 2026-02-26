import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PhotoViewer from '../PhotoViewer';

const TYPE_LABELS: Record<string, string> = {
  panne: '🔧 Panne', accident: '💥 Accident', degat: '🔍 Dégât',
  amende: '📋 Amende', pneu: '🔴 Pneu crevé', autre: '📝 Autre',
};

interface Incident {
  id: string;
  type: string;
  description: string;
  amount: number | null;
  incident_date: string;
  photo_url: string | null;
  paid: boolean;
  acknowledged: boolean;
  notes: string | null;
  driver: { full_name: string } | null;
}

export default function TabIncidents({ vehicleId }: { vehicleId: string }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('id, type, description, amount, incident_date, photo_url, paid, acknowledged, notes, driver:profiles!driver_id(full_name)')
      .eq('vehicle_id', vehicleId)
      .order('incident_date', { ascending: false });
    setIncidents((data as unknown as Incident[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  const toggleAcknowledged = async (id: string, current: boolean) => {
    await supabase.from('incidents').update({ acknowledged: !current }).eq('id', id);
    fetchData();
  };

  if (loading) return <p className="text-gray-500">Chargement...</p>;
  if (incidents.length === 0) return <p className="text-gray-500">Aucun incident signalé</p>;

  return (
    <div className="space-y-3">
      {incidents.map((inc) => (
        <div key={inc.id} className={`border rounded-lg p-4 ${inc.acknowledged ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-orange-300 bg-orange-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{TYPE_LABELS[inc.type] ?? inc.type}</span>
            <span className="text-xs text-gray-500">{new Date(inc.incident_date).toLocaleDateString('fr-FR')}</span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{inc.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{(inc.driver as unknown as { full_name: string })?.full_name ?? '—'}</span>
            {inc.amount && <span className="font-medium text-red-600">{Number(inc.amount).toFixed(2)} €</span>}
            {inc.paid && <span className="text-green-600">Payé</span>}
          </div>
          {inc.photo_url && (
            <div className="mt-2">
              <PhotoViewer bucket="incidents" path={inc.photo_url} alt="Photo incident" />
            </div>
          )}
          <button
            onClick={() => toggleAcknowledged(inc.id, inc.acknowledged)}
            className={`mt-3 text-xs px-3 py-1 rounded ${inc.acknowledged ? 'bg-gray-200 text-gray-600' : 'bg-green-700 text-white'}`}
          >
            {inc.acknowledged ? 'Traité ✓' : 'Marquer comme traité'}
          </button>
        </div>
      ))}
    </div>
  );
}
