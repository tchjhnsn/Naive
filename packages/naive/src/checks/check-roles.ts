// Checks the role library (EE-229): packages/naive/src/roles/<id>/role.json, and a venture's own roles at
// <venture>/governance/roles/<id>/role.json, which overlay the library by id. Rules:
//   - every role file is JSON and validates against packages/naive/src/records/role.schema.json;
//   - its id matches its folder;
//   - verified_by and each also_verified_by name a known role (a library or venture role, or a function agent or
//     researcher) and never the role itself;
//   - ids and aliases are unique: no alias is another role's id or alias, in the library or once a venture's roles
//     overlay it (a venture role with a library role's id replaces that role, which is the overlay);
//   - a person role grants no agent tier: its default_tier, when it has one, is person.
// What the delegation rules need (a verifier for every agent role, grantable classes, leads' portfolios) is
// packages/naive/src/checks/check-delegation.ts.
//
//   node packages/naive/src/checks/check-roles.ts [venture dir] [--root <repository>] [--json]
//
// --root reads the library from a copy of the repository, as the tests do. Exit 0 passes, 1 fails.

import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { catalog } from "../engine/departments.ts";
import { LIBRARY, roleFiles, VENTURE_ROLES, type Role, type RoleFile } from "../engine/agents/roles.ts";
import { validateValue } from "../records/validate.ts";

/** One scope's role files: the library's or a venture's. */
export interface Scope { readonly name: "library" | "venture", readonly files: readonly RoleFile[] }

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every problem with the role files of the library and a venture's overlay. functions are the departments.json ids. */
export function roleProblems(scopes: readonly Scope[], functions: readonly string[]): string[] {
  const errors: string[] = [];
  // The roles that parse and validate, by id, the venture's overlaying the library's.
  const roles = new Map<string, { role: Role, at: string }>();
  for (const { name, files } of scopes) for (const f of files) {
    const at = `${name === "library" ? LIBRARY : VENTURE_ROLES}/${f.folder}/role.json`;
    if (f.value === null) { errors.push(`${at}: missing or not JSON`); continue; }
    const v = validateValue("role.schema.json", f.value);
    if (v.status !== 0) { errors.push(`${at}: does not match role.schema.json: ${(v.stdout + v.stderr).trim().split("\n").join("; ")}`); continue; }
    if (!isObject(f.value)) continue;
    const role = f.value as Role;
    if (role.id !== f.folder) errors.push(`${at}: id ${role.id} does not match its folder ${f.folder}`);
    roles.set(role.id, { role, at });
  }
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
      if (owner !== undefined && owner !== role.id) errors.push(`${at}: alias ${a} is already ${owner === a ? "a role id" : `an alias of ${owner}`}`);
      else names.set(a, role.id);
    }
    if (role.kind === "person" && role.default_tier !== undefined && role.default_tier !== "person") errors.push(`${at}: a person role grants no agent tier, but its default_tier is ${role.default_tier}`);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--root");
  const root = at >= 0 ? args[at + 1] : new URL("../../../..", import.meta.url).pathname;
  const venture = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--root");
  const scopes: Scope[] = [{ name: "library", files: roleFiles(join(root, LIBRARY)) }];
  if (venture) scopes.push({ name: "venture", files: roleFiles(ventureFile(venture, VENTURE_ROLES)) });
  const errors = roleProblems(scopes, catalog().map((d) => d.id));
  const count = scopes.reduce((n, s) => n + s.files.length, 0);
  if (args.includes("--json")) console.log(JSON.stringify({ roles: count, errors }, null, 2));
  else {
    for (const e of errors) console.log(`FAIL  ${e}`);
    console.log(errors.length ? `${errors.length} error(s) in ${count} role files` : `role library: ${count} role files valid, ids match folders, every verifier a known role and never itself, ids and aliases unique, no person role with an agent tier`);
  }
  process.exit(errors.length ? 1 : 0);
}
