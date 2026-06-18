import * as db from "@/lib/db";
import { normalizeReport, isTerminal } from "@/lib/reports";
import { cancelDeepResearchTask, ValyuError } from "@/lib/valyu-workflows";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * POST /api/reports/[reportId]/cancel — cancel a running DeepResearch task and
 * mark the report cancelled. No-op if already terminal.
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
    if (isTerminal(report.status)) return json({ report });

    if (report.valyu_task_id) {
      try {
        await cancelDeepResearchTask(report.valyu_task_id, { valyuAccessToken });
      } catch (e) {
        // If Valyu cancel fails non-fatally, still mark locally cancelled.
        if (!(e instanceof ValyuError)) throw e;
      }
    }

    await db.updateReport(reportId, user.id, {
      status: "cancelled",
      completed_at: new Date(),
    });

    const { data: fresh } = await db.getReport(reportId, user.id);
    return json({ report: fresh ? normalizeReport(fresh) : { ...report, status: "cancelled" } });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
