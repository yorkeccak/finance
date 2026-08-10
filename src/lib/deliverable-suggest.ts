/**
 * Small-model extractor that turns a freeform research query into suggested
 * deliverables (format + description).
 *
 * Two gaps this closes, both seen in real runs:
 *  - A query that asks for a file in plain English ("...as an Excel spreadsheet
 *    I can drop into a deck") produces no deliverable at all, because the only
 *    way to request one is the picker.
 *  - A picker row left with an empty description falls back to a generic
 *    DEFAULT_DELIVERABLE_DESC string, so the run is steered by "Key figures and
 *    supporting data as a spreadsheet" instead of by what was actually asked.
 *
 * The description is the part that matters: the DeepResearch API uses it to
 * decide what goes in the file. Suggestions are advisory - the UI pre-fills the
 * picker and the user edits or removes them before launching.
 *
 * Fails open by design. A missing key, a timeout, or a malformed response all
 * yield an empty list: a research launch must never be blocked by this.
 */

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

/** Formats worth suggesting. `pdf` is deliberately absent: every run already
 *  requests a PDF via `output_formats` and renders an "Open PDF" button, so
 *  suggesting one duplicates a file the user gets anyway. */
const SUGGESTIBLE_TYPES = ["csv", "xlsx", "pptx", "docx"] as const;

export type SuggestibleType = (typeof SUGGESTIBLE_TYPES)[number];

export interface DeliverableSuggestion {
  type: SuggestibleType;
  description: string;
}

/** Cap suggestions well below the picker's own limit of 5. The extractor should
 *  seed a starting point, not fill the panel on the user's behalf. */
const MAX_SUGGESTIONS = 3;

/** Below this, a query is a ticker or a fragment - not enough to reason about. */
export const MIN_QUERY_LENGTH = 20;

/** Generous on purpose. This runs in the background while the user is still
 *  typing and blocks nothing, so a tight budget buys nothing but lost
 *  suggestions: measured latency is ~1.5s typical but tails past 4s when the
 *  server is also servicing a history poll, and earlier 2s/6s ceilings both
 *  timed out in practice. The client aborts this call the moment a run is
 *  launched, so a late answer can never affect one. */
const TIMEOUT_MS = 10000;

/** Descriptions longer than this get truncated rather than rejected. */
const MAX_DESCRIPTION_LENGTH = 200;

/** Only the query's leading characters are used - a bound on tokens, and on
 *  what an unauthenticated caller can push through the model. */
const MAX_QUERY_CHARS = 1000;

const model = process.env.DELIVERABLE_SUGGEST_MODEL || "gpt-4o-mini";

/**
 * Kept permissive on purpose. `generateObject` throws when the model's output
 * fails the schema, and a throw here costs every suggestion - so bounds like
 * "at most 3" and "at most 200 chars" are enforced in code below rather than
 * as validation that can fail the whole call.
 */
const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum(SUGGESTIBLE_TYPES),
      description: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = `You decide whether a financial research request implies the user wants a downloadable file, and if so, what should go in it.

Suggest a deliverable ONLY when the request implies a tangible artifact:
- xlsx: a financial model, or data spanning multiple tabs/sheets
- csv: a single flat table of data
- pptx: a deck, presentation, or set of slides
- docx: a written memo, report, or document

Return an EMPTY list when the request just wants an answer, a number, an explanation, or a view. That is the common case - most research questions need no file. Be conservative: a wrong suggestion costs the user credits and time.

When you do suggest one, the description is the important part. It is passed to the research engine to steer what the file contains.
- Name the actual companies, tickers, metrics and periods from the request.
- Describe the CONTENTS, not the format.
- One sentence, under 200 characters.
- Never write something generic like "key figures and supporting data" or "the underlying data" - a description that would fit any query is worse than no suggestion.

Suggest at most 3, and usually 0 or 1. Only suggest multiple when the request genuinely asks for distinct artifacts.

Always answer with an object holding a "suggestions" array - never a bare array,
even when there is nothing to suggest.

Examples:

Request: "What was Alphabet's 2026 capex guidance?"
(a question; wants an answer, not a file)
{"suggestions": []}

Request: "How is Nvidia positioned against AMD in data center GPUs?"
(wants analysis, not a file)
{"suggestions": []}

Request: "Build me a peer comps table for Alphabet vs Microsoft and Meta - EV/EBITDA, P/E and revenue growth - as an Excel spreadsheet"
{"suggestions": [{"type": "xlsx", "description": "Peer comparables table for GOOGL, MSFT and META with EV/EBITDA, P/E and revenue growth"}]}

Request: "3-statement model for Shopify through 2028"
{"suggestions": [{"type": "xlsx", "description": "Three-statement model for Shopify with income statement, balance sheet and cash flow projected through 2028"}]}

Request: "Put together an IC memo on Stripe with a recommendation, plus slides for the partner meeting"
{"suggestions": [{"type": "docx", "description": "Investment committee memo on Stripe covering thesis, valuation, risks and a recommendation"}, {"type": "pptx", "description": "Partner meeting deck for Stripe summarising the thesis, key metrics and recommendation"}]}`;

/**
 * Suggest deliverables for a freeform research query.
 * Returns `[]` for anything that doesn't clearly warrant a file, and for every
 * failure mode (no API key, timeout, model error, unparseable output).
 */
export async function suggestDeliverables(
  query: string,
): Promise<DeliverableSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  // No key is a normal state in self-hosted mode, not an error - the feature
  // just stays dark and the picker behaves exactly as it did before.
  if (!apiKey) return [];

  try {
    const openai = createOpenAI({ apiKey });
    const { object } = await generateObject({
      model: openai(model),
      schema: suggestionSchema,
      system: SYSTEM_PROMPT,
      prompt: `Request: ${trimmed.slice(0, MAX_QUERY_CHARS)}`,
      temperature: 0,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    });

    return (object.suggestions ?? [])
      .map((s) => ({
        type: s.type,
        description: s.description.trim().slice(0, MAX_DESCRIPTION_LENGTH),
      }))
      // A blank description is worse than no suggestion: it would fall through
      // to the same generic default this feature exists to avoid.
      .filter((s) => s.description.length > 0)
      .slice(0, MAX_SUGGESTIONS);
  } catch (e) {
    // Fail open, but not silently: swallowing this whole made a dead API key
    // look identical to "nothing worth suggesting". The user still gets a
    // clean launch; the operator gets a reason in the server log.
    // The cause carries the detail worth having: a schema mismatch shows up
    // here as a validation failure, which is otherwise indistinguishable from
    // "nothing to suggest".
    console.warn(
      "[deliverable-suggest] suggestion failed, continuing without one:",
      e instanceof Error ? e.message : e,
      (e as { cause?: { message?: string } })?.cause?.message ?? "",
    );
    return [];
  }
}
