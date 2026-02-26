import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifyAdmin(authHeader: string): Promise<string> {
  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) throw new Error("Token invalide");

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") throw new Error("Accès refusé : rôle admin requis");

  return user.id;
}

async function checkIfAdminExists(): Promise<boolean> {
  const { count } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  return (count ?? 0) > 0;
}

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Setup action: create first admin (no auth required, but only if no admin exists)
    if (action === "setup_admin") {
      const { email, password, full_name } = body;

      if (!email || !password || !full_name) {
        return new Response(JSON.stringify({ error: "Email, mot de passe et nom complet requis" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const adminExists = await checkIfAdminExists();
      if (adminExists) {
        return new Response(JSON.stringify({ error: "Un administrateur existe déjà. Utilisez /login." }), {
          status: 403, headers: corsHeaders,
        });
      }

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createErr || !newUser.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Erreur lors de la création du compte" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const { error: profileErr } = await adminClient.from("profiles").insert({
        id: newUser.user.id,
        full_name,
        role: "admin",
      });

      if (profileErr) {
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 500, headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Compte administrateur créé", user_id: newUser.user.id }), {
        headers: corsHeaders,
      });
    }

    // All other actions require admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header manquant" }), {
        status: 401, headers: corsHeaders,
      });
    }

    await verifyAdmin(authHeader);

    // Create driver
    if (action === "create_driver") {
      const { email, password, full_name, phone } = body;

      if (!email || !password || !full_name) {
        return new Response(JSON.stringify({ error: "Email, mot de passe et nom complet requis" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createErr || !newUser.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Erreur lors de la création" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const { error: profileErr } = await adminClient.from("profiles").insert({
        id: newUser.user.id,
        full_name,
        role: "driver",
        phone: phone ?? null,
      });

      if (profileErr) {
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 500, headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id, message: "Conducteur créé" }), {
        headers: corsHeaders,
      });
    }

    // Update driver
    if (action === "update_driver") {
      const { driver_id, full_name, phone, email, password } = body;

      if (!driver_id) {
        return new Response(JSON.stringify({ error: "driver_id requis" }), {
          status: 400, headers: corsHeaders,
        });
      }

      // Update profile
      const updates: Record<string, unknown> = {};
      if (full_name) updates.full_name = full_name;
      if (phone !== undefined) updates.phone = phone;

      if (Object.keys(updates).length > 0) {
        const { error } = await adminClient.from("profiles").update(updates).eq("id", driver_id);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
        }
      }

      // Update auth email/password if provided
      const authUpdates: Record<string, string> = {};
      if (email) authUpdates.email = email;
      if (password) authUpdates.password = password;

      if (Object.keys(authUpdates).length > 0) {
        const { error } = await adminClient.auth.admin.updateUserById(driver_id, authUpdates);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Conducteur mis à jour" }), {
        headers: corsHeaders,
      });
    }

    // Delete driver
    if (action === "delete_driver") {
      const { driver_id } = body;

      if (!driver_id) {
        return new Response(JSON.stringify({ error: "driver_id requis" }), {
          status: 400, headers: corsHeaders,
        });
      }

      // Remove vehicle assignment
      await adminClient.from("vehicles").update({ driver_id: null }).eq("driver_id", driver_id);

      // Delete profile (cascade will handle auth.users)
      const { error: delProfileErr } = await adminClient.from("profiles").delete().eq("id", driver_id);
      if (delProfileErr) {
        return new Response(JSON.stringify({ error: delProfileErr.message }), { status: 500, headers: corsHeaders });
      }

      // Delete auth user
      const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(driver_id);
      if (delAuthErr) {
        console.error("Auth user delete error:", delAuthErr);
      }

      return new Response(JSON.stringify({ success: true, message: "Conducteur supprimé" }), {
        headers: corsHeaders,
      });
    }

    // Apply global alert settings to all vehicles
    if (action === "apply_global_settings") {
      const { data: settings } = await adminClient
        .from("alert_settings")
        .select("alert_inspection_days_before, alert_maintenance_days_before, alert_maintenance_km_before, fuel_alert_threshold_l100, no_fill_alert_days")
        .limit(1)
        .single();

      if (!settings) {
        return new Response(JSON.stringify({ error: "Paramètres globaux introuvables" }), {
          status: 404, headers: corsHeaders,
        });
      }

      const { error } = await adminClient.from("vehicles").update({
        alert_inspection_days_before: settings.alert_inspection_days_before,
        alert_maintenance_days_before: settings.alert_maintenance_days_before,
        alert_maintenance_km_before: settings.alert_maintenance_km_before,
        fuel_alert_threshold_l100: settings.fuel_alert_threshold_l100,
        no_fill_alert_days: settings.no_fill_alert_days,
      }).neq("id", "00000000-0000-0000-0000-000000000000"); // update all rows

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, message: "Seuils appliqués à tous les véhicules" }), {
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400, headers: corsHeaders,
    });
  } catch (err) {
    console.error("admin-actions error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});
