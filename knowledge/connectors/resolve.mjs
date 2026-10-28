// The source-of-truth matrix (EE-042). A venture's source map may hold rules: each names, for one
// record type in one context, its system of record (the source reads come from and writes go to)
// and its owner. Rules are written for a fast model to read: flat, one context per rule, every
// context field present, "*" meaning any. Resolution itself is deterministic and needs no model:
// the matching rule with the most fields that are not "*" wins; a tie is an error the check
// reports. A record type no rule names falls back to `records` (the EE-037 shorthand) and then to
// the venture's own folder.
//
//   context   phase      the venture's phase (venture.json), or "*"
//             product    the product id the record is about, or "*"
//             account    the account id the record is about, or "*"
//             actor      person or agent, or "*"
//   attribute            "*" for the whole record, or one top-level field; an attribute rule
//                        names where that field is mastered (a price in Stripe, say). The router
//                        reads that field from there and writes it there (index.mjs,
//                        attributeSources), so the record's own file never holds a second copy.

export const ANY = "*";
export const CONTEXT = ["phase", "product", "account", "actor"];
export const FIELDS = ["record", "attribute", ...CONTEXT];

/** How many fields of a rule narrow it (the record type itself always matches). */
export const specificity = (rule) => ["attribute", ...CONTEXT].filter((k) => rule[k] !== ANY).length;

/** The rules a map states, the `records` shorthand included as rules that match anything. */
export function rulesOf(map) {
  const short = Object.entries(map.records ?? {}).map(([record, system_of_record]) => ({ record, attribute: ANY, phase: ANY, product: ANY, account: ANY, actor: ANY, system_of_record, shorthand: true }));
  return [...(map.rules ?? []), ...short];
}

/**
 * The rule that holds for a query: { record, attribute?, phase?, product?, account?, actor? }.
 * A field left out of the query matches only "*" in a rule, so a rule narrowed to a product never
 * applies to a read that names no product. Returns { rule, specificity, ties } or null.
 */
export function resolve(map, query) {
  const q = { attribute: ANY, ...query };
  const fits = (rule) => rule.record === q.record && ["attribute", ...CONTEXT].every((k) => rule[k] === ANY || rule[k] === q[k]);
  const hits = rulesOf(map).filter(fits).map((rule) => ({ rule, specificity: specificity(rule) - (rule.shorthand ? 0.5 : 0) }));
  if (!hits.length) return null;
  hits.sort((a, b) => b.specificity - a.specificity);
  const ties = hits.filter((h) => h.specificity === hits[0].specificity).map((h) => h.rule);
  return { rule: hits[0].rule, specificity: Math.ceil(hits[0].specificity), ties: ties.length > 1 ? ties : [] };
}
