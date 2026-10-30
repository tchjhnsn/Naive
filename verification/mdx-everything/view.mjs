export const title = "One field on its way to a public channel (the site build)";
const field = (v) => v.vis === "internal" ? "Internal" : v.vis === "variant" ? "Publish through a variant" : v.wording === "pinned" ? "Public, wording approved" : "Public, edited since approval";
const variant = (v) => ({ none: "No variant", draft: "Variant drafted", approved: "Variant approved by you", copying: "Approved variant copies the record", forged: "Variant marked approved by an agent" })[v.variant];
const output = (v) => ({ nothing: "Nothing published", fieldWords: "Record's own words published", variantWords: "Variant published", refused: "Build refused" })[v.pub];
export const state = (v) => ({ Field: field(v), Variant: variant(v), Output: output(v) });
export const group = (v) => (v.breach.length ? "wrong" : v.pub === "refused" ? "refused" : "ok");
export const colors = { ok: "teal", refused: "blue", wrong: "orange" };
export const step = (a) => ({
  AgentDraftsVariant: "an agent drafts the public variant",
  PersonApprovesVariant: "you approve the variant",
  VariantCopiesSource: "the variant is rewritten with the record's own sentence",
  AgentWritesApproved: "an agent marks the variant approved",
  PersonMakesItVariant: "you set the field to publish through a variant",
  PersonApprovesPublic: "you approve the field's wording as public",
  EditField: "someone edits the field",
  Build: "the site build runs",
})[a] ?? a;
