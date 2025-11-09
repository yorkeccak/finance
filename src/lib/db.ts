/**
 * Unified database interface that switches between Supabase (production)
 * and SQLite (development) based on NEXT_PUBLIC_APP_MODE
 */

import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { getLocalDb, DEV_USER_ID } from "./local-db/client";
import { getDevUser, isDevelopmentMode } from "./local-db/local-auth";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "./local-db/schema";

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function getUser() {
  if (isDevelopmentMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getUser();
}

export async function getSession() {
  if (isDevelopmentMode()) {
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
  if (isDevelopmentMode()) {
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

// ============================================================================
// RATE LIMIT FUNCTIONS
// ============================================================================

export async function getUserRateLimit(userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const rateLimit = await db.query.userRateLimits.findFirst({
      where: eq(schema.userRateLimits.userId, userId),
    });
    return { data: rateLimit || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("user_rate_limits")
    .select("*")
    .eq("user_id", userId)
    .single();
  return { data, error };
}

export async function updateUserRateLimit(
  userId: string,
  updates: { usage_count?: number; reset_date?: string; last_request_at?: Date }
) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db
      .update(schema.userRateLimits)
      .set({
        usageCount: updates.usage_count,
        resetDate: updates.reset_date,
        lastRequestAt: updates.last_request_at,
      })
      .where(eq(schema.userRateLimits.userId, userId));
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("user_rate_limits")
    .update(updates)
    .eq("user_id", userId);
  return { error };
}

// ============================================================================
// CHAT SESSION FUNCTIONS
// ============================================================================

export async function getChatSessions(userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const sessions = await db.query.chatSessions.findMany({
      where: eq(schema.chatSessions.userId, userId),
      orderBy: [desc(schema.chatSessions.updatedAt)],
    });
    return { data: sessions, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return { data, error };
}

export async function getChatSession(sessionId: string, userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(schema.chatSessions.id, sessionId),
        eq(schema.chatSessions.userId, userId)
      ),
    });
    return { data: session || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  return { data, error };
}

export async function createChatSession(session: {
  id: string;
  user_id: string;
  title: string;
}) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db.insert(schema.chatSessions).values({
      id: session.id,
      userId: session.user_id,
      title: session.title,
    });
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("chat_sessions").insert(session);
  return { error };
}

export async function updateChatSession(
  sessionId: string,
  userId: string,
  updates: { title?: string; last_message_at?: Date }
) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.last_message_at !== undefined)
      updateData.lastMessageAt = updates.last_message_at;

    await db
      .update(schema.chatSessions)
      .set(updateData)
      .where(
        and(
          eq(schema.chatSessions.id, sessionId),
          eq(schema.chatSessions.userId, userId)
        )
      );
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("chat_sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId);
  return { error };
}

export async function deleteChatSession(sessionId: string, userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db
      .delete(schema.chatSessions)
      .where(
        and(
          eq(schema.chatSessions.id, sessionId),
          eq(schema.chatSessions.userId, userId)
        )
      );
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);
  return { error };
}

// ============================================================================
// CHAT MESSAGE FUNCTIONS
// ============================================================================

export async function getChatMessages(sessionId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const messages = await db.query.chatMessages.findMany({
      where: eq(schema.chatMessages.sessionId, sessionId),
      orderBy: [schema.chatMessages.createdAt],
    });
    return { data: messages, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return { data, error };
}

export async function saveChatMessages(
  sessionId: string,
  messages: Array<{
    id: string;
    role: string;
    content: any;
    processing_time_ms?: number;
  }>
) {
  console.log('[DB] saveChatMessages called - sessionId:', sessionId, 'messageCount:', messages.length);

  if (isDevelopmentMode()) {
    const db = getLocalDb();

    // Delete existing messages
    await db
      .delete(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId));

    // Insert new messages
    if (messages.length > 0) {
      await db.insert(schema.chatMessages).values(
        messages.map((msg) => ({
          id: msg.id,
          sessionId: sessionId,
          role: msg.role,
          content: JSON.stringify(msg.content),
          processingTimeMs: msg.processing_time_ms,
        }))
      );
    }
    console.log('[DB] Successfully saved messages to local SQLite');
    return { error: null };
  }

  console.log('[DB] Saving to Supabase (production mode)');
  const supabase = await createSupabaseClient();

  // Delete existing messages
  console.log('[DB] Deleting existing messages for session:', sessionId);
  const deleteResult = await supabase.from("chat_messages").delete().eq("session_id", sessionId);
  if (deleteResult.error) {
    console.error('[DB] Error deleting messages:', deleteResult.error);
  }

  // Insert new messages
  if (messages.length > 0) {
    console.log('[DB] Inserting', messages.length, 'messages');
    const messagesToInsert = messages.map((msg) => ({
      id: msg.id,
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
      processing_time_ms: msg.processing_time_ms,
    }));
    console.log('[DB] First message to insert:', JSON.stringify(messagesToInsert[0]));

    const { error } = await supabase.from("chat_messages").insert(messagesToInsert);
    if (error) {
      console.error('[DB] Error inserting messages:', error);
    } else {
      console.log('[DB] Successfully inserted messages to Supabase');
    }
    return { error };
  }

  console.log('[DB] No messages to save');
  return { error: null };
}

export async function deleteChatMessages(sessionId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db
      .delete(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId));
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("session_id", sessionId);
  return { error };
}

// ============================================================================
// CHART FUNCTIONS
// ============================================================================

export async function getChart(chartId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const chart = await db.query.charts.findFirst({
      where: eq(schema.charts.id, chartId),
    });
    return { data: chart || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("charts")
    .select("*")
    .eq("id", chartId)
    .single();
  return { data, error };
}

export async function createChart(chart: {
  id: string;
  user_id?: string;
  anonymous_id?: string;
  session_id: string;
  chart_data: any;
}) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db.insert(schema.charts).values({
      id: chart.id,
      userId: chart.user_id || null,
      anonymousId: chart.anonymous_id || null,
      sessionId: chart.session_id,
      chartData: JSON.stringify(chart.chart_data),
    });
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("charts").insert(chart);
  return { error };
}

// ============================================================================
// CSV FUNCTIONS
// ============================================================================

export async function getCSV(csvId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const csv = await db.query.csvs.findFirst({
      where: eq(schema.csvs.id, csvId),
    });
    return { data: csv || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("csvs")
    .select("*")
    .eq("id", csvId)
    .single();
  return { data, error };
}

export async function createCSV(csv: {
  id: string;
  user_id?: string;
  anonymous_id?: string;
  session_id: string;
  title: string;
  description?: string;
  headers: string[];
  rows: any[][];
}) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db.insert(schema.csvs).values({
      id: csv.id,
      userId: csv.user_id || null,
      anonymousId: csv.anonymous_id || null,
      sessionId: csv.session_id,
      title: csv.title,
      description: csv.description || null,
      headers: JSON.stringify(csv.headers),
      rows: JSON.stringify(csv.rows),
    });
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("csvs").insert(csv);
  return { error };
}
