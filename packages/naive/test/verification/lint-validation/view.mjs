export const title = "Validation lint: a claim, its evidence, and the decision";

const past = (v) => v.rec === "held" && (v.age === 1 || v.phase > v.born);
const discoveryDecision = (v) => v.decided === "validation" && (v.rec === "claim" || v.strength === "discovery");

// Labels the reader can act on. A decision in Discovery, and a Validation decision on stronger
// evidence, add no finding, so they share the label of the claim without that decision.
// The fail-open / fail-closed switch does not change the finding, so it stays off the chart.
export const state = (v) => {
  if (v.rec === "missing") return "No validation record";
  if (v.rec === "bad") return "Record will not parse";
  if (v.rec === "claim") return discoveryDecision(v) ? "Claim with no evidence, decided in Validation" : "Claim with no evidence";
  const bits = [past(v) ? "Evidence past its shelf life" : "Evidence within its shelf life"];
  if (v.who === "agent") bits.push("graded only by an agent");
  if (discoveryDecision(v)) bits.push("Validation decision on discovery-grade evidence");
  return bits.join(", ");
};

export const group = (v) => {
  if (v.rec === "missing" || v.rec === "bad") return "empty";
  const finding = v.rec === "claim" || past(v) || (v.rec === "held" && v.who === "agent") || discoveryDecision(v);
  return finding ? "warn" : "clean";
};

export const colors = { empty: "tan", warn: "orange", clean: "teal" };

export const step = (action, from, to) => {
  if (action === "Wait" || action === "Close" || action === "OpenMode" || action === "GradeOwner") return null;
  if (action === "Tick") return past(from) ? null : "time passes the shelf life";
  if (action === "Advance") return past(from) === past(to) ? null : "the venture changes phase";
  if (action === "Decide") return discoveryDecision(to) ? "someone decides in Validation on discovery-grade evidence" : null;
  if (action === "Undecide") return "the decision is taken back";
  if (action === "GradeAgent") return "an agent grades the assumption";
  if (action === "AddFresh") return "evidence is cited, still inside its shelf life";
  if (action === "AddWeak") return "only discovery-grade evidence is cited";
  if (action === "WriteClaim") return "a claim is written with no evidence";
  if (action === "SeeBad") return "the record will not parse";
  return null;
};
