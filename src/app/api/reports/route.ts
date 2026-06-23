import { deriveTitle, type ReportDTO } from "@/lib/reports";
import {
  createDeepResearchTask,
  ValyuError,
  type ResearchMode,
} from "@/lib/valyu-workflows";
import { isSelfHostedMode } from "@/lib/local-db/local-auth";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** POST /api/reports - launch a DeepResearch task (freeform query or workflow). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      workflow_slug,
      workflow_params,
      query,
      mode = "standard",
      title,
      valyuAccessToken,
      tools,
    }: {
      workflow_slug?: string;
      workflow_params?: Record<string, unknown>;
      query?: string;
      mode?: ResearchMode;
      title?: string;
      estimated_time?: string;
      valyuAccessToken?: string;
      tools?: {
        charts?: boolean;
        codeExecution?: boolean;
        deliverables?: { type: string; description?: string }[];
      };
    } = body;

    if (!isSelfHostedMode() && !valyuAccessToken) {
      return json({ error: "AUTH_REQUIRED", message: "Sign in with Valyu to run research." }, 401);
    }

    // Two launch modes: freeform `query` (chat-launched) OR a workflow run.
    const freeformQuery = typeof query === "string" ? query.trim() : "";
    const isFreeform = freeformQuery.length > 0;
    if (!isFreeform && (!workflow_slug || !workflow_params)) {
      return json({ error: "Provide a query, or workflow_slug + workflow_params" }, 400);
    }

    // Kick off the async Valyu task.
    let task;
    try {
      task = await createDeepResearchTask(
        isFreeform
          ? { query: freeformQuery, mode, tools }
          : { workflowSlug: workflow_slug, workflowParams: workflow_params, mode },
        { valyuAccessToken },
      );
    } catch (e) {
      if (e instanceof ValyuError) {
        return json({ error: e.message }, e.status === 402 ? 402 : e.status === 401 || e.status === 403 ? 401 : 502);
      }
      throw e;
    }

    // Minimal DTO keyed by the deepresearch id. The client routes to
    // /?research=<id> and syncs against the task for everything else.
    const report: Partial<ReportDTO> = {
      id: task.deepresearchId,
      status: task.status,
      title: title || (isFreeform ? deriveTitle(freeformQuery) : workflow_slug) || "Research",
      query: isFreeform ? freeformQuery : null,
      mode,
      workflow_slug: isFreeform ? "freeform" : workflow_slug!,
      created_at: null,
    };

    return json({ report });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
