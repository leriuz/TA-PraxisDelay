-- Waittime Admin Panel - Testing & Verification Queries
-- Run these queries to verify your setup and test the system

-- ============================================================================
-- 1. VERIFY INITIAL SETUP
-- ============================================================================

-- Check that all tables were created
SELECT 
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('practices', 'providers', 'profiles', 'delay_status')
ORDER BY tablename;

-- Check that the view was created
SELECT 
  viewname,
  schemaname
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'v_delay_current';

-- Check RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('practices', 'providers', 'profiles', 'delay_status')
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFY SEED DATA
-- ============================================================================

-- List all practices
SELECT 
  id,
  name,
  city,
  created_at
FROM public.practices
ORDER BY name;

-- List all providers with their practice
SELECT 
  pv.id,
  pv.name as provider_name,
  pv.specialty,
  pv.is_active,
  pr.name as practice_name,
  pr.city
FROM public.providers pv
JOIN public.practices pr ON pv.practice_id = pr.id
ORDER BY pr.name, pv.name;

-- Count providers per practice
SELECT 
  pr.name as practice_name,
  pr.city,
  COUNT(pv.id) as total_providers,
  COUNT(CASE WHEN pv.is_active THEN 1 END) as active_providers
FROM public.practices pr
LEFT JOIN public.providers pv ON pr.id = pv.practice_id
GROUP BY pr.id, pr.name, pr.city
ORDER BY pr.name;

-- ============================================================================
-- 3. VERIFY USER SETUP
-- ============================================================================

-- List all MPA users with their practices
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created,
  p.role,
  pr.name as practice_name,
  pr.city
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.practices pr ON p.practice_id = pr.id
ORDER BY u.email;

-- Find users without a profile (needs fixing)
SELECT 
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- ============================================================================
-- 4. INSERT TEST DELAY DATA
-- ============================================================================

-- Insert practice-wide delay (20 minutes)
-- Replace <USER_UUID> with actual MPA user UUID
INSERT INTO public.delay_status (
  practice_id,
  provider_id,
  delay_minutes,
  updated_by
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- Seed practice
  NULL,  -- Practice-wide
  20,
  '<USER_UUID>'  -- Replace with actual user UUID
)
ON CONFLICT (practice_id, provider_id) 
DO UPDATE SET
  delay_minutes = EXCLUDED.delay_minutes,
  updated_by = EXCLUDED.updated_by,
  updated_at = now();

-- Insert per-provider delays
-- Get provider IDs first:
SELECT id, name FROM public.providers 
WHERE practice_id = '550e8400-e29b-41d4-a716-446655440000';

-- Then insert (replace <PROVIDER_ID> and <USER_UUID>):
INSERT INTO public.delay_status (
  practice_id,
  provider_id,
  delay_minutes,
  updated_by
)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', '<PROVIDER_ID_1>', 15, '<USER_UUID>'),
  ('550e8400-e29b-41d4-a716-446655440000', '<PROVIDER_ID_2>', 30, '<USER_UUID>'),
  ('550e8400-e29b-41d4-a716-446655440000', '<PROVIDER_ID_3>', 5, '<USER_UUID>')
ON CONFLICT (practice_id, provider_id) 
DO UPDATE SET
  delay_minutes = EXCLUDED.delay_minutes,
  updated_by = EXCLUDED.updated_by,
  updated_at = now();

-- ============================================================================
-- 5. VIEW CURRENT DELAYS
-- ============================================================================

-- All delays with full context
SELECT 
  pr.name as practice_name,
  pr.city,
  COALESCE(pv.name, 'Praxisweit') as provider_name,
  pv.specialty,
  ds.delay_minutes,
  ds.updated_at,
  u.email as updated_by,
  EXTRACT(EPOCH FROM (now() - ds.updated_at)) / 60 as minutes_since_update
FROM public.delay_status ds
JOIN public.practices pr ON ds.practice_id = pr.id
LEFT JOIN public.providers pv ON ds.provider_id = pv.id
LEFT JOIN auth.users u ON ds.updated_by = u.id
ORDER BY pr.name, ds.provider_id NULLS FIRST;

-- Delays for specific practice
SELECT 
  COALESCE(pv.name, 'Praxisweit') as provider,
  ds.delay_minutes,
  ds.updated_at,
  EXTRACT(EPOCH FROM (now() - ds.updated_at)) / 60 as minutes_ago
FROM public.delay_status ds
LEFT JOIN public.providers pv ON ds.provider_id = pv.id
WHERE ds.practice_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY ds.provider_id NULLS FIRST;

-- Check the patient app view
SELECT * FROM public.v_delay_current
WHERE practice_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY provider_id NULLS FIRST;

-- ============================================================================
-- 6. TEST RLS POLICIES
-- ============================================================================

-- As database admin, you can see everything:
SELECT COUNT(*) as total_practices FROM public.practices;
SELECT COUNT(*) as total_providers FROM public.providers;
SELECT COUNT(*) as total_delays FROM public.delay_status;

-- To test as a specific user, you would need to use the Supabase client
-- or set the JWT context (not shown here, requires valid JWT)

-- ============================================================================
-- 7. ACTIVITY MONITORING
-- ============================================================================

-- Recent updates (last hour)
SELECT 
  pr.name as practice_name,
  COALESCE(pv.name, 'Praxisweit') as provider,
  ds.delay_minutes,
  ds.updated_at,
  u.email as updated_by
FROM public.delay_status ds
JOIN public.practices pr ON ds.practice_id = pr.id
LEFT JOIN public.providers pv ON ds.provider_id = pv.id
LEFT JOIN auth.users u ON ds.updated_by = u.id
WHERE ds.updated_at > now() - interval '1 hour'
ORDER BY ds.updated_at DESC;

-- Update frequency per practice (useful for analytics)
SELECT 
  pr.name as practice_name,
  COUNT(*) as total_updates,
  MIN(ds.updated_at) as first_update,
  MAX(ds.updated_at) as last_update,
  AVG(ds.delay_minutes) as avg_delay
FROM public.delay_status ds
JOIN public.practices pr ON ds.practice_id = pr.id
WHERE ds.updated_at > now() - interval '7 days'
GROUP BY pr.id, pr.name
ORDER BY total_updates DESC;

-- ============================================================================
-- 8. DATA CLEANUP (USE WITH CAUTION)
-- ============================================================================

-- Delete all delay data for testing (can be recreated)
-- UNCOMMENT ONLY IF YOU WANT TO RESET:
-- DELETE FROM public.delay_status;

-- Reset specific practice delays to 0
-- UPDATE public.delay_status
-- SET delay_minutes = 0, updated_at = now()
-- WHERE practice_id = '<PRACTICE_ID>';

-- Delete old delays (older than 30 days)
-- DELETE FROM public.delay_status
-- WHERE updated_at < now() - interval '30 days';

-- ============================================================================
-- 9. USEFUL DEBUGGING QUERIES
-- ============================================================================

-- Check constraints are working
-- These should fail:
-- INSERT INTO public.delay_status (practice_id, delay_minutes, updated_by)
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 185, '<USER_UUID>');  -- Over 180
-- 
-- INSERT INTO public.delay_status (practice_id, delay_minutes, updated_by)
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 7, '<USER_UUID>');  -- Not multiple of 5

-- Find delays that haven't been updated recently (stale data)
SELECT 
  pr.name as practice_name,
  COALESCE(pv.name, 'Praxisweit') as provider,
  ds.delay_minutes,
  ds.updated_at,
  EXTRACT(EPOCH FROM (now() - ds.updated_at)) / 3600 as hours_since_update
FROM public.delay_status ds
JOIN public.practices pr ON ds.practice_id = pr.id
LEFT JOIN public.providers pv ON ds.provider_id = pv.id
WHERE ds.updated_at < now() - interval '2 hours'
ORDER BY ds.updated_at;

-- ============================================================================
-- 10. PERFORMANCE TESTING
-- ============================================================================

-- Check index usage (should use indexes)
EXPLAIN ANALYZE
SELECT * FROM public.delay_status
WHERE practice_id = '550e8400-e29b-41d4-a716-446655440000';

EXPLAIN ANALYZE
SELECT * FROM public.providers
WHERE practice_id = '550e8400-e29b-41d4-a716-446655440000';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- After running these queries, you should see:
-- ✅ All tables created and RLS enabled
-- ✅ Seed practice with 3 providers
-- ✅ At least one MPA user with a profile
-- ✅ Delay data showing in v_delay_current view
-- 
-- If any of these are missing, refer to SETUP_GUIDE.md for troubleshooting
-- ============================================================================
