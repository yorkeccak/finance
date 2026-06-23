"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, Clock, Download, ExternalLink } from "lucide-react";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { ActivityFeed } from "@/components/reports/activity-feed";
import { ErrorNote } from "@/components/reports/error-note";
import { AuthModal } from "@/components/auth/auth-modal";
import { apiSyncReport, apiDownloadReportPdf } from "@/lib/report-client";
import { isTerminal } from "@/lib/reports";
import { markSeen } from "@/lib/report-notify";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Live mm:ss elapsed since `startIso`, ticking while `active`. */
function useElapsed(startIso: string | null | undefined, active: boolean): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  if (!startIso) return null;
  const start = new Date(startIso).getTime();
  return Number.isNaN(start) ? null : fmtElapsed(now - start);
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Renders a single report's content (header, live status, body). Layout-
 * agnostic — used by both the full-page route and the slide-in drawer. Owns
 * the resumable poll (sync on mount, refetch while running, stop on terminal).
 */
export function ReportView({ reportId }: { reportId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => apiSyncReport(reportId),
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling once we need re-auth — the token is dead, retrying is
      // pointless until the user signs in again.
      if (data?.authExpired) return false;
      const status = data?.report?.status;
      return status && isTerminal(status) ? false : 4000;
    },
    refetchOnWindowFocus: true,
  });

  const report = data?.report;
  const progress = data?.progress;
  // Hook must run unconditionally (before the early returns below).
  const elapsed = useElapsed(
    report?.created_at,
    !!report && !isTerminal(report.status),
  );

  // Viewing a finished run acknowledges it (clears the sidebar badge).
  useEffect(() => {
    if (report && isTerminal(report.status)) markSeen([report.id]);
  }, [report?.id, report?.status]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 py-12">
        <AlertCircle className="h-4 w-4" /> {(error as Error).message}
      </div>
    );
  }
  if (!report) return null;

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80 mb-2">
            {report.workflow_slug === "freeform" ? "Deep Research" : report.workflow_slug} · {cap(report.mode)}
          </div>
          <h1 className="text-2xl sm:text-[27px] font-light text-foreground leading-tight tracking-tight">
            {report.title}
          </h1>
        </div>
        {report.status === "completed" && report.pdf_url ? (
          <a
            href={report.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm text-foreground hover:border-foreground/20 flex-shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
            Open PDF
          </a>
        ) : report.status === "completed" && report.output ? (
          <button
            onClick={async () => {
              setDownloading(true);
              try {
                await apiDownloadReportPdf(report.id, report.title || "report");
              } catch (e) {
                alert((e as Error).message);
              } finally {
                setDownloading(false);
              }
            }}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm text-foreground hover:border-foreground/20 disabled:opacity-50 flex-shrink-0"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </button>
        ) : null}
      </div>

      {/* Re-auth needed — the session lapsed while the run continues server-side.
          Offer sign-in; the run itself is unaffected. */}
      {!isTerminal(report.status) && data?.authExpired && (
        <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground">Sign in to keep tracking progress</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your session expired. The report keeps running; sign back in to see live updates.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="mt-2 inline-flex items-center rounded-lg bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Sign in with Valyu to continue
            </button>
          </div>
        </div>
      )}

      {/* Running / queued */}
      {!isTerminal(report.status) && (
        <>
          {/* A non-transient status-poll error (e.g. credits) — the run may
              still be alive. Surface it as a non-fatal notice instead of
              leaving the card spinning silently or rendering terminal failure. */}
          {data?.syncError && !data?.authExpired && (
            <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground">Couldn&apos;t refresh status</div>
                <ErrorNote message={data.syncError} className="mt-0.5" />
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-5 mb-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 items-center justify-center flex-shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/15 animate-ping" />
                <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </span>
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {progress?.total_steps
                    ? `Researching · step ${progress.current_step ?? 0} of ${progress.total_steps}`
                    : "Researching your query…"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {elapsed ?? "0:00"} elapsed
                  </span>
                  {report.estimated_time && <span>· est. {report.estimated_time}</span>}
                </div>
              </div>
            </div>

            <div className="mt-4">
              {progress?.total_steps ? (
                <ProgressBar value={progress.current_step ?? 0} max={progress.total_steps} />
              ) : (
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-primary/40 animate-pulse" />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-3.5 leading-relaxed">
              Runs in the background — safe to close this and come back. It&apos;s saved in
              <span className="text-foreground"> Reports</span> and keeps generating until it&apos;s done.
            </p>
          </div>

          {/* Live activity feed */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Activity feed
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <ActivityFeed activity={report.activity} running />
        </>
      )}

      {/* Failed / cancelled */}
      {(report.status === "failed" || report.status === "cancelled") && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-red-700 dark:text-red-300 capitalize">
              {report.status}
            </div>
            <div className="text-xs text-red-500 mt-1">
              {report.error_message || "The research task did not complete."}
            </div>
          </div>
        </div>
      )}

      {/* Completed — research activity (collapsed) then the report */}
      {report.status === "completed" && report.activity && report.activity.length > 0 && (
        <details className="mb-4 rounded-2xl border border-border bg-card overflow-hidden group">
          <summary className="cursor-pointer list-none px-5 py-3 text-sm font-medium text-foreground flex items-center justify-between hover:bg-muted/30">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Research activity
            </span>
            <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
            <span className="text-xs text-muted-foreground hidden group-open:inline">Hide</span>
          </summary>
          <div className="px-5 pb-5 pt-1 border-t border-border">
            <ActivityFeed activity={report.activity} />
          </div>
        </details>
      )}

      {report.status === "completed" && report.output && (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <CitationTextRenderer
            text={report.output}
            citations={{}}
            className="prose prose-sm dark:prose-invert max-w-none [--tw-prose-headings:var(--foreground)] [--tw-prose-bold:var(--foreground)]"
          />
          {report.sources && report.sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
              {report.sources.length} sources
            </div>
          )}
        </div>
      )}

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
