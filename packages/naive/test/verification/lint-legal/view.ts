export const title = "Legal lint (not legal advice)";

const judged = (v) => {
  if (v.claimFinding && v.agreementFinding) return "Both rules have findings";
  if (v.claimFinding) return "Public claim has no source";
  if (v.agreementFinding) return "Agreement has no counterparty";
  if (v.claim === "malformed" || v.agreement === "malformed") return "A record could not be read";
  return "Nothing to report";
};

export const state = (v) => {
  if (v.phase === "ready") return "Ready to lint";
  if (v.phase === "judged") return judged(v);
  if (v.phase === "done") {
    const closed = (v.claimFinding && v.claimMode === "fail-closed")
      || (v.agreementFinding && v.agreementMode === "fail-closed");
    return closed ? "Exit 1" : "Exit 0";
  }
  return "Reading records";
};

export const group = (v) => {
  if (v.phase === "done") return v.code === 1 ? "failed" : "ok";
  if (v.phase === "judged") return (v.claimFinding || v.agreementFinding) ? "findings" : "clear";
  return "running";
};

export const colors = { running: "blue", findings: "yellow", clear: "teal", ok: "teal", failed: "orange" };

export const step = (action, from, to) => {
  if (action === "SeeClaim") return "the lint reads the venture's records";
  if (action === "SeeAgreement" || action === "ApplyModes") return null;
  if (action === "Judge") {
    if (to.claimFinding && to.agreementFinding) return "a public claim has no source, and an agreement has no counterparty";
    if (to.claimFinding) return "the public claim has no source";
    if (to.agreementFinding) return "the agreement has no counterparty record";
    if (to.claim === "malformed" || to.agreement === "malformed") return "a record could not be read, so it is skipped";
    return "the records are clean";
  }
  if (action === "Exit") {
    if (to.code === 1) return "a fail-closed rule has findings, so the run fails";
    if (from.claimFinding || from.agreementFinding) return "the findings stay warnings, so the run exits 0";
    return "the run exits 0";
  }
  if (action === "Done") return null;
  return action;
};
