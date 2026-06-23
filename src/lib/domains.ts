/**
 * Domain lens config for the reports feature. Domains map 1:1 onto Valyu
 * workflow verticals; templates within them are the tasks. Pure module —
 * safe to import on client and server.
 */

/** The Valyu verticals we surface as launch domains. */
export const FINANCE_VERTICALS = [
  "investment-banking",
  "private-equity",
  "hedge-funds",
  "sales-intelligence",
] as const;

export type FinanceVertical = (typeof FINANCE_VERTICALS)[number];

export interface Domain {
  id: string; // "popular" or a vertical slug
  label: string;
  blurb: string;
}

/** Lens row. "Popular" is a synthetic domain = popular workflows across the
 *  finance verticals (uses the per-workflow `popular` flag). */
export const DOMAINS: Domain[] = [
  { id: "popular", label: "Popular", blurb: "Most-used workflows" },
  { id: "investment-banking", label: "Investment Banking / M&A", blurb: "Profiles, comps, LBO, DCF, precedents" },
  { id: "private-equity", label: "Private Equity / VC", blurb: "IC memos, diligence, market maps" },
  { id: "hedge-funds", label: "Hedge Funds", blurb: "Theses, earnings, macro" },
  { id: "sales-intelligence", label: "Sales / GTM", blurb: "Account briefings, battlecards, target lists" },
];

export const isFinanceVertical = (v: string): v is FinanceVertical =>
  (FINANCE_VERTICALS as readonly string[]).includes(v);

/**
 * Run modes. Depth knob — NOT a speed knob (the Phase 0 spike showed even
 * "fast" runs many minutes; the per-workflow estimated_time is the real ETA).
 */
export interface ModeOption {
  id: string;
  label: string;
  note: string;
}

export const MODES: ModeOption[] = [
  { id: "fast", label: "Fast", note: "Lighter, fastest" },
  { id: "standard", label: "Standard", note: "Recommended depth" },
  { id: "heavy", label: "Heavy", note: "Deepest analysis" },
];
