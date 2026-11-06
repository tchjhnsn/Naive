#!/usr/bin/env node
// Runs Gherkin feature files as tests (EE-050): behavior-driven development without dependencies.
// Each scenario's Given, When, Then, And and But steps are matched against the step definitions
// in <name>.steps.mjs beside <name>.feature (an exported array of [RegExp, async (world, ...groups)]).
// A step with no definition fails its scenario, so a behavior cannot be written down and skipped.
//
//   node packages/naive/src/engine/bdd.mjs <file.feature>...
//
// Supports Feature, Rule, Background, Scenario, the five step keywords and # comments; not
// Scenario Outline, tables or doc strings yet.

import { readFileSync } from "node:fs";

export function parse(text) {
  const scenarios = [];
  let rule = null, background = [], cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    let m;
    if ((m = line.match(/^Rule:\s*(.*)$/))) { rule = m[1]; background = []; cur = null; }
    else if (/^Background:/.test(line)) cur = { background: true, steps: background };
    else if ((m = line.match(/^Scenario:\s*(.*)$/))) { cur = { name: m[1], rule, steps: [...background] }; scenarios.push(cur); }
    else if ((m = line.match(/^(Given|When|Then|And|But)\s+(.*)$/)) && cur) cur.steps.push(m[2]);
  }
  return scenarios;
}

export async function run(file) {
  const { steps } = await import(file.replace(/\.feature$/, ".steps.mjs").replace(/^(?!\/)/, `${process.cwd()}/`));
  const results = [];
  for (const sc of parse(readFileSync(file, "utf8"))) {
    const world = {};
    let error = null;
    for (const text of sc.steps) {
      const hit = steps.map(([re, fn]) => [text.match(re), fn]).find(([m]) => m);
      if (!hit) { error = `no step definition: ${text}`; break; }
      try { await hit[1](world, ...hit[0].slice(1)); } catch (e) { error = `${text}: ${e.message}`; break; }
    }
    await world.cleanup?.();
    results.push({ scenario: sc.name, rule: sc.rule, ok: !error, error });
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error("usage: node packages/naive/src/engine/bdd.mjs <file.feature>..."); process.exit(2); }
  let failed = 0;
  for (const f of files) for (const r of await run(f)) {
    console.log(`${r.ok ? "ok  " : "FAIL"} ${r.scenario}${r.ok ? "" : `\n       ${r.error}`}`);
    if (!r.ok) failed++;
  }
  console.log(failed ? `\n${failed} scenarios failing` : "\nall scenarios pass");
  process.exit(failed ? 1 : 0);
}
