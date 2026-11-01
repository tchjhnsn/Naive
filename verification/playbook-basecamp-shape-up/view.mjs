export const title = "One six-week cycle: shape a pitch, bet, build, then cool down";

export const state = (v) => {
  if (v.phase === "start") return "Venture has a product and an ICP";
  if (v.phase === "saw-product") return "The offer is read";
  if (v.phase === "who-read") return "Who it is for is read";
  if (v.phase === "shaping") return "Shaping";
  if (v.phase === "pitched" && v.pitch === "full" && v.check === "none") return "Pitch drafted";
  if (v.phase === "pitched" && v.pitch === "thin" && v.check === "none") return "Pitch drafted with a blank section";
  if (v.phase === "pitched" && v.check === "pass") return "Pitch check passed";
  if (v.phase === "pitched" && v.check === "fail") return "Pitch check failed";
  if (v.phase === "betting") return "The bet is open";
  if (v.phase === "declined") return "You declined the bet";
  if (v.phase === "placed") return "You placed the bet";
  if (v.phase === "building" && v.check === "none") return "Building for six weeks";
  if (v.phase === "building" && v.check === "pass") return "The cycle check passed";
  if (v.phase === "building" && v.check === "fail") return "The cycle check failed";
  if (v.phase === "shipped") return "Shipped inside the appetite";
  if (v.phase === "tripped") return "The circuit breaker tripped";
  if (v.phase === "cooldown") return "Cool-down between cycles";
  return "Unmapped";
};

export const group = (v) => {
  if (v.phase === "pitched" && v.check === "fail") return "failed";
  if (v.phase === "building" && v.check === "fail") return "failed";
  if (v.phase === "declined") return "declined";
  if (v.phase === "tripped") return "breaker";
  if (v.phase === "cooldown") return "cooldown";
  if (v.phase === "shipped" || v.phase === "building") return "building";
  if (v.phase === "betting" || v.phase === "placed") return "betting";
  return "shaping";
};

export const colors = {
  shaping: "blue",
  betting: "purple",
  building: "teal",
  failed: "pink",
  declined: "tan",
  breaker: "orange",
  cooldown: "yellow",
};

export const step = (action, _from, to) => {
  if (action === "WritePitch" || action === "WritePitchFull" || action === "WritePitchThin") {
    return to.pitch === "thin" ? "you write the pitch and leave a section blank" : "you write the pitch as a handoff";
  }
  if (action === "CheckPitch") return to.check === "pass" ? "the pitch check passes" : "the pitch check fails";
  if (action === "CheckBuildPass") return "the cycle check passes";
  if (action === "ClaimDone") return "the cycle check fails";
  return {
    ReadProduct: "you read the product card",
    ReadIcp: "you read who it is for",
    ReadRights: "you read the decision rights",
    WritePitchFull: "you write the pitch as a handoff",
    WritePitchThin: "you write the pitch and leave a section blank",
    RewritePitch: "you fill the blank section",
    ProposeBet: "you propose the bet and leave it open",
    YouBet: "you bet one six-week cycle",
    YouDecline: "you decline the bet",
    OpenCycle: "you open the cycle handoff",
    FixBuild: "you correct the cycle handoff",
    Ship: "the work ships and the evidence is written",
    Trip: "the appetite is spent and the circuit breaker trips",
    OpenCooldown: "you open the cool-down handoff",
    Done: null,
  }[action] ?? action;
};
