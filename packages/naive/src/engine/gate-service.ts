// The gate as a service (EE-161, phase 8). gate.ts stays the pure rules (fast, no model, X-4); this names them as one
// Effect service, `Gate`, so a router write asks the gate as an Effect and a host or a test can put another in its
// place. It is a Context.Reference whose default is gate.ts's evaluate, so an Effect that asks for it needs no layer.
import { Context, Effect } from "effect";
import { evaluate } from "./gate.ts";

/** What the gate is asked about one write: evaluate's arguments. */
export type GateInput = Parameters<typeof evaluate>[0];
/** The gate's verdict on one write: pass, draft, owner or refuse, with the rule and why. */
export type GateVerdict = ReturnType<typeof evaluate>;

export type GateShape = { readonly evaluate: (input: GateInput) => Effect.Effect<GateVerdict> };

/** The rules in gate.ts, as a service. */
export const rulesGate: GateShape = { evaluate: (input) => Effect.sync(() => evaluate(input)) };

export const Gate: Context.Reference<GateShape> = Context.Reference<GateShape>("naive/Gate", { defaultValue: () => rulesGate });

/** Asks the Gate in scope about one write. */
export const askGate = (input: GateInput): Effect.Effect<GateVerdict> => Effect.gen(function* () { return yield* (yield* Gate).evaluate(input); });
