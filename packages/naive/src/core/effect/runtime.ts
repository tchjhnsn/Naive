// The venture runtime (EE-161). A venture's services come from one layer, VentureLayer, and are built once into a
// ManagedRuntime, ventureRuntime, that an entry point runs every Effect through: built on first use, shared by
// every run after, and released by `dispose()`, after which it refuses to run. The services so far are VentureFs
// (NodeFs by default, MemoryFs in tests) and NaiveConfig (naive.config.json read through VentureFs, or fixed
// configs in tests). The other services in docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md
// join the layer one phase at a time, and those that read the venture's files read under `dir`, so callers that
// pass it now do not change when they arrive.
import { Layer, ManagedRuntime } from "effect";
import { NaiveConfigFile } from "./config.ts";
import { NodeFs } from "./fs.ts";

/** The services a venture's Effects may ask for. It grows as services join the layer. */
export type VentureServices = "naive/VentureFs" | "naive/NaiveConfig";

/** A layer per service that replaces the default one, for a test or a host. */
export type VentureOverrides = { readonly fs?: Layer.Layer<"naive/VentureFs">; readonly config?: Layer.Layer<"naive/NaiveConfig", never, "naive/VentureFs"> };

/** The layer of a venture's services: each override where one is given, else the default. NaiveConfig reads through
 *  the VentureFs chosen here, so a MemoryFs test sees its own naive.config.json. */
export const VentureLayer = (dir: string, overrides: VentureOverrides = {}): Layer.Layer<VentureServices> =>
  Layer.provideMerge(overrides.config ?? NaiveConfigFile, overrides.fs ?? NodeFs);

export type VentureRuntime = ManagedRuntime.ManagedRuntime<VentureServices, never>;

/** The runtime for one venture, built from its layer. Dispose it when the venture's work is done. */
export const ventureRuntime = (dir: string, overrides?: VentureOverrides): VentureRuntime => ManagedRuntime.make(VentureLayer(dir, overrides));
