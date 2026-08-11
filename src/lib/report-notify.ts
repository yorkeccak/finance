/**
 * Client-side helpers for DeepResearch completion notifications.
 *
 * Two concerns:
 *  - "seen" set (localStorage): which terminal reports the user has already
 *    acknowledged — drives the sidebar Reports badge (unseen completed count).
 *  - Browser/OS notification permission + firing.
 */

import { isTerminal } from "@/lib/reports";
import type { ReportDTO } from "@/lib/reports";

const SEEN_KEY = "reports.seenIds";

export function getSeenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}

export function markSeen(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const set = new Set(getSeenIds());
  ids.forEach((id) => set.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

/**
 * First-run seed: mark all currently-terminal reports as seen so the badge
 * only ever lights up for completions that happen *after* this point. No-ops
 * once the key exists.
 */
export function seedSeenIfFirst(terminalIds: string[]): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEEN_KEY) === null) {
    localStorage.setItem(SEEN_KEY, JSON.stringify(terminalIds));
  }
}

/** Count of terminal reports the user hasn't acknowledged yet. */
export function unseenCompletedCount(reports: ReportDTO[]): number {
  const seen = new Set(getSeenIds());
  return reports.filter((r) => isTerminal(r.status) && !seen.has(r.id)).length;
}

// --- Browser/OS notifications -------------------------------------------------

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Ask once (only when permission is still "default"). Safe to call repeatedly. */
export async function requestNotifyPermission(): Promise<void> {
  if (!notificationsSupported()) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      /* user dismissed */
    }
  }
}

export function canNotify(): boolean {
  return notificationsSupported() && Notification.permission === "granted";
}

/** Fire a desktop notification that deep-links back to the run on click. */
export function fireCompletionNotification(report: ReportDTO): void {
  if (!canNotify()) return;
  const failed = report.status === "failed" || report.status === "cancelled";
  try {
    const n = new Notification(failed ? "Research didn't finish" : "Your research is ready", {
      body: report.title || "DeepResearch run",
      tag: report.id, // dedupe per report
      icon: "/valyu.svg",
    });
    n.onclick = () => {
      window.focus();
      window.location.href = `/?research=${report.id}`;
    };
  } catch {
    /* ignore */
  }
}
