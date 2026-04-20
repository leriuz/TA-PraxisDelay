import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Practice, Profile } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  practice: Practice | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPractice: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setProfile(null);
        setPractice(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        setLoading(false);
        return;
      }

      if (!profileData) {
        console.error('No profile found for user');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Load practice if practice_id exists
      if (profileData.practice_id) {
        const { data: practiceData, error: practiceError } = await supabase
          .from('practices')
          .select('*')
          .eq('id', profileData.practice_id)
          .maybeSingle();

        if (practiceError) {
          console.error('Error loading practice:', practiceError);
        } else if (!practiceData) {
          // Practice not found - this is expected for new users
          console.log(
            '%c⚠️ SETUP REQUIRED ⚠️',
            'background: #ff6b00; color: white; font-size: 16px; padding: 8px; font-weight: bold; border-radius: 4px;'
          );
          console.log(
            '%cYour practice needs to be created in the database.',
            'font-size: 14px; color: #ff6b00; font-weight: bold;'
          );
          console.log('\n📋 Practice ID:', profileData.practice_id);
          console.log('\n🔧 To fix this:');
          console.log('1. Open Supabase → SQL Editor');
          console.log('2. Run this SQL:\n');
          console.log(
            `   INSERT INTO public.practices (id, name, city) VALUES ('${profileData.practice_id}', 'Neue Praxis', 'Bitte aktualisieren');`
          );
          console.log('\n3. Refresh this page\n');
          console.log('📄 Or see: /RUN_THIS_SQL.sql for the complete fix\n');
        } else {
          setPractice(practiceData);
        }
      } else {
        console.warn('User profile has no practice_id assigned');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function refreshPractice() {
    if (!profile?.practice_id) return;
    const { data, error } = await supabase
      .from('practices')
      .select('*')
      .eq('id', profile.practice_id)
      .maybeSingle();
    if (!error && data) setPractice(data);
  }

  const value = {
    user,
    profile,
    practice,
    loading,
    signIn,
    signOut,
    refreshPractice,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}