import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';

interface ExportFilters {
  startDate: string;
  endDate: string;
  vehicleIds?: string[];
}

async function fetchExportData(filters: ExportFilters) {
  const { startDate, endDate, vehicleIds } = filters;

  let fuelQuery = supabase
    .from('fuel_fills')
    .select('vehicle_id, price_ht, price_ttc, liters, km_at_fill, station_name, filled_at, vehicle:vehicles!vehicle_id(plate)')
    .gte('filled_at', startDate)
    .lte('filled_at', endDate)
    .order('filled_at');

  let cleaningQuery = supabase
    .from('cleanings')
    .select('vehicle_id, price_ttc, cleaned_at, vehicle:vehicles!vehicle_id(plate)')
    .gte('cleaned_at', startDate)
    .lte('cleaned_at', endDate);

  let maintenanceQuery = supabase
    .from('maintenances')
    .select('vehicle_id, type, cost, km_at_service, service_date, vehicle:vehicles!vehicle_id(plate)')
    .gte('service_date', startDate)
    .lte('service_date', endDate);

  let incidentQuery = supabase
    .from('incidents')
    .select('vehicle_id, type, description, amount, incident_date, paid, vehicle:vehicles!vehicle_id(plate)')
    .gte('incident_date', startDate)
    .lte('incident_date', endDate);

  let recurringQuery = supabase
    .from('recurring_costs')
    .select('vehicle_id, label, amount, frequency, start_date, vehicle:vehicles!vehicle_id(plate)')
    .eq('active', true);

  let extraQuery = supabase
    .from('extra_costs')
    .select('vehicle_id, label, amount, cost_date, notes, vehicle:vehicles!vehicle_id(plate)')
    .gte('cost_date', startDate)
    .lte('cost_date', endDate);

  if (vehicleIds && vehicleIds.length > 0) {
    fuelQuery = fuelQuery.in('vehicle_id', vehicleIds);
    cleaningQuery = cleaningQuery.in('vehicle_id', vehicleIds);
    maintenanceQuery = maintenanceQuery.in('vehicle_id', vehicleIds);
    incidentQuery = incidentQuery.in('vehicle_id', vehicleIds);
    recurringQuery = recurringQuery.in('vehicle_id', vehicleIds);
    extraQuery = extraQuery.in('vehicle_id', vehicleIds);
  }

  const [fuel, cleaning, maintenance, incidents, recurring, extra] = await Promise.all([
    fuelQuery, cleaningQuery, maintenanceQuery, incidentQuery, recurringQuery, extraQuery,
  ]);

  return {
    fuel: fuel.data ?? [],
    cleaning: cleaning.data ?? [],
    maintenance: maintenance.data ?? [],
    incidents: incidents.data ?? [],
    recurring: recurring.data ?? [],
    extra: extra.data ?? [],
  };
}

function getPlate(row: Record<string, unknown>): string {
  const v = row.vehicle as Record<string, unknown> | null;
  return (v?.plate as string) ?? '—';
}

export async function exportExcel(filters: ExportFilters): Promise<void> {
  const data = await fetchExportData(filters);
  const wb = XLSX.utils.book_new();

  // Carburant
  const fuelRows = data.fuel.map((r: Record<string, unknown>) => ({
    Plaque: getPlate(r),
    'Prix HT': r.price_ht,
    'Prix TTC': r.price_ttc,
    Litres: r.liters,
    Kilométrage: r.km_at_fill,
    Station: r.station_name ?? '',
    Date: r.filled_at ? new Date(r.filled_at as string).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fuelRows), 'Carburant');

  // Nettoyage
  const cleanRows = data.cleaning.map((r: Record<string, unknown>) => ({
    Plaque: getPlate(r),
    'Prix TTC': r.price_ttc,
    Date: r.cleaned_at ? new Date(r.cleaned_at as string).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cleanRows), 'Nettoyage');

  // Entretiens
  const maintRows = data.maintenance.map((r: Record<string, unknown>) => ({
    Plaque: getPlate(r),
    Type: r.type,
    Coût: r.cost,
    'KM au service': r.km_at_service,
    Date: r.service_date ? new Date(r.service_date as string).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(maintRows), 'Entretiens');

  // Incidents
  const incRows = data.incidents.map((r: Record<string, unknown>) => ({
    Plaque: getPlate(r),
    Type: r.type,
    Description: r.description,
    Montant: r.amount,
    Payé: r.paid ? 'Oui' : 'Non',
    Date: r.incident_date ? new Date(r.incident_date as string).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incRows), 'Incidents');

  // Frais récurrents
  const recRows = data.recurring.map((r: Record<string, unknown>) => ({
    Plaque: getPlate(r),
    Libellé: r.label,
    Montant: r.amount,
    Fréquence: r.frequency,
    Début: r.start_date ? new Date(r.start_date as string).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recRows), 'Frais récurrents');

  // Frais ponctuels
  const extRows = data.extra.map((r: Record<string, unknown>) => ({
    Plaque: getPlate(r),
    Libellé: r.label,
    Montant: r.amount,
    Notes: r.notes ?? '',
    Date: r.cost_date ? new Date(r.cost_date as string).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(extRows), 'Frais ponctuels');

  // Récapitulatif
  const fuelTotal = data.fuel.reduce((s: number, r: Record<string, unknown>) => s + Number(r.price_ttc ?? 0), 0);
  const cleanTotal = data.cleaning.reduce((s: number, r: Record<string, unknown>) => s + Number(r.price_ttc ?? 0), 0);
  const maintTotal = data.maintenance.reduce((s: number, r: Record<string, unknown>) => s + Number(r.cost ?? 0), 0);
  const incTotal = data.incidents.reduce((s: number, r: Record<string, unknown>) => s + Number(r.amount ?? 0), 0);

  const summary = [
    { Catégorie: 'Carburant', Total: fuelTotal.toFixed(2) },
    { Catégorie: 'Nettoyage', Total: cleanTotal.toFixed(2) },
    { Catégorie: 'Entretiens', Total: maintTotal.toFixed(2) },
    { Catégorie: 'Incidents', Total: incTotal.toFixed(2) },
    { Catégorie: 'TOTAL', Total: (fuelTotal + cleanTotal + maintTotal + incTotal).toFixed(2) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Récapitulatif');

  XLSX.writeFile(wb, `Flot_Export_${filters.startDate}_${filters.endDate}.xlsx`);
}

export async function exportPDF(filters: ExportFilters): Promise<void> {
  const data = await fetchExportData(filters);
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(46, 125, 50);
  doc.text('Flot — Rapport Comptable', 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Période : ${filters.startDate} au ${filters.endDate}`, 14, 30);

  let y = 40;

  // Carburant
  if (data.fuel.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Plaque', 'Prix HT', 'Prix TTC', 'Litres', 'KM', 'Station', 'Date']],
      body: data.fuel.map((r: Record<string, unknown>) => [
        String(getPlate(r)),
        Number(r.price_ht).toFixed(2),
        Number(r.price_ttc).toFixed(2),
        r.liters ? Number(r.liters).toFixed(1) : '—',
        String(r.km_at_fill ?? ''),
        String(r.fuel_type ?? r.station_name ?? ''),
        r.filled_at ? new Date(r.filled_at as string).toLocaleDateString('fr-FR') : '',
      ] as string[]),
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50] },
      margin: { left: 14 },
    });
    y = (doc as unknown as Record<string, unknown>).lastAutoTable
      ? ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable.finalY ?? y) + 10
      : y + 20;
  }

  // Summary
  const fuelTotal = data.fuel.reduce((s: number, r: Record<string, unknown>) => s + Number(r.price_ttc ?? 0), 0);
  const cleanTotal = data.cleaning.reduce((s: number, r: Record<string, unknown>) => s + Number(r.price_ttc ?? 0), 0);
  const maintTotal = data.maintenance.reduce((s: number, r: Record<string, unknown>) => s + Number(r.cost ?? 0), 0);
  const incTotal = data.incidents.reduce((s: number, r: Record<string, unknown>) => s + Number(r.amount ?? 0), 0);
  const grandTotal = fuelTotal + cleanTotal + maintTotal + incTotal;

  autoTable(doc, {
    startY: y,
    head: [['Catégorie', 'Total (€)']],
    body: [
      ['Carburant', fuelTotal.toFixed(2)],
      ['Nettoyage', cleanTotal.toFixed(2)],
      ['Entretiens', maintTotal.toFixed(2)],
      ['Incidents', incTotal.toFixed(2)],
      ['TOTAL', grandTotal.toFixed(2)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50] },
    margin: { left: 14 },
  });

  doc.save(`Flot_Rapport_${filters.startDate}_${filters.endDate}.pdf`);
}
