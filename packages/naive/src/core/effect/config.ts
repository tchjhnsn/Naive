// naive.config.json as an Effect service (EE-125, phase 3 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md).
// Code that needs a venture's config asks for NaiveConfig and calls `read(dir)` instead of reading the file. The
// default layer, NaiveConfigFile, reads <venture>/naive.config.json through VentureFs, so a MemoryFs test sees its
// own files. NaiveConfigOf gives fixed configs by folder, for a test or a host that keeps the config elsewhere.
// It returns the file as written: the engine's configFor puts it over the defaults. Overrides from NAIVE_*
// environment variables are not built.
import { Context, Effect, Layer } from "effect";
import type { NaiveConfig as NaiveConfigRecord } from "../../records/types/records.d.ts";
import { ventureFile } from "../venture-paths.ts";
import { type IoError, ParseError } from "./errors.ts";
import { VentureFs } from "./fs.ts";

/** The config file's name in a venture. */
export const CONFIG_FILE = "naive.config.json";

export type NaiveConfigShape = {
  /** The venture's naive.config.json as written, or {} when it has none. A file that is not JSON fails with ParseError. */
  readonly read: (dir: string) => Effect.Effect<NaiveConfigRecord, IoError | ParseError>;
};

/** The config service. Yield it inside Effect.gen: `const config = yield* NaiveConfig`. */
export const NaiveConfig = Context.Service<"naive/NaiveConfig", NaiveConfigShape>("naive/NaiveConfig");

/** The default layer: each venture's naive.config.json, read through VentureFs. */
export const NaiveConfigFile: Layer.Layer<"naive/NaiveConfig", never, "naive/VentureFs"> = Layer.effect(NaiveConfig, Effect.gen(function* () {
  const fs = yield* VentureFs;
  return {
    read: (dir) => Effect.gen(function* () {
      const path = ventureFile(dir, CONFIG_FILE);
      if (!(yield* fs.exists(path))) return {};
      const text = yield* fs.readText(path).pipe(Effect.catchTag("NotFound", () => Effect.succeed("{}")));
      // The parse boundary: the shape is checked against naive-config.schema.json by check-config, not here, so a
      // file that parses is returned as written, as the engine always read it.
      return yield* Effect.try({ try: () => JSON.parse(text) as NaiveConfigRecord, catch: (cause) => new ParseError({ path, cause }) });
    }),
  };
}));

/** Fixed configs by venture folder, for tests and hosts. A folder not listed has no config ({}). */
export const NaiveConfigOf = (configs: Record<string, NaiveConfigRecord>): Layer.Layer<"naive/NaiveConfig"> =>
  Layer.succeed(NaiveConfig, { read: (dir) => Effect.succeed(structuredClone(configs[dir] ?? {})) });

/** The config of one venture, through whichever layer is provided. */
export const configOf = (dir: string): Effect.Effect<NaiveConfigRecord, IoError | ParseError, "naive/NaiveConfig"> =>
  Effect.gen(function* () { return yield* (yield* NaiveConfig).read(dir); });
