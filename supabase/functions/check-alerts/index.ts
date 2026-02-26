import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface AlertSettings {
  alert_inspection_days_before: number;
  alert_maintenance_days_before: number;
  alert_maintenance_km_before: number;
  fuel_alert_threshold_l100: number;
  no_fill_alert_days: number;
}

interface Vehicle {
  id: string;
  plate: string;
  driver_id: string | null;
  next_inspection_date: string | null;
  next_maintenance_date: string | null;
  next_maintenance_km: number | null;
  alert_inspection_days_before: number;
  alert_maintenance_days_before: number;
  alert_maintenance_km_before: number;
  fuel_alert_threshold_l100: number;
  no_fill_alert_days: number;
  documents: Record<string, { expiry?: string }>;
}

async function getGlobalSettings(): Promise<AlertSettings> {
  const { data } = await supabase
    .from("alert_settings")
    .select("alert_inspection_days_before, alert_maintenance_days_before, alert_maintenance_km_before, fuel_alert_threshold_l100, no_fill_alert_days")
    .limit(1)
    .single();

  return data ?? {
    alert_inspection_days_before: 30,
    alert_maintenance_days_before: 14,
    alert_maintenance_km_before: 500,
    fuel_alert_threshold_l100: 12.0,
    no_fill_alert_days: 7,
  };
}

function getThreshold(vehicle: Vehicle, key: keyof AlertSettings, global: AlertSettings): number {
  const val = vehicle[key as keyof Vehicle];
  if (val !== null && val !== undefined) return val as number;
  return global[key];
}

async function alertExists(vehicleId: string, type: string): Promise<boolean> {
  const { count } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .eq("type", type)
    .eq("acknowledged", false);

  return (count ?? 0) > 0;
}

async function createAlert(vehicleId: string, type: string, message: string, payload: Record<string, unknown> = {}) {
  if (await alertExists(vehicleId, type)) return;

  await supabase.from("alerts").insert({
    vehicle_id: vehicleId,
    type,
    message,
    payload,
  });
}

async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  if (!expoPushToken) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        sound: "default",
      }),
    });
  } catch (err) {
    console.error("Push notification failed:", err);
  }
}

async function getAdminTokens(): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("role", "admin")
    .not("expo_push_token", "is", null);

  return (data ?? []).map((p) => p.expo_push_token).filter(Boolean);
}

async function getDriverToken(driverId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("expo_push_token")
    .eq("id", driverId)
    .single();

  return data?.expo_push_token ?? null;
}

async function notifyAdmins(title: string, body: string) {
  const tokens = await getAdminTokens();
  for (const token of tokens) {
    await sendPushNotification(token, title, body);
  }
}

async function checkDailyAlerts() {
  const global = await getGlobalSettings();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, plate, driver_id, next_inspection_date, next_maintenance_date, next_maintenance_km, alert_inspection_days_before, alert_maintenance_days_before, alert_maintenance_km_before, fuel_alert_threshold_l100, no_fill_alert_days, documents");

  if (!vehicles) return;

  const now = new Date();

  for (const v of vehicles as Vehicle[]) {
    // CT expiry
    if (v.next_inspection_date) {
      const daysBeforeCT = getThreshold(v, "alert_inspection_days_before", global);
      const ctDate = new Date(v.next_inspection_date);
      const diffDays = Math.floor((ctDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= daysBeforeCT) {
        const msg = `CT du véhicule ${v.plate} expire dans ${diffDays} jour(s) (${v.next_inspection_date})`;
        await createAlert(v.id, "ct_expiry", msg, { days_remaining: diffDays });
        await notifyAdmins("⚠️ CT à renouveler", msg);
        if (v.driver_id) {
          const token = await getDriverToken(v.driver_id);
          if (token) await sendPushNotification(token, "⚠️ CT à renouveler", msg);
        }
      }
    }

    // Maintenance date
    if (v.next_maintenance_date) {
      const daysBefore = getThreshold(v, "alert_maintenance_days_before", global);
      const maintDate = new Date(v.next_maintenance_date);
      const diffDays = Math.floor((maintDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= daysBefore) {
        const msg = `Entretien du véhicule ${v.plate} prévu dans ${diffDays} jour(s) (${v.next_maintenance_date})`;
        await createAlert(v.id, "maintenance_due", msg, { days_remaining: diffDays, trigger: "date" });
        await notifyAdmins("🔧 Entretien prévu", msg);
        if (v.driver_id) {
          const token = await getDriverToken(v.driver_id);
          if (token) await sendPushNotification(token, "🔧 Entretien prévu", msg);
        }
      }
    }

    // Maintenance KM
    if (v.next_maintenance_km) {
      const kmBefore = getThreshold(v, "alert_maintenance_km_before", global);
      const { data: lastFill } = await supabase
        .from("fuel_fills")
        .select("km_at_fill")
        .eq("vehicle_id", v.id)
        .order("filled_at", { ascending: false })
        .limit(1)
        .single();

      if (lastFill && lastFill.km_at_fill > v.next_maintenance_km - kmBefore) {
        const remaining = v.next_maintenance_km - lastFill.km_at_fill;
        const msg = `Entretien du véhicule ${v.plate} dans ${remaining} km (seuil: ${v.next_maintenance_km} km)`;
        await createAlert(v.id, "maintenance_due", msg, { km_remaining: remaining, trigger: "km" });
        await notifyAdmins("🔧 Entretien km proche", msg);
      }
    }

    // No fill
    const noFillDays = getThreshold(v, "no_fill_alert_days", global);
    const { data: lastFillDate } = await supabase
      .from("fuel_fills")
      .select("filled_at")
      .eq("vehicle_id", v.id)
      .order("filled_at", { ascending: false })
      .limit(1)
      .single();

    if (lastFillDate) {
      const lastFilled = new Date(lastFillDate.filled_at);
      const daysSince = Math.floor((now.getTime() - lastFilled.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= noFillDays) {
        const msg = `Aucun plein pour ${v.plate} depuis ${daysSince} jour(s)`;
        await createAlert(v.id, "no_fill", msg, { days_since: daysSince });
        await notifyAdmins("⛽ Sans plein", msg);
      }
    }

    // Document expiry
    if (v.documents && typeof v.documents === "object") {
      for (const [docName, docInfo] of Object.entries(v.documents)) {
        if (docInfo?.expiry) {
          const expiryDate = new Date(docInfo.expiry);
          const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) {
            const msg = `Document "${docName}" du véhicule ${v.plate} expire dans ${diffDays} jour(s)`;
            await createAlert(v.id, "document_expiry", msg, { document: docName, days_remaining: diffDays });
            await notifyAdmins("📄 Document expirant", msg);
          }
        }
      }
    }

    // Replacement ending
    const { data: replacements } = await supabase
      .from("driver_assignments")
      .select("id, driver_id, end_date")
      .eq("vehicle_id", v.id)
      .eq("type", "replacement")
      .not("end_date", "is", null);

    if (replacements) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      for (const r of replacements) {
        if (r.end_date === tomorrowStr) {
          const msg = `Remplacement sur ${v.plate} se termine demain (${r.end_date})`;
          await createAlert(v.id, "replacement_ending", msg, { assignment_id: r.id });
          await notifyAdmins("🔄 Fin de remplacement", msg);
          const token = await getDriverToken(r.driver_id);
          if (token) await sendPushNotification(token, "🔄 Fin de remplacement", msg);
        }
      }
    }
  }

  // Custom reminders
  const { data: reminders } = await supabase
    .from("custom_reminders")
    .select("id, vehicle_id, label, reminder_date, alert_days_before")
    .eq("done", false);

  if (reminders) {
    for (const r of reminders) {
      const reminderDate = new Date(r.reminder_date);
      const diffDays = Math.floor((reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= (r.alert_days_before ?? 14)) {
        const { data: veh } = await supabase
          .from("vehicles")
          .select("plate")
          .eq("id", r.vehicle_id)
          .single();
        const plate = veh?.plate ?? "inconnu";
        const msg = `Rappel "${r.label}" pour ${plate} dans ${diffDays} jour(s)`;
        await createAlert(r.vehicle_id, "custom_reminder", msg, { reminder_id: r.id });
        await notifyAdmins("📌 Rappel", msg);
      }
    }
  }

  // Unacknowledged incidents → alert for admin
  const { data: newIncidents } = await supabase
    .from("incidents")
    .select("id, vehicle_id, type, description")
    .eq("acknowledged", false);

  if (newIncidents) {
    for (const inc of newIncidents) {
      const { data: veh } = await supabase
        .from("vehicles")
        .select("plate")
        .eq("id", inc.vehicle_id)
        .single();
      const plate = veh?.plate ?? "inconnu";
      const msg = `Incident non traité sur ${plate}: ${inc.type} — ${inc.description}`;
      await createAlert(inc.vehicle_id, "incident", msg, { incident_id: inc.id });
      await notifyAdmins("🚨 Incident signalé", msg);
    }
  }
}

async function checkHighConsumption(fuelFillId: string) {
  const global = await getGlobalSettings();

  const { data: fill } = await supabase
    .from("fuel_fills")
    .select("id, vehicle_id, liters, km_at_fill, filled_at")
    .eq("id", fuelFillId)
    .single();

  if (!fill || !fill.liters) return;

  const { data: prevFill } = await supabase
    .from("fuel_fills")
    .select("km_at_fill")
    .eq("vehicle_id", fill.vehicle_id)
    .lt("filled_at", fill.filled_at)
    .order("filled_at", { ascending: false })
    .limit(1)
    .single();

  if (!prevFill) return;

  const kmDiff = fill.km_at_fill - prevFill.km_at_fill;
  if (kmDiff <= 0) return;

  const consumption = (Number(fill.liters) / kmDiff) * 100;

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("plate, fuel_alert_threshold_l100")
    .eq("id", fill.vehicle_id)
    .single();

  const threshold = vehicle?.fuel_alert_threshold_l100 ?? global.fuel_alert_threshold_l100;

  if (consumption > threshold) {
    const msg = `Consommation élevée sur ${vehicle?.plate ?? "?"}: ${consumption.toFixed(1)} L/100km (seuil: ${threshold} L/100km)`;
    await createAlert(fill.vehicle_id, "high_consumption", msg, {
      consumption: consumption.toFixed(1),
      threshold,
      fuel_fill_id: fill.id,
    });
    await notifyAdmins("⛽ Consommation élevée", msg);
  }
}

async function generateMonthlyReport() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, so this is previous month since we run on 1st
  const prevMonth = month === 0 ? 12 : month;
  const prevYear = month === 0 ? year - 1 : year;
  const period = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const startDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
  const endDate = `${month === 0 ? year : prevYear}-${String(month === 0 ? 1 : prevMonth + 1).padStart(2, "0")}-01`;

  // Fuel totals
  const { data: fuelData } = await supabase
    .from("fuel_fills")
    .select("price_ht, price_ttc, liters")
    .gte("filled_at", startDate)
    .lt("filled_at", endDate);

  const fuelTotalHT = (fuelData ?? []).reduce((s, f) => s + Number(f.price_ht), 0);
  const fuelTotalTTC = (fuelData ?? []).reduce((s, f) => s + Number(f.price_ttc), 0);
  const fuelTotalLiters = (fuelData ?? []).reduce((s, f) => s + Number(f.liters ?? 0), 0);

  // Cleaning totals
  const { data: cleanData } = await supabase
    .from("cleanings")
    .select("price_ttc")
    .gte("cleaned_at", startDate)
    .lt("cleaned_at", endDate);

  const cleaningTotal = (cleanData ?? []).reduce((s, c) => s + Number(c.price_ttc ?? 0), 0);

  // Maintenance totals
  const { data: maintData } = await supabase
    .from("maintenances")
    .select("cost")
    .gte("service_date", startDate)
    .lt("service_date", endDate);

  const maintenanceTotal = (maintData ?? []).reduce((s, m) => s + Number(m.cost ?? 0), 0);

  // Incident totals
  const { data: incData } = await supabase
    .from("incidents")
    .select("amount, type")
    .gte("incident_date", startDate)
    .lt("incident_date", endDate);

  const incidentTotal = (incData ?? []).reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const incidentCount = (incData ?? []).length;

  // Vehicle count
  const { count: vehicleCount } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true });

  const reportData = {
    period,
    vehicles_count: vehicleCount ?? 0,
    fuel: { total_ht: fuelTotalHT, total_ttc: fuelTotalTTC, total_liters: fuelTotalLiters, fills_count: (fuelData ?? []).length },
    cleaning: { total_ttc: cleaningTotal, count: (cleanData ?? []).length },
    maintenance: { total: maintenanceTotal, count: (maintData ?? []).length },
    incidents: { total_amount: incidentTotal, count: incidentCount },
    grand_total: fuelTotalTTC + cleaningTotal + maintenanceTotal + incidentTotal,
  };

  await supabase.from("monthly_reports").insert({
    period,
    data: reportData,
  });

  // Create alert for admin
  const { data: allVehicles } = await supabase
    .from("vehicles")
    .select("id")
    .limit(1)
    .single();

  if (allVehicles) {
    const msg = `Rapport mensuel ${period} disponible. Total flotte: ${reportData.grand_total.toFixed(2)} €`;
    await createAlert(allVehicles.id, "monthly_report", msg, { period, report: reportData });
    await notifyAdmins("📊 Rapport mensuel", msg);
  }
}

serve(async (req: Request) => {
  try {
    const { type, fuel_fill_id } = await req.json();

    if (type === "daily") {
      await checkDailyAlerts();
      return new Response(JSON.stringify({ success: true, message: "Alertes quotidiennes vérifiées" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (type === "high_consumption" && fuel_fill_id) {
      await checkHighConsumption(fuel_fill_id);
      return new Response(JSON.stringify({ success: true, message: "Vérification consommation terminée" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (type === "monthly_report") {
      await generateMonthlyReport();
      return new Response(JSON.stringify({ success: true, message: "Rapport mensuel généré" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Type d'alerte inconnu" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-alerts error:", err);
    return new Response(JSON.stringify({ error: "Erreur interne", details: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
