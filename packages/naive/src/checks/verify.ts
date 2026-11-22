// The verification substrate: every piece of work has a builder and a verifier that differs from it.
// The gate, lint suites, handoff done criteria and the delegation check call this one module, so the
// rule lives in one place (and MAD can reuse it later).
//
// A check is { kind: "conformance" | "model" | "person", verifier, target }. A conformance check
// runs a command and needs no verifier; a model or person check names one.

export const KINDS = ["conformance", "model", "person"];

// The verifier is named and is not the builder.
export const independent = (builder, verifier) => typeof verifier === "string" && verifier !== "" && verifier !== builder;

// What is wrong with one check, or an empty list. known(verifier) says whether the verifier exists.
/** @param {{ kind?: string, verifier?: string, target?: string }} check @param {string} [builder] @param {(verifier: string) => boolean} [known] */
export function verificationErrors({ kind, verifier, target }, builder, known = () => true) {
  const errors = [];
  if (!KINDS.includes(kind)) errors.push(`${target ?? "check"}: unknown kind ${kind}`);
  if (kind === "conformance") return errors;
  if (!verifier) errors.push(`${target ?? "check"}: names no verifier`);
  else if (!known(verifier)) errors.push(`${target ?? "check"}: verifier ${verifier} is not known`);
  else if (!independent(builder, verifier)) errors.push(`${target ?? "check"}: ${builder} may not verify its own work`);
  return errors;
}

// A handoff review criterion is a person check whose verifier is its reviewer role.
export const reviewIsIndependent = (criterion, holder, roles) =>
  !verificationErrors({ kind: "person", verifier: criterion.reviewer, target: criterion.id }, holder, (r) => roles.has(r)).length;
