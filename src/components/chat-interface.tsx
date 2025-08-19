"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { FinanceUIMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getRateLimitStatus } from "@/lib/rate-limit";
import { track } from '@vercel/analytics';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useRouter, useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Square,
  Trash2,
  AlertCircle,
  Loader2,
  Edit3,
  Calculator,
  Wrench,
  CheckCircle,
  Copy,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Clipboard,
  SquarePen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import katex from "katex";
import { FinancialChart } from "@/components/financial-chart";
import { ShareButton } from "./share-button";
const JsonView = dynamic(() => import("@uiw/react-json-view"), {
  ssr: false,
  loading: () => <div className="text-xs text-gray-500">Loading JSON…</div>,
});
import {
  preprocessMarkdownText,
  cleanFinancialText,
} from "@/lib/markdown-utils";
import { motion, AnimatePresence } from "framer-motion";
import DataSourceLogos from "./data-source-logos";
import SocialLinks from "./social-links";

// Debug toggles removed per request

// Separate component for reasoning to avoid hook violations
const ReasoningComponent = ({
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
  const reasoningId = `reasoning-${messageId}-${index}`;
  // Check if explicitly collapsed (default is expanded for streaming)
  const isCollapsed = expandedTools.has(`collapsed-${reasoningId}`);
  const reasoningText = part.text || "";
  const previewLength = 150;
  const shouldShowToggle =
    reasoningText.length > previewLength || status === "streaming";
  const displayText = !isCollapsed
    ? reasoningText
    : reasoningText.slice(0, previewLength);

  const copyReasoningTrace = () => {
    navigator.clipboard.writeText(reasoningText);
  };

  const toggleCollapse = () => {
    const collapsedKey = `collapsed-${reasoningId}`;
    toggleToolExpansion(collapsedKey);
  };

  // Auto-scroll effect for streaming reasoning
  const reasoningRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (status === "streaming" && reasoningRef.current && !isCollapsed) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
    }
  }, [reasoningText, status, isCollapsed]);

  return (
    <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="p-2.5 sm:p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <span className="text-lg">🧠</span>
            <span className="font-medium text-sm">AI Reasoning Process</span>
            {status === "streaming" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-1">
            {reasoningText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={copyReasoningTrace}
                className="h-6 px-2 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
            {shouldShowToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="h-6 px-2 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40"
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div
          className={`${
            !isCollapsed
              ? "max-h-96 overflow-y-auto"
              : "max-h-20 overflow-hidden"
          } transition-all duration-200 scroll-smooth`}
        >
          <pre
            ref={reasoningRef}
            className="text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap font-mono leading-relaxed bg-purple-25 dark:bg-purple-950/30 p-2 rounded border"
            style={{ scrollBehavior: "smooth" }}
          >
            {displayText}
            {isCollapsed && shouldShowToggle && (
              <span className="text-purple-500 dark:text-purple-400">...</span>
            )}
          </pre>
        </div>

        {status === "streaming" && (
          <div className="mt-2 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400">
            <div className="flex items-center gap-2 italic">
              <Clock className="h-3 w-3" />
              Reasoning in progress...
            </div>
            {reasoningText.length > 0 && (
              <div className="text-xs font-mono">
                {reasoningText.length} chars
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced markdown components that handle both math and financial content
const markdownComponents = {
  img: ({ src, alt, ...props }: any) => {
    // Don't render image if src is empty or undefined
    if (!src || src.trim() === "") {
      return null;
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
  math: ({ children, ...props }: any) => {
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
      console.warn("KaTeX rendering error:", error);
      return (
        <code className="math-fallback bg-gray-100 px-1 rounded">
          {mathContent}
        </code>
      );
    }
  },
};

// Memoized Markdown renderer to avoid re-parsing on unrelated state updates
const MemoizedMarkdown = memo(function MemoizedMarkdown({
  text,
}: {
  text: string;
}) {
  const enableRawHtml = (text?.length || 0) < 20000;
  const processed = useMemo(
    () => preprocessMarkdownText(cleanFinancialText(text || "")),
    [text]
  );
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents as any}
      rehypePlugins={enableRawHtml ? [rehypeRaw] : []}
      skipHtml={!enableRawHtml}
    >
      {processed}
    </ReactMarkdown>
  );
});

// Helper function to extract search results for carousel display
const extractSearchResults = (jsonOutput: string) => {
  try {
    const data = JSON.parse(jsonOutput);
    if (data.results && Array.isArray(data.results)) {
      const mappedResults = data.results.map((result: any, index: number) => ({
        id: index,
        title: result.title || `Result ${index + 1}`,
        summary: result.content
          ? typeof result.content === "string"
            ? result.content.length > 150
              ? result.content.substring(0, 150) + "..."
              : result.content
            : typeof result.content === "number"
            ? `Current Price: $${result.content.toFixed(2)}`
            : `${
                result.dataType === "structured" ? "Structured data" : "Data"
              } from ${result.source || "source"}`
          : "No summary available",
        source: result.source || "Unknown source",
        date: result.date || "",
        url: result.url || "",
        fullContent:
          typeof result.content === "number"
            ? `$${result.content.toFixed(2)}`
            : result.content || "No content available",
        isStructured: result.dataType === "structured",
        dataType: result.dataType || "unstructured",
        length: result.length,
        imageUrls: result.imageUrl || result.image_url || {},
        relevanceScore: result.relevanceScore || result.relevance_score || 0,
      }));

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

// Search Result Card Component
const SearchResultCard = ({
  result,
  type,
}: {
  result: any;
  type: "financial" | "web";
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
      console.error("Failed to copy text: ", err);
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
          className="cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0"
          onClick={() => setIsDialogOpen(true)}
        >
          <CardContent className="h-full">
            <div className="flex flex-col justify-between space-y-2 h-full">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                  {result.summary}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      result.isStructured
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    }`}
                  >
                    {result.dataType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="truncate px-2 rounded text-xs bg-gray-100 dark:bg-gray-800 py-0.5 max-w-[150px]">
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
          isJson={result.isStructured}
        />
      </>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[240px] sm:min-w-[280px] max-w-[280px] sm:max-w-[320px] flex-shrink-0">
          <CardContent className="h-full">
            <div className="flex flex-col justify-between space-y-2 h-full">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
                    {result.title}
                  </h4>
                  <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                  {result.summary}
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      result.isStructured
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    }`}
                  >
                    {result.dataType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="truncate px-2 rounded text-xs bg-gray-100 dark:bg-gray-800 py-0.5 max-w-[150px]">
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

      <DialogContent className="w-[95vw] sm:w-[85vw] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className=" pr-8">{result.title}</DialogTitle>
          <Separator />
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* <span>{result.source}</span> */}
              {result.date && <span>• {result.date}</span>}
              {result.relevanceScore && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {(result.relevanceScore * 100).toFixed(0)}% relevance
                </span>
              )}
            </div>

            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                <ExternalLink className="h-3 w-3" />
                View Source
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {result.isStructured ? (
            // Structured data - show as formatted JSON
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4" />
                  Structured Data
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    {result.dataType}
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
                  className="h-8 px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  Copy JSON
                </Button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
            // Unstructured data - show as markdown
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <FileText className="h-4 w-4" />
                Content
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                  {result.dataType}
                </span>
                {result.length && (
                  <span className="text-xs text-gray-500">
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
                      : typeof result.fullContent === "object"
                      ? JSON.stringify(result.fullContent, null, 2)
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
  type: "financial" | "web";
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
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
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
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 px-2">
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
                <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
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
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                    className="text-blue-200 underline hover:text-blue-400 text-sm"
                  >
                    View Source
                  </a>
                  <div className="text-xs text-gray-300 mt-2">
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
  onMessagesChange,
  onRateLimitError,
}: {
  onMessagesChange?: (hasMessages: boolean) => void;
  onRateLimitError?: (resetTime: string) => void;
}) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [isRateLimited, setIsRateLimited] = useState(false);
  const userHasInteracted = useRef(false); // Track if user has scrolled up

  const [isFormAtBottom, setIsFormAtBottom] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Function to clean messages before sending to model
  const cleanMessagesForModel = (messages: any[]): any[] => {
    console.log(
      "[Message Filtering] Original messages count:",
      messages.length
    );
    console.log(
      "[Message Filtering] Original size:",
      JSON.stringify(messages).length,
      "bytes"
    );

    const cleaned = messages.map((msg) => {
      // Keep user messages as-is
      if (msg.role === "user") {
        return msg;
      }

      // For assistant messages, only keep the final text response
      if (msg.role === "assistant" && msg.parts) {
        const originalPartsCount = msg.parts.length;

        // Filter out tool calls, tool results, and reasoning
        const textParts = msg.parts.filter(
          (part: any) =>
            part.type === "text" && part.text && part.text.trim() !== ""
        );

        if (originalPartsCount > textParts.length) {
          console.log(
            `[Message Filtering] Removed ${
              originalPartsCount - textParts.length
            } non-text parts from assistant message`
          );
        }

        // If there are text parts, keep only those
        if (textParts.length > 0) {
          return {
            ...msg,
            parts: textParts,
          };
        }
      }

      // Keep other messages as-is (system, etc.)
      return msg;
    });

    console.log(
      "[Message Filtering] Cleaned size:",
      JSON.stringify(cleaned).length,
      "bytes"
    );
    console.log(
      "[Message Filtering] Size reduction:",
      Math.round(
        (1 - JSON.stringify(cleaned).length / JSON.stringify(messages).length) *
          100
      ) + "%"
    );

    return cleaned;
  };

  const [transport, setTransport] = useState<any>(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages: messages,
          },
        }),
      })
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
  });

  useEffect(() => {
    console.log("Messages updated:", messages);
  }, [messages]);

  // Check rate limit status on mount and detect mobile
  useEffect(() => {
    const rateLimitStatus = getRateLimitStatus();
    if (!rateLimitStatus.allowed) {
      setIsRateLimited(true);
      // Don't automatically show dialog on mount - only when user tries to submit
    }
    
    // Detect mobile device
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

  // Handle rate limit errors
  useEffect(() => {
    if (error) {
      console.log("[Chat Interface] Error occurred:", error);
      
      // Check if it's a rate limit error
      if (error.message && (error.message.includes('RATE_LIMIT_EXCEEDED') || error.message.includes('429'))) {
        setIsRateLimited(true);
        try {
          // Try to extract reset time from error response
          const errorData = JSON.parse(error.message);
          const resetTime = errorData.resetTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          onRateLimitError?.(resetTime);
        } catch (e) {
          // Fallback: use default reset time (next day)
          const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          onRateLimitError?.(resetTime);
        }
      }
    }
  }, [error]); // Remove onRateLimitError from dependencies to prevent infinite loops

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
    if (start !== visibleRange.start || end !== visibleRange.end) {
      setVisibleRange({ start, end });
    }
  }, [
    virtualizationEnabled,
    avgRowHeight,
    overscan,
    deferredMessages.length,
    visibleRange.start,
    visibleRange.end,
  ]);
  useEffect(() => {
    if (virtualizationEnabled) {
      setVisibleRange({ start: 0, end: Math.min(deferredMessages.length, 30) });
      requestAnimationFrame(updateVisibleRange);
    }
  }, [virtualizationEnabled, deferredMessages.length, updateVisibleRange]);
  useEffect(() => {
    const onResize = () => updateVisibleRange();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateVisibleRange]);

  // Helper: detect if messages container scrolls or if page scroll is used
  const isContainerScrollable = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    return container.scrollHeight > container.clientHeight + 2;
  };

  // Load query from URL params on initial load (but not when starting new chat)
  useEffect(() => {
    if (isStartingNewChat) {
      setIsStartingNewChat(false);
      return;
    }
    
    const queryParam = searchParams.get("q");
    if (queryParam && messages.length === 0) {
      let decodedQuery = queryParam;
      try {
        decodedQuery = decodeURIComponent(queryParam);
      } catch (e) {
        console.warn("Failed to decode query param:", e);
        // fallback: use raw queryParam
      }
      setInput(decodedQuery);
    } else if (!queryParam && messages.length === 0) {
      // Clear input if no query param and no messages (fresh start)
      setInput("");
    }
  }, [searchParams, messages.length, isStartingNewChat]);

  // Reset form position when all messages are cleared (except on mobile)
  useEffect(() => {
    if (messages.length === 0 && !isMobile) {
      setIsFormAtBottom(false);
    }
  }, [messages.length, isMobile]);

  // Check if user is at bottom of scroll (container only)
  const isAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    const threshold = 5;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom <= threshold;
    console.log("[SCROLL DEBUG] isAtBottom (container):", {
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
      clientHeight: container.clientHeight,
      distanceFromBottom,
      threshold,
      atBottom,
    });
    return atBottom;
  };

  // Auto-scroll ONLY if already at bottom when new content arrives
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    console.log("[SCROLL DEBUG] Message update triggered:", {
      userHasInteracted: userHasInteracted.current,
      messageCount: messages.length,
      status,
      willAutoScroll: isAtBottomState,
      anchorInView,
      containerMetrics: (function () {
        const c = messagesContainerRef.current;
        if (!c) return null;
        return {
          scrollTop: c.scrollTop,
          scrollHeight: c.scrollHeight,
          clientHeight: c.clientHeight,
        };
      })(),
    });

    // ONLY auto-scroll if sticky is enabled AND streaming/submitted
    const isLoading = status === "submitted" || status === "streaming";
    if (isLoading && shouldStickToBottomRef.current) {
      console.log(
        "[SCROLL DEBUG] AUTO-SCROLLING because stick-to-bottom is enabled"
      );
      // Small delay to let content render
      requestAnimationFrame(() => {
        const c = messagesContainerRef.current;
        if (c && c.scrollHeight > c.clientHeight + 1) {
          console.log("[SCROLL DEBUG] Scrolling container to bottom");
          c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
        } else {
          const doc = document.scrollingElement || document.documentElement;
          const targetTop = doc.scrollHeight;
          console.log("[SCROLL DEBUG] Scrolling window to bottom", {
            targetTop,
          });
          window.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      });
    } else {
      console.log(
        "[SCROLL DEBUG] NOT auto-scrolling - stick-to-bottom disabled"
      );
    }
  }, [messages, status, isAtBottomState, anchorInView]);

  // Handle scroll events to track position and show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      console.log("[SCROLL DEBUG] Container not found in scroll handler!");
      return;
    }

    console.log(
      "[SCROLL DEBUG] Setting up scroll handlers on container:",
      container
    );

    const handleScroll = () => {
      const atBottom = isAtBottom();
      setIsAtBottomState(atBottom);
      console.log(
        "[SCROLL DEBUG] Scroll event fired (container), atBottom:",
        atBottom
      );
      // Disable sticky when not at bottom; re-enable when at bottom
      shouldStickToBottomRef.current = atBottom;
      userHasInteracted.current = !atBottom;
      updateVisibleRange();
    };

    const handleWindowScroll = () => {};

    // Handle wheel events to immediately detect scroll intent
    const handleWheel = (e: WheelEvent) => {
      console.log("[SCROLL DEBUG] Wheel event detected, deltaY:", e.deltaY);

      // If scrolling up, immediately disable auto-scroll
      if (e.deltaY < 0) {
        console.log(
          "[SCROLL DEBUG] User scrolling UP via wheel - disabling auto-scroll"
        );
        userHasInteracted.current = true;
        shouldStickToBottomRef.current = false;
      } else if (e.deltaY > 0) {
        // Check if we're at bottom after scrolling down
        setTimeout(() => {
          const atBottom = isAtBottom();
          if (atBottom) {
            userHasInteracted.current = false; // Reset if back at bottom
            shouldStickToBottomRef.current = true;
            console.log(
              "[SCROLL DEBUG] User scrolled to bottom via wheel - enabling stick-to-bottom"
            );
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
        console.log(
          "[SCROLL DEBUG] Touch scroll UP detected - disabling auto-scroll"
        );
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
        console.log(
          "[SCROLL DEBUG] Global wheel event in container, deltaY:",
          e.deltaY
        );
        if (e.deltaY < 0) {
          console.log(
            "[SCROLL DEBUG] Global scroll UP - disabling auto-scroll"
          );
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
  }, [updateVisibleRange]);

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
      console.log("[SCROLL DEBUG] User submitted message, scrolling to bottom");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      // Check current rate limit status immediately before sending
      const rateLimitStatus = getRateLimitStatus();
      console.log("[Chat Interface] Rate limit check before submit:", rateLimitStatus);
      
      if (!rateLimitStatus.allowed) {
        // Rate limit exceeded - show dialog and don't send message or update URL
        console.log("[Chat Interface] Rate limit exceeded, showing dialog");
        setIsRateLimited(true);
        onRateLimitError?.(rateLimitStatus.resetTime.toISOString());
        return;
      }
      
      console.log("[Chat Interface] Rate limit OK, proceeding with message");
      
      // Store the input to send
      const queryText = input.trim();
      
      // Clear input immediately before sending to prevent any display lag
      setInput("");
      
      // Track user query submission
      track('User Query Submitted', {
        query: queryText,
        queryLength: queryText.length,
        messageCount: messages.length,
        remainingQueries: rateLimitStatus.remaining - 1
      });
      
      updateUrlWithQuery(queryText);
      // Move form to bottom when submitting (always true on mobile, conditional on desktop)
      if (!isFormAtBottom) {
        setIsFormAtBottom(true);
      }
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

  const toggleToolExpansion = (toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const toggleChartExpansion = (toolId: string) => {
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
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if desired
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const updateUrlWithQuery = (query: string) => {
    if (query.trim()) {
      const encodedQuery = encodeURIComponent(query);
      const newUrl = `${window.location.pathname}?q=${encodedQuery}`;
      window.history.replaceState({}, "", newUrl);
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

  const startNewChat = () => {
    // Track new chat start
    track('New Chat Started', {
      previousMessageCount: messages.length,
      hadActiveStream: status === "streaming" || status === "submitted"
    });

    // Stop any ongoing streaming first
    if (status === "streaming" || status === "submitted") {
      stop();
    }

    // Set flag to prevent URL useEffect from restoring input
    setIsStartingNewChat(true);
    
    // Clear input immediately
    setInput("");

    // Small delay to ensure stop completes before clearing other state
    setTimeout(() => {
      // Clear all state
      setMessages([]);
      setEditingMessageId(null);
      setEditingText("");
      setExpandedTools(new Set());
      // Reset form position when starting new chat (keep at bottom on mobile)
      setIsFormAtBottom(isMobile);
      userHasInteracted.current = false; // Reset interaction tracking - enable auto-scroll for new chat
      shouldStickToBottomRef.current = true; // Ensure stickiness for fresh chat

      // Clear the URL query parameter
      router.replace(window.location.pathname, { scroll: false });
      
      // Ensure input stays cleared
      setInput("");
    }, 50);
  };

  const isLoading = status === "submitted" || status === "streaming";
  const canStop = status === "submitted" || status === "streaming";
  const canRegenerate =
    (status === "ready" || status === "error") && messages.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto relative min-h-0">
      {/* Translucent Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/95 dark:to-transparent z-40 pointer-events-none" />

      {/* New Chat Button */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div
            className="fixed top-3 sm:top-6 left-3 sm:left-6 z-45 flex items-center gap-0.5"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Button
              onClick={startNewChat}
              variant="outline"
              size="sm"
              className="transition-all duration-200 rounded-lg h-9 w-9 sm:h-10 sm:w-10 p-0 border-none shadow-none hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <SquarePen className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className={`space-y-4 sm:space-y-8 min-h-[300px] overflow-y-auto overflow-x-hidden ${
          messages.length > 0 ? "pt-20 sm:pt-24" : "pt-2 sm:pt-4"
        } ${isFormAtBottom ? "pb-32 sm:pb-36" : "pb-4 sm:pb-8"}`}
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
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                    className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                      🐍 ML Models
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Advanced Python modeling & simulations
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Analyze GameStop's latest 10-K filing. Extract key financial metrics, identify risk factors, and compare revenue streams vs last year. Show me insider trading activity and institutional ownership changes."
                      )
                    }
                    className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                      📊 SEC Filings
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Deep dive into regulatory filings & insider data
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Research how Trump's latest statements about tech regulation are affecting Elon Musk's companies. Find recent news about Tesla, SpaceX, and X (Twitter) stock movements, analyst reactions, and political implications for the EV industry."
                      )
                    }
                    className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                      🔍 News Impact
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Real-time news analysis & market reactions
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Create an interactive dashboard comparing the 'Magnificent 7' stocks (Apple, Microsoft, Google, Amazon, Tesla, Meta, NVIDIA). Show YTD performance, P/E ratios, market caps, and correlation matrix with beautiful charts."
                      )
                    }
                    className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                      📈 Dashboards
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Interactive visualizations & comparisons
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Analyze PepsiCo's recent SEC filings (10-K, 10-Q, and 8-K). Use Python to calculate key financial metrics (e.g., revenue growth, margins, liquidity), identify significant events and disclosures, then research the fundamental reasons behind management's decisions using recent financial statements."
                      )
                    }
                    className="bg-gray-50 dark:bg-gray-800/50 p-2.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-gray-100">
                      💼 Portfolio Analysis
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Institutional moves & fundamental analysis
                    </div>
                  </motion.button>

                  <motion.button
                    onClick={() =>
                      handlePromptClick(
                        "Do an in-depth report into the effect COVID-19 had on Pfizer. Analyze insider trades made during that time period, research those specific high-profile people involved, look at the company's stock price pre and post COVID, with income statements, balance sheets, and any relevant info from SEC filings around this time. Be thorough and execute code for deep analysis."
                      )
                    }
                    className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-2.5 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 text-left group col-span-1 sm:col-span-2 lg:col-span-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-blue-700 dark:text-blue-300 mb-1.5 sm:mb-2 text-xs sm:text-sm font-medium group-hover:text-blue-900 dark:group-hover:text-blue-100">
                      🚀 Deep Investigation
                    </div>
                    <div className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">
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
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="relative flex items-end">
                  <Textarea
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask a question..."
                    className="w-full resize-none border-gray-200 dark:border-gray-700 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 pr-14 sm:pr-16 min-h-[38px] sm:min-h-[40px] max-h-28 sm:max-h-32 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-0 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto text-sm sm:text-base"
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
                    onClick={canStop ? stop : undefined}
                    disabled={
                      !canStop &&
                      (isLoading || !input.trim() || status === "error")
                    }
                    className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2 rounded-xl h-7 w-7 sm:h-8 sm:w-8 p-0 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
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
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Powered by
                </span>
                <a
                  href="https://platform.valyu.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center hover:scale-105 transition-transform"
                >
                  <Image
                    src="/valyu.svg"
                    alt="Valyu"
                    width={60}
                    height={60}
                    className="h-4 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
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
                  <div className="max-w-[85%] sm:max-w-[80%] bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 sm:px-4 py-3 sm:py-3 relative group shadow-sm">
                    {/* User Message Actions */}
                    <div className="absolute -left-8 sm:-left-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 sm:gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMessage(message.id)}
                        className="h-6 w-6 p-0 bg-white dark:bg-gray-900 rounded-full shadow-sm border border-gray-200 dark:border-gray-700"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMessage(message.id)}
                        className="h-6 w-6 p-0 bg-white dark:bg-gray-900 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {editingMessageId === message.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[80px] border-gray-200 dark:border-gray-600 rounded-xl"
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
                      <div className="text-gray-900 dark:text-gray-100">
                        {message.parts.find((p) => p.type === "text")?.text}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Assistant Message */
                <div className="mb-4 sm:mb-6 group px-3 sm:px-0">
                  {editingMessageId === message.id ? null : (
                    <div className="space-y-4">
                      {(() => {
                        // Group consecutive reasoning steps together
                        const groupedParts: any[] = [];
                        let currentReasoningGroup: any[] = [];

                        message.parts.forEach((part, index) => {
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

                        return groupedParts.map((group, groupIndex) => {
                          if (group.type === "reasoning-group") {
                            // Render combined reasoning component
                            const combinedText = group.parts
                              .map((item: any) => item.part.text)
                              .join("\n\n");
                            const firstPart = group.parts[0].part;
                            const isStreaming = group.parts.some(
                              (item: any) =>
                                item.part.state === "streaming" ||
                                status === "streaming"
                            );

                            return (
                              <ReasoningComponent
                                key={`reasoning-group-${groupIndex}`}
                                part={{ ...firstPart, text: combinedText }}
                                messageId={message.id}
                                index={groupIndex}
                                status={isStreaming ? "streaming" : status}
                                expandedTools={expandedTools}
                                toggleToolExpansion={toggleToolExpansion}
                              />
                            );
                          } else {
                            // Render single part normally
                            const { part, index } = group;

                            switch (part.type) {
                              // Text parts
                              case "text":
                                return (
                                  <div
                                    key={index}
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                  >
                                    <MemoizedMarkdown text={part.text} />
                                  </div>
                                );

                              // Skip individual reasoning parts as they're handled in groups
                              case "reasoning":
                                return null;

                              // Python Executor Tool
                              case "tool-codeExecution": {
                                const callId = part.toolCallId;
                                const isExpanded = expandedTools.has(callId);

                                switch (part.state) {
                                  case "input-streaming":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                                          <span className="text-lg">🐍</span>
                                          <span className="font-medium">
                                            Python Executor
                                          </span>
                                          <Clock className="h-3 w-3 animate-spin" />
                                        </div>
                                        <div className="text-sm text-blue-600 dark:text-blue-300">
                                          Preparing code execution...
                                        </div>
                                      </div>
                                    );
                                  case "input-available":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                                          <span className="text-lg">🐍</span>
                                          <span className="font-medium">
                                            Python Executor
                                          </span>
                                          <Clock className="h-3 w-3 animate-spin" />
                                        </div>
                                        <div className="text-sm text-blue-600 dark:text-blue-300">
                                          <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="font-medium">
                                                {part.input.description ||
                                                  "Executing Python code..."}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  toggleToolExpansion(callId)
                                                }
                                                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                              >
                                                {isExpanded ? (
                                                  <ChevronUp className="h-3 w-3" />
                                                ) : (
                                                  <ChevronDown className="h-3 w-3" />
                                                )}
                                              </Button>
                                            </div>
                                            {isExpanded ? (
                                              <pre className="font-mono text-xs whitespace-pre-wrap bg-white dark:bg-gray-800 p-2 rounded border max-h-48 overflow-y-auto">
                                                {part.input.code}
                                              </pre>
                                            ) : (
                                              <div className="font-mono text-xs text-blue-700 dark:text-blue-300 line-clamp-2">
                                                {part.input.code.split("\n")[0]}
                                                ...
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  case "output-available":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                                          <CheckCircle className="h-4 w-4" />
                                          <span className="font-medium">
                                            Python Execution Result
                                          </span>
                                        </div>
                                        <div className="text-sm text-green-600 dark:text-green-300">
                                          <div className="prose prose-sm max-w-none dark:prose-invert">
                                            <MemoizedMarkdown
                                              text={part.output}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  case "output-error":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                          <AlertCircle className="h-4 w-4" />
                                          <span className="font-medium">
                                            Python Execution Error
                                          </span>
                                        </div>
                                        <div className="text-sm text-red-600 dark:text-red-300">
                                          {part.errorText}
                                        </div>
                                      </div>
                                    );
                                }
                                break;
                              }

                              // Financial Search Tool
                              case "tool-financialSearch": {
                                const callId = part.toolCallId;
                                switch (part.state) {
                                  case "input-streaming":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
                                          <span className="text-lg">🔍</span>
                                          <span className="font-medium">
                                            Financial Search
                                          </span>
                                          <Clock className="h-3 w-3 animate-spin" />
                                        </div>
                                        <div className="text-sm text-purple-600 dark:text-purple-300">
                                          Preparing financial data search...
                                        </div>
                                      </div>
                                    );
                                  case "input-available":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
                                          <span className="text-lg">🔍</span>
                                          <span className="font-medium">
                                            Financial Search
                                          </span>
                                          <Clock className="h-3 w-3 animate-spin" />
                                        </div>
                                        <div className="text-sm text-purple-600 dark:text-purple-300">
                                          <div className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded">
                                            <div className="font-mono text-xs">
                                              Query: &quot;{part.input.query}&quot;
                                              {part.input.dataType &&
                                                part.input.dataType !==
                                                  "auto" && (
                                                  <>
                                                    <br />
                                                    Type: {part.input.dataType}
                                                  </>
                                                )}
                                              {part.input.maxResults && (
                                                <>
                                                  <br />
                                                  Max Results:{" "}
                                                  {part.input.maxResults}
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          <div className="mt-2 text-xs">
                                            Searching financial databases and
                                            news sources...
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  case "output-available":
                                    const financialResults =
                                      extractSearchResults(part.output);
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4"
                                      >
                                        <div className="flex items-center justify-between gap-3 mb-4">
                                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="font-medium">
                                              Financial Search Results
                                            </span>
                                            <span className="text-xs text-green-600 dark:text-green-300">
                                              ({financialResults.length}{" "}
                                              results)
                                            </span>
                                          </div>
                                          {part.input?.query && (
                                            <div
                                              className="text-xs font-mono text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded border border-green-200 dark:border-green-700 max-w-[60%] truncate"
                                              title={part.input.query}
                                            >
                                              {part.input.query}
                                            </div>
                                          )}
                                        </div>
                                        <SearchResultsCarousel
                                          results={financialResults}
                                          type="financial"
                                        />
                                      </div>
                                    );
                                  case "output-error":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                          <AlertCircle className="h-4 w-4" />
                                          <span className="font-medium">
                                            Financial Search Error
                                          </span>
                                        </div>
                                        <div className="text-sm text-red-600 dark:text-red-300">
                                          {part.errorText}
                                        </div>
                                      </div>
                                    );
                                }
                                break;
                              }

                              // Web Search Tool
                              case "tool-webSearch": {
                                const callId = part.toolCallId;
                                switch (part.state) {
                                  case "input-streaming":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 mb-2">
                                          <span className="text-lg">🌐</span>
                                          <span className="font-medium">
                                            Web Search
                                          </span>
                                          <Clock className="h-3 w-3 animate-spin" />
                                        </div>
                                        <div className="text-sm text-cyan-600 dark:text-cyan-300">
                                          Preparing web search...
                                        </div>
                                      </div>
                                    );
                                  case "input-available":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 mb-2">
                                          <span className="text-lg">🌐</span>
                                          <span className="font-medium">
                                            Web Search
                                          </span>
                                          <Clock className="h-3 w-3 animate-spin" />
                                        </div>
                                        <div className="text-sm text-cyan-600 dark:text-cyan-300">
                                          <div className="bg-cyan-100 dark:bg-cyan-800/30 p-2 rounded">
                                            <div className="text-xs">
                                              Searching for: &quot;{part.input.query}&quot;
                                            </div>
                                          </div>
                                          <div className="mt-2 text-xs">
                                            Searching the world wide web...
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  case "output-available":
                                    const webResults = extractSearchResults(
                                      part.output
                                    );
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4"
                                      >
                                        <div className="flex items-center justify-between gap-3 mb-4">
                                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                            <CheckCircle className="h-4 w-4" />
                                            <span className="font-medium">
                                              Web Search Results
                                            </span>
                                            <span className="text-xs text-blue-600 dark:text-blue-300">
                                              ({webResults.length} results)
                                            </span>
                                          </div>
                                          {part.input?.query && (
                                            <div
                                              className="text-xs font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded border border-blue-200 dark:border-blue-700 max-w-[60%] truncate"
                                              title={part.input.query}
                                            >
                                              {part.input.query}
                                            </div>
                                          )}
                                        </div>
                                        <SearchResultsCarousel
                                          results={webResults}
                                          type="web"
                                        />
                                      </div>
                                    );
                                  case "output-error":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                          <AlertCircle className="h-4 w-4" />
                                          <span className="font-medium">
                                            Web Search Error
                                          </span>
                                        </div>
                                        <div className="text-sm text-red-600 dark:text-red-300">
                                          {part.errorText}
                                        </div>
                                      </div>
                                    );
                                }
                                break;
                              }

                              // Chart Creation Tool
                              case "tool-createChart": {
                                const callId = part.toolCallId;
                                switch (part.state) {
                                  case "input-streaming":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                                          <span className="text-lg">📈</span>
                                          <span className="font-medium">
                                            Creating Chart
                                          </span>
                                          <Clock className="h-3 w-3 animate-spin" />
                                        </div>
                                        <div className="text-sm text-emerald-600 dark:text-emerald-300">
                                          Preparing chart visualization...
                                        </div>
                                      </div>
                                    );
                                  case "input-available":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                                          <span className="text-lg">📈</span>
                                          <span className="font-medium">
                                            Creating Chart
                                          </span>
                                          <Clock className="h-3 w-3 animate-spin" />
                                        </div>
                                        <div className="text-sm text-emerald-600 dark:text-emerald-300">
                                          <div className="bg-emerald-100 dark:bg-emerald-800/30 p-2 rounded">
                                            <div className="font-mono text-xs">
                                              Creating {part.input.type} chart:
                                              &quot;{part.input.title}&quot;
                                              <br />
                                              Data Series:{" "}
                                              {part.input.dataSeries?.length ||
                                                0}
                                            </div>
                                          </div>
                                          <div className="mt-2 text-xs">
                                            Generating interactive
                                            visualization...
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  case "output-available":
                                    // Charts are expanded by default, collapsed only if explicitly set
                                    const isChartExpanded = !expandedTools.has(
                                      `collapsed-${callId}`
                                    );
                                    return (
                                      <div key={callId} className="mt-2">
                                        {isChartExpanded ? (
                                          <div className="relative">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                toggleChartExpansion(callId)
                                              }
                                              className="absolute right-2 top-2 z-10 h-6 w-6 p-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-sm"
                                            >
                                              <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <FinancialChart {...part.output} />
                                          </div>
                                        ) : (
                                          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <span className="text-lg">
                                                  📈
                                                </span>
                                                <span className="font-medium">
                                                  {part.output.title}
                                                </span>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  toggleChartExpansion(callId)
                                                }
                                                className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                              >
                                                <ChevronDown className="h-4 w-4" />
                                              </Button>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                              <div>
                                                Chart Type:{" "}
                                                {part.output.chartType}
                                              </div>
                                              <div>
                                                Data Series:{" "}
                                                {part.output.dataSeries
                                                  ?.length || 0}
                                              </div>
                                              {part.output.description && (
                                                <div className="text-xs">
                                                  {part.output.description}
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-center mt-3">
                                              <button
                                                onClick={() =>
                                                  toggleChartExpansion(callId)
                                                }
                                                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                                              >
                                                View Chart
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  case "output-error":
                                    return (
                                      <div
                                        key={callId}
                                        className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2 sm:p-3"
                                      >
                                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                          <AlertCircle className="h-4 w-4" />
                                          <span className="font-medium">
                                            Chart Creation Error
                                          </span>
                                        </div>
                                        <div className="text-sm text-red-600 dark:text-red-300">
                                          {part.errorText}
                                        </div>
                                      </div>
                                    );
                                }
                                break;
                              }

                              // Generic dynamic tool fallback (for future tools)
                              case "dynamic-tool":
                                return (
                                  <div
                                    key={index}
                                    className="mt-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-2 sm:p-3"
                                  >
                                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
                                      <Wrench className="h-4 w-4" />
                                      <span className="font-medium">
                                        Tool: {part.toolName}
                                      </span>
                                    </div>
                                    <div className="text-sm text-purple-600 dark:text-purple-300">
                                      {part.state === "input-streaming" && (
                                        <pre className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded text-xs">
                                          {JSON.stringify(part.input, null, 2)}
                                        </pre>
                                      )}
                                      {part.state === "output-available" && (
                                        <pre className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded text-xs">
                                          {JSON.stringify(part.output, null, 2)}
                                        </pre>
                                      )}
                                      {part.state === "output-error" && (
                                        <div className="text-red-600 dark:text-red-300">
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
                        });
                      })()}
                    </div>
                  )}

                  {/* Message Actions */}
                  {message.role === "assistant" && (
                    <div className="flex justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {messages[messages.length - 1]?.id === message.id &&
                        canRegenerate && (
                          <Button
                            onClick={() => {
                              track('Message Regenerated', {
                                messageCount: messages.length,
                                lastMessageRole: messages[messages.length - 1]?.role
                              });
                              regenerate();
                            }}
                            variant="ghost"
                            size="sm"
                            disabled={status !== "ready" && status !== "error"}
                            className="h-7 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}

                      {!isLoading && (
                        <Button
                          onClick={() =>
                            copyToClipboard(getMessageText(message))
                          }
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
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
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="flex items-start gap-2">
                  <div className="text-amber-600 dark:text-amber-400 text-lg mt-0.5">
                    ☕
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 max-w-xs">
                    <div className="text-amber-700 dark:text-amber-300 text-sm">
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
              style={{
                background:
                  "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 30%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0) 100%)",
              }}
            >
              <div
                className="dark:hidden absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.98) 30%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,0) 100%)",
                }}
              />
              <div
                className="hidden dark:block absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(3,7,18,1) 0%, rgba(3,7,18,0.98) 30%, rgba(3,7,18,0.8) 60%, rgba(3,7,18,0) 100%)",
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Something went wrong</span>
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">
            Please check your API keys and try again.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="mt-2 text-red-700 border-red-300 hover:bg-red-100 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Input Form at bottom */}
      <AnimatePresence>
        {(isFormAtBottom || isMobile) && (
          <motion.div
            className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-3xl px-3 sm:px-6 pt-4 sm:pt-5 pb-6 sm:pb-7 z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="relative flex items-end">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask a question..."
                  className="w-full resize-none border-gray-200 dark:border-gray-700 rounded-2xl px-4 sm:px-4 py-3 sm:py-3 pr-14 sm:pr-16 min-h-[44px] sm:min-h-[48px] max-h-28 sm:max-h-32 focus:border-gray-300 dark:focus:border-gray-600 focus:ring-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm overflow-y-auto text-base shadow-lg border"
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
                  onClick={canStop ? stop : undefined}
                  disabled={
                    !canStop &&
                    (isLoading || !input.trim() || status === "error")
                  }
                  className="absolute right-2 sm:right-2 bottom-2 sm:bottom-2 rounded-xl h-8 w-8 sm:h-9 sm:w-9 p-0 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 shadow-lg"
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

              {status === "streaming" && (
                <div className="text-center mt-2 hidden sm:block">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Press Esc to stop • Shift+Enter for new line
                  </span>
                </div>
              )}
            </form>

            {/* Mobile Bottom Bar - Social links and disclaimer below input */}
            <motion.div 
              className="block sm:hidden mt-4 pt-3 border-t border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="flex items-center justify-center space-x-4">
                  <SocialLinks />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                  Not financial advice.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
