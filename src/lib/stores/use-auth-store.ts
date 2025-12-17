'use client';

import { create } from 'zustand';
import { track } from '@vercel/analytics';
import { createClient } from '@/utils/supabase/client-wrapper';
import { buildAuthorizationUrl, refreshAccessToken } from '@/lib/valyu-oauth';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Authentication Store with Supabase + Valyu OAuth
 *
 * This app uses "Sign in with Valyu" as the authentication method.
 * - Valyu Platform acts as OAuth 2.1 Identity Provider
 * - Finance app uses Supabase Auth with signInWithIdToken
 * - This creates a proper Supabase user in Finance's database
 * - Chat sessions, messages, etc. are linked to Supabase user ID
 * - Valyu access token is stored separately for API proxy calls
 */

// Extended user type with Valyu-specific fields
export interface AuthUser extends User {
  // Valyu-specific metadata (stored in user_metadata)
  valyuUserType?: 'buyer' | 'seller';
  valyuOrganisationId?: string;
  valyuOrganisationName?: string;
}

interface AuthState {
  // Supabase user (linked to Finance DB)
  user: AuthUser | null;
  session: Session | null;

  // Valyu OAuth tokens (for API proxy calls)
  valyuAccessToken: string | null;
  valyuRefreshToken: string | null;
  valyuTokenExpiresAt: number | null;

  // API key status from Valyu
  hasApiKey: boolean;
  creditsAvailable: boolean;

  // Loading states
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  // Initialize auth state from Supabase session
  initialize: () => Promise<void>;

  // Sign in with Valyu (redirects to OAuth)
  signInWithValyu: () => Promise<{ data?: any; error?: any }>;

  // Complete Valyu OAuth (called from callback page)
  completeValyuAuth: (idToken: string, accessToken: string, refreshToken: string | undefined, expiresIn: number) => Promise<{ success: boolean; error?: string }>;

  // Set Valyu tokens (for API proxy)
  setValyuTokens: (accessToken: string, refreshToken: string | undefined, expiresIn: number) => void;

  // Set API key status
  setApiKeyStatus: (hasApiKey: boolean, creditsAvailable: boolean) => void;

  // Sign out
  signOut: () => Promise<void>;

  // Get Valyu access token for API calls (sync - may return expired token)
  getValyuAccessToken: () => string | null;

  // Get valid Valyu access token, refreshing if needed (async)
  getValidValyuAccessToken: () => Promise<string | null>;

  // Check if authenticated
  isAuthenticated: () => boolean;

  // Set user from Supabase auth state change
  setUser: (user: AuthUser | null, session: Session | null) => void;

  // Loading state setters
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  session: null,
  valyuAccessToken: null,
  valyuRefreshToken: null,
  valyuTokenExpiresAt: null,
  hasApiKey: false,
  creditsAvailable: false,
  loading: true,
  initialized: false,
};

// Separate storage for Valyu tokens (not in Supabase)
const VALYU_TOKEN_KEY = 'valyu_oauth_tokens';

function loadValyuTokens(): { accessToken: string | null; refreshToken: string | null; expiresAt: number | null } {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null, expiresAt: null };
  }
  try {
    const stored = localStorage.getItem(VALYU_TOKEN_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if tokens are still valid
      if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
        return {
          accessToken: parsed.accessToken || null,
          refreshToken: parsed.refreshToken || null,
          expiresAt: parsed.expiresAt || null,
        };
      }
    }
  } catch (e) {
    console.error('[Auth Store] Error loading Valyu tokens:', e);
  }
  return { accessToken: null, refreshToken: null, expiresAt: null };
}

function saveValyuTokens(accessToken: string, refreshToken: string | undefined, expiresAt: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VALYU_TOKEN_KEY, JSON.stringify({
      accessToken,
      refreshToken: refreshToken || null,
      expiresAt,
    }));
  } catch (e) {
    console.error('[Auth Store] Error saving Valyu tokens:', e);
  }
}

function clearValyuTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(VALYU_TOKEN_KEY);
  } catch (e) {
    console.error('[Auth Store] Error clearing Valyu tokens:', e);
  }
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  ...initialState,

  initialize: async () => {
    if (get().initialized) return;

    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[Auth Store] Error getting session:', error);
      }

      // Load Valyu tokens from localStorage
      const valyuTokens = loadValyuTokens();

      set({
        user: session?.user as AuthUser | null,
        session: session,
        valyuAccessToken: valyuTokens.accessToken,
        valyuRefreshToken: valyuTokens.refreshToken,
        valyuTokenExpiresAt: valyuTokens.expiresAt,
        loading: false,
        initialized: true,
      });

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
        console.log('[Auth Store] Auth state changed:', event);
        set({
          user: session?.user as AuthUser | null,
          session: session,
        });

        if (event === 'SIGNED_OUT') {
          clearValyuTokens();
          set({
            valyuAccessToken: null,
            valyuRefreshToken: null,
            valyuTokenExpiresAt: null,
            hasApiKey: false,
            creditsAvailable: false,
          });
        }
      });
    } catch (error) {
      console.error('[Auth Store] Initialize error:', error);
      set({ loading: false, initialized: true });
    }
  },

  signInWithValyu: async () => {
    try {
      set({ loading: true });

      const redirectUri = `${window.location.origin}/auth/valyu/callback`;
      const authUrl = await buildAuthorizationUrl(redirectUri);

      // Track the sign in attempt
      track('Sign In Attempt', { method: 'valyu' });

      // Redirect to Valyu OAuth
      window.location.href = authUrl;

      return { data: { url: authUrl } };
    } catch (error) {
      console.error('[Auth Store] Sign in error:', error);
      set({ loading: false });
      return { error };
    }
  },

  completeValyuAuth: async (idToken, accessToken, refreshToken, expiresIn) => {
    try {
      set({ loading: true });

      const supabase = createClient();

      // Step 1: Call our server-side endpoint to create/find user and get a magic link token
      const sessionResponse = await fetch('/api/auth/valyu/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valyu_access_token: accessToken }),
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        console.error('[Auth Store] Session creation failed:', errorData);
        set({ loading: false });
        return { success: false, error: errorData.error_description || 'Failed to create session' };
      }

      const sessionData = await sessionResponse.json();
      console.log('[Auth Store] Session data received:', { user_id: sessionData.user_id, email: sessionData.email });

      // Step 2: Verify the magic link token to create a session
      if (sessionData.token_hash) {
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: sessionData.token_hash,
          type: 'magiclink',
        });

        if (verifyError) {
          console.error('[Auth Store] OTP verification failed:', verifyError);
          set({ loading: false });
          return { success: false, error: verifyError.message };
        }

        // Store Valyu tokens for API proxy calls
        const expiresAt = Date.now() + expiresIn * 1000;
        saveValyuTokens(accessToken, refreshToken, expiresAt);

        set({
          user: verifyData.user as AuthUser,
          session: verifyData.session,
          valyuAccessToken: accessToken,
          valyuRefreshToken: refreshToken || null,
          valyuTokenExpiresAt: expiresAt,
          loading: false,
        });

        // Track successful sign in
        track('Sign In Success', { method: 'valyu' });

        return { success: true };
      }

      // Fallback if no token_hash (shouldn't happen)
      console.warn('[Auth Store] No token_hash received, using token-only mode');
      const expiresAt = Date.now() + expiresIn * 1000;
      saveValyuTokens(accessToken, refreshToken, expiresAt);

      set({
        valyuAccessToken: accessToken,
        valyuRefreshToken: refreshToken || null,
        valyuTokenExpiresAt: expiresAt,
        loading: false,
      });

      return { success: true };
    } catch (error) {
      console.error('[Auth Store] Complete auth error:', error);
      set({ loading: false });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  setValyuTokens: (accessToken, refreshToken, expiresIn) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    saveValyuTokens(accessToken, refreshToken, expiresAt);
    set({
      valyuAccessToken: accessToken,
      valyuRefreshToken: refreshToken || null,
      valyuTokenExpiresAt: expiresAt,
    });
  },

  setApiKeyStatus: (hasApiKey, creditsAvailable) => {
    set({ hasApiKey, creditsAvailable });
  },

  signOut: async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      // Clear Valyu tokens
      clearValyuTokens();

      set({
        ...initialState,
        loading: false,
        initialized: true,
      });

      // Track sign out
      track('Sign Out', { method: 'valyu' });

      // Dispatch event for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:signout'));
      }
    } catch (error) {
      console.error('[Auth Store] Sign out error:', error);
    }
  },

  getValyuAccessToken: () => {
    const { valyuAccessToken, valyuTokenExpiresAt, initialized } = get();

    // If store is initialized, use store values
    if (initialized) {
      if (!valyuAccessToken || !valyuTokenExpiresAt) return null;
      // Return null if token is expired or about to expire (1 min buffer)
      if (valyuTokenExpiresAt <= Date.now() + 60 * 1000) return null;
      return valyuAccessToken;
    }

    // Fallback: If store not yet initialized, try loading directly from localStorage
    // This handles the race condition where chat is used before auth initializes
    const tokens = loadValyuTokens();
    if (!tokens.accessToken || !tokens.expiresAt) return null;
    if (tokens.expiresAt <= Date.now() + 60 * 1000) return null;
    return tokens.accessToken;
  },

  getValidValyuAccessToken: async () => {
    const { valyuAccessToken, valyuRefreshToken, valyuTokenExpiresAt } = get();

    // Check if we have a valid token (with 2 min buffer for long requests)
    if (valyuAccessToken && valyuTokenExpiresAt && valyuTokenExpiresAt > Date.now() + 2 * 60 * 1000) {
      return valyuAccessToken;
    }

    // Try to refresh if we have a refresh token
    if (valyuRefreshToken) {
      try {
        console.log('[Auth Store] Token expired or expiring soon, refreshing...');
        const tokenResponse = await refreshAccessToken(valyuRefreshToken);

        // Update store and localStorage with new tokens
        const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
        saveValyuTokens(tokenResponse.access_token, tokenResponse.refresh_token, expiresAt);

        set({
          valyuAccessToken: tokenResponse.access_token,
          valyuRefreshToken: tokenResponse.refresh_token || valyuRefreshToken,
          valyuTokenExpiresAt: expiresAt,
        });

        console.log('[Auth Store] Token refreshed successfully');
        return tokenResponse.access_token;
      } catch (error) {
        console.error('[Auth Store] Token refresh failed:', error);
        // Clear tokens on refresh failure - user needs to re-auth
        clearValyuTokens();
        set({
          valyuAccessToken: null,
          valyuRefreshToken: null,
          valyuTokenExpiresAt: null,
        });
        return null;
      }
    }

    // No valid token and no refresh token
    return null;
  },

  isAuthenticated: () => {
    const { user, session } = get();
    // Check Supabase session first
    if (user && session) return true;

    // Fallback: check Valyu token if OIDC not configured
    const { valyuAccessToken, valyuTokenExpiresAt } = get();
    if (valyuAccessToken && valyuTokenExpiresAt && valyuTokenExpiresAt > Date.now()) {
      return true;
    }

    return false;
  },

  setUser: (user, session) => {
    set({ user, session });
  },

  setLoading: (loading) => set({ loading }),
}));
