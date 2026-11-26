// The data labels (EE-191). A generated record under a venture passes nothing. An accepted record from an
// observed venture is not gold. A record with a source and a method, and not that gold pair, is estimated.
//
//   node packages/naive/src/terms/labels-test.ts

import { judgeLabel } from "./labels.ts";
import type { LabelFacts } from "./levels.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };

const facts = (over: Partial<LabelFacts>): LabelFacts => ({
  confirmed: true, hasSource: false, hasMethod: false, generated: false, accepted: false, ownVenture: false, underVenture: false, ...over,
});

expect("a generated record under a venture passes no label", judgeLabel(facts({ generated: true, underVenture: true, hasSource: true, hasMethod: true, accepted: true, ownVenture: true })).verdict === "none");
{
  const observed = judgeLabel(facts({ accepted: true, ownVenture: false, hasSource: true, underVenture: true }));
  expect("an accepted record from an observed venture is sourced, so it is not gold", observed.verdict === "sourced", observed.verdict);
}
expect("a record with a source and a method is estimated", judgeLabel(facts({ hasSource: true, hasMethod: true })).verdict === "estimated");
expect("an accepted record from one of our own ventures, not generated, is gold", judgeLabel(facts({ accepted: true, ownVenture: true, hasSource: true, hasMethod: true })).verdict === "gold");

const bit = [false, true];
let illegal = 0;
for (const hasSource of bit) for (const hasMethod of bit) for (const generated of bit)
  for (const accepted of bit) for (const ownVenture of bit) for (const underVenture of bit)
    if (judgeLabel(facts({ hasSource, hasMethod, generated, accepted, ownVenture, underVenture })).verdict === "illegal") illegal++;
expect("no combination of the six facts passes more than one label", illegal === 0, `${illegal} illegal`);
expect("unconfirmed facts pass no label", judgeLabel(facts({ confirmed: false, hasSource: true, hasMethod: true })).verdict === "none");

console.log(failed ? `${failed} failed` : "data labels: all pass");
process.exit(failed ? 1 : 0);
