export const title = "Culture doc and hiring bar on the team plan";

const readingWork = new Set(["problem", "profile"]);
const readingPeople = new Set(["team", "people", "founderlist", "founders"]);
const readingPay = new Set(["rights", "ownership"]);

export const state = (v) => {
  if (v.check === "pass") return "The culture check passed";
  if (v.check === "fail") return "The culture check failed";
  if (v.pc === "accepted") {
    return v.copied || v.payWritten || !v.brief
      ? "Accepted, but the culture check will fail"
      : "You accepted the team plan";
  }
  if (v.pc === "bar") return "Hiring bar drafted";
  if (v.pc === "culture") {
    return v.copied
      ? "Culture doc drafted, with a principle pasted in"
      : "Culture doc drafted, citing alignment";
  }
  if (v.pc === "start") return "Nothing drafted yet";
  if (readingWork.has(v.pc)) return "You have read the work";
  if (v.pc === "alignment") return "You have read the work and the principles";
  if (readingPeople.has(v.pc)) return "You have read the people and the gaps";
  if (readingPay.has(v.pc)) return "You have read who decides and whether pay is recorded";
  if (v.pc === "planread") return "You have looked for a team plan";
  return "In progress";
};

export const group = (v) => {
  if (v.check === "pass") return "passed";
  if (v.check === "fail") return "failed";
  if (v.pc === "culture" && v.copied) return "fix";
  if (v.pc === "accepted" && (v.copied || v.payWritten || !v.brief)) return "fix";
  if (v.pc === "culture" || v.pc === "bar" || v.pc === "accepted") return "draft";
  return "reading";
};

export const colors = {
  reading: "blue",
  draft: "yellow",
  fix: "orange",
  passed: "teal",
  failed: "orange",
};

export const step = (action, _from, to) => {
  if (action === "Done") return null;
  if (action === "ReadProblem") return "you read the work";
  if (action === "ReadProfile") return "you read the venture profile";
  if (action === "ReadAlignment") return "you read the alignment principles";
  if (action === "ReadTeam") return "you read the skill gaps";
  if (action === "ReadPeople") return "you read who is here";
  if (action === "ReadFounderList") return "you read the founder list";
  if (action === "ReadFounders") return "you read each founder";
  if (action === "ReadRights") return "you read who decides";
  if (action === "ReadOwnership") return "you read whether pay and equity are recorded";
  if (action === "ReadPlan") return "you look for a team plan";
  if (action === "WriteCulture") {
    return to.copied
      ? "you draft the culture doc and paste a principle"
      : "you draft the culture doc and cite alignment";
  }
  if (action === "WriteBar") return "you draft the hiring bar";
  if (action === "YouAccept") {
    return to.copied || to.payWritten || !to.brief
      ? "you accept a draft the culture check will fail"
      : "you accept it";
  }
  if (action === "RunCheck") return to.check === "pass" ? "the culture check passes" : "the culture check fails";
  return action;
};
