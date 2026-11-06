// The typed relations an idea record may state (S2-PR9): a closed set, checked only through the EE-095 term engine
// (the term typed-link in packages/naive/src/terms/terms.ts). An idea relates to another idea, or attaches to one scope.
//
// The idea relations keep the names of preserved PR 157 (EE-103: broader, narrower, related, part-of, derived-from),
// the idea graph's builds_on, and supports and contradicts from argumentation. The scope attachments keep the names
// the ontology program gives them. Each relation names its counterpart in SKOS, PROV-O, DCMI Terms, AIF and IBIS,
// or null where that vocabulary has none. AIF and IBIS publish no single namespace, so their entries name the node
// or link type.
//
// `order` groups the relations no cycle may run through. Its value is the relation read forward, so a link whose
// type differs from its order (narrower) is read backwards: a narrower b is b broader a. packages/naive/lean/Naive/Terms.lean
// proves the table keeps that sound (idea_inverse_same_order, idea_order_canonical).
//
// The table is returned by a function so that freezing the term hashes its source: a changed relation changes the
// term's hash (R1 in packages/naive/src/terms/engine.ts).

export function relationTable() {
  return {
    broader: { between: "idea", order: "broader", inverse: "narrower", skos: "skos:broader", provo: null, dcmi: null, aif: null, ibis: "specializes" },
    narrower: { between: "idea", order: "broader", inverse: "broader", skos: "skos:narrower", provo: null, dcmi: null, aif: null, ibis: "generalizes" },
    related: { between: "idea", order: null, inverse: "related", skos: "skos:related", provo: null, dcmi: "dcterms:relation", aif: null, ibis: null },
    "part-of": { between: "idea", order: "part-of", inverse: null, skos: null, provo: null, dcmi: "dcterms:isPartOf", aif: null, ibis: null },
    "derived-from": { between: "idea", order: null, inverse: null, skos: null, provo: "prov:wasDerivedFrom", dcmi: "dcterms:source", aif: null, ibis: null },
    builds_on: { between: "idea", order: "builds_on", inverse: null, skos: null, provo: null, dcmi: "dcterms:requires", aif: null, ibis: null },
    supports: { between: "idea", order: null, inverse: null, skos: null, provo: null, dcmi: null, aif: "RA-node (inference)", ibis: "supports" },
    contradicts: { between: "idea", order: null, inverse: null, skos: null, provo: null, dcmi: null, aif: "CA-node (conflict)", ibis: "objects-to" },
    creates: { between: "scope", order: null, inverse: null, skos: null, provo: null, dcmi: null, aif: null, ibis: null },
    amends: { between: "scope", order: null, inverse: null, skos: null, provo: null, dcmi: null, aif: null, ibis: null },
    appends_to: { between: "scope", order: null, inverse: null, skos: null, provo: null, dcmi: null, aif: null, ibis: null },
    derives_from: { between: "scope", order: null, inverse: null, skos: null, provo: "prov:wasDerivedFrom", dcmi: null, aif: null, ibis: null },
  } as const;
}

export const RELATIONS = relationTable();
export type RelationName = keyof typeof RELATIONS;
export type Target = "idea" | "scope";

/** The namespaces the CURIEs above use. */
export const PREFIXES = { skos: "http://www.w3.org/2004/02/skos/core#", prov: "http://www.w3.org/ns/prov#", dcterms: "http://purl.org/dc/terms/" } as const;

/** The relations stated between two of one kind of thing: idea relations or scope attachments. */
export const namesBetween = (target: Target): RelationName[] => (Object.keys(RELATIONS) as RelationName[]).filter((n) => RELATIONS[n].between === target);

/** Whether a name is a relation in the closed set for this target. A name inherited from Object is not. */
export const known = (type: string, target: Target): boolean => Object.hasOwn(RELATIONS, type) && RELATIONS[type as RelationName].between === target;

/** A scope attachment that may name a scope the catalog does not list yet, because the idea is what creates it. */
export const mayBeNew = (type: string): boolean => type === "creates";
