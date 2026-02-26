-- ============================================================
-- Flot — Seed Data (development / demo)
-- ============================================================

-- Ensure alert_settings has at least one row
INSERT INTO alert_settings (
  alert_inspection_days_before,
  alert_maintenance_days_before,
  alert_maintenance_km_before,
  fuel_alert_threshold_l100,
  no_fill_alert_days
) VALUES (30, 14, 500, 12.0, 7)
ON CONFLICT DO NOTHING;
