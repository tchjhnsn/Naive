// Rendering through recipes end to end (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, build
// plan item 9): two ventures read one shared filesystem library. gamma starts its competitor signals from the starter
// recipe naive recipes init writes (the plain fold of the signal types' projects); delta runs the example recipe,
// which hears only signals rated B2 or better. Each pull renders the pattern through the venture's recipe in the
// sandbox and writes <record>.reception.json beside the record, so one rumour is salient at gamma and noise at
// delta. A pull after a pull writes nothing, not a byte. Once the horizon has passed, a pull labels each reception
// helpful, inert or harmful against the settled record, and a pull after that writes nothing either. A recipe that
// throws fails the pull before anything is written. Every venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/recipe-render-test.ts

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pull, replay } from "../../router/orchestration/signals.ts";
import { loadSignals } from "../../engine/recipes/eval-set.ts";
import { baselineRecord } from "../../engine/recipes/outcomes.ts";
import type { Known } from "../../engine/recipes/outcomes.ts";
import { producerShares } from "../../engine/recipes/render.ts";
import { signalId, canonicalJson } from "../../core/signal-id.ts";
import { hasBlob } from "../../core/blobs.mjs";
import { entries } from "../../core/provenance.mjs";
import { validateValue } from "../../records/validate.mjs";
import type { Reception, Signal } from "../../records/types/records.d.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const show = (r: unknown): string => String(JSON.stringify(r)).slice(0, 800);
const ws = mkdtempSync(join(tmpdir(), "recipe-render-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_PERSON", "MENTURA_MODEL"]) { delete env[k]; delete process.env[k]; }
process.env.MENTURA_WORKSPACE = ws;
const node = (script: string, a: string[], extra: NodeJS.ProcessEnv = {}) => spawnSync(process.execPath, [join(repo, script), ...a], { encoding: "utf8", env: { ...env, ...extra } });
const naive = (a: string[], extra: NodeJS.ProcessEnv = {}) => node("packages/naive/src/interfaces/cli/naive.mjs", a, extra);
const read = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
const sha = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");

function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => { for (const e of readdirSync(d)) { const f = join(d, e); if (statSync(f).isDirectory()) walk(f); else out[relative(dir, f)] = createHash("sha1").update(readFileSync(f)).digest("hex"); } };
  walk(dir);
  return out;
}
const sameFiles = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(a) === JSON.stringify(b);

const NOW = "2026-11-07T00:00:00Z";
const LATER = "2027-02-06T00:00:00Z"; // NOW plus 91 days: past competitor-signals' 90 day horizon
const ORIGINAL = "3a50ad6dfb3a46b0f160cc36";
const PATTERN = "competitors/[id]/signals";
const sources = { sources: [{ id: "market", connector: "filesystem", root: "../../library", writes: "none", carries: "signals", note: "The shared library, read in place" }], records: {} };

function publish(body: Record<string, unknown>, day: string): string {
  const id = signalId(body);
  const s = body as { subject: string; time: string; type: string };
  const path = `signals/${s.type.split("@")[0]}/${s.subject}/${s.time.slice(0, 10)}-${id}.json`;
  mkdirSync(join(ws, "library", path, ".."), { recursive: true });
  writeFileSync(join(ws, "library", path), JSON.stringify({ id, ...body }, null, 2) + "\n");
  mkdirSync(join(ws, "library/log/competitor-funding"), { recursive: true });
  appendFileSync(join(ws, "library/log/competitor-funding", `${day}.jsonl`), JSON.stringify({ id, subject: s.subject, path, published: `${day}T10:00:00Z` }) + "\n");
  return id;
}
const funding = (producer: string, series: string, amount: number, time: string, observed: string, rating: { reliability: string; credibility: number }) => ({ type: "competitor-funding@1.0", producer, subject: "acme-robotics", time, observed,
  props: { org: { name: "Acme Robotics", domain: "acme.example" }, round: { series, amount, currency: "USD" } }, rating, cites: [{ url: "https://acme.example/news", accessed: time }] });

try {
  cpSync(join(repo, "packages/naive/src/records/examples/signals/library"), join(ws, "library"), { recursive: true });
  rmSync(join(ws, "library/types"), { recursive: true });
  cpSync(join(repo, "packages/naive/library/packages/competitors/signals/types"), join(ws, "library/types"), { recursive: true });
  // A rumour of a series A, rated D4 by a desk no one confirms; and a second producer's report of the seed round,
  // observed ten days after NOW, so no render at NOW sees it but it settles the seed claim within the horizon.
  const RUMOUR = publish(funding("rumour-mill/desk", "series-a", 20000000, "2026-11-06", "2026-11-06T18:00:00Z", { reliability: "D", credibility: 4 }), "2026-11-06");
  const CONFIRM = publish(funding("other-desk/wire", "seed", 3000000, "2026-11-05", "2026-11-17T09:00:00Z", { reliability: "B", credibility: 2 }), "2026-11-17");

  const venture = (id: string) => {
    const made = node("packages/naive/src/interfaces/cli/mentura.mjs", ["init", join(ws, "ventures", id), "--id", id, "--layers", "purpose"]);
    if (made.status !== 0) throw new Error(made.stderr);
    const dir = join(ws, "ventures", id);
    const cfg = existsSync(join(dir, "naive.config.json")) ? read(join(dir, "naive.config.json")) as Record<string, unknown> : {};
    // The competitor master record comes from every organization part; track-competitors stays on but the recipe
    // owns its pattern; the package's other listeners are off.
    writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ ...cfg, listeners: [{ id: "competitor-master", hears: "organization@^1", consumer: { route: "competitors/[id]" }, then: "project" }],
      listeners_off: ["name-competitors", "rival-raised", "track-launches", "launch-revalidates-stance"] }, null, 2) + "\n");
    mkdirSync(join(dir, "knowledge"), { recursive: true });
    writeFileSync(join(dir, "knowledge/sources.json"), JSON.stringify(sources, null, 2) + "\n");
    return dir;
  };
  const gamma = venture("gamma");
  const delta = venture("delta");
  const recipeFile = (dir: string) => join(dir, "competitors/[id]/signals.recipe.ts");
  const signalsFile = (dir: string) => join(dir, "competitors/acme-robotics/signals.json");
  const receptionFile = (dir: string) => join(dir, "competitors/acme-robotics/signals.reception.json");

  // ---- naive recipes init ----
  const agentInit = naive(["recipes", "init", PATTERN, "--venture", gamma, "--by", "dana"], { MENTURA_ACTOR: "agent", MENTURA_ACTOR_ID: "researcher" });
  expect("init refuses an agent", agentInit.status === 1 && /an agent \(researcher\) is acting/.test(agentInit.stderr) && !existsSync(recipeFile(gamma)), agentInit.stdout + agentInit.stderr);
  const noBy = naive(["recipes", "init", PATTERN, "--venture", gamma]);
  expect("init needs the person by name", noBy.status === 1 && /--by <person>/.test(noBy.stderr), noBy.stderr);
  const notProjected = naive(["recipes", "init", "competitors/[id]", "--venture", gamma, "--by", "dana"]);
  expect("init refuses a pattern that is not a projected record type", notProjected.status === 1 && /not a projected record type/.test(notProjected.stderr), notProjected.stderr);
  const init = naive(["recipes", "init", PATTERN, "--venture", gamma, "--by", "dana"]);
  expect("naive recipes init writes the starter recipe", init.status === 0 && existsSync(recipeFile(gamma)) && /the plain fold of competitor-funding@\^1, product-launch@\^1/.test(init.stdout), init.stdout + init.stderr);
  const initLine = (entries(gamma) as { entity: string; agent?: { kind?: string; id?: string }; sha256?: string }[]).find((e) => e.entity === "competitors/[id]/signals.recipe.ts");
  expect("the starter is logged in provenance as the person's, its bytes in the blob store", initLine?.agent?.kind === "person" && initLine.agent.id === "dana" && initLine.sha256 === sha(recipeFile(gamma)) && hasBlob(gamma, initLine.sha256), show(initLine));
  const twice = naive(["recipes", "init", PATTERN, "--venture", gamma, "--by", "dana"]);
  expect("init never overwrites a recipe", twice.status === 1 && /already exists/.test(twice.stderr), twice.stderr);
  mkdirSync(join(delta, "competitors/[id]"), { recursive: true });
  cpSync(join(repo, "packages/naive/src/records/examples/signals/competitors/[id]/signals.recipe.ts"), recipeFile(delta));

  // ---- the first pulls ----
  const g1 = await pull(gamma, { now: NOW });
  expect("gamma's pull writes the master record, the record through its recipe, and the receptions beside it", g1.ok && g1.written.join() === "competitors/acme-robotics.json,competitors/acme-robotics/signals.json" && g1.receptions.join() === "competitors/acme-robotics/signals.reception.json", show(g1));
  const { known, types } = await loadSignals(gamma);
  const plain = baselineRecord(known, types, PATTERN, "acme-robotics", Date.parse(NOW));
  const gRecord = read(signalsFile(gamma)) as { funding: { series: string; signal: string }[] };
  expect("the starter renders exactly the plain fold", canonicalJson(gRecord) === canonicalJson(plain) && gRecord.funding.map((f) => f.series).join() === "seed,series-a", show(gRecord) + show(plain));
  expect("a signal observed after the render is not heard", !JSON.stringify(gRecord).includes(CONFIRM));
  const gRec = read(receptionFile(gamma)) as Reception;
  expect("the receptions pass their schema, name the record and the live recipe's sha", validateValue("reception.schema.json", gRec).status === 0 && gRec.record === "competitors/acme-robotics/signals.json" && gRec.recipe === sha(recipeFile(gamma)) && gRec.as_of === NOW, show(gRec));
  expect("each heard signal has one reception in (time, id) order, and at gamma the rumour is salient", gRec.receptions.map((r) => `${r.signal}:${r.kind}`).join() === `${ORIGINAL}:salient,${RUMOUR}:salient`, show(gRec.receptions));
  expect("the factors are the engine's: lag and age from the times, no producer history yet, uptake not built", gRec.receptions[0].factors.lag === 120600 && gRec.receptions[0].factors.age === 52200 && gRec.receptions[0].factors.producer_confirmed === null && gRec.receptions[0].factors.uptake === null, show(gRec.receptions[0]));
  const recLine = (entries(gamma) as { entity: string; agent?: { id?: string }; derived_from?: string[] }[]).find((e) => e.entity === "competitors/acme-robotics/signals.reception.json");
  expect("the receptions are the projector's, derived from the record", recLine?.agent?.id === "projector" && (recLine.derived_from ?? []).join() === "competitors/acme-robotics/signals.json", show(recLine));
  const writeLine = (entries(gamma) as { entity: string; agent?: { id?: string }; derived_from?: string[] }[]).filter((e) => e.entity === "competitors/acme-robotics/signals.json").at(-1);
  expect("the record cites the signals the recipe called salient", (writeLine?.derived_from ?? []).length === 2 && (writeLine?.derived_from ?? []).every((a) => a.startsWith("market://signals/competitor-funding/acme-robotics/")), show(writeLine));

  const d1 = await pull(delta, { now: NOW });
  expect("delta's pull renders through the example recipe", d1.ok && d1.written.includes("competitors/acme-robotics/signals.json") && d1.receptions.length === 1, show(d1));
  const dRecord = read(signalsFile(delta)) as { funding: { series: string }[]; p_raise_90d?: number };
  expect("delta's record leaves the rumour out and forecasts p_raise_90d", dRecord.funding.map((f) => f.series).join() === "seed" && typeof dRecord.p_raise_90d === "number", show(dRecord));
  const dRec = read(receptionFile(delta)) as Reception;
  const dRumour = dRec.receptions.find((r) => r.signal === RUMOUR);
  expect("the same rumour is noise at delta, with the recipe's reason", dRumour?.kind === "noise" && (dRumour.failed ?? [])[0]?.why === "rated below B2" && dRec.recipe === sha(recipeFile(delta)), show(dRec));

  // ---- a pull after a pull ----
  const gSnap = snapshot(gamma), dSnap = snapshot(delta);
  const g2 = await pull(gamma, { now: NOW }), d2 = await pull(delta, { now: NOW });
  expect("a second pull writes nothing at either venture, not a byte", g2.status === "nothing new" && d2.status === "nothing new" && sameFiles(gSnap, snapshot(gamma)) && sameFiles(dSnap, snapshot(delta)), show([g2, d2]));
  const rp = await replay(gamma, { now: NOW }) as { ok: boolean; result?: { drift: unknown[] } };
  expect("replay renders through the recipe and finds no drift", rp.ok && rp.result?.drift.length === 0, show(rp));

  // ---- hindsight, once the horizon has passed ----
  const gSnap2Record = readFileSync(signalsFile(gamma), "utf8");
  const early = await pull(gamma, { now: "2027-01-01T00:00:00Z" });
  expect("before the horizon has passed, no hindsight is written", early.status === "nothing new" && early.hindsight.length === 0 && sameFiles(gSnap, snapshot(gamma)), show(early));
  const g3 = await pull(gamma, { now: LATER });
  const gH = read(receptionFile(gamma)) as Reception;
  const label = (doc: Reception, id: string) => doc.receptions.find((r) => r.signal === id)?.hindsight;
  expect("past the horizon a pull labels gamma's receptions", g3.ok && g3.hindsight.join() === "competitors/acme-robotics/signals.reception.json" && validateValue("reception.schema.json", gH).status === 0, show(g3));
  expect("the confirmed seed round was helpful, the unconfirmed rumour harmful, each with the recipe's sha", label(gH, ORIGINAL)?.label === "helpful" && label(gH, RUMOUR)?.label === "harmful" && label(gH, ORIGINAL)?.recipe === gRec.recipe && label(gH, ORIGINAL)?.at === LATER, show(gH.receptions.map((r) => r.hindsight)));
  expect("the loss without a helpful signal is higher, without a harmful one lower", (label(gH, ORIGINAL)?.loss_without ?? 0) > (label(gH, ORIGINAL)?.loss_with ?? 1) && (label(gH, RUMOUR)?.loss_without ?? 1) < (label(gH, RUMOUR)?.loss_with ?? 0), show(gH.receptions.map((r) => r.hindsight)));
  expect("hindsight leaves the record itself as it was", gSnap2Record === readFileSync(signalsFile(gamma), "utf8"));
  const d3 = await pull(delta, { now: LATER });
  const dH = read(receptionFile(delta)) as Reception;
  expect("at delta the rumour it called noise is inert, and the seed round helpful", d3.ok && label(dH, RUMOUR)?.label === "inert" && label(dH, ORIGINAL)?.label === "helpful", show(dH.receptions.map((r) => r.hindsight)));
  const gSnap2 = snapshot(gamma);
  const g4 = await pull(gamma, { now: LATER });
  expect("a pull after hindsight writes nothing", g4.status === "nothing new" && g4.hindsight.length === 0 && sameFiles(gSnap2, snapshot(gamma)), show(g4));

  // ---- the producer's history ----
  const mk = (producer: string, series: string, observed: string, extra: Record<string, unknown> = {}): Known => {
    const body = { ...funding(producer, series, 1000000, observed.slice(0, 10), observed, { reliability: "B", credibility: 2 }), ...extra };
    return { signal: { id: signalId(body), ...body } as Signal, library: "market", by: "producer" };
  };
  const p1 = mk("desk/p", "pre-seed", "2026-01-01T00:00:00Z"), p2 = mk("desk/p", "angel", "2026-01-02T00:00:00Z"), other = mk("desk/q", "pre-seed", "2026-01-05T00:00:00Z");
  const retract = mk("desk/p", "angel", "2026-02-01T00:00:00Z", { retracts: p2.signal.id, props: {} });
  const now = mk("desk/p", "series-b", "2026-11-01T00:00:00Z");
  const shares = producerShares([p1, p2, other, retract, now], types, now.signal, Date.parse("2026-11-02T00:00:00Z"), 90 * 86_400_000);
  expect("the producer's shares count its earlier settled signals: one confirmed by a second producer, one retracted", shares.producer_confirmed === 0.5 && shares.producer_withdrawn === 0.5, show(shares));
  expect("with no settled history, or no horizon, the shares are null", producerShares([now], types, now.signal, Date.parse("2026-11-02T00:00:00Z"), 90 * 86_400_000).producer_confirmed === null && producerShares([p1, now], types, now.signal, Date.parse("2026-11-02T00:00:00Z"), null).producer_withdrawn === null);

  // ---- a recipe that throws fails the pull before anything is written ----
  writeFileSync(recipeFile(delta), readFileSync(recipeFile(delta), "utf8").replace("const receptions: Reception[] = [];", "const receptions: Reception[] = [];\n  if (input.signals.length > 2) throw new Error(\"too many\");"));
  publish(funding("market-example/research", "series-a", 12000000, "2026-11-08", "2027-02-06T12:00:00Z", { reliability: "A", credibility: 1 }), "2027-02-06");
  const dSnap2 = snapshot(delta);
  const d4 = await pull(delta, { now: "2027-02-07T00:00:00Z" });
  expect("a recipe that throws fails the pull, and nothing is written, the cursor included", !d4.ok && d4.status === "failed" && /too many/.test(d4.error ?? "") && sameFiles(dSnap2, snapshot(delta)), show(d4));
} finally {
  rmSync(ws, { recursive: true, force: true });
}
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
