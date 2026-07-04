
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let subscription: any;

    // SECURITY: Register auth state listener FIRST, before anything that can throw.
    // This guarantees SIGNED_IN events update state even if getSession() or
    // environment checks fail (e.g., cross-origin iframe SecurityError).
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (nextSession) {
          const now = Math.floor(Date.now() / 1000);
          if (nextSession.expires_at && nextSession.expires_at < now) {
            return;
          }
        }
        if (mounted) {
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setLoading(false);
        }
      });
      subscription = data.subscription;
    } catch {
      // Silent failure - listener setup should not throw, but guard anyway
    }

    const initializeAuth = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        );

        const { data: { session } } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch {
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch {
          // Silent failure
        }
      }
    };

  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // SECURITY: Input validation
      if (!email || !password || !fullName) {
        return { error: { message: 'All fields are required' } };
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'Please enter a valid email address' } };
      }

      // Password strength validation
      if (password.length < 8) {
        return { error: { message: 'Password must be at least 8 characters long' } };
      }

      // Sanitize full name
      const sanitizedFullName = fullName.trim().replace(/[<>'"&]/g, '');
      if (sanitizedFullName.length < 2) {
        return { error: { message: 'Please enter a valid full name' } };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: sanitizedFullName,
          }
        }
      });
      return { error };
    } catch {
      return { error: { message: 'An unexpected error occurred during sign up' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // SECURITY: Input validation
      if (!email || !password) {
        return { error: { message: 'Email and password are required' } };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      return { error };
    } catch {
      return { error: { message: 'An unexpected error occurred during sign in' } };
    }
  };

  const signOut = async () => {
    try {
      // SECURITY: Clear local state immediately
      setUser(null);
      setSession(null);
      
      await supabase.auth.signOut();
    } catch {
      // Silent failure
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
