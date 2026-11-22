// Migration effect-pin (framework 0.4.0, EE-161): a venture runs on Effect. Its package.json pins `effect` at the exact
// version Naive declares as a peer dependency, so Naive and the venture's programs share one copy. A venture with no
// package.json runs on Naive's copy and is left alone. Every change goes through ctx (packages/naive/src/engine/upgrades.ts).
import { pinnedText, venturePin, wantedPin } from "../effect-pin.ts";

/** The part of the upgrade context this migration uses. */
type Ctx = { write(rel: string, text: string, opts?: { note?: string }): void; note(msg: string): void };

export const id = "effect-pin";
export const describe = "Pins effect in the venture's package.json at the exact version Naive declares as a peer dependency";

export function apply(dir: string, ctx: Ctx) {
  const want = wantedPin();
  const was = venturePin(dir);
  if (was === undefined) { ctx.note(`no package.json: the venture runs on Naive's copy of effect ${want}`); return; }
  const text = pinnedText(dir, want);
  if (text === null) { ctx.note(`effect is already pinned at ${want}`); return; }
  ctx.write("package.json", text, { note: `pinned effect ${want}${was ? ` (was ${was})` : ""}, Naive's peer version` });
}
