// The eval terms (EE-198). A held-out id that sits in an exemplar does not pass held-out-item.
// A label an agent set does not pass person-label. A null label does, and so does a person's label.
//
//   node packages/naive/src/terms/evals-test.ts

import { heldOutFacts, judgeHeldOut, judgePersonLabel, personLabelFacts } from "./evals.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };

{
  const held = judgeHeldOut(heldOutFacts("held-out", true, false));
  expect("a held-out id in an exemplar does not pass held-out-item", !held.pass && held.failed.includes("H2"), held.failed.join(","));
}
expect("a held-out id in a prompt fixture does not pass held-out-item", !judgeHeldOut(heldOutFacts("held-out", false, true)).pass);
expect("a held-out id in neither passes held-out-item", judgeHeldOut(heldOutFacts("held-out", false, false)).pass);
expect("an exemplar split does not pass held-out-item", !judgeHeldOut(heldOutFacts("exemplar", false, false)).pass);

{
  const agent = judgePersonLabel(personLabelFacts(true, "agent"));
  expect("a label an agent set does not pass person-label", !agent.pass && agent.failed.includes("P1"), agent.failed.join(","));
}
expect("a label with no author does not pass person-label", !judgePersonLabel(personLabelFacts(true, null)).pass);
expect("a null label passes person-label", judgePersonLabel(personLabelFacts(false, null)).pass);
expect("a label a person set passes person-label", judgePersonLabel(personLabelFacts(true, "person")).pass);

console.log(failed ? `${failed} failed` : "eval terms: all pass");
process.exit(failed ? 1 : 0);
