"use client";

import { Brain, Search, Check, ExternalLink, Telescope } from "lucide-react";
import { getFaviconUrl, getHostname } from "@/lib/favicon";
import type { ActivityItem, ActivitySource } from "@/lib/reports";

/**
 * Live DeepResearch activity feed — mirrors the Valyu playground but in the
 * app's warm/sage theme: soft Reasoning blocks, research-step cards (with
 * objective), and the "N sources found" list per step. Driven by the parsed
 * `activity` items from the task status transcript; grows as polling brings
 * new items in.
 */
export function ActivityFeed({
  activity,
  running,
}: {
  activity: ActivityItem[] | null | undefined;
  running?: boolean;
}) {
  const items = activity ?? [];

  if (items.length === 0) {
    if (!running) return null;
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-12 w-12 items-center justify-center mb-4">
            <span className="absolute inline-flex h-full w-full rounded-2xl bg-primary/10 animate-ping" />
            <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Telescope className="h-5 w-5 text-primary" strokeWidth={1.75} />
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">Agent is researching your query…</p>
          <p className="text-xs text-muted-foreground mt-1">
            Reasoning, search steps, and sources will stream in here.
          </p>
        </div>
        {/* Skeleton hints of incoming items */}
        <div className="mt-7 space-y-2.5 max-w-md mx-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-muted/60 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s`, opacity: 1 - i * 0.25 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <ActivityRow key={i} item={item} />
      ))}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  if (item.kind === "reasoning" || item.kind === "text") {
    const isReasoning = item.kind === "reasoning";
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2 text-primary/90">
          <Brain className="h-3.5 w-3.5" />
          {isReasoning ? "Reasoning" : "Note"}
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{item.text}</p>
      </div>
    );
  }

  // Research step
  return (
    <div>
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary/15">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
            <Check className="h-3 w-3 text-primary" strokeWidth={3} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">research</span>
        </div>
        <div className="px-4 py-3">
          <div className="text-[11px] font-medium text-muted-foreground mb-0.5">Research objective</div>
          <p className="text-sm text-foreground/90 leading-relaxed">{item.objective}</p>
        </div>
      </div>

      {item.sources.length > 0 && (
        <div className="mt-2.5 pl-3 border-l-2 border-border ml-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Search className="h-3.5 w-3.5" /> {item.sources.length} sources found
          </div>
          <div className="space-y-1.5">
            {item.sources.map((s, i) => (
              <SourceCard key={`${s.url ?? s.source_id ?? i}`} source={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SourceCard({ source }: { source: ActivitySource }) {
  const url = source.url ?? "";
  const favicon = url ? getFaviconUrl(url) : "";
  const host = url ? getHostname(url) : "";
  const title = source.title || host || "Source";
  const desc = source.content?.trim();

  const inner = (
    <>
      <div className="h-5 w-5 flex-shrink-0 mt-0.5 rounded bg-muted flex items-center justify-center overflow-hidden">
        {favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={favicon} alt="" className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground truncate">
          {title}
          {host && <span className="text-muted-foreground font-normal"> · {host}</span>}
        </div>
        {desc && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{desc}</div>}
      </div>
    </>
  );

  const className =
    "group flex items-start gap-2.5 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-muted/20 transition-colors";

  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}
