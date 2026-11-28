// naive render (EE-218): write a document's reading copy from the records the catalog says it is made of, and say
// what to do for every other format.
//
//   node packages/naive/src/engine/render-document.ts <venture dir> [<document kind>] [--format md|pdf|docx|pptx|html|site] [--json]
//
//   naive render                     the catalog: every kind, its formats, the rung it climbs to and why
//   naive render one-pager           writes artifacts/one-pager-reading-copy.md and its artifact record
//   naive render one-pager --format pdf
//                                    does not render: prints what the harness must do, because the heavy format
//                                    renderers are the harness's (its adapter names the skill), not Naive's
//
// The reading copy is Markdown, rendered in house, so the framework carries no document dependency. Every section
// cites the record it came from; a record that is missing is shown as missing and never filled in.
//
// It fails closed on the ladder: a format above the reading copy is refused until the rung below it is a live
// artifact a person approved, and the live rung also needs what the catalog's rung requires (EE-217). Rendering is
// the agent's work; approving is a person's, through the gate, and this command never approves.

import { createHash } from "node:crypto";
import { Effect } from "effect";
import { Refused } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { runMain } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { artifactPath, catalog, climbTo, kind, outputPath, prerequisites, rung, format as formatOf, renderMarkdown, type Requires } from "./documents.ts";
import { decisionFiles } from "./decisions.ts";
import { gatherFacts, judge, requirementsIn } from "./prerequisites.ts";
import type { Artifact, DocumentCatalog } from "../records/types/records.d.ts";
import { writeRecordEffect, programWriter } from "../store/record-write.ts";

/** What a render produced, or what stands in its way. */
export type Rendered = { kind: string; rung: string; format: string; output?: string; record?: string; instructions: string[] };

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const dir = (path: string) => path.replace(/\/[^/]*$/, "");

/** Every record matching a section's `from`: one for a plain path, all of them for a path with *. */
const readSection = (venture: string, from: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  if (!from.includes("*")) {
    const file = ventureFile(venture, from);
    if (!(yield* fs.exists(file))) return [];
    return [{ path: from, body: yield* readJson(file) }];
  }
  const [folder, tail] = [dir(from), from.slice(dir(from).length + 1)];
  const suffix = tail.replace(/^\*/, "");
  const names = (yield* fs.list(ventureFile(venture, folder))).filter((n) => n.endsWith(suffix) && n !== suffix);
  const out: { path: string; body: unknown }[] = [];
  for (const name of names) out.push({ path: `${folder}/${name}`, body: yield* readJson(ventureFile(venture, `${folder}/${name}`)) });
  return out;
});

/**
 * The requirements of a rung that this venture does not meet yet, each as one line. `below` is the artifact record of
 * the rung below, which must exist and carry a person's approved_by; every other required record need only be there.
 */
const unmet = (venture: string, kindId: string, below: string | null, needs: Requires) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const out: string[] = [];
  for (const path of needs.records) {
    if (!(yield* fs.exists(ventureFile(venture, path)))) {
      out.push(path === below ? `${path} is missing: the rung below has not been rendered` : `${path} is missing`);
      continue;
    }
    if (path !== below) continue;
    const body = yield* readJson(ventureFile(venture, path)).pipe(Effect.orElseSucceed(() => null));
    if (typeof (body as Artifact | null)?.approved_by !== "string")
      out.push(`${path} has no approved_by: a person approves the rung below before this one is built`);
  }
  // Meetings are judged as every workflow's are (EE-217): closed with the goal reached, or it blocks.
  if (needs.meetings.length) {
    const reqs = requirementsIn({ meetings: needs.meetings });
    for (const m of judge(reqs, yield* gatherFacts(venture, reqs)).missing) out.push(m.why);
  }
  // A decision is required by class: a decided decision of that class that names one of this document's artifacts.
  // A decision about another document unlocks nothing here, and a file that cannot be read counts as not decided.
  if (needs.decisions.length) {
    const mine = `artifacts/${kindId}-`;
    const decided = new Set<string>();
    const files = yield* Effect.orElseSucceed(Effect.try(() => decisionFiles(venture)), () => [] as string[]);
    for (const f of files) {
      const d = (yield* readJson(ventureFile(venture, f)).pipe(Effect.orElseSucceed(() => null))) as { status?: string; class?: string; applies_to?: { file?: string }[] } | null;
      if (d?.status === "decided" && typeof d.class === "string" && (d.applies_to ?? []).some((t) => t?.file?.startsWith(mine))) decided.add(d.class);
    }
    for (const d of needs.decisions) if (!decided.has(d))
      out.push(`no decided decision of class ${d} names an artifact of ${kindId} (applies_to ${mine}...): raise it, and a person decides it`);
  }
  return out;
});

/** Renders one document kind in one format, or refuses with what stands in the way. */
export const render = (venture: string, kindId: string, want: string, { now = new Date().toISOString() }: { now?: string } = {}) =>
  Effect.gen(function* () {
    const fs = yield* VentureFs;
    const c: DocumentCatalog = catalog();
    const k = kind(c, kindId);
    if (!k) return yield* Effect.fail(new Refused({ rule: "unknown-document-kind", message: `no document kind ${kindId}`, hint: `the catalog has ${c.kinds.map((x) => x.id).join(", ")}; a new kind is a pull request against packages/naive/src/functions/documents.json` }));
    if (!k.formats.includes(want as Artifact["format"] & string)) return yield* Effect.fail(new Refused({ rule: "format-not-for-kind", message: `${k.title} is not made as ${want}`, hint: `It is made as ${k.formats.join(", ")} only, because ${k.why_format.charAt(0).toLowerCase()}${k.why_format.slice(1)}` }));
    const f = formatOf(c, want);
    const r = f ? rung(c, f.rung) : null;
    if (!f || !r) return yield* Effect.fail(new Refused({ rule: "unknown-format", message: `the catalog has no format ${want}`, hint: `formats are ${c.formats.map((x) => x.id).join(", ")}` }));
    if (!climbTo(c, k.highest_rung).some((x) => x.id === r.id))
      return yield* Effect.fail(new Refused({ rule: "rung-above-kind", message: `${k.title} does not climb to ${r.id}`, hint: `${k.id} stops at ${k.highest_rung}` }));

    const below = climbTo(c, r.id).at(-2);
    const blocked = yield* unmet(venture, k.id, below ? artifactPath(k.id, below.id) : null, prerequisites(c, k.id, r.id));
    if (blocked.length) return yield* Effect.fail(new Refused({ rule: "ladder-order", message: `${k.title} cannot be built as ${want} yet: ${blocked.join("; ")}`, hint: `${c.ladder.note} Render the rung below first with naive render ${k.id}.` }));

    // Only the reading copy is rendered here. Every other format is the harness's, so this prints its instructions.
    if (f.renderer !== "naive")
      return { kind: k.id, rung: r.id, format: want, instructions: [
        `${k.title} as ${f.name} is the harness's to render, not Naive's: ${f.why}`,
        `Read the approved reading copy at ${outputPath(k.id, climbTo(c, r.id).at(-2)?.id ?? "reading-copy", "md")} and build the ${want} from it, changing no fact.`,
        f.renderer === "site-build" ? "Publishing is naive publish, under the gate a person approves (EE-025)." : "Your harness adapter names the skill for this format; use it and nothing heavier.",
        `Then give it to a person. Only a person approves a rung (${r.approved_by}).`,
      ] } satisfies Rendered;

    // Read every section's records once, then render from what was read, so the document cites exactly those bytes.
    const found = new Map<string, { path: string; body: unknown }[]>();
    for (const s of k.sections) if (!found.has(s.from)) found.set(s.from, yield* readSection(venture, s.from));
    const md = renderMarkdown(c, k.id, (from) => found.get(from) ?? [], { at: now });
    const cited = new Map([...found.values()].flat().map((s) => [s.path, s.body] as const));

    const out = outputPath(k.id, r.id, "md");
    const agent = programWriter("naive-render");
    yield* writeRecordEffect(venture, out, md, { agent, note: `naive render ${k.id}: the ${r.id}` });
    const record: Artifact = {
      id: `${k.id}-${r.id}`,
      kind: k.artifact_kind,
      title: k.title,
      audience: k.audience.join(", "),
      document_kind: k.id,
      format: "md",
      built_at: now,
      built_from: cited.size
        ? [...cited].map(([path, body]) => ({ record: path, sha256: sha(JSON.stringify(body)) }))
        : [{ record: "venture.json" }],
      output: { path: out, sha256: sha(md) },
    };
    const file = artifactPath(k.id, r.id);
    yield* writeRecordEffect(venture, file, record, { agent, derived_from: [...cited.keys()], note: `naive render ${k.id}: the artifact record of the ${r.id}` });
    return { kind: k.id, rung: r.id, format: want, output: out, record: file, instructions: [
      `Wrote ${out}, the reading copy, and ${file}, the artifact record naming every record it cites.`,
      "Read it end to end, then approve it as a person. No rung above it is built until you have.",
    ] } satisfies Rendered;
  });

/** The catalog as a person reads it: every kind, what it is for, its formats and the rung it climbs to. */
export const list = (): string[] => {
  const c = catalog();
  const out = [c.note ?? "", "", "Kinds:"];
  for (const k of c.kinds) out.push(`  ${k.id.padEnd(14)} ${k.formats.join(", ").padEnd(18)} to ${k.highest_rung.padEnd(12)} ${k.purpose}`);
  out.push("", "Rules:");
  for (const r of c.rules) out.push(`  ${r.when} -> ${r.then.join(", ")}${r.not?.length ? ` (not ${r.not.join(", ")})` : ""}`);
  out.push("", `Ladder: ${c.ladder.rungs.map((r) => r.id).join(" then ")}. ${c.ladder.note}`);
  return out;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const plain = args.filter((a, i) => !a.startsWith("--") && !["--format"].includes(args[i - 1] ?? ""));
  const [venture, kindId] = plain;
  if (!venture) { console.error("usage: node packages/naive/src/engine/render-document.ts <venture dir> [<document kind>] [--format md] [--json]"); process.exitCode = 2; }
  else if (!kindId) { const lines = list(); console.log(json ? JSON.stringify({ catalog: catalog() }, null, 2) : lines.join("\n")); }
  else await runMain(Effect.map(render(venture, kindId, flag("format") ?? "md"), (r) => {
    if (json) console.log(JSON.stringify(r, null, 2));
    else for (const line of r.instructions) console.log(line);
  }));
}
