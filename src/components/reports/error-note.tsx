"use client";

import { ExternalLink } from "lucide-react";

/** A credit/billing error → offer a top-up link. */
const CREDIT_RE = /credit|insufficient|top\s*up/i;

/**
 * Inline error text in the theme's destructive color. When the message is about
 * Valyu credits, appends an actionable "Top up →" link to the Valyu platform.
 */
export function ErrorNote({ message, className = "" }: { message: string; className?: string }) {
  return (
    <div className={`text-xs text-destructive ${className}`}>
      {message}
      {CREDIT_RE.test(message) && (
        <>
          {" "}
          <a
            href="https://platform.valyu.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2 hover:no-underline"
          >
            Top up <ExternalLink className="h-3 w-3" />
          </a>
        </>
      )}
    </div>
  );
}
