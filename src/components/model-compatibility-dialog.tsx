"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ModelCompatibilityDialogProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  error: string;
  modelName?: string;
}

export function ModelCompatibilityDialog({
  open,
  onClose,
  onContinue,
  error,
  modelName,
}: ModelCompatibilityDialogProps) {
  const isToolError = error.toLowerCase().includes("tool") || error.toLowerCase().includes("function");
  const isThinkingError = error.toLowerCase().includes("thinking");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <DialogTitle>Model Compatibility Issue</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {isToolError && (
              <>
                <p className="mb-2">
                  <span className="font-semibold">{modelName || "This model"}</span> doesn't support
                  tool calling (function calls).
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This means it won't be able to execute Python code, search the web, fetch financial
                  data, or use other interactive tools. You can still have a conversation, but functionality
                  will be limited to text responses only.
                </p>
              </>
            )}
            {isThinkingError && (
              <>
                <p className="mb-2">
                  <span className="font-semibold">{modelName || "This model"}</span> doesn't support
                  thinking mode (chain-of-thought reasoning).
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The model will still work normally, but won't show its reasoning steps.
                </p>
              </>
            )}
            {!isToolError && !isThinkingError && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {error}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button onClick={onContinue} className="w-full">
            Continue Anyway
          </Button>
          <Button onClick={onClose} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
