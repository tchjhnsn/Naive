// foundation/core, a view of venture.json: the fields a founder writes, each with the foundation statement
// it answers, if any. Everything else in the file stays out of reach of this route.

// venture.json as this view reads it: top-level fields, and the sections that hold the rest.
type VentureFields = { [field: string]: unknown, core?: Record<string, unknown>, brand?: Record<string, unknown> };

const FIELDS: Record<string, { section: "core" | "brand" | null, statement: string | null }> = {
  promise: { section: "core", statement: "mission" },
  competence: { section: "core", statement: "competence" },
  tagline: { section: "brand", statement: "tagline" },
  lifecycle_playbook: { section: null, statement: null },
};

/** The view's values, leaving out an empty one (a venture past discovery starts with empty strings). */
export function coreOf(venture: VentureFields) {
  return Object.fromEntries(Object.entries(FIELDS).flatMap(([k, f]) => {
    const value = f.section ? venture[f.section]?.[k] : venture[k];
    return value ? [[k, value]] : [];
  }));
}

/** The venture with the given fields set. A new core starts with an empty promise, which its schema requires. */
export function withCore(venture: VentureFields, input: Record<string, unknown>): VentureFields {
  const out = { ...venture };
  for (const [k, v] of Object.entries(input)) {
    const { section } = FIELDS[k];
    if (!section) { out[k] = v; continue; }
    out[section] = { ...(section === "core" ? { promise: "" } : {}), ...out[section], [k]: v };
  }
  return out;
}

export const statementsIn = (input: Record<string, unknown>) => Object.keys(input).map((k) => FIELDS[k].statement).filter(Boolean);
