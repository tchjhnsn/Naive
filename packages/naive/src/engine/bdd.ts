#!/usr/bin/env node
// Runs Gherkin feature files as tests (EE-050): behavior-driven development without dependencies.
// Each scenario's Given, When, Then, And and But steps are matched against the step definitions
// in <name>.steps.mjs beside <name>.feature (an exported array of [RegExp, async (world, ...groups)]).
// A step with no definition fails its scenario, so a behavior cannot be written down and skipped.
//
//   node packages/naive/src/engine/bdd.ts <file.feature>...
//
// Supports Feature, Rule, Background, Scenario, the five step keywords and # comments; not
// Scenario Outline, tables or doc strings yet.

import { readFileSync } from "node:fs";

/** A scenario, with the background steps of its rule before its own. */
export type Scenario = { name: string; rule: string | null; steps: string[] };
/** What a scenario's steps share; a step may set cleanup to run after the scenario. */
export type World = { cleanup?: () => unknown; [key: string]: unknown };
/** A step definition: the pattern and what runs with its groups. */
export type StepDefinition = [RegExp, (world: World, ...groups: string[]) => unknown];

export function parse(text: string): Scenario[] {
  const scenarios: Scenario[] = [];
  let rule: string | null = null, background: string[] = [], cur: { background?: true; steps: string[] } | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    let m;
    if ((m = line.match(/^Rule:\s*(.*)$/))) { rule = m[1]; background = []; cur = null; }
    else if (/^Background:/.test(line)) cur = { background: true, steps: background };
    else if ((m = line.match(/^Scenario:\s*(.*)$/))) { const sc: Scenario = { name: m[1], rule, steps: [...background] }; cur = sc; scenarios.push(sc); }
    else if ((m = line.match(/^(Given|When|Then|And|But)\s+(.*)$/)) && cur) cur.steps.push(m[2]);
  }
  return scenarios;
}

export async function run(file: string) {
  const { steps }: { steps: StepDefinition[] } = await import(file.replace(/\.feature$/, ".steps.mjs").replace(/^(?!\/)/, `${process.cwd()}/`));
  const results = [];
  for (const sc of parse(readFileSync(file, "utf8"))) {
    const world: World = {};
    let error: string | null = null;
    for (const text of sc.steps) {
      const hit = steps.map(([re, fn]) => [text.match(re), fn] as const).find((h): h is readonly [RegExpMatchArray, StepDefinition[1]] => Boolean(h[0]));
      if (!hit) { error = `no step definition: ${text}`; break; }
      try { await hit[1](world, ...hit[0].slice(1)); } catch (e) { error = `${text}: ${(e as Error).message}`; break; }
    }
    await world.cleanup?.();
    results.push({ scenario: sc.name, rule: sc.rule, ok: !error, error });
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error("usage: node packages/naive/src/engine/bdd.ts <file.feature>..."); process.exit(2); }
  let failed = 0;
  for (const f of files) for (const r of await run(f)) {
    console.log(`${r.ok ? "ok  " : "FAIL"} ${r.scenario}${r.ok ? "" : `\n       ${r.error}`}`);
    if (!r.ok) failed++;
  }
  console.log(failed ? `\n${failed} scenarios failing` : "\nall scenarios pass");
  process.exit(failed ? 1 : 0);
}
