/**
 * Client-side helpers for the reports API. Resolves auth in both modes:
 *  - valyu mode: Supabase session token (Authorization) + Valyu OAuth token
 *    (in the body, for charging the user's credits).
 *  - self-hosted: both are absent; the server falls back to the dev user +
 *    VALYU_API_KEY.
 */

import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import type { ReportDTO } from "@/lib/reports";

export async function buildAuth(): Promise<{ headers: Record<string, string>; valyuAccessToken?: string }> {
  const headers: Record<string, string> = {};
  let valyuAccessToken: string | undefined;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {
    /* self-hosted / no supabase */
  }
  try {
    const token = await useAuthStore.getState().getValidValyuAccessToken?.();
    valyuAccessToken = token ?? undefined;
  } catch {
    /* no valyu session */
  }
  return { headers, valyuAccessToken };
}

/** Turn a failed response into a user-facing Error, with friendly copy for
 *  the statuses worth distinguishing (rate-limit, credits, auth). */
export function errorFromResponse(res: Response, body: { error?: string; message?: string }, fallback: string): Error {
  if (res.status === 429) {
    return new Error("You're sending requests too quickly. Wait a few seconds and try again.");
  }
  if (res.status === 402) {
    return new Error(body.error || body.message || "Insufficient Valyu credits. Top up your account to continue.");
  }
  if (res.status === 401) {
    return new Error(body.error === "AUTH_REQUIRED" ? (body.message || "Sign in with Valyu to run research.") : (body.message || body.error || "Your session expired. Please sign in again."));
  }
  return new Error(body.error || body.message || fallback);
}

/**
 * History/list: the canonical DeepResearch index (list + hydrate per task).
 * Returns the caller's runs with auto-generated titles and current statuses.
 * Never hard-fails on an auth lapse (server returns an empty list + flag).
 */
export async function apiReportHistory(): Promise<ReportDTO[]> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch("/api/reports/history", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw errorFromResponse(res, json, "Failed to load history");
  // The route answers 200 with a `syncError` when the upstream list call failed
  // (e.g. rate-limited). Surface it as an error so callers show "couldn't load"
  // instead of a misleading "no reports yet" empty state. `authExpired` is a
  // legitimate signed-out state, so it stays an empty list, not an error.
  if (json.syncError && (json.reports?.length ?? 0) === 0) {
    throw new Error(json.syncError);
  }
  return json.reports ?? [];
}

/** Reports are backed entirely by the DeepResearch index - list == history. */
export async function apiListReports(): Promise<ReportDTO[]> {
  return apiReportHistory();
}

export interface CreateReportInput {
  workflow_slug: string;
  workflow_params: Record<string, unknown>;
  mode: string;
  title: string;
  estimated_time?: string;
}

export async function apiCreateReport(input: CreateReportInput): Promise<ReportDTO> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw errorFromResponse(res, json, "Failed to start report");
  return json.report;
}

/** Downloadable artifact formats a run can produce alongside the report. */
export type DeliverableType = "csv" | "xlsx" | "pptx" | "docx" | "pdf";

/** A requested downloadable artifact: a format plus a description of what it
 *  should contain (the description guides what the run produces). */
export interface DeliverableItem {
  type: DeliverableType;
  description: string;
  /** Proposed by the extractor rather than typed by the user. Drives the UI
   *  only: it travels as far as our own launch route, which maps deliverables
   *  field by field, so it never reaches Valyu. Cleared when the row is edited. */
  suggested?: boolean;
}

/** Optional research enhancements toggled per run. */
export interface ResearchTools {
  charts?: boolean;
  codeExecution?: boolean;
  deliverables?: DeliverableItem[];
}

/**
 * Ask the server which deliverables (if any) a query implies, so the picker can
 * be pre-filled with a format AND a description written from the query itself.
 *
 * Advisory and best-effort: never throws, and answers `[]` whenever the
 * extractor is unavailable. Callers treat that as "no suggestion" and carry on.
 */
export async function apiSuggestDeliverables(
  query: string,
  signal?: AbortSignal,
): Promise<DeliverableItem[]> {
  try {
    const res = await fetch("/api/deliverables/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal,
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.suggestions ?? []).map((s: { type: DeliverableType; description: string }) => ({
      type: s.type,
      description: s.description,
      suggested: true,
    }));
  } catch {
    return [];
  }
}

/** Launch a freeform DeepResearch run from a chat query. */
export async function apiCreateResearch(query: string, mode: string, tools?: ResearchTools): Promise<ReportDTO> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode, valyuAccessToken, tools }),
  });
  const json = await res.json();
  if (!res.ok) throw errorFromResponse(res, json, "Failed to start research");
  return json.report;
}

/** Cancel a running report/research run. */
export async function apiCancelReport(reportId: string): Promise<ReportDTO> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch(`/api/reports/${reportId}/cancel`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to cancel");
  return json.report;
}

export async function apiSyncReport(
  reportId: string,
): Promise<{ report: ReportDTO; progress?: { current_step?: number; total_steps?: number } | null; transient?: boolean; syncError?: string; authExpired?: boolean }> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch(`/api/reports/${reportId}/sync`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to sync report");
  return json;
}

export async function apiDeleteReport(reportId: string): Promise<void> {
  const { headers, valyuAccessToken } = await buildAuth();
  await fetch(`/api/reports/${reportId}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
}

export async function apiDownloadReportPdf(reportId: string, filename: string): Promise<void> {
  const { headers, valyuAccessToken } = await buildAuth();
  const res = await fetch(`/api/reports/${reportId}/pdf`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ valyuAccessToken }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "PDF export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
