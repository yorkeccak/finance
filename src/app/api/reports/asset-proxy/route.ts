/**
 * Same-origin streaming proxy for DeepResearch assets (deliverable files and
 * report PDFs). The Valyu API serves these as token-bearing URLs that send
 * `X-Frame-Options: DENY` and lack CORS headers, so they can't be iframed or
 * fetched cross-origin directly. This route streams the bytes same-origin so
 * the browser can render a PDF in an <iframe> and the CSV viewer can fetch it.
 *
 * SSRF-guarded: only proxies hosts under valyu.ai (and their S3 redirects).
 */

const INITIAL_ALLOWED_SUFFIXES = [".valyu.ai"];
// api.valyu.ai redirects asset downloads to presigned S3 URLs.
const REDIRECT_ALLOWED_SUFFIXES = [".valyu.ai", ".amazonaws.com"];
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 55_000;

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function parseAllowed(raw: string, suffixes: string[]): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  const ok = suffixes.some((s) => host === s.replace(/^\./, "") || host.endsWith(s));
  return ok ? parsed : null;
}

async function followWithAllowlist(initial: URL, signal: AbortSignal): Promise<Response> {
  let current = initial;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current.toString(), { redirect: "manual", signal, headers: { Accept: "*/*" } });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location) return res;
    const next = parseAllowed(new URL(location, current).toString(), REDIRECT_ALLOWED_SUFFIXES);
    if (!next) throw new Error("redirect-disallowed");
    current = next;
  }
  throw new Error("too-many-redirects");
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) return new Response(JSON.stringify({ error: "Missing url" }), { status: 400 });

  const target = parseAllowed(url, INITIAL_ALLOWED_SUFFIXES);
  if (!target) return new Response(JSON.stringify({ error: "Disallowed url" }), { status: 400 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const upstream = await followWithAllowlist(target, controller.signal);
    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}` }), {
        status: upstream.status === 404 ? 404 : 502,
      });
    }
    const ext = target.pathname.toLowerCase().split(".").pop() ?? "";
    const contentType =
      upstream.headers.get("content-type")?.split(";")[0].trim() ||
      CONTENT_TYPE_BY_EXT[ext] ||
      "application/octet-stream";

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
    });
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len);
    return new Response(upstream.body, { status: 200, headers });
  } catch (e) {
    let msg = "unknown";
    if (e instanceof Error) msg = e.name === "AbortError" ? "timeout" : e.message;
    return new Response(JSON.stringify({ error: msg }), { status: msg === "timeout" ? 504 : 502 });
  } finally {
    clearTimeout(timeout);
  }
}
