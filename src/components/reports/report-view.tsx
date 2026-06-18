"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, Clock, Download, ExternalLink } from "lucide-react";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { apiSyncReport, apiDownloadReportPdf } from "@/lib/report-client";
import { isTerminal } from "@/lib/reports";

/**
 * Renders a single report's content (header, live status, body). Layout-
 * agnostic — used by both the full-page route and the slide-in drawer. Owns
 * the resumable poll (sync on mount, refetch while running, stop on terminal).
 */
export function ReportView({ reportId }: { reportId: string }) {
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => apiSyncReport(reportId),
    refetchInterval: (query) => {
      const status = query.state.data?.report?.status;
      return status && isTerminal(status) ? false : 4000;
    },
    refetchOnWindowFocus: true,
  });

  const report = data?.report;
  const progress = data?.progress;

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
        <div>
          <h1 className="text-2xl font-light text-foreground">
            {report.title}
          </h1>
          <div className="mt-1 text-xs text-muted-foreground">
            {report.workflow_slug} · {report.mode} mode
          </div>
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

      {/* Running / queued */}
      {!isTerminal(report.status) && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground capitalize">
                {report.status}
                {progress?.total_steps
                  ? ` · step ${progress.current_step ?? 0}/${progress.total_steps}`
                  : ""}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {report.estimated_time ? `Estimated ${report.estimated_time}` : "Deep research in progress"}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            This runs in the background — it&apos;s safe to close this and come back. The
            report keeps generating and will be here when it&apos;s done.
          </p>
        </div>
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

      {/* Completed */}
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
    </>
  );
}
