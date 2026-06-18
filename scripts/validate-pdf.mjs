#!/usr/bin/env node
/** Validate: a deepresearch task with output_formats:["markdown","pdf"] returns
 *  a pdf_url, and that URL is publicly openable WITHOUT our API key (so it can
 *  open in a new tab / be shared). Cheap fast-mode run. */
const API_KEY = process.env.VALYU_API_KEY;
const BASE = "https://api.valyu.ai";

const create = await (await fetch(`${BASE}/v1/deepresearch/tasks`, {
  method: "POST",
  headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    workflow_id: "con-market-sizing",
    workflow_params: { market: "AI meeting-notetaker software for US SMBs" },
    mode: "fast",
    output_formats: ["markdown", "pdf"],
  }),
})).json();
const id = create.deepresearch_id ?? create.id;
console.log("created:", id, "| public:", create.public);

const start = Date.now();
while (Date.now() - start < 30 * 60 * 1000) {
  await new Promise((r) => setTimeout(r, 12000));
  let st;
  try { st = await (await fetch(`${BASE}/v1/deepresearch/tasks/${id}/status`, { headers: { "x-api-key": API_KEY } })).json(); }
  catch { continue; }
  const el = Math.round((Date.now() - start) / 1000);
  console.log(`[${el}s] ${st.status} ${st.progress ? `${st.progress.current_step}/${st.progress.total_steps}`:""} | public:${st.public} | pdf_url:${st.pdf_url ? "present" : "none"}`);
  if (st.status === "completed") {
    console.log("\npdf_url:", st.pdf_url);
    console.log("public flag:", st.public);
    if (st.pdf_url) {
      // Fetch WITHOUT api key to test public access.
      const r = await fetch(st.pdf_url);
      console.log(`\nPDF fetch (no auth): http=${r.status} type=${r.headers.get("content-type")} len=${r.headers.get("content-length")}`);
    }
    process.exit(0);
  }
  if (["failed","cancelled"].includes(st.status)) { console.error("task", st.status); process.exit(1); }
}
console.error("timed out");
