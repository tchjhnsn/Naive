// Where a venture's files physically are (EE-086). Code names a file by its logical path, the path a
// record has always had (foundation/problem.json, provenance.jsonl, knowledge/sources.json), and `at`
// says where it sits on disk under the venture's layout:
//
//   flat (no layout in venture.json, every venture made before EE-086): the logical path, unchanged
//   structured (venture.json layout: "structured"):
//     venture.json, AGENTS.md, README.md, package.json, lockfiles, .vscode/   at the top (profile.md is README.md)
//     provenance.jsonl, sources.json, naive.config.json, operating-rules.json   in meta/; .release/ is meta/releases/
//     every package (foundation/, people/, _drafts/ ...)  in k-base/, or in k-base/(group)/ when the
//                                                         founder mirrors a function as a folder
//     code the venture keeps (a marketing site, a ported repository)  in codebase/
//   A structured venture made by 0.3.0 has knowledge/ where k-base/ now is; it is read where it is
//   until naive upgrade renames it.
//   src (venture.json layout: "src", EE-118 step 8, the layout naive init writes):
//     venture.json, naive.config.json, provenance.jsonl and every top-level file   at the top
//     public/                                                                       the static files the venture hands out
//     a package folder a function owns (foundation/, product/, marketing/ ...)     in src/<function>/<package>/ (PACKAGE_FUNCTION)
//     every other folder (decisions/, evidence/, raw/, governance/ ...)             at the top, beside src/
//
// `logical` goes the other way, for code that walks the disk and matches files against the data model.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Delegation } from "../records/types/records.d.ts";

/** One grant in a delegation record. */
export type Grant = Delegation["grants"][number];
/** Whether a grant is backed to the root, and why not. */
export type Backing = { ok: true; why?: undefined } | { ok: false; why: string };
/** A venture's layout on disk. */
export type Layout = "flat" | "structured" | "src";

/** A delegation record as it binds: when it extends a template, the template's never_redelegated and
 *  one_way_doors are unioned in, so a venture can only add to them. Grants are never inherited.
 *  Throws on an extends it cannot honor; a caller that catches it must refuse. */
export const liveGrant = (g: Pick<Grant, "expires">, today: string): boolean => g.expires == null || g.expires >= today;
// Scopes are paths compared by whole segments: engineering/ holds engineering/api, never engineering-secrets/.
const segments = (scope: string) => scope.split("/").filter(Boolean);
export const scopeWithin = (inner: string, outer: string): boolean => outer === "venture" || (inner !== "venture"
  && segments(outer).every((s, i) => segments(inner)[i] === s));
const endsNoLater = (a: string | null, b: string | null) => b == null || (a != null && a <= b);

/** Is grant g backed all the way to the root of delegation record d? seen guards against cycles. */
export function grantBacked(d: Delegation, g: Grant, today: string, seen: Set<Grant> = new Set()): Backing {
  if (g.from === d.root) return { ok: true };
  if (seen.has(g)) return { ok: false, why: "its chain loops" };
  seen.add(g);
  for (const c of g.classes) {
    if ((d.never_redelegated ?? []).includes(c)) return { ok: false, why: `${c} is never re-delegated` };
    const up = d.grants.filter((h) => h.to === g.from && h.classes.includes(c) && h.may_redelegate && liveGrant(h, today)
      && scopeWithin(g.scope, h.scope) && (!g.may_merge || h.may_merge) && endsNoLater(g.expires, h.expires) && grantBacked(d, h, today, new Set(seen)).ok);
    if (!up.length) return { ok: false, why: `${g.from} holds no live, re-delegable grant of ${c} at least this wide that reaches ${d.root}` };
  }
  return { ok: true };
}

/** The template folder moved from governance/venture-template/ to packages/naive/template/governance/ in EE-118 step 8.
 *  A record that names the old path still resolves, for one release. */
export const OLD_TEMPLATE = "governance/venture-template/", TEMPLATE = "packages/naive/template/governance/";
export const templatePath = (p: string): string => String(p).startsWith(OLD_TEMPLATE) ? TEMPLATE + String(p).slice(OLD_TEMPLATE.length) : p;

export function readDelegation(file: string): Delegation {
  const d: Delegation = JSON.parse(readFileSync(file, "utf8"));
  if (d.extends === undefined) return d;
  const base = join(new URL("../../../..", import.meta.url).pathname, templatePath(d.extends));
  if (!existsSync(base)) throw new Error(`delegation extends ${d.extends}, which does not exist`);
  let t: Delegation;
  try { t = JSON.parse(readFileSync(base, "utf8")); } catch (e) { throw new Error(`delegation extends ${d.extends}, which cannot be read: ${e instanceof Error ? e.message : String(e)}`); }
  if (t.register !== "delegation" || t.extends !== undefined || t.root !== d.root) throw new Error(`delegation extends ${d.extends}, which is not a base delegation record with root ${d.root}`);
  const union = (k: "never_redelegated" | "one_way_doors") => [...new Set([...(t[k] ?? []), ...(d[k] ?? [])])];
  return { ...d, never_redelegated: union("never_redelegated"), one_way_doors: union("one_way_doors") };
}

/** What stays at the top of a structured venture: its own files and what tools keep there. The migration moves everything else. */
export const TOP = new Set(["venture.json", "AGENTS.md", "README.md", "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb", ".gitignore", ".vscode"]);
const META: Readonly<Record<string, string>> = { "provenance.jsonl": "meta/provenance.jsonl", "knowledge/sources.json": "meta/sources.json", "sources.json": "meta/sources.json", "naive.config.json": "meta/naive.config.json", "operating-rules.json": "meta/operating-rules.json" };
const cache = new Map<string, { m: number; layout: Layout }>();
export const KBASE = "k-base";
export const SRC = "src";
/** The 13 functions (packages/naive/src/functions/departments.json), one src/<function>/ folder each in the src layout. */
export const FUNCTIONS = ["strategy", "products", "marketing-and-sales", "supply-chain", "service-delivery", "customer-service", "human-capital", "it", "finance", "assets", "risk-and-compliance", "external-relationships", "capabilities"] as const;
/** A function id: one of FUNCTIONS. */
export type FunctionId = (typeof FUNCTIONS)[number];
/** The function that owns each package folder in the src layout (docs/design/NAIVE_LAYOUT_2026-11-05.md in everything-ecosystem).
 *  decisions/, evidence/ and raw/ belong to no single function and stay at the top, as does any folder not listed. */
export const PACKAGE_FUNCTION: Readonly<Record<string, FunctionId>> = Object.freeze({
  foundation: "strategy", validation: "strategy",
  product: "products", engineering: "products",
  marketing: "marketing-and-sales", customers: "marketing-and-sales", deals: "marketing-and-sales", sales: "marketing-and-sales",
  support: "customer-service",
  operations: "service-delivery",
  people: "human-capital", cofounder: "human-capital",
  finance: "finance", fund: "finance", money: "finance",
  legal: "risk-and-compliance", counsel: "risk-and-compliance",
  relationships: "external-relationships", investor: "external-relationships", investors: "external-relationships", partner: "external-relationships",
  "investor-relations": "external-relationships",
  it: "it",
  "supply-chain": "supply-chain", "service-delivery": "service-delivery",
  capabilities: "capabilities",
  assets: "assets",
});
export const CODEBASE = "codebase";

/** The venture's knowledge-base folder: k-base/, or knowledge/ in a structured venture made before it was renamed. */
export function kbaseOf(dir: string): string {
  return !existsSync(join(dir, KBASE)) && existsSync(join(dir, "knowledge", "foundation")) ? "knowledge" : KBASE;
}

/** The venture's layout: "src" (EE-118 step 8), "structured" (EE-086) or "flat". Read once per venture.json change. */
export function layoutOf(dir: string): Layout {
  const f = join(dir, "venture.json");
  let m = 0;
  try { m = statSync(f).mtimeMs; } catch { return "flat"; }
  const hit = cache.get(dir);
  if (hit && hit.m === m) return hit.layout;
  let layout: Layout = "flat";
  try { const l = JSON.parse(readFileSync(f, "utf8")).layout; layout = l === "structured" || l === "src" ? l : "flat"; } catch {}
  cache.set(dir, { m, layout });
  return layout;
}

// The (group)/ folder a package sits in, when the founder mirrors functions on disk.
function groupOf(dir: string, pkg: string): string | null {
  const kb = join(dir, kbaseOf(dir));
  if (!pkg || existsSync(join(kb, pkg)) || !existsSync(kb)) return null;
  for (const g of readdirSync(kb)) if (/^\(.+\)$/.test(g) && existsSync(join(kb, g, pkg))) return g;
  return null;
}

/** Where a logical path sits in the src layout: src/<function>/<path> for a package folder a function owns, else unchanged. */
export function srcPath(r: string): string {
  const f = PACKAGE_FUNCTION[r.split("/")[0]];
  return f ? `${SRC}/${f}/${r}` : r;
}

/** The venture-relative physical path of a logical path. */
export function physical(dir: string, rel: string): string {
  const r = String(rel).split(sep).join("/").replace(/^\.\//, "");
  const layout = layoutOf(dir);
  if (layout === "src") return srcPath(r);
  if (layout !== "structured") return r;
  if (TOP.has(r.split("/")[0])) return r;
  if (r === "profile.md") return "README.md";
  if (META[r]) return META[r];
  if (r === ".release" || r.startsWith(".release/")) return "meta/releases" + r.slice(".release".length);
  if (r.startsWith(".naive/") || r === ".naive" || r.startsWith("node_modules") || r.startsWith(".git")) return r;
  const kb = kbaseOf(dir);
  // Code beside k-base/ (src/) stays where it is: logical() leaves it unchanged, so physical() must too.
  if (r.startsWith(`${kb}/`) || r === kb || r.startsWith("meta/") || r.startsWith(`${CODEBASE}/`) || r.startsWith("repo/") || r.startsWith(`${SRC}/`)) return r;
  const pkg = r.split("/")[0];
  const g = groupOf(dir, pkg);
  return `${kb}/${g ? `${g}/` : ""}${r}`;
}

/** The absolute path of a logical path in a venture. */
export const ventureFile = (dir: string, rel: string): string => join(dir, physical(dir, rel));

/** The logical path of a venture-relative physical path: the inverse of `physical`. */
export function logical(dir: string, rel: string): string {
  const r = String(rel).split(sep).join("/");
  const layout = layoutOf(dir);
  if (layout === "src") {
    const m = r.match(/^src\/([^/]+)\/(([^/]+)(\/.*)?)$/);
    return m && PACKAGE_FUNCTION[m[3]] === m[1] ? m[2] : r;
  }
  if (layout !== "structured") return r;
  if (r === "README.md") return "profile.md";
  for (const [l, p] of Object.entries(META)) if (r === p) return l === "sources.json" ? "knowledge/sources.json" : l;
  if (r === "meta/releases" || r.startsWith("meta/releases/")) return ".release" + r.slice("meta/releases".length);
  const kb = kbaseOf(dir);
  if (r.startsWith(`${kb}/`)) return r.slice(kb.length + 1).replace(/^\([^/]+\)\//, "");
  return r;
}

/** Every file of a venture by its logical path, skipping what is never a record. */
export function logicalFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!existsSync(join(p, "venture.json"))) walk(p); }
      else out.push(logical(dir, relative(dir, p)));
    }
  };
  walk(dir);
  return out;
}
