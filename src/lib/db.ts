/**
 * Unified database interface that switches between Supabase (valyu mode)
 * and SQLite (self-hosted mode) based on NEXT_PUBLIC_APP_MODE
 */

import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { createClient as createSupabaseDirectClient } from "@supabase/supabase-js";
import { getLocalDb } from "./local-db/client";
import { getDevUser, isSelfHostedMode } from "./local-db/local-auth";
import { eq } from "drizzle-orm";
import * as schema from "./local-db/schema";

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function getUser() {
  if (isSelfHostedMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getUser();
}

/**
 * Get user from an access token (used when cookies aren't available).
 * This is needed for Valyu mode where the magic link flow might not set cookies properly.
 */
export async function getUserFromToken(accessToken: string) {
  if (isSelfHostedMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  if (!accessToken) {
    return { data: { user: null }, error: { message: 'No access token provided' } };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { data: { user: null }, error: { message: 'Supabase not configured' } };
  }

  // Create a client with the access token in global headers
  const supabase = createSupabaseDirectClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return await supabase.auth.getUser(accessToken);
}

/**
 * Get user from request - tries cookies first, then Authorization header.
 * Use this in API routes for more robust authentication in Valyu mode.
 */
export async function getUserFromRequest(req: Request) {
  if (isSelfHostedMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  // First try cookies (standard Supabase flow)
  const cookieResult = await getUser();
  if (cookieResult.data?.user) {
    return cookieResult;
  }

  // If no user from cookies, try Authorization header
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('[DB] No user from cookies, trying Authorization header');
    const tokenResult = await getUserFromToken(token);
    if (tokenResult.data?.user) {
      return tokenResult;
    }
    console.log('[DB] Authorization header auth failed:', tokenResult.error);
  }

  // Return the original cookie result (which has no user)
  return cookieResult;
}

export async function getSession() {
  if (isSelfHostedMode()) {
    return {
      data: {
        session: {
          user: getDevUser(),
          access_token: "dev-access-token",
        },
      },
      error: null,
    };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getSession();
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export async function getUserProfile(userId: string) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    return { data: user || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}
