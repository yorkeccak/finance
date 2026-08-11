/**
 * Slim, client-facing shapes for Valyu workflow templates + a normalizer from
 * the raw catalog object. Pure module (client + server safe).
 */

export interface WorkflowVariable {
  key: string;
  label: string;
  help?: string;
  examples?: string[];
  required: boolean;
  placeholder?: string;
  type: "text" | "textarea" | "number" | "date" | "enum";
  options?: string[]; // for enum
}

export interface WorkflowDTO {
  slug: string;
  version: number | null;
  vertical: string;
  title: string;
  subtitle: string;
  description: string;
  popular: boolean;
  recommended_mode: string;
  estimated_time: string | null;
  variables: WorkflowVariable[];
  deliverables: { type: string; description: string }[];
}

const TEXTAREA_HINT = /thesis|hypothesis|question|context|notes|description/i;

function normalizeVariable(v: any): WorkflowVariable {
  // The catalog often omits `type` for plain text vars. Infer a sensible type.
  let type: WorkflowVariable["type"] = v.type ?? "text";
  if (!v.type && TEXTAREA_HINT.test(v.key || "")) type = "textarea";

  const rawOptions = v.options ?? v.choices ?? v.enum ?? v.values;
  const options = Array.isArray(rawOptions)
    ? rawOptions.map((o: any) => (typeof o === "string" ? o : o?.value ?? o?.label ?? String(o)))
    : undefined;
  if (options && options.length) type = "enum";

  return {
    key: v.key,
    label: v.label ?? v.key,
    help: v.help ?? undefined,
    examples: Array.isArray(v.examples) ? v.examples : undefined,
    required: v.required === true,
    placeholder: v.placeholder ?? undefined,
    type,
    options,
  };
}

export function normalizeWorkflow(raw: any): WorkflowDTO {
  return {
    slug: raw.slug,
    version: raw.version ?? null,
    vertical: raw.vertical,
    title: raw.title ?? raw.slug,
    subtitle: raw.subtitle ?? "",
    description: raw.description ?? "",
    popular: !!raw.popular,
    recommended_mode: raw.recommended_mode ?? "standard",
    estimated_time: raw.estimated_time ?? null,
    variables: Array.isArray(raw.variables) ? raw.variables.map(normalizeVariable) : [],
    deliverables: Array.isArray(raw.deliverables) ? raw.deliverables : [],
  };
}
