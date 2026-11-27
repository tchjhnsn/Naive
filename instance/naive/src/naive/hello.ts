// A venture program: naive run src/naive/hello.ts
// The default export is an Effect, or a function of { dir } that returns a value, a promise or an Effect. It runs on
// the venture runtime Naive provides, with the same copy of Effect Naive uses (the pin in package.json).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";

export default ({ dir }: { dir: string }) => Effect.gen(function* () {
  const venture = yield* Effect.try(() => JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as { name?: string });
  return `${venture.name ?? "this venture"} runs on Effect`;
});
