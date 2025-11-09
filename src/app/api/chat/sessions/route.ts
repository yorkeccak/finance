import * as db from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: Request) {
  const { data: { user } } = await db.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { data: sessions, error } = await db.getChatSessions(user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

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
}

export async function POST(req: Request) {
  const { title = "New Chat" } = await req.json();

  const { data: { user } } = await db.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const sessionId = randomUUID();
  const { error } = await db.createChatSession({
    id: sessionId,
    user_id: user.id,
    title
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message || error }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Fetch the newly created session
  const { data: session } = await db.getChatSession(sessionId, user.id);

  return new Response(JSON.stringify({ session }), {
    headers: { "Content-Type": "application/json" }
  });
}