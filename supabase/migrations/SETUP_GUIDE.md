# Supabase Setup Guide for Waittime Admin Panel

## Initial Setup Checklist

- [ ] Run `001_initial_schema.sql` in Supabase SQL Editor
- [ ] Create MPA user in Supabase Auth
- [ ] Link MPA user to practice via profiles table
- [ ] Test login with MPA credentials

## Step-by-Step SQL Operations

### 1. After Running Migration

The migration creates:
- ✅ 4 tables: practices, providers, profiles, delay_status
- ✅ 1 view: v_delay_current (for patient app)
- ✅ RLS policies for all tables
- ✅ Seed data: 1 practice + 3 providers

**Verify the seed data:**

```sql
-- Check practice was created
SELECT * FROM public.practices;

-- Check providers were created
SELECT * FROM public.providers;
```

### 2. Create Your First MPA User

**Step 2a: In Supabase Auth Dashboard**
1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Email: `mpa@praxis-bahnhof.ch`
4. Password: (choose secure password)
5. Click "Create user"
6. **COPY THE USER UUID** (you'll need it next)

**Step 2b: Link User to Practice (SQL Editor)**

```sql
-- Replace <USER_UUID> with the UUID from step 2a
INSERT INTO public.profiles (id, practice_id, role)
VALUES (
  '<USER_UUID>',  -- UUID from auth.users
  '550e8400-e29b-41d4-a716-446655440000',  -- Seed practice ID
  'mpa'
);
```

**Verify:**

```sql
SELECT 
  p.id,
  p.practice_id,
  p.role,
  pr.name as practice_name,
  pr.city
FROM public.profiles p
JOIN public.practices pr ON p.practice_id = pr.id;
```

### 3. Add More Practices

```sql
-- Add a new practice
INSERT INTO public.practices (name, city)
VALUES ('Gruppenpraxis Muster', 'Bern')
RETURNING id;  -- SAVE THIS ID!

-- Example: Add providers to the new practice
-- Replace <NEW_PRACTICE_ID> with the ID from above
INSERT INTO public.providers (practice_id, name, specialty, is_active)
VALUES 
  ('<NEW_PRACTICE_ID>', 'Dr. Martin Huber', 'Allgemeinmedizin', true),
  ('<NEW_PRACTICE_ID>', 'Dr. Claudia Meier', 'Pädiatrie', true),
  ('<NEW_PRACTICE_ID>', 'Dr. Stefan Wolf', 'Innere Medizin', true);
```

### 4. Add MPA User for New Practice

**Step 4a: Create user in Auth Dashboard** (same as step 2a)

**Step 4b: Link to new practice**

```sql
-- Replace <NEW_USER_UUID> and <NEW_PRACTICE_ID>
INSERT INTO public.profiles (id, practice_id, role)
VALUES (
  '<NEW_USER_UUID>',
  '<NEW_PRACTICE_ID>',
  'mpa'
);
```

### 5. Modify Providers

```sql
-- Add a provider to existing practice
INSERT INTO public.providers (practice_id, name, specialty)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Dr. Maria Schneider',
  'Gynäkologie'
);

-- Update provider name
UPDATE public.providers
SET name = 'Dr. Anna Müller-Weber'
WHERE id = '<PROVIDER_ID>';

-- Deactivate a provider (don't delete, preserve history)
UPDATE public.providers
SET is_active = false
WHERE id = '<PROVIDER_ID>';

-- List all providers for a practice
SELECT * FROM public.providers
WHERE practice_id = '<PRACTICE_ID>'
ORDER BY name;
```

### 6. View Current Delay Status

```sql
-- All delays for a practice
SELECT 
  ds.delay_minutes,
  ds.updated_at,
  COALESCE(pv.name, 'Praxisweit') as provider_name,
  pr.name as practice_name
FROM public.delay_status ds
JOIN public.practices pr ON ds.practice_id = pr.id
LEFT JOIN public.providers pv ON ds.provider_id = pv.id
WHERE ds.practice_id = '<PRACTICE_ID>'
ORDER BY ds.provider_id NULLS FIRST;

-- Check practice-wide delay
SELECT * FROM public.delay_status
WHERE practice_id = '<PRACTICE_ID>'
AND provider_id IS NULL;

-- Check per-provider delays
SELECT 
  pv.name,
  pv.specialty,
  ds.delay_minutes,
  ds.updated_at
FROM public.providers pv
LEFT JOIN public.delay_status ds 
  ON pv.id = ds.provider_id
WHERE pv.practice_id = '<PRACTICE_ID>'
ORDER BY pv.name;
```

### 7. Reset All Delays for a Practice

```sql
-- Reset all delays to 0 for a practice
UPDATE public.delay_status
SET 
  delay_minutes = 0,
  updated_at = now()
WHERE practice_id = '<PRACTICE_ID>';

-- Or delete all delays (will show "keine Angabe" in UI)
DELETE FROM public.delay_status
WHERE practice_id = '<PRACTICE_ID>';
```

### 8. Useful Queries for Administration

```sql
-- List all MPAs and their practices
SELECT 
  u.email,
  pr.name as practice_name,
  pr.city,
  p.role,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
JOIN public.practices pr ON p.practice_id = pr.id
ORDER BY pr.name;

-- Find practices without any MPA users
SELECT pr.id, pr.name, pr.city
FROM public.practices pr
LEFT JOIN public.profiles p ON pr.id = p.practice_id
WHERE p.id IS NULL;

-- Count providers per practice
SELECT 
  pr.name,
  pr.city,
  COUNT(pv.id) as provider_count,
  COUNT(CASE WHEN pv.is_active THEN 1 END) as active_count
FROM public.practices pr
LEFT JOIN public.providers pv ON pr.id = pv.practice_id
GROUP BY pr.id, pr.name, pr.city
ORDER BY pr.name;

-- Recent delay updates (last 24 hours)
SELECT 
  pr.name as practice_name,
  COALESCE(pv.name, 'Praxisweit') as provider_name,
  ds.delay_minutes,
  ds.updated_at,
  u.email as updated_by_email
FROM public.delay_status ds
JOIN public.practices pr ON ds.practice_id = pr.id
LEFT JOIN public.providers pv ON ds.provider_id = pv.id
LEFT JOIN auth.users u ON ds.updated_by = u.id
WHERE ds.updated_at > now() - interval '24 hours'
ORDER BY ds.updated_at DESC;
```

### 9. Testing RLS Policies

```sql
-- Test as a specific user (run in SQL Editor with user context)
-- This simulates what the user can see

-- Set the context to a specific user
SET request.jwt.claims.sub = '<USER_UUID>';

-- Now queries will respect RLS as if that user is logged in
SELECT * FROM public.practices;  -- Should only see their practice
SELECT * FROM public.providers;  -- Should only see their providers
SELECT * FROM public.delay_status;  -- Should only see their delays

-- Reset to default (admin view)
RESET request.jwt.claims.sub;
```

## Common Issues and Solutions

### Issue: User can't log in
**Solution:**
```sql
-- Check if user exists in auth.users
SELECT id, email, created_at FROM auth.users WHERE email = 'mpa@example.com';

-- Check if profile exists
SELECT * FROM public.profiles WHERE id = '<USER_UUID>';
```

### Issue: "Kein Zugriff: Praxis nicht gefunden"
**Solution:**
```sql
-- Verify profile is linked to valid practice
SELECT 
  p.id as user_id,
  p.practice_id,
  pr.name as practice_name,
  pr.city
FROM public.profiles p
LEFT JOIN public.practices pr ON p.practice_id = pr.id
WHERE p.id = '<USER_UUID>';

-- If practice_name is NULL, the practice_id is invalid
```

### Issue: Provider not showing up
**Solution:**
```sql
-- Check provider exists and is linked to correct practice
SELECT * FROM public.providers 
WHERE practice_id = '<PRACTICE_ID>';

-- Check is_active flag
SELECT id, name, is_active FROM public.providers
WHERE practice_id = '<PRACTICE_ID>';
```

## Database Maintenance

### Backup Current Delays
```sql
-- Create a backup table
CREATE TABLE delay_status_backup AS
SELECT * FROM public.delay_status;

-- Or export to CSV via Supabase Dashboard
```

### Archive Old Delay Records
```sql
-- If you want to track history, create an archive table first
CREATE TABLE delay_status_history (
  LIKE public.delay_status INCLUDING ALL
);

-- Copy records older than 30 days
INSERT INTO delay_status_history
SELECT * FROM public.delay_status
WHERE updated_at < now() - interval '30 days';
```

## Security Notes

- ✅ All tables have RLS enabled
- ✅ Users can only access their own practice data
- ✅ Service role key should never be exposed to frontend
- ✅ Only use anon/public key in web application
- ⚠️ Do not disable RLS in production
- ⚠️ Always use parameterized queries to prevent SQL injection

## Patient App Queries (Future)

When the native patient app is built, it should query the view:

```sql
-- Get delay for a specific provider
SELECT delay_minutes, updated_at
FROM public.v_delay_current
WHERE practice_id = '<PRACTICE_ID>'
AND provider_id = '<PROVIDER_ID>';

-- Get practice-wide delay (fallback)
SELECT delay_minutes, updated_at
FROM public.v_delay_current
WHERE practice_id = '<PRACTICE_ID>'
AND provider_id IS NULL;
```

The view has no RLS restrictions, so the patient app can read it with the anon key. This is intentional - delay information is public for patients.

## Support Contacts

For issues with:
- **Authentication**: Check Supabase Auth logs
- **Database queries**: Check Supabase Postgres logs
- **RLS policies**: Check query permissions in Supabase

## Next Steps

After setup is complete:
1. ✅ Log in to admin panel with MPA credentials
2. ✅ Test updating delays in both modes
3. ✅ Verify delays persist across sessions
4. ✅ Check relative time updates every 30 seconds
5. ✅ Test on mobile device
6. 📱 Ready for patient app integration (Deployment #2)
