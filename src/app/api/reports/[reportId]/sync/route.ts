import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { statusToDTO, deriveTitle, type ReportDTO } from "@/lib/reports";
import {
  getDeepResearchStatus,
  isTransientValyuError,
  ValyuError,
} from "@/lib/valyu-workflows";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** A placeholder DTO when we can only key off the deepresearch id. */
const minimalFromId = (id: string): ReportDTO => ({
  id,
  workflow_slug: "freeform",
  workflow_version: null,
  workflow_params: {},
  query: null,
  mode: "standard",
  title: deriveTitle(null),
  estimated_time: null,
  valyu_task_id: id,
  status: "running",
  output: null,
  sources: null,
  activity: null,
  pdf_url: null,
  error_message: null,
  created_at: null,
  updated_at: null,
  completed_at: null,
});

/**
 * POST /api/reports/[reportId]/sync - pull the latest task status straight from
 * Valyu. `reportId` is the deepresearch id. The client polls this on an
 * interval while a report is running.
 *
 * Resilience: a failed status fetch does NOT fail the report. Transient errors
 * are surfaced as `transient`/`syncError` (the client just polls again); only
 * Valyu reporting status=failed marks the report failed.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const body = await req.json().catch(() => ({}));
    const valyuAccessToken: string | undefined = body?.valyuAccessToken;

    if (!isSelfHostedMode() && !valyuAccessToken) {
      return json({ report: minimalFromId(reportId), authExpired: true }, 200);
    }

    let status;
    try {
      status = await getDeepResearchStatus(reportId, { valyuAccessToken });
    } catch (e) {
      // Transient (5xx/network/rate-limit) → keep the run alive, retry next poll.
      if (isTransientValyuError(e)) {
        return json({ report: minimalFromId(reportId), transient: true });
      }
      // Auth expired/forbidden → surface a re-auth signal so the client can
      // prompt sign-in instead of polling against a dead token.
      if (e instanceof ValyuError && (e.status === 401 || e.status === 403)) {
        return json({ report: minimalFromId(reportId), authExpired: true }, 200);
      }
      // Hard error (e.g. credits) → surface it but don't kill the run.
      const message = e instanceof ValyuError ? e.message : "Status check failed";
      return json({ report: minimalFromId(reportId), syncError: message }, 200);
    }

    return json({
      report: statusToDTO(reportId, status),
      progress: status.progress ?? null,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
