// Tests for the publish lint pipeline (packages/naive/src/engine/publish-lint.ts): one fixture per stage, rule levels from
// naive.config.json, exit codes, the findings log and the --report loop.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, configFor, report } from "./publish-lint.ts";
import type { Finding } from "./publish-lint.ts";
import { validateValue } from "../records/validate.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail?: unknown) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

const ws = mkdtempSync(join(tmpdir(), "publish-lint-"));
const v = join(ws, "acme");
const w = (rel: string, x: unknown) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2)); };
const page = (meta: string, body: string) => `---\n${meta}\n---\n${body}\n`;
const rules = (fs: Finding[]) => fs.map((f) => f.rule);
const cli = (args: string[]) => spawnSync("node", [join(repo, "packages/naive/src/engine/publish-lint.ts"), "check", ...args], { encoding: "utf8" });

try {
  w("venture.json", { id: "acme", name: "Acme", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery" });
  w("evidence/survey.json", { n: 40 });
  const internal = "Our founders decide what is next by reading every interview note twice and then writing one short memo for the team";
  w("foundation/problem.json", { statement: internal });

  w("pages/clean.mdx", page("title: Clean\npublish: false", "We help you decide what to build next."));
  w("pages/leak.mdx", page("title: Leak\npublish: true", "As decided in EE-045, we ship weekly."));
  w("pages/claim.mdx", page("title: Claim", "Over 500 customers rely on us. It saves 30% of your week."));
  w("pages/claim-sourced.mdx", page("title: Sourced\nsources:\n  - evidence/survey.json", "Over 500 customers rely on us."));
  w("pages/claim-badsource.mdx", page("title: Bad\nsources: [evidence/missing.json]", "Over 500 customers rely on us."));
  w("pages/years.mdx", page("title: Years", "Founded in 2024, we read Chapter 12 together."));
  w("pages/marks.mdx", page("title: Marks", "Like Nike says, Just Do It. Unlike Amazon. Pineapple is fine."));
  w("pages/personal.mdx", page("title: Personal", "Write to jane.doe@example.com or call (555) 123-4567."));
  w("pages/secret.mdx", page("title: Secret", "Use key sk-ant-abcdefghijklmnopqrstuvwxyz123456 to start."));

  const run = async (f: string) => (await check([join(v, "pages", f)], { venture: v })).findings;

  expect("clean page has no findings", (await run("clean.mdx")).length === 0, await run("clean.mdx"));
  const lk = await run("leak.mdx");
  expect("leaks: a decision id is an error and knows the page is published", lk.some((f) => f.rule === "leaks" && f.severity === "error" && f.published), lk);
  const cl = await run("claim.mdx");
  expect("claims: numbers and customers without sources are errors", cl.filter((f) => f.rule === "claims").length === 2 && cl.every((f) => f.severity === "error"), cl);
  expect("claims: a year or a chapter number is not a claim", !rules(await run("years.mdx")).includes("claims"), await run("years.mdx"));
  expect("claims: a source that exists clears them", !rules(await run("claim-sourced.mdx")).includes("claims"), await run("claim-sourced.mdx"));
  expect("claims: a source that does not exist does not", rules(await run("claim-badsource.mdx")).includes("claims"));
  const mk = await run("marks.mdx");
  expect("marks: Nike, Just Do It, Amazon warn; Pineapple does not match Apple", ["Nike", "Just Do It", "Amazon"].every((m) => mk.some((f) => f.rule === "marks" && f.text === m && f.severity === "warn")) && !mk.some((f) => f.text === "Apple"), mk);
  const pd = await run("personal.mdx");
  expect("personal data: an email and a phone number warn", pd.filter((f) => f.rule === "personal-data").length === 2, pd);
  const sc = await run("secret.mdx");
  expect("secrets: an API key shape is an error and is masked", sc.some((f) => f.rule === "secrets" && f.severity === "error" && !f.text.includes("abcdefghij")), sc);

  // copy distance: a marketing variant that copies its internal record
  w("operations/marketing/content/launch.mdx", page("variant_of: foundation/problem.json\naudience: founders\npublish: false", internal));
  const cd = await check([join(v, "operations/marketing/content")], { venture: v });
  expect("copy distance: a copied run of ten words warns", cd.stages[0] === "copy-distance" && cd.findings.some((f) => f.rule === "copy-distance" && f.severity === "warn"), cd);
  // brand stage runs when a venture is named
  expect("brand: the stage runs when packages/naive/src/engine/brand-lint.ts exists", cd.stages.includes("brand"), cd.stages);
  expect("stages run in order", cd.stages.join(",") === "copy-distance,leaks,brand,claims,marks,personal-data,secrets", cd.stages);

  // levels from naive.config.json
  expect("defaults: leaks, claims, secrets error; others warn", JSON.stringify(configFor(v).rules) === JSON.stringify({ "copy-distance": "warn", leaks: "error", brand: "warn", claims: "error", marks: "warn", "personal-data": "warn", secrets: "error" }));
  w("naive.config.json", { publish_lint: { rules: { claims: "off", marks: "error" }, marks: ["Pineapple"], waived: [{ rule: "leaks", file: "pages/leak.mdx" }] } });
  expect("off turns a rule off", !rules(await run("claim.mdx")).includes("claims"));
  const mk2 = await run("marks.mdx");
  expect("the marks list is configurable and error raises it", mk2.length === 1 && mk2[0].text === "Pineapple" && mk2[0].severity === "error", mk2);
  const lw = await check([join(v, "pages/leak.mdx")], { venture: v });
  expect("a waived error does not fail the run", lw.ok && lw.findings[0].waived, lw);

  // CLI: exit codes, the log and --report
  const log = join(ws, "findings.jsonl");
  expect("exit 0 on a clean page", cli([join(v, "pages/clean.mdx"), "--venture", v, "--log", log]).status === 0);
  expect("exit 1 on an error", cli([join(v, "pages/secret.mdx"), "--venture", v, "--log", log]).status === 1);
  cli([join(v, "pages/leak.mdx"), "--venture", v, "--log", log]);
  expect("every run appends to the log", readFileSync(log, "utf8").trim().split("\n").length >= 2);
  const lines = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  expect("each logged line is the publish lint's and matches lint-finding.schema.json (EE-231)", lines.every((l) => l.lint === "publish" && validateValue("lint-finding.schema.json", l).status === 0), lines);
  const r = report(log, { venture: v });
  expect("report: the waived rule is counted", r.most_waived[0]?.rule === "leaks" && r.most_waived[0].waived >= 1, r);
  expect("report: a leak in a published page is found after publish", r.leaks_after_publish.some((f) => f.file === "pages/leak.mdx"), r);
  const out = cli(["--report", "--venture", v, "--log", log]);
  expect("--report prints the loop and exits 0", out.status === 0 && /most waived/.test(out.stdout) && /found after publish/.test(out.stdout), out.stdout);
  cli([join(v, "pages/clean.mdx"), "--venture", v]);
  expect("the default log is the venture's .naive/lint-findings.jsonl", existsSync(join(v, ".naive/lint-findings.jsonl")));

  // Marks (EE-214): whole words, any case, and a private name is an error whatever the rule's level.
  w("naive.config.json", { publish_lint: { marks: ["Nightjar"] } });
  w("pages/case.mdx", page("title: Case", "We build nightjar for everyone. NIGHTJAR ships soon. Nightjarring is not it."));
  const ci = await run("case.mdx");
  expect("marks: a mark matches whatever its case", ci.filter((f) => f.rule === "marks").length === 2 && ci.every((f) => f.severity === "warn"), ci);
  expect("marks: a longer word is not the mark", !ci.some((f) => /Nightjarring/i.test(f.text)), ci);
  w("marketing/publish-terms.json", { marks: [{ name: "Nightjar", private: true, why: "the product is unannounced" }] });
  const priv = await run("case.mdx");
  expect("marks: a name the venture keeps private is an error while the rule only warns", priv.filter((f) => f.rule === "marks").length === 2 && priv.every((f) => f.severity === "error") && !priv[0].at_least, priv);
  expect("marks: the private name fails the run", !(await check([join(v, "pages/case.mdx")], { venture: v })).ok);
  expect("the marks of marketing/publish-terms.json are added to the config's", configFor(v).marks.some((m) => m.name === "Nightjar" && m.private));

  // A record's copy (EE-214): the sitemap's drafted copy is linted as a page's body is.
  const sitemap = (copy: unknown) => ({ version: "1", venture: "acme", facts: {}, offerings: [], audience: { offered_to: [], partner_led: false, types: [] },
    pages: [{ path: "/", parent: null, label: "Home", type: "home", level: "home", sections: [{ item: "what", component: "Hero", need: 1, for: ["customers"], why: [], source: {}, variant: "x.mdx", draft_copy: copy }] }],
    omitted: [], handoff: { to: "engineering" } });
  w("operations/marketing/sitemap.json", sitemap({ status: "draft", text: "As decided in EE-045, over 500 customers rely on Nightjar. Write to jane.doe@example.com." }));
  const sm = await check([join(v, "operations/marketing/sitemap.json")], { venture: v });
  const found = (rule: string) => sm.findings.filter((f) => f.rule === rule);
  expect("record copy: an internal term in drafted copy is a leak", found("leaks").length === 1 && found("leaks")[0].severity === "error", sm.findings);
  expect("record copy: an uncited number is a claim", found("claims").length === 1, sm.findings);
  expect("record copy: a private name is an error", found("marks").length === 1 && found("marks")[0].severity === "error", sm.findings);
  expect("record copy: an email address warns", found("personal-data").length === 1, sm.findings);
  expect("record copy: every finding names the field it sits in", sm.findings.every((f) => f.field === "pages[0].sections[0].draft_copy.text"), sm.findings);
  expect("record copy: drafted copy is not published yet", sm.findings.every((f) => !f.published), sm.findings);
  w("operations/marketing/sitemap.json", sitemap({ status: "published", text: "Over 500 customers rely on us.", sources: ["evidence/survey.json"] }));
  const cited = await check([join(v, "operations/marketing/sitemap.json")], { venture: v });
  expect("record copy: a source that exists clears the claim", !cited.findings.some((f) => f.rule === "claims"), cited.findings);
  expect("record copy: published copy is marked published", cited.ok, cited.findings);

  // A field a person approved as public is copy too; an internal field is not.
  w("people/people.json", { people: [{ id: "founder", name: "Torian" }] });
  w("foundation/core.json", { statement: "We ship in EE-045 time.", notes: "internal, EE-045 again" });
  const { setPublic } = await import("./visibility.ts");
  setPublic(v, "foundation/core.json", "statement", { by: "Torian" });
  const pub = await check([join(v, "foundation/core.json")], { venture: v });
  expect("record copy: a public field is linted", pub.findings.some((f) => f.rule === "leaks" && f.field === "statement"), pub.findings);
  expect("record copy: an internal field is not", !pub.findings.some((f) => f.field === "notes"), pub.findings);

  // A path that is not there fails the check: a typo never reads as a clean pass.
  const absent = await check([join(v, "content/no-such-page.mdx")], { venture: v });
  expect("a missing path is an error, not a pass", !absent.ok && absent.findings.some((f) => f.rule === "missing-path" && f.severity === "error"), absent.findings);

  // The config is read where the router reads it: meta/naive.config.json in a structured venture.
  const s = join(ws, "struct");
  mkdirSync(join(s, "meta"), { recursive: true });
  writeFileSync(join(s, "venture.json"), JSON.stringify({ id: "s", name: "S", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", layout: "structured" }));
  writeFileSync(join(s, "meta/naive.config.json"), JSON.stringify({ publish_lint: { rules: { marks: "error" }, marks: ["Pineapple"] } }));
  const meta = configFor(s);
  expect("a structured venture's meta/naive.config.json is the config", meta.rules.marks === "error" && meta.marks.length === 1 && meta.marks[0].name === "Pineapple", meta);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
