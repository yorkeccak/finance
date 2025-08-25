'use client';

import { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createClient } from '@/utils/supabase/client';

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

          // User profile and rate limit records will be created automatically via database trigger
          return { data };
        } catch (error) {
          return { error };
        }
      },

      signInWithGoogle: async () => {
        const supabase = createClient();
        
        try {
          console.log('[Auth Store] Initiating Google OAuth...');
          
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
            console.error('[Auth Store] Google OAuth error:', result.error);
            return { error: result.error };
          }
          
          console.log('[Auth Store] Google OAuth initiated successfully');
          return { data: result.data };
        } catch (error) {
          console.error('[Auth Store] Google OAuth exception:', error);
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
          console.log('Auth initialization timeout - stopping loader');
          set({ loading: false });
        }, 3000);
        
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          clearTimeout(timeoutId);
          console.log('Initial session check:', session?.user?.email || 'No user');
          set({ 
            user: session?.user ?? null,
            loading: false
          });
        }).catch((error) => {
          clearTimeout(timeoutId);
          console.error('Failed to get initial session:', error);
          set({ 
            user: null,
            loading: false
          });
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            
            set({ 
              user: session?.user ?? null,
              loading: false 
            });

            // Handle sign out event
            if (event === 'SIGNED_OUT') {
              console.log('[Auth Store] User signed out, user is now anonymous');
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
              console.log('[Auth Store] Transferring anonymous usage for sign in');
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
                  console.log('[Auth Store] Successfully transferred anonymous usage:', data.message);
                  
                  // Clear anonymous cookies after successful transfer
                  if (typeof window !== 'undefined') {
                    document.cookie = 'rl_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    console.log('[Auth Store] Cleared anonymous rate limit cookies');
                  }
                } else {
                  const errorData = await response.json();
                  console.error('[Auth Store] Failed to transfer usage:', errorData.error);
                }
              } catch (error) {
                console.error('[Auth Store] Error transferring usage:', error);
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