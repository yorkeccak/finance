"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * Generic right slide-in panel. Wide (content has big tables), dims the page
 * behind it, closes on backdrop click / Escape / X, locks body scroll.
 * Shared chrome for the report and example-report drawers.
 */
export function SlideOver({
  open,
  onClose,
  headerRight,
  children,
}: {
  open: boolean;
  onClose: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute right-0 top-0 h-full w-full max-w-3xl bg-background shadow-2xl flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
          >
            <div className="flex items-center justify-between gap-3 px-5 md:px-8 py-3 border-b border-border flex-shrink-0">
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {headerRight}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 md:px-8 py-6">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
