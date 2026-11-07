// Checks each venture's traces (<venture>/traces/<session>.jsonl, EE-121), one span per line after the
// OpenTelemetry GenAI semantic conventions.
//   errors: a line that is not JSON; a broken chain (a line's prev is not the hash of the line before, or
//     its hash does not match its content), which means a line was edited, removed or reordered; a span
//     with no trace id, span id, name, start or end, or a kind or status outside the schema; a span id used
//     twice in one file; a span that ends before it starts; inputs or outputs kept in a venture that has not
//     turned traces.content on; a provenance line that names a span no trace file holds.
//   warnings: a span whose parent is in no trace file of the venture (it may have been written by another
//     process that has not flushed yet); an agent's provenance line with no span, in a venture with traces on.
// The schema of each line is checked by packages/naive/src/records/validate.mjs.
//
//   node packages/naive/src/checks/check-traces.ts <workspace or venture dir>

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SPAN_KINDS, sessions, spanHash, traceFile, tracing } from "../core/instrumentation.mjs";
import { LOG } from "../core/provenance.mjs";
import { ventureFile } from "../core/venture-paths.mjs";
import type { ProvenanceEntry, TraceSpan } from "../records/types/records.d.ts";

const CONTENT = /^(gen_ai\.(input|output)\.messages|gen_ai\.system_instructions|gen_ai\.tool\.call\.(arguments|result)|naive\.(input|output))$/;

export interface Report { files: number, spans: number, errors: string[], warnings: string[] }

/** Checks one venture's trace files and their links from its provenance log. */
export function checkVenture(root: string, label = root): Report {
  const errors: string[] = [], warnings: string[] = [];
  const all = new Set<string>();
  const parents: { where: string, parent: string }[] = [];
  const { on, content } = tracing(root);
  let files = 0, count = 0;
  for (const session of sessions(root)) {
    files++;
    let prev: string | null = "genesis";
    const seen = new Set<string>();
    readFileSync(traceFile(root, session), "utf8").split("\n").forEach((l, i) => {
      if (!l.trim()) return;
      const where = `${label}/traces/${session}.jsonl:${i + 1}`;
      let s: TraceSpan;
      try { s = JSON.parse(l) as TraceSpan; } catch { errors.push(`${where}: not JSON`); prev = null; return; }
      count++;
      if (prev !== null && s.prev !== prev) errors.push(`${where}: chain broken: prev does not match the line before (a line was edited, removed or reordered)`);
      if (s.hash !== spanHash(s.prev, s)) errors.push(`${where}: hash does not match the line's content (the line was edited)`);
      for (const k of ["trace_id", "span_id", "name", "start", "end"] as const) if (!s[k]) errors.push(`${where}: no ${k}`);
      if (!SPAN_KINDS.includes(s.kind)) errors.push(`${where}: kind ${String(s.kind)} is not one of ${SPAN_KINDS.join(", ")}`);
      if (s.status !== "ok" && s.status !== "error") errors.push(`${where}: status is ok or error, not ${String(s.status)}`);
      if (s.start && s.end && Date.parse(s.end) < Date.parse(s.start)) errors.push(`${where}: ends before it starts`);
      if (s.span_id && seen.has(s.span_id)) errors.push(`${where}: span ${s.span_id} appears twice in this file`);
      if (s.span_id) { seen.add(s.span_id); all.add(s.span_id); }
      if (!content) for (const k of Object.keys(s.attributes ?? {})) if (CONTENT.test(k)) errors.push(`${where}: keeps ${k}, but traces.content is not on`);
      if (s.parent_span_id) parents.push({ where, parent: s.parent_span_id });
      prev = s.hash;
    });
  }
  for (const p of parents) if (!all.has(p.parent)) warnings.push(`${p.where}: parent span ${p.parent} is in no trace file`);
  const log = ventureFile(root, LOG);
  if (existsSync(log)) {
    readFileSync(log, "utf8").split("\n").forEach((l, i) => {
      if (!l.trim()) return;
      let e: ProvenanceEntry;
      try { e = JSON.parse(l) as ProvenanceEntry; } catch { return; }
      const where = `${label}/${LOG}:${i + 1}`;
      if (e.span && !all.has(e.span.span_id)) errors.push(`${where}: names span ${e.span.span_id}, which no trace file holds`);
      if (!e.span && on && e.agent?.kind === "agent") warnings.push(`${where}: an agent's write with no span`);
    });
  }
  return { files, spans: count, errors, warnings };
}

const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node packages/naive/src/checks/check-traces.ts <workspace or venture dir>"); process.exit(2); }
  let files = 0, count = 0;
  const errors: string[] = [], warnings: string[] = [];
  for (const root of walk(dir)) {
    const r = checkVenture(root, root);
    files += r.files; count += r.spans; errors.push(...r.errors); warnings.push(...r.warnings);
  }
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log(`${files} trace files, ${count} spans: every chain holds and every linked span is there.`);
}
