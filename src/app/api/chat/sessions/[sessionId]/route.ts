import * as db from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const { data: { user } } = await db.getUserFromRequest(req);

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401
    });
  }

  // Get session with messages
  const { data: session, error: sessionError } = await db.getChatSession(sessionId, user.id);

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404
    });
  }

  const { data: messages, error: messagesError } = await db.getChatMessages(sessionId);

  if (messagesError) {
    return new Response(JSON.stringify({ error: messagesError.message || messagesError }), {
      status: 500
    });
  }

  // Normalize messages format
  const normalizedMessages = messages?.map(msg => {
    // Parse content if it's a string (SQLite stores as TEXT)
    let parsedContent = msg.content;
    if (typeof msg.content === 'string') {
      try {
        parsedContent = JSON.parse(msg.content);
      } catch (e) {
        parsedContent = [];
      }
    }

    return {
      id: msg.id,
      role: msg.role,
      parts: parsedContent || [],
      createdAt: (msg as any).created_at || (msg as any).createdAt,
      processing_time_ms: (msg as any).processing_time_ms || (msg as any).processingTimeMs,
    };
  }) || [];

  return new Response(JSON.stringify({
    session,
    messages: normalizedMessages
  }));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const { data: { user } } = await db.getUserFromRequest(req);

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401
    });
  }

  const { error } = await db.deleteChatSession(sessionId, user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message || error }), {
      status: 500
    });
  }

  return new Response(JSON.stringify({ success: true }));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const reqClone = req.clone();
  const { title } = await req.json();

  const { data: { user } } = await db.getUserFromRequest(reqClone);

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401
    });
  }

  const { error } = await db.updateChatSession(sessionId, user.id, { title });

  if (error) {
    return new Response(JSON.stringify({ error: error.message || error }), {
      status: 500
    });
  }

  return new Response(JSON.stringify({ success: true }));
}
