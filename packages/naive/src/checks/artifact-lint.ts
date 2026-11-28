#!/usr/bin/env node
// The artifact lint (EE-231): checks each artifact a venture holds against the type it declares. An artifact names its
// type as a document kind in packages/naive/src/functions/documents.json or a record type in the data model (EE-230),
// and the lint holds it to that type.
//
//   node packages/naive/src/checks/artifact-lint.ts <venture dir> [--json]
//   naive lint artifacts [<venture dir>] [--json]
//
// Two families of rules:
//   protocol  always an error, never configurable: the type exists, the format is one the kind and the harness allow,
//             the rendered copy has the sections its kind requires, every section cites a record and field or is a
//             declared hole, and the ladder's rung order and approval hold (EE-218, through check-documents.ts).
//   design    off, warn (the default) or error under artifact_lint.rules in naive.config.json: the brand fields the
//             kind is styled with are filled, the copy uses no phrase the brand's voice avoids, the headings step down
//             one level at a time under one title, and the copy fits the kind's length.
//
// Every finding, of either family and any severity, is appended to .naive/lint-findings.jsonl
// (packages/naive/src/engine/lint-findings.ts) with the artifact's kind and, when the artifact record names them, its
// role and harness; naive lint report aggregates the log. Any error exits 1.
//
// The rules are pure: lintArtifact(input, context, levels) takes one artifact (its path, the type it claims, its format,
// its rendered text, its role and harness) and what it is checked against, so a caller that knows a role made a record
// can lint it the same way. The I/O is lintVenture, an Effect over VentureFs (EE-125). Today the venture's artifacts are
// its artifact records with a document_kind; one with none claims no type and is counted as skipped. A record-type
// artifact is held to the protocol rule kind-exists only; its shape is the record schema's, which validate.ts checks.

import { join } from "node:path";
import { Effect } from "effect";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { runMain } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { artifactKind, type ArtifactRef } from "../engine/artifact-kind.ts";
import { catalog as readCatalog, format as formatOf, kind as kindOf, outputPath } from "../engine/documents.ts";
import { adapters as readAdapters } from "../engine/adapters.ts";
import { voiceCheck } from "../engine/brand.ts";
import { readConfig } from "../engine/naive-config.ts";
import { appendFindings, LOG, type LintFinding } from "../engine/lint-findings.ts";
import { globRegExp, readDataModel, venturePaths } from "../records/index.ts";
import { documentLadderErrors, type Document } from "./check-documents.ts";
import type { Adapter, Artifact, DataModel, DocumentCatalog, MarketingBrand, MarketingBrandRule, NaiveConfig } from "../records/types/records.d.ts";

export type Family = "protocol" | "design";
export type Level = "off" | "warn" | "error";
export const LEVELS: readonly Level[] = ["off", "warn", "error"];
export const PROTOCOL_RULES = ["kind-exists", "format-allowed", "sections-present", "section-cited", "ladder"] as const;
export const DESIGN_RULES = ["style-filled", "voice-terms", "heading-levels", "length"] as const;
export type ProtocolRule = (typeof PROTOCOL_RULES)[number];
export type DesignRule = (typeof DESIGN_RULES)[number];
export type Rule = ProtocolRule | DesignRule;

/** Every rule, its family and what it checks. */
export const RULES: Record<Rule, { family: Family; description: string }> = {
  "kind-exists": { family: "protocol", description: "The artifact's declared type is a document kind in the catalog or a record type in the data model" },
  "format-allowed": { family: "protocol", description: "The format is one the document kind lists, and one the harness that rendered it can yield" },
  "sections-present": { family: "protocol", description: "The rendered copy exists and has a heading for every section its kind requires" },
  "section-cited": { family: "protocol", description: "Every block of a section cites a record and field the section reads, or is a declared hole" },
  "ladder": { family: "protocol", description: "The rung below exists and a person approved it (EE-218)" },
  "style-filled": { family: "design", description: "Every brand field the kind is styled with is filled in the venture's brand records" },
  "voice-terms": { family: "design", description: "The copy uses no phrase the brand's voice rules avoid" },
  "heading-levels": { family: "design", description: "One title first, and headings step down one level at a time" },
  "length": { family: "design", description: "The copy fits words_per_page times pages of its kind" },
};

/** One artifact as the lint reads it. */
export type LintInput = {
  /** The artifact's logical path in the venture. */
  path: string;
  /** The type it claims. */
  ref: ArtifactRef;
  /** The format a document was rendered in. */
  format?: string;
  /** The person who approved this rung (EE-218). */
  approved_by?: string;
  /** The rendered copy's logical path, and its text: null when the file is missing, undefined when it is not text Naive reads. */
  output?: string;
  text?: string | null;
  role?: string;
  harness?: string;
};

/** What an artifact is checked against. Build it once per venture. */
export type LintContext = {
  model: Pick<DataModel, "records">;
  catalog: DocumentCatalog;
  adapters: Pick<Adapter, "name" | "artifacts">[];
  /** The body of each brand record type a kind's style names, with its logical path; body null when the venture has none. */
  style: Map<string, { path: string; body: unknown }>;
  /** The brand's voice rules. */
  voice: MarketingBrandRule[];
  /** The venture's document artifacts, for the ladder. */
  documents: Document[];
};

/** One finding before the levels apply. */
export type Raw = { rule: Rule; message: string };
/** One finding with its family and severity. */
export type Finding = Raw & { family: Family; severity: "warn" | "error" };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const get = (body: unknown, dotted: string): unknown => dotted.split(".").reduce<unknown>((at, k) => (isObject(at) ? at[k] : undefined), body);
const filled = (v: unknown): boolean =>
  v !== undefined && v !== null && (typeof v === "string" ? v.trim() !== "" : Array.isArray(v) ? v.length > 0 : isObject(v) ? Object.keys(v).length > 0 : true);

type Heading = { level: number; title: string; line: number };
type Block = { lines: string[] };
/** The headings and, under each level-two heading, its blocks split on blank lines. */
function parse(text: string): { headings: Heading[]; sections: Map<string, Block[]> } {
  const headings: Heading[] = [];
  const sections = new Map<string, Block[]>();
  let current: Block[] | null = null, block: string[] = [];
  const flush = () => { if (current && block.length) current.push({ lines: block }); block = []; };
  text.split("\n").forEach((line, i) => {
    const h = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (h) {
      flush();
      headings.push({ level: h[1].length, title: h[2], line: i + 1 });
      current = null;
      if (h[1].length === 2) { current = []; sections.set(h[2], current); }
      return;
    }
    if (line.trim() === "---") { flush(); current = null; return; }
    if (line.trim() === "") flush(); else block.push(line);
  });
  flush();
  return { headings, sections };
}

const HOLE = /^_Not recorded: /;
const WRITER = /^_The writer fills this from `([^`]+)`/;
const SOURCE = /^Source: `([^`]+)`(?: \(`([^`]+)`\))?$/;

type Section = DocumentCatalog["kinds"][number]["sections"][number];

/** The section-cited findings for one section's blocks. */
function citeErrors(s: Section, blocks: Block[]): string[] {
  const out: string[] = [];
  if (s.hole !== undefined) {
    if (!blocks.length || blocks.some((b) => b.lines.some((l) => !HOLE.test(l))))
      out.push(`section ${s.title} is a declared hole and must show only "_Not recorded:", never a fact`);
    return out;
  }
  const from = s.from === undefined ? null : globRegExp(s.from);
  let pending: string | null = null;
  for (const b of blocks) {
    const first = b.lines[0];
    const src = SOURCE.exec(first);
    if (src && b.lines.length === 1) {
      if (pending === null) out.push(`section ${s.title} has a Source line with nothing above it to cite`);
      else if (from && !from.test(src[1])) out.push(`section ${s.title} cites ${src[1]}, which is not a record it reads (${s.from})`);
      else if (s.field && src[2] !== s.field) out.push(`section ${s.title} cites the field ${src[2] ?? "(none)"} of ${src[1]}, not ${s.field}`);
      pending = null;
      continue;
    }
    if (HOLE.test(first)) { if (pending !== null) out.push(`section ${s.title} says "${pending}" and cites no record`); pending = null; continue; }
    const writer = WRITER.exec(first);
    if (writer) {
      if (pending !== null) out.push(`section ${s.title} says "${pending}" and cites no record`);
      if (from && !from.test(writer[1])) out.push(`section ${s.title} cites ${writer[1]}, which is not a record it reads (${s.from})`);
      pending = null;
      continue;
    }
    if (pending !== null) out.push(`section ${s.title} says "${pending}" and cites no record`);
    pending = first.slice(0, 60);
  }
  if (pending !== null) out.push(`section ${s.title} says "${pending}" and cites no record`);
  return out;
}

/** Every finding for one artifact, before the levels apply. Pure. */
export function check(input: LintInput, ctx: LintContext): Raw[] {
  const out: Raw[] = [];
  const add = (rule: Rule, message: string) => out.push({ rule, message });
  const k = artifactKind(input.ref, ctx);
  if (k.kind === "unknown") { add("kind-exists", k.why); return out; }
  if (k.kind === "record-type") return out;
  const kind = kindOf(ctx.catalog, k.document_kind);
  if (!kind) return out;

  // Format: the kind's, and the harness's when one is named.
  const f = input.format === undefined ? null : formatOf(ctx.catalog, input.format);
  if (input.format === undefined) add("format-allowed", `names no format, so its rung cannot be known`);
  else if (!f) add("format-allowed", `is a ${input.format}, which the catalog has no format for`);
  else if (!(kind.formats as string[]).includes(input.format)) add("format-allowed", `is a ${input.format}, which ${kind.id} is not made as (${kind.formats.join(", ")})`);
  if (input.harness !== undefined) {
    const a = ctx.adapters.find((x) => x.name === input.harness);
    if (!a) add("format-allowed", `was rendered by the harness ${input.harness}, which no adapter in packages/naive/src/interfaces/adapters/ names`);
    else if (f && f.renderer === "harness" && !(a.artifacts ?? []).some((x) => (x.formats as string[]).includes(f.id)))
      add("format-allowed", `is a ${f.id}, which the harness ${a.name} lists no artifact for`);
  }

  // Ladder: the rung order and approval as check-documents defines them.
  if (f && input.format !== undefined) {
    const self: Document = { file: input.path, kind: kind.id, format: input.format, approved_by: input.approved_by };
    for (const e of documentLadderErrors(ctx.catalog, self, ctx.documents)) add("ladder", e);
  }

  // Style: every brand field the kind names is filled.
  const missing = new Map<string, string[]>();
  for (const st of kind.style) {
    const rec = ctx.style.get(st.record_type);
    if (!rec || rec.body === null) { missing.set(st.record_type, [...(missing.get(st.record_type) ?? []), st.field]); continue; }
    if (!filled(get(rec.body, st.field))) add("style-filled", `${kind.id} is styled by ${rec.path} ${st.field}, which is empty`);
  }
  for (const [type, fields] of missing) add("style-filled", `${kind.id} is styled by ${ctx.style.get(type)?.path ?? type} (${fields.join(", ")}), which the venture does not have`);

  // The rendered copy: only Markdown is text Naive reads.
  if (input.text === undefined) return out;
  if (input.text === null) { add("sections-present", `has no rendered copy at ${input.output ?? "(no output path)"}, so its sections cannot be shown`); return out; }
  const { headings, sections } = parse(input.text);
  for (const s of kind.sections) if (!s.optional && !sections.has(s.title)) add("sections-present", `has no section ${s.title}, which ${kind.id} requires`);
  for (const [title, blocks] of sections) {
    const s = kind.sections.find((x) => x.title === title);
    if (!s) { if (blocks.length) add("section-cited", `has a section ${title}, which ${kind.id} does not define, so nothing it says is cited`); continue; }
    for (const e of citeErrors(s, blocks)) add("section-cited", e);
  }

  const titles = headings.filter((h) => h.level === 1);
  if (titles.length !== 1 || headings[0]?.level !== 1) add("heading-levels", `should open with one title (#) and has ${titles.length}${headings[0] && headings[0].level !== 1 ? `, after a level ${headings[0].level} heading` : ""}`);
  headings.forEach((h, i) => { if (i && h.level > headings[i - 1].level + 1) add("heading-levels", `line ${h.line}: ${h.title} is a level ${h.level} heading under a level ${headings[i - 1].level}`); });

  if (kind.words_per_page !== undefined) {
    const limit = kind.words_per_page * (kind.pages ?? 1);
    const words = input.text.split("\n").filter((l) => !SOURCE.test(l) && !l.startsWith("> ")).join(" ").split(/\s+/).filter(Boolean).length;
    if (words > limit) add("length", `runs to ${words} words, over the ${limit} of ${kind.pages ?? 1} page${(kind.pages ?? 1) === 1 ? "" : "s"} of ${kind.words_per_page} a ${kind.id} has`);
  }

  for (const hit of voiceCheck(input.text, ctx.voice)) add("voice-terms", `line ${hit.line}: "${hit.found}" is a phrase the voice rule ${hit.rule} avoids${hit.use ? `; use ${hit.use}` : ""}`);
  return out;
}

/** The level of each design rule: artifact_lint.rules in naive.config.json, default warn. */
export function levels(config: NaiveConfig = {}): Record<DesignRule, Level> {
  const set: Record<string, unknown> = config.artifact_lint?.rules ?? {};
  return Object.fromEntries(DESIGN_RULES.map((r) => [r, LEVELS.includes(set[r] as Level) ? set[r] : "warn"])) as Record<DesignRule, Level>;
}

/** Every finding for one artifact with its family and severity; a design rule set off gives none. Pure. */
export function lintArtifact(input: LintInput, ctx: LintContext, lv: Record<DesignRule, Level>): Finding[] {
  return check(input, ctx).flatMap((r): Finding[] => {
    const family = RULES[r.rule].family;
    const severity = family === "protocol" ? "error" : lv[r.rule as DesignRule];
    return severity === "off" ? [] : [{ ...r, family, severity }];
  });
}

/** What check-config.ts says about artifact_lint.rules: an id that is not a design rule, or a level that is not one. */
export function configProblems(rules: unknown): string[] {
  if (rules === undefined) return [];
  if (!isObject(rules)) return ["artifact_lint.rules must be an object of rule ids to off, warn or error"];
  const out: string[] = [];
  for (const [id, level] of Object.entries(rules)) {
    if ((PROTOCOL_RULES as readonly string[]).includes(id)) out.push(`artifact_lint.rules.${id}: a protocol rule is always an error and cannot be set`);
    else if (!(DESIGN_RULES as readonly string[]).includes(id)) out.push(`artifact_lint.rules.${id}: no such design rule (one of ${DESIGN_RULES.join(", ")})`);
    else if (!LEVELS.includes(level as Level)) out.push(`artifact_lint.rules.${id}: ${JSON.stringify(level)} is not off, warn or error`);
  }
  return out;
}

/** One artifact's findings as log lines. */
export const toLines = (input: LintInput, findings: Finding[], at: string): LintFinding[] => findings.map((f) => ({
  at, lint: "artifact", rule: f.rule, family: f.family, severity: f.severity, message: `${input.path} ${f.message}`,
  artifact: input.path, kind: input.ref.document_kind ?? input.ref.record_type ?? "",
  ...(input.role ? { role: input.role } : {}), ...(input.harness ? { harness: input.harness } : {}),
}));

/** The venture's artifacts and what they are checked against, read through VentureFs. naive role check reads them too. */
export const readArtifacts = (dir: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const model = readDataModel() as DataModel;
  const catalog = readCatalog();
  const folder = ventureFile(dir, "artifacts");
  const records: { file: string; a: Artifact }[] = [];
  for (const name of (yield* fs.list(folder)).filter((n) => n.endsWith(".json"))) {
    const body = yield* readJson(join(folder, name)).pipe(Effect.orElseSucceed(() => null));
    if (isObject(body)) records.push({ file: `artifacts/${name}`, a: body as Artifact });
  }
  const style = new Map<string, { path: string; body: unknown }>();
  for (const id of new Set(catalog.kinds.flatMap((k) => k.style.map((s) => s.record_type)))) {
    const path = venturePaths(model.records.find((r) => r.id === id)).find((p) => !p.includes("*"));
    if (!path) continue;
    const file = ventureFile(dir, path);
    style.set(id, { path, body: (yield* fs.exists(file)) ? yield* readJson(file).pipe(Effect.orElseSucceed(() => null)) : null });
  }
  const brand = style.get("marketing-brand")?.body as MarketingBrand | null | undefined;
  const typed = records.filter((r) => typeof r.a.document_kind === "string");
  const inputs: LintInput[] = [];
  for (const { file, a } of typed) {
    const rung = a.format ? formatOf(catalog, a.format)?.rung : undefined;
    const output = a.output?.path ?? (rung && a.document_kind ? outputPath(a.document_kind, rung, "md") : undefined);
    const text = a.format !== "md" ? undefined : output && (yield* fs.exists(ventureFile(dir, output))) ? yield* fs.readText(ventureFile(dir, output)) : null;
    inputs.push({ path: file, ref: { document_kind: a.document_kind as string }, format: a.format, approved_by: a.approved_by, output, text, role: a.role, harness: a.harness });
  }
  const documents: Document[] = typed.filter((r) => typeof r.a.format === "string").map((r) => ({ file: r.file, kind: r.a.document_kind as string, format: r.a.format as string, approved_by: r.a.approved_by }));
  const ctx: LintContext = { model, catalog, adapters: readAdapters(), style, voice: brand?.voice?.rules ?? [], documents };
  return { inputs, ctx, skipped: records.length - typed.length };
});

/** Lints every artifact the venture holds and appends every finding to the log. */
export const lintVenture = (dir: string, { at = new Date().toISOString(), config }: { at?: string; config?: NaiveConfig } = {}) => Effect.gen(function* () {
  const { inputs, ctx, skipped } = yield* readArtifacts(dir);
  const lv = levels(config ?? readConfig(dir));
  const results = inputs.map((input) => ({ input, findings: lintArtifact(input, ctx, lv) }));
  const lines = results.flatMap((r) => toLines(r.input, r.findings, at));
  yield* appendFindings(ventureFile(dir, LOG), lines);
  return { artifacts: inputs.length, skipped, findings: lines, errors: lines.filter((l) => l.severity === "error").length };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const dir = argv.find((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: node packages/naive/src/checks/artifact-lint.ts <venture dir> [--json]"); process.exit(2); }
  await runMain(Effect.map(lintVenture(dir), (r) => {
    if (argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
    else {
      for (const f of r.findings) console.log(`${f.severity.padEnd(5)}  ${(f.family ?? "").padEnd(8)} ${f.rule.padEnd(16)} ${f.message}`);
      console.log(`${r.artifacts} artifact${r.artifacts === 1 ? "" : "s"} linted${r.skipped ? `, ${r.skipped} with no declared type skipped` : ""}: ${r.errors} error(s), ${r.findings.length - r.errors} warning(s), logged to ${LOG}`);
    }
    process.exitCode = r.errors ? 1 : 0;
  }));
}
