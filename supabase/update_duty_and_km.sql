-- ==============================================================================
-- UPDATE: DUTY SESSIONS TYPE & DAILY TOTAL KM EXTENSION
-- Adds duty_type ('NAVY' | 'UBER') and total_km to duty_sessions table
-- Timezone: Asia/Kolkata
-- ==============================================================================

-- 1. Add duty_type column to duty_sessions (default 'NAVY' for backward compatibility)
ALTER TABLE public.duty_sessions 
ADD COLUMN IF NOT EXISTS duty_type VARCHAR(20) NOT NULL DEFAULT 'NAVY';

-- 2. Add total_km column to duty_sessions to record daily total KM run upon logout
ALTER TABLE public.duty_sessions 
ADD COLUMN IF NOT EXISTS total_km NUMERIC(10, 2) DEFAULT 0.00;

-- 3. Add total_working_minutes column if not present
ALTER TABLE public.duty_sessions 
ADD COLUMN IF NOT EXISTS total_working_minutes INT DEFAULT 0;

-- 4. Index for high-performance driver duty querying
CREATE INDEX IF NOT EXISTS idx_duty_sessions_driver_duty_status 
ON public.duty_sessions(driver_id, duty_type, status);

