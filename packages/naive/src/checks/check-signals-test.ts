// Breaks check-signals on copies (signal library design, build plan item 7: "breaks on copies"). Each case copies
// the example library, the competitors package's types or a small venture into a temporary folder, breaks one rule,
// and expects the check to name it. The clean copies pass, and so does the repository.
//
//   node packages/naive/src/checks/check-signals-test.ts

import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { signalId } from "../core/signal-id.ts";
import { EXAMPLE_LIBRARY, PACKAGES, checkDir, checkLibrary, checkPackages, checkVenture } from "./check-signals.ts";
import type { Report } from "./check-signals.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-signals-test-"));
const json = (f: string): Record<string, unknown> => JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
const put = (f: string, v: unknown) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 2) + "\n"); };
const has = (r: Report, re: RegExp, where: "errors" | "warnings" = "errors") => r[where].some((e) => re.test(e));

let n = 0;
/** A fresh copy of the example library. */
const lib = () => { const d = join(tmp, `lib-${++n}`); cpSync(join(repo, EXAMPLE_LIBRARY), d, { recursive: true }); return d; };
/** A fresh copy of the competitors package's types, as a package folder. */
const pkg = () => { const d = join(tmp, `pkg-${++n}`); cpSync(join(repo, PACKAGES, "competitors/signals/types"), join(d, "signals/types"), { recursive: true }); return d; };
const FUNDING = "types/competitor-funding/1.0.0.signal.json";
const ORG = "types/organization/1.0.0.signal.json";
const ORIGINAL = "signals/competitor-funding/acme-robotics/2026-11-05-3a50ad6dfb3a46b0f160cc36.json";
const edit = (f: string, change: (_v: Record<string, unknown>) => void) => { const v = json(f); change(v); put(f, v); };
/** Publishes a signal into a library folder: its address computed, its file where its content says, its log line. */
function publish(root: string, body: Record<string, unknown>, { log = true, day = "2026-11-07" } = {}): string {
  const id = signalId(body);
  const b = body as { type: string; subject: string; time: string };
  const path = `signals/${b.type.split("@")[0]}/${b.subject}/${b.time.slice(0, 10)}-${id}.json`;
  put(join(root, path), { id, ...body });
  if (log) { mkdirSync(join(root, "log", b.type.split("@")[0]), { recursive: true }); appendFileSync(join(root, "log", b.type.split("@")[0], `${day}.jsonl`), JSON.stringify({ id, subject: b.subject, path, published: `${day}T09:00:00Z` }) + "\n"); }
  return id;
}
const funding = (over: Record<string, unknown> = {}) => ({ type: "competitor-funding@1.0", producer: "market-example/research", subject: "acme-robotics", time: "2026-11-06", observed: "2026-11-06T10:00:00Z",
  props: { org: { name: "Acme Robotics", domain: "acme.example" }, round: { series: "series-a", amount: 12000000, currency: "USD" } }, rating: { reliability: "B", credibility: 2 }, cites: [], ...over });

try {
  // ---- Clean copies pass ----
  const clean = await checkLibrary(lib(), "clean");
  t("the example library passes as it is", clean.errors.length === 0 && clean.types === 3 && clean.signals === 1 && clean.cases === 3, clean);
  const pclean = await checkDir(pkg(), []);
  t("the competitors package's types pass as they are", pclean.errors.length === 0 && pclean.types === 4, pclean);
  const repoRun = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-signals.ts")], { encoding: "utf8" });
  t("the repository passes: Naive's packages and the example library", repoRun.status === 0 && /^pass {2}signals:/m.test(repoRun.stdout), repoRun.stdout + repoRun.stderr);
  const pk = checkPackages();
  t("Naive's packages' listeners are checked against Naive's types", pk.errors.length === 0 && pk.listeners >= 5 && pk.types >= 4, pk);

  // ---- Types ----
  let d = lib(); renameSync(join(d, "types/organization/1.0.0.signal.json"), join(d, "types/organization/1.1.0.signal.json"));
  t("a type file that is not at types/<id>/<version>.signal.json", has(await checkLibrary(d), /belongs at types\/organization\/1\.0\.0\.signal\.json/));
  d = lib(); edit(join(d, ORG), (v) => { delete v.title; });
  t("a type that does not match its schema", has(await checkLibrary(d), /does not match signal-type\.schema\.json/));
  d = lib(); edit(join(d, FUNDING), (v) => { (v.composes as { type: string }[])[0].type = "organization@^2"; });
  t("a part range no type resolves", has(await checkLibrary(d), /no type resolves the part organization@\^2 at org/));
  d = lib(); edit(join(d, FUNDING), (v) => { (v.composes as { at: string }[])[0].at = "company"; });
  t("a part at a key the props do not declare", has(await checkLibrary(d), /the part at company is not a prop/));
  d = lib(); edit(join(d, FUNDING), (v) => { (v.composes as unknown[]).push({ at: "org", type: "organization@^1" }); });
  t("two parts at one key", has(await checkLibrary(d), /two parts sit at org/));
  d = lib(); edit(join(d, ORG), (v) => { ((v.props as { properties: Record<string, unknown> }).properties).deal = { type: "object" }; v.composes = [{ at: "deal", type: "competitor-funding@^1" }]; });
  t("parts that compose each other in a cycle", has(await checkLibrary(d), /its parts compose it again/));
  d = lib(); edit(join(d, FUNDING), (v) => { const p = v.projects as unknown[]; p.push(p[0]); });
  t("two projections of one type to one route", has(await checkLibrary(d), /two projections write competitors\/\[id\]\/signals/));
  d = lib(); edit(join(d, FUNDING), (v) => { (v.projects as { route: string }[])[0].route = "rivals/[id]"; });
  t("a projection to a route no record type lives at", has(await checkLibrary(d), /no record type in the data model lives at rivals\/\[id\]\.json/));
  d = lib(); edit(join(d, FUNDING), (v) => { ((v.projects as { fields: Record<string, { value: string }> }[])[0].fields.funding).value = "props.money"; });
  t("a fold that reads a prop the type does not declare", has(await checkLibrary(d), /reads props\.money: competitor-funding declares no prop money/));
  d = lib(); edit(join(d, FUNDING), (v) => { ((v.projects as { fields: Record<string, { value: string }> }[])[0].fields.first_seen).value = "when"; });
  t("a fold that reads a view field that is not there (the schema)", has(await checkLibrary(d), /competitor-funding\/1\.0\.0\.signal\.json: does not match signal-type\.schema\.json/));
  d = lib(); edit(join(d, FUNDING), (v) => { ((v.projects as { fields: Record<string, Record<string, unknown>> }[])[0].fields.first_seen).unique_by = ["time"]; });
  t("unique_by on a reducer other than append (the schema)", has(await checkLibrary(d), /competitor-funding\/1\.0\.0\.signal\.json: does not match signal-type\.schema\.json/));
  d = lib(); edit(join(d, FUNDING), (v) => { (v.projects as unknown[]).push({ route: "competitors/[id]", subject_field: "id", once: true, fields: { name: { reducer: "first", value: "props.org.name" } } }); });
  t("a field a composite claims that its shared part owns", has(await checkLibrary(d), /claims competitors\/\[id\]\.name, which its part organization@1\.0\.0 owns/));
  d = pkg(); edit(join(d, "signals/types/product-launch/1.0.0.signal.json"), (v) => { ((v.projects as { fields: Record<string, { reducer: string }> }[])[0].fields.last_seen).reducer = "set"; });
  t("one field of one route folded by two reducers", has(await checkDir(d, []), /competitors\/\[id\]\/signals\.last_seen is folded by max in competitor-funding@1\.0\.0 and by set in product-launch@1\.0\.0/));
  d = pkg(); edit(join(d, "signals/types/product-launch/1.0.0.signal.json"), (v) => { (v.projects as { once?: boolean }[])[0].once = true; });
  t("one route written once by one type and folded by another", has(await checkDir(d, []), /competitors\/\[id\]\/signals is written once by product-launch@1\.0\.0 and folded by competitor-funding@1\.0\.0/));
  d = lib(); edit(join(d, FUNDING), (v) => { const c = (v.cases as { expect: Record<string, Record<string, unknown>> }[])[0]; c.expect["competitors/acme-robotics/signals"].first_seen = "2026-11-01"; });
  t("a worked case that does not render to what it expects", has(await checkLibrary(d), /worked case one-round-twice-reported renders .* not what it expects/));
  d = lib(); edit(join(d, ORG), (v) => { v.cases = []; });
  t("a type with no worked case (the schema)", has(await checkLibrary(d), /organization\/1\.0\.0\.signal\.json: does not match signal-type\.schema\.json: cases/));

  // ---- Signals ----
  d = lib(); edit(join(d, ORIGINAL), (v) => { (v.props as { round: { amount: number } }).round.amount = 4000000; });
  t("a signal edited after it was published", has(await checkLibrary(d), /does not hash to its id/));
  d = lib(); mkdirSync(join(d, "signals/competitor-funding/globex"), { recursive: true }); renameSync(join(d, ORIGINAL), join(d, "signals/competitor-funding/globex/2026-11-05-3a50ad6dfb3a46b0f160cc36.json"));
  t("a signal that does not sit where its content says", has(await checkLibrary(d), /does not sit at signals\/competitor-funding\/acme-robotics\//));
  d = lib(); rmSync(join(d, "types/competitor-funding"), { recursive: true });
  t("a signal of a type no library holds", has(await checkLibrary(d), /no library checked holds the type competitor-funding@1\.0/));
  d = lib(); publish(d, funding({ props: { org: { name: 7 }, round: { series: "seed", amount: 1, currency: "USD" } } }));
  t("a composed part's props that do not match the part's type", has(await checkLibrary(d), /the part at org: props do not match organization@1\.0\.0/));
  d = lib(); publish(d, funding({ props: { org: { name: "Acme Robotics" }, round: { series: "seed", amount: 1, currency: "usd" } } }));
  t("a part's props checked at the part (funding-event's currency)", has(await checkLibrary(d), /the part at round: props do not match funding-event@1\.0\.0/));
  d = lib(); publish(d, funding({ producer: "other-desk/wire", supersedes: "3a50ad6dfb3a46b0f160cc36" }));
  t("a supersession from another producer", has(await checkLibrary(d), /may not withdraw 3a50ad6dfb3a46b0f160cc36/));
  d = lib(); publish(d, funding({ supersedes: "3a50ad6dfb3a46b0f160cc36" }));
  t("a supersession from the same producer passes", (await checkLibrary(d)).errors.length === 0);
  d = lib(); publish(d, funding({ retracts: "aaaaaaaaaaaaaaaaaaaaaaaa", props: {} }));
  const away = await checkLibrary(d);
  t("a retraction whose target is in no library checked is a warning", away.errors.length === 0 && has(away, /withdraws aaaaaaaaaaaaaaaaaaaaaaaa, which is in no library checked/, "warnings"), away);

  // ---- The log ----
  d = lib(); publish(d, funding(), { log: false });
  t("a signal no log line lists never reaches a pull", has(await checkLibrary(d), /no log line lists it, so it never reaches a pull/));
  d = lib(); appendFileSync(join(d, "log/competitor-funding/2026-11-06.jsonl"), readFileSync(join(d, "log/competitor-funding/2026-11-06.jsonl"), "utf8"));
  t("an id listed twice", has(await checkLibrary(d), /3a50ad6dfb3a46b0f160cc36 is listed again/));
  d = lib(); renameSync(join(d, "log/competitor-funding/2026-11-06.jsonl"), join(d, "log/competitor-funding/2026-11-08.jsonl"));
  t("a line published on another day than its file", has(await checkLibrary(d), /published 2026-11-06T09:31:00Z, not on 2026-11-08/));
  d = lib(); mkdirSync(join(d, "log/funding-event"), { recursive: true }); renameSync(join(d, "log/competitor-funding/2026-11-06.jsonl"), join(d, "log/funding-event/2026-11-06.jsonl"));
  t("a line in the log of another type", has(await checkLibrary(d), /sits in log\/funding-event\/, but .* is a competitor-funding@1\.0/));
  d = lib(); writeFileSync(join(d, "log/competitor-funding/2026-11-06.jsonl"), JSON.stringify({ id: "bbbbbbbbbbbbbbbbbbbbbbbb", subject: "acme-robotics", path: "signals/competitor-funding/acme-robotics/2026-11-06-bbbbbbbbbbbbbbbbbbbbbbbb.json", published: "2026-11-06T09:00:00Z" }) + "\n");
  t("a line naming a file that is not there", has(await checkLibrary(d), /names signals\/competitor-funding\/acme-robotics\/2026-11-06-bbbbbbbbbbbbbbbbbbbbbbbb\.json, which is not a signal here/));
  d = lib(); writeFileSync(join(d, "log/competitor-funding/2026-11-06.jsonl"), "{not json\n");
  t("a line that is not JSON", has(await checkLibrary(d), /2026-11-06\.jsonl:1: not JSON/));
  d = lib(); writeFileSync(join(d, "log/competitor-funding/notes.txt"), "");
  t("a file in log/ that is not a day file", has(await checkLibrary(d), /a log file is log\/<type>\/<yyyy-mm-dd>\.jsonl/));
  d = lib(); rmSync(join(d, "library.json"));
  t("a library with types or signals and no library.json", has(await checkLibrary(d), /holds types or signals but no library\.json/));
  d = lib(); edit(join(d, "library.json"), (v) => { v.contract = "something-else@2"; });
  t("a library.json that does not match its schema", has(await checkLibrary(d), /library\.json: does not match signal-library\.schema\.json/));

  // ---- A venture: its local library, its sources and its listeners ----
  const venture = (listeners: unknown[], extra: Record<string, unknown> = {}, sources: unknown[] = []) => {
    const v = join(tmp, `venture-${++n}`);
    put(join(v, "venture.json"), { id: `v${n}`, name: "A venture", phase: "discovery" });
    put(join(v, "naive.config.json"), { listeners, ...extra });
    cpSync(join(repo, EXAMPLE_LIBRARY), join(v, "market"), { recursive: true });
    put(join(v, "knowledge/sources.json"), { sources: [{ id: "market", connector: "filesystem", root: "market", writes: "none", carries: "signals" }, ...sources], records: {} });
    return v;
  };
  const naive = checkPackages().types_loaded;
  const ok = await checkVenture(venture([]), "v", naive);
  t("a venture with the package listeners, a filesystem library and no local signals passes", ok.errors.length === 0 && ok.listeners >= 5, ok);
  let v = venture([{ id: "rival-news", hears: "rival-news@^1", consumer: { decision: "rival-news" }, then: "propose" }]);
  t("a listener whose range no type resolves", has(await checkVenture(v, "v", naive), /listener rival-news \(naive\.config\.json\): hears rival-news@\^1, which no type checked resolves/));
  v = venture([{ id: "wrong-route", hears: "competitor-funding@^1", consumer: { route: "competitors/[id]" }, then: "project" }]);
  t("a project listener whose type has no projection to its route", has(await checkVenture(v, "v", naive), /wrong-route .*projects to competitors\/\[id\], but competitor-funding@\^1 has no projection there/));
  v = venture([], { listeners_off: ["no-such-listener"] });
  t("listeners_off naming a listener nobody defines", has(await checkVenture(v, "v", naive), /listeners_off names no-such-listener/));
  v = venture([{ id: "icp-currency", hears: "competitor-funding@^1", consumer: { decision: "x" }, criterion: { predicates: [{ id: "cur", field: "props.round.currency", op: "in", value: { read: "nowhere/file.json#x" } }] }, then: "propose" }]);
  const fact = await checkVenture(v, "v", naive);
  t("a fact file no record type lives at is a warning", fact.errors.length === 0 && has(fact, /reads nowhere\/file\.json#x, but no record type lives at nowhere\/file\.json/, "warnings"), fact);
  v = venture([], {}, [{ id: "paid", connector: "github", repo: "example/signals", carries: "signals", writes: "none" }]);
  t("an unconfirmed paid library is a warning: a pull will not read it", has(await checkVenture(v, "v", naive), /library paid is not read until a person confirms it by name/, "warnings"));
  v = venture([]);
  edit(join(v, "market", ORIGINAL), (x) => { x.subject = "globex"; });
  t("a venture's filesystem library is checked too", has(await checkVenture(v, "v", naive), /source market\/.*does not hash to its id/));
  // A person in the local library may supersede any producer's signal; types/ there is not read.
  v = venture([]);
  publish(join(v, "raw/signals"), funding({ producer: "local/dana", supersedes: "3a50ad6dfb3a46b0f160cc36", time: "2026-11-05", props: { org: { name: "Acme Robotics" }, round: { series: "seed", amount: 3500000, currency: "USD" } } }));
  const local = await checkVenture(v, "v", naive);
  t("a person's local superseding signal passes, its target found in the venture's library", local.errors.length === 0 && local.warnings.length === 0 && local.signals === 2, local);
  cpSync(join(repo, EXAMPLE_LIBRARY, "types"), join(v, "raw/signals/types"), { recursive: true });
  t("types/ in a local library is a warning", has(await checkVenture(v, "v", naive), /local library holds signals only/, "warnings"));
  publish(join(v, "raw/signals"), funding({ producer: "local/dana", time: "2026-11-09" }), { log: false });
  t("a local signal no log line lists is an error too", has(await checkVenture(v, "v", naive), /raw\/signals\/signals\/.* no log line lists it/));

  // ---- The command ----
  d = lib(); edit(join(d, ORIGINAL), (x) => { x.subject = "globex"; });
  const bad = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-signals.ts"), d, "--json"], { encoding: "utf8" });
  const body = JSON.parse(bad.stdout || "{}") as { ok?: boolean; errors?: string[] };
  t("the command exits 1 on a broken library and names the error in --json", bad.status === 1 && body.ok === false && (body.errors ?? []).some((e) => /does not hash/.test(e)), bad.stdout + bad.stderr);
  const none = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-signals.ts"), join(tmp, "missing")], { encoding: "utf8" });
  t("the command exits 2 on a folder that is not there", none.status === 2);
} catch (e) {
  t("the test ran", false, String((e as Error)?.stack ?? e));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
