import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface VirtualizedContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  content: string;
  className?: string;
  isJson?: boolean;
}

export function VirtualizedContentDialog({
  open,
  onOpenChange,
  title,
  description,
  content,
  className = "",
  isJson = false
}: VirtualizedContentDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[80vh] overflow-hidden flex flex-col ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="ml-4"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4">
          {isJson ? (
            <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              {JSON.stringify(JSON.parse(content), null, 2)}
            </pre>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-sm font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              {content}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}