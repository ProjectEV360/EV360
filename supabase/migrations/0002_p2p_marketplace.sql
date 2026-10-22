-- EV360 Peer-to-Peer Home Charging Marketplace Migration
-- Migration: 0002_p2p_marketplace.sql

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.merchant_status AS ENUM ('pending_approval', 'approved', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.charger_status AS ENUM ('pending_approval', 'active', 'inactive', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payout_status AS ENUM ('requested', 'processing', 'completed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Merchant Profiles
CREATE TABLE IF NOT EXISTS public.merchant_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  id_document_type text NOT NULL,
  id_document_number text NOT NULL,
  property_type text NOT NULL DEFAULT 'individual_house',
  electricity_tariff_declared boolean NOT NULL DEFAULT true,
  status public.merchant_status NOT NULL DEFAULT 'pending_approval',
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  upi_id text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Home Chargers (Marketplace Listings)
CREATE TABLE IF NOT EXISTS public.home_chargers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  charger_brand text NOT NULL,
  charger_model text,
  current_type text NOT NULL DEFAULT 'AC',
  connector_type text NOT NULL DEFAULT 'Type 2',
  power_kw numeric NOT NULL,
  pricing_type text NOT NULL DEFAULT 'per_kwh',
  price_rate numeric NOT NULL,
  address_full text NOT NULL,
  address_approx text NOT NULL,
  city text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  approx_lat double precision NOT NULL,
  approx_lng double precision NOT NULL,
  access_instructions text,
  photos text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  available_days text[] NOT NULL DEFAULT '{"Mon","Tue","Wed","Thu","Fri","Sat","Sun"}',
  start_time text NOT NULL DEFAULT '08:00',
  end_time text NOT NULL DEFAULT '22:00',
  instant_booking boolean NOT NULL DEFAULT true,
  cancellation_policy text NOT NULL DEFAULT 'Flexible: Free cancellation up to 2 hours before scheduled slot.',
  status public.charger_status NOT NULL DEFAULT 'pending_approval',
  rating numeric NOT NULL DEFAULT 5.0,
  total_reviews integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS home_chargers_host_idx ON public.home_chargers(host_id);
CREATE INDEX IF NOT EXISTS home_chargers_city_idx ON public.home_chargers(city);
CREATE INDEX IF NOT EXISTS home_chargers_status_idx ON public.home_chargers(status);

-- 4. Blocked Slots
CREATE TABLE IF NOT EXISTS public.charger_blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charger_id uuid NOT NULL REFERENCES public.home_chargers(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS charger_blocked_slots_time_idx ON public.charger_blocked_slots(charger_id, start_time, end_time);

-- 5. Marketplace Bookings
CREATE TABLE IF NOT EXISTS public.marketplace_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,
  charger_id uuid NOT NULL REFERENCES public.home_chargers(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  target_kwh numeric,
  duration_hours numeric NOT NULL DEFAULT 1,
  status public.booking_status NOT NULL DEFAULT 'pending_payment',
  subtotal_amount numeric NOT NULL,
  platform_commission_rate numeric NOT NULL DEFAULT 0.10,
  platform_commission_amount numeric NOT NULL,
  merchant_earnings numeric NOT NULL,
  total_amount numeric NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  cancellation_reason text,
  cancelled_by text,
  refund_amount numeric DEFAULT 0,
  access_revealed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS bookings_charger_time_idx ON public.marketplace_bookings(charger_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON public.marketplace_bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_host_idx ON public.marketplace_bookings(host_id);

-- 6. Payout Requests
CREATE TABLE IF NOT EXISTS public.marketplace_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status public.payout_status NOT NULL DEFAULT 'requested',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  payout_method text NOT NULL DEFAULT 'bank_transfer',
  reference_id text,
  admin_notes text
);

CREATE INDEX IF NOT EXISTS payouts_host_idx ON public.marketplace_payouts(host_id);

-- 7. Reviews
CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.marketplace_bookings(id) ON DELETE CASCADE UNIQUE,
  charger_id uuid NOT NULL REFERENCES public.home_chargers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Marketplace Global Settings
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketplace_settings (key, value)
VALUES
  ('platform_commission_percent', '10'::jsonb),
  ('min_payout_inr', '500'::jsonb),
  ('marketplace_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS public.marketplace_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Enable Row Level Security
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_chargers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charger_blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. Security & Access Grants
GRANT SELECT ON public.home_chargers, public.marketplace_reviews, public.marketplace_settings TO anon, authenticated;
GRANT ALL ON public.merchant_profiles, public.home_chargers, public.charger_blocked_slots, public.marketplace_bookings, public.marketplace_payouts, public.marketplace_reviews, public.marketplace_settings, public.marketplace_audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.merchant_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_chargers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charger_blocked_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_bookings TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_payouts TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_reviews TO authenticated;

-- 12. RLS Policies
-- Merchant Profile: Users manage their own merchant profile
CREATE POLICY "Users read own merchant profile" ON public.merchant_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own merchant profile" ON public.merchant_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own merchant profile" ON public.merchant_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Home Chargers: Public can view active chargers; hosts manage their own
CREATE POLICY "Anyone view active home chargers" ON public.home_chargers
  FOR SELECT TO anon, authenticated USING (status = 'active' OR auth.uid() = host_id);
CREATE POLICY "Hosts insert home chargers" ON public.home_chargers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts update own home chargers" ON public.home_chargers
  FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts delete own home chargers" ON public.home_chargers
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- Bookings: User can view bookings they made OR hosts can view bookings for their chargers
CREATE POLICY "Users and Hosts view bookings" ON public.marketplace_bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = host_id);
CREATE POLICY "Users create bookings" ON public.marketplace_bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users or Hosts update bookings" ON public.marketplace_bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = host_id);

-- Blocked Slots: Anyone can see blocked slots for scheduling; hosts manage them
CREATE POLICY "Anyone view blocked slots" ON public.charger_blocked_slots
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Hosts manage blocked slots" ON public.charger_blocked_slots
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.home_chargers WHERE id = charger_id AND host_id = auth.uid())
  );

-- Payouts: Hosts view and request their own payouts
CREATE POLICY "Hosts view own payouts" ON public.marketplace_payouts
  FOR SELECT TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "Hosts request payouts" ON public.marketplace_payouts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

-- Reviews: Anyone view reviews; booking renter can insert review
CREATE POLICY "Anyone view reviews" ON public.marketplace_reviews
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Renters insert review" ON public.marketplace_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
