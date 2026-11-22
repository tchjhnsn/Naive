export const title = "Stripe docs playbook: the spec a caller reads, then one changelog entry";

const label = {
  start: "Start",
  stopped: "Stopped: no reader on file",
  reader: "Reader known",
  listed: "Product list read",
  card: "Card names that reader",
  "card-unlinked": "Card names no reader",
  spec: "Spec has every section",
  "spec-thin": "Spec is missing a section",
  "spec-unlinked": "Spec has every section",
  terms: "Terms written",
  "terms-thin": "Terms written",
  "terms-unlinked": "Terms written",
  habit: "Changelog habit proposed",
  "habit-thin": "Changelog habit proposed",
  "habit-unlinked": "Changelog habit proposed",
  passed: "Check passed",
  "failed-thin": "Check failed: a section is blank",
  "failed-unlinked": "Check failed: the card names no reader",
  entry: "Changelog entry written",
  seen: "Habit and entries listed",
};

export const state = (v) => label[v.phase] ?? v.phase;

export const group = (v) => {
  const p = v.phase;
  if (p === "start" || p === "stopped") return "waiting";
  if (p === "reader" || p === "listed" || p === "card" || p === "card-unlinked") return "product";
  if (String(p).startsWith("spec") || String(p).startsWith("terms")) return "spec";
  if (String(p).startsWith("habit")) return "habit";
  if (p === "passed" || p === "entry" || p === "seen") return "done";
  return "failed";
};

export const colors = {
  waiting: "tan",
  product: "blue",
  spec: "purple",
  habit: "yellow",
  done: "teal",
  failed: "orange",
};

export const step = (action, _from, to) => {
  if (action === "Done") return null;
  if (action.startsWith("RunCheck")) {
    if (to.phase === "passed") return "you run the checks and they pass [every section is filled and the card names the reader]";
    if (to.phase === "failed-thin") return "you run the checks and they fail [a spec section is blank]";
    if (to.phase === "failed-unlinked") return "you run the checks and they fail [the card names no reader]";
  }
  // TLC names ProposeSpec, WriteTerms, and ProposeHabit once, for every call of that operator.
  if (action === "ProposeSpec" || action.startsWith("ProposeSpec")) {
    return to.phase === "spec-thin"
      ? "you propose the spec and leave a section blank"
      : "you propose the spec with every section";
  }
  if (action === "WriteTerms" || action.startsWith("WriteTerms")) return "you write a term for each object in the spec";
  if (action === "ProposeHabit" || action.startsWith("ProposeHabit")) return "you propose the changelog habit";
  return {
    ReadReader: "you read who the product is offered to [when the venture has a reader]",
    StopNoReader: "you look for a reader and there is none [when the venture has no reader]",
    ReadProductList: "you read the product list",
    WriteCardLinked: "you write the product card and name that reader",
    WriteCardUnlinked: "you write the product card and name no reader",
    WriteEntry: "you write a changelog entry",
    ReadDecisions: "you read the decision list",
  }[action] ?? action;
};
