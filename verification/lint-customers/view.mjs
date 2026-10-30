export const title = "Customers lint: a promise read against the product record";

function icpOn(v) {
  return (v.customer === "matched" || v.customer === "unmatched") && (v.customer === "unmatched" || v.icp !== "known");
}
function promiseOn(v) {
  return v.promise === "made" && (v.customer === "matched" || v.customer === "unmatched") && v.product !== "keeps";
}
function failed(v) {
  const closeIcp = v.configMode === "icp-closed" || v.configMode === "both-closed";
  const closePromise = v.configMode === "promise-closed" || v.configMode === "both-closed";
  return (icpOn(v) && closeIcp) || (promiseOn(v) && closePromise);
}

export const state = (v) => {
  if (v.crashed) return "Lint crashed";
  if (v.customer === "bad") return "Customer record unreadable, lint finished";
  const icp = icpOn(v);
  const promise = promiseOn(v);
  const fail = failed(v);
  if (!icp && !promise && v.promise === "made" && v.product === "keeps" && v.customer === "matched" && v.icp === "known") return "Promise kept";
  if (!icp && !promise) return v.configMode === "config-bad" ? "Config unreadable, still quiet" : "Quiet";
  const head = fail ? "Failed closed" : "Warned";
  if (icp && promise) return `${head}: both rules`;
  if (icp) return `${head}: matches no ICP`;
  return `${head}: the product does not keep the promise`;
};

// One label per pair of chart states. Every action between that pair shares it.
// Any other pair is hidden. The README lists what the chart leaves out.
const edges = {
  "Quiet|Config unreadable, still quiet": "naive.config.json cannot be read",
  "Config unreadable, still quiet|Quiet": "naive.config.json can be read again",
  "Quiet|Customer record unreadable, lint finished": "the customer record cannot be read",
  "Customer record unreadable, lint finished|Quiet": "the customer record is removed",
  "Quiet|Warned: matches no ICP": "a customer matches no ICP",
  "Warned: matches no ICP|Quiet": "the customer matches an ICP",
  "Warned: matches no ICP|Failed closed: matches no ICP": "the ICP rule is fail-closed",
  "Failed closed: matches no ICP|Warned: matches no ICP": "the run is fail-open again",
  "Failed closed: matches no ICP|Quiet": "the customer matches an ICP",
  "Quiet|Promise kept": "a promise is made while the product keeps it",
  "Promise kept|Warned: matches no ICP": "the customer matches no ICP",
  "Promise kept|Warned: the product does not keep the promise": "the product record changes and no longer keeps the promise",
  "Warned: the product does not keep the promise|Promise kept": "the product record keeps the promise again",
  "Warned: the product does not keep the promise|Failed closed: the product does not keep the promise": "the promise rule is fail-closed",
  "Failed closed: the product does not keep the promise|Warned: the product does not keep the promise": "the run is fail-open again",
  "Failed closed: the product does not keep the promise|Promise kept": "the product record keeps the promise again",
  "Warned: the product does not keep the promise|Warned: both rules": "the customer also matches no ICP",
  "Warned: both rules|Warned: the product does not keep the promise": "the customer matches an ICP again",
  "Warned: both rules|Failed closed: both rules": "both rules are fail-closed",
  "Failed closed: both rules|Warned: both rules": "the run is fail-open again",
};

export const group = (v) => {
  const s = state(v);
  if (s.startsWith("Failed") || s === "Lint crashed") return "failed";
  if (s.startsWith("Warned")) return "warned";
  if (s.includes("unreadable") || s.includes("Unreadable")) return "unreadable";
  return "quiet";
};

export const colors = { quiet: "teal", warned: "yellow", failed: "orange", unreadable: "purple" };

export const step = (_action, from, to) => edges[`${state(from)}|${state(to)}`] ?? null;
