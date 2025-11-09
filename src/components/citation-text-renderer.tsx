"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import katex from "katex";
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/components/ai/inline-citation";
import { CitationMap } from "@/lib/citation-utils";
import { preprocessMarkdownText, cleanFinancialText } from "@/lib/markdown-utils";
import { FinancialChart } from "@/components/financial-chart";
import { CsvRenderer } from "@/components/csv-renderer";

interface CitationTextRendererProps {
  text: string;
  citations: CitationMap;
  className?: string;
}

// Cache for chart data to prevent re-fetching during streaming
const chartDataCache = new Map<string, any>();

// Inline Chart Renderer for CitationTextRenderer
const InlineChartRenderer = React.memo(({ chartId, alt }: { chartId: string; alt?: string }) => {
  const [chartData, setChartData] = useState<any>(() => chartDataCache.get(chartId) || null);
  const [loading, setLoading] = useState(!chartDataCache.has(chartId));
  const [error, setError] = useState(false);

  useEffect(() => {
    // If already cached, don't fetch again
    if (chartDataCache.has(chartId)) {
      return;
    }

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

        // Cache the result
        chartDataCache.set(chartId, data);
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
      <div className="my-4 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading chart...</div>
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className="my-4 border border-red-200 dark:border-red-700 rounded-lg p-4 text-center">
        <div className="text-sm text-red-600 dark:text-red-400">Failed to load chart</div>
      </div>
    );
  }

  return (
    <div className="my-4">
      <FinancialChart {...chartData} />
    </div>
  );
}, (prevProps, nextProps) => prevProps.chartId === nextProps.chartId);

InlineChartRenderer.displayName = 'InlineChartRenderer';

// CSV rendering now handled by shared CsvRenderer component

// Component to render grouped citations with hover card
const GroupedCitationBadge = React.memo(({ 
  citationKeys, 
  citations 
}: { 
  citationKeys: string[]; 
  citations: CitationMap;
}) => {
  // Collect all citations from all keys
  const allCitations: any[] = [];
  const allSources: string[] = [];
  
  citationKeys.forEach(key => {
    const citationList = citations[key] || [];
    citationList.forEach(citation => {
      allCitations.push(citation);
      if (citation.url) {
        allSources.push(citation.url);
      }
    });
  });
  
  if (allCitations.length === 0) {
    // If no citations found, just show the keys without hover
    return <span className="text-blue-600 dark:text-blue-400">{citationKeys.join('')}</span>;
  }

  return (
    <InlineCitation>
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={allSources} />
        <InlineCitationCardBody>
          <InlineCitationCarousel>
            {allCitations.length > 1 && (
              <InlineCitationCarouselHeader>
                <InlineCitationCarouselIndex />
              </InlineCitationCarouselHeader>
            )}
            <InlineCitationCarouselContent>
              {allCitations.map((citation, idx) => (
                <InlineCitationCarouselItem key={idx}>
                  <InlineCitationSource
                    title={citation.title}
                    url={citation.url}
                    description={citation.description}
                    date={citation.date}
                    authors={citation.authors}
                    doi={citation.doi}
                    relevanceScore={citation.relevanceScore}
                  />
                  {citation.quote && (
                    <InlineCitationQuote>
                      {citation.quote}
                    </InlineCitationQuote>
                  )}
                </InlineCitationCarouselItem>
              ))}
            </InlineCitationCarouselContent>
          </InlineCitationCarousel>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  );
});

GroupedCitationBadge.displayName = "GroupedCitationBadge";

// Parse text to find grouped citations like [1][2][3] or [1,2,3]
const parseGroupedCitations = (text: string): { segments: Array<{ type: 'text' | 'citation-group', content: string, citations?: string[] }> } => {
  // Pattern to match grouped citations: [1][2][3] or [1,2,3] or [1, 2, 3]
  const groupedPattern = /((?:\[\d+\])+|\[\d+(?:\s*,\s*\d+)*\])/g;
  const segments: Array<{ type: 'text' | 'citation-group', content: string, citations?: string[] }> = [];
  let lastIndex = 0;

  let match;
  while ((match = groupedPattern.exec(text)) !== null) {
    // Add text before citation group
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    // Parse the citation group
    const citationGroup = match[0];
    const citations: string[] = [];
    
    if (citationGroup.includes(',')) {
      // Handle [1,2,3] format
      const numbers = citationGroup.match(/\d+/g) || [];
      numbers.forEach(num => citations.push(`[${num}]`));
    } else {
      // Handle [1][2][3] format
      const individualCitations = citationGroup.match(/\[\d+\]/g) || [];
      citations.push(...individualCitations);
    }

    segments.push({
      type: 'citation-group',
      content: citationGroup,
      citations
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return { segments };
};

// Custom markdown components that handle citations
const createMarkdownComponents = (citations: CitationMap) => ({
  // Handle inline text that might contain citations
  p: ({ children, ...props }: any) => {
    // Process children to handle citation markers
    const processedChildren = React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        const { segments } = parseGroupedCitations(child);
        
        if (segments.some(s => s.type === 'citation-group')) {
          return segments.map((segment, idx) => {
            if (segment.type === 'citation-group' && segment.citations) {
              return <GroupedCitationBadge key={idx} citationKeys={segment.citations} citations={citations} />;
            }
            return <span key={idx}>{segment.content}</span>;
          });
        }
      }
      return child;
    });

    return <p {...props}>{processedChildren}</p>;
  },
  
  // Handle other text containers similarly
  li: ({ children, ...props }: any) => {
    const processedChildren = React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        const { segments } = parseGroupedCitations(child);
        
        if (segments.some(s => s.type === 'citation-group')) {
          return segments.map((segment, idx) => {
            if (segment.type === 'citation-group' && segment.citations) {
              return <GroupedCitationBadge key={idx} citationKeys={segment.citations} citations={citations} />;
            }
            return <span key={idx}>{segment.content}</span>;
          });
        }
      }
      return child;
    });

    return <li {...props}>{processedChildren}</li>;
  },
  
  // Handle math rendering
  math: ({ children }: any) => {
    const mathContent = typeof children === "string" ? children : children?.toString() || "";
    try {
      const html = katex.renderToString(mathContent, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
      return <span dangerouslySetInnerHTML={{ __html: html }} className="katex-math" />;
    } catch (error) {
      return <code className="math-fallback bg-gray-100 px-1 rounded">{mathContent}</code>;
    }
  },
  
  // Handle images and special references (charts and CSVs)
  // Note: We can't return block-level elements (div) from img handler as ReactMarkdown wraps them in <p>
  // CSVs and charts are handled via preprocessing instead
  img: ({ src, alt, ...props }: any) => {
    if (!src || src.trim() === "") return null;


    try {
      new URL(src);
    } catch {
      if (!src.startsWith('/') && !src.startsWith('csv:') && !src.match(/^\/api\/(charts|csvs)\//)) {
        return (
          <span className="text-xs text-gray-500 italic">
            [Image: {alt || src}]
          </span>
        );
      }
    }

    return <img src={src} alt={alt || ""} {...props} />;
  },

  // Also handle links that might reference CSVs
  a: ({ href, children, ...props }: any) => {
    if (!href) return <a {...props}>{children}</a>;

    // Check if this is a CSV reference link
    const csvProtocolMatch = href.match(/^csv:([a-f0-9-]+)$/i);
    const csvApiMatch = href.match(/^\/api\/csvs\/([a-f0-9-]+)$/i);

    if (csvProtocolMatch) {
      const csvId = csvProtocolMatch[1];
      const label = typeof children === 'string' ? children : undefined;
      return <CsvRenderer csvId={csvId} alt={label} />;
    }

    if (csvApiMatch) {
      const csvId = csvApiMatch[1];
      const label = typeof children === 'string' ? children : undefined;
      return <CsvRenderer csvId={csvId} alt={label} />;
    }

    // Regular link
    return <a href={href} {...props}>{children}</a>;
  },
});

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

export const CitationTextRenderer = React.memo(({
  text,
  citations,
  className = ""
}: CitationTextRendererProps) => {
  // CRITICAL: Only enable HTML processing for short text (< 20K chars)
  // This prevents massive performance issues with large responses
  const enableRawHtml = (text?.length || 0) < 20000;

  // ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURNS
  const processedText = React.useMemo(
    () => preprocessMarkdownText(cleanFinancialText(text || "")),
    [text]
  );

  const markdownComponents = React.useMemo(
    () => createMarkdownComponents(citations),
    [citations]
  );

  // Parse special references (CSV/charts)
  const specialSegments = React.useMemo(() => parseSpecialReferences(text), [text]);
  const hasSpecialRefs = specialSegments.some(s => s.type === 'csv' || s.type === 'chart');

  // Memoize parsed segments to avoid re-parsing on every render during streaming
  const parsedSegments = React.useMemo(() => {
    if (!text.includes('#') && !text.includes('*') && !text.includes('`') && !text.includes('<')) {
      return parseGroupedCitations(text);
    }
    return null;
  }, [text]);

  const hasCitationGroups = parsedSegments && parsedSegments.segments.some(s => s.type === 'citation-group');

  // If we have CSV or chart references, render them separately to avoid nesting issues
  if (hasSpecialRefs) {
    return (
      <div className={className}>
        {specialSegments.map((segment, idx) => {
          if (segment.type === 'csv' && segment.id) {
            return <CsvRenderer key={`${segment.id}-${idx}`} csvId={segment.id} />;
          }
          if (segment.type === 'chart' && segment.id) {
            return <InlineChartRenderer key={`${segment.id}-${idx}`} chartId={segment.id} />;
          }
          // Render text segment as markdown
          return (
            <ReactMarkdown
              key={idx}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={enableRawHtml ? [rehypeRaw] : []}
              skipHtml={!enableRawHtml}
              components={markdownComponents as any}
              unwrapDisallowed={true}
            >
              {preprocessMarkdownText(cleanFinancialText(segment.content))}
            </ReactMarkdown>
          );
        })}
      </div>
    );
  }

  // For simple text without markdown, handle citations directly
  if (hasCitationGroups && parsedSegments) {
    const { segments } = parsedSegments;
    return (
      <div className={className}>
        {segments.map((segment, idx) => {
          if (segment.type === 'citation-group' && segment.citations) {
            return <GroupedCitationBadge key={idx} citationKeys={segment.citations} citations={citations} />;
          }
          return <span key={idx}>{segment.content}</span>;
        })}
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={enableRawHtml ? [rehypeRaw] : []}
        skipHtml={!enableRawHtml}
        components={markdownComponents as any}
        unwrapDisallowed={true}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if text or citations changed
  return (
    prevProps.text === nextProps.text &&
    Object.keys(prevProps.citations).length === Object.keys(nextProps.citations).length &&
    prevProps.className === nextProps.className
  );
});

CitationTextRenderer.displayName = "CitationTextRenderer";