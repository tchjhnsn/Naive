// A stand-in channel builder for the publish build tests: writes generated/venture-facts.json under
// NAIVE_PUBLISH_OUT from the venture at NAIVE_VENTURE. Each fact reaches the file only through
// packages/naive/src/engine/visibility.mjs publicValue, so an internal field is left out. A real app (a marketing site)
// registers its own builders; this one exists so Naive's gate, compile, verify and record steps are
// tested end to end without any app.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { publicValue } from "../../../packages/naive/src/engine/visibility.mjs";

const venture = process.env.NAIVE_VENTURE, out = process.env.NAIVE_PUBLISH_OUT;
if (!venture || !out) throw new Error("NAIVE_VENTURE and NAIVE_PUBLISH_OUT must be set");
const dir = resolve(venture);
const manifest: { id?: string } = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));

const facts: Record<string, unknown> = { venture: manifest.id ?? null };
const put = (name: string, rel: string, field: string): void => {
  const v = publicValue(dir, rel, field);
  if (v) facts[name] = { value: v.value, source: v.from === "field" ? `${rel}#${field}` : v.from };
};
put("problem", "foundation/problem.json", "statement");
put("segment", "foundation/problem.json", "segment");
put("forms", "foundation/problem.json", "forms");
put("promise", "venture.json", "core.promise");
put("tagline", "marketing/decisions/tagline.decision.json", "answer");

mkdirSync(join(resolve(out), "generated"), { recursive: true });
writeFileSync(join(resolve(out), "generated/venture-facts.json"), JSON.stringify(facts, null, 2) + "\n");
