/**
 * Shared report types + normalization. DB rows come back camelCase from
 * SQLite (Drizzle) and snake_case from Supabase; the client wants one shape.
 */

export interface ReportDTO {
  id: string;
  workflow_slug: string;
  workflow_version: number | null;
  workflow_params: Record<string, unknown>;
  query: string | null;
  mode: string;
  title: string;
  estimated_time: string | null;
  valyu_task_id: string | null;
  status: string;
  output: string | null;
  sources: unknown[] | null;
  activity: ActivityItem[] | null;
  pdf_url: string | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
}

/** A source surfaced during a research step. */
export interface ActivitySource {
  source_id?: string;
  title?: string;
  url?: string;
  content?: string;
}

/**
 * One entry in the live DeepResearch activity feed, derived from the task
 * status `messages[]` transcript. Mirrors the Valyu playground feed.
 */
export type ActivityItem =
  | { kind: "reasoning"; text: string }
  | { kind: "text"; text: string }
  | { kind: "step"; objective: string; sources: ActivitySource[] };

/**
 * Parse the DeepResearch status `messages[]` transcript into an ordered
 * activity feed. Pure + client-safe (also called server-side in sync).
 *
 * Shape (verified against the live API):
 *   messages[]: { role, content: part[] }
 *   assistant part: {type:"reasoning",text} | {type:"text",text}
 *                   | {type:"tool-call", toolCallId, toolName:"research", input:{objective}}
 *   tool part:      {type:"tool-result", toolCallId, output:{value:{sources:[...]}}}
 */
export function parseActivityFromMessages(messages: any): ActivityItem[] {
  if (!Array.isArray(messages)) return [];

  // First pass: map toolCallId -> sources from any tool-result parts.
  const sourcesByCall = new Map<string, ActivitySource[]>();
  for (const msg of messages) {
    const content = Array.isArray(msg?.content) ? msg.content : [];
    for (const part of content) {
      if (part?.type === "tool-result") {
        const raw = part?.output?.value?.sources ?? part?.output?.sources ?? [];
        if (Array.isArray(raw)) {
          sourcesByCall.set(
            part.toolCallId,
            raw.map((s: any) => ({
              source_id: s?.source_id,
              title: s?.title,
              url: s?.url,
              content: s?.content ?? s?.summary ?? s?.description,
            })),
          );
        }
      }
    }
  }

  // Second pass: walk assistant parts in order, emitting feed items.
  const items: ActivityItem[] = [];
  for (const msg of messages) {
    if (msg?.role !== "assistant") continue;
    const content = Array.isArray(msg?.content) ? msg.content : [];
    for (const part of content) {
      if (part?.type === "reasoning" && part.text?.trim()) {
        items.push({ kind: "reasoning", text: part.text });
      } else if (part?.type === "text" && part.text?.trim()) {
        items.push({ kind: "text", text: part.text });
      } else if (part?.type === "tool-call") {
        const objective = part?.input?.objective ?? part?.input?.query ?? "Research";
        items.push({ kind: "step", objective, sources: sourcesByCall.get(part.toolCallId) ?? [] });
      }
    }
  }
  return items;
}

const pick = (row: any, snake: string, camel: string) =>
  row[snake] !== undefined ? row[snake] : row[camel];

const toIso = (v: any): string | null => {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return typeof v === "string" ? v : String(v);
};

const parseMaybe = (v: any) => {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
};

export function normalizeReport(row: any): ReportDTO {
  return {
    id: row.id,
    workflow_slug: pick(row, "workflow_slug", "workflowSlug"),
    workflow_version: pick(row, "workflow_version", "workflowVersion") ?? null,
    workflow_params: parseMaybe(pick(row, "workflow_params", "workflowParams")) ?? {},
    query: row.query ?? null,
    mode: row.mode,
    title: row.title,
    estimated_time: pick(row, "estimated_time", "estimatedTime") ?? null,
    valyu_task_id: pick(row, "valyu_task_id", "valyuTaskId") ?? null,
    status: row.status,
    output: row.output ?? null,
    sources: parseMaybe(row.sources),
    activity: parseMaybe(row.activity) ?? null,
    pdf_url: pick(row, "pdf_url", "pdfUrl") ?? null,
    error_message: pick(row, "error_message", "errorMessage") ?? null,
    created_at: toIso(pick(row, "created_at", "createdAt")),
    updated_at: toIso(pick(row, "updated_at", "updatedAt")),
    completed_at: toIso(pick(row, "completed_at", "completedAt")),
  };
}

export const TERMINAL = ["completed", "failed", "cancelled"];
export const isTerminal = (status: string) => TERMINAL.includes(status);
