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
 * a terminal failure — see `isTransientValyuError`.
 */

import { isSelfHostedMode } from "./local-db/local-auth";

const VALYU_API_BASE = process.env.VALYU_API_URL || "https://api.valyu.ai";
const VALYU_OAUTH_PROXY_URL =
  process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.VALYU_APP_URL || process.env.NEXT_PUBLIC_VALYU_APP_URL || "https://platform.valyu.ai"}/api/oauth/proxy`;

export type ResearchMode = "fast" | "standard" | "heavy" | "max";
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
  method: "GET" | "POST",
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
    if (res.status === 401 || res.status === 403) {
      throw new ValyuError("Valyu session expired. Please sign in again.", res.status, text);
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
  workflowSlug: string;
  workflowParams: Record<string, unknown>;
  mode: ResearchMode;
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
  const resp = await valyuCall(
    "/v1/deepresearch/tasks",
    "POST",
    {
      workflow_id: input.workflowSlug,
      workflow_params: input.workflowParams,
      mode: input.mode,
      // Always request a PDF alongside markdown so each report has a public,
      // openable pdf_url (storage.valyu.ai) in addition to the in-app render.
      output_formats: ["markdown", "pdf"],
    },
    opts,
  );
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

export interface TaskStatusResult {
  status: TaskStatus;
  output?: string | null;
  sources?: unknown[] | null;
  pdfUrl?: string | null;
  isPublic?: boolean;
  progress?: { current_step?: number; total_steps?: number } | null;
  usage?: unknown;
  raw: any;
}

export async function getDeepResearchStatus(
  taskId: string,
  opts: CallOpts = {},
): Promise<TaskStatusResult> {
  const resp = await valyuCall(`/v1/deepresearch/tasks/${taskId}/status`, "GET", undefined, opts);
  return {
    status: resp?.status as TaskStatus,
    output: resp?.output ?? null,
    sources: resp?.sources ?? null,
    pdfUrl: resp?.pdf_url ?? null,
    isPublic: resp?.public ?? false,
    progress: resp?.progress ?? null,
    usage: resp?.usage ?? null,
    raw: resp,
  };
}
