export const title = "What you get back when you ask the Naive site for a page";

export const state = (v) => {
  if (v.outcome === "waiting") return "Nothing asked yet";
  if (v.outcome === "redirect") return "Sent on to a docs page";
  if (v.outcome === "not-found") return "Not found";
  if (v.outcome === "markdown" && v.asked === "llms") return "llms.txt";
  if (v.outcome === "markdown") return "The page as Markdown";
  if (v.asked === "nav") return "A page the nav names";
  return "A docs page";
};

export const group = (v) => {
  if (v.outcome === "waiting") return "start";
  if (v.outcome === "page") return "page";
  if (v.outcome === "markdown") return "markdown";
  if (v.outcome === "redirect") return "redirect";
  return "missing";
};

export const colors = {
  start: "tan",
  page: "teal",
  markdown: "blue",
  redirect: "orange",
  missing: "pink",
};

export const step = (action) => ({
  OpenDocs: "you open a docs page",
  OpenDotMd: "you open the .md address",
  OpenAccept: "you ask for Markdown",
  OpenMissing: "you open a docs address that is not a page",
  OpenOldPath: "you open an old address",
  FollowRedirect: "you follow the redirect",
  OpenNav: "you use the nav",
  OpenLlms: "you read llms.txt",
  Again: "you ask for something else",
  Done: null,
})[action] ?? action;
