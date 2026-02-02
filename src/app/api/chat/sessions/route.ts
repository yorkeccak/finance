import * as db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: Request) {
  console.log('[Sessions API] GET request');

  try {
    const { data: { user } } = await db.getUserFromRequest(req);

    if (!user) {
      console.log('[Sessions API] No user - returning 401');
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log('[Sessions API] Fetching sessions for user:', user.id);
    const { data: sessions, error } = await db.getChatSessions(user.id);

    if (error) {
      console.error('[Sessions API] DB error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log('[Sessions API] Found', sessions?.length || 0, 'sessions');

    // Normalize field names (SQLite uses camelCase, Supabase uses snake_case)
    const normalizedSessions = sessions?.map((s: any) => ({
      id: s.id,
      title: s.title,
      created_at: s.created_at || s.createdAt,
      updated_at: s.updated_at || s.updatedAt,
      last_message_at: s.last_message_at || s.lastMessageAt,
    })) || [];

    return new Response(JSON.stringify({ sessions: normalizedSessions }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error('[Sessions API] Unexpected error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(req: Request) {
  console.log('[Sessions API] POST request');

  try {
    const reqClone = req.clone();
    const { title = "New Chat" } = await req.json();
    const { data: { user } } = await db.getUserFromRequest(reqClone);

    if (!user) {
      console.log('[Sessions API] No user - returning 401');
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const sessionId = randomUUID();
    console.log('[Sessions API] Creating session:', sessionId, 'for user:', user.id);

    const { error } = await db.createChatSession({
      id: sessionId,
      user_id: user.id,
      title
    });

    if (error) {
      console.error('[Sessions API] Create error:', error);
      return new Response(JSON.stringify({ error: error.message || error }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { data: session } = await db.getChatSession(sessionId, user.id);
    console.log('[Sessions API] Created session:', sessionId);

    return new Response(JSON.stringify({ session }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error('[Sessions API] Unexpected error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
