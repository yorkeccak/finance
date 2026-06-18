import * as db from "@/lib/db";
import { normalizeReport } from "@/lib/reports";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** GET /api/reports/[reportId] — read the persisted report (resumable view). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const { data: { user } } = await db.getUserFromRequest(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: row } = await db.getReport(reportId, user.id);
    if (!row) return json({ error: "Not found" }, 404);

    return json({ report: normalizeReport(row) });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}

/** DELETE /api/reports/[reportId] */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await params;
    const { data: { user } } = await db.getUserFromRequest(req);
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { error } = await db.deleteReport(reportId, user.id);
    if (error) return json({ error: (error as any).message || "Delete failed" }, 500);

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
}
