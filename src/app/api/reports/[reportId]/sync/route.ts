import * as db from "@/lib/db";
import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { normalizeReport, isTerminal } from "@/lib/reports";
import {
  getDeepResearchStatus,
  isTerminalStatus,
  isTransientValyuError,
  ValyuError,
} from "@/lib/valyu-workflows";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * POST /api/reports/[reportId]/sync — pull the latest Valyu task status and
 * persist it. The client calls this on an interval while a report is running.
 *
 * Resilience (Phase 0 learning): a failed status fetch does NOT fail the
 * report. Transient errors are swallowed (the client just polls again); only
 * Valyu reporting status=failed marks the report failed.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const body = await req.clone().json().catch(() => ({}));
    const valyuAccessToken: string | undefined = body?.valyuAccessToken;

    const { data: { user } } = await db.getUserFromRequest(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: row } = await db.getReport(reportId, user.id);
    if (!row) return json({ error: "Not found" }, 404);

    const report = normalizeReport(row);

    // No hosted access token → the user needs to re-authenticate before we can
    // poll status. Surface this as a first-class signal (200 so the report
    // still renders) rather than letting a downstream 401 spin forever.
    if (!isSelfHostedMode() && !valyuAccessToken) {
      return json({ report, authExpired: true }, 200);
    }

    // Already done, or no task to poll — return as-is.
    if (isTerminal(report.status) || !report.valyu_task_id) {
      return json({ report });
    }

    let status;
    try {
      status = await getDeepResearchStatus(report.valyu_task_id, { valyuAccessToken });
    } catch (e) {
      // Transient (5xx/network/rate-limit) → keep the run alive, just retry next poll.
      if (isTransientValyuError(e)) {
        return json({ report, transient: true });
      }
      // Auth expired/forbidden → surface a re-auth signal so the client can
      // prompt sign-in instead of polling against a dead token.
      if (e instanceof ValyuError && (e.status === 401 || e.status === 403)) {
        return json({ report, authExpired: true }, 200);
      }
      // Hard error (e.g. credits) → surface it but don't kill the run.
      const message = e instanceof ValyuError ? e.message : "Status check failed";
      return json({ report, syncError: message }, 200);
    }

    const activity = status.activity && status.activity.length > 0 ? status.activity : undefined;
    // Adopt Valyu's auto-generated title once available (freeform runs start
    // with a truncated-query placeholder).
    const newTitle =
      status.title && status.title.trim() && status.title !== report.title ? status.title : undefined;

    if (isTerminalStatus(status.status)) {
      const completedAt = new Date();
      await db.updateReport(reportId, user.id, {
        status: status.status,
        title: newTitle,
        output: status.output ?? null,
        sources: status.sources ?? null,
        // Only overwrite activity when this response carried it — don't wipe
        // the feed accumulated during the run if the terminal payload omits it.
        activity,
        pdf_url: status.pdfUrl ?? null,
        error_message: status.status === "failed" ? (status.raw?.error ?? "Research task failed") : null,
        completed_at: completedAt,
      });
    } else {
      // Running/queued: persist the growing activity feed + title + status so a
      // mid-run resume (reload / reopen from /reports) shows progress so far.
      await db.updateReport(reportId, user.id, {
        status: status.status && status.status !== report.status ? status.status : undefined,
        title: newTitle,
        activity,
      });
    }

    const { data: fresh } = await db.getReport(reportId, user.id);
    return json({
      report: fresh ? normalizeReport(fresh) : report,
      progress: status.progress ?? null,
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
