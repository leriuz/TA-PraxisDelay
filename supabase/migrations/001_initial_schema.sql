-- Waittime Admin Panel - Initial Schema
-- This migration creates the database structure for the MPA delay management system

-- ============================================================================
-- 1. PRACTICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. PROVIDERS TABLE (doctors/practitioners in a practice)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_providers_practice_id ON public.providers(practice_id);

-- ============================================================================
-- 3. PROFILES TABLE (links auth.users to practices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE RESTRICT,
    role TEXT DEFAULT 'mpa',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. DELAY_STATUS TABLE (current delay information)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.delay_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
    delay_minutes INT NOT NULL,
    updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT check_delay_range CHECK (delay_minutes >= 0 AND delay_minutes <= 180),
    CONSTRAINT check_delay_increment CHECK (delay_minutes % 5 = 0),
    
    -- Unique constraint for UPSERT operations
    CONSTRAINT unique_practice_provider UNIQUE (practice_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_delay_status_practice_id ON public.delay_status(practice_id);
CREATE INDEX IF NOT EXISTS idx_delay_status_updated_at ON public.delay_status(updated_at);

-- ============================================================================
-- 5. VIEW FOR PATIENT APP (future native app access)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_delay_current AS
SELECT 
    practice_id, 
    provider_id, 
    delay_minutes, 
    updated_at
FROM public.delay_status;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delay_status ENABLE ROW LEVEL SECURITY;

-- PROFILES: User can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- PRACTICES: User can read their associated practice
CREATE POLICY "Users can read own practice"
    ON public.practices
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.practice_id = practices.id
        )
    );

-- PROVIDERS: User can read providers in their practice
CREATE POLICY "Users can read providers in own practice"
    ON public.providers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.practice_id = providers.practice_id
        )
    );

-- DELAY_STATUS: User can read delay status in their practice
CREATE POLICY "Users can read delay status in own practice"
    ON public.delay_status
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.practice_id = delay_status.practice_id
        )
    );

-- DELAY_STATUS: User can insert delay status in their practice
CREATE POLICY "Users can insert delay status in own practice"
    ON public.delay_status
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.practice_id = delay_status.practice_id
        )
    );

-- DELAY_STATUS: User can update delay status in their practice
CREATE POLICY "Users can update delay status in own practice"
    ON public.delay_status
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.practice_id = delay_status.practice_id
        )
    );

-- ============================================================================
-- 7. SEED DATA (example practice with providers)
-- ============================================================================

-- Insert example practice
INSERT INTO public.practices (id, name, city) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Praxis am Bahnhof', 'Zürich')
ON CONFLICT DO NOTHING;

-- Insert example providers
INSERT INTO public.providers (practice_id, name, specialty, is_active) 
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Dr. Anna Müller', 'Allgemeinmedizin', true),
    ('550e8400-e29b-41d4-a716-446655440000', 'Dr. Thomas Weber', 'Innere Medizin', true),
    ('550e8400-e29b-41d4-a716-446655440000', 'Dr. Sarah Schmidt', 'Pädiatrie', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SETUP INSTRUCTIONS:
-- ============================================================================
-- After running this migration:
--
-- 1. Create an MPA user in Supabase Auth Dashboard:
--    - Email: mpa@praxis-bahnhof.ch
--    - Password: mpa1
--
-- 2. Get the user's UUID from the auth.users table
--
-- 3. Insert a profile entry linking the user to the practice:
--    INSERT INTO public.profiles (id, practice_id, role)
--    VALUES ('<user-uuid>', '550e8400-e29b-41d4-a716-446655440000', 'mpa');
--
-- 4. The MPA user can now log in and manage delays for their practice
-- ============================================================================
