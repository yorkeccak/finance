import { listItemToDTO, statusToDTO, type ReportDTO } from "@/lib/reports";
import {
  listDeepResearchTasks,
  getDeepResearchStatus,
  ValyuError,
} from "@/lib/valyu-workflows";
import { isSelfHostedMode } from "@/lib/local-db/local-auth";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * POST /api/reports/history - list the caller's DeepResearch tasks.
 *
 * The list index is thin (id/query/status/created_at), so each task is
 * hydrated in parallel via the status endpoint to pull the auto-generated
 * title and current status. Scoped to the authenticated key/token server-side.
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

    const reports: ReportDTO[] = await Promise.all(
      tasks.map(async (task) => {
        const base = listItemToDTO(task);
        try {
          const status = await getDeepResearchStatus(task.taskId, { valyuAccessToken });
          return statusToDTO(task.taskId, status, base);
        } catch {
          // Transient hydrate failure - fall back to the thin list entry.
          return base;
        }
      }),
    );

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
