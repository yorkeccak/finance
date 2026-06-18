/**
 * Unified database interface that switches between Supabase (valyu mode)
 * and SQLite (self-hosted mode) based on NEXT_PUBLIC_APP_MODE
 */

import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { createClient as createSupabaseDirectClient } from "@supabase/supabase-js";
import { getLocalDb, DEV_USER_ID } from "./local-db/client";
import { getDevUser, isSelfHostedMode } from "./local-db/local-auth";
import { eq, desc, and } from "drizzle-orm";
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

// ============================================================================
// CHAT SESSION FUNCTIONS
// ============================================================================

export async function getChatSessions(userId: string) {
  if (isSelfHostedMode()) {
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
  if (isSelfHostedMode()) {
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
  if (isSelfHostedMode()) {
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
  if (isSelfHostedMode()) {
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
  if (isSelfHostedMode()) {
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
  if (isSelfHostedMode()) {
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

  if (isSelfHostedMode()) {
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

  console.log('[DB] Saving to Supabase (valyu mode)');
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
  if (isSelfHostedMode()) {
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
  if (isSelfHostedMode()) {
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
  user_id: string;
  session_id: string | null;
  chart_data: any;
}) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    await db.insert(schema.charts).values({
      id: chart.id,
      userId: chart.user_id,
      sessionId: chart.session_id || '',
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
  if (isSelfHostedMode()) {
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
  user_id: string;
  session_id: string | null;
  title: string;
  description?: string;
  headers: string[];
  rows: any[][];
}) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    await db.insert(schema.csvs).values({
      id: csv.id,
      userId: csv.user_id,
      sessionId: csv.session_id || '',
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

// ============================================================================
// REPORT FUNCTIONS (async Valyu DeepResearch workflow runs)
// ============================================================================

export async function getReports(userId: string) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    const reports = await db.query.reports.findMany({
      where: eq(schema.reports.userId, userId),
      orderBy: [desc(schema.reports.createdAt)],
    });
    return { data: reports, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function getReport(reportId: string, userId: string) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    const report = await db.query.reports.findFirst({
      where: and(
        eq(schema.reports.id, reportId),
        eq(schema.reports.userId, userId)
      ),
    });
    return { data: report || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .eq("user_id", userId)
    .single();
  return { data, error };
}

export async function createReport(report: {
  id: string;
  user_id: string;
  workflow_slug: string;
  workflow_version?: number | null;
  workflow_params: Record<string, unknown>;
  mode: string;
  title: string;
  estimated_time?: string | null;
  valyu_task_id?: string | null;
  status: string;
}) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    await db.insert(schema.reports).values({
      id: report.id,
      userId: report.user_id,
      workflowSlug: report.workflow_slug,
      workflowVersion: report.workflow_version ?? null,
      workflowParams: JSON.stringify(report.workflow_params),
      mode: report.mode,
      title: report.title,
      estimatedTime: report.estimated_time ?? null,
      valyuTaskId: report.valyu_task_id ?? null,
      status: report.status,
    });
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("reports").insert({
    id: report.id,
    user_id: report.user_id,
    workflow_slug: report.workflow_slug,
    workflow_version: report.workflow_version ?? null,
    workflow_params: report.workflow_params,
    mode: report.mode,
    title: report.title,
    estimated_time: report.estimated_time ?? null,
    valyu_task_id: report.valyu_task_id ?? null,
    status: report.status,
  });
  return { error };
}

export async function updateReport(
  reportId: string,
  userId: string,
  updates: {
    status?: string;
    valyu_task_id?: string | null;
    output?: string | null;
    sources?: unknown[] | null;
    pdf_url?: string | null;
    error_message?: string | null;
    completed_at?: Date | null;
  }
) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    const updateData: any = { updatedAt: new Date() };
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.valyu_task_id !== undefined) updateData.valyuTaskId = updates.valyu_task_id;
    if (updates.output !== undefined) updateData.output = updates.output;
    if (updates.sources !== undefined)
      updateData.sources = updates.sources ? JSON.stringify(updates.sources) : null;
    if (updates.pdf_url !== undefined) updateData.pdfUrl = updates.pdf_url;
    if (updates.error_message !== undefined) updateData.errorMessage = updates.error_message;
    if (updates.completed_at !== undefined) updateData.completedAt = updates.completed_at;

    await db
      .update(schema.reports)
      .set(updateData)
      .where(
        and(eq(schema.reports.id, reportId), eq(schema.reports.userId, userId))
      );
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const updateData: any = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.valyu_task_id !== undefined) updateData.valyu_task_id = updates.valyu_task_id;
  if (updates.output !== undefined) updateData.output = updates.output;
  if (updates.sources !== undefined) updateData.sources = updates.sources;
  if (updates.pdf_url !== undefined) updateData.pdf_url = updates.pdf_url;
  if (updates.error_message !== undefined) updateData.error_message = updates.error_message;
  if (updates.completed_at !== undefined)
    updateData.completed_at = updates.completed_at ? updates.completed_at.toISOString() : null;

  const { error } = await supabase
    .from("reports")
    .update(updateData)
    .eq("id", reportId)
    .eq("user_id", userId);
  return { error };
}

export async function deleteReport(reportId: string, userId: string) {
  if (isSelfHostedMode()) {
    const db = getLocalDb();
    await db
      .delete(schema.reports)
      .where(
        and(eq(schema.reports.id, reportId), eq(schema.reports.userId, userId))
      );
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId)
    .eq("user_id", userId);
  return { error };
}
