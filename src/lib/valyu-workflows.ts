/**
 * Server-side Valyu Workflows + DeepResearch client.
 *
 * Two transports, mirroring the rest of the app:
 *   - valyu mode: route through the platform OAuth proxy so the signed-in
 *     user's Valyu credits are charged (needs their `valyuAccessToken`).
 *   - self-hosted mode: call the Valyu REST API directly with VALYU_API_KEY.
 *
 * Workflows are Valyu-curated, versioned DeepResearch templates. A run is an
 * async task (queued → running → completed/failed/cancelled) that we poll.
 *
 * NOTE (learned in the Phase 0 spike): the /status endpoint returns transient
 * 5xx mid-run. Callers must treat transient failures as "keep polling", NOT as
 * a terminal failure - see `isTransientValyuError`.
 */

import { isSelfHostedMode } from "./local-db/local-auth";
import { parseActivityFromMessages, type ActivityItem } from "./reports";

const VALYU_API_BASE = process.env.VALYU_API_URL || "https://api.valyu.ai";
const VALYU_OAUTH_PROXY_URL =
  process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.VALYU_APP_URL || process.env.NEXT_PUBLIC_VALYU_APP_URL || "https://platform.valyu.ai"}/api/oauth/proxy`;

/** Default API descriptions per deliverable type (description is required). */
const DEFAULT_DELIVERABLE_DESC: Record<string, string> = {
  csv: "Underlying data as a CSV table",
  xlsx: "Key figures and supporting data as a spreadsheet",
  pptx: "Summary presentation of the findings",
  docx: "Full written report as a Word document",
  pdf: "Full report as a PDF document",
};

export type ResearchMode = "fast" | "standard" | "heavy";
export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

const TERMINAL_STATUSES: TaskStatus[] = ["completed", "failed", "cancelled"];
export function isTerminalStatus(status: string | undefined): boolean {
  return !!status && TERMINAL_STATUSES.includes(status as TaskStatus);
}

export class ValyuError extends Error {
  status?: number;
  bodyText?: string;
  constructor(message: string, status?: number, bodyText?: string) {
    super(message);
    this.name = "ValyuError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

/** Map an upstream ValyuError to the HTTP status an API route should return.
 *  Preserves the statuses the client distinguishes (auth, payment, rate-limit
 *  and other 4xx); collapses genuine upstream faults (5xx / unknown) to 502 so
 *  a rate-limit never masquerades as a gateway crash. */
export function valyuErrorStatus(e: ValyuError): number {
  const s = e.status;
  if (s === 402) return 402;
  if (s === 401 || s === 403) return 401;
  if (s && s >= 400 && s < 500) return s; // 429, 400, 404, ...
  return 502;
}

/** Transient = worth retrying (network blip, 5xx, rate limit). The status
 *  endpoint throws intermittent 502s, so this gate keeps a run alive. */
export function isTransientValyuError(e: unknown): boolean {
  if (!(e instanceof ValyuError)) return true; // network/parse errors → transient
  if (e.status === undefined) return true;
  return e.status >= 500 || e.status === 429;
}

interface CallOpts {
  valyuAccessToken?: string;
}

/** Low-level call. Direct REST (api key) in self-hosted mode, OAuth proxy
 *  envelope in valyu mode. Returns parsed JSON, throws ValyuError on failure. */
async function valyuCall(
  path: string,
  method: "GET" | "POST" | "DELETE",
  body: unknown,
  { valyuAccessToken }: CallOpts,
): Promise<any> {
  let res: Response;

  if (isSelfHostedMode()) {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) throw new ValyuError("VALYU_API_KEY required in self-hosted mode", 500);
    res = await fetch(`${VALYU_API_BASE}${path}`, {
      method,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } else {
    if (!valyuAccessToken) throw new ValyuError("Valyu access token required", 401);
    res = await fetch(VALYU_OAUTH_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${valyuAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, method, body }),
    });
  }

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error body (e.g. an HTML 502 page) */
  }

  if (!res.ok) {
    if (res.status === 402) {
      throw new ValyuError("Insufficient Valyu credits. Top up your account to continue.", 402, text);
    }
    if (res.status === 401) {
      throw new ValyuError("Valyu session expired. Please sign in again.", 401, text);
    }
    if (res.status === 403) {
      throw new ValyuError("This Valyu feature is not available for your account.", 403, text);
    }
    const msg = json?.error?.message || json?.message || json?.error || `Valyu request failed (${res.status})`;
    throw new ValyuError(typeof msg === "string" ? msg : `Valyu request failed (${res.status})`, res.status, text);
  }

  return json;
}

// ---------------------------------------------------------------------------
// Workflows catalog (used by Phase 2 lens UI; available now)
// ---------------------------------------------------------------------------

export async function listWorkflows(
  opts: CallOpts & { vertical?: string } = {},
): Promise<any[]> {
  const qs = new URLSearchParams({ scope: "valyu" });
  if (opts.vertical) qs.set("vertical", opts.vertical);
  const resp = await valyuCall(`/v1/workflows?${qs.toString()}`, "GET", undefined, opts);
  if (Array.isArray(resp)) return resp;
  return resp?.workflows ?? resp?.data ?? resp?.results ?? [];
}

export async function getWorkflow(slug: string, opts: CallOpts = {}): Promise<any> {
  return valyuCall(`/v1/workflows/${slug}`, "GET", undefined, opts);
}


// ---------------------------------------------------------------------------
// DeepResearch tasks
// ---------------------------------------------------------------------------

export interface CreateTaskInput {
  // Either a workflow run (slug + params) OR a freeform chat-launched research
  // (query). When `query` is set it takes precedence and no workflow is used.
  workflowSlug?: string;
  workflowParams?: Record<string, unknown>;
  query?: string;
  mode: ResearchMode;
  // Optional per-run enhancements. Charts default on; document deliverables
  // (xlsx/pptx/docx) are produced via code execution, so requesting them
  // implies code_execution.
  tools?: {
    charts?: boolean;
    codeExecution?: boolean;
    deliverables?: { type: string; description?: string }[];
  };
}

export interface CreateTaskResult {
  deepresearchId: string;
  status: TaskStatus;
  workflowVersion?: number;
  raw: any;
}

export async function createDeepResearchTask(
  input: CreateTaskInput,
  opts: CallOpts = {},
): Promise<CreateTaskResult> {
  // Always request a PDF alongside markdown so each report has a public,
  // openable pdf_url (storage.valyu.ai) in addition to the in-app render.
  const body: Record<string, unknown> = {
    mode: input.mode,
    output_formats: ["markdown", "pdf"],
  };
  if (input.query) {
    body.query = input.query;
  } else {
    body.workflow_id = input.workflowSlug;
    body.workflow_params = input.workflowParams ?? {};
  }
  // Map optional per-run enhancements onto the task body.
  //  - charts default on (improves every report) unless explicitly off.
  //  - code execution is enabled by an explicit toggle OR by any document
  //    deliverable (xlsx/pptx/docx), which are produced via code execution.
  //  - deliverables go in a top-level array, not under `tools`. Each entry is
  //    a { type, description }; description is required by the API.
  const deliverables = input.tools?.deliverables ?? [];
  const needsCodeForDeliverables = deliverables.some((d) =>
    ["xlsx", "pptx", "docx"].includes(d.type),
  );
  const wantsCharts = input.tools?.charts ?? true;
  const wantsCode = !!(input.tools?.codeExecution || needsCodeForDeliverables);
  const taskTools: Record<string, unknown> = {};
  if (wantsCharts) taskTools.charts = true;
  if (wantsCode) taskTools.code_execution = { enabled: true };
  if (Object.keys(taskTools).length > 0) body.tools = taskTools;
  if (deliverables.length > 0) {
    // Use the caller's description; fall back to a sensible default per type.
    body.deliverables = deliverables.map((d) => ({
      type: d.type,
      description:
        d.description?.trim() ||
        DEFAULT_DELIVERABLE_DESC[d.type] ||
        "Supporting deliverable",
    }));
  }
  const resp = await valyuCall("/v1/deepresearch/tasks", "POST", body, opts);
  const deepresearchId = resp?.deepresearch_id ?? resp?.id ?? resp?.task_id;
  if (!deepresearchId) {
    throw new ValyuError("Valyu did not return a task id", 502, JSON.stringify(resp));
  }
  return {
    deepresearchId,
    status: (resp?.status as TaskStatus) ?? "queued",
    workflowVersion: resp?.workflow?.version,
    raw: resp,
  };
}

/** A chart generated during research (bar/line/etc). `imageUrl` is a public,
 *  token-bearing PNG served by the Valyu API. */
export interface ResearchImage {
  imageUrl: string;
  title?: string | null;
  chartType?: string | null;
  imageType?: string | null;
  imageId?: string | null;
}

/** A generated downloadable artifact (spreadsheet / doc / deck / pdf). `url` is
 *  a public, token-bearing download URL served by the Valyu API. */
export interface ResearchDeliverable {
  id?: string | null;
  type: string;
  title?: string | null;
  url: string;
  description?: string | null;
  request?: string | null;
  status?: string | null;
  rowCount?: number | null;
  columnCount?: number | null;
}

export interface TaskStatusResult {
  status: TaskStatus;
  title?: string | null;
  output?: string | null;
  sources?: unknown[] | null;
  activity?: ActivityItem[];
  images?: ResearchImage[] | null;
  deliverables?: ResearchDeliverable[] | null;
  pdfUrl?: string | null;
  isPublic?: boolean;
  progress?: { current_step?: number; total_steps?: number } | null;
  usage?: unknown;
  mode?: string | null;
  errorMessage?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  raw: any;
}

/** Normalize the API's image/deliverable arrays (snake_case, string counts)
 *  into typed shapes the UI consumes. */
function mapImages(raw: unknown): ResearchImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => ({
      imageUrl: r?.image_url ?? r?.url ?? "",
      title: r?.title ?? null,
      chartType: r?.chart_type ?? null,
      imageType: r?.image_type ?? null,
      imageId: r?.image_id ?? null,
    }))
    .filter((i) => !!i.imageUrl);
}

function mapDeliverables(raw: unknown): ResearchDeliverable[] {
  if (!Array.isArray(raw)) return [];
  const num = (v: unknown) => {
    const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : null;
  };
  return raw
    .map((r: any) => ({
      id: r?.id ?? null,
      type: String(r?.type ?? "").toLowerCase(),
      title: r?.title ?? null,
      url: r?.url ?? "",
      description: r?.description ?? null,
      request: r?.request ?? null,
      status: r?.status ?? null,
      rowCount: num(r?.row_count),
      columnCount: num(r?.column_count),
    }))
    .filter((d) => !!d.url && !!d.type);
}

export async function getDeepResearchStatus(
  taskId: string,
  opts: CallOpts = {},
): Promise<TaskStatusResult> {
  const resp = await valyuCall(`/v1/deepresearch/tasks/${taskId}/status`, "GET", undefined, opts);
  return {
    status: resp?.status as TaskStatus,
    title: resp?.title ?? null,
    output: resp?.output ?? null,
    sources: resp?.sources ?? null,
    // Parsed live activity feed (reasoning / research steps / sources found).
    activity: parseActivityFromMessages(resp?.messages),
    images: mapImages(resp?.images),
    deliverables: mapDeliverables(resp?.deliverables),
    pdfUrl: resp?.pdf_url ?? null,
    isPublic: resp?.public ?? false,
    progress: resp?.progress ?? null,
    usage: resp?.usage ?? null,
    mode: resp?.mode ?? null,
    errorMessage: resp?.error_message ?? resp?.error ?? null,
    createdAt: resp?.created_at ?? null,
    completedAt: resp?.completed_at ?? null,
    raw: resp,
  };
}

/** Cancel a running DeepResearch task. */
export async function cancelDeepResearchTask(
  taskId: string,
  opts: CallOpts = {},
): Promise<void> {
  await valyuCall(`/v1/deepresearch/tasks/${taskId}/cancel`, "POST", {}, opts);
}

/** Delete a DeepResearch task from the caller's index. */
export async function deleteDeepResearchTask(
  taskId: string,
  opts: CallOpts = {},
): Promise<void> {
  await valyuCall(`/v1/deepresearch/tasks/${taskId}/delete`, "DELETE", undefined, opts);
}

/** One entry from the DeepResearch task index (`GET /v1/deepresearch/list`). */
export interface DeepResearchListItem {
  taskId: string;
  query: string;
  status: TaskStatus;
  createdAt: string | null;
}

/**
 * List the caller's DeepResearch tasks. The index is intentionally thin
 * (id + query + status + created_at); per-task title/output/pdf come from
 * `getDeepResearchStatus`. Scoped to the authenticated key server-side.
 */
export async function listDeepResearchTasks(
  opts: CallOpts = {},
  limit = 100,
): Promise<DeepResearchListItem[]> {
  const resp = await valyuCall(`/v1/deepresearch/list?limit=${limit}`, "GET", undefined, opts);
  const arr = Array.isArray(resp)
    ? resp
    : resp?.tasks ?? resp?.data ?? resp?.results ?? [];
  return (arr as any[])
    .map((t) => ({
      taskId: t?.deepresearch_id ?? t?.id ?? t?.task_id,
      query: t?.query ?? "",
      status: (t?.status ?? "queued") as TaskStatus,
      createdAt: t?.created_at ?? null,
    }))
    .filter((t) => !!t.taskId);
}
