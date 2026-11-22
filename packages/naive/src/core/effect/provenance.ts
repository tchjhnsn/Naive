// Provenance as a service (EE-161, phase 7). The provenance log (core/provenance.ts) is already written as Effects
// over VentureFs; this names it as a service a venture's layer provides, so a host can put the log elsewhere and an
// Effect asks for `Provenance` rather than calling the module. ProvenanceLog is the file log over the VentureFs it is
// given: NodeFs on disk, MemoryFs in a test (the memory log). The plain `record` and `entries` exports keep working
// as before; callers move onto the service with the router's writes in phase 8.
import { Context, Effect, Layer } from "effect";
import type { IoError, NotFound, ParseError } from "./errors.ts";
import { VentureFs } from "./fs.ts";
import { entriesEffect, type Entry, type RecordInput, recordEffect } from "../provenance.ts";

export type ProvenanceShape = {
  /** Appends one line for a write to `dir`'s log (blob first, chained under the lock) and returns it. */
  readonly record: (dir: string, input: RecordInput) => Effect.Effect<Entry, IoError | NotFound | ParseError>;
  /** `dir`'s log, oldest first. */
  readonly entries: (dir: string) => Effect.Effect<Entry[], IoError | ParseError>;
};

export const Provenance = Context.Service<"naive/Provenance", ProvenanceShape>("naive/Provenance");

/** The file log, over the VentureFs this layer is given. */
export const ProvenanceLog: Layer.Layer<"naive/Provenance", never, "naive/VentureFs"> = Layer.effect(Provenance, Effect.gen(function* () {
  const fs = yield* VentureFs;
  return {
    record: (dir, input) => Effect.provideService(recordEffect(dir, input), VentureFs, fs),
    entries: (dir) => Effect.provideService(entriesEffect(dir), VentureFs, fs),
  };
}));

/** Records one write through the Provenance in scope. */
export const recordProvenance = (dir: string, input: RecordInput): Effect.Effect<Entry, IoError | NotFound | ParseError, "naive/Provenance"> =>
  Effect.gen(function* () { return yield* (yield* Provenance).record(dir, input); });
