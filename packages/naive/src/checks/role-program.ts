// Role programs (EE-237): the deterministic checks of what a role makes, as an Effect program over VentureFs. The CLI is
// packages/naive/src/checks/role-check.ts (naive role check). This module has no top-level await, because a library
// role.ts imports it while the CLI is still loading.
//
// Every role has a program. The default one is derived from its role.json:
//   artifact-types  protocol  every artifact the role names is a data-model record type or a documents.json kind
//                             (EE-230), and, in a venture, each artifact record of a kind the role names passes the
//                             artifact lint (lintArtifact in packages/naive/src/checks/artifact-lint.ts) with its rules'
//                             own families and levels
//   reads           protocol  every record type in reads is in the data model; in a venture, design: the venture holds
//                             at least one record of it
//   lint-suites     protocol  every suite in lint_suites is a command route; in a venture, each suite runs and its
//                             findings are design findings, an error when the suite's rule is fail-closed
// A library role may add checks in role.ts beside its role.json: a default export { id, checks } whose id is the role's.
// Its checks run after the default ones and never replace them, so a check id may not repeat a default one.
//
// Only the library's role.ts is loaded. A venture's governance/roles/<id>/role.ts is never imported: the venture folder
// is data that agents write through the router and sync copies between machines, and importing it would run that code
// with the CLI's full rights, outside the gate. Recipes, the one place venture code runs, run in the sandbox
// (packages/naive/src/engine/recipes/sandbox.ts). A venture role's program is the default one for its role.json plus the
// library's role.ts of the same id, and check-roles.ts fails on a role.ts in a venture.
//
// checkRoles appends every finding to .naive/lint-findings.jsonl (packages/naive/src/engine/lint-findings.ts) with lint
// "role" and the role's id. A protocol finding is always an error. With no venture, the checks that need one are
// skipped and nothing is logged.

import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { Cause, Effect, Exit } from "effect";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { CannotRun, NotFound, type NaiveError } from "../core/effect/errors.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { artifactKind, type ArtifactRef } from "../engine/artifact-kind.ts";
import { loadRoles, LIBRARY, VENTURE_ROLES, type Role } from "../engine/agents/roles.ts";
import { catalog as readCatalog } from "../engine/documents.ts";
import { adapters as readAdapters } from "../engine/adapters.ts";
import { readConfig } from "../engine/naive-config.ts";
import { appendFindings, LOG, type LintFinding } from "../engine/lint-findings.ts";
import { globRegExp, readDataModel, venturePaths } from "../records/index.ts";
import { routes } from "../records/routes/routes.ts";
import { levels as levelsOf, lintArtifact, readArtifacts, type DesignRule, type Family, type Level, type LintContext, type LintInput } from "./artifact-lint.ts";
import type { DataModel, NaiveConfig } from "../records/types/records.d.ts";

const REPO = new URL("../../../../", import.meta.url).pathname;

/** One finding a check reports. A protocol finding is always an error, whatever severity it carries. */
export type RoleFinding = { rule: string; family: Family; severity: "warn" | "error"; message: string; artifact?: string; kind?: string };

/** One finding of a lint suite, the shape every lint route's lint(dir) returns. */
export type SuiteFinding = { rule: string; mode?: string; file?: string; message: string };

/** What a check reads. venture is null when the program runs with no venture, and then artifacts is empty. */
export type RoleContext = {
  readonly role: Role;
  readonly venture: string | null;
  /** What the artifact lint checks against, built once for the run. */
  readonly lint: LintContext;
  /** The artifact lint's design levels, from artifact_lint.rules in naive.config.json. */
  readonly levels: Record<DesignRule, Level>;
  /** The venture's artifact records of a document kind the role names, made by this role or by no named role. */
  readonly artifacts: readonly LintInput[];
  /** Runs one lint suite on the venture. */
  readonly runSuite: (suite: string, dir: string) => Effect.Effect<readonly SuiteFinding[], NaiveError>;
};

/** One deterministic check of a role's artifacts: an Effect over VentureFs that fails only with Naive's tagged errors. */
export interface RoleCheck {
  readonly id: string;
  readonly description: string;
  readonly run: (ctx: RoleContext) => Effect.Effect<readonly RoleFinding[], NaiveError, "naive/VentureFs">;
}

/** A role's program: the role it checks and the checks it runs, in order. */
export interface RoleProgram {
  readonly id: string;
  readonly checks: readonly RoleCheck[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const KEBAB = /^[a-z][a-z0-9-]*$/;

/** A venture's records of one type, read through VentureFs: each file at the type's venture paths whose folder has no wildcard. */
export const recordsOf = (dir: string, recordType: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const type = (readDataModel() as DataModel).records.find((r) => r.id === recordType);
  const out: { path: string; body: unknown }[] = [];
  for (const p of venturePaths(type)) {
    const cut = p.lastIndexOf("/");
    const folder = cut < 0 ? "" : p.slice(0, cut), name = p.slice(cut + 1);
    if (folder.includes("*")) continue;
    const names = name.includes("*") ? (yield* fs.list(ventureFile(dir, folder))).filter((n) => globRegExp(name).test(n)) : [name];
    for (const n of names) {
      const path = folder ? `${folder}/${n}` : n;
      const file = ventureFile(dir, path);
      if (!(yield* fs.exists(file))) continue;
      out.push({ path, body: yield* readJson(file).pipe(Effect.orElseSucceed(() => null)) });
    }
  }
  return out;
});

/** The script a lint suite runs, from the route table's command routes; null when no command route has that name. */
export const suiteScript = (suite: string): string | null => {
  const r = routes().find((x) => x.route === suite && x.kind === "command");
  return r && r.kind === "command" ? r.script : null;
};

/** Runs a lint suite's lint(dir) from its script. Each suite reads the venture through node:fs, so it needs a real folder. */
export const runSuite = (suite: string, dir: string): Effect.Effect<readonly SuiteFinding[], NaiveError> => Effect.tryPromise({
  try: async () => {
    const script = suiteScript(suite);
    if (!script) throw new Error(`no command route ${suite}`);
    const mod: unknown = await import(pathToFileURL(join(REPO, script)).href);
    const lint = isObject(mod) ? mod.lint : undefined;
    if (typeof lint !== "function") throw new Error(`${script} exports no lint(dir)`);
    const result: unknown = await lint(dir);
    const findings = isObject(result) && Array.isArray(result.findings) ? result.findings : [];
    return findings.filter((f): f is SuiteFinding => isObject(f) && typeof f.rule === "string" && typeof f.message === "string");
  },
  catch: (cause) => new CannotRun({ message: `lint suite ${suite} cannot run${cause instanceof Error ? `: ${cause.message}` : ""}`, cause }),
});

// A role names itself in a finding by id: its role.json may be the library's or a venture's overlay.
const role = (r: Role) => `role ${r.id}`;

const artifactTypes: RoleCheck = {
  id: "artifact-types",
  description: "Every artifact the role names is a record type or a document kind, and each artifact record of a kind it names passes the artifact lint",
  run: (ctx) => Effect.sync(() => {
    const out: RoleFinding[] = [];
    for (const ref of (ctx.role.artifacts ?? []) as ArtifactRef[]) {
      const k = artifactKind(ref, ctx.lint);
      if (k.kind === "unknown") out.push({ rule: "kind-exists", family: "protocol", severity: "error", message: `${role(ctx.role)} names an artifact Naive has no type for: ${k.why}`, kind: ref.document_kind ?? ref.record_type });
    }
    for (const input of ctx.artifacts) for (const f of lintArtifact(input, ctx.lint, ctx.levels))
      out.push({ rule: f.rule, family: f.family, severity: f.severity, message: `${input.path} ${f.message}`, artifact: input.path, kind: input.ref.document_kind ?? input.ref.record_type });
    return out;
  }),
};

const reads: RoleCheck = {
  id: "reads",
  description: "Every record type the role reads is in the data model, and in a venture at least one record of it exists",
  run: (ctx) => Effect.gen(function* () {
    const out: RoleFinding[] = [];
    for (const t of ctx.role.reads ?? []) {
      if (!ctx.lint.model.records.some((r) => r.id === t)) { out.push({ rule: "reads-known", family: "protocol", severity: "error", message: `${role(ctx.role)} reads ${t}, which is not a record type in the data model`, kind: t }); continue; }
      if (ctx.venture && !(yield* recordsOf(ctx.venture, t)).length) out.push({ rule: "reads-present", family: "design", severity: "warn", message: `${ctx.role.id} reads ${t}, and the venture holds no record of it yet`, kind: t });
    }
    return out;
  }),
};

const lintSuites: RoleCheck = {
  id: "lint-suites",
  description: "Every lint suite the role runs is a command route, and in a venture each one runs and its findings are reported",
  run: (ctx) => Effect.gen(function* () {
    const out: RoleFinding[] = [];
    for (const s of ctx.role.lint_suites ?? []) {
      if (!suiteScript(s)) { out.push({ rule: "suite-known", family: "protocol", severity: "error", message: `${role(ctx.role)} runs the lint suite ${s}, which is not a command route` }); continue; }
      if (!ctx.venture) continue;
      for (const f of yield* ctx.runSuite(s, ctx.venture))
        out.push({ rule: KEBAB.test(f.rule) ? f.rule : "suite-finding", family: "design", severity: f.mode === "fail-closed" ? "error" : "warn", message: `${s}: ${f.file ? `${f.file} ` : ""}${f.message}`, ...(f.file ? { artifact: f.file } : {}) });
    }
    return out;
  }),
};

/** The checks every role's program runs, derived from its role.json. */
export const DEFAULT_CHECKS: readonly RoleCheck[] = [artifactTypes, reads, lintSuites];

/** The program a role has with no role.ts. */
export const defaultProgram = (r: Role): RoleProgram => ({ id: r.id, checks: DEFAULT_CHECKS });

/** What is wrong with a role.ts module's default export, for the role id it sits beside. Empty when it is a valid RoleProgram. */
export function programProblems(value: unknown, id: string): string[] {
  if (!isObject(value)) return ["its default export is not a RoleProgram object { id, checks }"];
  const out: string[] = [];
  if (value.id !== id) out.push(`its id ${JSON.stringify(value.id)} is not the role's id ${id}`);
  if (!Array.isArray(value.checks)) return [...out, "its checks is not an array"];
  const seen = new Set(DEFAULT_CHECKS.map((c) => c.id));
  value.checks.forEach((c: unknown, i: number) => {
    if (!isObject(c) || typeof c.id !== "string" || !KEBAB.test(c.id)) { out.push(`check ${i} has no kebab-case id`); return; }
    if (typeof c.description !== "string" || !c.description.trim()) out.push(`check ${c.id} has no description`);
    if (typeof c.run !== "function") out.push(`check ${c.id} has no run function`);
    if (seen.has(c.id)) out.push(`check ${c.id} repeats ${DEFAULT_CHECKS.some((d) => d.id === c.id) ? "a default check" : "another check"}; role.ts extends the default program and never replaces it`);
    seen.add(c.id);
  });
  return out;
}

/** The role.ts beside a library role, or its compiled role.mjs in the package; null when the role has none. */
export const programFile = (id: string, root: string = REPO): string | null =>
  ["role.ts", "role.mjs"].map((n) => join(root, LIBRARY, id, n)).find((f) => existsSync(f)) ?? null;

/** Imports a library role.ts and returns its default export, checked; a module that is not a valid RoleProgram is CannotRun. */
export const importProgram = (file: string, id: string): Effect.Effect<RoleProgram, CannotRun> => Effect.gen(function* () {
  const mod = yield* Effect.tryPromise({ try: (): Promise<unknown> => import(pathToFileURL(file).href), catch: (cause) => new CannotRun({ message: `${file} cannot be imported${cause instanceof Error ? `: ${cause.message}` : ""}`, cause }) });
  const value = isObject(mod) ? mod.default : undefined;
  const problems = programProblems(value, id);
  if (problems.length) return yield* new CannotRun({ message: `${file}: ${problems.join("; ")}` });
  return value as RoleProgram;
});

/** A role's program: the default checks, then the library role.ts's. `ignored` names a venture role.ts that was not loaded. */
export const loadProgram = (id: string, { venture, root = REPO }: { venture?: string | null; root?: string } = {}) => Effect.gen(function* () {
  const r = loadRoles(venture ?? undefined, root).get(id);
  if (!r) return yield* new NotFound({ what: "role", path: `${LIBRARY}/${id}/role.json` });
  const file = programFile(id, root);
  const extra = file ? yield* importProgram(file, id) : null;
  const local = venture ? ventureFile(venture, `${VENTURE_ROLES}/${id}/role.ts`) : null;
  return {
    role: r,
    program: { id, checks: [...DEFAULT_CHECKS, ...(extra?.checks ?? [])] } as RoleProgram,
    source: file ? relative(root, file) : null,
    ignored: local && existsSync(local) ? `${VENTURE_ROLES}/${id}/role.ts` : null,
  };
});

/** What a run needs that is the same for every role in it. */
export type RunInput = { venture: string | null; lint: LintContext; levels: Record<DesignRule, Level>; artifacts: readonly LintInput[]; runSuite?: RoleContext["runSuite"] };

/**
 * Runs a program's checks in order and returns its findings as log lines. A check that fails, or throws, is reported as
 * a protocol error under its own id and the rest still run. A protocol finding is always an error.
 */
export const runProgram = (program: RoleProgram, r: Role, input: RunInput, at: string) => Effect.gen(function* () {
  const kinds = new Set((r.artifacts ?? []).flatMap((a) => ("document_kind" in a ? [a.document_kind] : [])));
  const ctx: RoleContext = {
    role: r, venture: input.venture, lint: input.lint, levels: input.levels, runSuite: input.runSuite ?? runSuite,
    artifacts: input.artifacts.filter((a) => a.ref.document_kind !== undefined && kinds.has(a.ref.document_kind) && (a.role === undefined || a.role === r.id)),
  };
  const lines: LintFinding[] = [];
  for (const c of program.checks) {
    const exit = yield* Effect.exit(Effect.suspend(() => c.run(ctx)));
    const found: readonly RoleFinding[] = Exit.isSuccess(exit) ? exit.value
      : [{ rule: c.id, family: "protocol", severity: "error", message: `${r.id}'s check ${c.id} could not run: ${Cause.pretty(exit.cause).split("\n")[0]}` }];
    for (const f of found) lines.push({
      at, lint: "role", rule: KEBAB.test(f.rule) ? f.rule : c.id, family: f.family, severity: f.family === "protocol" ? "error" : f.severity,
      message: f.message, role: r.id, ...(f.artifact ? { artifact: f.artifact } : {}), ...(f.kind ? { kind: f.kind } : {}),
    });
  }
  return lines;
});

/** What the artifact lint reads, without a venture: the data model, the catalog and the adapters, and no brand or artifacts. */
const bare = (): { ctx: LintContext; inputs: LintInput[] } => ({
  ctx: { model: readDataModel() as DataModel, catalog: readCatalog(), adapters: readAdapters(), style: new Map(), voice: [], documents: [] },
  inputs: [],
});

/**
 * Runs the programs of the roles named (every library and venture role with all) and, in a venture, appends every
 * finding to the venture's lint findings log. ids an unknown role fails with NotFound.
 */
export const checkRoles = (ids: readonly string[] | "all", { venture = null, at = new Date().toISOString(), config, root = REPO, runSuite: suites }: { venture?: string | null; at?: string; config?: NaiveConfig; root?: string; runSuite?: RoleContext["runSuite"] } = {}) => Effect.gen(function* () {
  const read = venture ? yield* readArtifacts(venture) : bare();
  const input: RunInput = { venture, lint: read.ctx, levels: levelsOf(config ?? (venture ? readConfig(venture) : {})), artifacts: read.inputs, runSuite: suites };
  const list = ids === "all" ? [...loadRoles(venture ?? undefined, root).keys()].sort() : ids;
  const roles: { id: string; source: string | null; ignored: string | null; checks: number }[] = [];
  const findings: LintFinding[] = [];
  for (const id of list) {
    const { role: r, program, source, ignored } = yield* loadProgram(id, { venture, root });
    findings.push(...(yield* runProgram(program, r, input, at)));
    roles.push({ id, source, ignored, checks: program.checks.length });
  }
  if (venture) yield* appendFindings(ventureFile(venture, LOG), findings);
  return { venture, roles, findings, errors: findings.filter((f) => f.severity === "error").length };
});
