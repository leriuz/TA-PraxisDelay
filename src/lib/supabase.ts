import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

// Types for our database
export interface Practice {
  id: string;
  name: string;
  city: string;
  created_at: string;
}

export interface Provider {
  id: string;
  practice_id: string;
  name: string;
  specialty: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  practice_id: string;
  role: string;
  created_at: string;
}

export interface DelayStatus {
  id: string;
  practice_id: string;
  provider_id: string | null;
  delay_minutes: number;
  updated_by: string;
  updated_at: string;
}

// Helper to format relative time in German
export function formatRelativeTime(timestamp: string): string {
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
