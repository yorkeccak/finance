'use client';

import { useEffect, useState } from 'react';
import { OllamaStatusIndicator } from './ollama-status-indicator';

interface OllamaStatusWrapperProps {
  hasMessages?: boolean;
}

export function OllamaStatusWrapper({ hasMessages }: OllamaStatusWrapperProps) {
  const [isDevelopmentMode, setIsDevelopmentMode] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we're in development mode by making a single API call
    const checkMode = async () => {
      try {
        const response = await fetch('/api/ollama-status');
        const data = await response.json();
        setIsDevelopmentMode(data.mode === 'development');
      } catch (error) {
        // If API call fails, assume production mode
        setIsDevelopmentMode(false);
      }
    };

    checkMode();
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
