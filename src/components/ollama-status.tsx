"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Minimize2, ChevronDown, ChevronUp, Maximize2, Check, Wrench, Brain } from "lucide-react";
import Image from "next/image";
import { useOllama } from "@/lib/ollama-context";

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

// Models that support tools (function calling)
const TOOL_SUPPORT_MODELS = [
  'gpt-oss', 'deepseek-r1', 'qwen3-coder', 'qwen3', 'deepseek-v3.1', 'llama3.1', 'llama3.2',
  'mistral', 'qwen2.5', 'qwen2.5-coder', 'mistral-nemo', 'llama3.3', 'mistral-small',
  'smollm2', 'qwq', 'mixtral', 'llama4', 'mistral-small3.2', 'cogito', 'granite3.3',
  'phi4-mini', 'devstral', 'granite3.2-vision', 'command-r', 'hermes3', 'mistral-large',
  'granite3-dense', 'granite4', 'granite3.1-dense', 'granite3.2', 'llama3-groq-tool-use',
  'athene-v2', 'nemotron', 'granite3-moe', 'aya-expanse', 'command-r7b', 'command-a',
  'nemotron-mini', 'firefunction-v2', 'command-r7b-arabic', 'magistral', 'gpt-oss-safeguard',
  'qwen2'
];

// Models that support thinking/reasoning
const THINKING_SUPPORT_MODELS = [
  'gpt-oss', 'deepseek-r1', 'qwen3', 'deepseek-v3.1', 'magistral', 'gpt-oss-safeguard',
  'kimi-k2-thinking'
];

const OllamaStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const { selectedModel, setSelectedModel } = useOllama();
  const [isEnabled, setIsEnabled] = useState(() => {
    // Get initial state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ollama-enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  useEffect(() => {
    const checkOllama = async () => {
      try {
        const response = await fetch("http://localhost:11434/api/tags", {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();
          setIsOnline(true);
          const modelsList = data.models || [];
          setModels(modelsList);

          // Auto-select first model if none selected
          if (modelsList.length > 0 && !selectedModel) {
            setSelectedModel(modelsList[0].name);
          }
        } else {
          setIsOnline(false);
          setModels([]);
        }
      } catch (error) {
        setIsOnline(false);
        setModels([]);
      }
    };

    // Check immediately
    checkOllama();

    // Check every 5 seconds
    const interval = setInterval(checkOllama, 5000);

    return () => clearInterval(interval);
  }, [selectedModel, setSelectedModel]);

  useEffect(() => {
    // Save to localStorage whenever it changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('ollama-enabled', String(isEnabled));
    }
  }, [isEnabled]);

  // Only show in development mode
  if (process.env.NEXT_PUBLIC_APP_MODE !== "development") {
    return null;
  }

  // Don't show if status is unknown
  if (isOnline === null) {
    return null;
  }

  // Format file size
  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <>
      {/* Minimized button */}
      {isMinimized && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => setIsMinimized(false)}
          className={`fixed top-6 right-6 z-40 p-2.5 rounded-xl shadow-lg transition-all ${
            isOnline && isEnabled
              ? "bg-white dark:bg-gray-900 border-green-500 hover:shadow-xl hover:scale-105"
              : isOnline && !isEnabled
              ? "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:shadow-xl hover:scale-105"
              : "bg-white dark:bg-gray-900 border-red-500 hover:shadow-xl hover:scale-105"
          } border-2`}
        >
          <div className="relative">
            <Image
              src="/ollama.png"
              alt="Ollama"
              width={24}
              height={24}
              className={`transition-all ${
                isOnline && isEnabled
                  ? "opacity-100"
                  : isOnline && !isEnabled
                  ? "opacity-50 grayscale"
                  : "opacity-50 grayscale"
              }`}
            />
            {isOnline && isEnabled && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-900" />
            )}
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
                    src="/ollama.png"
                    alt="Ollama"
                    width={32}
                    height={32}
                    className={`transition-all ${
                      isOnline && isEnabled
                        ? "opacity-100"
                        : isOnline && !isEnabled
                        ? "opacity-50 grayscale"
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
                      Ollama
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
                    {isOnline
                      ? "localhost:11434"
                      : "Not detected"}
                  </p>
                </div>
              </div>

              {isOnline && (
                <>
                  {/* Toggle */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Use Ollama
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
};

export default OllamaStatus;
