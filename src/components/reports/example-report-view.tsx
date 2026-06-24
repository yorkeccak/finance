"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Clock, Loader2, ExternalLink } from "lucide-react";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { extractMarkdownLinkCitations } from "@/lib/citation-utils";
import { getExample, isExampleReady } from "@/lib/example-reports/registry";
import { DOMAINS } from "@/lib/domains";

/**
 * Renders a seeded example report (sample banner, CTA, body). Layout-agnostic
 * — used by both the example route and the slide-in drawer. `onRun`, when
 * provided, opens the run panel in place (drawer); otherwise the CTA navigates.
 */
export function ExampleReportView({
  domainId,
  onRun,
}: {
  domainId: string;
  onRun?: (workflowSlug: string) => void;
}) {
  const router = useRouter();
  const example = getExample(domainId);
  const domain = DOMAINS.find((d) => d.id === domainId);

  // Examples embed source URLs inline as `[[n]](url)` markdown links; turn
  // those into favicon citation pills (and resolve bare `[n]` reuses too).
  const { citations, text } = useMemo(
    () => extractMarkdownLinkCitations(example?.output ?? ""),
    [example?.output],
  );

  if (!example) {
    return <div className="text-sm text-muted-foreground py-12">No example for this domain.</div>;
  }

  const runWorkflow = () => {
    if (onRun) onRun(example.workflow_slug);
    else router.push(`/reports?workflow=${example.workflow_slug}`);
  };

  return (
    <>
      <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
        <Sparkles className="h-3.5 w-3.5" />
        Example report · {domain?.label ?? example.domainId}
      </div>
      <h1 className="text-2xl font-light text-foreground">{example.title}</h1>
      <div className="mt-1 mb-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{example.workflow_slug}</span>
        {example.sources_count > 0 && <span>{example.sources_count} sources</span>}
        {example.pdf_url && (
          <a
            href={example.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" /> Open PDF
          </a>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 mb-6 flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Run this same workflow with your own inputs.
        </div>
        <button
          onClick={runWorkflow}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium flex-shrink-0"
        >
          Run a report like this <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {isExampleReady(example) ? (
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <CitationTextRenderer
            text={text}
            citations={citations}
            className="prose prose-sm dark:prose-invert max-w-none [--tw-prose-headings:var(--foreground)] [--tw-prose-bold:var(--foreground)]"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> This example is still being generated. Check back shortly.
          </span>
        </div>
      )}
    </>
  );
}
