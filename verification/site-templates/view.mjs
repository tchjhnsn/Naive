export const title = "From a file in the repository to a template card";

const labels = {
  start: "Nothing listed yet",
  read: "A record was read from the repository",
  cards: "Cards are on the page",
  filtered: "The filters match some cards",
  empty: "The filters match nothing",
  detail: "The detail page is open",
  use: "The use command is shown",
};

export const state = (v) => labels[v.screen];

export const group = (v) => {
  if (v.screen === "start" || v.screen === "read") return "building";
  if (v.screen === "detail" || v.screen === "use") return "reading";
  return "browsing";
};

export const colors = { building: "blue", browsing: "teal", reading: "purple" };

export const step = (action) => ({
  Discover: "the build reads a file from the repository",
  ShowCards: "the page lists a card for that file",
  ApplyMatchingFilter: "you set a filter that keeps the card",
  ApplyEmptyFilter: "you set a filter that matches nothing",
  OpenDetail: "you open the card",
  ShowUse: "you choose Use",
  GoBack: "you go back to the full list",
})[action] ?? null;
