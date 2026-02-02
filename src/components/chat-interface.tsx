"use client";

import React from "react";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { FinanceUIMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useLocalProvider } from "@/lib/ollama-context";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { createClient } from '@/utils/supabase/client-wrapper';
import { track } from '@vercel/analytics';
import { AuthModal } from '@/components/auth/auth-modal';
import { ModelCompatibilityDialog } from '@/components/model-compatibility-dialog';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { VirtualizedContentDialog } from "@/components/virtualized-content-dialog";
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useDeferredValue,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Square,
  Trash2,
  AlertCircle,
  Loader2,
  Edit3,
  Wrench,
  CheckCircle,
  Copy,
  ChevronDown,
  ExternalLink,
  FileText,
  Clipboard,
  Download,
  Brain,
  Search,
  Globe,
  BookOpen,
  Code2,
  Table,
  BarChart3,
  Check,
  CornerDownRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import katex from "katex";
import { FinancialChart } from "@/components/financial-chart";
import { CSVPreview } from "@/components/csv-preview";
import { CitationTextRenderer } from "@/components/citation-text-renderer";
import { CitationMap } from "@/lib/citation-utils";
import { CsvRenderer } from "@/components/csv-renderer";
import { Favicon } from "@/components/favicon";
const JsonView = dynamic(() => import("@uiw/react-json-view"), {
  ssr: false,
  loading: () => <div className="text-xs text-muted-foreground">Loading JSON…</div>,
});
import {
  preprocessMarkdownText,
  cleanFinancialText,
} from "@/lib/markdown-utils";
import { parseFirstLine } from "@/lib/text-utils";
import { motion, AnimatePresence } from "framer-motion";
import DataSourceLogos from "./data-source-logos";
import SocialLinks from "./social-links";
import { calculateMessageMetrics, MessageMetrics } from "@/lib/metrics-calculator";
import { MetricsPills } from "@/components/metrics-pills";

// Professional Finance UI - Workflow-inspired with checkmarks and clean cards
const TimelineStep = memo(({
  part,
  messageId,
  index,
  status,
  type = 'reasoning',
  title,
  subtitle,
  icon,
  expandedTools,
  toggleToolExpansion,
  children,
}: {
  part: any;
  messageId: string;
  index: number;
  status: string;
  type?: 'reasoning' | 'search' | 'action' | 'tool';
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
  children?: React.ReactNode;
}) => {
  const stepId = `step-${type}-${messageId}-${index}`;
  const isExpanded = expandedTools.has(stepId);
  const hasContent = children || (part.text && part.text.length > 0);

  const toggleExpand = () => {
    toggleToolExpansion(stepId);
  };

  const isComplete = status === 'complete';
  const isStreaming = status === 'streaming';
  const isError = status === 'error';

  return (
    <div className="group relative animate-in fade-in duration-200 py-1">
      {/* Claude-style minimal design */}
      <div
        className={`flex items-start gap-3 ${hasContent ? 'cursor-pointer' : ''}`}
        onClick={hasContent ? toggleExpand : undefined}
      >
        {/* Status indicator */}
        <div className="flex-shrink-0 w-5 h-5 mt-0.5">
          {isComplete ? (
            <div className="w-5 h-5 rounded-full border border-primary/40 flex items-center justify-center">
              <Check className="w-3 h-3 text-primary stroke-[2.5]" />
            </div>
          ) : isStreaming ? (
            <div className="w-5 h-5 rounded-full border border-muted-foreground/30 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border border-transparent border-t-muted-foreground animate-spin" />
            </div>
          ) : isError ? (
            <div className="w-5 h-5 rounded-full border border-destructive/40 flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-destructive" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-muted-foreground/30" />
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={`flex-shrink-0 w-4 h-4 mt-0.5 ${
            isStreaming ? 'text-muted-foreground animate-pulse' : 'text-muted-foreground'
          }`}>
            {icon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground">{title}</span>
          {subtitle && !isExpanded && (
            <span className="text-sm text-muted-foreground/60 ml-2">{subtitle}</span>
          )}
        </div>

        {/* Chevron */}
        {hasContent && !isStreaming && (
          <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-150 ${
            isExpanded ? 'rotate-180' : ''
          }`} />
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && hasContent && (
        <div className="mt-3 ml-8 animate-in fade-in duration-150">
          {children || (
            <div className="text-sm leading-relaxed text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5 border-l-2 border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {part.text || ''}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.part === nextProps.part &&
    prevProps.status === nextProps.status &&
    prevProps.expandedTools === nextProps.expandedTools &&
    prevProps.children === nextProps.children
  );
});
TimelineStep.displayName = 'TimelineStep';

// Live Reasoning Preview - shows latest **title** + 2 most recent lines
// Lines wrap and stream/switch as new content comes in
const LiveReasoningPreview = memo(({ title, lines }: { title: string; lines: string[] }) => {
  if (!title && lines.length === 0) return null;

  // Always show the last 2 lines
  const displayLines = lines.slice(-2);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="my-1 ml-3 sm:ml-8 mr-3 sm:mr-0"
    >
      <div className="bg-accent/30 border-l-2 border-primary/40 rounded-r px-2 sm:px-2.5 py-1.5 space-y-1 overflow-hidden max-w-full">
        {/* Show the latest **title** */}
        {title && (
          <div className="text-xs font-semibold text-foreground truncate">
            {title}
          </div>
        )}

        {/* Show 2 most recent lines - each limited to 1 visual line */}
        <AnimatePresence mode="popLayout">
          {displayLines.map((line, index) => (
            <motion.div
              key={`${displayLines.length}-${index}-${line.substring(0, 30)}`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.08 }}
              className="text-xs text-muted-foreground leading-snug truncate max-w-full"
            >
              {line}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

LiveReasoningPreview.displayName = 'LiveReasoningPreview';

// Reasoning component - wraps TimelineStep
const ReasoningComponent = memo(({
  part,
  messageId,
  index,
  status,
  expandedTools,
  toggleToolExpansion,
}: {
  part: any;
  messageId: string;
  index: number;
  status: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) => {
  const reasoningText = part.text || "";
  // Extract the first meaningful line as the title and strip markdown
  const firstLine = reasoningText.split('\n').find((line: string) => line.trim().length > 0) || "";
  // Remove markdown formatting like **, *, _, etc.
  const cleanedLine = firstLine.replace(/\*\*/g, '').replace(/\*/g, '').replace(/_/g, '').trim();
  const title = cleanedLine.length > 50 ? cleanedLine.slice(0, 50) + '...' : cleanedLine || "Thinking";

  return (
    <TimelineStep
      part={part}
      messageId={messageId}
      index={index}
      status={status}
      type="reasoning"
      title={title}
      subtitle={undefined}
      icon={<Brain />}
      expandedTools={expandedTools}
      toggleToolExpansion={toggleToolExpansion}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.part.text === nextProps.part.text &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.index === nextProps.index &&
    prevProps.status === nextProps.status &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
ReasoningComponent.displayName = 'ReasoningComponent';

// ChartImageRenderer component - Fetches and renders charts from markdown references
const ChartImageRendererComponent = ({ chartId, alt }: { chartId: string; alt?: string }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchChart = async () => {
      try {
        const response = await fetch(`/api/charts/${chartId}`);
        if (cancelled) return;

        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        setChartData(data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    };

    fetchChart();

    return () => {
      cancelled = true;
    };
  }, [chartId]);

  if (loading) {
    return (
      <span className="block w-full border border-border rounded-lg p-12 my-4 text-center">
        <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
        <span className="block mt-3 text-sm text-muted-foreground">Loading chart...</span>
      </span>
    );
  }

  if (error || !chartData) {
    return (
      <span className="block w-full border border-destructive/30 rounded-lg p-6 my-4 text-center">
        <span className="text-sm text-destructive">Failed to load chart</span>
      </span>
    );
  }

  return (
    <span className="block w-full my-4">
      <FinancialChart {...chartData} key={chartId} />
    </span>
  );
};

// Memoize ChartImageRenderer to prevent unnecessary re-fetches and re-renders
const ChartImageRenderer = memo(ChartImageRendererComponent, (prevProps, nextProps) => {
  return prevProps.chartId === nextProps.chartId && prevProps.alt === nextProps.alt;
});
ChartImageRenderer.displayName = 'ChartImageRenderer';

// Memoized Chart Result - prevents re-rendering when props don't change
const MemoizedChartResult = memo(function MemoizedChartResult({
  chartData,
  actionId,
  expandedTools,
  toggleToolExpansion
}: {
  chartData: any;
  actionId: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <FinancialChart {...chartData} />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.chartData === nextProps.chartData &&
    prevProps.actionId === nextProps.actionId &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
MemoizedChartResult.displayName = 'MemoizedChartResult';

// Memoized Code Execution Result - prevents re-rendering when props don't change
// Uses plain pre/code WITHOUT syntax highlighting to prevent browser freeze
const MemoizedCodeExecutionResult = memo(function MemoizedCodeExecutionResult({
  code,
  output,
  actionId,
  expandedTools,
  toggleToolExpansion
}: {
  code: string;
  output: string;
  actionId: string;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) {
  const isExpanded = expandedTools.has(actionId);

  // Escape HTML entities to prevent rendering <module> and other HTML-like content as actual HTML
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="space-y-4">
      {/* Code Section - clean monospace display */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Input</div>
        <pre className="p-4 bg-muted text-foreground text-xs overflow-x-auto rounded-lg max-h-[400px] overflow-y-auto border border-border shadow-inner">
          <code>{code || "No code available"}</code>
        </pre>
      </div>

      {/* Output Section - elegant typography */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Output</div>
        <div className="prose prose-sm max-w-none dark:prose-invert text-sm p-4 bg-card rounded-lg max-h-[400px] overflow-y-auto border border-border">
          <MemoizedMarkdown text={escapeHtml(output)} />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.code === nextProps.code &&
    prevProps.output === nextProps.output &&
    prevProps.actionId === nextProps.actionId &&
    prevProps.expandedTools === nextProps.expandedTools
  );
});
MemoizedCodeExecutionResult.displayName = 'MemoizedCodeExecutionResult';

// Enhanced markdown components that handle both math and financial content
const markdownComponents = {
  img: ({ src, alt, ...props }: any) => {
    // Don't render image if src is empty or undefined
    if (!src || src.trim() === "") {
      return null;
    }


    // Validate URL for regular images - must be absolute URL or start with /
    try {
      // Check if it's a valid absolute URL
      new URL(src);
    } catch {
      // Check if it starts with / (valid relative path for Next.js)
      if (!src.startsWith('/') && !src.startsWith('csv:') && !src.match(/^\/api\/(charts|csvs)\//)) {
        return (
          <span className="text-xs text-muted-foreground italic">
            [Image: {alt || src}]
          </span>
        );
      }
    }

    return <Image src={src} alt={alt || ""} width={500} height={300} {...props} />;
  },
  iframe: ({ src, ...props }: any) => {
    // Don't render iframe if src is empty or undefined
    if (!src || src.trim() === "") {
      return null;
    }
    return <iframe src={src} {...props} />;
  },
  math: ({ children }: any) => {
    // Render math content using KaTeX
    const mathContent =
      typeof children === "string" ? children : children?.toString() || "";

    try {
      const html = katex.renderToString(mathContent, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
      return (
        <span
          dangerouslySetInnerHTML={{ __html: html }}
          className="katex-math"
        />
      );
    } catch (error) {
      return (
        <code className="math-fallback bg-muted px-1 rounded">
          {mathContent}
        </code>
      );
    }
  },
  // Handle academic XML tags commonly found in Wiley content
  note: ({ children }: any) => (
    <div className="bg-accent/30 border-l-4 border-primary pl-4 py-2 my-2 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-primary font-medium">Note:</span>
        <div>{children}</div>
      </div>
    </div>
  ),
  t: ({ children }: any) => (
    <span className="font-mono text-sm bg-muted px-1 rounded">
      {children}
    </span>
  ),
  f: ({ children }: any) => (
    <span className="italic">{children}</span>
  ),
  // Handle other common academic tags
  ref: ({ children }: any) => (
    <span className="text-primary text-sm">
      [{children}]
    </span>
  ),
  caption: ({ children }: any) => (
    <div className="text-sm text-muted-foreground italic text-center my-2">
      {children}
    </div>
  ),
  figure: ({ children }: any) => (
    <div className="my-4 p-2 border border-border rounded">
      {children}
    </div>
  ),
  // Fix paragraph wrapping for block elements (charts) to avoid hydration errors
  p: ({ children, ...props }: any) => {
    // Check if this paragraph contains any React component (like charts)
    const hasBlockContent = React.Children.toArray(children).some((child: any) => {
      return React.isValidElement(child) && typeof child.type !== 'string';
    });

    // If paragraph contains block content (like charts), render as div to avoid hydration errors
    if (hasBlockContent) {
      return <div {...props}>{children}</div>;
    }

    return <p {...props}>{children}</p>;
  },
};

// Memoized component for parsed first line to avoid repeated parsing
const MemoizedFirstLine = memo(function MemoizedFirstLine({
  text,
  fallback,
}: {
  text: string;
  fallback: string;
}) {
  const parsed = useMemo(
    () => parseFirstLine(text, fallback),
    [text, fallback]
  );
  return <>{parsed}</>;
});

// Helper function to group message parts - memoized to prevent re-computation on every render
function groupMessageParts(parts: any[]): any[] {
  const groupedParts: any[] = [];
  let currentReasoningGroup: any[] = [];
  const seenToolCallIds = new Set<string>();


  parts.forEach((part, index) => {
    // Skip step-start markers entirely - they're metadata from AI SDK
    if (part.type === "step-start") {
      return;
    }

    // Deduplicate tool calls by toolCallId - skip if we've already seen this tool call
    if (part.toolCallId && seenToolCallIds.has(part.toolCallId)) {
      return;
    }

    // Track this tool call ID
    if (part.toolCallId) {
      seenToolCallIds.add(part.toolCallId);
    }

    if (
      part.type === "reasoning" &&
      part.text &&
      part.text.trim() !== ""
    ) {
      currentReasoningGroup.push({ part, index });
    } else {
      if (currentReasoningGroup.length > 0) {
        groupedParts.push({
          type: "reasoning-group",
          parts: currentReasoningGroup,
        });
        currentReasoningGroup = [];
      }
      groupedParts.push({ type: "single", part, index });
    }
  });

  // Add any remaining reasoning group
  if (currentReasoningGroup.length > 0) {
    groupedParts.push({
      type: "reasoning-group",
      parts: currentReasoningGroup,
    });
  }


  return groupedParts;
}

// Helper to parse and extract CSV/chart references from markdown
const parseSpecialReferences = (text: string): Array<{ type: 'text' | 'csv' | 'chart', content: string, id?: string }> => {
  const segments: Array<{ type: 'text' | 'csv' | 'chart', content: string, id?: string }> = [];

  // Pattern to match ![alt](csv:uuid) or ![alt](/api/csvs/uuid) or chart references
  const pattern = /!\[([^\]]*)\]\((csv:[a-f0-9-]+|\/api\/csvs\/[a-f0-9-]+|\/api\/charts\/[^\/]+\/image)\)/gi;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the reference
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    const url = match[2];

    // Check if it's a CSV reference
    const csvProtocolMatch = url.match(/^csv:([a-f0-9-]+)$/i);
    const csvApiMatch = url.match(/^\/api\/csvs\/([a-f0-9-]+)$/i);

    if (csvProtocolMatch || csvApiMatch) {
      const csvId = (csvProtocolMatch || csvApiMatch)![1];
      segments.push({
        type: 'csv',
        content: match[0],
        id: csvId
      });
    } else {
      // Chart reference
      const chartMatch = url.match(/^\/api\/charts\/([^\/]+)\/image$/);
      if (chartMatch) {
        segments.push({
          type: 'chart',
          content: match[0],
          id: chartMatch[1]
        });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return segments;
};

// Memoized Markdown renderer to avoid re-parsing on unrelated state updates
const MemoizedMarkdown = memo(function MemoizedMarkdown({
  text,
}: {
  text: string;
}) {
  const enableRawHtml = (text?.length || 0) < 20000;

  // Parse special references (CSV/charts) - MUST be before any conditional returns
  const specialSegments = useMemo(() => parseSpecialReferences(text), [text]);
  const hasSpecialRefs = specialSegments.some(s => s.type === 'csv' || s.type === 'chart');

  // Process text for regular markdown - MUST be before any conditional returns
  const processed = useMemo(
    () => {
      const result = preprocessMarkdownText(cleanFinancialText(text || ""));
      return result;
    },
    [text]
  );

  // If we have CSV or chart references, render them separately to avoid nesting issues
  if (hasSpecialRefs) {
    return (
      <>
        {specialSegments.map((segment, idx) => {
          if (segment.type === 'csv' && segment.id) {
            return <CsvRenderer key={`${segment.id}-${idx}`} csvId={segment.id} />;
          }
          if (segment.type === 'chart' && segment.id) {
            return <ChartImageRenderer key={`${segment.id}-${idx}`} chartId={segment.id} />;
          }
          // Render text segment as markdown
          const segmentProcessed = preprocessMarkdownText(cleanFinancialText(segment.content));
          return (
            <ReactMarkdown
              key={idx}
              remarkPlugins={[remarkGfm]}
              components={markdownComponents as any}
              rehypePlugins={enableRawHtml ? [rehypeRaw] : []}
              skipHtml={!enableRawHtml}
              unwrapDisallowed={true}
            >
              {segmentProcessed}
            </ReactMarkdown>
          );
        })}
      </>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents as any}
      rehypePlugins={enableRawHtml ? [rehypeRaw] : []}
      skipHtml={!enableRawHtml}
      unwrapDisallowed={true}
    >
      {processed}
    </ReactMarkdown>
  );
}, (prevProps, nextProps) => {
  // PERFORMANCE FIX: Only re-render if text actually changes
  return prevProps.text === nextProps.text;
});

// THIS IS THE KEY OPTIMIZATION - prevents re-renders during streaming
// Extract citations ONLY when parts change, NOT when text streams
const MemoizedTextPartWithCitations = memo(
  function MemoizedTextPartWithCitations({
    text,
    messageParts,
    currentPartIndex,
    allMessages,
    currentMessageIndex,
  }: {
    text: string;
    messageParts: any[];
    currentPartIndex: number;
    allMessages?: any[];
    currentMessageIndex?: number;
  }) {
    // Extract citations only when parts before this one change, not when text streams
    const citations = useMemo(() => {
      const citationMap: CitationMap = {};
      let citationNumber = 1;


      // Scan ALL previous messages AND current message for tool results
      if (allMessages && currentMessageIndex !== undefined) {
        for (let msgIdx = 0; msgIdx <= currentMessageIndex; msgIdx++) {
          const msg = allMessages[msgIdx];
          const parts = msg.parts || (Array.isArray(msg.content) ? msg.content : []);


          for (let i = 0; i < parts.length; i++) {
            const p = parts[i];


        if (isSearchToolPart(p) && (p.output || p.result)) {
          try {
            const output = typeof p.output === "string" ? JSON.parse(p.output) :
                          typeof p.result === "string" ? JSON.parse(p.result) :
                          p.output || p.result;

            if (output.results && Array.isArray(output.results)) {
              output.results.forEach((item: any) => {
                const key = `[${citationNumber}]`;
                let description = item.content || item.summary || item.description || "";
                if (typeof description === "object") {
                  description = JSON.stringify(description);
                }
                citationMap[key] = [
                  {
                    number: citationNumber.toString(),
                    title: item.title || `Source ${citationNumber}`,
                    url: item.url || "",
                    description: description,
                    source: item.source,
                    date: item.date,
                    authors: Array.isArray(item.authors) ? item.authors : [],
                    doi: item.doi,
                    relevanceScore: item.relevanceScore || item.relevance_score,
                    toolType: getSearchToolType(p),
                  },
                ];
                citationNumber++;
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
          }
        }
      } else {
        // Fallback: scan current message only (for streaming messages)
        for (let i = 0; i < messageParts.length; i++) {
          const p = messageParts[i];

          if (isSearchToolPart(p) && (p.output || p.result)) {
            try {
              const output = typeof p.output === "string" ? JSON.parse(p.output) :
                            typeof p.result === "string" ? JSON.parse(p.result) :
                            p.output || p.result;

              if (output.results && Array.isArray(output.results)) {
                output.results.forEach((item: any) => {
                  const key = `[${citationNumber}]`;
                  let description = item.content || item.summary || item.description || "";
                  if (typeof description === "object") {
                    description = JSON.stringify(description);
                  }
                  citationMap[key] = [
                    {
                      number: citationNumber.toString(),
                      title: item.title || `Source ${citationNumber}`,
                      url: item.url || "",
                      description: description,
                      source: item.source,
                      date: item.date,
                      authors: Array.isArray(item.authors) ? item.authors : [],
                      doi: item.doi,
                      relevanceScore: item.relevanceScore || item.relevance_score,
                      toolType: getSearchToolType(p),
                    },
                  ];
                  citationNumber++;
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      return citationMap;
    }, [messageParts, currentPartIndex, allMessages, currentMessageIndex]); // Only recompute when parts array changes, not text

    // Memoize whether citations exist to avoid Object.keys() on every render
    const hasCitations = useMemo(() => {
      return Object.keys(citations).length > 0;
    }, [citations]);

    // Render with or without citations
    if (hasCitations) {
      return <CitationTextRenderer text={text} citations={citations} />;
    } else {
      return <MemoizedMarkdown text={text} />;
    }
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if text changed OR parts structure changed
    // This prevents re-rendering on every token during streaming
    return (
      prevProps.text === nextProps.text &&
      prevProps.currentPartIndex === nextProps.currentPartIndex &&
      prevProps.messageParts.length === nextProps.messageParts.length
    );
  }
);

// Helper to detect if content is JSON (object/array) or parseable JSON string
const isJsonContent = (content: any): boolean => {
  if (typeof content === "object" && content !== null) return true;
  if (typeof content === "string") {
    const trimmed = content.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        JSON.parse(trimmed);
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
};

// Helper to generate a smart summary for JSON content
const generateJsonSummary = (content: any, maxLength = 120): string => {
  try {
    const obj = typeof content === "string" ? JSON.parse(content) : content;
    if (Array.isArray(obj)) {
      const itemCount = obj.length;
      if (itemCount === 0) return "Empty array";
      const firstItem = obj[0];
      if (typeof firstItem === "object" && firstItem !== null) {
        const keys = Object.keys(firstItem).slice(0, 4);
        return `${itemCount} items with fields: ${keys.join(", ")}${keys.length < Object.keys(firstItem).length ? "..." : ""}`;
      }
      return `Array of ${itemCount} ${typeof firstItem}s`;
    }
    if (typeof obj === "object" && obj !== null) {
      const entries = Object.entries(obj).slice(0, 3);
      const preview = entries.map(([k, v]) => {
        const val = typeof v === "string" ? v.slice(0, 30) : typeof v === "number" ? v : typeof v;
        return `${k}: ${val}`;
      }).join(", ");
      return preview.length > maxLength ? preview.slice(0, maxLength) + "..." : preview;
    }
    return String(obj).slice(0, maxLength);
  } catch {
    return "Structured data";
  }
};

// Helper function to extract search results for carousel display
const extractSearchResults = (output: any) => {
  try {
    // Handle both string (legacy) and object (AI SDK v6) formats
    const data = typeof output === 'string' ? JSON.parse(output) : output;
    if (data?.results && Array.isArray(data.results)) {
      const mappedResults = data.results.map((result: any, index: number) => {
        const contentIsJson = isJsonContent(result.content);
        const isStructured = result.dataType === "structured" || contentIsJson;

        // Generate smart summary
        let summary: string;
        if (result.content) {
          if (typeof result.content === "string" && !contentIsJson) {
            summary = result.content.length > 150
              ? result.content.substring(0, 150) + "..."
              : result.content;
          } else if (typeof result.content === "number") {
            summary = `Current Price: $${result.content.toFixed(2)}`;
          } else if (contentIsJson) {
            summary = generateJsonSummary(result.content);
          } else {
            summary = `Data from ${result.source || "source"}`;
          }
        } else {
          summary = "No summary available";
        }

        return {
          id: index,
          title: result.title || `Result ${index + 1}`,
          summary,
          source: result.source || "Unknown source",
          date: result.date || "",
          url: result.url || "",
          fullContent:
            typeof result.content === "number"
              ? `$${result.content.toFixed(2)}`
              : result.content || "No content available",
          isStructured,
          contentIsJson,
          dataType: isStructured ? "structured" : (result.dataType || "unstructured"),
          length: result.length,
          imageUrls: result.imageUrl || result.image_url || {},
          relevanceScore: result.relevanceScore || result.relevance_score || 0,
        };
      });

      // Sort results: structured first, then by relevance score within each category
      return mappedResults.sort((a: any, b: any) => {
        // If one is structured and the other is unstructured, structured comes first
        if (a.isStructured && !b.isStructured) return -1;
        if (!a.isStructured && b.isStructured) return 1;

        // Within the same category, sort by relevance score (higher score first)
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      });
    }
    return [];
  } catch (error) {
    return [];
  }
};

// Search tool names for type checking
const SEARCH_TOOL_NAMES = [
  "financeSearch",
  "webSearch",
  "financeJournalSearch",
  "secSearch",
  "economicsSearch",
  "patentSearch",
  "polymarketSearch",
] as const;

type SearchToolName = typeof SEARCH_TOOL_NAMES[number];

// Helper to check if a part is a search tool (handles both live and saved formats)
function isSearchToolPart(p: any): boolean {
  const liveToolType = p.type?.replace("tool-", "");
  return (
    SEARCH_TOOL_NAMES.includes(liveToolType as SearchToolName) ||
    (p.type === "tool-result" && SEARCH_TOOL_NAMES.includes(p.toolName as SearchToolName))
  );
}

// Helper to get tool type for citation categorization
function getSearchToolType(p: any): "financial" | "wiley" | "web" {
  const toolName = p.type?.replace("tool-", "") || p.toolName;

  if (["financeSearch", "secSearch", "economicsSearch", "patentSearch", "polymarketSearch"].includes(toolName)) {
    return "financial";
  }
  if (toolName === "financeJournalSearch") {
    return "wiley";
  }
  return "web";
}

// Helper to extract common tool state from a part
function getToolState(part: any): {
  callId: string;
  isStreaming: boolean;
  hasResults: boolean;
  hasOutput: boolean;
  hasError: boolean;
} {
  // Check if output has actual results - if so, not an error even if error field exists
  const hasActualResults = part.output?.results?.length > 0;
  const isErrorState = part.state === "output-error";
  // Only treat as error if: explicit error state OR (error field is truthy AND no results)
  const hasError = isErrorState || (part.output?.error && !hasActualResults);

  return {
    callId: part.toolCallId,
    isStreaming: part.state === "input-streaming" || part.state === "input-available",
    hasResults: part.state === "output-available",
    hasOutput: part.state === "output-available",
    hasError,
  };
}

// Configuration for all search tools with icons and styling
const SEARCH_TOOL_CONFIG: Record<string, {
  title: string;
  errorTitle: string;
  resultType: "financial" | "web" | "wiley";
  icon: React.ReactNode;
}> = {
  "tool-financeSearch": {
    title: "Financial Search",
    errorTitle: "Financial Search Error",
    resultType: "financial",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
  },
  "tool-secSearch": {
    title: "SEC Filings",
    errorTitle: "SEC Search Error",
    resultType: "financial",
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  "tool-economicsSearch": {
    title: "Economics Data",
    errorTitle: "Economics Search Error",
    resultType: "financial",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
  },
  "tool-patentSearch": {
    title: "Patent Search",
    errorTitle: "Patent Search Error",
    resultType: "financial",
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  "tool-polymarketSearch": {
    title: "Prediction Markets",
    errorTitle: "Prediction Markets Error",
    resultType: "financial",
    icon: <Globe className="w-3.5 h-3.5" />,
  },
  "tool-webSearch": {
    title: "Web Search",
    errorTitle: "Web Search Error",
    resultType: "web",
    icon: <Globe className="w-3.5 h-3.5" />,
  },
  "tool-financeJournalSearch": {
    title: "Academic Journals",
    errorTitle: "Journal Search Error",
    resultType: "wiley",
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
};

// Unified Search Tool Display Component - Claude-style minimal design
const SearchToolDisplay = memo(({
  toolType,
  part,
  messageId,
  index,
  expandedTools,
  toggleToolExpansion,
}: {
  toolType: string;
  part: any;
  messageId: string;
  index: number;
  expandedTools: Set<string>;
  toggleToolExpansion: (id: string) => void;
}) => {
  const config = SEARCH_TOOL_CONFIG[toolType];
  if (!config) return null;

  const { callId, isStreaming, hasResults, hasError } = getToolState(part);
  const results = hasResults ? extractSearchResults(part.output) : [];
  const query = part.input?.query || "";
  const stepId = `step-search-${messageId}-${index}`;
  const isExpanded = expandedTools.has(stepId);

  if (hasError) {
    return (
      <div key={callId}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full border border-destructive/40 flex items-center justify-center mt-0.5">
            <AlertCircle className="w-3 h-3 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-destructive">{config.errorTitle}</span>
            <p className="text-sm text-muted-foreground mt-0.5">{part.errorText || "An error occurred"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={callId}>
      {/* Header row with icon, query and results count */}
      <div
        className="flex items-start gap-3 cursor-pointer group"
        onClick={() => toggleToolExpansion(stepId)}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-5 h-5 mt-0.5">
          {isStreaming ? (
            <div className="w-5 h-5 rounded-full border border-muted-foreground/30 flex items-center justify-center">
              <Search className="w-3 h-3 text-muted-foreground animate-pulse" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border border-muted-foreground/30 flex items-center justify-center">
              <Search className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Query text */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-muted-foreground">{query}</span>
        </div>

        {/* Results count */}
        <div className="flex-shrink-0 text-sm text-muted-foreground">
          {isStreaming ? (
            <span className="text-muted-foreground/60">searching...</span>
          ) : (
            <span>{results.length} results</span>
          )}
        </div>
      </div>

      {/* Inline results preview - always show top 5 when complete */}
      {!isStreaming && results.length > 0 && (
        <div className="mt-2 ml-2 flex items-start gap-1">
          <CornerDownRight className="w-4 h-4 text-muted-foreground/50 mt-1 flex-shrink-0" />
          <div className="flex-1 space-y-0">
          <div
            className="rounded-lg border border-border overflow-hidden cursor-pointer"
            onClick={() => toggleToolExpansion(stepId)}
          >
            {results.slice(0, 5).map((result: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors ${
                  idx !== 0 ? 'border-t border-border' : ''
                }`}
              >
                {/* Favicon */}
                <div className="flex-shrink-0 w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                  <Favicon url={result.url} size={14} className="w-3.5 h-3.5" />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground line-clamp-1">{result.title}</span>
                </div>

                {/* Domain */}
                <div className="flex-shrink-0 text-sm text-muted-foreground">
                  {(() => {
                    try {
                      const url = new URL(result.url);
                      return url.hostname.replace("www.", "");
                    } catch {
                      return result.source || "";
                    }
                  })()}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {/* Expanded carousel for full details */}
      {isExpanded && hasResults && results.length > 0 && (
        <div className="mt-3 ml-8 animate-in fade-in slide-in-from-top-2 duration-200">
          <SearchResultsCarousel results={results} type={config.resultType} />
        </div>
      )}
    </div>
  );
});
SearchToolDisplay.displayName = 'SearchToolDisplay';

// Search Result Card Component
const SearchResultCard = ({
  result,
  type,
}: {
  result: any;
  type: "financial" | "web" | "wiley";
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calculate content size to determine if we need virtualization
  const contentSize = useMemo(() => {
    const content =
      typeof result.fullContent === "string"
        ? result.fullContent
        : JSON.stringify(result.fullContent || {}, null, 2);
    return new Blob([content]).size;
  }, [result.fullContent]);

  // Use virtualized dialog for content larger than 500KB
  const useVirtualized = contentSize > 100 * 1024;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
    }
  };

  // If using virtualized dialog, render it separately
  if (useVirtualized) {
    const content =
      typeof result.fullContent === "string"
        ? result.fullContent
        : JSON.stringify(result.fullContent || {}, null, 2);

    return (
      <>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0 py-2"
          onClick={() => setIsDialogOpen(true)}
        >
          <CardContent className="h-full p-3">
            <div className="flex gap-2.5 h-full">
              {/* Favicon on left */}
              <div className="flex-shrink-0 pt-0.5">
                {type === "wiley" ? (
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src="/wy.svg"
                      alt="Wiley"
                      className="w-3.5 h-3.5 dark:invert opacity-80"
                    />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <Favicon
                      url={result.url}
                      size={12}
                      className="w-3 h-3"
                    />
                  </div>
                )}
              </div>

              {/* Content on right */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* Title and external link */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>

                {/* Markdown preview with separator */}
                <div className="flex flex-col gap-1">
                  <div className="h-px bg-border" />
                  <div className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {result.summary?.slice(0, 120) || ''}
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      (result.isStructured || result.contentIsJson)
                        ? "bg-primary/10 text-primary"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {(result.isStructured || result.contentIsJson) ? "JSON" : "text"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {(() => {
                      try {
                        const url = new URL(result.url);
                        return url.hostname.replace("www.", "");
                      } catch {
                        return result.source || "unknown";
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <VirtualizedContentDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title={result.title}
          content={content}
          isJson={result.isStructured || result.contentIsJson || isJsonContent(result.fullContent)}
        />
      </>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0 py-2">
          <CardContent className="h-full p-3">
            <div className="flex gap-2.5 h-full">
              {/* Favicon on left */}
              <div className="flex-shrink-0 pt-0.5">
                {type === "wiley" ? (
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src="/wy.svg"
                      alt="Wiley"
                      className="w-3.5 h-3.5 dark:invert opacity-80"
                    />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                    <Favicon
                      url={result.url}
                      size={12}
                      className="w-3 h-3"
                    />
                  </div>
                )}
              </div>

              {/* Content on right */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                {/* Title and external link */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>

                {/* Markdown preview with separator */}
                <div className="flex flex-col gap-1">
                  <div className="h-px bg-border" />
                  <div className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                    {result.summary?.slice(0, 120) || ''}
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      (result.isStructured || result.contentIsJson)
                        ? "bg-primary/10 text-primary"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {(result.isStructured || result.contentIsJson) ? "JSON" : "text"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {(() => {
                      try {
                        const urlObj = new URL(result.url);
                        return urlObj.hostname.replace(/^www\./, "");
                      } catch {
                        return result.url;
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="!max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className=" pr-8">{result.title}</DialogTitle>
          <Separator />
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* <span>{result.source}</span> */}
              {result.date && <span>• {result.date}</span>}
              {result.relevanceScore && (
                <span className="text-xs bg-muted px-2 py-1 rounded">
                  {(result.relevanceScore * 100).toFixed(0)}% relevance
                </span>
              )}
              {type === "wiley" && result.doi && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  DOI: {result.doi}
                </span>
              )}
            </div>

            {type === "wiley" && (result.authors || result.citation) && (
              <div className="space-y-1">
                {result.authors && result.authors.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Authors:</span> {result.authors.join(", ")}
                  </div>
                )}
                {result.citation && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted p-1 rounded">
                    {result.citation}
                  </div>
                )}
              </div>
            )}

            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
              >
                <Favicon
                  url={result.url}
                  size={16}
                  className="w-3.5 h-3.5"
                />
                <ExternalLink className="h-3 w-3" />
                View Source
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {(result.isStructured || result.contentIsJson || isJsonContent(result.fullContent)) ? (
            // JSON/Structured data - show with formatted JSON viewer
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Code2 className="h-4 w-4" />
                  Structured Data
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    JSON
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const jsonData =
                      typeof result.fullContent === "object"
                        ? JSON.stringify(result.fullContent, null, 2)
                        : result.fullContent;
                    copyToClipboard(jsonData);
                  }}
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  Copy JSON
                </Button>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg overflow-hidden">
                <JsonView
                  value={(() => {
                    try {
                      return typeof result.fullContent === "object"
                        ? result.fullContent
                        : JSON.parse(result.fullContent || "{}");
                    } catch {
                      return {
                        error: "Invalid JSON data",
                        raw: result.fullContent,
                      };
                    }
                  })()}
                  displayDataTypes={false}
                  displayObjectSize={false}
                  enableClipboard={false}
                  collapsed={2}
                  style={
                    {
                      "--w-rjv-font-family":
                        'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      "--w-rjv-font-size": "13px",
                      "--w-rjv-line-height": "1.4",
                      "--w-rjv-color-string": "rgb(34, 197, 94)",
                      "--w-rjv-color-number": "rgb(239, 68, 68)",
                      "--w-rjv-color-boolean": "rgb(168, 85, 247)",
                      "--w-rjv-color-null": "rgb(107, 114, 128)",
                      "--w-rjv-color-undefined": "rgb(107, 114, 128)",
                      "--w-rjv-color-key": "rgb(30, 41, 59)",
                      "--w-rjv-background-color": "transparent",
                      "--w-rjv-border-left": "1px solid rgb(229, 231, 235)",
                      "--w-rjv-padding": "16px",
                      "--w-rjv-hover-color": "rgb(243, 244, 246)",
                    } as React.CSSProperties
                  }
                  className="dark:[--w-rjv-color-string:rgb(34,197,94)] dark:[--w-rjv-color-number:rgb(248,113,113)] dark:[--w-rjv-color-boolean:rgb(196,181,253)] dark:[--w-rjv-color-key:rgb(248,250,252)] dark:[--w-rjv-border-left:1px_solid_rgb(75,85,99)] dark:[--w-rjv-hover-color:rgb(55,65,81)]"
                />
              </div>
            </div>
          ) : (
            // Text/Unstructured data - show as markdown
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4" />
                Content
                <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                  Text
                </span>
                {result.length && (
                  <span className="text-xs text-muted-foreground">
                    {result.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <MemoizedMarkdown
                  text={
                    typeof result.fullContent === "string"
                      ? result.fullContent
                      : typeof result.fullContent === "number"
                      ? `$${result.fullContent.toFixed(2)}`
                      : String(result.fullContent || "No content available")
                  }
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Search Results Carousel Component
const SearchResultsCarousel = ({
  results,
  type,
}: {
  results: any[];
  type: "financial" | "web" | "wiley";
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const imagesScrollRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);

  // Extract all images from results
  const allImages: { url: string; title: string; sourceUrl: string }[] = [];
  const firstImages: { url: string; title: string; sourceUrl: string }[] = [];

  results.forEach((result) => {
    let firstImageAdded = false;
    if (result.imageUrls && typeof result.imageUrls === "object") {
      Object.values(result.imageUrls).forEach((imageUrl: any) => {
        if (typeof imageUrl === "string" && imageUrl.trim()) {
          const imageData = {
            url: imageUrl,
            title: result.title,
            sourceUrl: result.url,
          };
          allImages.push(imageData);

          // Add only the first image per result to firstImages
          if (!firstImageAdded) {
            firstImages.push(imageData);
            firstImageAdded = true;
          }
        }
      });
    }
  });

  const handleImageClick = (idx: number) => {
    setSelectedIndex(idx);
    setDialogOpen(true);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIndex(
      (prev) => (prev - 1 + allImages.length) % allImages.length
    );
  };
  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIndex((prev) => (prev + 1) % allImages.length);
  };

  useEffect(() => {
    if (!dialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape") setDialogOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen, allImages.length, handleNext, handlePrev]);

  if (results.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No results found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Results Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide py-1 sm:py-2 px-1 sm:px-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {results.map((result) => (
            <SearchResultCard key={result.id} result={result} type={type} />
          ))}
        </div>
      </div>

      {/* Images Carousel - Only show if there are images */}
      {allImages.length > 0 && (
        <div className="relative">
          <div className="text-sm font-medium text-foreground mb-2 px-2">
            Related Images
          </div>
          <div
            ref={imagesScrollRef}
            className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide py-1 sm:py-2 px-1 sm:px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {(showAllImages ? allImages : firstImages).map((image, index) => (
              <div
                key={index}
                className="flex-shrink-0 cursor-pointer group"
                onClick={() => {
                  // When clicking an image, use the correct index from allImages
                  const realIndex = allImages.findIndex((img) => img === image);
                  handleImageClick(realIndex);
                }}
              >
                <div className="relative overflow-hidden rounded-lg border border-border hover:border-muted-foreground/30 transition-all">
                  <Image
                    src={image.url}
                    width={200}
                    height={150}
                    alt={image.title}
                    className="h-24 sm:h-32 w-36 sm:w-48 object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs line-clamp-2">
                      {image.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Show expand/collapse button if there are more images than first images */}
            {allImages.length > firstImages.length && (
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{ minWidth: "120px" }}
              >
                <button
                  onClick={() => setShowAllImages(!showAllImages)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  {showAllImages ? (
                    <>Show less</>
                  ) : (
                    <>+{allImages.length - firstImages.length} more</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Dialog for image carousel */}
          {dialogOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setDialogOpen(false)}
            >
              <div
                className="relative max-w-3xl w-full flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-2 right-2 text-white bg-black/60 rounded-full p-2 hover:bg-black/80 z-10"
                  onClick={() => setDialogOpen(false)}
                  aria-label="Close"
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="flex items-center justify-center w-full h-[60vh]">
                  <button
                    className="text-white bg-black/40 hover:bg-black/70 rounded-full p-2 absolute left-2 top-1/2 -translate-y-1/2 z-10"
                    onClick={handlePrev}
                    aria-label="Previous"
                  >
                    <svg
                      width="32"
                      height="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <Image
                    src={allImages[selectedIndex].url}
                    alt={allImages[selectedIndex].title}
                    width={800}
                    height={600}
                    className="max-h-[60vh] max-w-full rounded-lg shadow-lg mx-8"
                  />
                  <button
                    className="text-white bg-black/40 hover:bg-black/70 rounded-full p-2 absolute right-2 top-1/2 -translate-y-1/2 z-10"
                    onClick={handleNext}
                    aria-label="Next"
                  >
                    <svg
                      width="32"
                      height="32"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-4 text-center">
                  <div className="text-lg font-medium text-white mb-2 line-clamp-2">
                    {allImages[selectedIndex].title}
                  </div>
                  <a
                    href={allImages[selectedIndex].sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/70 underline hover:text-primary text-sm"
                  >
                    View Source
                  </a>
                  <div className="text-xs text-white/60 mt-2">
                    {selectedIndex + 1} / {allImages.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function ChatInterface({
  sessionId,
  onMessagesChange,
  onSessionCreated,
  onNewChat,
}: {
  sessionId?: string;
  onMessagesChange?: (hasMessages: boolean) => void;
  onSessionCreated?: (sessionId: string) => void;
  onNewChat?: () => void;
}) {
  const [input, setInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const userHasInteracted = useRef(false);

  const [isFormAtBottom, setIsFormAtBottom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queryStartTime, setQueryStartTime] = useState<number | null>(null);
  const [modelCompatibilityError, setModelCompatibilityError] = useState<{
    message: string;
    compatibilityIssue: string;
  } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [liveProcessingTime, setLiveProcessingTime] = useState<number>(0);

  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Check if we're in self-hosted mode (no auth required)
  const isSelfHosted = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';

  const { selectedModel, selectedProvider } = useLocalProvider();
  const user = useAuthStore((state) => state.user);

  // Auth modal state for paywalls
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Signup prompt for non-authenticated users
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  // Listen for global auth modal trigger (from sidebar, etc.)
  useEffect(() => {
    const handleShowAuthModal = () => setShowAuthModal(true);
    window.addEventListener('show-auth-modal', handleShowAuthModal);
    return () => window.removeEventListener('show-auth-modal', handleShowAuthModal);
  }, []);

  // Session management functions
  const generateSessionTitle = useCallback((firstMessage: string): string => {
    // Create a smart title from the first user message
    const cleaned = firstMessage.trim();
    
    // Financial keywords to prioritize in titles
    const financialKeywords = [
      'stock', 'stocks', 'share', 'shares', 'equity', 'portfolio', 'investment', 'invest',
      'market', 'trading', 'trader', 'dividend', 'earnings', 'revenue', 'profit', 'loss',
      'crypto', 'bitcoin', 'ethereum', 'cryptocurrency', 'finance', 'financial', 'analysis',
      'valuation', 'dcf', 'ratio', 'ratios', 'balance sheet', 'income statement', 'cash flow',
      'ipo', 'merger', 'acquisition', 'bonds', 'yield', 'interest', 'rate', 'fed', 'inflation',
      'gdp', 'recession', 'bull', 'bear', 'volatility', 'risk', 'return'
    ];
    
    // Company/ticker patterns
    const tickerPattern = /\b[A-Z]{1,5}\b/g;
    const dollarPattern = /\$[A-Z]{1,5}\b/g;
    
    // Extract potential tickers or companies mentioned
    const tickers = [...(cleaned.match(tickerPattern) || []), ...(cleaned.match(dollarPattern) || [])];
    
    if (cleaned.length <= 50) {
      return cleaned;
    }
    
    // Try to find a sentence with financial context
    const sentences = cleaned.split(/[.!?]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 10 && trimmed.length <= 50) {
        // Check if this sentence contains financial keywords or tickers
        const hasFinancialContext = financialKeywords.some(keyword => 
          trimmed.toLowerCase().includes(keyword.toLowerCase())
        ) || tickers.some(ticker => trimmed.includes(ticker));
        
        if (hasFinancialContext) {
          return trimmed;
        }
      }
    }
    
    // If we have tickers, try to create a title around them
    if (tickers.length > 0) {
      const firstTicker = tickers[0];
      const tickerIndex = cleaned.indexOf(firstTicker);
      
      // Try to get context around the ticker
      const start = Math.max(0, tickerIndex - 20);
      const end = Math.min(cleaned.length, tickerIndex + firstTicker.length + 20);
      const context = cleaned.substring(start, end);
      
      if (context.length <= 50) {
        return context.trim();
      }
    }
    
    // Fall back to smart truncation
    const truncated = cleaned.substring(0, 47);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastPeriod = truncated.lastIndexOf('.');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const breakPoint = Math.max(lastSpace, lastPeriod, lastQuestion);
    const title = breakPoint > 20 ? truncated.substring(0, breakPoint) : truncated;
    
    return title + (title.endsWith('.') || title.endsWith('?') ? '' : '...');
  }, []);

  const createSession = useCallback(async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use fast fallback title initially
      const quickTitle = generateSessionTitle(firstMessage);
      
      // Create session immediately with fallback title
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ title: quickTitle })
      });

      if (response.ok) {
        const { session: newSession } = await response.json();
        
        // Generate better AI title in background (don't wait)
        const titleHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        };

        // Add Ollama preference header if in self-hosted mode
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted') {
          const ollamaEnabled = localStorage.getItem('ollama-enabled');
          if (ollamaEnabled !== null) {
            titleHeaders['x-ollama-enabled'] = ollamaEnabled;
          }
        }

        fetch('/api/chat/generate-title', {
          method: 'POST',
          headers: titleHeaders,
          body: JSON.stringify({ message: firstMessage })
        }).then(async (titleResponse) => {
          if (titleResponse.ok) {
            const { title: aiTitle } = await titleResponse.json();
            // Update session title in background
            await fetch(`/api/chat/sessions/${newSession.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({ title: aiTitle })
            });
          }
        }).catch(() => {
        });
        
        return newSession.id;
      }
    } catch (error) {
    }
    return null;
  }, [user, generateSessionTitle]);

  const getValidValyuAccessToken = useAuthStore((state) => state.getValidValyuAccessToken);

  const transport = useMemo(() =>
    new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages }) => {
        const headers: Record<string, string> = {};
        if (selectedModel) {
          headers['x-ollama-model'] = selectedModel;
        }

        // Check if local provider is enabled in localStorage (only in self-hosted mode)
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted') {
          const localEnabled = localStorage.getItem('ollama-enabled');
          if (localEnabled !== null) {
            headers['x-ollama-enabled'] = localEnabled;
          }
          // Add selected provider
          if (selectedProvider) {
            headers['x-local-provider'] = selectedProvider;
          }
        }

        if (user) {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
        }

        // Get Valyu access token for API proxy calls (auto-refreshes if expired)
        const valyuAccessToken = await getValidValyuAccessToken();

        return {
          body: {
            messages,
            sessionId: sessionIdRef.current,
            valyuAccessToken, // Pass Valyu token for API proxy
          },
          headers,
        };
      }
    }), [selectedModel, selectedProvider, user, getValidValyuAccessToken]
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    regenerate,
    setMessages,
    addToolResult,
  } = useChat<FinanceUIMessage>({
    transport,
    // Automatically submit when all tool results are available
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      // Chat completed successfully
    },
    onError: (error: Error) => {
      console.error('[Chat Interface] Error:', error);

      // Check if this is a model compatibility error
      if (error.message.includes('MODEL_COMPATIBILITY_ERROR')) {
        try {
          // Parse the error details from the message
          const errorData = JSON.parse(error.message.replace(/^Error: /, ''));
          if (errorData.error === 'MODEL_COMPATIBILITY_ERROR') {
            setModelCompatibilityError({
              message: errorData.message,
              compatibilityIssue: errorData.compatibilityIssue
            });
          }
        } catch (e) {
          console.error('Failed to parse compatibility error:', e);
        }
      }
    },
  });


  // Session loading function - defined after useChat to access setMessages
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!user) return;
    
    setIsLoadingSession(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const { messages: sessionMessages } = await response.json();
        
        // Convert session messages to the format expected by useChat
        const convertedMessages = sessionMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts,
          toolCalls: msg.toolCalls,
          createdAt: msg.createdAt,
          processing_time_ms: msg.processing_time_ms
        }));
        
        // Set messages in the chat
        setMessages(convertedMessages);
        sessionIdRef.current = sessionId;
        setCurrentSessionId(sessionId);
        
        // Move form to bottom when loading a session with messages
        if (convertedMessages.length > 0) {
          setIsFormAtBottom(true);
        }
        
        // Scroll to bottom after loading messages
        setTimeout(() => {
          const c = messagesContainerRef.current;
          if (c) {
            c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
          }
          // Also try the messagesEndRef as backup
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, 500);
      }
    } catch (error) {
    } finally {
      setIsLoadingSession(false);
    }
  }, [user, setMessages]);

  // Handle stop with error catching to prevent AbortError
  const handleStop = useCallback(() => {
    try {
      // Just call stop, the SDK should handle if there's nothing to stop
      stop();
    } catch (error) {
      // Silently ignore AbortError - this is expected behavior
      // The error occurs when stop() is called but there's no active stream
    }
  }, [stop]);

  // Initialize and handle sessionId prop changes
  useEffect(() => {
    if (sessionId !== currentSessionId) {
      if (sessionId) {
        // Update ref and load messages when sessionId prop has a value
        sessionIdRef.current = sessionId;
        loadSessionMessages(sessionId);
      } else if (!sessionIdRef.current) {
        // Only clear if we don't have a locally-created session
        // (if sessionIdRef has a value, it means handleSubmit just created a session
        // but the prop hasn't updated yet - don't clear in this case!)

        // Don't call stop() here - it causes AbortErrors
        // The SDK will handle cleanup when we clear messages

        // Clear everything for fresh start
        setCurrentSessionId(undefined);
        setMessages([]);
        setInput(''); // Clear input field
        setIsFormAtBottom(false); // Reset form position for new chat
        setEditingMessageId(null); // Clear any editing state
        setEditingText('');

        // Call parent's new chat handler if provided
        onNewChat?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]); // Only sessionId prop dependency - internal state changes should not retrigger this

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || // 768px is the sm breakpoint in Tailwind
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      // On mobile, always keep form at bottom
      if (isMobileDevice) {
        setIsFormAtBottom(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // Empty dependency array - only run on mount

  // Handle auth errors - show sign in prompt if AUTH_REQUIRED
  useEffect(() => {
    if (error) {
      // Check if it's an auth required error
      if (error.message && error.message.includes('AUTH_REQUIRED')) {
        setShowSignupPrompt(true);
      }
    }
  }, [error]);

  // Notify parent component about message state changes
  useEffect(() => {
    onMessagesChange?.(messages.length > 0);
  }, [messages.length]); // Remove onMessagesChange from dependencies to prevent infinite loops


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [anchorInView, setAnchorInView] = useState<boolean>(true);
  const [isAtBottomState, setIsAtBottomState] = useState<boolean>(true);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks whether we should stick to bottom (true when user is at bottom)
  const shouldStickToBottomRef = useRef<boolean>(true);
  // Defer messages to keep input responsive during streaming
  const deferredMessages = useDeferredValue(messages);
  // Lightweight virtualization for long threads
  const virtualizationEnabled = deferredMessages.length > 60;
  const [avgRowHeight, setAvgRowHeight] = useState<number>(140);
  const [visibleRange, setVisibleRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 30 });
  const overscan = 8;
  // Use ref to track visible range and avoid infinite loop (critical fix for tab switching)
  const visibleRangeRef = useRef(visibleRange);
  useEffect(() => {
    visibleRangeRef.current = visibleRange;
  }, [visibleRange]);

  const updateVisibleRange = useCallback(() => {
    if (!virtualizationEnabled) return;
    const c = messagesContainerRef.current;
    if (!c) return;
    const minRow = 60;
    const rowH = Math.max(minRow, avgRowHeight);
    const containerH = c.clientHeight || 0;
    const start = Math.max(0, Math.floor(c.scrollTop / rowH) - overscan);
    const count = Math.ceil(containerH / rowH) + overscan * 2;
    const end = Math.min(deferredMessages.length, start + count);
    // Use ref to compare instead of state - prevents infinite loop
    if (start !== visibleRangeRef.current.start || end !== visibleRangeRef.current.end) {
      setVisibleRange({ start, end });
    }
  }, [
    virtualizationEnabled,
    avgRowHeight,
    overscan,
    deferredMessages.length,
    // Removed visibleRange.start and visibleRange.end - this was causing infinite loop
  ]);
  useEffect(() => {
    if (virtualizationEnabled) {
      setVisibleRange({ start: 0, end: Math.min(deferredMessages.length, 30) });
      requestAnimationFrame(updateVisibleRange);
    }
    // Removed updateVisibleRange from dependencies - prevents infinite loop
  }, [virtualizationEnabled, deferredMessages.length]);
  useEffect(() => {
    const onResize = () => updateVisibleRange();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - updateVisibleRange is stable now

  // Helper: detect if messages container scrolls or if page scroll is used
  const isContainerScrollable = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    return container.scrollHeight > container.clientHeight + 2;
  };

  // Load query from URL params on initial load (but not when starting new chat or submitting)
  useEffect(() => {
    if (isStartingNewChat) {
      setIsStartingNewChat(false);
      return;
    }

    // Skip URL sync when actively submitting to prevent race condition
    if (isSubmitting) {
      return;
    }

    const queryParam = searchParams.get("q");
    if (queryParam && messages.length === 0) {
      let decodedQuery = queryParam;
      try {
        decodedQuery = decodeURIComponent(queryParam);
      } catch (e) {
        // fallback: use raw queryParam
      }
      setInput(decodedQuery);
    } else if (!queryParam && messages.length === 0) {
      // Clear input if no query param and no messages (fresh start)
      setInput("");
    }
  }, [searchParams, messages.length, isStartingNewChat, isSubmitting]);

  // Clear submitting flag when message is added
  useEffect(() => {
    if (isSubmitting && messages.length > 0) {
      setIsSubmitting(false);
    }
  }, [messages.length, isSubmitting]);

  // Reset form position when all messages are cleared (except on mobile)
  useEffect(() => {
    if (messages.length === 0 && !isMobile) {
      setIsFormAtBottom(false);
    }
  }, [messages.length, isMobile]);

  // Live processing time tracker
  useEffect(() => {
    const isLoading = status === "submitted" || status === "streaming";

    if (isLoading && !queryStartTime) {
      // Start tracking when query begins
      setQueryStartTime(Date.now());
    } else if (!isLoading && queryStartTime) {
      // Capture final time before stopping
      const finalTime = Date.now() - queryStartTime;
      setLiveProcessingTime(finalTime);
      setQueryStartTime(null);

    }

    if (isLoading && queryStartTime) {
      // Update live timer every 100ms
      const interval = setInterval(() => {
        setLiveProcessingTime(Date.now() - queryStartTime);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [status, queryStartTime]);

  // Check if user is at bottom of scroll (container only)
  // Wrap in useCallback to prevent re-renders (doc line 1386)
  const isAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    const threshold = 5;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= threshold;
    return atBottom;
  }, []);

  // Auto-scroll ONLY if already at bottom when new content arrives
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // ONLY auto-scroll if sticky is enabled AND streaming/submitted
    const isLoading = status === "submitted" || status === "streaming";
    if (isLoading && shouldStickToBottomRef.current) {
      // Small delay to let content render
      requestAnimationFrame(() => {
        const c = messagesContainerRef.current;
        if (c && c.scrollHeight > c.clientHeight + 1) {
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        } else {
          const doc = document.scrollingElement || document.documentElement;
          const targetTop = doc.scrollHeight;
          window.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      });
    } else {
    }
  }, [messages, status, isAtBottomState, anchorInView]);

  // Handle scroll events to track position and show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const atBottom = isAtBottom();
      setIsAtBottomState(atBottom);
      // Disable sticky when not at bottom; re-enable when at bottom
      shouldStickToBottomRef.current = atBottom;
      userHasInteracted.current = !atBottom;
      updateVisibleRange();
    };

    const handleWindowScroll = () => {};

    // Handle wheel events to immediately detect scroll intent
    const handleWheel = (e: WheelEvent) => {
      // If scrolling up, immediately disable auto-scroll
      if (e.deltaY < 0) {
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      } else if (e.deltaY > 0) {
        // Check if we're at bottom after scrolling down
        setTimeout(() => {
          const atBottom = isAtBottom();
          if (atBottom) {
            userHasInteracted.current = false; // Reset if back at bottom
            shouldStickToBottomRef.current = true;
          }
        }, 50);
      }
    };

    // Also handle touch events for mobile
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      if (deltaY > 10) {
        // Scrolling up
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      }
    };

    // Add all event listeners
    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    // No window scroll listener needed when using container scrolling only

    // Also add to document level to catch all scroll attempts
    const handleGlobalWheel = (e: WheelEvent) => {
      const inContainer = container.contains(e.target as Node);
      if (inContainer) {
        if (e.deltaY < 0) {
          userHasInteracted.current = true;
          shouldStickToBottomRef.current = false;
        }
        return;
      }
    };

    document.addEventListener("wheel", handleGlobalWheel, { passive: true });

    // Force sticky autoscroll by default
    setIsAtBottomState(true);
    shouldStickToBottomRef.current = true;
    userHasInteracted.current = false;

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("wheel", handleGlobalWheel);
      // No window scroll listener to remove
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - prevent infinite loop on tab switch

  // Observe bottom anchor visibility relative to the scroll container
  useEffect(() => {
    const container = messagesContainerRef.current;
    const anchor = bottomAnchorRef.current;
    if (!container || !anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => setAnchorInView(entry.isIntersecting),
      { root: container, threshold: 1.0 }
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  // Scroll to bottom when user submits a message
  useEffect(() => {
    if (status === "submitted") {
      userHasInteracted.current = false; // Reset interaction flag for new message
      shouldStickToBottomRef.current = true; // Re-enable stickiness on new message
      // Always scroll to bottom when user sends a message
      setTimeout(() => {
        const c = messagesContainerRef.current;
        if (c) {
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        }
      }, 100);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent, skipSignupPrompt = false) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      // Store the input to send
      const queryText = input.trim();

      // In valyu mode, require Valyu sign-in to submit prompts
      if (!isSelfHosted && !user && !skipSignupPrompt) {
        setShowAuthModal(true);
        return; // Don't send message yet - require sign in
      }

      // Set submitting flag to prevent URL sync race condition
      setIsSubmitting(true);

      // Clear input immediately before sending to prevent any display lag
      setInput("");

      // Track user query submission
      track('User Query Submitted', {
        query: queryText,
        queryLength: queryText.length,
        messageCount: messages.length,
      });

      updateUrlWithQuery(queryText);
      // Move form to bottom when submitting (always true on mobile, conditional on desktop)
      if (!isFormAtBottom) {
        setIsFormAtBottom(true);
      }

      // Create session BEFORE sending message for proper usage tracking
      if (user && !currentSessionId && messages.length === 0) {
        try {
          const newSessionId = await createSession(queryText);
          if (newSessionId) {
            sessionIdRef.current = newSessionId;
            setCurrentSessionId(newSessionId);
            onSessionCreated?.(newSessionId);
          }
        } catch (error) {
          // Continue with message sending even if session creation fails
        }
      }

      // Send message with sessionId available for usage tracking
      sendMessage({ text: queryText });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setInput(newValue);

    // Debounce URL updates to avoid excessive history changes
    if (newValue.trim()) {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current);
      }
      urlUpdateTimeoutRef.current = setTimeout(() => {
        updateUrlWithQuery(newValue);
      }, 500);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter((message) => message.id !== messageId));
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message && message.parts[0]?.type === "text") {
      setEditingMessageId(messageId);
      setEditingText(message.parts[0].text);
    }
  };

  const handleSaveEdit = (messageId: string) => {
    setMessages(
      messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              parts: [{ type: "text" as const, text: editingText }],
            }
          : message
      )
    );
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  // Wrap in useCallback to prevent re-renders (doc line 625)
  const toggleToolExpansion = useCallback((toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  }, []);

  const toggleChartExpansion = useCallback((toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      const collapsedKey = `collapsed-${toolId}`;
      if (newSet.has(collapsedKey)) {
        newSet.delete(collapsedKey);
      } else {
        newSet.add(collapsedKey);
      }
      return newSet;
    });
  }, []);

  // Wrap in useCallback to prevent re-renders (doc line 619)
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if desired
    } catch (err) {
    }
  }, []);

  // Track PDF download state
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  // Download professional PDF report with charts and citations
  const handleDownloadPDF = useCallback(async () => {
    if (!sessionIdRef.current) {
      return;
    }

    // Track PDF download
    track('PDF Download Started', {
      sessionId: sessionIdRef.current,
      messageCount: messages.length
    });

    setIsDownloadingPDF(true);

    try {

      // Call server-side PDF generation API
      const response = await fetch('/api/reports/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }

      // Get PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `report-${Date.now()}.pdf`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);


      track('PDF Downloaded', {
        sessionId: sessionIdRef.current,
        messageCount: messages.length,
      });
    } catch (err) {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloadingPDF(false);
    }
  }, [messages]);

  const updateUrlWithQuery = (query: string) => {
    if (query.trim()) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      // Preserve chatId if it exists
      if (sessionIdRef.current) {
        url.searchParams.set('chatId', sessionIdRef.current);
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const setInputAndUpdateUrl = (query: string) => {
    setInput(query);
    updateUrlWithQuery(query);
  };

  const handlePromptClick = (query: string) => {
    // Clear input first for animation effect
    setInput("");
    updateUrlWithQuery(query);
    setIsStartingNewChat(false); // Reset flag since we're setting new content

    // Animate text appearing character by character
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= query.length) {
        setInput(query.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 4); // Adjust speed here (lower = faster)
  };

  const getMessageText = (message: FinanceUIMessage) => {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  };

  // Removed startNewChat function - using parent's handleNewChat via URL management

  const isLoading = status === "submitted" || status === "streaming";
  const canStop = status === "submitted" || status === "streaming";
  const canRegenerate =
    (status === "ready" || status === "error") && messages.length > 0;

  // Calculate cumulative metrics from all assistant messages
  const cumulativeMetrics = useMemo(() => {
    let totalMetrics: MessageMetrics = {
      sourcesAnalyzed: 0,
      wordsProcessed: 0,
      timeSavedMinutes: 0,
      moneySaved: 0,
      processingTimeMs: 0,
      breakdown: {
        sourceReadingMinutes: 0,
        sourceFindingMinutes: 0,
        writingMinutes: 0,
        csvCreationMinutes: 0,
        chartCreationMinutes: 0,
        analysisMinutes: 0,
        dataProcessingMinutes: 0,
      },
    };

    messages.filter(m => m.role === 'assistant').forEach(message => {
      // Extract message parts from different possible formats
      let messageParts: any[] = [];

      if (Array.isArray((message as any).content)) {
        messageParts = (message as any).content;
      } else if ((message as any).parts) {
        messageParts = (message as any).parts;
      }

      const messageMetrics = calculateMessageMetrics(messageParts);

      // Accumulate metrics
      totalMetrics.sourcesAnalyzed += messageMetrics.sourcesAnalyzed;
      totalMetrics.wordsProcessed += messageMetrics.wordsProcessed;
      totalMetrics.timeSavedMinutes += messageMetrics.timeSavedMinutes;
      totalMetrics.moneySaved += messageMetrics.moneySaved;

      // Accumulate processing time from message metadata
      if ((message as any).processing_time_ms || (message as any).processingTimeMs) {
        const msgProcessingTime = (message as any).processing_time_ms || (message as any).processingTimeMs || 0;
        totalMetrics.processingTimeMs += msgProcessingTime;
      }

      // Accumulate breakdown
      Object.keys(messageMetrics.breakdown).forEach((key) => {
        const breakdownKey = key as keyof typeof messageMetrics.breakdown;
        totalMetrics.breakdown[breakdownKey] += messageMetrics.breakdown[breakdownKey];
      });
    });

    // Add live processing time if currently loading
    if (liveProcessingTime > 0) {
      totalMetrics.processingTimeMs += liveProcessingTime;
    }

    return totalMetrics;
  }, [messages, liveProcessingTime]);

  return (
    <div className="w-full max-w-3xl mx-auto relative min-h-0">
      {/* Removed duplicate New Chat button - handled by parent page */}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className={`space-y-4 sm:space-y-8 min-h-[300px] overflow-y-auto overflow-x-hidden ${
          messages.length > 0 ? "pt-20 sm:pt-24" : "pt-2 sm:pt-4"
        } ${isFormAtBottom ? "pb-44 sm:pb-36" : "pb-4 sm:pb-8"}`}
      >
        {messages.length === 0 && (
          <motion.div
            className="pt-8 1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-6 sm:mb-8">
              {/* Capabilities */}
              <div className="max-w-4xl mx-auto">
                <motion.div
                  className="text-center mb-4 sm:mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Try these capabilities
                  </h3>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 px-2 sm:px-0">
                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Build a Monte Carlo simulation to predict Tesla's stock price in 6 months. Use Python to fetch historical data, calculate volatility and drift, run 10,000 simulations, and visualize the probability distribution with confidence intervals."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-muted-foreground/30 transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      🐍 ML Models
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Advanced Python modeling & simulations
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Analyze GameStop's latest 10-K filing. Extract key financial metrics, identify risk factors, and compare revenue streams vs last year. Show me insider trading activity and institutional ownership changes."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-muted-foreground/30 transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      📊 SEC Filings
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Deep dive into regulatory filings & insider data
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Analyze the correlation between Bitcoin price movements and major tech stocks (TSLA, COIN, NVDA) over the past year. Create a CSV with daily prices, then generate correlation matrices and time series charts showing their relationships. Include analysis of crypto market sentiment and its impact on tech valuations."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-muted-foreground/30 transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      🔗 Correlation Analysis
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Market relationships & statistical insights
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Analyze Netflix's subscriber growth and revenue metrics over the past 5 years. Pull financial data from SEC filings, create a comprehensive CSV with quarterly metrics (subscribers, ARPU, revenue, content spend), then generate charts showing: 1) Subscriber growth trends by region, 2) Revenue vs content spending, 3) Stock price correlation with subscriber announcements. Include competitive analysis vs Disney+."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-muted-foreground/30 transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      📊 Growth Metrics
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Business KPIs with trend visualizations
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Compare the top 5 tech stocks (AAPL, MSFT, GOOGL, AMZN, NVDA) over the past 5 years. Create a CSV with their annual revenue, profit margins, and P/E ratios. Then generate visualizations showing: 1) Stock price performance comparison chart, 2) Revenue growth trends, 3) Profitability metrics comparison. Provide detailed analysis of which performed best and why."
                      )
                    }
                    className="bg-muted/50 p-2.5 sm:p-4 rounded-xl border border-border hover:border-muted-foreground/30 transition-colors hover:bg-muted text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-foreground/80 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-foreground">
                      📈 Comparative Analysis
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      Multi-stock comparison with charts & data
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Do an in-depth report into the effect COVID-19 had on Pfizer. Analyze insider trades made during that time period, research those specific high-profile people involved, look at the company's stock price pre and post COVID, with income statements, balance sheets, and any relevant info from SEC filings around this time. Be thorough and execute code for deep analysis. Create a comprehensive CSV of ALL insider trades with columns: Date, Insider Name, Title/Position, Transaction Type (Buy/Sale/Option), Transaction Size (shares), Dollar Value, Stock Price at Time, and News Events Around Transaction Date."
                      )
                    }
                    className="bg-gradient-to-r from-primary/10 to-accent/30 p-2.5 sm:p-4 rounded-xl border border-primary/30 hover:border-primary/50 transition-colors hover:from-primary/20 hover:to-accent/40 text-left group col-span-1 sm:col-span-2 lg:col-span-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-primary mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-primary/80">
                      🚀 Deep Investigation
                    </div>
                    <div className="text-[10px] sm:text-xs text-primary/70">
                      Multi-source research + Insider data + Financial analysis
                    </div>
                  </motion.button>
                </div>

                <div className="mt-4 sm:mt-8">
                  <DataSourceLogos />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Input Form when not at bottom (desktop only) */}
        {!isFormAtBottom && messages.length === 0 && !isMobile && (
          <motion.div
            className="mt-8 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
              {/* Metrics Pills - connected to input box */}
              {messages.length > 0 && (
                <div className="mb-2">
                  <MetricsPills metrics={cumulativeMetrics} />
                </div>
              )}

              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="relative flex items-end">
                  <Textarea
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask a question..."
                    className="w-full resize-none rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 pr-14 sm:pr-16 min-h-[38px] sm:min-h-[40px] max-h-28 sm:max-h-32 overflow-y-auto text-sm sm:text-base bg-card border border-border focus:border-muted-foreground/40 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-sm"
                    disabled={status === "error" || isLoading}
                    rows={1}
                    style={{ lineHeight: "1.5" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <Button
                    type={canStop ? "button" : "submit"}
                    onClick={canStop ? handleStop : undefined}
                    disabled={
                      !canStop &&
                      (isLoading || !input.trim() || status === "error")
                    }
                    className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 rounded-xl h-7 w-7 sm:h-8 sm:w-8 p-0 bg-foreground hover:bg-foreground/80 text-background"
                  >
                    {canStop ? (
                      <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <svg
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12l14 0m-7-7l7 7-7 7"
                        />
                      </svg>
                    )}
                  </Button>
                </div>
              </form>

              {/* Powered by Valyu */}
              <motion.div
                className="flex items-center justify-center mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
              >
                <span className="text-xs text-muted-foreground/60">
                  Powered by
                </span>
                <a
                  href="https://platform.valyu.ai"
                  target="_blank"
                  rel="noopener noreferrer"
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
          </motion.div>
        )}

        <AnimatePresence initial={!virtualizationEnabled}>
          {(virtualizationEnabled
            ? deferredMessages
                .slice(visibleRange.start, visibleRange.end)
                .map((message, i) => ({
                  item: message,
                  realIndex: visibleRange.start + i,
                }))
            : deferredMessages.map((m, i) => ({ item: m, realIndex: i }))
          ).map(({ item: message, realIndex }) => (
            <motion.div
              key={message.id}
              className="group"
              initial={
                virtualizationEnabled ? undefined : { opacity: 0, y: 20 }
              }
              animate={virtualizationEnabled ? undefined : { opacity: 1, y: 0 }}
              exit={virtualizationEnabled ? undefined : { opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {message.role === "user" ? (
                /* User Message */
                <div className="flex justify-end mb-4 sm:mb-6 px-3 sm:px-0">
                  <div className="max-w-[85%] sm:max-w-[80%] bg-muted rounded-2xl px-4 sm:px-4 py-3 sm:py-3 relative group shadow-sm">
                    {/* User Message Actions */}
                    <div className="absolute -left-8 sm:-left-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMessage(message.id)}
                        className="h-6 w-6 p-0 bg-card rounded-full shadow-sm border border-border"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMessage(message.id)}
                        className="h-6 w-6 p-0 bg-card rounded-full shadow-sm border border-border text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {editingMessageId === message.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[80px] border-border rounded-xl"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSaveEdit(message.id)}
                            size="sm"
                            disabled={!editingText.trim()}
                            className="rounded-full"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-foreground">
                        {message.parts.find((p) => p.type === "text")?.text}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Assistant Message */
                <div className="mb-6 sm:mb-8 group px-3 sm:px-0">
                  {editingMessageId === message.id ? null : (
                    <div className="space-y-4">
                      {(() => {
                        // Group consecutive reasoning steps together
                        // Note: This runs on every render, but it's a simple grouping operation
                        // The real performance fix is in removing expensive operations during input-available state
                        const groupedParts = groupMessageParts(message.parts);

                        // Count reasoning steps and tool calls
                        const reasoningSteps = groupedParts.filter(g => g.type === "reasoning-group").length;
                        const toolCalls = groupedParts.filter(g => g.type !== "reasoning-group" && g.part?.type?.startsWith("tool-")).length;
                        const totalActions = reasoningSteps + toolCalls;

                        // Calculate duration (if available in message metadata)
                        const hasTextOutput = groupedParts.some(g => g.part?.type === "text");
                        // A message is complete if it has text output AND either:
                        // 1. It's not the last message, OR
                        // 2. It's the last message and we're not currently loading
                        const isLastMessage = realIndex === messages.length - 1;
                        const messageIsComplete = hasTextOutput && (!isLastMessage || !isLoading);

                        // Show header if there's any reasoning/tool activity (not just text)
                        const hasActivity = groupedParts.some(g =>
                          g.type === "reasoning-group" || g.part?.type?.startsWith("tool-")
                        );

                        // Get the latest step info for display
                        const latestStep = groupedParts[groupedParts.length - 1];
                        let latestStepTitle = "";
                        let latestStepSubtitle = "";
                        let latestStepIcon = <Brain className="h-5 w-5" />;

                        if (latestStep) {
                          if (latestStep.type === "reasoning-group") {
                            // Get reasoning text - handle both single and multiple parts
                            const allText = latestStep.parts
                              .map((item: any) => item.part?.text || "")
                              .join("\n\n");
                            const lines = allText.split('\n').filter((l: string) => l.trim());

                            // Try to find a title (line with **)
                            const titleLine = lines.find((l: string) => l.match(/^\*\*.*\*\*$/));
                            if (titleLine) {
                              latestStepTitle = titleLine.replace(/\*\*/g, '').trim();
                              // Get lines after title as preview
                              const titleIndex = lines.indexOf(titleLine);
                              if (titleIndex >= 0 && titleIndex < lines.length - 1) {
                                latestStepSubtitle = lines
                                  .slice(titleIndex + 1, titleIndex + 3)
                                  .map((l: string) => l.trim())
                                  .filter((l: string) => !l.match(/^\*\*.*\*\*$/))
                                  .join(' ');
                              }
                            } else if (lines.length > 0) {
                              // No title found, use first line as title and next as subtitle
                              latestStepTitle = lines[0].trim();
                              if (lines.length > 1) {
                                latestStepSubtitle = lines.slice(1, 3).map((l: string) => l.trim()).join(' ');
                              }
                            } else {
                              latestStepTitle = "Thinking...";
                            }
                            latestStepIcon = <Brain className="h-5 w-5 text-primary" />;
                          } else if (latestStep.part?.type?.startsWith("tool-")) {
                            // Get tool name and details
                            const toolType = latestStep.part.type.replace("tool-", "");

                            if (toolType === "financeSearch") {
                              latestStepTitle = "Finance Search";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <Search className="h-5 w-5 text-primary" />;
                            } else if (toolType === "webSearch") {
                              latestStepTitle = "Web Search";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <Globe className="h-5 w-5 text-primary" />;
                            } else if (toolType === "financeJournalSearch") {
                              latestStepTitle = "Academic Search";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <BookOpen className="h-5 w-5 text-primary" />;
                            } else if (toolType === "secSearch") {
                              latestStepTitle = "SEC Search";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <Search className="h-5 w-5 text-primary" />;
                            } else if (toolType === "economicsSearch") {
                              latestStepTitle = "Economics Search";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <Search className="h-5 w-5 text-primary" />;
                            } else if (toolType === "patentSearch") {
                              latestStepTitle = "Patent Search";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <Search className="h-5 w-5 text-primary" />;
                            } else if (toolType === "polymarketSearch") {
                              latestStepTitle = "Prediction Markets";
                              latestStepSubtitle = latestStep.part.input?.query || "...";
                              latestStepIcon = <Search className="h-5 w-5 text-primary" />;
                            } else if (toolType === "codeExecution") {
                              latestStepTitle = "Code Execution";
                              latestStepSubtitle = latestStep.part.input?.description || "Running Python code";
                              latestStepIcon = <Code2 className="h-5 w-5 text-primary" />;
                            } else if (toolType === "createChart") {
                              latestStepTitle = "Creating Chart";
                              latestStepSubtitle = latestStep.part.output?.title || "Generating visualization";
                              latestStepIcon = <BarChart3 className="h-5 w-5 text-primary" />;
                            } else if (toolType === "createCSV") {
                              latestStepTitle = "Creating Table";
                              latestStepSubtitle = latestStep.part.output?.title || "Generating CSV data";
                              latestStepIcon = <Table className="h-5 w-5 text-primary" />;
                            } else {
                              latestStepTitle = toolType;
                              latestStepSubtitle = "";
                            }
                          }
                        }

                        // Filter to show only the latest step when trace is collapsed
                        // When collapsed: hide ALL reasoning/tool steps, only show text output
                        // When expanded: show all steps
                        const displayParts = isTraceExpanded
                          ? groupedParts
                          : groupedParts.filter(g => {
                              // Only show text parts when collapsed
                              if (g.type === "reasoning-group") return false;
                              if (g.part?.type?.startsWith("tool-")) return false;
                              return g.part?.type === "text";
                            });

                        return (
                          <>
                            {/* Trace Header - Show when there's any reasoning/tool activity */}
                            {hasActivity && (
                              <button
                                onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                                className="w-full flex items-start gap-4 px-4 py-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border hover:border-muted-foreground/30 hover:shadow-sm transition-all mb-4 text-left group"
                              >
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                  {messageIsComplete ? (
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <Check className="h-5 w-5 text-primary" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                      {latestStepIcon}
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  {messageIsComplete ? (
                                    <>
                                      <div className="text-sm font-semibold text-foreground mb-1">
                                        Completed
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Performed {totalActions} {totalActions === 1 ? 'action' : 'actions'}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="text-sm font-semibold text-foreground">
                                          {latestStepTitle || "Working..."}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                                          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                                          <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                      </div>
                                      {latestStepSubtitle && (
                                        <div className="text-sm text-muted-foreground line-clamp-2">
                                          {latestStepSubtitle}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Expand button */}
                                <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors mt-1">
                                  <span className="hidden sm:inline">
                                    {isTraceExpanded ? 'Hide' : 'Show'}
                                  </span>
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isTraceExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </button>
                            )}

                            {displayParts.map((group, groupIndex) => {
                          if (group.type === "reasoning-group") {
                            // Render combined reasoning component
                            const combinedText = group.parts
                              .map((item: any) => item.part.text)
                              .join("\n\n");
                            const firstPart = group.parts[0].part;
                            // Only show as streaming if THIS specific part is actively streaming
                            const isStreaming = group.parts.some(
                              (item: any) => item.part.state === "streaming"
                            );

                            // Extract latest **title** and lines after it for live preview
                            let previewTitle = "";
                            let previewLines: string[] = [];

                            if (isStreaming && combinedText) {
                              const allLines = combinedText.split('\n').filter((l: string) => l.trim());

                              // Find the LATEST line that matches **text** pattern
                              let lastTitleIndex = -1;
                              for (let i = allLines.length - 1; i >= 0; i--) {
                                if (allLines[i].match(/^\*\*.*\*\*$/)) {
                                  lastTitleIndex = i;
                                  previewTitle = allLines[i].replace(/\*\*/g, ''); // Remove ** markers
                                  break;
                                }
                              }

                              // Get all lines after the latest title
                              if (lastTitleIndex !== -1 && lastTitleIndex < allLines.length - 1) {
                                previewLines = allLines.slice(lastTitleIndex + 1);
                              } else if (lastTitleIndex === -1 && allLines.length > 0) {
                                // No title found, just use all lines
                                previewLines = allLines;
                              }
                            }

                            return (
                              <React.Fragment key={`reasoning-group-${groupIndex}`}>
                                <ReasoningComponent
                                  part={{ ...firstPart, text: combinedText }}
                                  messageId={message.id}
                                  index={groupIndex}
                                  status={isStreaming ? "streaming" : "complete"}
                                  expandedTools={expandedTools}
                                  toggleToolExpansion={toggleToolExpansion}
                                />
                                {isStreaming && previewLines.length > 0 && (
                                  <LiveReasoningPreview
                                    title={previewTitle}
                                    lines={previewLines}
                                  />
                                )}
                              </React.Fragment>
                            );
                          } else {
                            // Render single part normally
                            const { part, index } = group;

                            switch (part.type) {
                              // Skip step-start markers (metadata from AI SDK)
                              case "step-start":
                                return null;

                              // Text parts
                              case "text":
                                // Use index directly instead of findIndex to avoid extra computation
                                return (
                                  <div
                                    key={index}
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                  >
                                    <MemoizedTextPartWithCitations
                                      text={part.text}
                                      messageParts={message.parts}
                                      currentPartIndex={index}
                                      allMessages={deferredMessages}
                                      currentMessageIndex={realIndex}
                                    />
                                  </div>
                                );

                              // Skip individual reasoning parts as they're handled in groups
                              case "reasoning":
                                return null;

                              // Python Executor Tool
                              case "tool-codeExecution": {
                                const callId = part.toolCallId;
                                const isStreaming = part.state === "input-streaming" || part.state === "input-available";
                                const hasOutput = part.state === "output-available";
                                const hasError = part.state === "output-error";

                                if (hasError) {
                                  return (
                                    <div key={callId}>
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status="error"
                                        type="tool"
                                        title="Python Execution Error"
                                        subtitle={part.errorText}
                                        icon={<AlertCircle />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      />
                                    </div>
                                  );
                                }

                                const description = part.input?.description || "Executed Python code";

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : "complete"}
                                      type="tool"
                                      title="Code & Output"
                                      subtitle={description}
                                      icon={<Code2 />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {hasOutput && (
                                        <MemoizedCodeExecutionResult
                                          code={part.input?.code || ""}
                                          output={part.output}
                                          actionId={callId}
                                          expandedTools={expandedTools}
                                          toggleToolExpansion={toggleToolExpansion}
                                        />
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // Financial Search, Web Search, and Journal Search - use unified component
                              case "tool-financeSearch":
                              case "tool-webSearch":
                              case "tool-financeJournalSearch": {
                                return (
                                  <SearchToolDisplay
                                    key={part.toolCallId}
                                    toolType={part.type}
                                    part={part}
                                    messageId={message.id}
                                    index={index}
                                    expandedTools={expandedTools}
                                    toggleToolExpansion={toggleToolExpansion}
                                  />
                                );
                              }

                              // Chart Creation Tool
                              case "tool-createChart": {
                                const callId = part.toolCallId;
                                const isStreaming = part.state === "input-streaming" || part.state === "input-available";
                                const hasOutput = part.state === "output-available";
                                const hasError = part.state === "output-error";

                                if (hasError) {
                                  return (
                                    <div key={callId}>
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status="error"
                                        type="tool"
                                        title="Chart Creation Error"
                                        subtitle={part.errorText}
                                        icon={<AlertCircle />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      />
                                    </div>
                                  );
                                }

                                const title = hasOutput && part.output?.title ? part.output.title : "Chart";

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : "complete"}
                                      type="tool"
                                      title={title}
                                      subtitle={hasOutput && part.output?.metadata ? `${part.output.metadata.totalSeries} series · ${part.output.metadata.totalDataPoints} points` : undefined}
                                      icon={<BarChart3 />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {hasOutput && (
                                        <MemoizedChartResult
                                          chartData={part.output}
                                          actionId={callId}
                                          expandedTools={expandedTools}
                                          toggleToolExpansion={toggleToolExpansion}
                                        />
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // CSV Creation Tool
                              case "tool-createCSV": {
                                const callId = part.toolCallId;
                                const isStreaming = part.state === "input-streaming" || part.state === "input-available";
                                const hasOutput = part.state === "output-available";
                                const hasError = part.state === "output-error" || part.output?.error;

                                if (hasError) {
                                  return (
                                    <div key={callId}>
                                      <TimelineStep
                                        part={part}
                                        messageId={message.id}
                                        index={index}
                                        status="error"
                                        type="tool"
                                        title="CSV Creation Error"
                                        subtitle={part.output?.message || part.errorText}
                                        icon={<AlertCircle />}
                                        expandedTools={expandedTools}
                                        toggleToolExpansion={toggleToolExpansion}
                                      />
                                    </div>
                                  );
                                }

                                const title = hasOutput && part.output?.title ? part.output.title : "CSV Table";
                                const subtitle = hasOutput ? `${part.output.rowCount} rows · ${part.output.columnCount} columns` : undefined;

                                return (
                                  <div key={callId}>
                                    <TimelineStep
                                      part={part}
                                      messageId={message.id}
                                      index={index}
                                      status={isStreaming ? "streaming" : "complete"}
                                      type="tool"
                                      title={title}
                                      subtitle={subtitle}
                                      icon={<Table />}
                                      expandedTools={expandedTools}
                                      toggleToolExpansion={toggleToolExpansion}
                                    >
                                      {hasOutput && !part.output?.error && (
                                        <CSVPreview {...part.output} />
                                      )}
                                    </TimelineStep>
                                  </div>
                                );
                              }

                              // Unified Search Tools (SEC, Economics, Patent, Polymarket)
                              case "tool-secSearch":
                              case "tool-economicsSearch":
                              case "tool-patentSearch":
                              case "tool-polymarketSearch": {
                                return (
                                  <SearchToolDisplay
                                    key={part.toolCallId}
                                    toolType={part.type}
                                    part={part}
                                    messageId={message.id}
                                    index={index}
                                    expandedTools={expandedTools}
                                    toggleToolExpansion={toggleToolExpansion}
                                  />
                                );
                              }

                              // Generic dynamic tool fallback (for future tools)
                              case "dynamic-tool":
                                return (
                                  <div
                                    key={index}
                                    className="mt-2 bg-accent/30 border border-border rounded p-2 sm:p-3"
                                  >
                                    <div className="flex items-center gap-2 text-primary mb-2">
                                      <Wrench className="h-4 w-4" />
                                      <span className="font-medium">
                                        Tool: {part.toolName}
                                      </span>
                                    </div>
                                    <div className="text-sm text-foreground">
                                      {part.state === "input-streaming" && (
                                        <pre className="bg-muted p-2 rounded text-xs">
                                          {JSON.stringify(part.input, null, 2)}
                                        </pre>
                                      )}
                                      {part.state === "output-available" && (
                                        <pre className="bg-muted p-2 rounded text-xs">
                                          {JSON.stringify(part.output, null, 2)}
                                        </pre>
                                      )}
                                      {part.state === "output-error" && (
                                        <div className="text-destructive">
                                          Error: {part.errorText}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );

                              default:
                                return null;
                            }
                          }
                        })}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Message Actions - Professional Action Bar */}
                  {message.role === "assistant" && !isLoading && (
                    <div className="flex justify-end gap-2 mt-6 pt-4 mb-8 border-t border-border">
                      <button
                        onClick={() => copyToClipboard(getMessageText(message))}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </button>

                      {/* Show download button only for last message when session exists */}
                      {deferredMessages[deferredMessages.length - 1]?.id === message.id &&
                       sessionIdRef.current && (
                        user ? (
                          <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloadingPDF}
                            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download full report as PDF"
                          >
                            {isDownloadingPDF ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3.5 w-3.5" />
                                <span>Download Report</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowAuthModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border border-border rounded-lg transition-all hover:border-muted-foreground/30 hover:text-foreground group"
                            title="Sign in to download reports"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download Report</span>
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded group-hover:bg-primary/20 transition-colors">
                              Sign in
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {virtualizationEnabled && (
          <>
            <div
              style={{ height: Math.max(0, visibleRange.start * avgRowHeight) }}
            />
            <div
              style={{
                height: Math.max(
                  0,
                  (deferredMessages.length - visibleRange.end) * avgRowHeight
                ),
              }}
            />
          </>
        )}

        {/* Coffee Loading Message */}
        <AnimatePresence>
          {status === "submitted" &&
            deferredMessages.length > 0 &&
            deferredMessages[deferredMessages.length - 1]?.role === "user" && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="flex items-start gap-2">
                  <div className="text-primary text-lg mt-0.5">
                    ☕
                  </div>
                  <div className="bg-accent/30 border border-border rounded-xl px-3 py-2 max-w-xs">
                    <div className="text-foreground text-sm">
                      Just grabbing a coffee and contemplating the meaning of
                      life... ☕️
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
        <div ref={bottomAnchorRef} className="h-px w-full" />
      </div>

      {/* Gradient fade above input form */}
      <AnimatePresence>
        {(isFormAtBottom || isMobile) && (
          <>
            <motion.div
              className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-3xl h-36 pointer-events-none z-45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div
                className="dark:hidden absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgb(245,245,245) 0%, rgba(245,245,245,0.98) 30%, rgba(245,245,245,0.8) 60%, rgba(245,245,245,0) 100%)",
                }}
              />
              <div
                className="hidden dark:block absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgb(3 7 18) 0%, rgb(3 7 18 / 0.98) 30%, rgb(3 7 18 / 0.8) 60%, transparent 100%)",
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">
              {error.message?.includes('CREDITS_REQUIRED') ? 'Valyu Credits Required' : 'Something went wrong'}
            </span>
          </div>
          <p className="text-destructive/80 text-sm mt-1">
            {error.message?.includes('CREDITS_REQUIRED')
              ? 'You need Valyu credits in your organization to use this feature. Add credits at platform.valyu.ai.'
              : 'Please check your connection and try again.'
            }
          </p>
          <Button
            onClick={() => {
              if (error.message?.includes('CREDITS_REQUIRED')) {
                // Redirect to Valyu Platform for credits
                window.open('https://platform.valyu.ai', '_blank');
              } else {
                window.location.reload();
              }
            }}
            variant="outline"
            size="sm"
            className="mt-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            {error.message?.includes('CREDITS_REQUIRED') ? (
              <>
                <span className="mr-1">💳</span>
                Add Credits
              </>
            ) : (
              <>
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </>
            )}
          </Button>
        </div>
      )}

      {/* Input Form at bottom */}
      <AnimatePresence>
        {(isFormAtBottom || isMobile) && (
          <motion.div
            className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-3xl px-3 sm:px-6 pt-4 pb-5 sm:pb-6 z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Metrics Pills - connected to input box */}
            {messages.length > 0 && (
              <div className="mb-2">
                <MetricsPills metrics={cumulativeMetrics} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="bg-card rounded-2xl shadow-sm border border-border px-4 py-2.5 relative flex items-center">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a question..."
                  className="w-full resize-none border-0 px-0 py-2 pr-12 min-h-[36px] max-h-24 focus:ring-0 focus-visible:ring-0 bg-transparent overflow-y-auto text-base placeholder:text-muted-foreground shadow-none"
                  disabled={status === "error" || isLoading}
                  rows={1}
                  style={{ lineHeight: "1.5", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type={canStop ? "button" : "submit"}
                  onClick={canStop ? handleStop : undefined}
                  disabled={
                    !canStop &&
                    (isLoading || !input.trim() || status === "error")
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-8 w-8 p-0 bg-foreground hover:bg-foreground/80 text-background shadow-sm transition-colors"
                >
                    {canStop ? (
                      <Square className="h-4 w-4" />
                    ) : isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12l14 0m-7-7l7 7-7 7"
                        />
                      </svg>
                    )}
                  </Button>
                </div>
              </form>

            {/* Mobile Bottom Bar - Social links and disclaimer below input */}
            <motion.div
              className="block sm:hidden mt-4 pt-3 border-t border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center justify-center space-x-4">
                  <SocialLinks />
                </div>
                <p className="text-[10px] text-muted-foreground/60 text-center">
                  Not financial advice.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal for Sign in with Valyu */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Sign in Required Dialog - shown when user tries to submit without Valyu auth */}
      <Dialog open={showSignupPrompt} onOpenChange={setShowSignupPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Sign in with Valyu to continue
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Valyu is the AI search engine powering Finance. Sign in to access comprehensive financial data from SEC filings, earnings reports, market data, and 50+ premium sources.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-sm text-primary font-medium">
                Get $10 free credits on signup - no credit card required!
              </p>
            </div>
            <button
              onClick={() => {
                setShowSignupPrompt(false);
                setShowAuthModal(true);
              }}
              className="w-full px-4 py-3 bg-foreground text-background font-medium rounded-lg hover:bg-foreground/80 transition-all flex items-center justify-center gap-2"
            >
              <Image src="/valyu.svg" alt="Valyu" width={20} height={20} className="h-5 w-auto" />
              Sign in with Valyu
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model Compatibility Dialog */}
      <ModelCompatibilityDialog
        open={!!modelCompatibilityError}
        onClose={() => {
          setModelCompatibilityError(null);
          setPendingMessage(null);
        }}
        onContinue={() => {
          // TODO: Implement retry without tools
          setModelCompatibilityError(null);
          setPendingMessage(null);
        }}
        error={modelCompatibilityError?.message || ''}
        modelName={selectedModel || undefined}
      />
    </div>
  );
}
