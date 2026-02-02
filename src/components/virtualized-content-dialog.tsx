import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Code2, FileText } from "lucide-react";
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

  // Parse and format JSON content
  const formattedContent = useMemo(() => {
    if (!isJson) return content;
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }, [content, isJson]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`w-[95vw] sm:w-[90vw] !max-w-6xl max-h-[80vh] overflow-hidden flex flex-col ${className}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {isJson ? (
                <Code2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              <span className="truncate">{title}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                isJson
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
              }`}>
                {isJson ? "JSON" : "Text"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex-shrink-0"
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
          <pre className={`whitespace-pre-wrap break-words text-sm font-mono p-4 rounded-lg border ${
            isJson
              ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          }`}>
            {formattedContent}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}