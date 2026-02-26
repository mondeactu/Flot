-- ============================================================
-- Flot — Initial Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'driver')),
  phone text,
  expo_push_token text,
  created_at timestamptz DEFAULT now()
);

-- Global alert settings (one row, managed by admin)
CREATE TABLE alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_inspection_days_before int DEFAULT 30,
  alert_maintenance_days_before int DEFAULT 14,
  alert_maintenance_km_before int DEFAULT 500,
  fuel_alert_threshold_l100 float DEFAULT 12.0,
  no_fill_alert_days int DEFAULT 7,
  updated_at timestamptz DEFAULT now()
);

-- Vehicles
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text UNIQUE NOT NULL,
  brand text,
  model text,
  year int,
  driver_id uuid REFERENCES profiles(id),
  notes text,
  next_inspection_date date,
  next_maintenance_date date,
  next_maintenance_km int,
  alert_inspection_days_before int DEFAULT 30,
  alert_maintenance_days_before int DEFAULT 14,
  alert_maintenance_km_before int DEFAULT 500,
  fuel_alert_threshold_l100 float DEFAULT 12.0,
  no_fill_alert_days int DEFAULT 7,
  documents jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Driver assignments (history + replacements)
CREATE TABLE driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL CHECK (type IN ('titular', 'replacement')),
  start_date date NOT NULL,
  end_date date,
  confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Fuel fills
CREATE TABLE fuel_fills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  receipt_photo_url text,
  price_ht numeric(10,2) NOT NULL,
  price_ttc numeric(10,2) NOT NULL,
  tva numeric(10,2) GENERATED ALWAYS AS (price_ttc - price_ht) STORED,
  liters numeric(8,2),
  km_at_fill int NOT NULL,
  station_name text,
  filled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Cleanings
CREATE TABLE cleanings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  receipt_photo_url text,
  price_ttc numeric(10,2),
  photo_front_url text,
  photo_rear_url text,
  photo_left_url text,
  photo_right_url text,
  photo_interior_url text,
  notes text,
  cleaned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Incidents (all driver-reported problems)
CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL CHECK (type IN (
    'panne', 'accident', 'degat', 'amende', 'pneu', 'autre'
  )),
  description text NOT NULL,
  amount numeric(10,2),
  incident_date date NOT NULL,
  photo_url text,
  paid boolean DEFAULT false,
  paid_at timestamptz,
  notes text,
  acknowledged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Maintenances
CREATE TABLE maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  type text NOT NULL,
  cost numeric(10,2),
  km_at_service int,
  service_date date NOT NULL,
  next_service_date date,
  next_service_km int,
  notes text,
  receipt_photo_url text,
  created_at timestamptz DEFAULT now()
);

-- Recurring costs
CREATE TABLE recurring_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  label text NOT NULL,
  amount numeric(10,2) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'annual')),
  start_date date NOT NULL,
  end_date date,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- One-time extra costs
CREATE TABLE extra_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  label text NOT NULL,
  amount numeric(10,2) NOT NULL,
  cost_date date NOT NULL,
  receipt_photo_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Custom reminders
CREATE TABLE custom_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  label text NOT NULL,
  reminder_date date NOT NULL,
  alert_days_before int DEFAULT 14,
  notes text,
  done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Alerts
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id),
  type text NOT NULL CHECK (type IN (
    'ct_expiry', 'maintenance_due', 'high_consumption',
    'no_fill', 'document_expiry', 'custom_reminder',
    'replacement_ending', 'monthly_report', 'incident'
  )),
  message text NOT NULL,
  payload jsonb DEFAULT '{}',
  triggered_at timestamptz DEFAULT now(),
  acknowledged boolean DEFAULT false
);

-- Monthly reports
CREATE TABLE monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Profiles: user reads/updates own row. Admin reads all.
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Alert settings: admin only
CREATE POLICY "Admin can manage alert_settings"
  ON alert_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Vehicles: driver reads own assigned vehicle. Admin CRUD all.
CREATE POLICY "Driver can read own vehicle"
  ON vehicles FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Admin full access on vehicles"
  ON vehicles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Driver assignments: admin only CRUD
CREATE POLICY "Admin full access on driver_assignments"
  ON driver_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Driver can read own assignments"
  ON driver_assignments FOR SELECT
  USING (driver_id = auth.uid());

-- Fuel fills: driver INSERT + read own rows. Admin CRUD all.
CREATE POLICY "Driver can insert fuel_fills"
  ON fuel_fills FOR INSERT
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Driver can read own fuel_fills"
  ON fuel_fills FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Admin full access on fuel_fills"
  ON fuel_fills FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Cleanings: driver INSERT + read own rows. Admin CRUD all.
CREATE POLICY "Driver can insert cleanings"
  ON cleanings FOR INSERT
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Driver can read own cleanings"
  ON cleanings FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Admin full access on cleanings"
  ON cleanings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Incidents: driver INSERT + read own rows. Admin CRUD all.
CREATE POLICY "Driver can insert incidents"
  ON incidents FOR INSERT
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Driver can read own incidents"
  ON incidents FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "Admin full access on incidents"
  ON incidents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Maintenances: admin only CRUD
CREATE POLICY "Admin full access on maintenances"
  ON maintenances FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Recurring costs: admin only CRUD
CREATE POLICY "Admin full access on recurring_costs"
  ON recurring_costs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Extra costs: admin only CRUD
CREATE POLICY "Admin full access on extra_costs"
  ON extra_costs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Custom reminders: admin only CRUD
CREATE POLICY "Admin full access on custom_reminders"
  ON custom_reminders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Alerts: admin full. Driver reads own vehicle alerts.
CREATE POLICY "Admin full access on alerts"
  ON alerts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Driver can read own vehicle alerts"
  ON alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = alerts.vehicle_id
      AND vehicles.driver_id = auth.uid()
    )
  );

-- Monthly reports: admin only
CREATE POLICY "Admin full access on monthly_reports"
  ON monthly_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- INSERT DEFAULT ALERT SETTINGS ROW
-- ============================================================
INSERT INTO alert_settings (id) VALUES (gen_random_uuid());
