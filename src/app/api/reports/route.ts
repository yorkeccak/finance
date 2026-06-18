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
      mode = "standard",
      title,
      estimated_time,
      valyuAccessToken,
    }: {
      workflow_slug?: string;
      workflow_params?: Record<string, unknown>;
      mode?: ResearchMode;
      title?: string;
      estimated_time?: string;
      valyuAccessToken?: string;
    } = body;

    const { data: { user } } = await db.getUserFromRequest(reqClone);
    if (!user) return json({ error: "Unauthorized" }, 401);

    if (!workflow_slug || !workflow_params) {
      return json({ error: "workflow_slug and workflow_params are required" }, 400);
    }
    if (!isSelfHostedMode() && !valyuAccessToken) {
      return json({ error: "AUTH_REQUIRED", message: "Sign in with Valyu to run reports." }, 401);
    }

    // Kick off the async Valyu task.
    let task;
    try {
      task = await createDeepResearchTask(
        { workflowSlug: workflow_slug, workflowParams: workflow_params, mode },
        { valyuAccessToken },
      );
    } catch (e) {
      if (e instanceof ValyuError) {
        return json({ error: e.message }, e.status === 402 ? 402 : e.status === 401 || e.status === 403 ? 401 : 502);
      }
      throw e;
    }

    const reportId = randomUUID();
    const { error } = await db.createReport({
      id: reportId,
      user_id: user.id,
      workflow_slug,
      workflow_version: task.workflowVersion ?? null,
      workflow_params,
      mode,
      title: title || workflow_slug,
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
