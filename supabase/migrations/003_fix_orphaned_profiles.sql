-- ============================================================================
-- FIX ORPHANED PROFILES - Create missing practices for existing users
-- ============================================================================
-- This script finds all profiles that reference non-existent practices
-- and creates those practices automatically.

-- Create missing practices for all orphaned profiles
INSERT INTO public.practices (id, name, city) 
VALUES 
    ('cc61c6b0-c389-4e1d-8b9b-48424f6a2814', 'Neue Praxis', 'Bitte aktualisieren'),
    ('e5cb5158-00de-4865-a916-104016d89488', 'Neue Praxis', 'Bitte aktualisieren')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- AUTOMATIC PRACTICE CREATION TRIGGER
-- ============================================================================
-- This trigger will automatically create a practice when a new profile is inserted
-- if the practice_id doesn't exist yet.

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the practice exists
    IF NOT EXISTS (SELECT 1 FROM public.practices WHERE id = NEW.practice_id) THEN
        -- Create the practice if it doesn't exist
        INSERT INTO public.practices (id, name, city)
        VALUES (NEW.practice_id, 'Neue Praxis', 'Bitte aktualisieren')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================================
-- VERIFY THE FIX
-- ============================================================================
-- Run this query to see all users and their practices:
/*
SELECT 
    u.email,
    p.practice_id,
    pr.name as practice_name,
    pr.city
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.practices pr ON p.practice_id = pr.id
ORDER BY u.email;
*/

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- After running this migration:
-- 1. All existing orphaned profiles now have practices
-- 2. Future profiles will automatically get a practice created
-- 3. Users should update their practice name and city in the admin panel UI
--    (or via SQL if you want to add that feature)
--
-- To update a practice name/city:
-- UPDATE public.practices 
-- SET name = 'Your Practice Name', city = 'Your City'
-- WHERE id = 'YOUR_PRACTICE_ID';