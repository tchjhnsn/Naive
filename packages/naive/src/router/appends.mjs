// The router's append action: one line added to the end of a log route, such as the detection ledger
// (governance/detector-trial/<detector>, docs/design/SIGNAL_DETECTION_2026-11-07.md). Only the routes the route table
// gives an append action take one (APPENDS in packages/naive/src/records/routes/routes.mjs).
//
//   input   { line, base? }   line: the line without prev and hash; base: the log's version the caller read,
//                             or null for a log it believes is new
//
// The router chains the line: prev is the hash of the log's last line (genesis for the first) and hash is
// lineHash(prev, line), as provenance.jsonl does. The chained line is checked against the record's schema
// before anything is written. The connector appends it with the version the router read as base, so a line
// that another writer added in between is never skipped: without a caller's base the router reads again and
// re-chains, and with one it refuses with the current version so the caller can check again and retry. A line
// whose id the log already holds is refused. The gate's verdict applies: a refusal stops the line, and a rule
// that would hold it as a draft refuses it too, because a log line cannot wait while the chain moves on. Every
// appended line is a provenance entry. It never calls a model.

import { createHash } from "node:crypto";
import { lineHash, record as prov } from "../core/provenance.mjs";
import { address } from "../store/connectors/contract.mjs";
import { schemaNameOf } from "../records/index.mjs";
import { validateValue } from "../records/validate.mjs";
import { gateWrite } from "./gate-hooks.mjs";

const RETRIES = 200;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const pause = () => new Promise((ok) => setTimeout(ok, 1 + Math.random() * 10));
const message = (e) => String(/** @type {Error} */ (e)?.message ?? e);

/** The lines of a JSON lines log, in order. Throws on a line that does not parse. @param {string} text */
export const linesOf = (text) => text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

/**
 * Appends one line to a log route. Returns { ok, result: { appended, line, version, provenance } }, or
 * { ok: false, error, conflict?: { current } } when the caller's base is stale.
 * @param {{ dir: string, r: Record<string, any>, id?: string, route: string, requested: string, file: string, input: *, actor: string, actor_id?: string,
 *   provenance?: { derived_from?: string[], decision?: string, note?: string, confidence?: number | string | null }, store: *, src: { id: string, connector?: string }, agent: Record<string, any>, remote: boolean }} a
 */
export async function appendLine({ dir, r, id, route, requested, file, input, actor, actor_id, provenance = {}, store, src, agent, remote }) {
  const line = input?.line;
  if (!line || typeof line !== "object" || Array.isArray(line)) return { ok: false, error: "append needs one line, as input.line" };
  const pinned = !!input && Object.hasOwn(input, "base");
  if (pinned && input.base !== null && typeof input.base !== "string") return { ok: false, error: "base is the log's version you read, or null for a new log" };
  if (r.record === "detector-trial" && id && line.detector !== id) return { ok: false, error: `${route} is the ledger of detector ${id}, not ${line.detector}` };
  if (store.writes !== "direct") return { ok: false, error: `${route} lives in ${src.id}, which ${store.writes === "none" ? "is read-only" : "takes writes by pull request, so no line can be appended there"}` };
  // Gate group hook (X-1 to X-6): the venture's gate decides on a line as on any write.
  const verdict = remote ? null : gateWrite({ dir, r, route, requested, file, actor, actor_id, provenance, gate: null });
  if (verdict) return { ok: false, gate_rule: verdict.rule, error: verdict.then === "refuse" ? verdict.why : `gate rule ${verdict.rule} (${verdict.source}) would hold this line as a draft, and a log line cannot wait while the chain moves on: nothing was appended` };
  const conflict = (current) => ({ ok: false, conflict: { current }, error: `${file} changed since version ${input.base ?? "(none)"}: it is ${current ?? "missing"} now; read it again and retry` });
  for (let i = 0; ; i++) {
    let cur;
    try { cur = await store.read(file); } catch (e) { return { ok: false, error: `${src.id}: ${message(e)}` }; }
    const version = cur?.version ?? null;
    if (pinned && input.base !== version) return conflict(version);
    let lines;
    try { lines = cur ? linesOf(cur.content) : []; } catch (e) { return { ok: false, error: `${file} holds a line that does not parse, so nothing was appended: ${message(e)}` }; }
    if (line.id !== undefined && lines.some((l) => l?.id === line.id)) return { ok: false, error: `${file} already holds a line ${line.id}` };
    const last = lines.at(-1);
    if (last && typeof last.hash !== "string") return { ok: false, error: `${file} ends in a line with no hash, so a new line cannot chain onto it` };
    const prev = last ? last.hash : "genesis";
    const { hash: _hash, prev: _prev, ...rest } = line;
    const chained = { ...rest, prev };
    chained.hash = lineHash(prev, chained);
    const v = validateValue(schemaNameOf(r.schema), chained);
    if (v.status !== 0) return { ok: false, error: `does not match ${r.schema}:\n${(v.stdout + v.stderr).trim()}` };
    const text = JSON.stringify(chained) + "\n";
    let w;
    try { w = await store.write(file, text, { append: true, base: version, message: `${route}: appended ${chained.id ?? "a line"}`, title: `Mentura: ${route}` }); }
    catch (e) {
      if (/** @type {{ code?: string }} */ (e)?.code === "version-conflict") {
        if (pinned) return conflict(/** @type {{ current?: string | null }} */ (e).current ?? null);
        if (i < RETRIES) { await pause(); continue; }
      }
      return { ok: false, error: `${src.id}: ${message(e)}` };
    }
    const entity = remote ? address(src.id, file) : file;
    const entry = prov(dir, { entity, route, activity: "write", agent, derived_from: provenance.derived_from, decision: provenance.decision,
      note: provenance.note ?? `appended ${chained.kind ?? "line"} ${chained.id ?? ""}`.trim(), sha256: sha((cur?.content ?? "") + text),
      ...(remote ? { source: { id: src.id, connector: src.connector, version: w.version } } : {}) });
    return { ok: true, result: { appended: entity, line: chained, version: w.version, provenance: entry.hash } };
  }
}
