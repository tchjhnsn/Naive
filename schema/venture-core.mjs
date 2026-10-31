// foundation/core, a view of venture.json: the three fields a founder writes, each with the foundation
// statement it answers. Everything else in the file stays out of reach of this route.

const FIELDS = {
  promise: { section: "core", statement: "mission" },
  competence: { section: "core", statement: "competence" },
  tagline: { section: "brand", statement: "tagline" },
};

/** The view's values, leaving out an empty one (a venture past discovery starts with empty strings). */
export function coreOf(venture) {
  return Object.fromEntries(Object.entries(FIELDS).flatMap(([k, f]) => (venture[f.section]?.[k] ? [[k, venture[f.section][k]]] : [])));
}

/** The venture with the given fields set. A new core starts with an empty promise, which its schema requires. */
export function withCore(venture, input) {
  const out = { ...venture };
  for (const [k, v] of Object.entries(input)) {
    const { section } = FIELDS[k];
    out[section] = { ...(section === "core" ? { promise: "" } : {}), ...out[section], [k]: v };
  }
  return out;
}

export const statementsIn = (input) => Object.keys(input).map((k) => FIELDS[k].statement);
