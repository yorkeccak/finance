import { listItemToDTO, type ReportDTO } from "@/lib/reports";
import { listDeepResearchTasks, ValyuError } from "@/lib/valyu-workflows";
import { isSelfHostedMode } from "@/lib/local-db/local-auth";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * POST /api/reports/history - list the caller's DeepResearch tasks.
 *
 * The list index already carries everything this view needs (id, query,
 * auto-generated title, status, created_at), so it maps straight to DTOs with
 * a SINGLE upstream call. Full output/sources are fetched lazily, only when a
 * report is opened (see /api/reports/[reportId]/sync). Hydrating every task
 * here would fan out to one request per task on every poll - the cause of the
 * 429s. Scoped to the authenticated key/token server-side.
 */
export async function POST(req: Request) {
  try {
    const { valyuAccessToken } = await req.json().catch(() => ({}));

    if (!isSelfHostedMode() && !valyuAccessToken) {
      return json({ reports: [], authExpired: true });
    }

    let tasks;
    try {
      tasks = await listDeepResearchTasks({ valyuAccessToken });
    } catch (e) {
      if (e instanceof ValyuError && (e.status === 401 || e.status === 403)) {
        return json({ reports: [], authExpired: true });
      }
      return json({ reports: [], syncError: e instanceof Error ? e.message : "Failed to load history" });
    }

    const reports: ReportDTO[] = tasks.map(listItemToDTO);

    reports.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    return json({ reports });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
