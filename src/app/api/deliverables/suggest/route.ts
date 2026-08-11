import { suggestDeliverables } from "@/lib/deliverable-suggest";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * POST /api/deliverables/suggest - propose deliverables for a freeform query.
 *
 * Advisory only: the client pre-fills the deliverables picker with whatever
 * comes back and the user edits it before launching. Nothing here starts a run
 * or spends Valyu credits, so it needs no Valyu token.
 *
 * Always answers 200 with a (possibly empty) list. The caller is on the typing
 * path, and a failed suggestion must degrade to "no suggestions" rather than
 * surface an error next to the user's query.
 */
export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (typeof query !== "string") return json({ suggestions: [] });
    return json({ suggestions: await suggestDeliverables(query) });
  } catch {
    return json({ suggestions: [] });
  }
}
