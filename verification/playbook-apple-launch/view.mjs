export const title = "A launch narrative and a demo script, from the product card";

export const state = (v) => {
  if (!v.sawProduct) return "You have not read the product card yet";
  if (v.product === "absent") return "No product card to launch";
  if (v.product === "thin") return "The product card has no job to show";
  if (!v.sawInputs) return "The product card is read";
  if (!v.sawBrand) return "Inherited inputs are read";
  if (!v.sawPricing) return "The brand record is read";
  if (v.narrative === "none") return "The pricing record is read";
  if (v.demo === "none") return "The launch narrative is drafted";
  if (v.sitemap === "none") return "The demo script is drafted";
  if (v.publicCheck === "none") return "The sitemap points at the launch";
  if (v.publicCheck === "fail") return "The public gate fails";
  if (v.voiceCheck === "fail") return "The voice check fails";
  if (v.supportCheck === "fail") return "A demo beat names no product field";
  if (v.markCheck === "fail") return "The draft uses an Apple mark";
  return "The launch passes its checks";
};

export const group = (v) => {
  if (!v.sawProduct || v.product === "absent" || v.product === "thin") return "waiting";
  if (v.publicCheck === "fail" || v.voiceCheck === "fail" || v.supportCheck === "fail" || v.markCheck === "fail") return "failed";
  if (v.publicCheck === "pass") return "passed";
  if (v.sitemap === "pointed") return "checking";
  return "drafting";
};

export const colors = {
  waiting: "tan",
  drafting: "blue",
  checking: "purple",
  passed: "teal",
  failed: "orange",
};

export const step = (action, from, to) => {
  if (action === "ReadMissing") return "you read the product card and there is none";
  if (action === "ReadProduct") {
    return to.product === "thin"
      ? "you read the product card and it has no job"
      : "you read the product card";
  }
  if (action === "ReadInputs") return "you read what marketing inherits";
  if (action === "ReadBrand") return "you read the brand record";
  if (action === "ReadPricing") return "you read the pricing record";
  if (action === "WriteNarrative") return "you draft the launch narrative";
  if (action === "WriteDemo" || action === "WriteDemoAfterDefect") return "you draft the demo script";
  if (action === "WriteSitemap") return "you point the sitemap at the launch";
  if (action === "RunChecks") {
    if (to.publicCheck === "fail") return "you run the checks and the public gate fails";
    if (to.voiceCheck === "fail") return "you run the checks and the voice check fails";
    if (to.supportCheck === "fail") return "you run the checks and a demo beat has no product field";
    if (to.markCheck === "fail") return "you run the checks and the draft uses an Apple mark";
    return "you run the checks and they pass";
  }
  if (action === "StopNoProduct" || action === "StopThin" || action === "Done") return null;
  return action;
};
