// Tests the validation study's support (VALIDATION_STUDY_DESIGN section 5): the interview, feedback and bug
// records, the shared telemetry schema and writer, the plugin beta's gate and the feedback router. No network:
// Jev and the telemetry sender are stubs.
//
//   node schema/validation-study-test.mjs

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, resolve } from "../interface/router.mjs";
import { blocked, giveFeedback, manifest, status, unlock } from "./beta-gate.mjs";
import { route } from "./feedback-route.mjs";
import { events, flush, record, refuse, ventureHash } from "./telemetry.mjs";
import { summary } from "./bugs.mjs";
import { check } from "./check-validation-study.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "validation-study-test-"));
const env = { ...process.env, MENTURA_WORKSPACE: ws };
delete env.MENTURA_ACTOR_ID; delete env.TYPESAFE_API_KEY;
delete process.env.MENTURA_ACTOR_ID;
const cli = (...a) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...a], { encoding: "utf8", env });
const naive = (...a) => spawnSync("node", [join(repo, "interface/cli/naive.mjs"), ...a], { encoding: "utf8", env });
const json = (o) => JSON.stringify(o, null, 2) + "\n";
const put = (f, o) => { mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, json(o)); };
const valid = (schema, o) => { const f = join(ws, `v-${Math.random().toString(36).slice(2)}.json`); writeFileSync(f, JSON.stringify(o)); const r = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", schema, "--file", f], { encoding: "utf8" }); rmSync(f); return r.status === 0; };

const init = cli("init", join(ws, "ventures/vs"), "--id", "vs", "--layers", "purpose");
expect("a venture to test in", init.status === 0, init.stderr);
const dir = join(ws, "ventures/vs");
const cfg = (c) => writeFileSync(join(dir, "naive.config.json"), json(c));

// Records.
{
  const interview = { id: "i-01", person: "p-01", icp: "solo-founder", consent: { given: true, at: "2026-10-30T10:00:00Z", method: "verbal-recorded" }, transcript: { source: "raw/sources/i-01" },
    bottlenecks: ["deciding what to build next"], current_solutions: [{ for: "deciding what to build next", what_it_does: "a Notion list", what_it_doesnt: "rank by value" }],
    chosen_problem: "deciding what to build next", prediction: { with_naive: "decides in a day", status_quo: "a week" }, follow_up: { date: "2026-11-13", outcome_vs_prediction: "matched", evidence: ["e-1"] } };
  expect("an interview record is valid", valid("validation-interview.schema.json", interview));
  expect("an interview needs consent", !valid("validation-interview.schema.json", { ...interview, consent: undefined }));
  expect("an interview's person is an anonymised ref, not a name", !valid("validation-interview.schema.json", { ...interview, person: "Jane Doe" }));
  expect("a bug needs severity P0 to P3", valid("bug.schema.json", { id: "b-1", title: "crash", severity: "P1", status: "open", found_in: "0.5.0" }) && !valid("bug.schema.json", { id: "b-1", title: "crash", severity: "P5", status: "open", found_in: "0.5.0" }));
  expect("a feedback record is valid", valid("validation-feedback.schema.json", { id: "f-1", at: "2026-10-30T10:00:00Z", tester: "t", capability: "venture", checkpoint: "venture-created", answers: { ease: 4 }, routed_to: "validation/feedback", routing: { model: "fallback", confidence: 0.5, fallback: true } }));
  const routes = ["validation/interviews/[id]", "validation/feedback/[id]", "product/bugs/[id]"];
  const r = await call({ venture: "vs", route: "validation/interviews", action: "layout", workspace: ws });
  expect("the router has routes for interviews, feedback and bugs", r.ok && routes.every((x) => resolve(x).r?.route === x && resolve(x).r.actions.includes("write")), JSON.stringify(r).slice(0, 200));
  const w = await call({ venture: "vs", route: "validation/interviews/i-01", action: "write", input: interview, actor: "person", workspace: ws });
  expect("a person writes an interview through the router", w.ok && existsSync(join(dir, "validation/interviews/i-01.json")), JSON.stringify(w));
  const problems = check(dir);
  expect("check-validation-study names an interview whose ICP profile is missing", problems.some((p) => /no ICP profile solo-founder/.test(p)), problems.join("; "));
  put(join(dir, "product/bugs/b-1.json"), { id: "b-1", title: "setup crashes", severity: "P0", status: "open", found_in: "0.5.0" });
  put(join(dir, "product/bugs/b-2.json"), { id: "b-2", title: "typo", severity: "P3", status: "open", found_in: "0.5.0" });
  put(join(dir, "product/bugs/b-3.json"), { id: "b-3", title: "slow", severity: "P1", status: "fixed", found_in: "0.5.0", fixed_in: "0.5.1" });
  const s = summary(dir);
  expect("naive bugs: not stable while a P0 is open; fixed and P3 bugs do not count", !s.stable && s.blocking.length === 1 && s.blocking[0].id === "b-1", JSON.stringify(s));
  const out = naive("bugs", "--venture", dir);
  expect("naive bugs prints the open P0/P1", out.status === 0 && /not stable: 1 open P0\/P1/.test(out.stdout) && /b-1/.test(out.stdout), out.stdout + out.stderr);
}

// Telemetry.
{
  const e = { name: "route.write", capability: "foundation", session: "s-1234", duration_ms: 12, outcome: "ok", source: "plugin-beta" };
  expect("telemetry is off by default: nothing is written", !record(dir, e).written && !existsSync(join(dir, ".naive/telemetry.jsonl")));
  cfg({ telemetry: { enabled: true } });
  const w = record(dir, e);
  expect("opted in, an event is written to .naive/telemetry.jsonl with the venture id hashed", w.written && events(dir).length === 1 && events(dir)[0].venture === ventureHash(dir, "vs") && !JSON.stringify(events(dir)).includes('"vs"'), JSON.stringify(w));
  const salted = mkdtempSync(join(tmpdir(), "vs-salt-"));
  writeFileSync(join(salted, "venture.json"), JSON.stringify({ id: "vs" }));
  expect("the venture hash is salted per venture: the bare id's hash and another venture's hash of the same id differ", events(dir)[0].venture !== createHash("sha256").update("vs").digest("hex").slice(0, 16) && ventureHash(salted, "vs") !== events(dir)[0].venture);
  expect("telemetry refuses free text in at", !record(dir, { ...e, at: "Jane Doe said pricing is too high" }).written);
  expect("telemetry refuses free text in source", !record(dir, { ...e, source: "customer list: Bob, Alice" }).written && !refuse({ ...events(dir)[0], source: "mentura" }));
  expect("an event is valid against telemetry.schema.json", valid("telemetry.schema.json", events(dir)[0]));
  expect("telemetry refuses record contents", !record(dir, { ...e, input: { statement: "secret plan" } }).written);
  expect("telemetry refuses a _private path", !record(dir, { ...e, name: "route.read", capability: "foundation", session: "_private/x" }).written && !valid("telemetry.schema.json", { ...events(dir)[0], path: "_private/people.json" }));
  let sent = [];
  const send = async (b) => { sent = sent.concat(b); };
  expect("nothing is sent while telemetry.send is off", (await flush(dir, { send })).sent === 0 && sent.length === 0);
  cfg({ telemetry: { enabled: true, send: true } });
  expect("send without a person who set it sends nothing", (await flush(dir, { send })).sent === 0 && sent.length === 0);
  cfg({ telemetry: { enabled: true, send: true, set_by: { person: "Torian", at: "2026-10-30T10:00:00Z" } } });
  expect("a person turned sending on: waiting events are sent once", (await flush(dir, { send })).sent === 1 && (await flush(dir, { send })).sent === 0 && sent.length === 1);
  expect("check-config accepts the telemetry and beta settings", spawnSync("node", [join(repo, "schema/check-config.mjs"), dir], { encoding: "utf8", env }).status === 0);
  rmSync(join(dir, "naive.config.json"));
}

// Feedback routing (stubs only).
{
  const fb = { capability: "venture", answers: { confusing: "setup crashed when I named the venture" } };
  const noKey = await route(fb, { jev: async () => { throw new Error("must not be called"); }, env: {} });
  expect("without TYPESAFE_API_KEY the fallback routes, no model", noKey.fallback && noKey.destination === "product/bugs" && noKey.model === "fallback", JSON.stringify(noKey));
  const sure = await route(fb, { jev: async () => ({ destination: "decisions", confidence: 0.97 }), env: { TYPESAFE_API_KEY: "test" } });
  expect("with the key, Jev's answer at 0.95 or more is accepted", sure.model === "jev" && sure.destination === "decisions" && !sure.fallback, JSON.stringify(sure));
  const unsure = await route(fb, { jev: async () => ({ destination: "decisions", confidence: 0.9 }), fallback: () => ({ destination: "inbox", confidence: 0.6, model: "stub" }), env: { TYPESAFE_API_KEY: "test" } });
  expect("below 0.95 the injected fallback decides", unsure.fallback && unsure.destination === "inbox" && unsure.model === "stub", JSON.stringify(unsure));
  const broken = await route(fb, { jev: async () => { throw new Error("network"); }, env: { TYPESAFE_API_KEY: "test" } });
  expect("a Jev failure falls back", broken.fallback && broken.destination === "product/bugs");
}

// The beta gate.
{
  const m = manifest();
  expect("the manifest: core is venture, docket and foundation, in order", m.capabilities.filter((c) => c.core).map((c) => c.id).join() === "venture,docket,foundation" && m.capabilities.findIndex((c) => !c.core) === 3);
  expect("the gate is off by default: a non-core route is not blocked", blocked(dir, "validation/solution", { tester: "t1" }) === null);
  const off = await call({ venture: "vs", route: "ideas/map", action: "read", workspace: ws });
  expect("off, the router behaves as before", !off.beta_locked, JSON.stringify(off).slice(0, 200));
  cfg({ beta: { enabled: true } });
  expect("on, core routes are open", blocked(dir, "foundation/telos", { tester: "t1" }) === null && blocked(dir, "decisions/d-1", { tester: "t1", table: "decisions/[id]" }) === null);
  expect("on, feedback and bugs are always open", blocked(dir, "validation/feedback/x", { tester: "t1", table: "validation/feedback/[id]" }) === null && blocked(dir, "product/bugs/b-1", { tester: "t1" }) === null);
  const b = blocked(dir, "ideas/map", { tester: "t1" });
  expect("on, the first non-core capability is locked until feedback on foundation", b?.capability === "ideas" && b.needs.capability === "foundation" && /naive beta feedback foundation/.test(b.message), JSON.stringify(b));
  process.env.MENTURA_ACTOR_ID = "t1";
  const refused = await call({ venture: "vs", route: "ideas/map", action: "read", workspace: ws, actor_id: "t1" });
  expect("the router refuses a locked capability's route, naming the feedback to give", !refused.ok && refused.beta_locked === "ideas" && /feedback on foundation/.test(refused.error), JSON.stringify(refused).slice(0, 300));
  expect("unlock before the feedback is refused", !unlock(dir, "t1").ok);
  const missing = await giveFeedback(dir, "foundation", { wrong: "the ICP" }, { tester: "t1", routing: { env: {} } });
  expect("feedback missing a required answer is refused, naming the question", !missing.ok && /sounds_like_you/.test(missing.error));
  expect("feedback on a locked capability is refused", !(await giveFeedback(dir, "validation", { next_test: "yes", trust: 3 }, { tester: "t1", routing: { env: {} } })).ok);
  const given = await giveFeedback(dir, "foundation", { sounds_like_you: "4", wrong: "the ICP is too broad" }, { tester: "t1", routing: { env: {} } });
  expect("checkpoint feedback is recorded as validation/feedback/<id>.json with its routing", given.ok && existsSync(given.written) && given.record.routing.fallback === true && given.next.ready, JSON.stringify(given));
  expect("the feedback record is valid", valid("validation-feedback.schema.json", given.record));
  expect("another tester's feedback does not unlock for t2", !unlock(dir, "t2").ok);
  const u = unlock(dir, "t1");
  expect("unlock opens the next capability for that tester, kept in .naive/beta.json", u.ok && u.unlocked === "ideas" && JSON.parse(readFileSync(join(dir, ".naive/beta.json"), "utf8")).testers.t1.unlocked.includes("ideas"));
  expect("the unlocked route is open; the one after stays locked", blocked(dir, "ideas/map", { tester: "t1" }) === null && blocked(dir, "validation/solution", { tester: "t1" })?.needs.capability === "ideas");
  const st = status(dir, "t1");
  expect("status lists each capability, open or locked, and the next step", st.enabled && st.capabilities.find((c) => c.id === "ideas").unlocked && st.next.capability === "validation" && !st.next.ready);
  const cliStatus = naive("beta", "status", "--tester", "t1", "--venture", dir);
  expect("naive beta status", cliStatus.status === 0 && /next: validation/.test(cliStatus.stdout), cliStatus.stdout + cliStatus.stderr);
  const form = naive("beta", "feedback", "ideas", "--venture", dir);
  expect("naive beta feedback <capability> with no answers shows the form", form.status === 0 && /found_home \(required\)/.test(form.stdout), form.stdout + form.stderr);
  const fbCli = naive("beta", "feedback", "ideas", "--answer", "found_home=yes", "--tester", "t1", "--venture", dir);
  const unCli = naive("beta", "unlock", "--tester", "t1", "--venture", dir);
  expect("naive beta feedback and unlock from the CLI", fbCli.status === 0 && unCli.status === 0 && /unlocked validation/.test(unCli.stdout), fbCli.stdout + fbCli.stderr + unCli.stdout + unCli.stderr);
  expect("check-validation-study passes the feedback records", !check(dir).some((p) => /feedback/.test(p)));
  delete process.env.MENTURA_ACTOR_ID;
}

rmSync(ws, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
