-- ============================================================================
-- QUICK FIX: Create Missing Practice
-- ============================================================================
-- This script creates a practice for the existing user profile that has
-- practice_id: cc61c6b0-c389-4e1d-8b9b-48424f6a2814

-- Step 1: Create the practice with the specific UUID
INSERT INTO public.practices (id, name, city) 
VALUES 
    ('cc61c6b0-c389-4e1d-8b9b-48424f6a2814', 'Ihre Praxis', 'Stadt')
ON CONFLICT (id) DO NOTHING;

-- Step 2: (Optional) Add some example providers to this practice
-- Uncomment the lines below if you want to add doctors to your practice:

-- INSERT INTO public.providers (practice_id, name, specialty, is_active) 
-- VALUES 
--     ('cc61c6b0-c389-4e1d-8b9b-48424f6a2814', 'Dr. Anna Müller', 'Allgemeinmedizin', true),
--     ('cc61c6b0-c389-4e1d-8b9b-48424f6a2814', 'Dr. Thomas Weber', 'Innere Medizin', true)
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFY THE FIX
-- ============================================================================
-- Run these queries to verify everything is set up correctly:

-- Check that the practice was created:
-- SELECT * FROM public.practices WHERE id = 'cc61c6b0-c389-4e1d-8b9b-48424f6a2814';

-- Check the user's profile:
-- SELECT 
--   p.id,
--   p.practice_id,
--   p.role,
--   pr.name as practice_name,
--   pr.city
-- FROM public.profiles p
-- JOIN public.practices pr ON p.practice_id = pr.id
-- WHERE p.practice_id = 'cc61c6b0-c389-4e1d-8b9b-48424f6a2814';

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Refresh your admin panel - it should now load successfully
-- 3. Update the practice name and city by running:
--    UPDATE public.practices 
--    SET name = 'Your Practice Name', city = 'Your City'
--    WHERE id = 'cc61c6b0-c389-4e1d-8b9b-48424f6a2814';
-- 4. Add providers (doctors) using the app UI or SQL:
--    INSERT INTO public.providers (practice_id, name, specialty, is_active) 
--    VALUES ('cc61c6b0-c389-4e1d-8b9b-48424f6a2814', 'Dr. Name', 'Specialty', true);
