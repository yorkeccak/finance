/**
 * Per-domain glyphs + slug→vertical mapping, shared by the workflow catalog
 * and the reports list so a report shows the same icon as the workflow that
 * produced it. Lucide icons are plain component refs (no JSX) so this stays a
 * .ts module.
 */
import { Landmark, Briefcase, LineChart, Target, Sparkles, type LucideIcon } from "lucide-react";

const SLUG_PREFIX: Record<string, string> = {
  "ib-": "investment-banking",
  "pe-": "private-equity",
  "hf-": "hedge-funds",
  "sales-": "sales-intelligence",
};

export const verticalForSlug = (slug: string): string | undefined =>
  Object.entries(SLUG_PREFIX).find(([p]) => slug.startsWith(p))?.[1];

const DOMAIN_ICON: Record<string, LucideIcon> = {
  "investment-banking": Landmark,
  "private-equity": Briefcase,
  "hedge-funds": LineChart,
  "sales-intelligence": Target,
};

export const iconForVertical = (v: string | undefined): LucideIcon =>
  (v && DOMAIN_ICON[v]) || Target;

export const iconForSlug = (slug: string): LucideIcon =>
  slug === "freeform" ? Sparkles : iconForVertical(verticalForSlug(slug));
