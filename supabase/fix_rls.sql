-- ==============================================================================
-- FLEET SYSTEM SUPABASE DIRECT CLOUD DATABASE PERMISSIONS FIX (RUN IN SQL EDITOR)
-- ==============================================================================

-- Enable full public access to profiles table (Drivers & Admins)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access profiles" ON public.profiles;
CREATE POLICY "Allow public full access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- Enable full public access to vehicles table
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access vehicles" ON public.vehicles;
CREATE POLICY "Allow public full access vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- Enable full public access to companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access companies" ON public.companies;
CREATE POLICY "Allow public full access companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- Enable full public access to duty_sessions table
ALTER TABLE public.duty_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access duty_sessions" ON public.duty_sessions;
CREATE POLICY "Allow public full access duty_sessions" ON public.duty_sessions FOR ALL USING (true) WITH CHECK (true);

-- Enable full public access to trips table
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access trips" ON public.trips;
CREATE POLICY "Allow public full access trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- Enable full public access to fuel_expenses table
ALTER TABLE public.fuel_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access fuel_expenses" ON public.fuel_expenses;
CREATE POLICY "Allow public full access fuel_expenses" ON public.fuel_expenses FOR ALL USING (true) WITH CHECK (true);

-- Enable full public access to drivers table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drivers') THEN
        EXECUTE 'ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Allow public full access drivers" ON public.drivers';
        EXECUTE 'CREATE POLICY "Allow public full access drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;
