-- ==============================================================================
-- FLEET MANAGEMENT SYSTEM DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- Timezone: Asia/Kolkata
-- ==============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE user_role AS ENUM ('ADMIN', 'DRIVER');
CREATE TYPE fuel_type_enum AS ENUM ('CNG', 'PETROL');
CREATE TYPE trip_type_enum AS ENUM ('ONE_SIDE', 'TWO_SIDE');
CREATE TYPE duty_status_enum AS ENUM ('ACTIVE', 'COMPLETED');

-- 1. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(100) NOT NULL,
    fuel_type fuel_type_enum NOT NULL DEFAULT 'CNG',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now())
);

-- 2. COMPANIES (Clients for corporate/commute trips)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    billing_rate_per_km NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now())
);

-- 3. PROFILES TABLE (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'DRIVER',
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(20),
    license_number VARCHAR(50),
    assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now())
);

-- 4. DUTY SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.duty_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now()),
    end_time TIMESTAMPTZ,
    status duty_status_enum NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now())
);

-- 5. TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    duty_session_id UUID REFERENCES public.duty_sessions(id) ON DELETE SET NULL,
    one_side_km NUMERIC(10, 2) NOT NULL CHECK (one_side_km > 0),
    trip_type trip_type_enum NOT NULL DEFAULT 'ONE_SIDE',
    multiplier INT NOT NULL CHECK (multiplier IN (1, 2)),
    total_km NUMERIC(10, 2) NOT NULL CHECK (total_km > 0),
    trip_date DATE NOT NULL DEFAULT (timezone('Asia/Kolkata', now()))::date,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now())
);

-- 6. FUEL LOGS TABLE
CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    duty_session_id UUID REFERENCES public.duty_sessions(id) ON DELETE SET NULL,
    fuel_type fuel_type_enum NOT NULL DEFAULT 'CNG',
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    liters_or_kg NUMERIC(10, 2),
    log_date DATE NOT NULL DEFAULT (timezone('Asia/Kolkata', now()))::date,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata', now())
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_duty_sessions_driver_status ON public.duty_sessions(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_driver_date ON public.trips(driver_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_company ON public.trips(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_driver_date ON public.fuel_logs(driver_id, log_date);

-- TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('Asia/Kolkata', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_duty_sessions_updated_at BEFORE UPDATE ON public.duty_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS FOR RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    USING (is_admin());

CREATE POLICY "Drivers can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Drivers can update their own phone and name"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- VEHICLES POLICIES
CREATE POLICY "Admins have full access to vehicles"
    ON public.vehicles FOR ALL
    USING (is_admin());

CREATE POLICY "Drivers can view active vehicles"
    ON public.vehicles FOR SELECT
    USING (is_active = true);

-- COMPANIES POLICIES
CREATE POLICY "Admins have full access to companies"
    ON public.companies FOR ALL
    USING (is_admin());

CREATE POLICY "Drivers can view active companies"
    ON public.companies FOR SELECT
    USING (is_active = true);

-- DUTY SESSIONS POLICIES
CREATE POLICY "Admins have full access to duty_sessions"
    ON public.duty_sessions FOR ALL
    USING (is_admin());

CREATE POLICY "Drivers can select their own duty_sessions"
    ON public.duty_sessions FOR SELECT
    USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert their own duty_sessions"
    ON public.duty_sessions FOR INSERT
    WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own active duty_sessions"
    ON public.duty_sessions FOR UPDATE
    USING (auth.uid() = driver_id);

-- TRIPS POLICIES
CREATE POLICY "Admins have full access to trips"
    ON public.trips FOR ALL
    USING (is_admin());

CREATE POLICY "Drivers can view their own trips"
    ON public.trips FOR SELECT
    USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can create their own trips"
    ON public.trips FOR INSERT
    WITH CHECK (auth.uid() = driver_id);

-- FUEL LOGS POLICIES
CREATE POLICY "Admins have full access to fuel_logs"
    ON public.fuel_logs FOR ALL
    USING (is_admin());

CREATE POLICY "Drivers can view their own fuel_logs"
    ON public.fuel_logs FOR SELECT
    USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can create their own fuel_logs"
    ON public.fuel_logs FOR INSERT
    WITH CHECK (auth.uid() = driver_id);

-- AUTH TRIGGER: Automatically create public.profiles when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (
        NEW.id,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'DRIVER'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Driver'),
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP & RECREATE TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- SEED DATA FOR DEMO & TESTING
-- ==============================================================================

-- Seed Vehicles
INSERT INTO public.vehicles (id, registration_number, model, fuel_type, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'DL-01-AB-1234', 'Maruti Suzuki Dzire Tour S (CNG)', 'CNG', true),
    ('22222222-2222-2222-2222-222222222222', 'MH-02-CD-5678', 'Tata Tigor Xpress-T', 'CNG', true),
    ('33333333-3333-3333-3333-333333333333', 'KA-03-EF-9012', 'Hyundai Aura Prime (Petrol)', 'PETROL', true),
    ('44444444-4444-4444-4444-444444444444', 'HR-26-GH-3456', 'Toyota Innova Crysta', 'PETROL', false)
ON CONFLICT (registration_number) DO NOTHING;

-- Seed Companies
INSERT INTO public.companies (id, name, contact_person, phone, billing_rate_per_km, is_active)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Infosys Tech Park Campus', 'Rajesh Sharma', '+91 98765 43210', 18.50, true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tata Consultancy Services - Gateway', 'Pooja Verma', '+91 98765 11223', 20.00, true),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Apollo Health City Express', 'Dr. Sunil Menon', '+91 98765 55667', 22.00, true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Amazon Fulfillment Center HYD-1', 'Ankit Gupta', '+91 98765 99887', 19.00, true),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Wipro Technologies SEZ', 'Deepa Nair', '+91 98765 33445', 17.50, false)
ON CONFLICT (id) DO NOTHING;
