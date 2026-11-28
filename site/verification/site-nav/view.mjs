export const title = "Each entry in the Naive site nav";

const names = {
  about: "About",
  waitlist: "Waitlist",
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
  OpenAbout: "you open About",
  OpenWaitlist: "you open Waitlist",
  Again: "you ask for something else",
  Done: null,
})[action] ?? action;
