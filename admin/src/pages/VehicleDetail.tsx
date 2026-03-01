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
import { ArrowLeft, Truck, User } from 'lucide-react';

const TABS = [
  { key: 'resume', label: 'Resume' },
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-700/30 border-t-brand-700 rounded-full animate-spin" /></div>;
  if (!vehicle) return (
    <div className="text-center py-24">
      <p className="text-red-500 font-medium mb-3">Vehicule introuvable</p>
      <Link to="/vehicles" className="text-brand-700 hover:underline font-medium text-sm">Retour aux vehicules</Link>
    </div>
  );

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/vehicles" className="p-2 hover:bg-surface rounded-xl transition-colors text-ink-muted hover:text-ink">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
            <Truck size={20} className="text-brand-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink tracking-tight">{vehicle.plate}</h1>
            <p className="text-xs text-ink-muted">{[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}</p>
          </div>
        </div>
      </div>

      {/* Driver info */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-surface rounded-lg flex items-center justify-center">
            <User size={16} className="text-ink-muted" />
          </div>
          <div>
            <p className="text-[11px] text-ink-muted uppercase tracking-wide font-medium">Conducteur</p>
            <p className="text-sm font-semibold text-ink">{(vehicle.driver as unknown as { full_name: string })?.full_name ?? 'Non assigne'}</p>
          </div>
        </div>
        <button onClick={() => setShowAssignment(true)} className="btn-primary text-xs py-2 px-4">
          Affecter
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-surface text-ink-secondary hover:bg-white hover:text-ink border border-transparent hover:border-border-light'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card p-5 md:p-6">
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
