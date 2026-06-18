/**
 * Seeded example reports — one flagship per domain. These are real, cached
 * Valyu workflow runs captured to static JSON (see scripts/gen-seeds.mjs) and
 * shipped in the bundle. They're the trust layer: users see output quality
 * before spending a credit.
 */

import investmentBanking from "./investment-banking.json";
import privateEquity from "./private-equity.json";
import hedgeFunds from "./hedge-funds.json";
import salesIntelligence from "./sales-intelligence.json";

export interface ExampleReport {
  domainId: string;
  workflow_slug: string;
  title: string;
  subject: string;
  mode: string;
  estimated_time: string | null;
  output: string;
  sources_count: number;
  pdf_url?: string | null;
  task_id: string | null;
}

const ALL: ExampleReport[] = [
  investmentBanking as ExampleReport,
  privateEquity as ExampleReport,
  hedgeFunds as ExampleReport,
  salesIntelligence as ExampleReport,
];

const BY_DOMAIN: Record<string, ExampleReport> = Object.fromEntries(
  ALL.map((e) => [e.domainId, e]),
);

/** The example for a domain, or null. "Ready" = has captured output. */
export function getExample(domainId: string): ExampleReport | null {
  return BY_DOMAIN[domainId] ?? null;
}

export function isExampleReady(e: ExampleReport | null): e is ExampleReport {
  return !!e && typeof e.output === "string" && e.output.length > 0;
}
