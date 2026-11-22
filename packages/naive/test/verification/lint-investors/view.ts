export const title = "An investor update, and what investors/lint flags";

export const state = (v) => {
  if (v.records !== "ok") return "A record is missing or broken";
  if (v.raiseHit) return v.exitCode === 1 ? "Raise has no use of funds, run fails" : "Raise has no use of funds";
  if (v.termsHit) return v.exitCode === 1 ? "Terms conflict with alignment, run fails" : "Terms conflict with alignment";
  if (v.updateHit && v.update === "draft") return v.exitCode === 1 ? "Draft update, unconfirmed numbers, run fails" : "Draft update, unconfirmed numbers flagged";
  if (v.updateHit && v.update === "sent") return v.exitCode === 1 ? "Sent update, unconfirmed numbers, run fails" : "Sent update, unconfirmed numbers flagged";
  if (v.update === "draft") return "Draft update, numbers confirmed";
  if (v.update === "sent") return "Sent update, numbers confirmed";
  if (Array.isArray(v.closed) && v.closed.length) return "Clean venture, a rule is fail-closed";
  return "Clean venture";
};

export const group = (v) => {
  if (v.records !== "ok") return "broken";
  if (v.exitCode === 1) return "fails";
  if (v.raiseHit || v.termsHit || v.updateHit) return "flagged";
  if (v.update === "sent") return "sent";
  if (v.update === "draft") return "draft";
  return "clean";
};

export const colors = {
  clean: "teal",
  draft: "blue",
  sent: "teal",
  flagged: "yellow",
  fails: "orange",
  broken: "tan",
};

const labels = {
  RecordRaiseWithoutUse: "you record a raise with no use of funds",
  AddUseOfFunds: "you add a use of funds",
  RecordConflictingTerms: "you record terms a principle forbids",
  AlignTerms: "you change the terms to match alignment",
  DraftUpdate: "you draft an update with unconfirmed numbers",
  ConfirmNumbers: "you confirm the numbers",
  SendUpdate: "you send the update",
  CloseRaised: "you set the raise rule fail-closed",
  CloseTerms: "you set the terms rule fail-closed",
  CloseUpdate: "you set the update rule fail-closed",
  CloseWhileClean: "you set a rule fail-closed [while nothing is flagged]",
  Reopen: "you set the rule fail-open",
  LoseRecord: "a record is missing or not valid JSON",
  GarbleRecord: "a record is missing or not valid JSON",
  GarbleRaise: "the raise decision is not valid JSON",
  RepairRecords: "you repair the record",
  Done: null,
};

const quiet = (v) => v.records === "ok" && !v.raiseHit && !v.termsHit && !v.updateHit && v.update === "none";

export const step = (action, from, to) => {
  if (action === "Done") return null;
  // The clean venture with a fail-closed rule and no finding is one state. Showing every
  // violation starting from there repeats arrows the clean venture already has.
  const fromCleanClosed = quiet(from) && Array.isArray(from.closed) && from.closed.length > 0;
  if (fromCleanClosed && action !== "Reopen") return null;
  const toCleanClosed = quiet(to) && Array.isArray(to.closed) && to.closed.length > 0;
  if (toCleanClosed && action !== "CloseWhileClean") return null;
  if (action === "RepairRecords") {
    return to.raiseHit ? "you repair the record [the raise finding returns]" : "you repair the record [the venture is clean again]";
  }
  return labels[action] ?? null;
};
