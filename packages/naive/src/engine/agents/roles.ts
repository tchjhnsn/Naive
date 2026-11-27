// Every role id a venture may name (EE-214), in one place, because three registers hold them:
//
//   the agent-roles register   packages/naive/template/governance/roles/agent-roles.json, the operating model's roles
//                              (founder, chief-of-staff, architect, builder and the rest)
//   the role templates         packages/naive/template/governance/roles/<id>.json, overlaid by the venture's
//                              governance/roles/<id>.json: the leads and the function roles
//   the function agents        <function>-agent and <function>-researcher, derived from the 13 functions in
//                              packages/naive/src/functions/departments.json; they are in no file, so a check that read
//                              only the register refused every handoff a function agent holds or verifies
//
// It reads, and writes nothing. A person named by name is not a role: Naive keeps no register of people by name.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../../core/venture-paths.ts";
import { catalog } from "../departments.ts";

const repo = new URL("../../../../..", import.meta.url).pathname;
const ROLES = "packages/naive/template/governance/roles";
const load = (f: string): unknown => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The role ids in one folder of role templates: each file's own id, plus the ids an index file lists under roles. */
function rolesIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const r = load(join(dir, f));
    if (!isObject(r)) continue;
    if (Array.isArray(r.roles)) out.push(...r.roles.filter(isObject).map((x) => x.id).filter((id): id is string => typeof id === "string"));
    else if (typeof r.id === "string") out.push(r.id);
  }
  return out;
}

/** Every role id a venture may name: the registers, the role templates and the function agents and researchers. */
export function knownRoles(dir?: string): Set<string> {
  const functions = catalog().map((d) => d.id);
  return new Set([
    ...rolesIn(join(repo, ROLES)),
    ...(dir ? rolesIn(ventureFile(dir, "governance/roles")) : []),
    ...functions.map((f) => `${f}-agent`),
    ...functions.map((f) => `${f}-researcher`),
  ]);
}
