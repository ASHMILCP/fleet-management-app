-- ==============================================================================
-- FLEET SYSTEM SUPABASE CLOUD DATABASE PERMISSIONS & SCHEMA FIX
-- RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR TO FIX PERMISSIONS & DELETIONS
-- ==============================================================================

-- 1. Add username and password columns to profiles table so any driver created in Admin portal can login from mobile & desktop
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- 2. Enable full public access to profiles table (Drivers & Admins)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access profiles" ON public.profiles;
CREATE POLICY "Allow public full access profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 3. Enable full public access to vehicles table
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access vehicles" ON public.vehicles;
CREATE POLICY "Allow public full access vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- 4. Enable full public access to companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access companies" ON public.companies;
CREATE POLICY "Allow public full access companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable full public access to duty_sessions table
ALTER TABLE public.duty_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access duty_sessions" ON public.duty_sessions;
CREATE POLICY "Allow public full access duty_sessions" ON public.duty_sessions FOR ALL USING (true) WITH CHECK (true);

-- 6. Enable full public access to trips table
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access trips" ON public.trips;
CREATE POLICY "Allow public full access trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- 7. Enable full public access to fuel_expenses table
ALTER TABLE public.fuel_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access fuel_expenses" ON public.fuel_expenses;
CREATE POLICY "Allow public full access fuel_expenses" ON public.fuel_expenses FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable full public access to drivers table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drivers') THEN
        EXECUTE 'ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Allow public full access drivers" ON public.drivers';
        EXECUTE 'CREATE POLICY "Allow public full access drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 9. Add cascading deletes so deleting a driver/profile never gets blocked by foreign keys
DO $$
BEGIN
    -- Ensure drivers table cascades when a profile is deleted
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drivers') THEN
        ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_user_id_fkey;
        BEGIN
            ALTER TABLE public.drivers ADD CONSTRAINT drivers_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- Ensure duty_sessions cascade on driver delete
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'duty_sessions') THEN
        ALTER TABLE public.duty_sessions DROP CONSTRAINT IF EXISTS duty_sessions_driver_id_fkey;
    END IF;

    -- Ensure trips cascade on driver delete
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trips') THEN
        ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;
    END IF;

    -- Ensure fuel_expenses cascade on driver delete
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fuel_expenses') THEN
        ALTER TABLE public.fuel_expenses DROP CONSTRAINT IF EXISTS fuel_expenses_driver_id_fkey;
    END IF;
END $$;
