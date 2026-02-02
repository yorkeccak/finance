"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minimize2, ChevronDown, ChevronUp, Check, Wrench, Brain } from "lucide-react";
import Image from "next/image";
import { useLocalProvider, type LocalProvider } from "@/lib/ollama-context";

interface LocalModel {
  name: string;
  size: number;
  modified_at: string;
}

interface ProviderStatus {
  connected: boolean;
  available: boolean;
  mode: 'self-hosted' | 'valyu';
  baseUrl?: string;
  models?: LocalModel[];
  message: string;
  error?: string;
}

// Models that support tools (function calling)
const TOOL_SUPPORT_MODELS = [
  'llama3.1', 'llama3.2', 'llama3.3',
  'qwen', 'qwq',
  'gemma', 'gemma2',
  'mistral', 'mixtral',
  'deepseek',
  'phi', 'phi3', 'phi4'
];

// Models that support thinking/reasoning
const THINKING_SUPPORT_MODELS = [
  'deepseek-r1', 'qwq', 'qwen3', 'phi4-reasoning', 'cogito'
];

export function LocalModelStatus() {
  const [ollamaStatus, setOllamaStatus] = useState<ProviderStatus | null>(null);
  const [lmstudioStatus, setLMStudioStatus] = useState<ProviderStatus | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedModel, setSelectedModel, selectedProvider, setSelectedProvider } = useLocalProvider();
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ollama-enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const checkProviderStatus = async (provider: LocalProvider): Promise<ProviderStatus> => {
    const endpoint = provider === 'ollama' ? '/api/ollama-status' : '/api/lmstudio-status';
    try {
      const response = await fetch(endpoint);
      const data = await response.json();

      // Filter out embedding models for LM Studio
      if (provider === 'lmstudio' && data.models) {
        data.models = data.models.filter((m: LocalModel) =>
          !m.name.includes('embed') &&
          !m.name.includes('embedding') &&
          !m.name.includes('nomic')
        );
      }

      return data;
    } catch (error) {
      return {
        connected: false,
        available: false,
        mode: 'valyu' as const,
        message: `Failed to check ${provider} status`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const checkBothProviders = async () => {
    const [ollama, lmstudio] = await Promise.all([
      checkProviderStatus('ollama'),
      checkProviderStatus('lmstudio')
    ]);
    setOllamaStatus(ollama);
    setLMStudioStatus(lmstudio);

    console.log('[LocalModelStatus] Provider status - Ollama:', ollama.connected, 'LM Studio:', lmstudio.connected);
    console.log('[LocalModelStatus] Current state - Provider:', selectedProvider, 'Model:', selectedModel);

    // Auto-switch to available provider if current one is offline
    if (selectedProvider === 'ollama' && !ollama.connected && lmstudio.connected) {
      console.log('[LocalModelStatus] Auto-switching from Ollama to LM Studio');
      setSelectedProvider('lmstudio');
      // Only auto-select first model if no model is selected
      if (!selectedModel && lmstudio.models && lmstudio.models.length > 0) {
        setSelectedModel(lmstudio.models[0].name);
        console.log('[LocalModelStatus] Auto-selected LM Studio model:', lmstudio.models[0].name);
      }
    } else if (selectedProvider === 'lmstudio' && !lmstudio.connected && ollama.connected) {
      console.log('[LocalModelStatus] Auto-switching from LM Studio to Ollama');
      setSelectedProvider('ollama');
      // Only auto-select first model if no model is selected
      if (!selectedModel && ollama.models && ollama.models.length > 0) {
        setSelectedModel(ollama.models[0].name);
        console.log('[LocalModelStatus] Auto-selected Ollama model:', ollama.models[0].name);
      }
    } else if (!selectedModel) {
      // Auto-select first available model ONLY if none is selected
      const currentStatus = selectedProvider === 'ollama' ? ollama : lmstudio;
      if (currentStatus.connected && currentStatus.models && currentStatus.models.length > 0) {
        setSelectedModel(currentStatus.models[0].name);
        console.log('[LocalModelStatus] Auto-selected first model from', selectedProvider, ':', currentStatus.models[0].name);
      }
    } else {
      console.log('[LocalModelStatus] Keeping existing model selection:', selectedModel);
    }
  };

  useEffect(() => {
    checkBothProviders();
    const interval = setInterval(checkBothProviders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ollama-enabled', String(isEnabled));
    }
  }, [isEnabled]);

  if (process.env.NEXT_PUBLIC_APP_MODE !== "self-hosted") {
    return null;
  }

  const currentStatus = selectedProvider === 'ollama' ? ollamaStatus : lmstudioStatus;
  const isOnline = currentStatus?.connected || false;
  const models = currentStatus?.models || [];

  const availableProviders = [
    ollamaStatus?.connected && { type: 'ollama' as const, status: ollamaStatus },
    lmstudioStatus?.connected && { type: 'lmstudio' as const, status: lmstudioStatus }
  ].filter(Boolean) as Array<{ type: LocalProvider; status: ProviderStatus }>;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const providerDisplayName = selectedProvider === 'lmstudio' ? 'LM Studio' : 'Ollama';
  const providerLogo = selectedProvider === 'lmstudio' ? '/lmstudio.png' : '/ollama.png';

  // Check if any provider is connected
  const anyConnected = ollamaStatus?.connected || lmstudioStatus?.connected;
  const ollamaConnected = ollamaStatus?.connected || false;
  const lmStudioConnected = lmstudioStatus?.connected || false;

  return (
    <>
      {/* Minimized button - ALWAYS show BOTH provider icons */}
      {isMinimized && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => setIsMinimized(false)}
          className={`fixed top-6 right-6 z-40 px-2.5 py-2 rounded-xl shadow-lg transition-all ${
            anyConnected && isEnabled
              ? "bg-white dark:bg-gray-900 border-green-500 hover:shadow-xl hover:scale-105"
              : anyConnected && !isEnabled
              ? "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:shadow-xl hover:scale-105"
              : "bg-white dark:bg-gray-900 border-red-500 hover:shadow-xl hover:scale-105"
          } border-2`}
        >
          <div className="flex items-center gap-1.5">
            {/* LM Studio icon */}
            <div className="relative">
              <Image
                src="/lmstudio.png"
                alt="LM Studio"
                width={20}
                height={20}
                className={`transition-all ${
                  lmStudioConnected && isEnabled
                    ? "opacity-100"
                    : "opacity-30 grayscale"
                }`}
              />
              {lmStudioConnected && isEnabled && selectedProvider === 'lmstudio' && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
              )}
            </div>

            {/* Ollama icon */}
            <div className="relative">
              <Image
                src="/ollama.png"
                alt="Ollama"
                width={20}
                height={20}
                className={`transition-all ${
                  ollamaConnected && isEnabled
                    ? "opacity-100"
                    : "opacity-30 grayscale"
                }`}
              />
              {ollamaConnected && isEnabled && selectedProvider === 'ollama' && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
              )}
            </div>
          </div>
        </motion.button>
      )}

      {/* Full popup */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-40 w-80"
          >
            <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-5 relative">
              <button
                onClick={() => setIsMinimized(true)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>

              {/* Header with logo */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Image
                    src={providerLogo}
                    alt={providerDisplayName}
                    width={32}
                    height={32}
                    className={`transition-all ${
                      isOnline && isEnabled
                        ? "opacity-100"
                        : "opacity-50 grayscale"
                    }`}
                  />
                  {isOnline && isEnabled && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
                  )}
                </div>
                <div className="flex-1 pr-8">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {providerDisplayName}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        isOnline && isEnabled
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : isOnline && !isEnabled
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {isOnline ? (isEnabled ? "Active" : "Disabled") : "Offline"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {currentStatus?.baseUrl || (selectedProvider === 'ollama' ? 'localhost:11434' : 'localhost:1234')}
                  </p>
                </div>
              </div>

              {/* Provider Switcher - Always show both options */}
              <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Provider</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedProvider('ollama')}
                    disabled={!ollamaStatus?.connected}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 ${
                      selectedProvider === 'ollama'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : ollamaStatus?.connected
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Image
                      src="/ollama.png"
                      alt="Ollama"
                      width={16}
                      height={16}
                      className={ollamaStatus?.connected ? '' : 'opacity-50 grayscale'}
                    />
                    <span>Ollama</span>
                  </button>
                  <button
                    onClick={() => setSelectedProvider('lmstudio')}
                    disabled={!lmstudioStatus?.connected}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 ${
                      selectedProvider === 'lmstudio'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : lmstudioStatus?.connected
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Image
                      src="/lmstudio.png"
                      alt="LM Studio"
                      width={16}
                      height={16}
                      className={lmstudioStatus?.connected ? '' : 'opacity-50 grayscale'}
                    />
                    <span>LM Studio</span>
                  </button>
                </div>
              </div>

              {isOnline && (
                <>
                  {/* Toggle */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Use {providerDisplayName}
                    </span>
                    <button
                      onClick={() => setIsEnabled(!isEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled
                          ? "bg-green-500"
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Models list */}
                  <div>
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="flex items-center justify-between w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <div className="flex flex-col items-start">
                        <span>{models.length} model{models.length !== 1 ? 's' : ''} available</span>
                        {selectedModel && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                            Using: {selectedModel}
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                            {models.map((model) => {
                              const isSelected = model.name === selectedModel;

                              // Check model capabilities
                              const supportsTools = TOOL_SUPPORT_MODELS.some(toolModel =>
                                model.name.toLowerCase().includes(toolModel.toLowerCase())
                              );
                              const supportsThinking = THINKING_SUPPORT_MODELS.some(thinkModel =>
                                model.name.toLowerCase().includes(thinkModel.toLowerCase())
                              );

                              return (
                                <button
                                  key={model.name}
                                  onClick={() => setSelectedModel(model.name)}
                                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                                    isSelected
                                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500"
                                      : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <div className={`font-medium text-sm truncate ${
                                          isSelected
                                            ? "text-blue-900 dark:text-blue-100"
                                            : "text-gray-900 dark:text-gray-100"
                                        }`}>
                                          {model.name}
                                        </div>
                                        {supportsTools && (
                                          <span title="Supports tool calling">
                                            <Wrench
                                              className={`h-3 w-3 flex-shrink-0 ${
                                                isSelected
                                                  ? "text-blue-600 dark:text-blue-400"
                                                  : "text-gray-500 dark:text-gray-400"
                                              }`}
                                            />
                                          </span>
                                        )}
                                        {supportsThinking && (
                                          <span title="Supports thinking/reasoning">
                                            <Brain
                                              className={`h-3 w-3 flex-shrink-0 ${
                                                isSelected
                                                  ? "text-blue-600 dark:text-blue-400"
                                                  : "text-gray-500 dark:text-gray-400"
                                              }`}
                                            />
                                          </span>
                                        )}
                                      </div>
                                      <div className={`text-xs mt-1 ${
                                        isSelected
                                          ? "text-blue-700 dark:text-blue-300"
                                          : "text-gray-500 dark:text-gray-400"
                                      }`}>
                                        {formatSize(model.size)}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
