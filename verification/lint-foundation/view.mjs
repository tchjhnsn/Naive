const label = (v) => {
  if (v.step === "start") return "Nothing read yet";
  if (v.step === "loaded") return "Records read from the venture";
  if (v.step === "judged") {
    if (v.finding === "none" && v.shape === "clean") return "Clean venture, no finding";
    if (v.finding === "none") return "Missing or malformed record skipped";
    return v.closed ? "A rule fired, set to fail" : "A rule fired, warning only";
  }
  return v.exitCode === 1 ? "Exited failed" : "Exited with no failure";
};

export const title = "Foundation lint: a finding, and how the run exits";
export const state = (v) => label(v);
export const group = (v) => {
  const name = label(v);
  if (name === "Nothing read yet") return "waiting";
  if (name === "Records read from the venture") return "read";
  if (name === "A rule fired, warning only") return "warn";
  if (name === "A rule fired, set to fail" || name === "Exited failed") return "fail";
  return "clear";
};
export const colors = { waiting: "tan", read: "blue", warn: "yellow", fail: "orange", clear: "teal" };
export const step = (action, _from, to) => {
  if (action === "Done") return null;
  if (action === "Load") return "read the records through venture files";
  if (action === "Judge") {
    if (to.finding === "none" && to.shape === "clean") return "judge a clean venture";
    if (to.finding === "none") return "skip a missing or malformed record";
    if (to.closed) return "a rule fires and its mode is fail closed";
    return "a rule fires as a warning";
  }
  if (action === "Finish") return to.exitCode === 1 ? "exit 1" : "exit 0";
  return null;
};
