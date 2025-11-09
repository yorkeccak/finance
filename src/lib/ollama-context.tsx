'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type LocalProvider = 'ollama' | 'lmstudio';

interface LocalProviderContextType {
  selectedModel: string | null;
  setSelectedModel: (model: string) => void;
  selectedProvider: LocalProvider;
  setSelectedProvider: (provider: LocalProvider) => void;
}

const LocalProviderContext = createContext<LocalProviderContextType | undefined>(undefined);

export function OllamaProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<LocalProvider>('ollama');

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
