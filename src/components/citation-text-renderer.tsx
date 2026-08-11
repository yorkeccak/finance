"use client";

import React from "react";
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

interface CitationTextRendererProps {
  text: string;
  citations: CitationMap;
  className?: string;
}

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
    return <span className="text-primary">{citationKeys.join('')}</span>;
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
      return <code className="math-fallback bg-muted px-1 rounded">{mathContent}</code>;
    }
  },
  
  // Handle images
  img: ({ src, alt, ...props }: any) => {
    if (!src || src.trim() === "") return null;

    try {
      new URL(src);
    } catch {
      if (!src.startsWith('/')) {
        return (
          <span className="text-xs text-muted-foreground italic">
            [Image: {alt || src}]
          </span>
        );
      }
    }

    return <img src={src} alt={alt || ""} {...props} />;
  },
});

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

  // Memoize parsed segments to avoid re-parsing on every render during streaming
  const parsedSegments = React.useMemo(() => {
    if (!text.includes('#') && !text.includes('*') && !text.includes('`') && !text.includes('<')) {
      return parseGroupedCitations(text);
    }
    return null;
  }, [text]);

  const hasCitationGroups = parsedSegments && parsedSegments.segments.some(s => s.type === 'citation-group');

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