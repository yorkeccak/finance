/**
 * Client-side database wrapper that switches between Supabase (valyu mode)
 * and local SQLite (self-hosted mode) based on NEXT_PUBLIC_APP_MODE
 */

import { createClient as createSupabaseClient } from './client';

// Dev user constants (copied here to avoid importing server-side code)
const DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000000";
const DEV_USER_EMAIL = "dev@localhost";

const isSelfHosted = () => process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';

// Mock auth object for self-hosted mode
const createDevAuth = () => ({
  getUser: async () => ({
    data: {
      user: {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        app_metadata: {
          provider: 'email',
        },
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      }
    },
    error: null,
  }),
  getSession: async () => ({
    data: {
      session: {
        user: {
          id: DEV_USER_ID,
          email: DEV_USER_EMAIL,
          app_metadata: {
            provider: 'email',
          },
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
        access_token: 'dev-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        refresh_token: 'dev-refresh-token',
      }
    },
    error: null,
  }),
  onAuthStateChange: (callback: any) => {
    // Call callback immediately with dev user session
    const session = {
      user: {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        app_metadata: {
          provider: 'email',
        },
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
      access_token: 'dev-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      refresh_token: 'dev-refresh-token',
    };

    setTimeout(() => {
      callback('SIGNED_IN', session);
    }, 0);

    // Return subscription object with unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({
    data: {
      user: {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        app_metadata: {
          provider: 'email',
        },
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
      session: {
        user: {
          id: DEV_USER_ID,
          email: DEV_USER_EMAIL,
          app_metadata: {
            provider: 'email',
          },
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
        access_token: 'dev-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        refresh_token: 'dev-refresh-token',
      },
    },
    error: null,
  }),
  signUp: async () => ({
    data: {
      user: {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        app_metadata: {
          provider: 'email',
        },
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
      session: {
        user: {
          id: DEV_USER_ID,
          email: DEV_USER_EMAIL,
          app_metadata: {
            provider: 'email',
          },
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
        access_token: 'dev-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        refresh_token: 'dev-refresh-token',
      },
    },
    error: null,
  }),
  signInWithOAuth: async () => ({ data: { url: null }, error: null }),
});

export function createClient() {
  if (isSelfHosted()) {
    // Return mock Supabase client for self-hosted mode
    return {
      auth: createDevAuth(),
      // Mock other methods that might be used
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => async () => ({ error: null }) }),
        delete: () => ({ eq: () => async () => ({ error: null }) }),
      }),
    } as any;
  }

  return createSupabaseClient();
}
