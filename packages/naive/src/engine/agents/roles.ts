// The role library (EE-229): every role an agent or a person holds is one role module, read here and nowhere else.
//
//   the library        packages/naive/src/roles/<id>/role.json (packages/naive/src/records/role.schema.json) beside
//                      the role's SKILL.md: the founder and the other person roles, the leads and the agent roles
//   a venture's roles  <venture>/governance/roles/<id>/role.json, which overlays the library role of the same id whole
//   Naive's own roles  agents/<id>/role.json in this repository (EE-238): the roles that build Naive itself, a scope of
//                      their own that overlays the library for Naive and is never a venture's (naiveRoles)
//   extends            a role in either overlay may name a library role in extends and leave out what it inherits:
//                      every field but aliases, which stay with the library role (extendRole)
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
/** Naive's own roles, from the repository root (EE-238). Not shipped in the package, so only this repository reads them. */
export const NAIVE_ROLES = "agents";

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

/**
 * A role that names a library role in extends, with every field it leaves out read from that role, except aliases,
 * which stay with the library role. A role with no extends, or one naming a role the library lacks, is returned as it
 * is; check-roles.ts reports the second.
 */
export function extendRole(own: Role, library: ReadonlyMap<string, Role>): Role {
  const base = own.extends === undefined ? undefined : library.get(own.extends);
  if (!base) return own;
  const inherited: Partial<Role> = { ...base };
  delete inherited.aliases;
  return { ...inherited, ...own };
}

/** The roles in one folder of role modules, by id, each extended from library. A file with no string id is left out; check-roles.ts reports it. */
function rolesIn(base: string, library: ReadonlyMap<string, Role> = new Map()): Map<string, Role> {
  const out = new Map<string, Role>();
  for (const { value } of roleFiles(base)) if (isObject(value) && typeof value.id === "string") out.set(value.id, extendRole(value as Role, library));
  return out;
}

/** The library overlaid by one folder of role modules by id. */
function overlay(root: string, base: string): Map<string, Role> {
  const library = rolesIn(join(root, LIBRARY));
  const roles = new Map(library);
  for (const [id, r] of rolesIn(base, library)) roles.set(id, r);
  return roles;
}

/** The library's roles, overlaid by a venture's own roles by id. root is the repository, so a check can read a copy. */
export function loadRoles(dir?: string, root: string = REPO): Map<string, Role> {
  return dir ? overlay(root, ventureFile(dir, VENTURE_ROLES)) : rolesIn(join(root, LIBRARY));
}

/** Naive's own scope (EE-238): the library's roles overlaid by agents/<id>/role.json. A folder there with no role.json, such as agents/chief-of-staff/, is a shipped agent of a library role and adds none. */
export function naiveRoles(root: string = REPO): Map<string, Role> {
  return overlay(root, join(root, NAIVE_ROLES));
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
