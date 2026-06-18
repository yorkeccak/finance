"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { WorkflowBrowser } from "@/components/reports/workflow-browser";
import { ReportDrawer } from "@/components/reports/report-drawer";
import { apiListReports, apiDeleteReport } from "@/lib/report-client";
import { isTerminal } from "@/lib/reports";
import { markSeen } from "@/lib/report-notify";
import { iconForSlug, verticalForSlug } from "@/lib/domain-icons";
import { DOMAINS } from "@/lib/domains";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground",
  running: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  queued: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const domainLabel = (slug: string): string | null => {
  if (slug === "freeform") return "Deep Research";
  const v = verticalForSlug(slug);
  return DOMAINS.find((d) => d.id === v)?.label ?? null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const s = ms / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const running = !isTerminal(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg flex-shrink-0 ${
        STATUS_STYLES[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {running ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      )}
      {cap(status)}
    </span>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: apiListReports,
    refetchInterval: 8000,
  });

  // Visiting the reports list acknowledges all finished runs → clears the badge.
  useEffect(() => {
    const done = reports.filter((r) => isTerminal(r.status)).map((r) => r.id);
    if (done.length) markSeen(done);
  }, [reports]);

  const handleDelete = async (id: string) => {
    await apiDeleteReport(id);
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-gray-950 flex overflow-x-hidden">
      <Sidebar
        currentSessionId={undefined}
        onSessionSelect={(id: string) => router.push(`/?chatId=${id}`)}
        onNewChat={() => router.push("/")}
        hasMessages={false}
      />

      <div className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
        <div className="max-w-4xl w-full mx-auto px-4 md:px-8 py-8">
          <h1 className="text-2xl font-light text-foreground mb-1">
            Financial Services Workflows
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Pick a domain, choose a workflow, and get a cited, banker-grade report.
          </p>

          <Suspense fallback={<div className="text-sm text-muted-foreground py-10">Loading…</div>}>
            <WorkflowBrowser onOpenReport={setOpenReportId} />
          </Suspense>

          {/* Reports list */}
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your reports
              </span>
              {reports.length > 0 && (
                <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-1.5 py-px">
                  {reports.length}
                </span>
              )}
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border text-sm text-muted-foreground py-8 text-center">
                No reports yet — run a workflow above and it&apos;ll show up here.
              </div>
            ) : (
              <div className="space-y-2.5">
                {reports.map((r) => {
                  const Icon = iconForSlug(r.workflow_slug);
                  const label = domainLabel(r.workflow_slug);
                  return (
                    <div
                      key={r.id}
                      onClick={() => setOpenReportId(r.id)}
                      className="group flex items-center gap-3.5 p-3.5 rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] cursor-pointer transition-all"
                    >
                      <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {r.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {label ? `${label} · ` : ""}
                          {timeAgo(r.created_at)}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                      {r.status === "completed" && r.pdf_url && (
                        <a
                          href={r.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0"
                          aria-label="Open PDF"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0"
                        aria-label="Delete report"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportDrawer reportId={openReportId} onClose={() => setOpenReportId(null)} />
    </div>
  );
}
