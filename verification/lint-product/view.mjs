export const title = "Product lint: a record is read, judged, then the run exits";

const judged = (v) => {
  if (v.defect === "malformed") return "Broken record skipped";
  if (v.finding === "none") return "No finding";
  if (v.finding === "product-no-icp") return "Finding: product offered to no ICP";
  if (v.finding === "feature-no-job") return "Finding: feature serves no job";
  return "Finding: business model has no pricing record";
};

export const state = (v) => {
  if (v.phase === "start") return "Venture given, records not read";
  if (v.phase === "read") return "Records read from the venture";
  if (v.phase === "judged") return judged(v);
  return v.exit === 1 ? "Exit 1" : "Exit 0";
};

export const group = (v) => {
  if (v.phase === "start" || v.phase === "read") return "reading";
  if (v.phase === "exited") return v.exit === 1 ? "failed" : "clear";
  if (v.defect === "malformed" || v.finding === "none") return "clear";
  return "finding";
};

export const colors = { reading: "blue", clear: "teal", finding: "orange", failed: "pink" };

export const step = (action, from, to) => {
  if (action === "Done") return null;
  if (action === "Read") return "read the venture's records";
  if (action === "Judge") {
    if (to.defect === "malformed") return "skip a record that is not valid JSON";
    if (to.finding === "none") return "judge a clean venture";
    if (to.finding === "product-no-icp") return "the product names no ICP";
    if (to.finding === "feature-no-job") return "the feature serves no job";
    return "the business model has no pricing record";
  }
  if (to.exit === 1) return "a fail-closed rule has a finding";
  if (from.finding !== "none") return "the finding stays a warning";
  return "no fail-closed finding";
};
