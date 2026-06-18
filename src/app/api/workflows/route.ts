import * as db from "@/lib/db";
import { listWorkflows, ValyuError } from "@/lib/valyu-workflows";
import { normalizeWorkflow } from "@/lib/workflow-types";
import { FINANCE_VERTICALS, isFinanceVertical } from "@/lib/domains";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * GET /api/workflows?vertical=<slug>
 *   - with a finance vertical → that vertical's templates
 *   - without → all finance-vertical templates (client filters "Popular")
 *
 * Catalog calls are free; valyu-mode routes them through the OAuth proxy using
 * the user's token (passed via the `x-valyu-token` header since this is a GET).
 */
export async function GET(req: Request) {
  try {
    const { data: { user } } = await db.getUserFromRequest(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const valyuAccessToken = req.headers.get("x-valyu-token") || undefined;
    const url = new URL(req.url);
    const vertical = url.searchParams.get("vertical") || undefined;

    let raw: any[];
    try {
      if (vertical) {
        if (!isFinanceVertical(vertical)) return json({ error: "Unknown vertical" }, 400);
        raw = await listWorkflows({ vertical, valyuAccessToken });
      } else {
        // One call for the whole curated catalog, then keep finance verticals.
        const all = await listWorkflows({ valyuAccessToken });
        raw = all.filter((w) => isFinanceVertical(w?.vertical));
      }
    } catch (e) {
      if (e instanceof ValyuError) {
        return json({ error: e.message }, e.status === 401 || e.status === 403 ? 401 : 502);
      }
      throw e;
    }

    const workflows = raw.map(normalizeWorkflow);
    return json({ workflows });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
