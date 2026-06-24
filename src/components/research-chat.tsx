"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Plus, Ban, Zap, BarChart3, Terminal, FileSpreadsheet, AlertCircle, X, ChevronDown } from "lucide-react";
import { MODES } from "@/lib/domains";
import { isTerminal } from "@/lib/reports";
import { apiCreateResearch, apiSyncReport, apiCancelReport } from "@/lib/report-client";
import type { DeliverableType, DeliverableItem } from "@/lib/report-client";
import { requestNotifyPermission } from "@/lib/report-notify";
import { ReportView } from "@/components/reports/report-view";
import { ErrorNote } from "@/components/reports/error-note";
import { HomeWorkflows } from "@/components/home-workflows";
import { AuthModal } from "@/components/auth/auth-modal";
import DataSourceLogos from "@/components/data-source-logos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

type ToolKey = "charts" | "codeExecution" | "deliverables";

const RESEARCH_TOOLS: {
  key: ToolKey;
  label: string;
  icon: typeof BarChart3;
  title: string;
}[] = [
  {
    key: "charts",
    label: "Chart Generation",
    icon: BarChart3,
    title: "Generate charts in the report",
  },
  {
    key: "codeExecution",
    label: "Code Execution",
    icon: Terminal,
    title: "Run Python for calculations and analysis",
  },
  {
    key: "deliverables",
    label: "Deliverables",
    icon: FileSpreadsheet,
    title: "Export Excel/PowerPoint/Word files",
  },
];

// Deliverable formats offered in the picker, with a sample description to
// guide the user on what to ask for. Office formats (xlsx/pptx/docx) are
// produced via code execution, so requesting any of them forces it on.
const DELIVERABLE_FORMATS: {
  type: DeliverableType;
  label: string;
  icon: string;
  sample: string;
}[] = [
  { type: "xlsx", label: "Excel (.xlsx)", icon: "/assets/filetypes/excel.svg", sample: "e.g. 3-statement model with quarterly revenue, margins and free cash flow" },
  { type: "pptx", label: "PowerPoint (.pptx)", icon: "/assets/filetypes/powerpoint.svg", sample: "e.g. 10-slide IC deck: thesis, comps, risks, recommendation" },
  { type: "docx", label: "Word (.docx)", icon: "/assets/filetypes/word.svg", sample: "e.g. Full memo with exec summary, analysis and appendix" },
  { type: "csv", label: "CSV (.csv)", icon: "/assets/filetypes/csv.svg", sample: "e.g. Peer comps table: ticker, EV/EBITDA, P/E, revenue growth" },
  { type: "pdf", label: "PDF (.pdf)", icon: "/assets/filetypes/pdf.svg", sample: "e.g. One-page summary of key findings and the verdict" },
];

const SAMPLE_DESC: Record<DeliverableType, string> = Object.fromEntries(
  DELIVERABLE_FORMATS.map((f) => [f.type, f.sample]),
) as Record<DeliverableType, string>;

const OFFICE_FORMATS: DeliverableType[] = ["xlsx", "pptx", "docx"];
const isOfficeFormat = (type: DeliverableType) => OFFICE_FORMATS.includes(type);

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
  const [tools, setTools] = useState<{
    charts: boolean;
    codeExecution: boolean;
    deliverables: DeliverableItem[];
  }>({ charts: true, codeExecution: false, deliverables: [] });
  const [deliverablesOpen, setDeliverablesOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Office deliverables (xlsx/pptx/docx) are produced via code execution, so
  // requesting any of them implies it (reflected in the Code Execution pill).
  const hasOfficeDeliverable = tools.deliverables.some((d) => isOfficeFormat(d.type));

  const toggleTool = (key: "charts" | "codeExecution") =>
    setTools((prev) => ({ ...prev, [key]: !prev[key] }));

  const MAX_DELIVERABLES = 5;

  const addDeliverable = () =>
    setTools((prev) =>
      prev.deliverables.length >= MAX_DELIVERABLES
        ? prev
        : { ...prev, deliverables: [...prev.deliverables, { type: "xlsx", description: "" }] },
    );

  const updateDeliverable = (i: number, patch: Partial<DeliverableItem>) =>
    setTools((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
    }));

  const removeDeliverable = (i: number) =>
    setTools((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, idx) => idx !== i),
    }));

  // Opening the panel with nothing configured seeds one row so it's not empty.
  // Keep the seed outside the state updater: updaters must be pure (React runs
  // them twice in dev), so seeding inside would add two rows.
  const toggleDeliverablesPanel = () => {
    const willOpen = !deliverablesOpen;
    setDeliverablesOpen(willOpen);
    if (willOpen && tools.deliverables.length === 0) addDeliverable();
  };
  // Synchronous re-entrancy guard. The `launching` state can't block a second
  // submit() fired in the same tick (rapid double-click / double-Enter) because
  // React hasn't re-rendered yet — without this, one fumble = two runs = double
  // credits charged.
  const submittingRef = useRef(false);

  const submit = async () => {
    const q = input.trim();
    if (!q || submittingRef.current) return;
    submittingRef.current = true;
    setLaunching(true);
    setError(null);
    // Ask for OS notification permission so we can ping when this finishes
    // (it's a long async run — the user will likely switch away).
    void requestNotifyPermission();
    try {
      const report = await apiCreateResearch(q, mode, {
        charts: tools.charts,
        codeExecution: tools.codeExecution || hasOfficeDeliverable,
        deliverables: tools.deliverables,
      });
      onLaunched(report.id); // navigates away (unmounts) on success
    } catch (e) {
      setError((e as Error).message);
      setLaunching(false);
      submittingRef.current = false; // allow retry after a failure
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
            className="absolute right-2 bottom-2 rounded-xl h-9 w-9 p-0 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-opacity"
            aria-label="Start research"
          >
            {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Depth + Tools — two labeled sub-groups on a single wrapping row */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4">
          {/* Depth selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground mr-0.5">Depth</span>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                title={m.note}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  mode === m.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                {m.id === "fast" && <Zap className="h-3 w-3 fill-current" strokeWidth={0} />}
                {m.label}
              </button>
            ))}
          </div>

          {/* Research tools */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground mr-0.5">Tools</span>
            {RESEARCH_TOOLS.map((t) => {
              const Icon = t.icon;
              if (t.key === "deliverables") {
                const count = tools.deliverables.length;
                const active = count > 0;
                return (
                  <button
                    key={t.key}
                    onClick={toggleDeliverablesPanel}
                    aria-pressed={active}
                    aria-expanded={deliverablesOpen}
                    title={t.title}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {t.label}
                    {count > 0 && <span className="opacity-70">({count})</span>}
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${deliverablesOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                );
              }
              const active =
                t.key === "codeExecution"
                  ? tools.codeExecution || hasOfficeDeliverable
                  : tools[t.key];
              return (
                <button
                  key={t.key}
                  onClick={() => toggleTool(t.key as "charts" | "codeExecution")}
                  aria-pressed={active}
                  title={t.title}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Deliverables builder — pick a format and describe what it should contain */}
        {deliverablesOpen && (
          <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-medium text-foreground">Deliverables</span>
              <span className="text-[10px] text-muted-foreground/70">
                Pick a format and describe what it should contain
              </span>
            </div>

            <div className="space-y-2">
              {tools.deliverables.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={d.type}
                    onValueChange={(v) => updateDeliverable(i, { type: v as DeliverableType })}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label="Deliverable format"
                      className="shrink-0 w-[170px] bg-background text-[11px] font-medium"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERABLE_FORMATS.map((f) => (
                        <SelectItem key={f.type} value={f.type} className="text-[11px]">
                          <Image
                            src={f.icon}
                            alt=""
                            width={16}
                            height={16}
                            unoptimized
                            className="h-4 w-4 object-contain"
                          />
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    value={d.description}
                    onChange={(e) => updateDeliverable(i, { description: e.target.value })}
                    placeholder={SAMPLE_DESC[d.type]}
                    maxLength={500}
                    className="flex-1 min-w-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-muted-foreground/40"
                  />
                  <button
                    onClick={() => removeDeliverable(i)}
                    aria-label="Remove deliverable"
                    className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {tools.deliverables.length < MAX_DELIVERABLES && (
              <button
                onClick={addDeliverable}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" /> Add deliverable
              </button>
            )}

            {hasOfficeDeliverable && (
              <p className="mt-2.5 text-[10px] text-muted-foreground/60">
                Excel, PowerPoint, and Word files are produced via code execution.
              </p>
            )}
          </div>
        )}

        {error && <ErrorNote message={error} className="mt-2" />}
      </motion.div>

      <div className="mt-10 sm:mt-12">
        <HomeWorkflows />
      </div>

      <div className="mt-6 sm:mt-8 opacity-80">
        <DataSourceLogos />
      </div>

      <motion.div
        className="flex items-center justify-center mt-6 sm:mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.5 }}
      >
        <span className="text-xs text-muted-foreground/60">Powered by</span>
        <a
          href="https://valyu.ai"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Valyu"
          className="inline-flex items-center hover:scale-105 transition-transform"
        >
          <Image
            src="/valyu.svg"
            alt="Valyu"
            width={60}
            height={60}
            className="h-4 opacity-60 hover:opacity-100 transition-opacity cursor-pointer dark:invert"
          />
        </a>
      </motion.div>
    </div>
  );
}

function ResearchRun({ reportId, onNew }: { reportId: string; onNew: () => void }) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Shares the ["report", reportId] cache with <ReportView> — React Query
  // dedupes, so this is one poll, not two.
  const { data } = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => apiSyncReport(reportId),
    refetchInterval: (query) => {
      const synced = query.state.data;
      // The session lapsed — further polls would 401 in a loop. Stop and let
      // the user re-auth; the run continues server-side regardless.
      if (synced?.authExpired) return false;
      const status = synced?.report?.status;
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

      {/* Re-auth needed — the session lapsed while the run continues
          server-side. Polling is paused; offer sign-in to resume live updates. */}
      {data?.authExpired && (
        <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-2.5">
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

      <ReportView reportId={reportId} />

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </motion.div>
  );
}
