// The role library (EE-229): every role an agent or a person holds is one role module, read here and nowhere else.
//
//   the library        packages/naive/src/roles/<id>/role.json (packages/naive/src/records/role.schema.json) beside
//                      the role's SKILL.md: the founder and the other person roles, the leads and the agent roles
//   a venture's roles  <venture>/governance/roles/<id>/role.json, which overlays the library role of the same id whole
//   the function agents <function>-agent and <function>-researcher, derived from the 13 functions in
//                      packages/naive/src/functions/departments.json; they are in no file, so knownRoles() adds them
//
// It reads, and writes nothing. A person named by name is not a role: Naive keeps no register of people by name.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../../core/venture-paths.ts";
import { catalog } from "../departments.ts";
import type { Role } from "../../records/types/records.d.ts";

export type { Role };
const REPO = new URL("../../../../..", import.meta.url).pathname;
/** The role library, from the repository root. */
export const LIBRARY = "packages/naive/src/roles";
/** A venture's own roles, from the venture root. */
export const VENTURE_ROLES = "governance/roles";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const parse = (f: string): unknown => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

/** One role file as it sits on disk: its folder, its path and its parsed value (null when it is not JSON). */
export interface RoleFile { readonly folder: string, readonly file: string, readonly value: unknown }

/** Every <base>/<id>/role.json, by folder name order. A folder with no role.json is listed with value null. */
export function roleFiles(base: string): RoleFile[] {
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
    .map((folder) => { const file = join(base, folder, "role.json"); return { folder, file, value: existsSync(file) ? parse(file) : null }; });
}

/** The roles in one folder of role modules, by id. A file with no string id is left out; check-roles.ts reports it. */
function rolesIn(base: string): Map<string, Role> {
  const out = new Map<string, Role>();
  for (const { value } of roleFiles(base)) if (isObject(value) && typeof value.id === "string") out.set(value.id, value as Role);
  return out;
}

/** The library's roles, overlaid by a venture's own roles by id. root is the repository, so a check can read a copy. */
export function loadRoles(dir?: string, root: string = REPO): Map<string, Role> {
  const roles = rolesIn(join(root, LIBRARY));
  if (dir) for (const [id, r] of rolesIn(ventureFile(dir, VENTURE_ROLES))) roles.set(id, r);
  return roles;
}

/** Whether a person holds the role: only a person role, never an agent or either role. */
export const isPersonRole = (r: Role | undefined): boolean => r?.kind === "person";

/** Every role id a venture may name: the library's and the venture's roles, and the function agents and researchers. */
export function knownRoles(dir?: string): Set<string> {
  const functions = catalog().map((d) => d.id);
  return new Set([
    ...loadRoles(dir).keys(),
    ...functions.map((f) => `${f}-agent`),
    ...functions.map((f) => `${f}-researcher`),
  ]);
}
