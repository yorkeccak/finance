"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface OllamaStatus {
  connected: boolean;
  available: boolean;
  mode: 'development' | 'production';
  models?: Array<{ name: string }>;
  message: string;
}

export function MissingKeysDialog() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{
    valyuKeyPresent: boolean;
    daytonaKeyPresent: boolean;
    openaiKeyPresent: boolean;
    aiGatewayKeyPresent: boolean;
  } | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch environment status
        const envRes = await fetch("/api/env-status", { cache: "no-store" });
        if (!envRes.ok) throw new Error("Failed to fetch env status");
        const envData = await envRes.json();
        
        // Fetch Ollama status
        const ollamaRes = await fetch("/api/ollama-status", { cache: "no-store" });
        const ollamaData = ollamaRes.ok ? await ollamaRes.json() : null;
        
        if (!cancelled) {
          setStatus(envData);
          setOllamaStatus(ollamaData);
          
          const missing =
            !envData.valyuKeyPresent ||
            !envData.daytonaKeyPresent ||
            (!envData.openaiKeyPresent && !envData.aiGatewayKeyPresent);
          
          // Show dialog if keys are missing OR if in development mode with Ollama issues
          const showForOllama = ollamaData?.mode === 'development' && 
                                (!ollamaData.connected || !ollamaData.available);
          
          if (missing || showForOllama) setOpen(true);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;

  const missingValyu = !status.valyuKeyPresent;
  const missingDaytona = !status.daytonaKeyPresent;
  const missingOpenAI = !status.openaiKeyPresent && !status.aiGatewayKeyPresent;
  
  const isDevelopmentMode = ollamaStatus?.mode === 'development';
  const hasOllamaIssues = isDevelopmentMode && (!ollamaStatus?.connected || !ollamaStatus?.available);
  
  // Don't show if no issues
  if (!missingValyu && !missingDaytona && !missingOpenAI && !hasOllamaIssues) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Setup Required</DialogTitle>
          <DialogDescription>
            {isDevelopmentMode 
              ? "Development mode detected. Configure API keys and Ollama for full functionality."
              : "This app requires API keys for full functionality. Some features are disabled until keys are added."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {missingValyu && (
            <div className="rounded-md border p-3">
              <div className="font-medium">Missing VALYU_API_KEY</div>
              <div className="text-muted-foreground">
                Add VALYU_API_KEY to your environment to enable financial and
                web search.
              </div>
            </div>
          )}
          {missingDaytona && (
            <div className="rounded-md border p-3">
              <div className="font-medium">Missing DAYTONA_API_KEY</div>
              <div className="text-muted-foreground">
                Add DAYTONA_API_KEY to run Python code in the secure sandbox.
              </div>
            </div>
          )}
          {missingOpenAI && (
            <div className="rounded-md border p-3">
              <div className="font-medium">
                Missing OPENAI_API_KEY or AI_GATEWAY_API_KEY
              </div>
              <div className="text-muted-foreground">
                Add OPENAI_API_KEY or AI_GATEWAY_API_KEY to enable ChatGPT
                access.
              </div>
            </div>
          )}
          
          {isDevelopmentMode && ollamaStatus && (
            <div className="rounded-md border p-3 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 font-medium">
                {ollamaStatus.connected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : ollamaStatus.available ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                Ollama Status (Development Mode)
              </div>
              <div className="text-muted-foreground mt-1">
                {ollamaStatus.message}
              </div>
              {ollamaStatus.models && ollamaStatus.models.length > 0 && (
                <div className="text-xs text-blue-700 mt-2">
                  Available models: {ollamaStatus.models.slice(0, 3).map(m => m.name).join(', ')}
                  {ollamaStatus.models.length > 3 && ` +${ollamaStatus.models.length - 3} more`}
                </div>
              )}
              {!ollamaStatus.connected && (
                <div className="text-xs text-blue-700 mt-2">
                  • Install Ollama from ollama.com
                  • Pull a model: <code className="bg-blue-100 px-1 rounded">ollama pull llama3.2</code>
                  • APP_MODE=development is already set (development mode)
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
          {isDevelopmentMode && hasOllamaIssues && (
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline">Install Ollama</Button>
            </a>
          )}
          <a
            href="https://platform.valyu.network"
            target="_blank"
            rel="noreferrer"
          >
            <Button>Get Valyu Key</Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
