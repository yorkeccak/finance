#!/usr/bin/env node
/**
 * Generate the 4 seeded example reports (one flagship per domain) as static
 * JSON under src/lib/example-reports/. Requests markdown + PDF so each seed
 * gets a public, openable pdf_url. Run once; the JSON files are committed.
 *
 *   node --env-file=.env scripts/gen-seeds.mjs
 */
import fs from "fs";
import path from "path";

const BASE = "https://api.valyu.ai";
const API_KEY = process.env.VALYU_API_KEY;
const OUT_DIR = path.join(process.cwd(), "src", "lib", "example-reports");

const SEEDS = [
  {
    domainId: "investment-banking",
    slug: "ib-company-profile",
    title: "NVIDIA — Company Profile",
    subject: "NVIDIA (NVDA)",
    mode: "fast",
    estimated_time: "7-12 min",
    params: { company: "NVIDIA (NVDA)" },
  },
  {
    domainId: "private-equity",
    slug: "pe-investment-memo",
    title: "Stripe — Investment Committee Memo",
    subject: "Stripe",
    mode: "heavy",
    estimated_time: "10-25 min",
    params: {
      company: "Stripe",
      thesis:
        "Best independent payments and financial-infrastructure platform with durable developer lock-in and expanding services attach.",
    },
  },
  {
    domainId: "hedge-funds",
    slug: "hf-long-thesis",
    title: "Costco — Long Thesis",
    subject: "Costco (COST)",
    mode: "heavy",
    estimated_time: "10-25 min",
    params: {
      ticker: "COST",
      variant:
        "Membership-fee compounding and international expansion runway are structurally underappreciated.",
    },
  },
  {
    domainId: "sales-intelligence",
    slug: "sales-account-briefing",
    title: "JPMorgan Chase — Account Briefing",
    subject: "JPMorgan Chase",
    mode: "fast",
    estimated_time: "4-8 min",
    params: {
      account: "JPMorgan Chase",
      our_product: "AI deep-research platform for financial data, SEC filings and market intelligence",
    },
  },
];

async function api(p, method = "GET", body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) { const e = new Error(`HTTP ${res.status} ${p}`); e.status = res.status; throw e; }
  return json;
}

function write(seed, status) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${seed.domainId}.json`);
  fs.writeFileSync(file, JSON.stringify({
    domainId: seed.domainId,
    workflow_slug: seed.slug,
    title: seed.title,
    subject: seed.subject,
    mode: seed.mode,
    estimated_time: seed.estimated_time ?? null,
    output: status.output ?? "",
    sources_count: Array.isArray(status.sources) ? status.sources.length : 0,
    pdf_url: status.pdf_url ?? null,
    task_id: seed.taskId,
  }, null, 2));
  console.log(`  ✓ wrote ${seed.domainId}.json (${(status.output||'').length} chars, ${Array.isArray(status.sources)?status.sources.length:0} sources, pdf:${status.pdf_url?'yes':'no'})`);
}

// 1. Create all tasks (markdown + pdf).
for (const s of SEEDS) {
  try {
    const r = await api("/v1/deepresearch/tasks", "POST", {
      workflow_id: s.slug,
      workflow_params: s.params,
      mode: s.mode,
      output_formats: ["markdown", "pdf"],
    });
    s.taskId = r?.deepresearch_id ?? r?.id;
    console.log(`created ${s.domainId} (${s.slug}) → ${s.taskId}`);
  } catch (e) { console.error(`✗ create ${s.domainId}: ${e.message}`); s.failed = true; }
}

// 2. Poll all to completion, writing each as it finishes. Transient-tolerant.
const start = Date.now();
const MAX = 75 * 60 * 1000;
while (SEEDS.some((s) => s.taskId && !s.done && !s.failed) && Date.now() - start < MAX) {
  for (const s of SEEDS) {
    if (!s.taskId || s.done || s.failed) continue;
    let st;
    try { st = await api(`/v1/deepresearch/tasks/${s.taskId}/status`); }
    catch (e) { if (!(e.status >= 500 || e.status === 429 || !e.status)) { console.error(`✗ ${s.domainId} status: ${e.message}`); } continue; }
    const elapsed = Math.round((Date.now() - start) / 1000);
    const step = st.progress ? ` ${st.progress.current_step}/${st.progress.total_steps}` : "";
    console.log(`  [${elapsed}s] ${s.domainId}: ${st.status}${step}${st.pdf_url ? " pdf✓" : ""}`);
    if (st.status === "completed") { write(s, st); s.done = true; }
    else if (st.status === "failed" || st.status === "cancelled") { console.error(`✗ ${s.domainId} ${st.status}`); s.failed = true; }
  }
  if (SEEDS.some((s) => s.taskId && !s.done && !s.failed)) await new Promise((r) => setTimeout(r, 12000));
}

const done = SEEDS.filter((s) => s.done).length;
console.log(`\nDONE: ${done}/${SEEDS.length} seeds written. Failed: ${SEEDS.filter(s=>s.failed).map(s=>s.domainId).join(", ") || "none"}`);
