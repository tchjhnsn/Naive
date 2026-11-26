// A done-criterion as a venture program. Name it in a handoff:
//   { "id": "named", "kind": "conformance", "runs": "effect", "check": "src/naive/done/venture-named.ts" }
// It passes when it succeeds and returns neither false nor { passed: false }; output is what the evidence keeps.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";

export default ({ dir }: { dir: string }) => Effect.sync(() => {
  const venture = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as { name?: string };
  return { passed: Boolean(venture.name), output: venture.name ? `named ${venture.name}` : "venture.json has no name" };
});
