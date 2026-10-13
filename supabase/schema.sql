-- EV360 Supabase Complete Database Schema & Seed
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/entniojodchtsgcvxpev/sql/new)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.connector_status AS ENUM ('available', 'in_use', 'offline');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Operators Table
CREATE TABLE IF NOT EXISTS public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text
);

-- 3. Stations Table
CREATE TABLE IF NOT EXISTS public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  opening_hours text,
  amenities text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Connectors Table
CREATE TABLE IF NOT EXISTS public.connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  type text NOT NULL,
  power_kw numeric NOT NULL,
  price_per_kwh numeric NOT NULL,
  status public.connector_status NOT NULL DEFAULT 'available'
);
CREATE INDEX IF NOT EXISTS connectors_station_id_idx ON public.connectors(station_id);

-- 5. Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  connector_types text[] NOT NULL DEFAULT '{}',
  max_charge_kw numeric NOT NULL
);

-- 6. Profiles Table (Includes Phone, City, Avatar URL)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  city text,
  avatar_url text,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Favourites Table
CREATE TABLE IF NOT EXISTS public.favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_id)
);

-- 8. Issue Reports Table
CREATE TABLE IF NOT EXISTS public.issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  description text NOT NULL CHECK (char_length(description) BETWEEN 5 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Row Level Security (RLS)
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- 10. Grants
GRANT SELECT ON public.operators, public.stations, public.connectors, public.vehicles TO anon, authenticated;
GRANT ALL ON public.operators, public.stations, public.connectors, public.vehicles, public.profiles, public.favourites, public.issue_reports TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.favourites TO authenticated;
GRANT INSERT ON public.issue_reports TO anon, authenticated;
GRANT SELECT ON public.issue_reports TO authenticated;

-- 11. Policies
DROP POLICY IF EXISTS "Public read operators" ON public.operators;
CREATE POLICY "Public read operators" ON public.operators FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read stations" ON public.stations;
CREATE POLICY "Public read stations" ON public.stations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read connectors" ON public.connectors;
CREATE POLICY "Public read connectors" ON public.connectors FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read vehicles" ON public.vehicles;
CREATE POLICY "Public read vehicles" ON public.vehicles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Own profile read" ON public.profiles;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Own profile insert" ON public.profiles;
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Own profile update" ON public.profiles;
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Own favourites read" ON public.favourites;
CREATE POLICY "Own favourites read" ON public.favourites FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own favourites insert" ON public.favourites;
CREATE POLICY "Own favourites insert" ON public.favourites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own favourites delete" ON public.favourites;
CREATE POLICY "Own favourites delete" ON public.favourites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 12. Trigger to automatically create / update profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, city, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Seed Vehicles (Sample Indian EV Market)
INSERT INTO public.vehicles (id, make, model, connector_types, max_charge_kw) VALUES
('20000000-0000-0000-0000-000000000001', 'Tata', 'Nexon EV', ARRAY['CCS2', 'Type 2'], 50),
('20000000-0000-0000-0000-000000000002', 'Tata', 'Punch EV', ARRAY['CCS2', 'Type 2'], 50),
('20000000-0000-0000-0000-000000000003', 'Tata', 'Tiago EV', ARRAY['CCS2', 'Type 2'], 25),
('20000000-0000-0000-0000-000000000004', 'Tata', 'Curvv EV', ARRAY['CCS2', 'Type 2'], 70),
('20000000-0000-0000-0000-000000000005', 'MG', 'ZS EV', ARRAY['CCS2', 'Type 2'], 76),
('20000000-0000-0000-0000-000000000006', 'MG', 'Comet EV', ARRAY['Type 2'], 7.4),
('20000000-0000-0000-0000-000000000007', 'MG', 'Windsor EV', ARRAY['CCS2', 'Type 2'], 45),
('20000000-0000-0000-0000-000000000008', 'Mahindra', 'XUV400', ARRAY['CCS2', 'Type 2'], 50),
('20000000-0000-0000-0000-000000000009', 'Mahindra', 'BE 6', ARRAY['CCS2', 'Type 2'], 175),
('20000000-0000-0000-0000-000000000010', 'Hyundai', 'Kona Electric', ARRAY['CCS2', 'Type 2'], 77),
('20000000-0000-0000-0000-000000000011', 'Hyundai', 'Ioniq 5', ARRAY['CCS2', 'Type 2'], 220),
('20000000-0000-0000-0000-000000000012', 'BYD', 'Atto 3', ARRAY['CCS2', 'Type 2'], 88),
('20000000-0000-0000-0000-000000000013', 'BYD', 'Seal', ARRAY['CCS2', 'Type 2'], 150),
('20000000-0000-0000-0000-000000000014', 'Kia', 'EV6', ARRAY['CCS2', 'Type 2'], 240),
('20000000-0000-0000-0000-000000000015', 'Tesla', 'Model Y', ARRAY['Tesla/NACS', 'CCS2', 'Type 2'], 250)
ON CONFLICT (id) DO NOTHING;

-- 14. Seed Operators
INSERT INTO public.operators (id, name, logo_url) VALUES
('00000000-0000-0000-0000-000000000001', 'Tata Power EZ Charge', NULL),
('00000000-0000-0000-0000-000000000002', 'Jio-bp pulse', NULL),
('00000000-0000-0000-0000-000000000003', 'Statiq', NULL),
('00000000-0000-0000-0000-000000000004', 'Zeon Charging', NULL),
('00000000-0000-0000-0000-000000000005', 'GLIDA (Fortum)', NULL)
ON CONFLICT (id) DO NOTHING;
