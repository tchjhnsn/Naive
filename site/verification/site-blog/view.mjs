export const title = "A post on the Naive blog";

const label = (phase, slot) => {
  if (phase === "absent") return "Not written";
  if (phase === "draft") return slot > 0 ? "Draft, but listed" : "Draft, off the site";
  if (phase === "scheduled") return slot > 0 ? "Dated ahead, but listed" : "Dated ahead, off the site";
  if (slot === 1) return "Published, first";
  if (slot === 2) return "Published, second";
  return "Published, missing from the blog";
};

export const state = (v) => ({
  "Newer post": label(v.phase.newer, v.slot.newer),
  "Older post": label(v.phase.older, v.slot.older),
});

export const group = (v) => {
  const names = ["newer", "older"];
  const hiddenButListed = (name) =>
    (v.phase[name] === "absent" || v.phase[name] === "draft" || v.phase[name] === "scheduled") && v.slot[name] > 0;
  const publishedButMissing = (name) => v.phase[name] === "published" && v.slot[name] === 0;
  if (names.some((name) => hiddenButListed(name) || publishedButMissing(name))) return "wrong";
  const phases = names.map((name) => v.phase[name]);
  if (phases.some((phase) => phase === "draft")) return "draft";
  if (phases.some((phase) => phase === "scheduled")) return "scheduled";
  if (phases.some((phase) => phase === "published")) return "published";
  return "empty";
};

export const colors = {
  empty: "tan",
  draft: "orange",
  scheduled: "yellow",
  published: "teal",
  wrong: "pink",
};

export const step = (action, from, to) => {
  const changed = ["newer", "older"].filter((name) => from.phase[name] !== to.phase[name]);
  const who = changed.length === 1 ? (changed[0] === "newer" ? "the newer post" : "the older post") : "a post";
  if (changed.length === 1) {
    const name = changed[0];
    const hidden = (phase) => phase === "draft" || phase === "scheduled";
    if (hidden(from.phase[name]) && hidden(to.phase[name]) && from.slot[name] === 0 && to.slot[name] === 0) return null;
  }
  if (action === "SaveDraft" || action === "Schedule") {
    const olderRose = from.slot.older === 2 && to.slot.older === 1;
    const verb = action === "SaveDraft" ? `you mark ${who} as a draft` : `you date ${who} in the future`;
    return olderRose ? `${verb}, and the older one moves up` : verb;
  }
  if (action === "Publish") {
    if (from.slot.older === 1 && to.slot.older === 2) return "you publish the newer post, and the older one moves down";
    return `you publish ${who}`;
  }
  return null;
};
