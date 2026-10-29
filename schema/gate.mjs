// The gate (EE-073): checks that run before a write. One per venture. Static rules live in
// naive.config.json. Per-package rules are the gates on each package definition. The gate
// matches the router's path patterns and never calls a model. Confidence routing reads a
// score that was already computed.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;

/** Package gates, imported from packages/<name>/package.json. No model, no network. */
export function packageGates() {
  const dir = join(repo, "packages");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name, "package.json");
    if (!existsSync(p)) return [];
    const pkg = JSON.parse(readFileSync(p, "utf8"));
    return (pkg.gates ?? []).map((rule) => ({ package: pkg.name, rule }));
  });
}

/**
 * Whether an agent write is held as a draft. fail_closed names path prefixes
 * (foundation, or foundation/problem). A person is not held.
 */
export function hold(config, route, actor) {
  if (actor === "person") return null;
  const closed = config?.fail_closed ?? [];
  const hit = closed.find((g) => route === g || route.startsWith(`${g}/`));
  return hit ? { hold: "draft", rule: hit } : null;
}

/** The venture's naive.config.json, or an empty config. */
export function configOf(dir) {
  const f = dir && join(dir, "naive.config.json");
  if (!f || !existsSync(f)) return { fail_closed: [] };
  return JSON.parse(readFileSync(f, "utf8")).gate ?? { fail_closed: [] };
}
