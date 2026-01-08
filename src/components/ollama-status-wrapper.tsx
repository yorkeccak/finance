'use client';

import { useEffect, useState } from 'react';
import { OllamaStatusIndicator } from './ollama-status-indicator';

interface OllamaStatusWrapperProps {
  hasMessages?: boolean;
}

export function OllamaStatusWrapper({ hasMessages }: OllamaStatusWrapperProps) {
  const [isSelfHostedMode, setIsSelfHostedMode] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we're in self-hosted mode by making a single API call
    const checkMode = async () => {
      try {
        const response = await fetch('/api/ollama-status');
        const data = await response.json();
        setIsSelfHostedMode(data.mode === 'self-hosted');
      } catch (error) {
        // If API call fails, assume valyu mode
        setIsSelfHostedMode(false);
      }
    };

    checkMode();
  }, []);

  // Don't render anything until we know the mode
  if (isSelfHostedMode === null) {
    return null;
  }

  // Only render the indicator in self-hosted mode
  if (!isSelfHostedMode) {
    return null;
  }

  return <OllamaStatusIndicator hasMessages={hasMessages} />;
}
