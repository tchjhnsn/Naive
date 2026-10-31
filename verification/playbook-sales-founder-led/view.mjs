export const title = "Founder-led sales: one customer through the pipeline";

const label = (v) => {
  if (v.stopped && v.verdict === "none") return "Stopped: the foundation records are missing";
  if (v.verdict === "pass") return "Checks passed";
  if (v.verdict === "fail") return "Checks failed";
  if (v.deal === "none" && !v.sourcesRead) return "Not started";
  if (v.deal === "none" && !v.foundationRead) return "You read where customer records live";
  if (v.deal === "none" && v.price === "unread") return "You know who you sell to";
  if (v.deal === "none") return "You have read the price, or found none";
  if (v.deal === "named" && v.notes) return "On the list, with notes and no log";
  if (v.deal === "named" && !v.stream) return "On the list";
  if (v.deal === "named") return "On the list, conversation log open";
  if (v.deal === "aware") return "Aware: you have talked";
  if (v.deal === "trying") return "Trying: they use it and have not paid";
  if (v.deal === "paying") return "Paying";
  if (v.deal === "gone") return "Gone";
  if (v.deal === "other") return "A buying stage the package does not use";
  return "Other";
};

export const state = (v) => label(v);

export const group = (v) => {
  const name = label(v);
  if (name.startsWith("Stopped") || name === "Checks failed" || name.startsWith("A buying")) return "stop";
  if (name === "Checks passed" || name === "Paying") return "paid";
  if (name === "Gone") return "gone";
  if (name.startsWith("Aware") || name.startsWith("Trying")) return "talk";
  if (name.startsWith("On the list")) return "list";
  return "read";
};

export const colors = {
  stop: "orange",
  paid: "teal",
  gone: "tan",
  talk: "purple",
  list: "yellow",
  read: "blue",
};

const words = {
  ReadSources: "you read where customer records live",
  ReadFoundation: "you read who you sell to",
  ReadPrice: "you read the price, or find that there is none",
  NameCustomer: "you name someone who matches the profile",
  OpenStream: "you open the conversation log",
  Meet: "you talk, and write what happened",
  StartTrying: "they use it, and you write when you will ask them to pay",
  TryWithoutAsk: "they use it, and you leave out the next ask",
  Close: "they pay an amount",
  PayWithoutAmount: "you mark them paying and leave out the amount",
  LetGo: "you let them go",
  NotesBeforeStream: "you write notes before the conversation log",
  BadStage: "you write a buying stage the package does not use",
  Done: "you stop here",
};

export const step = (action, from, to) => {
  if (action === "RunCheck") {
    if (from.deal === "none" && !from.stopped && from.price === "unread") return null;
    return to.verdict === "pass" ? "you run the checks, and they pass" : "you run the checks, and they fail";
  }
  return words[action] ?? action;
};
