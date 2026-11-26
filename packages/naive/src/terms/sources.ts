// Whether a source write is an allowed source (EE-192). The term is in terms.ts. This builds the facts
// and runs it. The declared label is not a fact.

import { run, type Result } from "./engine.ts";
import { allowedSource, hostDenied } from "./terms.ts";

export type SourceJudgment = { verdict: "allowed"; result: Result } | { verdict: "refused"; result: Result };

/** loggedIn is true only when the input says a login was used. A missing flag is logged off. */
export function judgeSource(input: { url: string | null; archiveOf: string | null; loggedIn: boolean }): SourceJudgment {
  const facts = { confirmed: true, hostDenied: hostDenied(input.url, input.archiveOf), loggedOff: !input.loggedIn };
  const result = run(allowedSource, facts);
  return result.pass ? { verdict: "allowed", result } : { verdict: "refused", result };
}
