export const title = "Inbound content plan, from the sitemap";

const has = (v, route) => Array.isArray(v.available) && v.available.includes(route);

const labels = {
  sitemap: "Sitemap read",
  people: "ICP read",
  problem: "Problem read",
  inputs: "Inherited keys read",
  offer: "Product list read",
  offerItem: "One product read",
  voice: "Voice checked",
  policy: "Publication rules read",
  planned: "Content plan filled",
  drafted: "Drafts written",
  passed: "Checks passed",
  failed: "A check failed",
};

export const state = (v) => {
  if (v.step === "start") return has(v, "marketing/sitemap") ? "Sitemap not read" : "No sitemap on the venture";
  if (v.step === "stopped") return has(v, "marketing/sitemap") ? "Stopped: no ICP" : "Stopped: no sitemap";
  return labels[v.step] ?? v.step;
};

export const group = (v) => {
  if (v.step === "stopped" || (v.step === "start" && !has(v, "marketing/sitemap"))) return "stop";
  if (v.step === "failed") return "fail";
  if (v.step === "passed") return "pass";
  if (v.step === "planned" || v.step === "drafted") return "plan";
  if (v.step === "start") return "wait";
  return "read";
};

export const colors = {
  wait: "yellow",
  read: "blue",
  plan: "purple",
  pass: "teal",
  fail: "orange",
  stop: "pink",
};

const byMove = {
  "start->sitemap": "you read the planned site",
  "sitemap->people": "you read who the venture serves",
  "people->problem": "you read the problem",
  "problem->inputs": "you read the keys marketing inherits",
  "inputs->offer": "you read the product list",
  "offer->offerItem": "you read one product",
  "offerItem->voice": "you run the voice check",
  "voice->policy": "you read who may publish",
  "policy->planned": "you fill the content plan",
  "planned->drafted": "you write the drafts",
  "drafted->passed": "the checks pass",
  "drafted->failed": "a check fails",
  "start->stopped": "you stop [the venture has no sitemap]",
  "sitemap->stopped": "you stop [the venture has no ICP]",
};

export const step = (action, from, to) => {
  if (action === "Done") return null;
  return byMove[`${from.step}->${to.step}`] ?? action;
};
