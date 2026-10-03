CREATE TYPE public.connector_status AS ENUM ('available','in_use','offline');

CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text
);
CREATE TABLE public.stations (
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
CREATE TABLE public.connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  type text NOT NULL,
  power_kw numeric NOT NULL,
  price_per_kwh numeric NOT NULL,
  status public.connector_status NOT NULL DEFAULT 'available'
);
CREATE INDEX ON public.connectors(station_id);
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  connector_types text[] NOT NULL DEFAULT '{}',
  max_charge_kw numeric NOT NULL
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_id)
);
CREATE TABLE public.issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id uuid,
  description text NOT NULL CHECK (char_length(description) BETWEEN 5 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.operators, public.stations, public.connectors, public.vehicles TO anon, authenticated;
GRANT ALL ON public.operators, public.stations, public.connectors, public.vehicles, public.profiles, public.favourites, public.issue_reports TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.favourites TO authenticated;
GRANT INSERT ON public.issue_reports TO anon, authenticated;
GRANT SELECT ON public.issue_reports TO authenticated;

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read operators" ON public.operators FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read stations" ON public.stations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read connectors" ON public.connectors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read vehicles" ON public.vehicles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Own favourites read" ON public.favourites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own favourites insert" ON public.favourites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own favourites delete" ON public.favourites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Anyone can report anonymously" ON public.issue_reports FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "Users report as self" ON public.issue_reports FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users read own reports" ON public.issue_reports FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();