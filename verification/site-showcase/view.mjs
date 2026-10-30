export const title = "The showcase: entries loaded from their sources, then one filter";

const kind = (filter) => filter.kind;

export const state = (v) => {
  if (!v.loaded) return "Opening";
  if (kind(v.filter) === "all") return "Every entry, featured tiles first";
  if (kind(v.filter) === "examples") return "Examples";
  if (kind(v.filter) === "recorded") return "The recorded venture";
  if (kind(v.filter) === "phase") return "One phase";
  return "One piece on the records";
};

export const group = (v) => (v.loaded ? (kind(v.filter) === "all" ? "all" : "filtered") : "opening");

export const colors = { opening: "tan", all: "blue", filtered: "teal" };

// Hidden in the chart: a jump from one narrowed filter to another. The page allows it.
// The chart keeps the load, each choice from every entry, and the return to every entry.
export const step = (action, from, to) => {
  if (!from.loaded && to.loaded) return "the page loads each entry from its source";
  if (!to.loaded) return null;
  if (kind(from.filter) !== "all" && kind(to.filter) === "all") return "you show every entry";
  if (kind(from.filter) !== "all") return null;
  if (kind(to.filter) === "examples") return "you show the examples";
  if (kind(to.filter) === "recorded") return "you show the recorded venture";
  if (kind(to.filter) === "phase") return "you choose a phase";
  if (kind(to.filter) === "piece") return "you choose a piece";
  return null;
};
