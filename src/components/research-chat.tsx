"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Plus, Ban, Zap } from "lucide-react";
import { MODES } from "@/lib/domains";
import { isTerminal } from "@/lib/reports";
import { apiCreateResearch, apiSyncReport, apiCancelReport } from "@/lib/report-client";
import { requestNotifyPermission } from "@/lib/report-notify";
import { ReportView } from "@/components/reports/report-view";
import { HomeWorkflows } from "@/components/home-workflows";
import DataSourceLogos from "@/components/data-source-logos";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Homepage research surface. A freeform query launches a Valyu DeepResearch
 * run (async, persisted as a Report) and renders the live activity feed. The
 * active run is tracked via `?research=<id>` so it survives navigation/reload
 * and is also resumable from /reports.
 */
export function ResearchChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const researchId = searchParams.get("research");

  if (researchId) {
    return <ResearchRun reportId={researchId} onNew={() => router.push("/")} />;
  }

  return (
    <ResearchInput
      onLaunched={(id) => {
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        router.push(`/?research=${id}`);
      }}
    />
  );
}

function ResearchInput({ onLaunched }: { onLaunched: (id: string) => void }) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("standard");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const q = input.trim();
    if (!q || launching) return;
    setLaunching(true);
    setError(null);
    // Ask for OS notification permission so we can ping when this finishes
    // (it's a long async run — the user will likely switch away).
    void requestNotifyPermission();
    try {
      const report = await apiCreateResearch(q, mode);
      onLaunched(report.id);
    } catch (e) {
      setError((e as Error).message);
      setLaunching(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="relative flex items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything — I'll run deep research and cite my sources…"
            disabled={launching}
            rows={1}
            className="w-full resize-none rounded-2xl px-4 py-3 pr-14 min-h-[52px] max-h-40 overflow-y-auto text-sm sm:text-base bg-card border border-border focus:border-muted-foreground/40 outline-none shadow-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            onClick={submit}
            disabled={launching || !input.trim()}
            className="absolute right-2 bottom-2 rounded-xl h-9 w-9 p-0 flex items-center justify-center bg-foreground hover:bg-foreground/80 text-background disabled:opacity-40 transition-opacity"
            aria-label="Start research"
          >
            {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Depth selector */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="text-[11px] font-medium text-muted-foreground mr-0.5">Depth</span>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.note}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                mode === m.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {m.id === "fast" && <Zap className="h-3 w-3 fill-current" strokeWidth={0} />}
              {m.label}
            </button>
          ))}
        </div>

        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      </motion.div>

      <div className="mt-8 opacity-80">
        <DataSourceLogos />
      </div>

      <HomeWorkflows />

      <motion.div
        className="flex items-center justify-center gap-1 mt-10 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
      >
        <span className="text-xs text-muted-foreground/60">Powered by Valyu DeepResearch</span>
      </motion.div>
    </div>
  );
}

function ResearchRun({ reportId, onNew }: { reportId: string; onNew: () => void }) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  // Shares the ["report", reportId] cache with <ReportView> — React Query
  // dedupes, so this is one poll, not two.
  const { data } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => apiSyncReport(reportId),
    refetchInterval: (query) => {
      const status = query.state.data?.report?.status;
      return status && isTerminal(status) ? false : 4000;
    },
    refetchOnWindowFocus: true,
  });

  const report = data?.report;
  const running = report ? !isTerminal(report.status) : true;
  const statusLabel = report ? cap(report.status) : "Running";

  const cancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await apiCancelReport(reportId);
      queryClient.invalidateQueries({ queryKey: ["report", reportId] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  const failed = report?.status === "failed" || report?.status === "cancelled";

  return (
    <motion.div
      className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-24"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Chrome: status pill + actions. Sits above the content, not boxed. */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card pl-2.5 pr-3 py-1.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
          {running ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary/50 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          ) : (
            <span className={`h-2 w-2 rounded-full ${failed ? "bg-destructive" : "bg-primary"}`} />
          )}
          <span className="text-xs font-medium text-foreground">{statusLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground/20 hover:bg-muted/40 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
          {running && (
            <button
              onClick={cancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Cancel
            </button>
          )}
        </div>
      </div>

      <ReportView reportId={reportId} />
    </motion.div>
  );
}
