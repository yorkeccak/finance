'use client';

import { useEffect, useState } from 'react';
import { OllamaStatusIndicator } from './ollama-status-indicator';

interface OllamaStatusWrapperProps {
  hasMessages?: boolean;
}

export function OllamaStatusWrapper({ hasMessages }: OllamaStatusWrapperProps) {
  const [isDevelopmentMode, setIsDevelopmentMode] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we're in development mode using environment variable instead of API call
    setIsDevelopmentMode(process.env.NEXT_PUBLIC_APP_MODE === 'development');
  }, []);

  // Don't render anything until we know the mode
  if (isDevelopmentMode === null) {
    return null;
  }

  // Only render the indicator in development mode
  if (!isDevelopmentMode) {
    return null;
  }

  return <OllamaStatusIndicator hasMessages={hasMessages} />;
}
