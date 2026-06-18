/**
 * Shared report types + normalization. DB rows come back camelCase from
 * SQLite (Drizzle) and snake_case from Supabase; the client wants one shape.
 */

export interface ReportDTO {
  id: string;
  workflow_slug: string;
  workflow_version: number | null;
  workflow_params: Record<string, unknown>;
  mode: string;
  title: string;
  estimated_time: string | null;
  valyu_task_id: string | null;
  status: string;
  output: string | null;
  sources: unknown[] | null;
  pdf_url: string | null;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
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
    mode: row.mode,
    title: row.title,
    estimated_time: pick(row, "estimated_time", "estimatedTime") ?? null,
    valyu_task_id: pick(row, "valyu_task_id", "valyuTaskId") ?? null,
    status: row.status,
    output: row.output ?? null,
    sources: parseMaybe(row.sources),
    pdf_url: pick(row, "pdf_url", "pdfUrl") ?? null,
    error_message: pick(row, "error_message", "errorMessage") ?? null,
    created_at: toIso(pick(row, "created_at", "createdAt")),
    updated_at: toIso(pick(row, "updated_at", "updatedAt")),
    completed_at: toIso(pick(row, "completed_at", "completedAt")),
  };
}

export const TERMINAL = ["completed", "failed", "cancelled"];
export const isTerminal = (status: string) => TERMINAL.includes(status);
