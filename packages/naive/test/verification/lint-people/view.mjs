export const title = "People lint: a role, a hire, and who owns a decision";

export const state = (v) => ({
  "Team plan": v.plan === "named" ? "The plan names the role" : "The plan does not name the role",
  Hire: v.hired ? "A hire is on the books" : "No hire",
  Role: v.roleOwns ? "The role owns a function" : "The role owns no function",
  Decision: v.decision === "person"
    ? "A person owns the decision"
    : v.decision === "nobody"
      ? "No person owns the decision"
      : "No decided decision",
  Records: v.records === "ok" ? "Records read" : v.records === "missing" ? "Records missing" : "Records malformed",
});

export const group = (v) => {
  if (v.records !== "ok") return "unreadable";
  if (!v.roleOwns || (v.hired && v.plan !== "named") || v.decision === "nobody") return "finding";
  return "clean";
};

export const colors = { clean: "teal", finding: "orange", unreadable: "purple" };

export const step = (action) => ({
  NameRole: "you add the role to the team plan",
  DropRole: "you remove the role from the team plan",
  Hire: "you hire for the role",
  CancelHire: "you withdraw the hire",
  GiveFunction: "you give the role a function",
  TakeFunction: "you take the role's function away",
  LeaveOpen: "you leave the decision open",
  PersonDecides: "a person decides",
  NobodyDecides: "a decision is saved with no person",
  LoseRecords: "the records are missing",
  GarbleRecords: "the records are malformed",
  RestoreRecords: "the records can be read again",
  CloseRole: null,
  CloseHire: null,
  CloseDecision: null,
  OpenRules: null,
})[action] ?? action;
