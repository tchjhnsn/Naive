// What a function agent is, derived from Naive's own data (EE-123). There is no list of agents here and no code per
// function: every id in Naive's departments.json is a function agent, and what the agent needs to know about its
// function comes from data Naive already ships.
//
//   departments.json                       the id, label, APQC category, governance and operations sides
//   data-model.json (function field)       the record types the function owns, so the write reach it should get
//   routes() (records/routes)              the write routes of those record types (functionWrites in ./reach.ts,
//                                          the same list the router enforces)
//   PACKAGE_FUNCTION (core/venture-paths)  the record packages the function owns, which the researcher reads
//   PLANS (engine/access)                  the team-plan files, so no derived reach ever includes the team plan
//   functions/<fn>/                        the function's module: agent.md (its instructions), function.json (purpose and
//                                          intake), workflows/*.json, decisions.json, and every skills/ folder under it
//
// Moved from everything-ecosystem platform/agents/ into Naive (EE decision, 2026-11-21), so every harness gets the
// same agents from the installed package; Mentura builds its deepagents from these specs.
//
// This module names no LangChain type, so the MCP shim can list tools without building an agent.
//
//   const spec = functionAgent("strategy");      // throws on an id departments.json does not list
//   spec.role                                    // "strategy-agent"
//   spec.writes                                  // ["decisions/*", "foundation/alignment", ..., "validation/solution"]
//   teamPlanEntry(spec, "discovery")             // the entry a person adds to the venture's team plan
//
// Each function also has a researcher (autoresearch design, everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "program.md per function", build plan item 13), derived the same way:
//
//   data-model.json (writer projection)    the projected route patterns, so the recipes a researcher could improve
//   functions/<fn>/templates/              the starter research program: the patterns its Patterns section lists
//     research-program.md
//   interfaces/skills/research/            Naive's one generic research skill, mounted read-only for every researcher
//
//   const r = functionResearcher("strategy");    // throws on an id departments.json does not list
//   r.role                                       // "strategy-researcher"
//   r.writes                                     // ["recipes/competitors/[id]/signals"]

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { PACKAGE_FUNCTION } from "../../core/venture-paths.ts";
import { readDataModel, venturePaths } from "../../records/index.ts";
import { PLANS, routeGlob } from "../access.ts";
import { routes } from "../../records/routes/routes.ts";
import { functionWrites } from "./reach.ts";
// Paths inside this copy of Naive, as everything-ecosystem's naivePath gave them for the installed package.
const naiveRoot = new URL("../../../../../", import.meta.url).pathname;
export const naivePath = (rel: string): string => join(naiveRoot, rel);

/** Only functionAgent() makes a spec, so a spec always agrees with Naive's data. Erased at runtime. */
declare const derived: unique symbol;

/** A function id that departments.json lists. Made only by functionIds() and functionAgent(). */
export type FunctionId = string & { readonly __function: true };

/** One skill: a folder with a SKILL.md whose frontmatter name is the folder's name (deepagents' rule). */
export interface Skill {
  readonly name: string,
  /** The skill's folder as the agent sees it, under the module mounted at /function/: /function/skills/telos/. */
  readonly path: string,
}

/** What departments.json says the function is for. */
export interface Charter { readonly apqc: string, readonly governance: string, readonly operations: string }

/**
 * One function agent. Invariants, checked when the spec is derived: role is `${function}-agent`; skill names are
 * unique and each matches its folder; no write glob reaches a team-plan route (an agent that could edit the team plan
 * could widen its own reach).
 */
export interface FunctionAgentSpec {
  readonly [derived]: true,
  readonly function: FunctionId,
  readonly label: string,
  /** The team-plan role the agent acts in. One rule for every function, so a venture staffs it by adding this id. */
  readonly role: string,
  readonly charter: Charter,
  /** Record packages the function owns (PACKAGE_FUNCTION). Empty for a function that owns none yet. */
  readonly packages: readonly string[],
  /** The function's module folder in the installed Naive, mounted read-only at /function/ in the agent's files. */
  readonly module: string,
  readonly skills: readonly Skill[],
  /** The function module's own files, read by any harness: agent.md, function.json's purpose and intake, workflow ids. */
  readonly instructions: string | null,
  readonly purpose: string | null,
  readonly intake: string | null,
  readonly workflows: readonly string[],
  readonly decisions: string | null,
  /**
   * The write globs the agent's team-plan role should get: decisions/* (to raise a question) plus every concrete
   * write route of a record type the data model gives this function, [id] as *. Concrete routes, not
   * <prefix>/** globs: a route's first segment is not its package, so prefixes over-reach. A new Naive route
   * reaches an agent only when a person adds it to the venture's team plan.
   */
  readonly writes: readonly string[],
}

export type Phase = "discovery" | "validation" | "beachhead" | "scale" | "platform";

/** A team-plan role entry (packages/naive/src/records/team-plan.schema.json), as teamPlanEntry suggests it. */
export interface TeamPlanRole {
  readonly id: string,
  readonly name: string,
  readonly occupant: "agent",
  readonly needed_by: Phase,
  readonly status: "filled",
  readonly why: string,
  readonly routes: { readonly write: readonly string[] },
}

interface Department { id: string, label: string, apqc: { id: string, name: string }, governance: string, operations: string }
interface Route { route: string, record?: string, actions?: string[], files?: string[] }

const MODULES = "packages/naive/src/functions";
const departments = (): Department[] =>
  (JSON.parse(readFileSync(naivePath(`${MODULES}/departments.json`), "utf8")) as { departments: Department[] }).departments;

/** Every function agent the installed Naive defines, in departments.json order. */
export function functionIds(): FunctionId[] {
  return departments().map((d) => d.id as FunctionId);
}

/** Whether any of these globs could write the team plan: the routes whose files include a team-plan file (PLANS). */
export function reachesTeamPlan(globs: readonly string[]): boolean {
  const plans = (routes() as Route[]).filter((r) => r.files?.some((f) => PLANS.includes(f))).map((r) => r.route);
  return globs.some((g) => plans.some((p) => routeGlob(g).test(p)));
}

const cache = new Map<string, FunctionAgentSpec>();

/**
 * The function agent for one function id. Throws an Error naming the valid ids when departments.json does not list
 * id, and an Error naming the files when Naive's data breaks an invariant above. The installed Naive does not change
 * while a process runs, so each spec is derived once.
 */
export function functionAgent(id: string): FunctionAgentSpec {
  const hit = cache.get(id);
  if (hit) return hit;
  const all = departments();
  const dept = all.find((d) => d.id === id);
  if (!dept) throw new Error(`no function ${id}: departments.json lists ${all.map((d) => d.id).join(", ")}`);
  const packages = Object.entries(PACKAGE_FUNCTION as Record<string, string>).filter(([, f]) => f === id).map(([p]) => p).sort();
  const module = naivePath(`${MODULES}/${id}`);
  const skills = skillsUnder(module);
  const writes = functionWrites(id);
  const file = (rel: string): string | null => (existsSync(join(module, rel)) ? join(module, rel) : null);
  const manifest = file("function.json") ? JSON.parse(readFileSync(join(module, "function.json"), "utf8")) as { purpose?: string, intake?: string } : {};
  const wdir = join(module, "workflows");
  const workflows = existsSync(wdir) ? readdirSync(wdir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort() : [];
  if (reachesTeamPlan(writes)) throw new Error(`${id}'s derived write routes reach the team plan: ${writes.join(", ")}`);
  const fields: Omit<FunctionAgentSpec, typeof derived> = {
    function: id as FunctionId, label: dept.label, role: `${id}-agent`,
    charter: { apqc: `${dept.apqc.id} ${dept.apqc.name}`, governance: dept.governance, operations: dept.operations },
    packages, module, skills, writes,
    instructions: file("agent.md"), purpose: manifest.purpose ?? null, intake: manifest.intake ?? null, workflows, decisions: file("decisions.json"),
  };
  const spec = fields as FunctionAgentSpec;
  cache.set(id, spec);
  return spec;
}

/**
 * The team-plan entry a person adds so the venture staffs this agent. The CLI prints it in its refusal when the role
 * is missing; the agent never writes the team plan itself, because reach is the venture's decision, a person's.
 */
export function teamPlanEntry(spec: FunctionAgentSpec, phase: Phase): TeamPlanRole {
  return { id: spec.role, name: `${spec.label} agent`, occupant: "agent", needed_by: phase, status: "filled",
    why: `${spec.charter.apqc}: ${spec.charter.governance}`, routes: { write: [...spec.writes] } };
}

/** Every skills/ folder at any depth under the module (skills/, kits/<kit>/skills/), one Skill per child with a SKILL.md. */
function skillsUnder(module: string): Skill[] {
  const found: Skill[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith(".") || e.name === "node_modules") continue;
      const sub = join(dir, e.name);
      if (e.name === "skills") {
        for (const s of readdirSync(sub, { withFileTypes: true })) {
          const md = join(sub, s.name, "SKILL.md");
          if (s.isDirectory() && existsSync(md)) found.push({ name: skillName(md, s.name), path: `/function/${relative(module, join(sub, s.name))}/` });
        }
      }
      else walk(sub);
    }
  };
  if (existsSync(module)) walk(module);
  const seen = new Map<string, string>();
  for (const s of found) {
    const prior = seen.get(s.name);
    if (prior) throw new Error(`two skills named ${s.name}: ${prior} and ${s.path}`);
    seen.set(s.name, s.path);
  }
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/** The SKILL.md frontmatter name, which deepagents requires to equal the folder name and to be lowercase with hyphens. */
function skillName(file: string, folder: string): string {
  const front = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, "utf8"))?.[1] ?? "";
  const name = /^name:\s*["']?([^"'\n]+?)["']?\s*$/m.exec(front)?.[1];
  if (name !== folder) throw new Error(`${file}: its frontmatter name (${name ?? "none"}) must be its folder's name, ${folder}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) throw new Error(`${file}: a skill name is lowercase letters, digits and single hyphens, at most 64 characters`);
  return name;
}

// ---- Function researchers (autoresearch build plan item 13) ----

/**
 * One function's researcher: the role that improves the recipes of the projected records its function works, one
 * experiment at a time, through Naive's recipes/<pattern> route. Invariants, checked when the spec is derived: role is
 * `${function}-researcher` (the name Naive's read clamp, router/reads-as-of.mjs, recognizes); every pattern is a
 * projected route pattern in the data model; writes are exactly recipes/<pattern> for those patterns, so no write
 * reaches the team plan or any record route.
 */
export interface FunctionResearcherSpec {
  readonly [derived]: true,
  readonly function: FunctionId,
  readonly label: string,
  /** The team-plan role the researcher acts in. Naive clamps every read of a role so named to its cut. */
  readonly role: string,
  readonly charter: Charter,
  /**
   * The projected route patterns the researcher may work: those whose record file sits in a package the function owns
   * (PACKAGE_FUNCTION), and those the function's starter program lists under Patterns (competitors/[id]/signals for
   * strategy: the competitors package names no function, and its starter program says strategy researches it).
   */
  readonly patterns: readonly string[],
  /** recipes/<pattern> for each pattern: the only route a researcher writes. */
  readonly writes: readonly string[],
  /** The function's research program route, operations/research-program/<function> (programs/<function>.md). */
  readonly program: string,
  /** Naive's research skill folder in the installed Naive, mounted read-only at /research/ in the researcher's files. */
  readonly skill: string,
}

/** A route pattern as Naive's eval plan schema has it: lowercase segments or a literal [id]. */
const PATTERN = /^[a-z0-9][a-z0-9-]*(\/([a-z0-9][a-z0-9-]*|\[id\]))*$/;

/**
 * The patterns a research program lists: each `### <pattern>` heading in its `## Patterns` section, in order. Pure.
 * Used on Naive's starter programs here and on a venture's own program when a run starts.
 */
export function programPatterns(text: string): string[] {
  const out: string[] = [];
  let inPatterns = false;
  for (const line of text.split("\n")) {
    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) { inPatterns = h2[1].toLowerCase() === "patterns"; continue; }
    const p = inPatterns ? patternHeading(line) : null;
    if (p && PATTERN.test(p) && !out.includes(p)) out.push(p);
  }
  return out;
}

/** The text of a program's section for one pattern: from its `### <pattern>` heading to the next heading. Pure. */
export function programSection(text: string, pattern: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => patternHeading(l) === pattern);
  if (start < 0) return "";
  const end = lines.findIndex((l, i) => i > start && /^#{1,3}\s/.test(l));
  return lines.slice(start, end < 0 ? undefined : end).join("\n").trim();
}

/** The pattern a `### <pattern>` heading names, with or without backticks, or null. */
const patternHeading = (line: string): string | null => /^###\s+`?([^`\s]+)`?\s*$/.exec(line)?.[1] ?? null;

interface ModelRecord { id: string, writer?: string, paths?: string[] }

/**
 * Every projected route pattern in the installed Naive with the package its record file sits in: each record type
 * with writer projection whose venture path has exactly one * for the subject (competitors/[id]/signals) or none
 * (market/rounds), and no ** (receptions sit beside any record, so they have no pattern of their own).
 */
export function projectedPatterns(): { pattern: string, package: string }[] {
  const model = readDataModel() as { records: ModelRecord[] };
  const out = new Map<string, string>();
  for (const r of model.records.filter((x) => x.writer === "projection")) {
    for (const p of venturePaths(r) as string[]) {
      if (p.includes("**") || (p.match(/\*/g) ?? []).length > 1 || !p.endsWith(".json")) continue;
      out.set(p.replace("*", "[id]").replace(/\.json$/, ""), p.split("/")[0]);
    }
  }
  return [...out].map(([pattern, pkg]) => ({ pattern, package: pkg })).sort((a, b) => a.pattern.localeCompare(b.pattern));
}

const researchers = new Map<string, FunctionResearcherSpec>();

/**
 * The researcher for one function id. Throws an Error naming the valid ids when departments.json does not list id,
 * and an Error naming the pattern when a starter program lists one the data model does not project. Derived once
 * per process, like functionAgent.
 */
export function functionResearcher(id: string): FunctionResearcherSpec {
  const hit = researchers.get(id);
  if (hit) return hit;
  const agent = functionAgent(id);
  const projected = projectedPatterns();
  const owned = projected.filter((p) => agent.packages.includes(p.package)).map((p) => p.pattern);
  const starter = naivePath(`${MODULES}/${id}/templates/research-program.md`);
  const listed = existsSync(starter) ? programPatterns(readFileSync(starter, "utf8")) : [];
  for (const p of listed) if (!projected.some((x) => x.pattern === p)) throw new Error(`${starter} lists ${p}, which no record type in the data model projects`);
  const patterns = [...new Set([...owned, ...listed])].sort();
  const writes = patterns.map((p) => `recipes/${p}`);
  if (reachesTeamPlan(writes)) throw new Error(`${id}'s researcher write routes reach the team plan: ${writes.join(", ")}`);
  const fields: Omit<FunctionResearcherSpec, typeof derived> = {
    function: agent.function, label: agent.label, role: `${id}-researcher`, charter: agent.charter, patterns, writes,
    program: `operations/research-program/${id}`, skill: naivePath("packages/naive/src/interfaces/skills/research"),
  };
  const spec = fields as FunctionResearcherSpec;
  researchers.set(id, spec);
  return spec;
}

/**
 * The team-plan entry a person adds so the venture staffs this researcher: write routes recipes/<pattern> only. Reads
 * are left to every route, because Naive clamps a researcher's every read to its cut and refuses _eval/ to any agent.
 */
export function researcherTeamPlanEntry(spec: FunctionResearcherSpec, phase: Phase): TeamPlanRole {
  return { id: spec.role, name: `${spec.label} researcher`, occupant: "agent", needed_by: phase, status: "filled",
    why: `Improves the recipes of ${spec.patterns.length ? spec.patterns.join(", ") : "no pattern yet"} against their eval plans`, routes: { write: [...spec.writes] } };
}
