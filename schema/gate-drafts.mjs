#!/usr/bin/env node
// Held writes (X-2): where the gate's drafts wait and for whom. The gate (schema/gate.mjs) decides;
// this stores what it held. A held write lands in _drafts/ as before, with a sidecar
// (<draft>.gate) saying which rule held it and the function owner it was sent to. Where a rule (or
// gate.variants in naive.config.json) keeps variants, a second agent draft that differs from the
// first is kept beside it instead of replacing it, like an A/B rewrite: variant a is <draft>,
// variant b is <draft>.b, and so on. One open decision, in the decisions/ folder beside the record,
// asks the founder which to accept. Accepting one variant (mentura accept <route> --pick b) decides
// that decision and removes the others.
//
//   node schema/gate-drafts.mjs <venture dir> [--owner <role>] [--json]   the drafts waiting, by owner

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { approve } from "./decisions.mjs";
import { ventureFile } from "./venture-paths.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
export const sidecarOf = (draft) => `${draft}.gate`;
export const variantPath = (draft, v) => (v === "a" ? draft : `${draft}.${v}`);

/** The decision that holds a record's variants side by side: its id and venture-relative file. */
export function variantsDecision(file) {
  const stem = file.replace(/\.json$/, "");
  const id = `variants-${stem.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const at = dirname(file) === "." ? "decisions" : `${dirname(file)}/decisions`;
  return { id, path: `${at}/${basename(stem)}.variants.decision.json` };
}

const readJson = (f) => JSON.parse(readFileSync(f, "utf8"));

/** The sidecar of a draft, or null. A sidecar is a file's word, so which variants exist and their paths come from
 *  the disk and the draft's own name. It only adds who wrote each one. */
export function sidecar(dir, draft) {
  const f = ventureFile(dir, sidecarOf(draft));
  if (!existsSync(f)) return null;
  const meta = readJson(f);
  if (!Array.isArray(meta.variants)) return { ...meta, variants: undefined };
  const variants = [...LETTERS].map((variant) => ({ variant, file: variantPath(draft, variant) })).filter((v) => existsSync(ventureFile(dir, v.file)))
    .map((v) => ({ ...meta.variants.find((x) => x?.variant === v.variant), ...v, sha256: sha(readFileSync(ventureFile(dir, v.file))) }));
  return { ...meta, variants };
}

/**
 * Stores a held write. dir: the venture; draft: _drafts/<file>.draft; file: the record's path; text:
 * the record; verdict: the gate's, or null when only a decision class held it; route; agent: who wrote it.
 * Returns { written, variant, variants, decision }.
 * @param {string} dir
 * @param {{ draft: string, file?: string, text?: string, verdict?: *, route?: string, agent?: { id?: string, kind?: string } }} held
 */
export function writeHeld(dir, { draft, file, text, verdict, route, agent = {} }) {
  const dest = ventureFile(dir, draft);
  mkdirSync(dirname(dest), { recursive: true });
  const at = new Date().toISOString();
  const by = agent.id ?? agent.kind ?? "agent";
  const meta = sidecar(dir, draft);
  const keep = !!verdict?.variants && existsSync(dest);
  if (!keep) {
    writeFileSync(dest, text);
    for (const v of meta?.variants ?? []) if (v.variant !== "a") rmSync(ventureFile(dir, variantPath(draft, v.variant)), { force: true });
    if (verdict && verdict.then !== "pass") {
      writeFileSync(ventureFile(dir, sidecarOf(draft)), JSON.stringify({ route, file, rule: verdict.rule, source: verdict.source, then: verdict.then,
        ...(verdict.owner ? { owner: verdict.owner, function: verdict.function ?? null } : {}), variants: [{ variant: "a", file: draft, by, at, sha256: sha(text) }] }, null, 2) + "\n");
    } else rmSync(ventureFile(dir, sidecarOf(draft)), { force: true });
    return { written: draft, variant: "a" };
  }
  // Variants: the first draft stays as a; a draft equal to one already held is that variant.
  const variants = meta?.variants?.length ? meta.variants : [{ variant: "a", file: draft, by: "agent", at, sha256: sha(readFileSync(dest)) }];
  const same = variants.find((v) => v.sha256 === sha(text));
  if (same) return { written: same.file, variant: same.variant, variants: variants.map((v) => v.variant), decision: meta?.decision ?? null };
  const next = [...LETTERS].find((l) => !variants.some((v) => v.variant === l));
  if (!next) throw new Error(`${route} already holds ${variants.length} drafts side by side; accept one first`);
  const vfile = variantPath(draft, next);
  writeFileSync(ventureFile(dir, vfile), text);
  variants.push({ variant: next, file: vfile, by, at, sha256: sha(text) });
  const dec = variantsDecision(file);
  const record = {
    id: dec.id,
    question: `Which draft of ${route} do you accept?`,
    decides: { path: file },
    parent: "venture",
    boundary: "fail-open",
    status: "open",
    options: variants.map((v) => `${v.variant}: drafted by ${v.by} at ${v.at}`),
    answer: null,
    note: `The gate kept ${variants.length} differing drafts side by side (rule ${verdict.rule}). Accept one: mentura accept ${route} --pick <letter>`,
    provenance: { drafted_by: { kind: "framework" } },
  };
  mkdirSync(dirname(ventureFile(dir, dec.path)), { recursive: true });
  writeFileSync(ventureFile(dir, dec.path), JSON.stringify(record, null, 2) + "\n");
  writeFileSync(ventureFile(dir, sidecarOf(draft)), JSON.stringify({ ...(meta ?? { route, file, rule: verdict.rule, source: verdict.source, then: verdict.then, ...(verdict.owner ? { owner: verdict.owner, function: verdict.function ?? null } : {}) }), variants, decision: dec.id }, null, 2) + "\n");
  return { written: vfile, variant: next, variants: variants.map((v) => v.variant), decision: dec.id };
}

/** The file of one variant of a draft, to accept. Throws when a draft holds variants and none, or an unknown one, is picked. */
export function pick(dir, draft, letter) {
  const meta = sidecar(dir, draft);
  const vs = meta?.variants ?? [];
  if (vs.length > 1 && !letter) throw new Error(`${meta.route} holds ${vs.length} drafts side by side (${vs.map((v) => v.variant).join(", ")}): pick one with --pick <letter>`);
  if (!letter || letter === "a") return draft;
  const v = vs.find((x) => x.variant === letter);
  if (!v) throw new Error(`no draft ${letter} of ${meta?.route ?? draft}${vs.length ? ` (there are ${vs.map((x) => x.variant).join(", ")})` : ""}`);
  return v.file;
}

/**
 * After a person accepts a draft: removes every variant and the sidecar, and decides the variants decision.
 * @param {string} dir
 * @param {string} draft
 * @param {{ picked?: string, by?: string, account?: string, via?: string }} [opts]
 *  @returns {{ picked: string, decision?: string, decided?: boolean, error?: string }}
 */
export function settle(dir, draft, { picked = "a", by, account, via } = {}) {
  const meta = sidecar(dir, draft);
  for (const v of meta?.variants ?? []) rmSync(ventureFile(dir, v.file), { force: true });
  rmSync(ventureFile(dir, draft), { force: true });
  rmSync(ventureFile(dir, sidecarOf(draft)), { force: true });
  // The draft's own name decides which decision this signs, and only a round that opened it signs it.
  const { id, path } = variantsDecision(draft.replace(/^_drafts\//, "").replace(/\.draft$/, "").replace(/__/g, "/"));
  if (meta?.decision !== id || !existsSync(ventureFile(dir, path))) return { picked };
  const d = approve(dir, id, /** @type {Parameters<typeof approve>[2]} */ ({ by: by ?? process.env.MENTURA_PERSON ?? "founder", account, via, answer: picked, note: `accepted draft ${picked} of ${meta?.route ?? draft}` }));
  const decided = d.ok || /already decided as worded/.test(d.error);
  return { picked, decision: id, decided, ...(decided ? {} : { error: d.error }) };
}

/** The drafts waiting in a venture: route, rule, owner and variants. A draft with no sidecar was held by its decision class. */
export function inbox(dir, owner) {
  const d = join(ventureFile(dir, "_drafts"));
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith(".draft")).sort().map((f) => {
    const draft = `_drafts/${f}`;
    const meta = sidecar(dir, draft);
    return { draft, file: f.replace(/\.draft$/, "").replace(/__/g, "/"), route: meta?.route ?? null, rule: meta?.rule ?? null, then: meta?.then ?? "draft",
      owner: meta?.owner ?? null, variants: (meta?.variants ?? [{ variant: "a" }]).map((v) => v.variant), decision: meta?.decision ?? null };
  }).filter((x) => !owner || x.owner === owner);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !(i && all[i - 1] === "--owner"));
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/gate-drafts.mjs <venture dir> [--owner <role>] [--json]"); process.exit(2); }
  const i = process.argv.indexOf("--owner");
  const rows = inbox(dir, i > 0 ? process.argv[i + 1] : undefined);
  if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 2));
  else if (!rows.length) console.log("no drafts waiting");
  else for (const r of rows) console.log(`${r.file.padEnd(36)} ${r.then.padEnd(6)} ${r.owner ?? "-"}  ${r.rule ?? "decision class"}  variants ${r.variants.join(", ")}`);
}
