'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertCircle, ExternalLink, Info, AlertTriangle } from 'lucide-react';
import { useOllama } from '@/lib/ollama-context';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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

export function OllamaStatusIndicator({ hasMessages = false }: { hasMessages?: boolean }) {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showInitialDialog, setShowInitialDialog] = useState(false);
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
    
    // Show initial dialog if Ollama is available but not connected
    const hasShownDialog = localStorage.getItem('ollama-dialog-shown');
    if (!hasShownDialog) {
      setTimeout(() => {
        if (status && !status.connected && status.available) {
          setShowInitialDialog(true);
          localStorage.setItem('ollama-dialog-shown', 'true');
        }
      }, 2000);
    }
    
    // Check status every 30 seconds
    const interval = setInterval(checkOllamaStatus, 30000);
    return () => clearInterval(interval);
  }, [status]);

  if (!status || status.mode === 'production') {
    return null; // Don't show in production mode
  }

  const formatModelSize = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 ** 2)).toFixed(0)}MB`;
  };

  const getModelRecommendation = (modelName: string) => {
    const name = modelName.toLowerCase();
    if (name.includes('qwen') && (name.includes('7b') || name.includes('14b') || name.includes('32b'))) {
      return { type: 'recommended', text: 'Excellent for tool calling' };
    }
    if (name.includes('llama') && (name.includes('7b') || name.includes('13b') || name.includes('70b'))) {
      return { type: 'good', text: 'Good for tool calling' };
    }
    if (name.includes('mistral') || name.includes('mixtral')) {
      return { type: 'fair', text: 'Fair tool calling support' };
    }
    return { type: 'warning', text: 'Limited tool calling support' };
  };

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


  return (
    <>
      {/* Model Selector - top-left normally, moves right when messages exist */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: hasMessages ? 48 : 0  // Move right when messages exist to make room for new chat button
        }}
        transition={{ 
          delay: hasMessages ? 0.1 : 0.6, 
          duration: 0.3, 
          ease: "easeOut" 
        }}
        className="fixed top-3 sm:top-6 left-3 sm:left-6 z-45 pt-1"
      >
        <motion.div
          className="cursor-pointer"
          onClick={() => setShowDialog(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all">
            {getStatusIcon()}
            <span className="text-xs font-light text-gray-700 dark:text-gray-300">
              Local Models
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Initial Dialog for First-Time Users */}
      <AnimatePresence>
        {showInitialDialog && (
          <Dialog open={showInitialDialog} onOpenChange={setShowInitialDialog}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='fixed inset-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm'
              onClick={() => setShowInitialDialog(false)}
            />
            <DialogContent className='fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-lg sm:w-[90vw] translate-x-[-50%] translate-y-[-50%] p-0 border-0 bg-transparent shadow-none'>
              <DialogTitle className='sr-only'>Local Model Support</DialogTitle>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className='bg-white dark:bg-gray-950 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 relative'
              >
                <div className='p-4 sm:p-6'>
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='h-8 w-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center'>
                      <Info className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                    </div>
                    <div>
                      <h2 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        Run Finance with Your Local Models
                      </h2>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                        Use Ollama for privacy and unlimited queries
                      </p>
                    </div>
                  </div>
                  
                  <div className='space-y-3 text-xs text-gray-600 dark:text-gray-400'>
                    <p>Get started in 2 simple steps:</p>
                    <div className='space-y-2 ml-2'>
                      <div>1. Install Ollama and pull a model (qwen2.5:7b recommended)</div>
                      <div>2. Click the Local Models button to select your model</div>
                    </div>
                  </div>
                  
                  <div className='flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
                    <a
                      href='https://ollama.com'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors'
                    >
                      <ExternalLink className='h-3 w-3' />
                      Get Ollama
                    </a>
                    <button
                      onClick={() => setShowInitialDialog(false)}
                      className='text-xs px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors'
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Main Model Selector Dialog */}
      <AnimatePresence>
        {showDialog && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className='fixed inset-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm'
              onClick={() => setShowDialog(false)}
            />
            <DialogContent className='fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-2xl sm:w-[90vw] translate-x-[-50%] translate-y-[-50%] p-0 border-0 bg-transparent shadow-none overflow-hidden'>
              <DialogTitle className='sr-only'>Local Model Selector</DialogTitle>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className='bg-white dark:bg-gray-950 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 relative'
              >
                {/* Header */}
                <div className='p-4 sm:p-6 pb-0'>
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='h-8 w-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center border border-blue-200 dark:border-blue-700'>
                      {getStatusIcon()}
                    </div>
                    <div>
                      <h2 className='text-lg font-light text-gray-900 dark:text-gray-100'>
                        Local Models
                      </h2>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                        {status.connected 
                          ? `${status.models?.length || 0} models currently installed`
                          : 'Install Ollama to use local models for unlimited, private queries'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className='p-4 sm:p-6 pt-0 max-h-96 overflow-y-auto'>
                  {status.connected && status.models && status.models.length > 0 ? (
                    <div className='space-y-3'>
                      {/* Warning Banner */}
                      <div className='flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg'>
                        <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5' />
                        <div className='text-xs text-amber-800 dark:text-amber-200'>
                          <strong className='font-medium'>Tool Calling Performance:</strong> Many models struggle with function calling. 
                          We recommend <strong>Qwen2.5:7B or larger</strong> for best results with financial tools.
                        </div>
                      </div>
                      
                      {/* Model List */}
                      <div className='space-y-2'>
                        {status.models.map((model, index) => {
                          const recommendation = getModelRecommendation(model.name);
                          return (
                            <div 
                              key={index}
                              className={`group cursor-pointer p-3 rounded-lg border transition-all hover:shadow-sm ${
                                selectedModel === model.name 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                              onClick={() => {
                                setSelectedModel(model.name);
                                setShowDialog(false);
                              }}
                            >
                              <div className='flex items-start justify-between'>
                                <div className='min-w-0 flex-1'>
                                  <div className='flex items-center gap-2'>
                                    <span className={`text-sm font-medium truncate ${
                                      selectedModel === model.name 
                                        ? 'text-blue-900 dark:text-blue-100'
                                        : 'text-gray-900 dark:text-gray-100'
                                    }`}>
                                      {selectedModel === model.name ? '✓ ' : ''}{model.name}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      recommendation.type === 'recommended' 
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : recommendation.type === 'good'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : recommendation.type === 'fair'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                    }`}>
                                      {recommendation.text}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-2 mt-1'>
                                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                                      {formatModelSize(model.size)}
                                    </span>
                                    <span className='text-xs text-gray-400 dark:text-gray-500'>
                                      •
                                    </span>
                                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                                      {new Date(model.modified_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className='text-center py-6'>
                      <div className='h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4'>
                        <XCircle className='h-6 w-6 text-gray-400' />
                      </div>
                      <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-2'>
                        No Local Models Found
                      </h3>
                      <p className='text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto'>
                        {status.message}
                      </p>
                      <div className='space-y-3'>
                        <div className='text-xs text-gray-600 dark:text-gray-400 space-y-1'>
                          <div>To get started:</div>
                          <div>1. Install Ollama from ollama.com</div>
                          <div>2. Run: <code className='bg-gray-100 dark:bg-gray-800 px-1 rounded'>ollama pull qwen2.5:7b</code></div>
                          <div>3. Refresh this dialog</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className='flex items-center justify-between p-4 sm:p-6 pt-0 border-t border-gray-200 dark:border-gray-700'>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => checkOllamaStatus()}
                      className='text-xs px-3 py-1.5 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors'
                    >
                      Refresh
                    </button>
                    <a
                      href='https://ollama.com/library'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 text-xs px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors'
                    >
                      <ExternalLink className='h-3 w-3' />
                      Browse Models
                    </a>
                  </div>
                  
                  <a
                    href='https://docs.valyu.network/local-models'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline'
                  >
                    Documentation
                  </a>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}