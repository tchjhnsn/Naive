// Checks the role library (EE-229): packages/naive/src/roles/<id>/role.json, and a venture's own roles at
// <venture>/governance/roles/<id>/role.json, which overlay the library by id. With no venture it also checks Naive's own
// roles at agents/<id>/role.json (EE-238), a scope that overlays the library for Naive itself. Rules:
//   - every role file is JSON and validates against packages/naive/src/records/role.schema.json;
//   - a role in an overlay may extend a library role (extends): the library role exists, and the role with what it
//     inherits validates too; a library role extends nothing;
//   - a folder under agents/ with no role.json holds an AGENTS.md, a shipped agent whose role is the library role of
//     its folder's name (agents/chief-of-staff/);
//   - its id matches its folder;
//   - verified_by and each also_verified_by name a known role (a library or venture role, or a function agent or
//     researcher) and never the role itself;
//   - ids and aliases are unique: no alias is another role's id or alias, in the library or once a venture's roles
//     overlay it (a venture role with a library role's id replaces that role, which is the overlay); an alias may be
//     the id of a role that extends the alias's role (Naive's product-manager extends product-design-lead);
//   - a person role grants no agent tier: its default_tier, when it has one, is person;
//   - each role a merged role names in merged_from is a known role, not itself and not a person role, and a temporary
//     role names who proposed it and when (the schema, EE-235);
//   - a library role's role.ts (EE-237) imports and its default export is a valid RoleProgram whose id is the role's,
//     whose checks each have an id, a description and a run function, and repeat no default check
//     (programProblems in packages/naive/src/checks/role-program.ts);
//   - a venture role has no role.ts, because Naive never loads code from a venture folder.
// The links to APQC's framework and to O*NET (EE-232):
//   - each pcf[].id is a hierarchy id in packages/naive/src/functions/pcf.json, named once per role, and its raci is
//     responsible, accountable, consulted or informed (the schema holds the values);
//   - at most one role is accountable for an element, across the library and a venture's overlay (RACI);
//   - an accountable role is in the element's function (the department whose APQC category the element sits under)
//     or is a lead whose portfolio covers that function;
//   - each onet[].code is an O*NET-SOC code (the schema holds the format) and, when packages/naive/src/functions/onet.json
//     holds occupations, one of them with the same title;
//   - the O*NET reference's source is a reference id.
// The artifacts (EE-230, EE-238):
//   - each artifact is a record type in the data model or a document kind in packages/naive/src/functions/documents.json
//     (packages/naive/src/engine/artifact-kind.ts);
//   - a document kind with made_by is named by that role alone, and that role, when it is in the scope checked, names it;
//   - each standards entry is a reference id in packages/naive/src/records/layers/<layer>/references/references.json.
// --complete also fails on each element of levels 1 to --level (2 by default) under a function the business runs
// (every function in packages/naive/src/functions/departments.json, or the venture's venture.json departments) that
// no role is responsible or accountable for, and suggests O*NET occupations for it from the reference
// (packages/naive/src/engine/onet-match.ts) when the reference holds occupations. A suggestion is a lead, never a match.
// What the delegation rules need (a verifier for every agent role, grantable classes, leads' portfolios) is
// packages/naive/src/checks/check-delegation.ts.
//
//   node packages/naive/src/checks/check-roles.ts [venture dir] [--complete] [--level <n>] [--root <repository>] [--json]
//
// --root reads the library from a copy of the repository, as the tests do; pcf.json, onet.json and departments.json
// are read from that copy when it has them, else from this repository. Exit 0 passes, 1 fails.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { runPromise } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { extendRole, LIBRARY, loadRoles, NAIVE_ROLES, naiveRoles, roleFiles, VENTURE_ROLES, type Role, type RoleFile } from "../engine/agents/roles.ts";
import { artifactKind, type ArtifactTypes } from "../engine/artifact-kind.ts";
import { functionsOf } from "../engine/research-programs.ts";
import { elementTexts, occupationIndex, suggestOccupations, type Suggestion } from "../engine/onet-match.ts";
import { validateValue } from "../records/validate.ts";
import type { DataModel, DepartmentCatalog, DocumentCatalog, Onet, Pcf } from "../records/types/records.d.ts";
import { importProgram, programFile } from "./role-program.ts";

/** One scope's role files: the library's, Naive's own or a venture's. */
export interface Scope { readonly name: "library" | "naive" | "venture", readonly files: readonly RoleFile[] }
/** What the PCF and O*NET rules read: the framework, its categories by function, the O*NET reference and, for the artifact rules, the record types and document kinds. */
export interface Links { readonly pcf: Pcf, readonly functions: readonly { id: string, category: string }[], readonly onet: Onet | null, readonly types?: ArtifactTypes, readonly references?: ReadonlySet<string> }
/** One element a business runs with no responsible or accountable role, and the occupations suggested for it. */
export interface Gap { readonly id: string, readonly name: string, readonly level: number, readonly function: string, readonly suggestions: readonly Suggestion[] }

export const PCF_FILE = "packages/naive/src/functions/pcf.json";
export const ONET_FILE = "packages/naive/src/functions/onet.json";
const DEPARTMENTS = "packages/naive/src/functions/departments.json";
const DATA_MODEL = "packages/naive/src/records/data-model.json";
const DOCUMENTS = "packages/naive/src/functions/documents.json";
const PREFIX = { library: LIBRARY, naive: NAIVE_ROLES, venture: VENTURE_ROLES } as const;
const LAYERS = "packages/naive/src/records/layers";
const REPO = new URL("../../../..", import.meta.url).pathname;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** The category an element sits under: 3.0 for 3.0, 3.2 and 3.2.1. */
export const categoryOf = (id: string): string => `${id.split(".")[0]}.0`;

const schemaErrors = (v: { stdout: string, stderr: string }) => (v.stdout + v.stderr).trim().split("\n").join("; ");

/** Every validated role by id, an overlay's replacing the library's and filled from the role it extends, with the file each came from. */
function validRoles(scopes: readonly Scope[], errors: string[]): Map<string, { role: Role, at: string }> {
  const roles = new Map<string, { role: Role, at: string }>();
  const library = new Map<string, Role>();
  const shipped: { at: string, folder: string }[] = [];
  for (const { name, files } of scopes) for (const f of files) {
    const at = `${PREFIX[name]}/${f.folder}/role.json`;
    if (f.value === null && name === "naive" && existsSync(join(dirname(f.file), "AGENTS.md"))) { shipped.push({ at: `${NAIVE_ROLES}/${f.folder}/AGENTS.md`, folder: f.folder }); continue; }
    if (f.value === null) { errors.push(`${at}: missing or not JSON`); continue; }
    const v = validateValue("role.schema.json", f.value);
    if (v.status !== 0) { errors.push(`${at}: does not match role.schema.json: ${schemaErrors(v)}`); continue; }
    if (!isObject(f.value)) continue;
    let role = f.value as Role;
    if (role.id !== f.folder) errors.push(`${at}: id ${role.id} does not match its folder ${f.folder}`);
    if (role.extends !== undefined) {
      if (name === "library") { errors.push(`${at}: a library role extends nothing, but it extends ${role.extends}`); continue; }
      if (!library.has(role.extends)) { errors.push(`${at}: extends ${role.extends}, which is not a library role`); continue; }
      role = extendRole(role, library);
      const m = validateValue("role.schema.json", role);
      if (m.status !== 0) { errors.push(`${at}: with what it inherits from ${role.extends}, does not match role.schema.json: ${schemaErrors(m)}`); continue; }
    }
    if (name === "library") library.set(role.id, role);
    roles.set(role.id, { role, at });
  }
  for (const { at, folder } of shipped) if (!library.has(folder)) errors.push(`${at}: a folder with no role.json is a shipped agent of a library role, but ${folder} is not one`);
  return roles;
}

/** Every problem with what the roles make: an artifact Naive has no type for, or a document kind named by a role that does not make it. */
function artifactProblems(roles: Map<string, { role: Role, at: string }>, types: ArtifactTypes): string[] {
  const errors: string[] = [];
  const madeBy = new Map(types.catalog.kinds.flatMap((k) => (k.made_by ? [[k.id, k.made_by] as const] : [])));
  for (const { role, at } of roles.values()) for (const ref of role.artifacts ?? []) {
    const k = artifactKind(ref, types);
    if (k.kind === "unknown") { errors.push(`${at}: artifact ${k.why}`); continue; }
    if (!("document_kind" in ref)) continue;
    const maker = madeBy.get(ref.document_kind);
    if (maker !== undefined && maker !== role.id) errors.push(`${at}: ${role.id} names document kind ${ref.document_kind}, which only ${maker} makes`);
  }
  for (const [kind, maker] of madeBy) {
    const r = roles.get(maker);
    if (r && !(r.role.artifacts ?? []).some((a) => "document_kind" in a && a.document_kind === kind)) errors.push(`${r.at}: ${maker} makes document kind ${kind}, but does not name it among its artifacts`);
  }
  return errors;
}

/** Every problem with the links from roles to PCF elements and O*NET occupations. */
function linkProblems(roles: Map<string, { role: Role, at: string }>, links: Links): string[] {
  const errors: string[] = [];
  const ids = new Set(links.pcf.elements.map((e) => e.id));
  const fnOf = new Map(links.functions.map((f) => [f.category, f.id]));
  const occupations = new Map((links.onet?.occupations ?? []).map((o) => [o.code, o.title]));
  const accountable = new Map<string, string[]>();
  for (const { role, at } of roles.values()) {
    const seen = new Set<string>();
    for (const { id, raci } of role.pcf ?? []) {
      if (seen.has(id)) errors.push(`${at}: pcf ${id} is named twice; a role has one RACI part per element`);
      seen.add(id);
      if (!ids.has(id)) { errors.push(`${at}: pcf ${id} is not a hierarchy id in ${PCF_FILE}`); continue; }
      if (raci !== "accountable") continue;
      accountable.set(id, [...(accountable.get(id) ?? []), role.id]);
      const fn = fnOf.get(categoryOf(id));
      if (fn !== undefined && role.function !== fn && !(role.portfolio ?? []).includes(fn)) errors.push(`${at}: ${role.id} is accountable for PCF ${id}, which is under ${fn}, but the role is neither in ${fn} nor a lead whose portfolio covers it`);
    }
    for (const s of role.standards ?? []) if (links.references && !links.references.has(s)) errors.push(`${at}: standard ${s} is not a reference id in ${LAYERS}/<layer>/references/references.json`);
    for (const o of role.onet ?? []) {
      if (!occupations.size) continue;
      const title = occupations.get(o.code);
      if (title === undefined) errors.push(`${at}: onet ${o.code} is not an occupation in ${ONET_FILE} (O*NET ${links.onet?.release})`);
      else if (title !== o.title) errors.push(`${at}: onet ${o.code} is "${title}" in O*NET ${links.onet?.release}, not "${o.title}"`);
    }
  }
  for (const [id, holders] of accountable) if (holders.length > 1) errors.push(`PCF ${id}: ${[...holders].sort().join(" and ")} are each accountable for it; RACI allows one accountable role per element`);
  return errors;
}

/** Every problem with the role files of the library and a venture's overlay. functions are the departments.json ids. */
export function roleProblems(scopes: readonly Scope[], functions: readonly string[], links?: Links): string[] {
  const errors: string[] = [];
  const roles = validRoles(scopes, errors);
  const known = new Set([...roles.keys(), ...functions.flatMap((fn) => [`${fn}-agent`, `${fn}-researcher`])]);
  const names = new Map<string, string>([...roles.keys()].map((id) => [id, id]));
  for (const { role, at } of roles.values()) {
    for (const v of [role.verified_by, ...(role.also_verified_by ?? [])]) {
      if (typeof v !== "string") continue;
      if (v === role.id) errors.push(`${at}: ${role.id} may not verify its own work`);
      else if (!known.has(v)) errors.push(`${at}: verifier ${v} is not a known role`);
    }
    for (const a of role.aliases ?? []) {
      const owner = names.get(a);
      if (owner === a && roles.get(a)?.role.extends === role.id) continue;
      if (owner !== undefined && owner !== role.id) errors.push(`${at}: alias ${a} is already ${owner === a ? "a role id" : `an alias of ${owner}`}`);
      else names.set(a, role.id);
    }
    for (const p of role.merged_from ?? []) {
      if (p === role.id) errors.push(`${at}: ${role.id} may not merge itself`);
      else if (!known.has(p)) errors.push(`${at}: merged_from names ${p}, which is not a known role`);
      else if (roles.get(p)?.role.kind === "person") errors.push(`${at}: merged_from names ${p}, a person role, which is never deployed as an agent`);
    }
    if (role.kind === "person" && role.default_tier !== undefined && role.default_tier !== "person") errors.push(`${at}: a person role grants no agent tier, but its default_tier is ${role.default_tier}`);
  }
  if (links) errors.push(...linkProblems(roles, links));
  if (links?.types) errors.push(...artifactProblems(roles, links.types));
  return errors;
}

/**
 * Each element of levels 1 to maxLevel under the business's functions that no role is responsible or accountable
 * for, in hierarchy order, with up to three O*NET occupations suggested when the reference holds occupations.
 */
export function completeGaps(roles: Iterable<Role>, links: Links, run: readonly string[], maxLevel = 2): Gap[] {
  const covered = new Set<string>();
  for (const r of roles) for (const { id, raci } of r.pcf ?? []) if (raci === "responsible" || raci === "accountable") covered.add(id);
  const fnOf = new Map(links.functions.map((f) => [f.category, f.id]));
  const runs = new Set(run);
  const index = links.onet?.occupations.length ? occupationIndex(links.onet) : null;
  const gaps: Gap[] = [];
  for (const e of links.pcf.elements) {
    const fn = fnOf.get(categoryOf(e.id));
    if (e.level > maxLevel || fn === undefined || !runs.has(fn) || covered.has(e.id)) continue;
    gaps.push({ id: e.id, name: e.name, level: e.level, function: fn, suggestions: index ? suggestOccupations(index, elementTexts(links.pcf, e.id)) : [] });
  }
  return gaps;
}

/** The ids of every reference in a copy of the repository. */
function referenceIds(root: string): Set<string> {
  const ids = new Set<string>();
  const base = join(root, LAYERS);
  if (!existsSync(base)) return ids;
  for (const layer of readdirSync(base).sort()) {
    const file = join(base, layer, "references", "references.json");
    if (!existsSync(file)) continue;
    const refs = (JSON.parse(readFileSync(file, "utf8")) as { references?: { id?: unknown }[] }).references ?? [];
    for (const r of refs) if (typeof r.id === "string") ids.add(r.id);
  }
  return ids;
}

/** Every problem with role programs: a library role.ts that is not a valid RoleProgram for its role, and any venture role.ts. */
export async function programFileProblems(root: string, venture?: string): Promise<string[]> {
  const errors: string[] = [];
  for (const f of roleFiles(join(root, LIBRARY))) {
    const file = programFile(f.folder, root);
    if (!file) continue;
    const at = relative(root, file);
    try { await runPromise(importProgram(file, f.folder)); }
    catch (e) { errors.push(`${at}: ${(e instanceof Error ? e.message : String(e)).replace(`${file}: `, "")}`); }
  }
  if (venture) for (const f of roleFiles(ventureFile(venture, VENTURE_ROLES))) for (const n of ["role.ts", "role.mjs"])
    if (existsSync(ventureFile(venture, `${VENTURE_ROLES}/${f.folder}/${n}`))) errors.push(`${VENTURE_ROLES}/${f.folder}/${n}: Naive never loads code from a venture folder; a venture role's program is the default one and the library's role.ts of the same id`);
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i < 0 ? undefined : args[i + 1]; };
  const root = opt("root") ?? REPO;
  const level = Number(opt("level") ?? 2);
  if (!Number.isInteger(level) || level < 1 || level > 5) { console.error("--level is a PCF level, 1 to 5"); process.exit(2); }
  const venture = args.find((a, i) => !a.startsWith("--") && !["--root", "--level"].includes(args[i - 1] ?? ""));
  /** A data file from the copy under --root when it has one, else from this repository. */
  const data = <T>(file: string): T | null => { const at = [join(root, file), join(REPO, file)].find((f) => existsSync(f)); return at ? JSON.parse(readFileSync(at, "utf8")) as T : null; };
  const catalog = data<DepartmentCatalog>(DEPARTMENTS);
  const pcf = data<Pcf>(PCF_FILE);
  if (!catalog || !pcf) { console.error(`cannot read ${DEPARTMENTS} or ${PCF_FILE}`); process.exit(2); }
  const onet = data<Onet>(ONET_FILE);
  const model = data<DataModel>(DATA_MODEL);
  const documents = data<DocumentCatalog>(DOCUMENTS);
  const types = model && documents ? { model, catalog: documents } : undefined;
  const references = referenceIds(existsSync(join(root, LAYERS)) ? root : REPO);
  const links: Links = { pcf, onet, types, references, functions: catalog.departments.map((d) => ({ id: d.id, category: d.apqc.id })) };
  // A venture is its own business, so its overlay is checked with the library alone; with none, Naive's own roles are.
  const scopes: Scope[] = [{ name: "library", files: roleFiles(join(root, LIBRARY)) }, venture ? { name: "venture", files: roleFiles(ventureFile(venture, VENTURE_ROLES)) } : { name: "naive", files: roleFiles(join(root, NAIVE_ROLES)) }];
  const errors = [...roleProblems(scopes, links.functions.map((f) => f.id), links), ...await programFileProblems(root, venture)];
  if (onet && !references.has(onet.source)) errors.push(`${ONET_FILE}: source ${onet.source} is not a reference id in ${LAYERS}/<layer>/references/references.json`);
  const roles = venture ? loadRoles(venture, root) : naiveRoles(root);
  const run = venture ? functionsOf(venture) : links.functions.map((f) => f.id);
  const gaps = args.includes("--complete") ? completeGaps(roles.values(), links, run, level) : [];
  // A shipped agent under agents/ (an AGENTS.md and no role.json) is not a role file.
  const count = scopes.reduce((n, s) => n + s.files.filter((f) => !(s.name === "naive" && f.value === null && existsSync(join(dirname(f.file), "AGENTS.md")))).length, 0);
  const failed = errors.length + gaps.length;
  if (args.includes("--json")) console.log(JSON.stringify({ roles: count, errors, ...(args.includes("--complete") ? { level, functions: run, gaps } : {}) }, null, 2));
  else {
    for (const e of errors) console.log(`FAIL  ${e}`);
    for (const g of gaps) {
      const hint = g.suggestions.length ? `; O*NET ${onet?.release} suggests ${g.suggestions.map((s) => `${s.code} ${s.title}`).join(", ")}` : onet?.occupations.length ? "; O*NET suggests nothing" : "";
      console.log(`GAP   PCF ${g.id} ${g.name} (${g.function}): no role is responsible or accountable${hint}`);
    }
    if (errors.length) console.log(`${errors.length} error(s) in ${count} role files`);
    else console.log(`role library: ${count} role files valid, ids match folders, every verifier a known role and never itself, ids and aliases unique, no person role with an agent tier, every PCF link a known element with one accountable role in its function or portfolio, every O*NET code an occupation, every artifact a record type or a document kind named only by the role that makes it, every role.ts a valid program`);
    if (args.includes("--complete")) console.log(gaps.length ? `${gaps.length} PCF element(s) of levels 1 to ${level} under ${run.length} function(s) have no responsible or accountable role` : `every PCF element of levels 1 to ${level} under ${run.length} function(s) has a responsible or accountable role`);
  }
  process.exit(failed ? 1 : 0);
}
