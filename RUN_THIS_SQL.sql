-- ============================================================================
-- 🚨 URGENT: Run this SQL in Supabase SQL Editor to fix the error
-- ============================================================================
-- Error: No practice found with id: e5cb5158-00de-4865-a916-104016d89488
-- 
-- STEPS:
-- 1. Copy this entire file
-- 2. Open Supabase Dashboard → SQL Editor
-- 3. Paste and click "RUN"
-- 4. Refresh your admin panel
-- ============================================================================

-- Create the missing practice
INSERT INTO public.practices (id, name, city) 
VALUES ('e5cb5158-00de-4865-a916-104016d89488', 'Neue Praxis', 'Bitte aktualisieren')
ON CONFLICT (id) DO NOTHING;

-- (Optional but recommended) Prevent this issue for future users
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.practices WHERE id = NEW.practice_id) THEN
        INSERT INTO public.practices (id, name, city)
        VALUES (NEW.practice_id, 'Neue Praxis', 'Bitte aktualisieren')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================================
-- ✅ After running this SQL:
-- 1. Refresh the admin panel (F5)
-- 2. Log in
-- 3. Go to "Einstellungen" tab
-- 4. Update your practice name and city
-- 5. Click "Speichern"
-- ============================================================================
