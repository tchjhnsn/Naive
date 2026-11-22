export const title = "Lean validation: an interview plan, then evidence on the problem";

const work = (v) => {
  if (v.evidence === "linked") return "Evidence is on the problem";
  if (v.evidence === "dangling" && v.notes === "read") return "The notes are ready, but the cite is still a missing file";
  if (v.notes === "read") return "The notes were read back";
  if (v.evidence === "dangling" && v.notes === "filed") return "Notes are filed, but the cite is still a missing file";
  if (v.notes === "filed") return "Interview notes are filed";
  if (v.evidence === "dangling" && v.plan === "read") return "The plan was read, but the cite is still a missing file";
  if (v.plan === "read") return "The interview plan was read back";
  if (v.evidence === "dangling" && v.plan === "written") return "The plan is written, but the cite is still a missing file";
  if (v.plan === "written") return "The interview plan is written";
  if (v.evidence === "dangling") return "Evidence cites a file that is not there";
  if (v.claim === "accepted") return "The problem claim is accepted";
  if (v.claim === "draft") return "An agent drafted the claim";
  if (v.who === "read") return "You know who you will talk to";
  if (v.icp === "written") return "You wrote the customer profile";
  return "Nothing from this playbook is written yet";
};

export const state = (v) => {
  if (v.learn === "holds" && v.sources === "pass") return "Both checks pass";
  if (v.learn === "holds") return "The assessment says the evidence holds";
  if (v.evidence === "linked" && v.sources === "pass") return "The source check passes";
  if (v.evidence === "dangling" && v.sources === "fail") return "The source check fails";
  if (v.learn === "asks" && v.claim === "draft") return "A draft is not assessed";
  if (v.learn === "asks" && v.claim === "accepted" && v.plan === "none" && v.evidence === "none") return "The assessment asks for evidence";
  if (v.learn === "asks" && v.claim === "absent" && v.who === "unread" && v.icp !== "written") return "The assessment asks for the claim";
  if (v.learn === "learning" && v.claim === "accepted" && v.plan === "none" && v.evidence === "none") return "You ran it as is, and you are still learning";
  return work(v);
};

export const group = (v) => {
  if (v.learn === "holds" && v.sources === "pass") return "check passes";
  if (v.sources === "fail" || v.evidence === "dangling" || (v.learn === "asks" && v.claim !== "accepted")) return "check fails";
  if (v.evidence === "linked" || v.notes !== "none") return "evidence";
  if (v.plan !== "none" || v.learn === "learning") return "plan";
  if (v.claim !== "absent") return "claim";
  return "start";
};

export const colors = {
  start: "blue",
  claim: "yellow",
  plan: "teal",
  evidence: "purple",
  "check passes": "teal",
  "check fails": "orange",
};

export const step = (action, from, to) => {
  if (action === "Done") return null;
  if (action === "RunAssess" && from.evidence === "none" && (from.plan !== "none" || from.learn === "learning")) return null;
  return ({
    WriteIcp: "you write who the venture serves [when it has no profile]",
    ReadIcp: "you read who you will talk to [when a profile is already there]",
    PersonWritesClaim: "you write the problem claim",
    AgentDraftsClaim: "an agent drafts the claim",
    AcceptClaim: "you accept the draft",
    WritePlan: "you write the interview plan",
    ReadPlan: "you read the plan back",
    FileNotes: "you file the interview notes",
    ReadNotes: "you read the notes back",
    WriteEvidence: "you add evidence that cites the notes",
    CiteMissingPath: "you cite a file no step wrote",
    RepairCite: "you cite the notes instead",
    RunAssess: "you run the assessment",
    RunAsIs: "you run the assessment as is",
    RunSourceCheck: "you run the source check",
  })[action] ?? action;
};
