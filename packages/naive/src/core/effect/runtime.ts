// The venture runtime (EE-161). A venture's services come from one layer, VentureLayer, and are built once into a
// ManagedRuntime, ventureRuntime, that an entry point runs every Effect through: built on first use, shared by
// every run after, and released by `dispose()`, after which it refuses to run. VentureFs is the only service so
// far (NodeFs by default, MemoryFs in tests). The other services in docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md
// join the layer one phase at a time, and those that read the venture's files read under `dir`, so callers that
// pass it now do not change when they arrive.
import { Layer, ManagedRuntime } from "effect";
import { NodeFs } from "./fs.ts";

/** The services a venture's Effects may ask for. It grows as services join the layer. */
export type VentureServices = "naive/VentureFs";

/** A layer per service that replaces the default one, for a test or a host. */
export type VentureOverrides = { readonly fs?: Layer.Layer<"naive/VentureFs"> };

/** The layer of a venture's services: each override where one is given, else the default. */
export const VentureLayer = (dir: string, overrides: VentureOverrides = {}): Layer.Layer<VentureServices> => overrides.fs ?? NodeFs;

export type VentureRuntime = ManagedRuntime.ManagedRuntime<VentureServices, never>;

/** The runtime for one venture, built from its layer. Dispose it when the venture's work is done. */
export const ventureRuntime = (dir: string, overrides?: VentureOverrides): VentureRuntime => ManagedRuntime.make(VentureLayer(dir, overrides));
