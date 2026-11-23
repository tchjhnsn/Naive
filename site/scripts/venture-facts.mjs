// Writes generated/venture-facts.json for the marketing components, through the publishing gate.
// The venture is NAIVE_VENTURE (a venture folder, such as Torian's ~/workspace/naive/naive, or one exported from
// the store). Without it, the build copies site/facts/venture-facts.json, the last facts written from the company
// venture, since its records live in the tenant's store and not in this repository (EE-118 step 9c). Those facts
// are public by construction. --freeze also rewrites that snapshot from NAIVE_VENTURE.
// A field reaches the site only when naive-framework/src/engine/visibility.mjs says it may: the field itself when a person
// approved its wording as public, or its approved public variant (an MDX file with variant_of). Every
// other field is internal and is left out, so the site never shows an internal record's own words.
// Fields asked for: foundation/problem.json statement, segment and forms; venture.json core.promise (the
// mission); the tagline decision's answer. Phases are method level (Naive's purpose/frameworks, read from the installed package), not the venture's.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { publicValue } from "naive-framework/src/engine/visibility.mjs";
import { naivePhases } from "./naive.ts";

const SNAPSHOT = new URL("../facts/venture-facts.json", import.meta.url).pathname;
// NAIVE_PUBLISH_OUT moves the output (default site/), for naive publish build.
const out = process.env.NAIVE_PUBLISH_OUT ? join(resolve(process.env.NAIVE_PUBLISH_OUT), "generated") : new URL("../generated/", import.meta.url).pathname;
const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const freeze = process.argv.includes("--freeze");
if (freeze && !process.env.NAIVE_VENTURE) throw new Error("--freeze needs NAIVE_VENTURE: the venture to write the snapshot from");

// The venture's own facts: from NAIVE_VENTURE through the gate, else the snapshot. The snapshot holds no phases.
let facts;
if (process.env.NAIVE_VENTURE) {
  const root = resolve(process.env.NAIVE_VENTURE);
  facts = { venture: json(join(root, "venture.json")).id };
  const put = (name, rel, field) => {
    const v = publicValue(root, rel, field);
    if (v) facts[name] = { value: v.value, source: v.from === "field" ? `${rel}#${field}` : v.from };
  };
  put("problem", "foundation/problem.json", "statement");
  put("segment", "foundation/problem.json", "segment");
  put("forms", "foundation/problem.json", "forms");
  if (Array.isArray(facts.forms?.value)) facts.forms.value = facts.forms.value.map((f) => f.statement ?? f);
  put("promise", "venture.json", "core.promise");
  put("tagline", "marketing/decisions/tagline.decision.json", "answer");
  if (freeze) { mkdirSync(join(SNAPSHOT, ".."), { recursive: true }); writeFileSync(SNAPSHOT, JSON.stringify(facts, null, 2) + "\n"); }
} else {
  facts = json(SNAPSHOT);
  delete facts.phases;
}
// The phases are Naive's phase modules (packages/naive/src/phases/<id>/phase.json, EE-126), in step order.
facts.phases = { value: naivePhases().map(({ name, question, gate }) => ({ name, question, gate: gate?.name })), source: "packages/naive/src/phases/<id>/phase.json" };

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "venture-facts.json"), JSON.stringify(facts, null, 2) + "\n");
console.log(`venture facts written from ${process.env.NAIVE_VENTURE ? facts.venture : "site/facts/venture-facts.json"}`);
