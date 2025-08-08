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

export function MissingKeysDialog() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{
    valyuKeyPresent: boolean;
    daytonaKeyPresent: boolean;
    openaiKeyPresent: boolean;
    aiGatewayKeyPresent: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/env-status", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch env status");
        const data = await res.json();
        if (!cancelled) {
          setStatus(data);
          const missing =
            !data.valyuKeyPresent ||
            !data.daytonaKeyPresent ||
            (!data.openaiKeyPresent && !data.aiGatewayKeyPresent);
          if (missing) setOpen(true);
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
  if (!missingValyu && !missingDaytona && !missingOpenAI) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>API keys required</DialogTitle>
          <DialogDescription>
            This app assumes Valyu and Daytona keys are configured. Some
            features are disabled until keys are added.
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
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
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
