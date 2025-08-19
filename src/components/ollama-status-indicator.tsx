'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useOllama } from '@/lib/ollama-context';

interface OllamaStatus {
  connected: boolean;
  available: boolean;
  mode: 'development' | 'production';
  baseUrl?: string;
  models?: Array<{
    name: string;
    size: number;
    modified_at: string;
  }>;
  message: string;
  error?: string;
}

export function OllamaStatusIndicator() {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedModel, setSelectedModel } = useOllama();

  const checkOllamaStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ollama-status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        connected: false,
        available: false,
        mode: 'production',
        message: 'Failed to check Ollama status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkOllamaStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkOllamaStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status || status.mode === 'production') {
    return null; // Don't show in production mode
  }

  const getStatusIcon = () => {
    if (isLoading) {
      return <Clock className="h-3 w-3 animate-spin text-blue-500" />;
    }
    
    if (status.connected) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    
    if (status.available) {
      return <XCircle className="h-3 w-3 text-red-500" />;
    }
    
    return <AlertCircle className="h-3 w-3 text-yellow-500" />;
  };

  const getStatusColor = () => {
    if (isLoading) return 'border-blue-200 bg-blue-50';
    if (status.connected) return 'border-green-200 bg-green-50';
    if (status.available) return 'border-red-200 bg-red-50';
    return 'border-yellow-200 bg-yellow-50';
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking Ollama...';
    if (status.connected) {
      const modelCount = status.models?.length || 0;
      const currentModel = selectedModel ? ` • ${selectedModel}` : '';
      return `Ollama (${modelCount} models)${currentModel}`;
    }
    if (status.available) return 'Ollama Disconnected';
    return 'Ollama Unavailable';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.4 }}
      className="fixed top-3 left-3 z-40"
    >
      <motion.div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {getStatusIcon()}
        <span className="text-xs font-light text-gray-500 group-hover:text-gray-700 transition-colors">
          {getStatusText()}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400 group-hover:text-gray-600 transition-colors"
        >
          ▼
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg min-w-80"
          >
            <div className="p-4 space-y-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div><strong>Mode:</strong> {status.mode}</div>
                {status.baseUrl && <div><strong>URL:</strong> {status.baseUrl}</div>}
                <div><strong>Status:</strong> {status.message}</div>
              </div>
              
              {status.models && status.models.length > 0 && (
                <div className="text-xs">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Available Models:</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {status.models.map((model, index) => (
                      <div 
                        key={index} 
                        className={`text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer transition-colors ${
                          selectedModel === model.name ? 'text-gray-800 dark:text-gray-200 font-medium' : ''
                        }`}
                        onClick={() => {
                          setSelectedModel(model.name);
                          setIsExpanded(false);
                        }}
                      >
                        {selectedModel === model.name ? '✓ ' : '• '}{model.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {status.error && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  <strong>Error:</strong> {status.error}
                </div>
              )}
              
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    checkOllamaStatus();
                  }}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Refresh
                </button>
                {!status.connected && status.available && (
                  <a
                    href="https://ollama.com/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Install Ollama
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}