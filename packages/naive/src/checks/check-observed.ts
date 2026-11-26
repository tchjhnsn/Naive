#!/usr/bin/env node
// Org and decision-maker check (EE-189). Walks a venture, or every venture under a folder, and
// judges each decision_maker and each reports_to through the term engine. It never edits a record.
//
//   node packages/naive/src/checks/check-observed.ts <venture or workspace dir>
//
// A decision_maker that is absent or null is an open maker. A string must be a person id on the
// roster or a role id in the role registry, and it must not be the actor when provenance.drafted_by
// is an agent. reports_to null or absent passes. A missing person or a cycle fails.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { logical, ventureFile } from "../core/venture-paths.ts";
import { roles as roleRegistry } from "../engine/venture-type.ts";
import { joinFacts, judgeJoin, judgeMaker, judgeOrg, makerFacts, orgFacts, reportingCycle } from "../terms/makers.ts";

type Person = { id?: unknown; reports_to?: unknown };
type Drafted = { kind?: unknown; id?: unknown };

const root = process.argv[2];
if (!root || !existsSync(root)) { console.error("usage: node packages/naive/src/checks/check-observed.ts <venture or workspace dir>"); process.exit(2); }

const walk = (d: string): string[] => {
  let entries;
  try { entries = readdirSync(d, { withFileTypes: true }); } catch { return []; }
  return entries.flatMap((e) => {
    if (e.name === "node_modules" || e.name.startsWith(".")) return [];
    const p = join(d, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name === "venture.json" ? [d] : [];
  });
};

const decisionRels = (dir: string): string[] => {
  const out: string[] = [];
  const step = (d: string) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (existsSync(join(p, "venture.json")) && p !== dir) continue;
        step(p);
      } else if (e.name.endsWith(".decision.json") && d.split("/").at(-1) === "decisions") out.push(logical(dir, relative(dir, p)));
    }
  };
  step(dir);
  return [...new Set(out)].sort();
};

function readJson(file: string): { ok: true; value: unknown } | { ok: false } {
  try { return { ok: true, value: JSON.parse(readFileSync(file, "utf8")) as unknown }; } catch { return { ok: false }; }
}

const roleIds = (): Set<string> => {
  const list = roleRegistry() as { id?: unknown }[];
  return new Set(list.flatMap((r) => typeof r.id === "string" ? [r.id] : []));
};

const errors: string[] = [];
const dirs = walk(root);
if (!dirs.length) { console.error(`${root} has no venture.json`); process.exit(2); }
let roles: Set<string>;
try { roles = roleIds(); } catch (e) { console.error(`role registry could not be read: ${(e as Error).message}`); process.exit(2); }

for (const dir of dirs) {
  const id = (() => {
    const v = readJson(join(dir, "venture.json"));
    if (!v.ok || !v.value || typeof v.value !== "object" || Array.isArray(v.value)) return dir;
    const name = (v.value as { id?: unknown }).id;
    return typeof name === "string" ? name : dir;
  })();
  const at = (m: string) => errors.push(`${id}: ${m}`);

  const rosterFile = ventureFile(dir, "people/people.json");
  let people: Person[] = [];
  if (existsSync(rosterFile)) {
    const rec = readJson(rosterFile);
    if (!rec.ok || !rec.value || typeof rec.value !== "object" || Array.isArray(rec.value)) at("people/people.json is not a record");
    else {
      const list = (rec.value as { people?: unknown }).people;
      people = Array.isArray(list) ? list.filter((p): p is Person => Boolean(p) && typeof p === "object") : [];
    }
  }
  const ventureFileJson = readJson(join(dir, "venture.json"));
  const mode = ventureFileJson.ok && ventureFileJson.value && typeof ventureFileJson.value === "object" && !Array.isArray(ventureFileJson.value)
    ? (ventureFileJson.value as { mode?: unknown }).mode : undefined;
  if (mode === "observed") {
    const foundersDir = ventureFile(dir, "people/founders");
    if (existsSync(foundersDir)) {
      for (const name of readdirSync(foundersDir)) {
        if (!name.endsWith(".json")) continue;
        const rec = readJson(join(foundersDir, name));
        if (!rec.ok || !rec.value || typeof rec.value !== "object" || Array.isArray(rec.value)) { at(`people/founders/${name} is not a record`); continue; }
        const body = rec.value as { joined?: unknown; joined_source?: unknown };
        const verdict = judgeJoin(joinFacts(body.joined, body.joined_source));
        if (!verdict.pass) at(`people/founders/${name} joined is not a known join (${verdict.failed.join(", ")})`);
      }
    }
  }
  const known = new Set(people.flatMap((p) => typeof p.id === "string" && p.id ? [p.id] : []));
  const cycles = reportingCycle(people.flatMap((p) => typeof p.id === "string" ? [{ id: p.id, reports_to: typeof p.reports_to === "string" ? p.reports_to : null }] : []));
  for (const p of people) {
    if (typeof p.id !== "string" || !p.id) continue;
    const verdict = judgeOrg(orgFacts(p.id, p.reports_to, known, cycles.has(p.id)));
    if (!verdict.pass) {
      const target = p.reports_to === undefined ? "absent" : JSON.stringify(p.reports_to);
      at(`people/people.json ${p.id} reports_to ${target} is not an org link (${verdict.failed.join(", ")})`);
    }
  }

  for (const rel of decisionRels(dir)) {
    const file = ventureFile(dir, rel);
    const rec = readJson(file);
    if (!rec.ok || !rec.value || typeof rec.value !== "object" || Array.isArray(rec.value)) { at(`${rel} is not a record`); continue; }
    const body = rec.value as { decision_maker?: unknown; provenance?: { drafted_by?: Drafted } };
    const maker = body.decision_maker;
    const drafted = body.provenance?.drafted_by;
    const actorId = drafted?.kind === "agent" && typeof drafted.id === "string" ? drafted.id : null;
    const named = typeof maker === "string" && maker.length > 0;
    const verdict = judgeMaker(makerFacts(maker, {
      resolves: named && (known.has(maker) || roles.has(maker)),
      isActor: named && actorId !== null && maker === actorId,
    }));
    if (!verdict.pass) {
      const shown = maker === undefined ? "absent" : JSON.stringify(maker);
      at(`${rel} decision_maker ${shown} is not an open or named maker (${verdict.failed.join(", ")})`);
    }
  }
}

for (const e of errors) console.log(`FAIL  ${e}`);
console.log(`${dirs.length} venture${dirs.length === 1 ? "" : "s"}: ${errors.length ? `${errors.length} error(s)` : "makers and org links hold"}.`);
process.exit(errors.length ? 1 : 0);
