// Connectors as a service (EE-161, phase 7). How a venture reaches the sources its records live in, named as one
// service an Effect asks for: `connect(source, dir)`, `connectAll(dir)` and `sourceFor(dir, recordType, context)`.
// It is a Context.Reference whose default is the registerConnector registry in index.ts (the filesystem connector
// and any an app registers), so an Effect that asks for it needs no layer; a host that keeps records in Postgres or
// Neon provides another with `Layer.succeed(Connectors, ...)`. Its methods run over the VentureFs in scope. The
// plain `connect`, `connectAll` and `sourceFor` exports keep working as before; the router moves onto the service in
// phase 8.
import { Context, Effect } from "effect";
import type { NaiveError } from "../../core/effect/errors.ts";
import type { Connector } from "./contract.ts";
import { type Connected, type ConnectSource, connectAllEffect, connectEffect, type Source, sourceForEffect } from "./index.ts";

export type ConnectorsShape = {
  readonly connect: (source: ConnectSource, dir: string) => Effect.Effect<Connector, NaiveError, "naive/VentureFs">;
  readonly connectAll: (dir: string) => Effect.Effect<Connected[], NaiveError, "naive/VentureFs">;
  readonly sourceFor: (dir: string, recordType: string, context?: Record<string, string>) => Effect.Effect<Source, NaiveError, "naive/VentureFs">;
};

/** The registry's connectors: what index.ts does. */
export const registryConnectors: ConnectorsShape = { connect: connectEffect, connectAll: connectAllEffect, sourceFor: sourceForEffect };

export const Connectors: Context.Reference<ConnectorsShape> = Context.Reference<ConnectorsShape>("naive/Connectors", { defaultValue: () => registryConnectors });

/** The connector for the source that holds `recordType` in `dir`, through the Connectors in scope. */
export const connectorFor = (dir: string, recordType: string, context: Record<string, string> = {}): Effect.Effect<Connected, NaiveError, "naive/VentureFs"> =>
  Effect.gen(function* () {
    const c = yield* Connectors;
    const source = yield* c.sourceFor(dir, recordType, context);
    return { source, connector: yield* c.connect(source, dir) };
  });
