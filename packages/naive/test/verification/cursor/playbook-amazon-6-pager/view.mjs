export const title = "A decision memo: draft, propose while it stays open, then you decide";

const labels = {
  start: "No memo yet",
  inputs: "You have read the problem, the customer, the principles, and who may decide",
  gap: "An incomplete memo is an open draft",
  drafted: "The memo you mean to finish is an open draft",
  narrative: "The draft names the customer, the problem, and a solution",
  finding: "A finding is recorded for the FAQ",
  faq: "The FAQ cites that finding",
  matrix: "The decision matrix still shows the memo as open",
  proposed: "Proposed, and still open",
  decided: "Decided by you",
};

export const state = (v) => labels[v.stage] ?? v.stage;

export const group = (v) => {
  if (v.stage === "start" || v.stage === "inputs") return "ready";
  if (v.stage === "proposed") return "proposed";
  if (v.stage === "decided") return "decided";
  return "draft";
};

export const colors = {
  ready: "tan",
  draft: "blue",
  proposed: "yellow",
  decided: "teal",
};

export const step = (action) => ({
  ReadInputs: "you read what the venture already holds",
  DraftGap: "you draft a memo and leave the sections empty",
  DraftFull: "you open the memo you mean to propose",
  WriteNarrative: "you write the customer narrative",
  RecordFinding: "you record a finding",
  WriteFaq: "you add the FAQ and cite the finding",
  RunMatrix: "you run the decision matrix",
  Propose: "you propose the memo, and it stays open",
  FounderDecides: "you decide",
  Done: null,
})[action] ?? action;
