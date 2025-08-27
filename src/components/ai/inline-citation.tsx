"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { ExternalLink, FileText, ChevronLeft, ChevronRight } from "lucide-react";

// Container for citation text and card
export const InlineCitation = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("inline-flex items-baseline gap-0.5", className)}
    {...props}
  />
));
InlineCitation.displayName = "InlineCitation";

// Styled text that shows hover effects
export const InlineCitationText = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("relative", className)}
    {...props}
  />
));
InlineCitationText.displayName = "InlineCitationText";

// Hover card container for citation details with instant opening
export const InlineCitationCard = React.forwardRef<
  React.ComponentRef<typeof HoverCardPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Root>
>((props, ref) => (
  <HoverCardPrimitive.Root openDelay={0} closeDelay={100} {...props} />
));
InlineCitationCard.displayName = "InlineCitationCard";

// Badge trigger showing source hostname and count
export const InlineCitationCardTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Badge> & { sources: string[] }
>(({ sources, className, ...props }, ref) => {
  const getHostname = React.useCallback((url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, "");
    } catch {
      return "source";
    }
  }, []);

  const firstSource = sources.length > 0 ? sources[0] : "";
  const hostname = React.useMemo(() => getHostname(firstSource), [firstSource, getHostname]);
  const count = sources.length > 1 ? ` +${sources.length - 1}` : "";
  
  // Check if it's a special source that needs a logo
  const isValyu = React.useMemo(() => 
    hostname.includes('valyu') || hostname.includes('deepfinance'),
    [hostname]
  );
  const isWiley = React.useMemo(() => 
    hostname.includes('wiley') || 
    hostname.includes('onlinelibrary.wiley') ||
    firstSource.includes('isbn'),
    [hostname, firstSource]
  );

  const badgeContent = React.useMemo(() => {
    if (isValyu) {
      return (
        <>
          <img 
            src="/valyu.svg" 
            alt="Valyu" 
            className="h-6 w-6 inline-block"
            loading="eager"
            decoding="async"
          />
          {count}
        </>
      );
    }
    if (isWiley) {
      return (
        <>
          <img 
            src="/wy.svg" 
            alt="Wiley" 
            className="h-6 w-6 inline-block opacity-80"
            loading="eager"
            decoding="async"
            style={{ filter: 'none' }}
          />
          {count}
        </>
      );
    }
    return <>{hostname}{count}</>;
  }, [isValyu, isWiley, hostname, count]);

  return (
    <HoverCardPrimitive.Trigger asChild>
      <Badge
        ref={ref}
        variant="secondary"
        className={cn(
          "ml-0.5 px-1.5 py-0 h-5 text-[10px] font-normal cursor-pointer hover:bg-secondary/80 inline-flex items-center gap-0.5 relative",
          "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
          "border-blue-200 dark:border-blue-800",
          className
        )}
        {...props}
      >
        {badgeContent}
      </Badge>
    </HoverCardPrimitive.Trigger>
  );
});
InlineCitationCardTrigger.displayName = "InlineCitationCardTrigger";

// Content container for citation details with proper positioning
export const InlineCitationCardBody = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof HoverCardPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        ref={ref}
        className={cn(
          "z-[99999] w-[400px] p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        sideOffset={5}
        side="bottom"
        align="center"
        alignOffset={-200}
        collisionPadding={20}
        avoidCollisions={true}
        {...props}
      >
        <div className="w-full">
          {children}
        </div>
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Portal>
  );
});
InlineCitationCardBody.displayName = "InlineCitationCardBody";

// Carousel for navigating multiple citations
export const InlineCitationCarousel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Carousel>
>(({ className, ...props }, ref) => (
  <Carousel
    ref={ref}
    className={cn("w-full relative", className)}
    opts={{
      align: "start",
      loop: true,
      containScroll: false,
      skipSnaps: false,
      dragFree: false
    }}
    {...props}
  />
));
InlineCitationCarousel.displayName = "InlineCitationCarousel";

// Carousel header with navigation controls
export const InlineCitationCarouselHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } = useCarousel();
  
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between px-3 py-2 border-b",
        className
      )}
      {...props}
    >
      {children}
      <div className="flex items-center gap-1">
        <button
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous citation"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next citation"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
});
InlineCitationCarouselHeader.displayName = "InlineCitationCarouselHeader";

// Carousel index display
export const InlineCitationCarouselIndex = () => {
  const { api } = useCarousel();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (count <= 1) return null;

  return (
    <div className="text-xs text-muted-foreground">
      {current} of {count}
    </div>
  );
};

// Content wrapper for carousel items
export const InlineCitationCarouselContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof CarouselContent>
>(({ className, ...props }, ref) => (
  <CarouselContent
    ref={ref}
    className={cn("-ml-0", className)}
    {...props}
  />
));
InlineCitationCarouselContent.displayName = "InlineCitationCarouselContent";

// Individual citation item in carousel
export const InlineCitationCarouselItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof CarouselItem>
>(({ className, ...props }, ref) => (
  <CarouselItem
    ref={ref}
    className={cn("pl-0 basis-full", className)}
    {...props}
  />
));
InlineCitationCarouselItem.displayName = "InlineCitationCarouselItem";

// Source information display
export const InlineCitationSource = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    title: string;
    url: string;
    description?: string;
    date?: string;
    authors?: string[];
    doi?: string;
    relevanceScore?: number;
  }
>(({ title, url, description, date, authors, doi, relevanceScore, className, ...props }, ref) => {
  const getHostname = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, "");
    } catch {
      return "source";
    }
  };

  return (
    <div
      ref={ref}
      className={cn("p-3 space-y-1.5 w-full", className)}
      {...props}
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-medium leading-tight line-clamp-2 flex-1">
            {title}
          </h4>
          <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
        </div>
        
        {description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
        <span className="truncate max-w-[100px]">{getHostname(url)}</span>
        {date && (
          <>
            <span>·</span>
            <span className="truncate max-w-[60px]">{date}</span>
          </>
        )}
        {relevanceScore !== undefined && (
          <>
            <span>·</span>
            <span>{Math.round(relevanceScore * 100)}%</span>
          </>
        )}
      </div>

      {authors && authors.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          <span className="font-medium">Authors:</span> {authors.slice(0, 2).join(", ")}
          {authors.length > 2 && ` +${authors.length - 2}`}
        </div>
      )}

      {doi && (
        <div className="text-[10px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded inline-block">
          DOI: {doi}
        </div>
      )}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        View source
      </a>
    </div>
  );
});
InlineCitationSource.displayName = "InlineCitationSource";

// Styled blockquote for excerpts
export const InlineCitationQuote = React.forwardRef<
  HTMLQuoteElement,
  React.ComponentProps<"blockquote">
>(({ className, ...props }, ref) => (
  <blockquote
    ref={ref}
    className={cn(
      "px-3 py-2 mt-2 text-xs italic border-l-2 border-muted-foreground/20 bg-muted/50",
      className
    )}
    {...props}
  />
));
InlineCitationQuote.displayName = "InlineCitationQuote";