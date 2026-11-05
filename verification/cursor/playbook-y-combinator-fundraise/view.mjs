export const title = "A founder runs the seed fundraising playbook";

const phaseLabel = {
  start: "Venture records only",
  story: "Story read from the venture",
  blank: "Raise plan drafted, labels blank",
  filled: "Raise plan filled in",
  listed: "Investor records written",
  room: "Data room checklist written",
  decided: "Founder decided the plan",
  recorded: "Signed instrument on the cap table",
};

const failLabel = {
  "plan-fails": "Raise plan check fails",
  "investors-fail": "Investor check fails",
  "room-fails": "Data room check fails",
};

export const state = (v) => {
  if (v.checks === "pass" && v.phase === "room") return "Checks pass";
  if (v.checks === "pass") return phaseLabel[v.phase];
  if (v.checks !== "pending") return failLabel[v.checks];
  return phaseLabel[v.phase];
};

export const group = (v) => {
  if (v.checks === "pass") return "passing";
  if (v.checks !== "pending") return "failing";
  if (v.phase === "start" || v.phase === "story") return "reading";
  return "drafting";
};

export const colors = {
  reading: "blue",
  drafting: "yellow",
  failing: "orange",
  passing: "teal",
};

export const step = (action) => ({
  ReadStory: "you read the records the venture already has",
  DraftPlan: "you draft the raise plan with the labels empty",
  FailPlan: "you run the raise plan check",
  FixPlan: "you fill in amount, months, and what the money buys",
  FillPlan: "you fill in amount, months, and what the money buys",
  FailInvestors: "you run the investor check",
  FixInvestors: "you write an investor record",
  AddInvestors: "you write an investor record",
  FailRoom: "you run the data room check",
  FixRoom: "you write the data room checklist",
  WriteRoom: "you write the data room checklist",
  PassChecks: "you run the checks",
  Decide: "you decide the plan",
  RecordInstrument: "you record the signed instrument on the cap table",
  Done: null,
})[action] ?? action;
