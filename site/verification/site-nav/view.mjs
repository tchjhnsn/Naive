export const title = "Each entry in the Naive site nav";

const names = {
  docs: "Docs",
  blog: "Blog",
  templates: "Templates",
  showcase: "Showcase",
  why: "Why",
  who: "Who it is for",
};

export const state = (v) => {
  if (v.outcome === "waiting") return "Nothing asked yet";
  if (v.outcome === "not-found") return "Not found";
  return names[v.asked] ?? "A page";
};

export const group = (v) => {
  if (v.outcome === "waiting") return "start";
  if (v.outcome === "not-found") return "missing";
  return "page";
};

export const colors = { start: "tan", page: "teal", missing: "pink" };

export const step = (action) => ({
  OpenDocs: "you open Docs",
  OpenBlog: "you open Blog",
  OpenTemplates: "you open Templates",
  OpenShowcase: "you open Showcase",
  OpenWhy: "you open Why",
  OpenWho: "you open Who it is for",
  Again: "you ask for something else",
  Done: null,
})[action] ?? action;
