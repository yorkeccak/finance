'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type LocalProvider = 'ollama' | 'lmstudio';

interface LocalProviderContextType {
  selectedModel: string | null;
  setSelectedModel: (model: string) => void;
  selectedProvider: LocalProvider;
  setSelectedProvider: (provider: LocalProvider) => void;
}

const LocalProviderContext = createContext<LocalProviderContextType | undefined>(undefined);

export function OllamaProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('local-model-selected') || null;
    }
    return null;
  });
  const [selectedProvider, setSelectedProvider] = useState<LocalProvider>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('local-provider-selected') as LocalProvider | null;
      return saved || 'lmstudio';
    }
    return 'lmstudio';
  });

  // Persist selected model to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedModel) {
      localStorage.setItem('local-model-selected', selectedModel);
    }
  }, [selectedModel]);

  // Persist selected provider to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('local-provider-selected', selectedProvider);
    }
  }, [selectedProvider]);

  return (
    <LocalProviderContext.Provider value={{
      selectedModel,
      setSelectedModel,
      selectedProvider,
      setSelectedProvider
    }}>
      {children}
    </LocalProviderContext.Provider>
  );
}

export function useOllama() {
  const context = useContext(LocalProviderContext);
  if (context === undefined) {
    throw new Error('useOllama must be used within an OllamaProvider');
  }
  return context;
}

// Alias for better naming
export const useLocalProvider = useOllama;
