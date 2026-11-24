// The venture runtime (EE-161). A venture's services come from one layer, VentureLayer, and are built once into a
// ManagedRuntime, ventureRuntime, that an entry point runs every Effect through: built on first use, shared by
// every run after, and released by `dispose()`, after which it refuses to run. The services so far are VentureFs
// (NodeFs by default, MemoryFs in tests), NaiveConfig (naive.config.json read through VentureFs, or fixed
// configs in tests), Provenance (the provenance log through that VentureFs, so MemoryFs gives a memory log), HostRuntime (laptop or hosted, with the host's hooks), Judge (the host's judge hook or
// NAIVE_JUDGE_CMD, over that HostRuntime) and Effect's Tracer, NaiveTracer for `dir` (core/effect/tracer.ts),
// which writes every Effect span to the venture's trace files when traces are on. The other services in docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md
// join the layer one phase at a time, and those that read the venture's files read under `dir`, so callers that
// pass it now do not change when they arrive.
import { Layer, ManagedRuntime, Tracer } from "effect";
import { NaiveConfigFile } from "./config.ts";
import { HostRuntimeLive, JudgeLive } from "./host.ts";
import { NodeFs } from "./fs.ts";
import { naiveTracer } from "./tracer.ts";
import { ProvenanceLog } from "./provenance.ts";

/** The services a venture's Effects may ask for. It grows as services join the layer. */
export type VentureServices = "naive/VentureFs" | "naive/NaiveConfig" | "naive/Provenance" | "naive/HostRuntime" | "naive/Judge";

/** A layer per service that replaces the default one, for a test or a host. */
export type VentureOverrides = {
  readonly fs?: Layer.Layer<"naive/VentureFs">;
  readonly config?: Layer.Layer<"naive/NaiveConfig", never, "naive/VentureFs">;
  readonly provenance?: Layer.Layer<"naive/Provenance", never, "naive/VentureFs">;
  readonly host?: Layer.Layer<"naive/HostRuntime">;
  readonly judge?: Layer.Layer<"naive/Judge", never, "naive/HostRuntime">;
  /** The tracer Effect spans go to: NaiveTracer for `dir` by default, which writes them to its trace files. */
  readonly tracer?: Tracer.Tracer;
};

/** The layer of a venture's services: each override where one is given, else the default. NaiveConfig reads through
 *  the VentureFs chosen here, so a MemoryFs test sees its own naive.config.json, and Judge asks through the
 *  HostRuntime chosen here. */
export const VentureLayer = (dir: string, overrides: VentureOverrides = {}): Layer.Layer<VentureServices> =>
  Layer.mergeAll(
    Layer.provideMerge(Layer.merge(overrides.config ?? NaiveConfigFile, overrides.provenance ?? ProvenanceLog), overrides.fs ?? NodeFs),
    Layer.provideMerge(overrides.judge ?? JudgeLive, overrides.host ?? HostRuntimeLive),
    Layer.succeed(Tracer.Tracer, overrides.tracer ?? naiveTracer(dir)),
  );

export type VentureRuntime = ManagedRuntime.ManagedRuntime<VentureServices, never>;

/** The runtime for one venture, built from its layer. Dispose it when the venture's work is done. */
export const ventureRuntime = (dir: string, overrides?: VentureOverrides): VentureRuntime => ManagedRuntime.make(VentureLayer(dir, overrides));
