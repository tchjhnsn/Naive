// Tests the element statechart, capability levels and propagation (EE-190): the transition function over every
// state and event, replay, each level's rule, propagation on fixtures with a chain and a cycle, determinism, and the
// what-if.
import { CAP, PRIORS, causeKey, downOf, levelOf, propagate, reachable, replay, transition, whatIf } from "./element-state.ts";
import type { Cause, ElementEvent, ElementState, Feeds, Own } from "./element-state.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 800)}`}`); if (!ok) failed++; };

const fail = (workflow: string): Cause => ({ kind: "run-failed", workflow });
const states: ElementState[] = [
  { tag: "absent" }, { tag: "started" }, { tag: "operating" },
  { tag: "degraded", causes: [fail("f/w")], was: "started" },
  { tag: "degraded", causes: [{ kind: "upstream", element: "2.0", upstream: "absent" }], was: "operating" },
  { tag: "degraded", causes: [fail("f/w"), { kind: "stale", record: "a.json" } as Cause], was: "operating" },
  { tag: "retired" },
];
const events: ElementEvent[] = [
  { kind: "record-written", record: "a.json", data: "master" }, { kind: "record-written", record: "b.json", data: "transactional" }, { kind: "record-written", record: "c.json", data: null },
  { kind: "run-finished", workflow: "f/w" }, { kind: "run-finished", workflow: "f/other" },
  { kind: "run-failed", workflow: "f/w" }, { kind: "run-overdue", workflow: "f/w" }, { kind: "record-stale", record: "a.json" },
  { kind: "upstream-down", element: "2.0", upstream: "absent" }, { kind: "upstream-down", element: "3.0", upstream: "degraded" },
  { kind: "cleared", cause: "run-failed:f/w" }, { kind: "cleared", cause: "upstream:2.0" }, { kind: "cleared", cause: "nothing" },
  { kind: "retire", by: "person" },
];
const TAGS = new Set(["absent", "started", "operating", "degraded", "retired"]);
const valid = (s: ElementState): boolean => TAGS.has(s.tag) && (s.tag !== "degraded" || (s.causes.length > 0 && (s.was === "started" || s.was === "operating")
  && s.causes.every((c, i) => i === 0 || causeKey(s.causes[i - 1]) < causeKey(c))));
const keys = (s: ElementState): string[] => (s.tag === "degraded" ? s.causes.map(causeKey) : []);
const brings = (e: ElementEvent): string | null => (e.kind === "run-failed" || e.kind === "run-overdue" ? `${e.kind}:${e.workflow}` : e.kind === "record-stale" ? `stale:${e.record}` : e.kind === "upstream-down" ? `upstream:${e.element}` : null);

const pairs = states.flatMap((s) => events.map((e) => ({ s, e, t: transition(s, e) })));
expect(`totality: each of the ${pairs.length} state and event pairs gives a valid state, with degraded causes non-empty, sorted and unique`, pairs.every((p) => valid(p.t)), pairs.filter((p) => !valid(p.t)));
expect("retired is absorbing, and retire from any state retires", pairs.filter((p) => p.s.tag === "retired" || p.e.kind === "retire").every((p) => p.t.tag === "retired"));
expect("absent leaves only on a record written: to started, or to operating for a transactional record", pairs.filter((p) => p.s.tag === "absent").every((p) => (p.e.kind === "retire" ? p.t.tag === "retired" : p.e.kind !== "record-written" ? p.t.tag === "absent" : p.t.tag === (p.e.data === "transactional" ? "operating" : "started"))));
expect("a failed run, an overdue run, a stale record or a down upstream degrades a started, operating or degraded element with that cause", pairs.filter((p) => brings(p.e) && ["started", "operating", "degraded"].includes(p.s.tag)).every((p) => p.t.tag === "degraded" && keys(p.t).includes(brings(p.e)!)));
expect("upstream-down never removes a cause and never leaves degraded", pairs.filter((p) => p.e.kind === "upstream-down").every((p) => keys(p.s).every((k) => keys(p.t).includes(k)) && (p.s.tag !== "degraded" || p.t.tag === "degraded")));
expect("a started element operates after a finished run or a transactional record, and stays started after a master record", transition({ tag: "started" }, events[3]).tag === "operating" && transition({ tag: "started" }, events[1]).tag === "operating" && transition({ tag: "started" }, events[0]).tag === "started");
expect("a finished run clears its own workflow's failure, not another's", transition(states[3], events[3]).tag === "operating" && transition(states[3], events[4]).tag === "degraded");
expect("degraded returns to the state it left once its last cause clears", transition({ tag: "degraded", causes: [{ kind: "upstream", element: "2.0", upstream: "absent" }], was: "started" }, events[11]).tag === "started" && transition(states[4], events[11]).tag === "operating");
expect("a cause cleared while another stays keeps it degraded, and a write clears its own staleness", JSON.stringify(keys(transition(states[5], events[10]))) === JSON.stringify(["stale:a.json"]) && JSON.stringify(keys(transition(states[5], events[0]))) === JSON.stringify(["run-failed:f/w"]));
expect("a finished run while degraded from started means it will return to operating", (() => { const t = transition({ tag: "degraded", causes: [{ kind: "upstream", element: "2.0", upstream: "absent" }], was: "started" }, events[3]); return t.tag === "degraded" && t.was === "operating"; })());
expect("clearing a cause it does not have changes nothing", pairs.filter((p) => p.e.kind === "cleared" && p.e.cause === "nothing" && p.s.tag !== "absent").every((p) => JSON.stringify(p.t) === JSON.stringify(p.s)));
expect("replay folds from absent: written, run, failed, finished", replay([events[0], events[3], events[5]]).tag === "degraded" && replay([events[0], events[3], events[5], events[3]]).tag === "operating" && replay([]).tag === "absent");

// Levels.
const lv = (state: ElementState, performed: boolean, finished: number, recent_failure = false) => levelOf({ state, performed, finished, recent_failure }).level;
expect("absent, retired and unperformed elements are level 0", lv({ tag: "absent" }, false, 0) === 0 && lv({ tag: "retired" }, true, 9) === 0 && lv({ tag: "started" }, false, 0) === 0);
expect("performed is level 1, and degraded holds it there however many runs finished", lv({ tag: "operating" }, true, 1) === 1 && lv(states[3], true, 10) === 1);
expect(`level 2 asks for ${PRIORS.managed_runs} finished runs and no cause, level 3 for ${PRIORS.established_runs} with no failure in the last three`, lv({ tag: "operating" }, true, 2) === 2 && lv({ tag: "operating" }, true, 3) === 3 && lv({ tag: "operating" }, true, 9, true) === 2);
expect(`no evidence raises a level above ${CAP}, and level 3 says what level 4 would need`, lv({ tag: "operating" }, true, 1000) === CAP && /not built/.test(levelOf({ state: { tag: "operating" }, performed: true, finished: 9, recent_failure: false }).next));

// Propagation.
const op = (id: string, level: Own["level"] = 3): Own => ({ id, state: { tag: "operating" }, level });
const chain: Feeds[] = [{ from: "A", to: "B" }, { from: "B", to: "C" }];
const p1 = propagate([{ id: "A", state: { tag: "absent" }, level: 0 }, op("B"), op("C")], chain);
expect("an absent upstream degrades what it feeds, naming it, and the harm carries on with its root", p1.get("B")!.state.tag === "degraded" && keys(p1.get("B")!.state).join() === "upstream:A" && keys(p1.get("C")!.state).join() === "upstream:B" && p1.get("C")!.roots.join() === "A", [...p1.values()]);
expect(`a low upstream level caps downstream at it plus ${PRIORS.slack}, along the chain`, p1.get("B")!.level === 1 && p1.get("C")!.level === 2 && p1.get("B")!.capped_by.join() === "A");
const p2 = propagate([op("A", 3), op("B", 1), op("C", 1)], chain);
expect("a strong upstream does not raise downstream past its own evidence", p2.get("B")!.level === 1 && p2.get("C")!.level === 1 && p2.get("C")!.capped_by.length === 0);
const p3 = propagate([{ id: "A", state: { tag: "absent" }, level: 0 }, { id: "B", state: { tag: "absent" }, level: 0 }, { id: "C", state: { tag: "retired" }, level: 0 }], chain);
expect("an absent or retired downstream stays as it is, with only itself as root", p3.get("B")!.state.tag === "absent" && p3.get("C")!.state.tag === "retired" && p3.get("B")!.roots.join() === "B");
const cyc: Feeds[] = [{ from: "A", to: "B" }, { from: "B", to: "A" }, { from: "C", to: "A" }, { from: "A", to: "A" }];
const p4 = propagate([op("A"), op("B"), op("C")], cyc);
expect("a healthy cycle stays healthy: propagation starts from own states, the least fixpoint", [...p4.values()].every((e) => e.state.tag === "operating" && e.level === 3));
const p5 = propagate([op("A"), op("B"), { id: "C", state: { tag: "degraded", causes: [fail("c/w")], was: "operating" }, level: 1 }], cyc);
expect("on a cycle harm settles: both members are degraded and the root is the element outside it", keys(p5.get("A")!.state).join() === "upstream:B,upstream:C" && keys(p5.get("B")!.state).join() === "upstream:A" && p5.get("A")!.roots.join() === "C" && p5.get("B")!.roots.join() === "C" && p5.get("A")!.level === 2 && p5.get("B")!.level === 3, [...p5.values()]);
expect("a feed of an element to itself and a feed naming an unknown element are ignored", !keys(p4.get("A")!.state).length && propagate([op("A")], [{ from: "Z", to: "A" }]).get("A")!.state.tag === "operating");
const big: Own[] = Array.from({ length: 30 }, (_, i) => (i % 7 === 0 ? { id: `n${i}`, state: { tag: "absent" }, level: 0 } : op(`n${i}`, ((i % 4) as Own["level"]))));
const bigFeeds: Feeds[] = big.flatMap((n, i) => [{ from: n.id, to: `n${(i * 7 + 3) % 30}` }, { from: n.id, to: `n${(i + 1) % 30}` }]);
const once = JSON.stringify([...propagate(big, bigFeeds).values()]);
expect("propagation is deterministic over input order and settles on a graph full of cycles", once === JSON.stringify([...propagate([...big].reverse(), [...bigFeeds].reverse()).values()]));
expect("propagation is monotone: making an element absent never makes any element healthier", (() => {
  const before = propagate(big, bigFeeds), after = propagate(big.map((n) => (n.id === "n5" ? { id: "n5", state: { tag: "absent" as const }, level: 0 as const } : n)), bigFeeds);
  return [...before.values()].every((b) => { const a = after.get(b.id)!; return a.level <= b.level && (!downOf(b.state) || !!downOf(a.state)) && keys(b.state).every((k) => keys(a.state).includes(k) || a.state.tag !== "degraded"); });
})());

// What-if.
const own = [op("A", 3), op("B", 3), op("C", 2), op("D", 3)];
const feeds: Feeds[] = [...chain, { from: "D", to: "A" }];
const absent = whatIf(own, feeds, "A", "absent"), weak = whatIf(own, feeds, "A", "weak"), strong = whatIf(own, feeds, "A", "strong");
expect("the what-if lists every element downstream and no other", absent.downstream.map((d) => d.id).join() === "B,C" && reachable(feeds, "D").join() === "A,B,C");
expect("if A were absent, B and C would be degraded and capped", absent.downstream.every((d) => d.changed && d.then.state.tag === "degraded") && absent.downstream[0].then.level === 1);
expect("if A were weak, B would be capped at level 2 and stay operating", weak.downstream[0].then.level === 2 && weak.downstream[0].then.state.tag === "operating" && weak.downstream[1].changed === false);
expect("if A were strong, nothing downstream would change", strong.downstream.every((d) => !d.changed));

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("element state: all passed");
