// The one way code outside the router writes a venture's record (the direct-writes design of 2026-11-27, shape A).
//
// The router is the door where a write meets the gate. Code in the engine and the function modules may not import
// the router, because a unit imports only the units before it, so that code wrote files itself: some with a
// provenance line added by hand, some with none, and none checked against a schema. writeRecord is what such code
// calls instead. It does three things and nothing else:
//
//   1. checks the value against the schema of the record type its path belongs to, and writes nothing when it fails;
//   2. writes the file where the venture's layout puts that logical path;
//   3. appends the provenance line, which stores the bytes so an as-of read can return them.
//
// It does not run the gate, the one-writer rule or agent reach. Those are the router's, and a module that needs
// them moves its write to packages/naive/src/router/orchestration/. packages/naive/src/checks/check-direct-writes.ts
// fails when code outside the router writes a file any other way and is not on its list.

import { Effect } from "effect";
import { SchemaInvalid, type IoError, type NotFound, type ParseError } from "../core/effect/errors.ts";
import { VentureFs } from "../core/effect/fs.ts";
import { runSync } from "../core/effect/run.ts";
import { actingAgent, agentFromEnv, recordEffect, type Entry, type EntryAgent, type RecordInput } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { globRegExp, readDataModel, schemaNameOf, venturePaths } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";

/**
 * What a caller says about the write: who made it, what kind of act it was, and anything else a provenance line keeps
 * (route, note, decision, derived_from, statement, source, override). The writer supplies the entity and the bytes.
 */
export type WriteInput = Omit<RecordInput, "entity" | "content" | "sha256" | "activity" | "agent"> & {
  /** Who is writing. Required: a line with no author is the hole this module closes. */
  agent: EntryAgent;
  /** The provenance activity, "write" when left out. A caller names what it did: write or create. */
  activity?: string;
};

/**
 * Who this process says is writing, for a caller with no better answer: the acting agent when the environment names
 * one, else a person, named by `by` when the caller knows the name. It is what the environment says, not a signed identity.
 */
export function writerFromEnv(via: string, by?: string): EntryAgent {
  return actingAgent(by) ? agentFromEnv("agent", via) : agentFromEnv("person", via, by ? { id: by } : {});
}

/**
 * The author of a record a program made: a template init copies, a document rendered from records, a computed day of
 * activity, a score. It is an agent named for the program, or the acting agent when the environment names one, and
 * never a person: a line by a person says a person confirmed the record, and nobody has.
 */
export function programWriter(id: string, via = "cli"): EntryAgent {
  return actingAgent() ? agentFromEnv("agent", via) : agentFromEnv("agent", via, { id });
}

/**
 * The record type a logical path belongs to, with the schema that governs it, or null when no record type claims it.
 * When two types' patterns match (operations/activity/*.json and operations/activity/_summary.json), the pattern
 * with the most literal characters wins, so a named file is never judged by the schema of the folder around it.
 */
export function recordTypeAt(logical: string): { id: string; schema: string | null } | null {
  let best: { id: string; schema: string | null; literal: number } | null = null;
  for (const r of readDataModel().records) {
    if (r.level !== "venture") continue;
    for (const p of venturePaths(r)) {
      if (!globRegExp(p).test(logical)) continue;
      const literal = p.replace(/\*/g, "").length;
      if (!best || literal > best.literal) best = { id: r.id, schema: r.schema ? schemaNameOf(r.schema) : null, literal };
    }
  }
  return best ? { id: best.id, schema: best.schema } : null;
}

/**
 * Writes one record, or one file a record names, and logs it. `value` is the record itself (written as JSON with a
 * trailing newline, the way every Naive record is written) or the text of a file that is not JSON. A value that does
 * not match its record type's schema fails with SchemaInvalid and nothing is written or logged.
 */
export const writeRecordEffect = (dir: string, logical: string, value: unknown, input: WriteInput): Effect.Effect<Entry, SchemaInvalid | IoError | NotFound | ParseError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const text = typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`;
  const type = typeof value === "string" ? null : recordTypeAt(logical);
  if (type?.schema) {
    const r = validateValue(type.schema, value);
    if (r.status !== 0) {
      const errors = (r.stdout || r.stderr).trim().split("\n").filter(Boolean);
      return yield* Effect.fail(new SchemaInvalid({ schema: type.schema, errors }));
    }
  }
  yield* fs.writeText(ventureFile(dir, logical), text);
  const { activity = "write", ...rest } = input;
  return yield* recordEffect(dir, { entity: logical, activity, content: text, ...rest });
});

/** writeRecordEffect, run now. Throws what the Effect fails with. */
export const writeRecord = (dir: string, logical: string, value: unknown, input: WriteInput): Entry => runSync(writeRecordEffect(dir, logical, value, input));
