import { isSelfHostedMode } from "@/lib/local-db/local-auth";
import { statusToDTO } from "@/lib/reports";
import {
  deleteDeepResearchTask,
  getDeepResearchStatus,
  ValyuError,
} from "@/lib/valyu-workflows";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const tokenFromRequest = async (req: Request): Promise<string | undefined> => {
  const body = await req.json().catch(() => ({}));
  return body?.valyuAccessToken;
};

/** GET /api/reports/[reportId] - read the task status as a report. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const valyuAccessToken = new URL(req.url).searchParams.get("valyuAccessToken") ?? undefined;

    if (!isSelfHostedMode() && !valyuAccessToken) {
      return json({ error: "AUTH_REQUIRED", message: "Sign in with Valyu." }, 401);
    }

    const status = await getDeepResearchStatus(reportId, { valyuAccessToken });
    return json({ report: statusToDTO(reportId, status) });
  } catch (err) {
    if (err instanceof ValyuError && (err.status === 401 || err.status === 403)) {
      return json({ error: err.message }, 401);
    }
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}

/** DELETE /api/reports/[reportId] - delete the DeepResearch task. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const valyuAccessToken = await tokenFromRequest(req);

    if (!isSelfHostedMode() && !valyuAccessToken) {
      return json({ error: "AUTH_REQUIRED", message: "Sign in with Valyu." }, 401);
    }

    await deleteDeepResearchTask(reportId, { valyuAccessToken });
    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
