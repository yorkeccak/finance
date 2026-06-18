import { Resend } from "resend";
import * as db from "@/lib/db";
import { normalizeReport } from "@/lib/reports";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://finance.valyu.ai";

/**
 * POST /api/reports/webhook?key=<secret> — Valyu calls this when a DeepResearch
 * task completes. We email the owner a link back to the report. Auth is a shared
 * secret in the query string (REPORT_WEBHOOK_SECRET), since Valyu can't send our
 * app's auth headers.
 *
 * We intentionally do NOT mutate report status here — the client sync pulls the
 * full output/sources when the user opens it (avoids the terminal-skip race).
 * This endpoint's only job is the email ping.
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = process.env.REPORT_WEBHOOK_SECRET;
    if (!secret || url.searchParams.get("key") !== secret) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({} as any));
    const data = body?.data ?? body;
    const taskId = data?.deepresearch_id ?? data?.id ?? data?.task_id;
    const status: string | undefined = data?.status;

    // Only notify on a successful finish.
    if (!taskId || status !== "completed") return json({ ok: true, skipped: true });

    const { data: row } = await db.getReportByTaskId(taskId);
    if (!row) return json({ ok: true, notFound: true });
    const report = normalizeReport(row);

    const userId = (row as any).user_id ?? (row as any).userId;
    const { data: profile } = await db.getUserProfile(userId);
    const email = (profile as any)?.email as string | undefined;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !email || email.endsWith("@local")) {
      // Not configured (or dev placeholder email) — accept the webhook, no email.
      return json({ ok: true, emailed: false });
    }

    const link = `${APP_URL.replace(/\/$/, "")}/?research=${report.id}`;
    const title = report.title || "Your DeepResearch report";
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "Finance by Valyu <support@valyu.ai>",
      to: email,
      subject: `Your research is ready — ${title}`,
      html: `
        <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1c28">
          <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7a7a86;margin:0 0 8px">Deep Research</p>
          <h1 style="font-size:22px;font-weight:400;margin:0 0 12px;line-height:1.3">Your research is ready</h1>
          <p style="font-size:15px;color:#3a3a48;margin:0 0 20px;line-height:1.5">${title}</p>
          <a href="${link}" style="display:inline-block;background:#1c1c28;color:#fff;text-decoration:none;font-size:14px;font-weight:500;padding:11px 20px;border-radius:12px">View report →</a>
          <p style="font-size:12px;color:#9a9aa6;margin:24px 0 0">Finance by Valyu</p>
        </div>`,
    });

    return json({ ok: true, emailed: true });
  } catch (err) {
    // Swallow errors → 200 so Valyu doesn't hammer retries on our bugs.
    return json({ ok: false, error: err instanceof Error ? err.message : "error" });
  }
}
