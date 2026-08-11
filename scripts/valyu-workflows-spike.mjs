#!/usr/bin/env node
/**
 * Phase 0 integration spike — Valyu Workflows + DeepResearch.
 *
 * Throwaway diagnostic to de-risk the domain-workflows feature BEFORE any UI:
 *   R1 — does this account have a non-paywalled workflow catalog across the
 *        4 launch verticals (Investment Banking, Private Equity, Hedge Funds,
 *        Consulting)?
 *   R2 — does a DeepResearch task actually run end-to-end and return a
 *        renderable cited report under this account's entitlements?
 *
 * Calls the Valyu REST API directly with VALYU_API_KEY (same account
 * entitlements as the OAuth proxy, without the auth dance).
 *
 * Usage (Node 20+, loads .env automatically):
 *   node --env-file=.env scripts/valyu-workflows-spike.mjs catalog
 *   node --env-file=.env scripts/valyu-workflows-spike.mjs inspect ib-company-profile
 *   node --env-file=.env scripts/valyu-workflows-spike.mjs preview ib-company-profile '{"company":"NVIDIA (NVDA)"}'
 *   node --env-file=.env scripts/valyu-workflows-spike.mjs run ib-company-profile '{"company":"NVIDIA (NVDA)"}' fast
 *
 * `catalog`, `inspect`, and `preview` are FREE. `run` SPENDS CREDITS.
 */

const BASE_URL = process.env.VALYU_API_URL || "https://api.valyu.ai";
const API_KEY = process.env.VALYU_API_KEY;

const LAUNCH_VERTICALS = [
  "investment-banking",
  "private-equity",
  "hedge-funds",
  "consulting",
];

if (!API_KEY) {
  console.error("✗ VALYU_API_KEY not set. Run with: node --env-file=.env scripts/valyu-workflows-spike.mjs <cmd>");
  process.exit(1);
}

/** Thin REST helper. Surfaces status + body verbatim on failure — the whole
 *  point of the spike is to learn exactly what's gated. */
async function api(path, { method = "GET", body } = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${method} ${path}`);
    err.status = res.status;
    err.bodyText = text;
    err.bodyJson = json;
    throw err;
  }
  return json;
}

function printErr(label, e) {
  console.error(`✗ ${label}: ${e.message}`);
  if (e.status) console.error(`  status: ${e.status}`);
  if (e.bodyText) console.error(`  body:   ${e.bodyText.slice(0, 500)}`);
}

function asWorkflowList(resp) {
  // Be liberal about the envelope shape until we see the real one.
  if (Array.isArray(resp)) return resp;
  return resp?.workflows ?? resp?.data ?? resp?.results ?? [];
}

async function listVertical(vertical) {
  const qs = new URLSearchParams({ scope: "valyu" });
  if (vertical) qs.set("vertical", vertical);
  return asWorkflowList(await api(`/v1/workflows?${qs.toString()}`));
}

async function cmdCatalog() {
  console.log(`\n=== R1: Workflow catalog (scope=valyu) @ ${BASE_URL} ===\n`);

  // Full catalog first — tells us the real envelope + total count.
  let all = [];
  try {
    all = await listVertical(null);
    console.log(`All valyu workflows: ${all.length} found`);
  } catch (e) {
    printErr("list all workflows", e);
    console.error("\n⚠ Catalog endpoint unreachable/forbidden — feature may be gated for this account. Stop here.");
    process.exit(2);
  }

  // Per launch vertical.
  console.log(`\n--- Launch verticals ---`);
  const summary = {};
  for (const v of LAUNCH_VERTICALS) {
    try {
      const wfs = await listVertical(v);
      summary[v] = wfs.length;
      console.log(`\n● ${v}: ${wfs.length} workflow(s)`);
      for (const wf of wfs) {
        const slug = wf.slug ?? wf.id ?? "(no-slug)";
        const title = wf.title ?? wf.name ?? "";
        const vars = (wf.variables ?? []).map((x) => x.key ?? x.name).join(", ");
        console.log(`    - ${slug}  ${title ? `— ${title}` : ""}${vars ? `  [vars: ${vars}]` : ""}`);
      }
    } catch (e) {
      summary[v] = `ERROR ${e.status ?? ""}`.trim();
      printErr(`list ${v}`, e);
    }
  }

  console.log(`\n--- R1 verdict ---`);
  for (const v of LAUNCH_VERTICALS) {
    const n = summary[v];
    const ok = typeof n === "number" && n > 0;
    console.log(`  ${ok ? "✓" : "✗"} ${v}: ${n}`);
  }
  const launchable = LAUNCH_VERTICALS.every((v) => typeof summary[v] === "number" && summary[v] > 0);
  console.log(`\n${launchable ? "✓ All 4 launch verticals have workflows." : "✗ One or more verticals are empty/gated — revisit domain choice."}`);
}

async function cmdInspect(slug) {
  if (!slug) return console.error("usage: inspect <slug>");
  console.log(`\n=== Inspect ${slug} ===\n`);
  try {
    const wf = await api(`/v1/workflows/${slug}`);
    console.log(JSON.stringify(wf, null, 2));
  } catch (e) {
    printErr(`inspect ${slug}`, e);
  }
}

async function cmdPreview(slug, paramsJson) {
  if (!slug || !paramsJson) return console.error(`usage: preview <slug> '<json params>'`);
  console.log(`\n=== Preview ${slug} (free, no run) ===\n`);
  try {
    const workflow_params = JSON.parse(paramsJson);
    const resp = await api(`/v1/workflows/${slug}/preview`, {
      method: "POST",
      body: { workflow_params },
    });
    console.log(JSON.stringify(resp, null, 2));
  } catch (e) {
    printErr(`preview ${slug}`, e);
  }
}

async function cmdRun(slug, paramsJson, mode = "fast") {
  if (!slug || !paramsJson) return console.error(`usage: run <slug> '<json params>' [mode]`);
  console.log(`\n=== R2: Run ${slug} (mode=${mode}) — THIS SPENDS CREDITS ===\n`);
  let taskId;
  try {
    const workflow_params = JSON.parse(paramsJson);
    const created = await api(`/v1/deepresearch/tasks`, {
      method: "POST",
      body: { workflow_id: slug, workflow_params, mode },
    });
    console.log("create response:", JSON.stringify(created, null, 2));
    taskId = created?.deepresearch_id ?? created?.id ?? created?.task_id;
    if (!taskId) {
      console.error("✗ No task id in create response — cannot poll.");
      return;
    }
  } catch (e) {
    printErr(`create task ${slug}`, e);
    return;
  }

  await pollToCompletion(taskId);
}

/** Poll a task to a terminal status. Tolerates transient errors (5xx /
 *  network blips) — a hard requirement the spike surfaced: the status
 *  endpoint returns intermittent 502s, so the poller must retry, not bail. */
async function pollToCompletion(taskId) {
  console.log(`\nPolling /v1/deepresearch/tasks/${taskId}/status ...`);
  const start = Date.now();
  const maxWaitMs = 30 * 60 * 1000; // fast mode ~5min; generous ceiling
  const pollMs = 10000;
  let consecutiveErrors = 0;
  while (Date.now() - start < maxWaitMs) {
    let status;
    try {
      status = await api(`/v1/deepresearch/tasks/${taskId}/status`);
      consecutiveErrors = 0;
    } catch (e) {
      consecutiveErrors++;
      const transient = !e.status || e.status >= 500 || e.status === 429;
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`  [${elapsed}s] poll error ${e.status ?? "network"} (${consecutiveErrors} in a row)${transient ? " — retrying" : ""}`);
      if (!transient || consecutiveErrors >= 6) {
        printErr("poll status (gave up)", e);
        console.error(`  task ${taskId} is still alive server-side; re-check with: status ${taskId}`);
        return;
      }
      await new Promise((r) => setTimeout(r, pollMs));
      continue;
    }
    const s = status?.status;
    const step = status?.progress ? ` step ${status.progress.current_step}/${status.progress.total_steps}` : "";
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`  [${elapsed}s] status=${s}${step}`);
    if (s === "completed" || s === "failed" || s === "cancelled") {
      console.log(`\n--- Final status: ${s} ---`);
      if (status.usage) console.log("cost:", JSON.stringify(status.usage));
      if (status.sources) console.log(`sources: ${status.sources.length}`);
      console.log("\n--- Report output (first 4000 chars) ---\n");
      console.log((status.output ?? "(no output)").slice(0, 4000));
      console.log(`\n(R3 check: does the above render through existing markdown/chart renderers?)`);
      return;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  console.error("✗ Timed out waiting for task to complete.");
}

async function cmdStatus(taskId) {
  if (!taskId) return console.error("usage: status <taskId>");
  await pollToCompletion(taskId);
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case "catalog":
    await cmdCatalog();
    break;
  case "status":
    await cmdStatus(rest[0]);
    break;
  case "inspect":
    await cmdInspect(rest[0]);
    break;
  case "preview":
    await cmdPreview(rest[0], rest[1]);
    break;
  case "run":
    await cmdRun(rest[0], rest[1], rest[2]);
    break;
  default:
    console.log("commands: catalog | inspect <slug> | preview <slug> '<json>' | run <slug> '<json>' [mode]");
}
