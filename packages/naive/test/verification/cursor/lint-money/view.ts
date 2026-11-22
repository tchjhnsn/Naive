export const title = "Money lint: a transfer decision and an account";

const transfer = (v) => {
  if (v.phase === "none") return "No transfer decision";
  if (v.phase === "bad") return "Transfer record unreadable";
  const named = v.approver === "named";
  if (v.phase === "proposed") return named ? "Proposed, approver named" : "Proposed, no approver";
  if (v.phase === "approved") return named ? "Approved, approver named" : "Approved, no approver";
  return named ? "Executed, approver named" : "Executed, no approver";
};

const account = (v) => ({
  none: "No account",
  owned: "Account has an owner",
  unowned: "Account has no owner",
  bad: "Account record unreadable",
}[v.account]);

export const state = (v) => ({ Transfer: transfer(v), Account: account(v) });

export const group = (v) => {
  if (v.phase === "executed" && v.approver === "named") return "executed";
  if (v.phase === "approved" && v.approver === "named") return "approved";
  if (v.phase === "proposed" && v.approver === "named") return "proposed";
  if (v.phase !== "none" && v.phase !== "bad" && v.approver === "nobody") return "flagged";
  return "clear";
};

export const colors = {
  clear: "teal",
  proposed: "blue",
  approved: "tan",
  executed: "purple",
  flagged: "orange",
};

// Mode toggles and the settled stutter do not change the transfer or the account.
const LABELS = {
  Propose: "a transfer is proposed",
  NameApprover: "someone is named as approver",
  Approve: "the transfer is approved",
  Execute: "the transfer is executed",
  DropApprover: "the approver's name is removed",
  Withdraw: "the transfer decision is withdrawn",
  CorruptDecision: "the transfer record cannot be read",
  AddOwned: "an account names its owner",
  AddUnowned: "an account is recorded with no owner",
  CorruptAccount: "the account record cannot be read",
  RemoveAccount: "the account record is removed",
  FailCloseTransfer: null,
  FailOpenTransfer: null,
  FailCloseAccount: null,
  FailOpenAccount: null,
  Done: null,
};

// Hide arrows that repeat a path the chart already shows. Every state stays reachable, and each
// state keeps an arrow out. Mode toggles stay hidden: they do not change the transfer or the account.
export const step = (action, from) => {
  if (!(action in LABELS)) return action;
  if (action === "CorruptDecision" && from.phase !== "none") return null;
  if (action === "Withdraw" && from.phase !== "bad") return null;
  if (action === "DropApprover" && from.phase === "proposed") return null;
  if (action === "CorruptAccount" && from.account !== "none") return null;
  if (action === "RemoveAccount" && from.account !== "bad") return null;
  if (action === "AddOwned" && from.account === "bad") return null;
  if (action === "AddUnowned" && from.account === "bad") return null;
  return LABELS[action];
};
