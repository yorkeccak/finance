'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertCircle, ExternalLink, Info, AlertTriangle } from 'lucide-react';
import { useOllama } from '@/lib/ollama-context';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface OllamaStatus {
  connected: boolean;
  available: boolean;
  mode: 'self-hosted' | 'valyu';
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
        mode: 'valyu',
        message: 'Failed to check Ollama status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only check Ollama status in self-hosted mode
    if (process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted') {
      checkOllamaStatus();

      // Check status every 30 seconds
      const interval = setInterval(checkOllamaStatus, 30000);
      return () => clearInterval(interval);
    }
  }, []); // Empty dependency array - only run once on mount

  // Separate useEffect for initial dialog
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted' && status) {
      const hasShownDialog = localStorage.getItem('ollama-dialog-shown');
      if (!hasShownDialog && !status.connected && status.available) {
        const timer = setTimeout(() => {
          setShowInitialDialog(true);
          localStorage.setItem('ollama-dialog-shown', 'true');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [status]);

  // Don't render anything in valyu mode
  if (process.env.NEXT_PUBLIC_APP_MODE === 'valyu') {
    return null;
  }

  if (!status || status.mode === 'valyu') {
    return null; // Don't show in valyu mode
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
      return <Clock className="h-3 w-3 animate-spin text-primary" />;
    }

    if (status.connected) {
      return <CheckCircle className="h-3 w-3 text-positive" />;
    }

    if (status.available) {
      return <XCircle className="h-3 w-3 text-destructive" />;
    }

    return <AlertCircle className="h-3 w-3 text-muted-foreground" />;
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-sm hover:shadow-md transition-all">
            {getStatusIcon()}
            <span className="text-xs font-light text-foreground">
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
              className='fixed inset-0 z-50 bg-background/80 backdrop-blur-sm'
              onClick={() => setShowInitialDialog(false)}
            />
            <DialogContent className='fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-lg sm:w-[90vw] translate-x-[-50%] translate-y-[-50%] p-0 border-0 bg-transparent shadow-none'>
              <DialogTitle className='sr-only'>Local Model Support</DialogTitle>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className='bg-card rounded-lg shadow-lg border border-border relative'
              >
                <div className='p-4 sm:p-6'>
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='h-8 w-8 bg-accent rounded-lg flex items-center justify-center'>
                      <Info className='h-4 w-4 text-primary' />
                    </div>
                    <div>
                      <h2 className='text-sm font-medium text-foreground'>
                        Run Finance with Your Local Models
                      </h2>
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        Use Ollama for privacy and unlimited queries
                      </p>
                    </div>
                  </div>

                  <div className='space-y-3 text-xs text-muted-foreground'>
                    <p>Get started in 2 simple steps:</p>
                    <div className='space-y-2 ml-2'>
                      <div>1. Install Ollama and pull a model (qwen2.5:7b recommended)</div>
                      <div>2. Click the Local Models button to select your model</div>
                    </div>
                  </div>

                  <div className='flex gap-2 mt-4 pt-4 border-t border-border'>
                    <a
                      href='https://ollama.com'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 text-xs px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors'
                    >
                      <ExternalLink className='h-3 w-3' />
                      Get Ollama
                    </a>
                    <button
                      onClick={() => setShowInitialDialog(false)}
                      className='text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors'
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
              className='fixed inset-0 z-50 bg-background/80 backdrop-blur-sm'
              onClick={() => setShowDialog(false)}
            />
            <DialogContent className='fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-2xl sm:w-[90vw] translate-x-[-50%] translate-y-[-50%] p-0 border-0 bg-transparent shadow-none overflow-hidden'>
              <DialogTitle className='sr-only'>Local Model Selector</DialogTitle>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className='bg-card rounded-lg shadow-lg border border-border relative'
              >
                {/* Header */}
                <div className='p-4 sm:p-6 pb-0'>
                  <div className='flex items-center gap-3 mb-4'>
                    <div className='h-8 w-8 bg-accent rounded-lg flex items-center justify-center border border-border'>
                      {getStatusIcon()}
                    </div>
                    <div>
                      <h2 className='text-lg font-light text-foreground'>
                        Local Models
                      </h2>
                      <p className='text-xs text-muted-foreground mt-0.5'>
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
                      <div className='flex items-start gap-3 p-3 bg-muted border border-border rounded-lg'>
                        <AlertTriangle className='h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5' />
                        <div className='text-xs text-muted-foreground'>
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
                                  ? 'bg-primary/10 border-primary/30'
                                  : 'bg-muted border-border hover:border-primary/30'
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
                                        ? 'text-primary'
                                        : 'text-foreground'
                                    }`}>
                                      {selectedModel === model.name ? '✓ ' : ''}{model.name}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      recommendation.type === 'recommended'
                                        ? 'bg-positive/10 text-positive'
                                        : recommendation.type === 'good'
                                        ? 'bg-primary/10 text-primary'
                                        : recommendation.type === 'fair'
                                        ? 'bg-muted text-muted-foreground'
                                        : 'bg-destructive/10 text-destructive'
                                    }`}>
                                      {recommendation.text}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-2 mt-1'>
                                    <span className='text-xs text-muted-foreground'>
                                      {formatModelSize(model.size)}
                                    </span>
                                    <span className='text-xs text-muted-foreground'>
                                      •
                                    </span>
                                    <span className='text-xs text-muted-foreground'>
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
                      <div className='h-12 w-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4'>
                        <XCircle className='h-6 w-6 text-muted-foreground' />
                      </div>
                      <h3 className='text-sm font-medium text-foreground mb-2'>
                        No Local Models Found
                      </h3>
                      <p className='text-xs text-muted-foreground mb-4 max-w-sm mx-auto'>
                        {status.message}
                      </p>
                      <div className='space-y-3'>
                        <div className='text-xs text-muted-foreground space-y-1'>
                          <div>To get started:</div>
                          <div>1. Install Ollama from ollama.com</div>
                          <div>2. Run: <code className='bg-muted px-1 rounded'>ollama pull qwen2.5:7b</code></div>
                          <div>3. Refresh this dialog</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className='flex items-center justify-between p-4 sm:p-6 pt-0 border-t border-border'>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => checkOllamaStatus()}
                      className='text-xs px-3 py-1.5 text-foreground hover:bg-accent border border-border rounded-lg transition-colors'
                    >
                      Refresh
                    </button>
                    <a
                      href='https://ollama.com/library'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center gap-1 text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors'
                    >
                      <ExternalLink className='h-3 w-3' />
                      Browse Models
                    </a>
                  </div>

                  <a
                    href='https://docs.valyu.ai/local-models'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-xs text-muted-foreground hover:text-foreground underline'
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