"use client";

import React, { useState, useEffect } from "react";
import { getFaviconUrl } from "@/lib/favicon";

interface FaviconProps {
  url: string;           // Full website URL
  size?: number;         // Pixel size (default: 16)
  className?: string;    // Tailwind classes
  alt?: string;          // Alt text
}

export function Favicon({
  url,
  size = 16,
  className = "w-4 h-4",
  alt = ""
}: FaviconProps) {
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const faviconUrl = getFaviconUrl(url, size);

  // Only render on client to avoid SSR fetch errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide if URL is invalid or image fails to load or not mounted yet
  if (!mounted || !faviconUrl || imageError) {
    return null;
  }

  return (
    <img
      src={faviconUrl}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => {
        setImageError(true);
        // Suppress error logging in console
        e.preventDefault();
      }}
      // Suppress network errors from appearing in console
      suppressHydrationWarning
    />
  );
}
