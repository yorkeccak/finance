"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, X, ArrowRight } from "lucide-react";
import { apiListReports } from "@/lib/report-client";
import { isTerminal } from "@/lib/reports";
import { seedSeenIfFirst, fireCompletionNotification } from "@/lib/report-notify";
import { useAuthStore } from "@/lib/stores/use-auth-store";

interface ToastItem {
  id: string;
  reportId: string;
  title: string;
  failed: boolean;
}

/**
 * App-wide DeepResearch completion notifier. Polls the user's reports and, on a
 * running→terminal transition during the session, pops an on-theme toast and
 * fires a browser/OS notification. Mounted once in the root layout so it works
 * on every page. Seeds the "seen" set on first load so pre-existing completions
 * don't spam on mount. (Cancellations are user-initiated → skipped.)
 */
export function ResearchNotifications() {
  const router = useRouter();
  const { user } = useAuthStore();
  const prev = useRef<Map<string, string> | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: apiListReports,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  useEffect(() => {
    if (!reports) return;
    const curr = new Map(reports.map((r) => [r.id, r.status]));

    if (prev.current === null) {
      seedSeenIfFirst(reports.filter((r) => isTerminal(r.status)).map((r) => r.id));
      prev.current = curr;
      return;
    }

    for (const r of reports) {
      const before = prev.current.get(r.id);
      const becameTerminal = before && !isTerminal(before) && isTerminal(r.status);
      if (becameTerminal && r.status !== "cancelled") {
        const toastId = `${r.id}-${r.status}`;
        setToasts((t) =>
          t.some((x) => x.id === toastId)
            ? t
            : [...t, { id: toastId, reportId: r.id, title: r.title, failed: r.status === "failed" }],
        );
        fireCompletionNotification(r);
      }
    }
    prev.current = curr;
  }, [reports]);

  const dismiss = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 9000));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(92vw,360px)]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="rounded-2xl border border-border bg-card shadow-lg p-3.5 flex items-start gap-3"
          >
            <span
              className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0 ${
                t.failed ? "bg-destructive/10" : "bg-primary/10"
              }`}
            >
              {t.failed ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                {t.failed ? "Research didn't finish" : "Your research is ready"}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{t.title}</div>
              <button
                onClick={() => {
                  dismiss(t.id);
                  router.push(`/?research=${t.reportId}`);
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View report <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
