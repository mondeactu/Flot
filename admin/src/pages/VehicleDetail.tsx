import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TabResume from '../components/VehicleTabs/TabResume';
import TabFills from '../components/VehicleTabs/TabFills';
import TabCleanings from '../components/VehicleTabs/TabCleanings';
import TabMaintenances from '../components/VehicleTabs/TabMaintenances';
import TabIncidents from '../components/VehicleTabs/TabIncidents';
import TabCosts from '../components/VehicleTabs/TabCosts';
import TabReminders from '../components/VehicleTabs/TabReminders';
import TabPerformance from '../components/VehicleTabs/TabPerformance';
import DriverAssignmentModal from '../components/DriverAssignmentModal';

const TABS = [
  { key: 'resume', label: 'Résumé' },
  { key: 'fills', label: 'Pleins' },
  { key: 'cleanings', label: 'Nettoyages' },
  { key: 'maintenances', label: 'Entretiens' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'costs', label: 'Frais' },
  { key: 'reminders', label: 'Rappels' },
  { key: 'performance', label: 'Performance' },
] as const;

type TabKey = typeof TABS[number]['key'];

interface Vehicle {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  notes: string | null;
  next_inspection_date: string | null;
  next_maintenance_date: string | null;
  next_maintenance_km: number | null;
  alert_inspection_days_before: number;
  alert_maintenance_days_before: number;
  alert_maintenance_km_before: number;
  fuel_alert_threshold_l100: number;
  no_fill_alert_days: number;
  driver_id: string | null;
  documents: Record<string, unknown>;
  driver: { full_name: string } | null;
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('resume');
  const [showAssignment, setShowAssignment] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchVehicle = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('vehicles')
      .select('id, plate, brand, model, year, notes, next_inspection_date, next_maintenance_date, next_maintenance_km, alert_inspection_days_before, alert_maintenance_days_before, alert_maintenance_km_before, fuel_alert_threshold_l100, no_fill_alert_days, driver_id, documents, driver:profiles!driver_id(full_name)')
      .eq('id', id)
      .single();

    setVehicle(data as unknown as Vehicle | null);
    setLoading(false);
  };

  useEffect(() => { fetchVehicle(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Chargement...</p></div>;
  if (!vehicle) return <div className="text-center py-20"><p className="text-red-500">Véhicule introuvable</p><Link to="/vehicles" className="text-green-700 hover:underline">← Retour</Link></div>;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex items-center gap-4">
        <Link to="/vehicles" className="text-gray-400 hover:text-gray-600">← Retour</Link>
        <h1 className="text-2xl font-extrabold text-green-700">{vehicle.plate}</h1>
        <span className="text-sm text-gray-500">{[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}</span>
      </div>

      {/* Driver info */}
      <div className="bg-white rounded-lg border p-3 flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-500">Conducteur : </span>
          <span className="text-sm font-medium">{(vehicle.driver as unknown as { full_name: string })?.full_name ?? 'Non assigné'}</span>
        </div>
        <button onClick={() => setShowAssignment(true)} className="text-xs px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
          Affecter
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-green-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        {activeTab === 'resume' && <TabResume vehicle={vehicle} onUpdated={fetchVehicle} />}
        {activeTab === 'fills' && <TabFills vehicleId={vehicle.id} />}
        {activeTab === 'cleanings' && <TabCleanings vehicleId={vehicle.id} />}
        {activeTab === 'maintenances' && <TabMaintenances vehicleId={vehicle.id} />}
        {activeTab === 'incidents' && <TabIncidents vehicleId={vehicle.id} />}
        {activeTab === 'costs' && <TabCosts vehicleId={vehicle.id} />}
        {activeTab === 'reminders' && <TabReminders vehicleId={vehicle.id} />}
        {activeTab === 'performance' && <TabPerformance vehicleId={vehicle.id} />}
      </div>

      {showAssignment && (
        <DriverAssignmentModal
          vehicleId={vehicle.id}
          currentDriverId={vehicle.driver_id}
          onClose={() => setShowAssignment(false)}
          onSaved={fetchVehicle}
        />
      )}
    </div>
  );
}
