export const title = "Finance lint";

function metricFires(v) {
  return v.metric === "no_targets" || (v.metric === "validation_only" && v.phase !== "validation");
}

function findings(v) {
  if (v.spend === "malformed" || v.price === "malformed" || v.metric === "malformed") return "A record did not parse";
  if (v.price === "missing_price" || v.price === "missing_cost") return "Price or cost is missing";
  const parts = [];
  if (v.spend === "no_runway") parts.push("Spend has no runway impact");
  if (v.price === "below") parts.push("Price is below cost");
  if (metricFires(v)) parts.push("Metric has no target for this phase");
  return parts.length ? parts.join(". ") : "Nothing to flag";
}

export const state = (v) => `${findings(v)}. ${v.exitCode === "1" ? "Run fails" : "Run passes"}`;

export const group = (v) => {
  if (v.exitCode === "1") return "fail";
  if (v.spend === "malformed" || v.price === "malformed" || v.metric === "malformed" || v.price === "missing_price" || v.price === "missing_cost") return "gap";
  if (v.spend === "no_runway" || v.price === "below" || metricFires(v)) return "warn";
  return "quiet";
};

export const colors = { quiet: "teal", warn: "yellow", fail: "orange", gap: "blue" };

const loads = {
  LoadAbsent: "you check a venture with none of these records",
  LoadClean: "you check a clean venture",
  LoadSpend: "you check a spend decision with no runway impact",
  LoadPrice: "you check a price that is below its cost",
  LoadMetric: "you check a metric targeted only for Validation",
  LoadNoTargets: "the metric has no target for this phase",
  LoadAll: "you check a venture that breaks every rule",
  LoadMalformed: "you check records that do not parse",
  LoadMissingPrice: "you check a price or cost that is not a number",
  LoadMissingCost: "you check a price or cost that is not a number",
};

export const step = (action, from, to) => {
  if (action === "Done") return null;
  if (action === "PhaseChanges") {
    const before = metricFires(from);
    const after = metricFires(to);
    if (before === after) return null;
    return after
      ? "the metric has no target for this phase"
      : "the venture moves back to a phase this metric targets";
  }
  if (action === "ModeChanges") {
    if (from.exitCode === to.exitCode) return null;
    return to.exitCode === "1" ? "a fail-closed rule has a finding" : "the fail-closed rule no longer has a finding";
  }
  return loads[action] ?? null;
};
