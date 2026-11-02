export const title = "What you get back when you ask the Naive site for a page";

export const state = (v) => {
  if (v.outcome === "waiting") return "Nothing asked yet";
  if (v.outcome === "redirect") return "Sent on from an old address";
  if (v.outcome === "gated") return "Sent to the waitlist";
  if (v.asked === "nav") return "A page the nav names";
  if (v.asked === "waitlist") return "The waitlist page";
  return "A public page";
};

export const group = (v) => {
  if (v.outcome === "waiting") return "start";
  if (v.outcome === "page") return "page";
  if (v.outcome === "redirect") return "redirect";
  return "gated";
};

export const colors = {
  start: "tan",
  page: "teal",
  redirect: "orange",
  gated: "blue",
};

export const step = (action) => ({
  OpenDocs: "you open a docs page",
  OpenDotMd: "you open the .md address",
  OpenAccept: "you ask for Markdown",
  OpenMissing: "you open a docs address that is not a page",
  OpenTemplates: "you open templates",
  OpenOldPath: "you open an old address",
  FollowRedirect: "you follow the old address",
  FollowGate: "you follow the redirect",
  OpenNav: "you use the nav",
  OpenWaitlist: "you open the waitlist",
  OpenLlms: "you read llms.txt",
  Again: "you ask for something else",
  Done: null,
})[action] ?? action;
