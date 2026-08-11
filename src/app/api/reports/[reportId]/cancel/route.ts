import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { statusToDTO } from "@/lib/reports";
import {
  cancelDeepResearchTask,
  getDeepResearchStatus,
  ValyuError,
} from "@/lib/valyu-workflows";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * POST /api/reports/[reportId]/cancel - cancel a running DeepResearch task.
 * `reportId` is the deepresearch id. Returns the refreshed task as the report.
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
      return json({ error: "AUTH_REQUIRED", message: "Sign in with Valyu to cancel research." }, 401);
    }

    try {
      await cancelDeepResearchTask(reportId, { valyuAccessToken });
    } catch (e) {
      // A non-fatal cancel failure (e.g. already terminal) still falls through
      // to a status read so the client gets the current state.
      if (!(e instanceof ValyuError)) throw e;
    }

    const status = await getDeepResearchStatus(reportId, { valyuAccessToken });
    return json({ report: statusToDTO(reportId, status) });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
