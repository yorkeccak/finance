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

export async function apiListReports(): Promise<ReportDTO[]> {
  const { headers } = await buildAuth();
  const res = await fetch("/api/reports", { headers });
  if (!res.ok) throw new Error("Failed to load reports");
  return (await res.json()).reports ?? [];
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
  if (!res.ok) throw new Error(json.error || json.message || "Failed to start report");
  return json.report;
}

export async function apiSyncReport(
  reportId: string,
): Promise<{ report: ReportDTO; progress?: { current_step?: number; total_steps?: number } | null; transient?: boolean; syncError?: string }> {
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
  const { headers } = await buildAuth();
  await fetch(`/api/reports/${reportId}`, { method: "DELETE", headers });
}

export async function apiDownloadReportPdf(reportId: string, filename: string): Promise<void> {
  const { headers } = await buildAuth();
  const res = await fetch(`/api/reports/${reportId}/pdf`, { method: "POST", headers });
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
