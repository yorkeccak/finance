import { randomUUID } from "crypto";
import * as db from "@/lib/db";
import { normalizeReport } from "@/lib/reports";
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

/** GET /api/reports — list the user's reports (sidebar). */
export async function GET(req: Request) {
  try {
    const { data: { user } } = await db.getUserFromRequest(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data, error } = await db.getReports(user.id);
    if (error) return json({ error: (error as any).message || "DB error" }, 500);

    return json({ reports: (data || []).map(normalizeReport) });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}

/** POST /api/reports — launch a workflow as a DeepResearch task. */
export async function POST(req: Request) {
  try {
    const reqClone = req.clone();
    const body = await req.json();
    const {
      workflow_slug,
      workflow_params,
      query,
      mode = "standard",
      title,
      estimated_time,
      valyuAccessToken,
    }: {
      workflow_slug?: string;
      workflow_params?: Record<string, unknown>;
      query?: string;
      mode?: ResearchMode;
      title?: string;
      estimated_time?: string;
      valyuAccessToken?: string;
    } = body;

    const { data: { user } } = await db.getUserFromRequest(reqClone);
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Two launch modes: freeform `query` (chat-launched) OR a workflow run.
    const freeformQuery = typeof query === "string" ? query.trim() : "";
    const isFreeform = freeformQuery.length > 0;
    if (!isFreeform && (!workflow_slug || !workflow_params)) {
      return json({ error: "Provide a query, or workflow_slug + workflow_params" }, 400);
    }
    if (!isSelfHostedMode() && !valyuAccessToken) {
      return json({ error: "AUTH_REQUIRED", message: "Sign in with Valyu to run research." }, 401);
    }

    // Kick off the async Valyu task.
    let task;
    try {
      task = await createDeepResearchTask(
        isFreeform
          ? { query: freeformQuery, mode }
          : { workflowSlug: workflow_slug, workflowParams: workflow_params, mode },
        { valyuAccessToken },
      );
    } catch (e) {
      if (e instanceof ValyuError) {
        return json({ error: e.message }, e.status === 402 ? 402 : e.status === 401 || e.status === 403 ? 401 : 502);
      }
      throw e;
    }

    // Initial title for freeform runs = a truncated query; replaced by Valyu's
    // auto-generated title on first sync.
    const initialTitle = isFreeform
      ? (title || freeformQuery.slice(0, 80) + (freeformQuery.length > 80 ? "…" : ""))
      : (title || workflow_slug || "Report");

    const reportId = randomUUID();
    const { error } = await db.createReport({
      id: reportId,
      user_id: user.id,
      workflow_slug: isFreeform ? "freeform" : workflow_slug!,
      workflow_version: task.workflowVersion ?? null,
      workflow_params: isFreeform ? {} : workflow_params!,
      query: isFreeform ? freeformQuery : null,
      mode,
      title: initialTitle,
      estimated_time: estimated_time ?? null,
      valyu_task_id: task.deepresearchId,
      status: task.status,
    });
    if (error) return json({ error: (error as any).message || "Failed to save report" }, 500);

    const { data: row } = await db.getReport(reportId, user.id);
    return json({ report: row ? normalizeReport(row) : { id: reportId, status: task.status } });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
