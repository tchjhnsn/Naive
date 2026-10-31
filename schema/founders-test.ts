// Tests the founders folder (schema/founders.ts): a founder exists before any venture, owns ideas,
// references and inspirations, keeps the real name and secrets in _private/, and only the founder
// confirms their profile.
//
//   node schema/founders-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { routes } from "../interface/router.mjs";
import { addIdea, addInspiration, addReference, check, cslName, init, link, show } from "./founders.ts";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const put = (f: string, o: unknown): void => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 2) + "\n"); };
type Rec = { id?: string; status?: string; ventures?: string[]; private?: boolean; founder?: string };
const read = (f: string): Rec => JSON.parse(readFileSync(f, "utf8")) as Rec;
const valid = (schema: string, f: string): boolean => spawnSync("python3", ["-I", join(repo, "schema/validate.py"), "--schema", schema, "--file", f], { encoding: "utf8" }).status === 0;
const fails = (ws: string, re: RegExp): boolean => check(ws).some((p) => !p.startsWith("warn:") && re.test(p));

const ws = mkdtempSync(join(tmpdir(), "founders-test-"));
put(join(ws, "workspace.json"), { schema: "everything-ecosystem", ventures: ["ventures/"], name: "Naive workspace" });

// A founder exists before any venture.
const f = init(ws, { handle: "tj", now: new Date("2026-10-31T00:00:00Z") });
expect("init makes an opaque person id", /^p-[0-9a-f]{8}$/.test(f.id), f.id);
expect("init: founder.json is valid", valid("workspace-founder.schema.json", join(ws, "founders/tj/founder.json")));
expect("init: workspace.json points at the founder", read(join(ws, "workspace.json")).founder === "founders/tj/founder.json");
expect("init: the real name has a _private/ home marked private", read(join(ws, "founders/tj/_private/person.json")).private === true);
expect("init: valid _private/ record", valid("founder-private.schema.json", join(ws, "founders/tj/_private/person.json")));
expect("a founder with no venture passes", check(ws).length === 0, check(ws).join("; "));
let threw = false; try { init(ws, { handle: "tj" }); } catch { threw = true; }
expect("init refuses an existing handle", threw);
threw = false; try { init(ws, { handle: "Not OK" }); } catch { threw = true; }
expect("init refuses a handle that is not lowercase", threw);

// Ideas, references and inspirations belong to the founder.
const idea = addIdea(ws, { handle: "tj", text: "A framework that helps people realize they are founders", now: new Date("2026-10-31T00:00:00Z") });
expect("idea: valid and verbatim", valid("founder-idea.schema.json", join(ws, `founders/tj/ideas/${idea.id}.json`)) && idea.text.startsWith("A framework"));
const ref = addReference(ws, { handle: "tj", type: "post-weblog", title: "The 18 Mistakes That Kill Startups", authors: ["Paul Graham"], issued: "2006-10", url: "https://paulgraham.com/startupmistakes.html", why: "Single founder is mistake one" });
expect("reference: valid CSL names", valid("founder-reference.schema.json", join(ws, `founders/tj/references/${ref.id}.json`)) && ref.author?.[0]?.family === "Graham");
expect("reference: added by the founder by default", ref.added_by?.kind === "person" && ref.added_by.id === f.id);
expect("cslName: Family, Given", cslName("Graham, Paul").given === "Paul");
expect("cslName: one word stays literal", cslName("YC").literal === "YC");
const pub = addInspiration(ws, { handle: "tj", name: "Ada Lovelace", zeal: "She saw it before it existed" });
const priv = addInspiration(ws, { handle: "tj", zeal: "Taught me to finish" });
expect("inspiration: a public figure is named", pub.public === true && pub.name === "Ada Lovelace");
expect("inspiration: a private person is opaque", priv.public === false && !priv.name && /^i-/.test(priv.id));
expect("inspirations are valid", valid("founder-inspiration.schema.json", join(ws, `founders/tj/inspirations/${priv.id}.json`)));

// A venture links to its founder by role, and cites the idea it grew from.
put(join(ws, "ventures/mentura/venture.json"), { id: "mentura", name: "Mentura" });
link(ws, { handle: "tj", venture: "ventures/mentura", role: "founder", idea: idea.id, now: new Date("2026-10-31T00:00:00Z") });
const linked = read(join(ws, `founders/tj/ideas/${idea.id}.json`));
expect("link marks the idea in-venture", linked.status === "in-venture" && linked.ventures?.[0] === "ventures/mentura");
expect("a linked founder passes", check(ws).length === 0, check(ws).join("; "));
threw = false; try { link(ws, { handle: "tj", venture: "ventures/none", role: "founder" }); } catch { threw = true; }
expect("link refuses a venture that does not exist", threw);

// Only the founder confirms the profile.
const file = join(ws, "founders/tj/founder.json");
const good = read(file);
put(file, { ...good, profile: { summary: "drafted", confirmed: true }, drafted_by: { kind: "agent", id: "mentor" }, confirmed_by: { kind: "agent", id: "mentor", at: "2026-10-31" } });
expect("fails: an agent confirms the profile", fails(ws, /confirmed only by the founder/));
put(file, { ...good, profile: { summary: "drafted", confirmed: true } });
expect("fails: profile.confirmed with no confirmed_by", fails(ws, /needs confirmed_by/));
put(file, { ...good, profile: { summary: "drafted", confirmed: true }, confirmed_by: { kind: "person", id: good.id, at: "2026-10-31" } });
expect("the founder's own confirmation passes", check(ws).length === 0, check(ws).join("; "));
expect("confirmed founder.json is valid", valid("workspace-founder.schema.json", file));

// Secrets, the puzzle and names stay in _private/.
put(join(ws, "founders/tj/secrets/thesis.json"), { text: "x" });
expect("fails: secrets outside _private/", fails(ws, /secrets and the founder puzzle go in/));
rmSync(join(ws, "founders/tj/secrets"), { recursive: true });
put(join(ws, "founders/tj/puzzle/report.json"), { text: "x" });
expect("fails: the puzzle outside _private/", fails(ws, /secrets and the founder puzzle go in/));
rmSync(join(ws, "founders/tj/puzzle"), { recursive: true });
put(join(ws, "founders/tj/_private/secrets/thesis.json"), { text: "x" });
expect("fails: a _private/ record without private: true", fails(ws, /says private: true/));
put(join(ws, "founders/tj/_private/secrets/thesis.json"), { private: true, note: "x" });
put(join(ws, `founders/tj/inspirations/${priv.id}.json`), { ...priv, name: "A Private Person" });
expect("fails: a private person named outside _private/", fails(ws, /only a public figure is named/));
put(join(ws, `founders/tj/inspirations/${priv.id}.json`), priv);
expect("show never reads _private/", !show(ws, "tj").includes("thesis") && show(ws, "tj").includes("Ada Lovelace"));

// References and links resolve.
put(join(ws, `founders/tj/ideas/${idea.id}.json`), { ...linked, references: ["no-such-ref"] });
expect("fails: an idea cites a missing reference", fails(ws, /cites reference no-such-ref/));
put(join(ws, `founders/tj/ideas/${idea.id}.json`), { ...linked, status: "dropped" });
expect("fails: a dropped idea with no note", fails(ws, /dropped idea needs a note/));
put(join(ws, `founders/tj/ideas/${idea.id}.json`), linked);
put(join(ws, "founders/xy/founder.json"), { id: good.id, handle: "other", created: "2026-10-31" });
expect("fails: a handle that does not match its folder", fails(ws, /does not match its folder/));
expect("fails: two founders with one id", fails(ws, /is also founders/));
put(join(ws, "founders/xy/founder.json"), { id: "p-1b1b1b1b", handle: "xy", created: "2026-10-31", ventures: [{ venture: "ventures/mentura", role: "founder", since: "2026-10-31" }] });
expect("a venture may have several founders", check(ws).length === 0, check(ws).join("; "));
rmSync(join(ws, "founders/xy"), { recursive: true });

// Founders are workspace records: no venture route reads them.
const leaks = (routes() as { route?: string; files?: string[] }[]).filter((r) => (r.files ?? []).some((x) => x.startsWith("founders/") || x.includes("_private/")));
expect("no route reads founders/ or _private/", leaks.length === 0, JSON.stringify(leaks.map((r: { route?: string }) => r.route)));

// The example founder passes.
expect("the example workspace's founders pass", check(join(repo, "schema/examples/workspace")).length === 0, check(join(repo, "schema/examples/workspace")).join("; "));

rmSync(ws, { recursive: true, force: true });
console.log(failed ? `${failed} failed` : "founders: all pass");
process.exit(failed ? 1 : 0);
