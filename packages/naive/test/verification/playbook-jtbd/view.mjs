export const title = "Jobs on each customer profile";

export const state = (v) => {
  if (v.phase === "start") return "Start";
  if (v.phase === "stopped" && v.problem === "missing") return "Stopped: no problem record";
  if (v.phase === "stopped") return "Stopped: no customer profile";
  if (v.phase === "problem-read") return "Problem record is open";
  if (v.phase === "profiles") return "Each profile is open";
  if (v.phase === "ready" && v.product === "present") return "Ready to write, product job in view";
  if (v.phase === "ready") return "Ready to write, no product card";
  if (v.phase === "drafted" && v.jobs === "progress") return "Draft: progress in a circumstance";
  if (v.phase === "drafted" && v.jobs === "copied") return "Draft: job copies who or the product";
  if (v.phase === "drafted") return "Draft: profile has no job";
  if (v.phase === "checked" && v.check === "pass") return "Check passed, waiting for you";
  if (v.phase === "checked") return "Check failed";
  if (v.phase === "accepted") return "You accepted the jobs";
  if (v.phase === "bad-route") return "Wrote a route that has no write action";
  if (v.phase === "bad-read") return "Read a product card the venture does not have";
  return v.phase;
};

export const group = (v) => {
  if (v.phase === "stopped" || v.check === "fail" || v.phase === "bad-route" || v.phase === "bad-read") return "blocked";
  if (v.phase === "accepted" || (v.phase === "checked" && v.check === "pass")) return "done";
  if (v.phase === "drafted") return "draft";
  return "working";
};

export const colors = { working: "blue", draft: "yellow", blocked: "orange", done: "teal" };

export const step = (action, _from, to) => {
  if (action === "Park") return null;
  if (action === "SeeProduct") {
    return to.product === "present"
      ? "you read the product's claimed job"
      : "you find no product card";
  }
  const labels = {
    ReadProblem: "you read the problem record [when the venture has one]",
    StopNoProblem: "you stop [no problem record yet]",
    ReadIcp: "you read the customer profiles [when the venture has them]",
    StopNoIcp: "you stop [no customer profile yet]",
    WriteProgress: "you write the progress they are trying to make",
    WriteCopy: "you write a copy of who they are, or of the product's job",
    WriteEmpty: "you leave the job blank",
    RunCheck: "you run the checks",
    Accept: "you accept the draft",
    BadRoute: "you write the profile list, which has no write action",
    BadRead: "you read a product card [when the venture has none]",
    BadCheck: "the check says pass [on a blank or a copy]",
    AcceptFail: "you accept a draft the check failed",
  };
  return labels[action] ?? action;
};
