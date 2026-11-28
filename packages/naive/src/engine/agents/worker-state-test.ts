// Tests the digital worker statechart (EE-235, worker-state.ts) over every phase, event and actor: ended absorbing,
// only a person moving a worker into active, an expiry ending every live phase, and reach only while active.
//
//   node packages/naive/src/engine/agents/worker-state-test.ts

import { ACTORS, EVENTS, PHASES, eventBetween, reachOf, transition } from "./worker-state.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const all = PHASES.flatMap((p) => EVENTS.flatMap((e) => ACTORS.map((a) => ({ p, e, a, r: transition(p, e, a) }))));

expect("the machine is total: every phase, event and actor gives a phase", all.length === 60 && all.every((x) => PHASES.includes(x.r.to)));
expect("a refused move leaves the phase as it was, with a reason", all.every((x) => x.r.refused === null || (x.r.to === x.p && x.r.refused.length > 0)));
expect("ended is absorbing", all.filter((x) => x.p === "ended").every((x) => x.r.to === "ended"));
expect("only a person moves a worker into active", all.filter((x) => x.p !== "active" && x.r.to === "active").every((x) => x.a === "person"));
expect("an agent's activate and resume are refused, naming the person", /only a person activates/.test(transition("proposed", "activate", "agent").refused ?? "") && /only a person resumes/.test(transition("suspended", "resume", "agent").refused ?? ""));
expect("an expiry ends every phase but absent, whoever causes it", all.filter((x) => x.e === "expire" && x.p !== "absent").every((x) => x.r.to === "ended"));
expect("a worker is born only by propose", all.filter((x) => x.p === "absent" && x.r.to !== "absent").every((x) => x.e === "propose" && x.r.to === "proposed"));
expect("suspend is from active only, and resume from suspended only", all.filter((x) => x.e === "suspend" && x.r.refused === null).every((x) => x.p === "active") && all.filter((x) => x.e === "resume" && x.r.refused === null).every((x) => x.p === "suspended"));
expect("eventBetween names the event of each move and null for none", eventBetween("proposed", "active") === "activate" && eventBetween("active", "ended") === "end" && eventBetween("ended", "active") === null && eventBetween("absent", "active") === null);
expect("reach is the writes while active and nothing otherwise", reachOf("active", ["a/*"]).join() === "a/*" && PHASES.filter((p) => p !== "active").every((p) => reachOf(p, ["a/*"]).length === 0));

console.log(failed ? `\n${failed} failed` : "\nworker state: all passed");
process.exit(failed ? 1 : 0);
