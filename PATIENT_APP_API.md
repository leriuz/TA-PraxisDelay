# Patient App API Reference

**For Deployment #2 (Future Native Patient App)**

This document describes how the native patient app should query delay status from the Supabase backend.

## Connection Details

```typescript
// Supabase Configuration
const supabaseUrl = 'https://<project-id>.supabase.co';
const supabaseAnonKey = '<your-anon-key>';

// Initialize Supabase Client
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Database Structure

### practices
```typescript
interface Practice {
  id: string;          // UUID
  name: string;        // "Praxis am Bahnhof"
  city: string;        // "Zürich"
  created_at: string;  // ISO timestamp
}
```

### providers
```typescript
interface Provider {
  id: string;          // UUID
  practice_id: string; // UUID, references practices(id)
  name: string;        // "Dr. Anna Müller"
  specialty: string | null;  // "Allgemeinmedizin"
  is_active: boolean;  // true if currently active
  created_at: string;  // ISO timestamp
}
```

### v_delay_current (View - Read Only)
```typescript
interface DelayStatus {
  practice_id: string;      // UUID
  provider_id: string | null;  // UUID or null (null = practice-wide)
  delay_minutes: number;    // 0-180, multiples of 5
  updated_at: string;       // ISO timestamp
}
```

## API Queries

### 1. Get Practice-Wide Delay

Use this as the **fallback** when no provider-specific delay exists.

```typescript
async function getPracticeWideDelay(practiceId: string): Promise<DelayStatus | null> {
  const { data, error } = await supabase
    .from('v_delay_current')
    .select('*')
    .eq('practice_id', practiceId)
    .is('provider_id', null)
    .single();
    
  if (error) {
    console.error('Error fetching practice-wide delay:', error);
    return null;
  }
  
  return data;
}
```

**Example Response:**
```json
{
  "practice_id": "550e8400-e29b-41d4-a716-446655440000",
  "provider_id": null,
  "delay_minutes": 20,
  "updated_at": "2025-02-01T14:23:00Z"
}
```

### 2. Get Provider-Specific Delay

Use this when the patient has an appointment with a specific doctor.

```typescript
async function getProviderDelay(
  practiceId: string, 
  providerId: string
): Promise<DelayStatus | null> {
  const { data, error } = await supabase
    .from('v_delay_current')
    .select('*')
    .eq('practice_id', practiceId)
    .eq('provider_id', providerId)
    .single();
    
  if (error) {
    // Provider-specific delay might not exist, fall back to practice-wide
    if (error.code === 'PGRST116') {  // No rows returned
      return null;
    }
    console.error('Error fetching provider delay:', error);
    return null;
  }
  
  return data;
}
```

**Example Response:**
```json
{
  "practice_id": "550e8400-e29b-41d4-a716-446655440000",
  "provider_id": "abc123...",
  "delay_minutes": 35,
  "updated_at": "2025-02-01T14:25:00Z"
}
```

### 3. Get Delay with Fallback Logic

**Recommended approach** for the patient app:

```typescript
async function getDelayForAppointment(
  practiceId: string,
  providerId?: string
): Promise<DelayStatus | null> {
  // If provider is specified, try provider-specific delay first
  if (providerId) {
    const providerDelay = await getProviderDelay(practiceId, providerId);
    if (providerDelay) {
      return providerDelay;
    }
  }
  
  // Fall back to practice-wide delay
  return await getPracticeWideDelay(practiceId);
}
```

### 4. List All Providers for a Practice

For the doctor selection screen when creating appointments:

```typescript
async function getProviders(practiceId: string): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('practice_id', practiceId)
    .eq('is_active', true)
    .order('name');
    
  if (error) {
    console.error('Error fetching providers:', error);
    return [];
  }
  
  return data || [];
}
```

### 5. Search Practices

For the "select practice" screen:

```typescript
async function searchPractices(query: string): Promise<Practice[]> {
  const { data, error } = await supabase
    .from('practices')
    .select('*')
    .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
    .order('name')
    .limit(20);
    
  if (error) {
    console.error('Error searching practices:', error);
    return [];
  }
  
  return data || [];
}
```

## Display Logic for Patient App

### Delay Status Interpretation

```typescript
function getDelayStatus(delayMinutes: number | null): string {
  if (delayMinutes === null || delayMinutes === 0) {
    return 'im Plan';
  } else if (delayMinutes <= 15) {
    return 'im Rückstand';
  } else {
    return 'stark im Rückstand';
  }
}
```

**Swiss German Display:**
```
delayMinutes = 0   → "Praxis meldet: im Plan"
delayMinutes = 10  → "Praxis meldet: im Rückstand"
delayMinutes = 35  → "Praxis meldet: stark im Rückstand"
delayMinutes = null → "Praxis meldet: keine Angabe"
```

### Relative Time Display

```typescript
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now.getTime() - updated.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'gerade eben';
  } else if (diffMinutes === 1) {
    return 'vor 1 Min';
  } else if (diffMinutes < 60) {
    return `vor ${diffMinutes} Min`;
  } else if (diffMinutes < 120) {
    return 'vor 1 Std';
  } else {
    const hours = Math.floor(diffMinutes / 60);
    return `vor ${hours} Std`;
  }
}
```

**Display:**
```
"Zuletzt aktualisiert vor 7 Min"
```

### Leave Time Calculation

```typescript
interface Appointment {
  practiceId: string;
  providerId?: string;
  dateTime: Date;  // Scheduled appointment time
  travelTimeMinutes: number;  // User's travel time (default 15)
}

async function shouldLeaveNow(appointment: Appointment): Promise<{
  shouldLeave: boolean;
  status: string;
  delayMinutes: number | null;
}> {
  // Get current delay
  const delay = await getDelayForAppointment(
    appointment.practiceId,
    appointment.providerId
  );
  
  const delayMinutes = delay?.delay_minutes ?? 0;
  
  // Calculate when to leave
  const now = new Date();
  const leaveTime = new Date(
    appointment.dateTime.getTime() - 
    (appointment.travelTimeMinutes * 60000) +
    (delayMinutes * 60000)  // Adjust for delay
  );
  
  const shouldLeave = now >= leaveTime;
  
  return {
    shouldLeave,
    status: getDelayStatus(delayMinutes),
    delayMinutes,
  };
}
```

**Display:**
```typescript
const result = await shouldLeaveNow(appointment);

// If result.shouldLeave = true
"Jetzt losgehen"

// If result.shouldLeave = false
"Noch warten"
```

## Real-Time Subscriptions (Optional)

For live updates when the practice changes the delay:

```typescript
function subscribeToDelayUpdates(
  practiceId: string,
  providerId: string | null,
  callback: (delay: DelayStatus) => void
) {
  const channel = supabase
    .channel(`delay:${practiceId}:${providerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'delay_status',
        filter: `practice_id=eq.${practiceId}`,
      },
      (payload) => {
        const newDelay = payload.new as DelayStatus;
        if (newDelay.provider_id === providerId) {
          callback(newDelay);
        }
      }
    )
    .subscribe();
    
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
```

**Usage:**
```typescript
const unsubscribe = subscribeToDelayUpdates(
  practiceId,
  providerId,
  (newDelay) => {
    console.log('Delay updated:', newDelay);
    // Update UI
  }
);

// Later, cleanup
unsubscribe();
```

## Error Handling

```typescript
async function getDelayWithErrorHandling(
  practiceId: string,
  providerId?: string
): Promise<{
  delay: DelayStatus | null;
  error: string | null;
}> {
  try {
    const delay = await getDelayForAppointment(practiceId, providerId);
    
    if (!delay) {
      return {
        delay: null,
        error: null,  // No error, just no data available
      };
    }
    
    return { delay, error: null };
  } catch (error: any) {
    console.error('Error fetching delay:', error);
    return {
      delay: null,
      error: 'Keine Verbindung zum Server',
    };
  }
}
```

## Example: Complete Appointment Display

```typescript
interface AppointmentDisplay {
  doctorName: string;
  appointmentTime: string;  // "15:00"
  statusText: string;       // "Praxis meldet: im Rückstand"
  actionText: string;       // "Jetzt losgehen" or "Noch warten"
  lastUpdated: string;      // "Zuletzt aktualisiert vor 7 Min"
}

async function getAppointmentDisplay(
  appointment: Appointment,
  provider: Provider | null
): Promise<AppointmentDisplay> {
  const delay = await getDelayForAppointment(
    appointment.practiceId,
    appointment.providerId
  );
  
  const delayMinutes = delay?.delay_minutes ?? null;
  const status = getDelayStatus(delayMinutes);
  
  const { shouldLeave } = await shouldLeaveNow(appointment);
  
  return {
    doctorName: provider?.name || 'Praxis',
    appointmentTime: appointment.dateTime.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    statusText: `Praxis meldet: ${status}`,
    actionText: shouldLeave ? 'Jetzt losgehen' : 'Noch warten',
    lastUpdated: delay?.updated_at 
      ? `Zuletzt aktualisiert ${formatRelativeTime(delay.updated_at)}`
      : 'Zuletzt aktualisiert –',
  };
}
```

## Testing

### Test with cURL

```bash
# Get practice-wide delay
curl -X GET 'https://<project-id>.supabase.co/rest/v1/v_delay_current?practice_id=eq.550e8400-e29b-41d4-a716-446655440000&provider_id=is.null' \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"

# Get provider-specific delay
curl -X GET 'https://<project-id>.supabase.co/rest/v1/v_delay_current?practice_id=eq.550e8400-e29b-41d4-a716-446655440000&provider_id=eq.<provider-id>' \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"
```

## Security Notes

✅ **Safe to use anon key in mobile app** - RLS policies are not enabled on the read-only view  
✅ **No authentication required** for reading delay status (public information)  
⚠️ **Never expose service role key** in the mobile app  
⚠️ **Rate limiting** may apply to prevent abuse  

## Next Steps for Patient App

1. ✅ Implement Supabase client setup
2. ✅ Create appointment data model with practiceId and providerId
3. ✅ Query delay status before showing "leave now" decision
4. ✅ Update relative time every 30-60 seconds
5. ✅ Handle network errors gracefully
6. ✅ Consider implementing real-time subscriptions for live updates

## Support

- **Backend Status**: Check Supabase dashboard
- **API Issues**: Check network logs and Supabase Postgres logs
- **Data Questions**: Refer to `/supabase/migrations/001_initial_schema.sql`
