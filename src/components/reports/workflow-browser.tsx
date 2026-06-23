"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  AlertCircle,
  Search,
  Zap,
  FileText,
  Plus,
  ExternalLink,
} from "lucide-react";
import { DOMAINS, MODES } from "@/lib/domains";
import type { WorkflowDTO, WorkflowVariable } from "@/lib/workflow-types";
import { apiListWorkflows } from "@/lib/workflow-client";
import { apiCreateReport } from "@/lib/report-client";
import { getExample } from "@/lib/example-reports/registry";
import { ExampleReportDrawer } from "@/components/reports/example-report-drawer";
import { ErrorNote } from "@/components/reports/error-note";
import { AuthModal } from "@/components/auth/auth-modal";
import { iconForVertical, verticalForSlug } from "@/lib/domain-icons";

/** True when an error message looks like a lapsed/absent session rather than a
 * genuine failure — keep matching generic so we never leak internals. */
const isAuthError = (message: string): boolean =>
  /AUTH_REQUIRED|session expired|sign in|unauthor/i.test(message);

const LS_KEY = "reports.lastDomain";

// Deliverable file types → compact badge labels.
const DELIVERABLE_LABEL: Record<string, string> = {
  xlsx: "XLS",
  docx: "DOC",
  pdf: "PDF",
  csv: "CSV",
  pptx: "PPT",
};
const deliverableLabels = (w: WorkflowDTO): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const d of w.deliverables ?? []) {
    const label = DELIVERABLE_LABEL[d.type] ?? d.type?.toUpperCase().slice(0, 3);
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out.slice(0, 3);
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function ModeChip({ mode }: { mode: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-foreground">
      <Zap className="h-3 w-3 fill-current" strokeWidth={0} />
      {cap(mode)}
    </span>
  );
}

function DeliverableBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex flex-col items-center justify-center h-9 w-8 rounded-md border border-border text-muted-foreground">
      <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
      <span className="text-[7px] font-bold leading-none mt-0.5 tracking-tight">{label}</span>
    </span>
  );
}

function ValyuBadge() {
  return (
    <span className="flex-shrink-0 text-[10px] font-semibold tracking-wider text-muted-foreground border border-border rounded-full px-1.5 py-px leading-tight">
      VALYU
    </span>
  );
}

export function WorkflowBrowser({
  onOpenReport,
}: {
  onOpenReport?: (reportId: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [domain, setDomain] = useState<string>("popular");
  const [selected, setSelected] = useState<WorkflowDTO | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [openExampleDomain, setOpenExampleDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Deep link from an example: /reports?workflow=<slug> → jump to its domain
  // and auto-open the run panel once the catalog loads. Otherwise restore
  // the last-used domain.
  useEffect(() => {
    const wf = searchParams.get("workflow");
    if (wf) {
      const vertical = verticalForSlug(wf);
      if (vertical) setDomain(vertical);
      setPendingSlug(wf);
      return;
    }
    const deepLinkDomain = searchParams.get("domain");
    if (deepLinkDomain && DOMAINS.some((d) => d.id === deepLinkDomain)) {
      setDomain(deepLinkDomain);
      return;
    }
    const saved = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (saved && DOMAINS.some((d) => d.id === saved)) setDomain(saved);
  }, [searchParams]);

  const selectDomain = (id: string) => {
    setDomain(id);
    setSelected(null);
    try {
      localStorage.setItem(LS_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const { data: workflows = [], isLoading, error } = useQuery({
    queryKey: ["workflows", domain],
    queryFn: () => apiListWorkflows(domain === "popular" ? undefined : domain),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const base = domain === "popular" ? workflows.filter((w) => w.popular) : workflows;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((w) =>
      `${w.title} ${w.subtitle} ${w.description}`.toLowerCase().includes(q),
    );
  }, [workflows, domain, query]);

  // Resolve a pending deep-linked workflow once its catalog has loaded.
  useEffect(() => {
    if (!pendingSlug) return;
    const found = workflows.find((w) => w.slug === pendingSlug);
    if (found) {
      setSelected(found);
      setPendingSlug(null);
    }
  }, [pendingSlug, workflows]);

  const example = domain !== "popular" ? getExample(domain) : null;

  return (
    <div>
      {/* Lens / domain filter — segmented control */}
      <div className="mb-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex items-center gap-1 rounded-2xl bg-muted border border-border p-1">
          {DOMAINS.map((d) => {
            const Icon = d.id === "popular" ? Sparkles : iconForVertical(d.id);
            const active = domain === d.id;
            return (
              <button
                key={d.id}
                onClick={() => selectDomain(d.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${active ? "text-foreground" : "text-muted-foreground"}`}
                  strokeWidth={2}
                />
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {selected ? (
        <RunPanel
          workflow={selected}
          onBack={() => setSelected(null)}
          onAuthRequired={() => setShowAuthModal(true)}
          onLaunched={(id) => {
            queryClient.invalidateQueries({ queryKey: ["reports"] });
            if (onOpenReport) {
              setSelected(null);
              onOpenReport(id);
            } else {
              router.push(`/reports/${id}`);
            }
          }}
        />
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workflows…"
              className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 transition-colors"
            />
          </div>

          {/* Hero: seeded example report for this domain */}
          {example && !query && (
            <button
              onClick={() => setOpenExampleDomain(domain)}
              className="w-full text-left mb-3 p-4 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-colors flex items-center gap-4"
            >
              <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Example report
                  </span>
                </div>
                <div className="text-sm font-semibold text-foreground truncate mt-0.5">
                  {example.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  See a finished {example.subject} report before you run your own
                  {example.sources_count > 0 ? ` · ${example.sources_count} sources` : ""}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-10">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading workflows…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 text-sm py-10">
              <AlertCircle className="h-4 w-4" /> {(error as Error).message}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center py-14 px-6 rounded-2xl border border-dashed border-border">
              <div className="h-12 w-12 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">
                {query ? `No workflow for “${query}” yet` : "No workflows in this domain yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
                Workflows are Valyu’s prebuilt research templates. Don’t see the one you
                need? Build your own on the Valyu platform and run it right here.
              </p>
              <a
                href="https://platform.valyu.ai/user/workflows"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" /> Create your own workflow
                <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((w) => {
                const Icon = iconForVertical(w.vertical);
                const deliverables = deliverableLabels(w);
                return (
                  <button
                    key={w.slug}
                    onClick={() => setSelected(w)}
                    className="group text-left p-5 rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-all"
                  >
                    {/* Header: icon + title + VALYU */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-[15px] font-semibold text-foreground truncate">
                          {w.title}
                        </h3>
                        <ValyuBadge />
                      </div>
                    </div>

                    {/* Subtitle */}
                    <p className="text-[13px] text-muted-foreground mt-3 line-clamp-1">
                      {w.subtitle || w.description}
                    </p>

                    {/* Footer: mode + time / deliverables */}
                    <div className="flex items-center justify-between gap-2 mt-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ModeChip mode={w.recommended_mode} />
                        {w.estimated_time && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5" /> {w.estimated_time}
                          </span>
                        )}
                      </div>
                      {deliverables.length > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {deliverables.map((d) => (
                            <DeliverableBadge key={d} label={d} />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <ExampleReportDrawer
        domainId={openExampleDomain}
        onClose={() => setOpenExampleDomain(null)}
        onRun={(slug) => {
          setOpenExampleDomain(null);
          setPendingSlug(slug);
        }}
      />

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

function RunPanel({
  workflow,
  onBack,
  onLaunched,
  onAuthRequired,
}: {
  workflow: WorkflowDTO;
  onBack: () => void;
  onLaunched: (reportId: string) => void;
  onAuthRequired: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState(workflow.recommended_mode || "standard");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiredMet = workflow.variables
    .filter((v) => v.required)
    .every((v) => (values[v.key] ?? "").trim().length > 0);

  const set = (k: string, val: string) => setValues((p) => ({ ...p, [k]: val }));

  const buildParams = () => {
    const params: Record<string, unknown> = {};
    for (const v of workflow.variables) {
      const raw = values[v.key];
      if (raw == null || raw === "") continue;
      params[v.key] = v.type === "number" ? Number(raw) : raw;
    }
    return params;
  };

  const deriveTitle = () => {
    const first = workflow.variables.find((v) => v.required && values[v.key]);
    const suffix = first ? ` — ${values[first.key]}` : "";
    return `${workflow.title}${suffix}`;
  };

  const handleRun = async () => {
    if (!requiredMet || launching) return;
    setLaunching(true);
    setError(null);
    try {
      const report = await apiCreateReport({
        workflow_slug: workflow.slug,
        workflow_params: buildParams(),
        mode,
        title: deriveTitle(),
        estimated_time: workflow.estimated_time ?? undefined,
      });
      onLaunched(report.id);
    } catch (e) {
      const message = (e as Error).message;
      // A lapsed session isn't a failed launch — prompt re-auth instead of
      // surfacing a raw error string.
      if (isAuthError(message)) {
        onAuthRequired();
      } else {
        setError(message);
      }
      setLaunching(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to workflows
      </button>

      <div className="mb-1 text-base font-medium text-foreground">
        {workflow.title}
      </div>
      <div className="text-xs text-muted-foreground mb-5 flex items-center gap-2">
        {workflow.subtitle}
        {workflow.estimated_time && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {workflow.estimated_time}
          </span>
        )}
      </div>

      {/* Auto-generated variable form */}
      <div className="space-y-4">
        {workflow.variables.map((v) => (
          <Field key={v.key} variable={v} value={values[v.key] ?? ""} onChange={(val) => set(v.key, val)} />
        ))}
      </div>

      {/* Mode + cost */}
      <div className="mt-5">
        <div className="text-xs font-medium text-foreground mb-2">
          Depth
        </div>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${
                mode === m.id
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/20"
              }`}
              title={m.note}
            >
              <span className="font-medium text-foreground">{m.label}</span>
              {workflow.recommended_mode === m.id && (
                <span className="ml-1.5 text-[10px] text-emerald-600">rec</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorNote message={error} className="mt-4" />}

      <div className="mt-5">
        <button
          onClick={handleRun}
          disabled={!requiredMet || launching}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Run report
        </button>
      </div>
    </div>
  );
}

function Field({
  variable,
  value,
  onChange,
}: {
  variable: WorkflowVariable;
  value: string;
  onChange: (val: string) => void;
}) {
  const base =
    "w-full rounded-xl border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-foreground/40";
  const hint = variable.examples?.length ? `e.g. ${variable.examples.slice(0, 3).join(", ")}` : variable.help;

  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">
        {variable.label}
        {variable.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {variable.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={variable.placeholder}
          rows={3}
          className={base}
        />
      ) : variable.type === "enum" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          <option value="">Select…</option>
          {variable.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={variable.type === "number" ? "number" : variable.type === "date" ? "date" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={variable.placeholder}
          className={base}
        />
      )}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
