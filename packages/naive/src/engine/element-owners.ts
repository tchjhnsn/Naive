// Who is accountable for each element of APQC's framework in a venture (EE-187).
//
//   node packages/naive/src/engine/element-owners.ts <venture dir> [--function <id>] [--level <n>] [--json]
//   naive owners [--venture <dir>] [--function <id>] [--level <n>] [--json]
//
// An element is one node of APQC's Process Classification Framework as Naive carries it
// (packages/naive/src/functions/pcf.json): a category (level 1, which Naive calls a function), a process group, a
// process, an activity (level 4) or a task (level 5). Each element has one accountable owner, the A of RACI: the role
// or the person who answers for it. The owner is not the performer. Who performs an activity, and whether a person
// approves it, is operations/activity-assignments.json (EE-172, EE-176) or the default for the activity's kind
// (EE-179), and an entry for an activity shows both.
//
// The owner of an element, first rule that applies:
//
//   1. explicit   the venture names one for the element in operations/element-owners.json.
//   2. root       the element is an activity a person performs or approves, by the venture's assignment or by its
//                 kind, and the owner it would inherit is an agent. An agent does not answer for a person's work, so
//                 the delegation root (governance/delegation.json root, the founder by default) owns it.
//   3. inherited  the parent's owner, up to level 1. A task inherits from its activity, and so on up.
//   4. default    a category the venture lists in venture.json departments is owned by its function's agent,
//                 <function>-agent. A category the venture does not list has no owner, and neither do its elements.
//
// A role is a role template (packages/naive/template/governance/roles/, overlaid by the venture's governance/roles/)
// or a function agent. A role whose template has default_tier person is a person, and the rest are agents. A role
// answers only within its reach: a lead within its portfolio, a role whose template names a function within that
// function, a function agent within its own function, and a role of function all anywhere.
//
// It reads, and writes nothing. packages/naive/src/checks/check-owners.ts fails on what ownerProblems() finds.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { kindOf } from "./activity-kinds.ts";
import { readCatalog, readPcf } from "./activity-proposals.ts";
import { assignmentOf, readAssignments } from "./agents/assignments.ts";
import { functionsOf } from "./research-programs.ts";
import type { ActivityCatalog, DepartmentCatalog, ElementOwners, Pcf } from "../records/types/records.d.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
/** The venture record that names owners. */
export const OWNERS = "operations/element-owners.json";
const ROLES = "packages/naive/template/governance/roles";
const DELEGATION = "packages/naive/template/governance/delegation.json";
const DEPARTMENTS = "packages/naive/src/functions/departments.json";

export type Owner = ElementOwners["owners"][string];
export type OwnerKind = "person" | "agent";
export type OwnerSource = "explicit" | "root" | "inherited" | "default";
/** What the resolver needs to know about a role: whether it is a person, and the functions it may answer for. */
export interface RoleInfo { readonly kind: OwnerKind, readonly reach: readonly string[] | "all" }
/** Who performs an activity and whether a person approves it, as the venture assigned it or its kind defaults. */
export interface Responsible { readonly performer: "agent" | "person", readonly approval?: "person" | "none" }
export interface ElementOwner {
  readonly id: string,
  readonly name: string,
  readonly level: number,
  /** The function whose category the element sits under. */
  readonly function: string,
  /** The accountable owner, or null when the element has none. */
  readonly owner: Owner | null,
  /** person or agent, or null when the element has no owner or the owner names no role. */
  readonly kind: OwnerKind | null,
  readonly source: OwnerSource | null,
  /** For an inherited owner: the element where it was set. */
  readonly from?: string,
  /** For an activity: who performs it, which is not who answers for it. */
  readonly performer?: Responsible["performer"],
  readonly approval?: Responsible["approval"],
}
export interface OwnerInputs {
  readonly pcf: Pcf,
  /** The function each category belongs to, by the category's hierarchy id (3.0 to marketing-and-sales). */
  readonly categories: ReadonlyMap<string, string>,
  /** The functions the venture lists in venture.json departments. */
  readonly functions: readonly string[],
  readonly owners: ElementOwners["owners"],
  readonly roles: ReadonlyMap<string, RoleInfo>,
  /** The delegation root's role id. */
  readonly root: string,
  /** Per activity id. */
  readonly responsible: ReadonlyMap<string, Responsible>,
}

/** An element's parent: 3.5 for 3.5.1, 3.0 for 3.5, and none for a category. Pure. */
export function parentOf(id: string, level: number): string | null {
  if (level <= 1) return null;
  const parts = id.split(".");
  return level === 2 ? `${parts[0]}.0` : parts.slice(0, -1).join(".");
}

/** A function agent's role id. */
export const agentOf = (fn: string): string => `${fn}-agent`;

const kindOfOwner = (o: Owner, roles: ReadonlyMap<string, RoleInfo>): OwnerKind | null => ("person" in o && o.person !== undefined ? "person" : roles.get(o.role ?? "")?.kind ?? null);

/**
 * Who performs each APQC level 4 activity: the venture's assignment where it has one, else the default for the
 * activity's kind, else its function's agent. Pure.
 */
export function responsibleFor(pcf: Pcf, catalog: ActivityCatalog, assignments: unknown): Map<string, Responsible> {
  const kinds = catalog.kinds ?? [];
  return new Map(pcf.elements.filter((e) => e.level === 4).map((e) => {
    const a = assignmentOf(assignments, e.id);
    const performer = a?.performer ?? kindOf(kinds, e.name)?.performer ?? "agent";
    return [e.id, { performer, ...(a?.approval ? { approval: a.approval } : {}) }];
  }));
}

/** Every element under a category, in the framework's order, with its owner by the rules above. Pure. */
export function resolveOwners(i: OwnerInputs): ElementOwner[] {
  const listed = new Set(i.functions);
  const done = new Map<string, ElementOwner>();
  for (const e of i.pcf.elements) {
    const fn = i.categories.get(`${e.id.split(".")[0]}.0`);
    if (!fn) continue;
    const r = i.responsible.get(e.id);
    const base = { id: e.id, name: e.name, level: e.level, function: fn, ...(r ? { performer: r.performer, ...(r.approval ? { approval: r.approval } : {}) } : {}) };
    const set = (owner: Owner | null, source: OwnerSource | null, from?: string): ElementOwner =>
      ({ ...base, owner, kind: owner ? kindOfOwner(owner, i.roles) : null, source: owner ? source : null, ...(owner && from ? { from } : {}) });
    const explicit = i.owners[e.id];
    const parent = parentOf(e.id, e.level);
    const up = parent ? done.get(parent) : undefined;
    let out: ElementOwner;
    if (explicit) out = set(explicit, "explicit");
    else if (e.level === 1) out = listed.has(fn) ? set({ role: agentOf(fn) }, "default") : set(null, null);
    else out = up?.owner ? set(up.owner, "inherited", up.source === "inherited" ? up.from : up.id) : set(null, null);
    const needsPerson = r !== undefined && (r.performer === "person" || r.approval === "person");
    if (needsPerson && !explicit && out.owner && out.kind !== "person") out = set({ role: i.root }, "root");
    done.set(e.id, out);
  }
  return [...done.values()];
}

/** What is wrong with a venture's owners: an element left unowned, and an owner that names no role or answers outside its reach. Pure. */
export function ownerProblems(i: OwnerInputs, resolved: readonly ElementOwner[]): string[] {
  const out: string[] = [];
  const listed = new Set(i.functions);
  const elements = new Map(resolved.map((e) => [e.id, e]));
  for (const [id, owner] of Object.entries(i.owners)) {
    const e = elements.get(id);
    if (!e) { out.push(`${OWNERS}: ${id} is not an element of APQC's framework (packages/naive/src/functions/pcf.json)`); continue; }
    if (!listed.has(e.function)) out.push(`${OWNERS}: ${id} is under ${e.function}, which the venture does not list in venture.json departments`);
    if (owner.role === undefined) continue;
    const role = i.roles.get(owner.role);
    if (!role) out.push(`${OWNERS}: ${id} names the role ${owner.role}, which is not a role: no role template has it and it is not a function agent (<function>-agent)`);
    else if (role.reach !== "all" && !role.reach.includes(e.function)) out.push(`${OWNERS}: ${id} is under ${e.function}, and the role ${owner.role} answers only for ${role.reach.join(", ")}`);
  }
  if (resolved.some((e) => e.source === "root") && !i.roles.has(i.root)) out.push(`the delegation root ${i.root} is not a role, so the activities a person performs have no owner`);
  for (const e of resolved) if (listed.has(e.function) && !e.owner) out.push(`${e.id} ${e.name}: no owner`);
  return out;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const cannot = (what: string) => (e: Parameters<typeof describe>[0]) => new CannotRun({ message: `${what}: ${describe(e)}`, cause: e });

/** The role templates in one folder, by id. An index file (a roles array) is skipped. */
const rolesIn = (dir: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const found = new Map<string, RoleInfo>();
  if (!(yield* fs.isDirectory(dir))) return found;
  for (const f of (yield* fs.list(dir).pipe(Effect.mapError(cannot(dir)))).filter((n) => n.endsWith(".json")).sort()) {
    const r = yield* readJson(join(dir, f)).pipe(Effect.mapError(cannot(join(dir, f))));
    if (!isObject(r) || Array.isArray(r.roles) || typeof r.id !== "string") continue;
    const reach = Array.isArray(r.portfolio) ? r.portfolio.filter((x): x is string => typeof x === "string") : typeof r.function === "string" && r.function !== "all" ? [r.function] : "all";
    found.set(r.id, { kind: r.default_tier === "person" ? "person" : "agent", reach });
  }
  return found;
});

/** Everything the resolver reads for a venture. */
export const ownerInputs = (dir: string) => Effect.gen(function* () {
  const departments = (yield* readJson(join(repo, DEPARTMENTS)).pipe(Effect.mapError(cannot(DEPARTMENTS)))) as DepartmentCatalog;
  const categories = new Map(departments.departments.map((d) => [d.apqc.id, d.id]));
  const roles = new Map<string, RoleInfo>(departments.departments.map((d) => [agentOf(d.id), { kind: "agent", reach: [d.id] }]));
  for (const [id, r] of yield* rolesIn(join(repo, ROLES))) roles.set(id, r);
  for (const [id, r] of yield* rolesIn(ventureFile(dir, "governance/roles"))) roles.set(id, r);
  const own = ventureFile(dir, "governance/delegation.json");
  const delegation = yield* readJson(existsSync(own) ? own : join(repo, DELEGATION)).pipe(Effect.mapError(cannot("governance/delegation.json")));
  const root = isObject(delegation) && typeof delegation.root === "string" ? delegation.root : "founder";
  const file = ventureFile(dir, OWNERS);
  const record = existsSync(file) ? yield* readJson(file).pipe(Effect.mapError(cannot(OWNERS))) : null;
  const owners: ElementOwners["owners"] = isObject(record) && isObject(record.owners) ? record.owners as ElementOwners["owners"] : {};
  const pcf = yield* readPcf();
  return { pcf, categories, functions: functionsOf(dir), owners, roles, root, responsible: responsibleFor(pcf, yield* readCatalog(), yield* readAssignments(dir)) } satisfies OwnerInputs;
});

const ownerText = (o: Owner | null): string => (!o ? "none" : o.role !== undefined ? o.role : `${o.person}`);
const sourceText = (e: ElementOwner): string =>
  e.source === "inherited" ? `inherited from ${e.from}` : e.source === "root" ? "the delegation root, because a person performs or approves it" : e.source ?? "unowned";

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const flag = (name: string) => { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; };
  const only = flag("--function"), level = flag("--level");
  const [dir] = args.filter((a, i) => !a.startsWith("--") && !["--function", "--level"].includes(args[i - 1]));
  if (!dir || (args.includes("--function") && !only) || (args.includes("--level") && !/^[1-5]$/.test(level ?? ""))) {
    console.error("usage: node packages/naive/src/engine/element-owners.ts <venture dir> [--function <id>] [--level <1-5>] [--json]");
    process.exit(2);
  }
  await runMain(Effect.map(ownerInputs(dir), (inputs) => {
    if (only !== undefined && !inputs.functions.includes(only)) {
      console.error(`the venture does not list the function ${only} in venture.json departments: it lists ${inputs.functions.join(", ") || "none"}`);
      process.exitCode = 2;
      return;
    }
    const listed = new Set(inputs.functions);
    const shown = resolveOwners(inputs).filter((e) => listed.has(e.function) && (only === undefined || e.function === only) && (level === undefined || e.level === Number(level)));
    if (json) { console.log(JSON.stringify({ owners: shown }, null, 2)); return; }
    if (!inputs.functions.length) console.log("The venture lists no functions in venture.json departments, so no element has an owner.");
    for (const e of shown) {
      const does = e.performer ? `; ${e.performer === "person" ? "a person performs it" : "an agent performs it"}${e.approval === "person" ? " and a person approves it" : ""}` : "";
      console.log(`${"  ".repeat(e.level - 1)}${e.id} ${e.name}: ${ownerText(e.owner)} (${e.kind ?? "no role"}, ${sourceText(e)}${does})`);
    }
    if (shown.length) console.log("\nThe owner answers for the element; who performs an activity is a separate question. Nothing written.");
  }));
}
