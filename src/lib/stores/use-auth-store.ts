'use client';

import { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createClient } from '@/utils/supabase/client-wrapper';
import { track } from '@vercel/analytics';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>;
  signUp: (email: string, password: string) => Promise<{ data?: any; error?: any }>;
  signInWithGoogle: () => Promise<{ data?: any; error?: any }>;
  signOut: () => Promise<{ error?: any }>;
  initialize: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      loading: true,
      initialized: false,

      // Actions
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      signIn: async (email: string, password: string) => {
        const supabase = createClient();
        
        try {
          const result = await supabase.auth.signInWithPassword({ email, password });
          
          if (result.error) {
            return { error: result.error };
          }
          
          // Don't manually set loading or user here - let onAuthStateChange handle it
          return { data: result.data };
        } catch (error) {
          return { error };
        }
      },

      signUp: async (email: string, password: string) => {
        const supabase = createClient();

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) {
            return { error };
          }

          // Track successful sign up
          if (data.user) {
            track('Sign Up Success', {
              method: 'email'
            });
          }

          // User profile and rate limit records will be created automatically via database trigger
          return { data };
        } catch (error) {
          return { error };
        }
      },

      signInWithGoogle: async () => {
        const supabase = createClient();
        
        try {
          
          const result = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              }
            }
          });
          
          if (result.error) {
            return { error: result.error };
          }
          
          return { data: result.data };
        } catch (error) {
          return { error };
        }
      },

      signOut: async () => {
        const supabase = createClient();
        
        try {
          const result = await supabase.auth.signOut();
          // Let onAuthStateChange handle the state update
          return result;
        } catch (error) {
          return { error };
        }
      },

      initialize: () => {
        if (get().initialized) return;
        
        // Mark as initializing to prevent multiple calls
        set({ initialized: true });
        
        const supabase = createClient();
        
        // Failsafe: if nothing happens in 3 seconds, stop loading
        const timeoutId = setTimeout(() => {
          set({ loading: false });
        }, 3000);
        
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          clearTimeout(timeoutId);
          set({ 
            user: session?.user ?? null,
            loading: false
          });
        }).catch((error) => {
          clearTimeout(timeoutId);
          set({ 
            user: null,
            loading: false
          });
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            
            set({ 
              user: session?.user ?? null,
              loading: false 
            });

            // Handle sign out event
            if (event === 'SIGNED_OUT') {
              // Clear rate limit cache so anonymous rate limiting can take over
              if (typeof window !== 'undefined') {
                // Use a small delay to ensure this runs after React Query is available
                setTimeout(() => {
                  const event = new CustomEvent('auth:signout');
                  window.dispatchEvent(event);
                }, 100);
              }
            }

            // Transfer anonymous usage on successful sign in
            if (event === 'SIGNED_IN' && session?.user) {

              // Track sign in (captures both email and OAuth)
              track('Sign In Success', {
                method: session.user.app_metadata.provider || 'email'
              });

              try {
                // Call API endpoint to transfer usage server-side
                const response = await fetch('/api/rate-limit?transfer=true', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  
                  // Clear anonymous cookies after successful transfer
                  if (typeof window !== 'undefined') {
                    document.cookie = 'rl_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  }
                } else {
                  const errorData = await response.json();
                }
              } catch (error) {
              }
            }
          }
        );

        // Clean up subscription on unmount would be handled by the component
        if (typeof window !== 'undefined') {
          window.addEventListener('beforeunload', () => {
            subscription?.unsubscribe();
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist user data, not loading or initialization states
      partialize: (state) => ({ 
        user: state.user
      }),
      skipHydration: true,
    }
  )
);