"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Landmark,
  Briefcase,
  LineChart,
  Target,
  type LucideIcon,
} from "lucide-react";
import { DOMAINS, FINANCE_VERTICALS } from "@/lib/domains";
import { getExample, isExampleReady } from "@/lib/example-reports/registry";
import { ExampleReportDrawer } from "@/components/reports/example-report-drawer";

/** One glyph per domain — matches the reports browser, stays monochrome. */
const DOMAIN_ICON: Record<string, LucideIcon> = {
  "investment-banking": Landmark,
  "private-equity": Briefcase,
  "hedge-funds": LineChart,
  "sales-intelligence": Target,
};

const DOMAIN_LABEL: Record<string, string> = Object.fromEntries(
  DOMAINS.map((d) => [d.id, d.label]),
);

/**
 * Home-page discovery strip for Deep Research Reports. Surfaces the workflows
 * feature (otherwise buried behind the sidebar icon) using seeded example
 * reports — static, instant, and visible to logged-out visitors. Pills and
 * cards deep-link into /reports; the example drawer previews real output.
 */
export function HomeWorkflows() {
  const router = useRouter();
  const [openExampleDomain, setOpenExampleDomain] = useState<string | null>(null);

  const examples = FINANCE_VERTICALS.map((v) => getExample(v)).filter(isExampleReady);
  if (examples.length === 0) return null;

  return (
    <motion.div
      className="mt-5 text-left"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.5 }}
    >
      {/* Header + domain lens pills on one row */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
          Financial Services Workflows
        </h3>
        <button
          onClick={() => router.push("/reports")}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          Browse all <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Domain lens pills → deep-link into the reports browser */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {DOMAINS.map((d) => (
          <button
            key={d.id}
            onClick={() => router.push(`/reports?domain=${d.id}`)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-colors"
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Example report cards — compact, one row; preview real output */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {examples.map((ex) => {
          const Icon = DOMAIN_ICON[ex.domainId] ?? Target;
          return (
            <button
              key={ex.domainId}
              onClick={() => setOpenExampleDomain(ex.domainId)}
              className="group text-left p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-muted-foreground/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60 line-clamp-1">
                {DOMAIN_LABEL[ex.domainId] ?? "Example"}
              </span>
              <div className="text-xs font-medium text-foreground leading-snug line-clamp-2 mt-0.5">
                {ex.title}
              </div>
              <div className="text-[10px] text-muted-foreground/70 mt-1.5">
                {ex.sources_count > 0 ? `${ex.sources_count} sources ` : ""}→
              </div>
            </button>
          );
        })}
      </div>

      <ExampleReportDrawer
        domainId={openExampleDomain}
        onClose={() => setOpenExampleDomain(null)}
        onRun={(slug) => {
          setOpenExampleDomain(null);
          router.push(`/reports?workflow=${slug}`);
        }}
      />
    </motion.div>
  );
}
