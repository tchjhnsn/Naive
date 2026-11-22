export const title = "Bessemer SaaS metrics: what the founder files, then what gets checked";

const labels = {
  start: "Not started",
  venture: "Phase read",
  product: "Product read",
  pricing: "Pricing read",
  money: "Money read",
  fit: "Retention read",
  telos: "Telos read",
  sources: "Bessemer pages filed",
  decision: "Metrics record proposed",
  decided: "You decided",
  "on-telos": "Targets drafted on the telos",
};

export const state = (v) => {
  if (v.pc === "checked") return v.check === "pass" ? "Checks passed" : "Checks failed";
  return labels[v.pc] ?? v.pc;
};

export const group = (v) => {
  if (v.pc === "checked" && v.check === "fail") return "failed";
  if (v.pc === "checked" || v.pc === "decided" || v.pc === "on-telos") return "passed";
  if (v.pc === "sources" || v.pc === "decision") return "proposed";
  return "reading";
};

export const colors = { reading: "blue", proposed: "purple", passed: "teal", failed: "orange" };

export const step = (action, _from, to) => {
  if (action === "RunChecks") {
    return to.check === "pass"
      ? "you run the checks [when the product is on file]"
      : "you run the checks [when no product is on file]";
  }
  return {
    ReadVenture: "you read the venture's phase",
    ReadProduct: "you read the product",
    ReadPricing: "you read pricing",
    ReadMoney: "you read cash, flows and runway",
    ReadFit: "you read retention",
    ReadTelos: "you read the telos",
    FileSources: "you file the Bessemer pages",
    ProposeMetrics: "you propose the metrics record",
    CiteTarget: null,
    YouDecide: "you decide",
    DraftTargets: "you draft the targets onto the telos [when a telos is already on file]",
    Done: null,
  }[action] ?? null;
};
