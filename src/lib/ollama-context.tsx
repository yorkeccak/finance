'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface OllamaContextType {
  selectedModel: string | null;
  setSelectedModel: (model: string) => void;
}

const OllamaContext = createContext<OllamaContextType | undefined>(undefined);

export function OllamaProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  return (
    <OllamaContext.Provider value={{ selectedModel, setSelectedModel }}>
      {children}
    </OllamaContext.Provider>
  );
}

export function useOllama() {
  const context = useContext(OllamaContext);
  if (context === undefined) {
    throw new Error('useOllama must be used within an OllamaProvider');
  }
  return context;
}
