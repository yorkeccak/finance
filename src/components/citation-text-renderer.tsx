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
  
  // Keep existing image handling
  img: ({ src, alt, ...props }: any) => {
    if (!src || src.trim() === "") return null;
    
    try {
      new URL(src);
    } catch {
      if (!src.startsWith('/')) {
        return (
          <div className="text-xs text-gray-500 italic border border-gray-200 p-2 rounded">
            [Image: {alt || src}] (Invalid URL - academic content)
          </div>
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
  const processedText = React.useMemo(
    () => preprocessMarkdownText(cleanFinancialText(text || "")),
    [text]
  );

  const markdownComponents = React.useMemo(
    () => createMarkdownComponents(citations),
    [citations]
  );

  // For simple text without markdown, handle citations directly
  if (!text.includes('#') && !text.includes('*') && !text.includes('`') && !text.includes('<')) {
    const { segments } = parseGroupedCitations(text);
    
    if (segments.some(s => s.type === 'citation-group')) {
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
  }

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents as any}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
});

CitationTextRenderer.displayName = "CitationTextRenderer";