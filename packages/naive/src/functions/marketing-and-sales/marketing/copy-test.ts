// Tests for the site's words before the site (EE-216): the gap report names every element a page shows and the
// state of the records under it, drafting files one decision per element with options a person picks between,
// a person's choice writes the record, the copy gate refuses a build whose text no one approved and names the
// elements, and the one-shot path is a person's alone and marks what it builds unapproved.
//
//   node packages/naive/src/functions/marketing-and-sales/marketing/copy-test.ts
//
// The drafting runs against a stand-in harness written here, as the loop tests do: no model and no network.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { approve, merge, reopen } from "../../../engine/decisions.ts";
import { draft, elementId, filesOfRef, gate, oneShot, parseAnswer, report, schemaError } from "./copy.ts";
import type { Answer } from "./copy.ts";
import { build } from "./publish-build.ts";
import type { MarketingMessage } from "../../../records/types/records.d.ts";

const repo = new URL("../../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail?: unknown) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

const v = mkdtempSync(join(tmpdir(), "site-copy-"));
const out = join(v, "out");
const w = (rel: string, x: unknown) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2) + "\n"); };
const json = <T,>(rel: string): T => JSON.parse(readFileSync(join(v, rel), "utf8")) as T;

w("venture.json", { id: "copyco", name: "Copyco", type: "software-startup", parent: null, owner: "self", status: "active", phase: "discovery",
  layers: { purpose: true, knowledge: false, operations: true, evidence: false, governance: true, interface: false } });
w("people/people.json", { venture: "copyco", mode: "solo", people: [{ id: "founder", name: "Torian", role: "founder" }] });
// One upstream record exists and one does not, so the report has both states to show.
w("foundation/problem.json", { venture: "copyco", statement: "A founder cannot tell which decision matters most this week.", evidence: [] });
// The site the venture plans: one page, two sections, as site/plan.ts writes it.
const section = (item: string, component: string, record: string, file: string | null) => ({ item, label: item === "what" ? "What it is, in one line" : "A clear next step",
  component, need: 1, required: "home", for: ["customers"], why: ["customers need it"], source: { record, file, exists: file !== null }, variant: `marketing/content/home/${item}.mdx` });
w("operations/marketing/sitemap.json", {
  version: "0.1.0", venture: "copyco", name: "Copyco", phase: "discovery", planned_by: "conventions", facts: {}, offerings: [],
  audience: { offered_to: [], partner_led: false, types: [] },
  pages: [{ path: "/", parent: null, label: "Home", type: "home", level: "home", sections: [section("what", "Hero", "venture", "venture.json"), section("next-step", "CallToAction", "validation-go-to-market", null)] }],
  omitted: [], handoff: { to: "engineering" },
});

// --- 1. The gap report: every element a page shows, and the state of what it comes from ---

const r1 = report(v);
const ids = r1.elements.map((e) => e.element);
expect("every element a page shows is listed: the site's chrome, then each section the sitemap plans", ids.join(",") === "tagline,footer,home-what,home-next-step", ids);
expect("every element starts missing, with the record that would hold it", r1.elements.every((e) => e.state === "missing" && e.file === `marketing/message/${e.element}.json`), r1.elements);
expect("the report says which element is a chrome element and where each section's element sits", r1.elements[0].chrome === true && r1.elements[2].page === "/" && r1.elements[2].item === "what", r1.elements);
expect("a section's element takes its kind from the marketing matrix: a next step is the primary call to action", r1.elements[3].kind === "cta-primary" && r1.elements[2].kind === "headline", r1.elements.map((e) => e.kind));
expect("the tagline's own record is missing because venture.json holds no tagline, though the file is there",
  r1.elements[0].from[0].record === "foundation/core#brand.tagline" && r1.elements[0].from[0].file === "venture.json" && r1.elements[0].from[0].state === "missing", r1.elements[0].from);
expect("an upstream record that exists reads live, and one that does not reads missing",
  report(v, { page: "/" }).elements.length === 4 && r1.elements[3].from[0].state === "missing", r1.elements[3].from);
expect("the report names the sitemap it read and says nothing is approved yet", r1.sitemap?.file === "operations/marketing/sitemap.json" && r1.unapproved.length === 4 && r1.approval.mode === "per-element", r1.sitemap);
expect("a reference resolves to the files of its route, and a view of the venture record reads venture.json",
  filesOfRef("foundation/problem").files.includes("foundation/problem.json") && filesOfRef("foundation/core#brand.tagline").files[0] === "venture.json", filesOfRef("foundation/core"));
expect("an element's id is the page and the item, the one name the records and the report agree on", elementId("/", "what") === "home-what" && elementId("/about", "team") === "about-team");

// --- 2. The copy gate: no design and no page before the text is approved ---

w("naive.config.json", { publish_build: { channels: { site: { outputs: ["generated/venture-facts.json"], builders: [relative(v, join(repo, "packages/naive/src/functions/marketing-and-sales/marketing/fixtures/facts.ts"))] } } } });
const refused = build("site", v, { out });
expect("the build is refused before anything is compiled, at the copy stage", !refused.ok && refused.stage === "copy", refused);
expect("the refusal names every element whose words no one approved, and what to do about each",
  !refused.ok && refused.errors.some((e) => e.includes("marketing/message/home-what.json")) && refused.errors.some((e) => e.includes("naive copy draft --element tagline")), refused);
const bare = mkdtempSync(join(tmpdir(), "copy-bare-"));
writeFileSync(join(bare, "venture.json"), JSON.stringify({ id: "bare", phase: "discovery" }));
expect("a venture that plans no page passes the gate: no sitemap is no site", gate(bare).ok && report(bare).sitemap === null, gate(bare));

// --- 3. Drafting: options, never one answer ---

/** A stand-in harness: it answers the way an agent is asked to, with two candidates per element and no prose. */
const harness = (prompt: string): string => {
  const asked = [...prompt.matchAll(/^### ([a-z0-9-]+) \(([a-z-]+)\)$/gm)].map((m) => ({ element: m[1], kind: m[2] }));
  const body = (e: { element: string; kind: string }, text: string): MarketingMessage => ({ version: "0.1.0", id: e.element, kind: e.kind as MarketingMessage["kind"], text,
    ...(e.kind === "cta-primary" ? { destination: { kind: "none" as const } } : {}), cites: [{ record: "foundation/problem", why: "the problem it names" }] });
  return `Here are the drafts.\n\`\`\`json\n${JSON.stringify({ elements: asked.map((e) => ({ element: e.element,
    candidates: [{ id: "a", label: "From the problem", why: "It names a pain the reader feels", body: body(e, `${e.element}: the decision that matters is the hard part.`) },
      { id: "b", label: "From what you get", why: "It says what the reader gets", body: body(e, `${e.element}: your whole business in one place.`) }] })) })}\n\`\`\``;
};

const printed = draft(v, { element: "home-what", print: true });
expect("the prompt names the element, what it is, and the records it may draw on, with their state",
  printed.prompt.includes("### home-what (headline)") && printed.prompt.includes("venture.json (live") && !printed.answer, printed.prompt.slice(-400));
expect("the prompt asks for two or three candidates and for JSON alone", /two or three candidates/.test(printed.prompt) && /Answer with JSON and nothing else/.test(printed.prompt));

const bad = draft(v, { element: "home-what", propose: true, ask: () => "I would rather write prose." });
expect("a harness that answers no JSON files nothing and says so", bad.error === "the harness answered no JSON object" && bad.proposed[0].candidates?.length === 0, bad);

const d = draft(v, { propose: true, ask: harness });
expect("one decision is filed per element to draft, beside the record it decides", d.proposed.length === 4 && existsSync(join(v, "marketing/message/decisions/home-what.decision.json")), d.proposed);
const dec = json<{ status: string; answer: string | null; question: string; note: string; class: string; decides: { path: string }; candidates: { id: string; proposed_by: { kind: string }; body: { text: string } }[] }>("marketing/message/decisions/home-what.decision.json");
expect("each decision is open, decides that element's record, and holds the options an agent drafted",
  dec.status === "open" && dec.answer === undefined && dec.decides.path === "marketing/message/home-what.json" && dec.candidates.length === 2 && dec.candidates.every((c) => c.proposed_by.kind === "agent"), dec);
expect("the question asks which words, and the note names what the words rest on and how the founder answers",
  /^Which words for/.test(dec.question) && dec.note.includes("It comes from: venture.json (live)") && /Only you choose/.test(dec.note), dec.note);
const stepNote = json<{ note: string }>("marketing/message/decisions/home-next-step.decision.json").note;
expect("an element whose upstream record is missing says so, so no one mistakes the words for settled",
  /is not settled yet/.test(stepNote) && stepNote.includes("validation-go-to-market"), stepNote);
expect("the founder's decision goes to them: the class is the public commitment one", dec.class === "public-commitment", dec.class);
const r2 = report(v);
expect("the report now reads each element as undecided, with how many options are on the table",
  r2.elements.every((e) => e.state === "undecided" && e.candidates === 2) && r2.missing.length === 0 && r2.unapproved.length === 4, r2.elements.map((e) => [e.element, e.state, e.candidates]));
const again = draft(v, { propose: true, ask: harness });
expect("a rerun keeps the decisions already filed and adds no option an agent already proposed",
  again.proposed.every((p) => p.filed === "kept" && p.candidates?.length === 0) && json<{ candidates: unknown[] }>("marketing/message/decisions/home-what.decision.json").candidates.length === 2, again.proposed);
expect("a draft that is not a message element is never filed", schemaError({ id: "x", kind: "headline" } as MarketingMessage) !== null && schemaError(dec.candidates[0].body as MarketingMessage) === null);
const answer: Answer | undefined = parseAnswer(harness(printed.prompt)).answer;
expect("the harness's answer is read out of its prose", answer?.elements[0]?.candidates.length === 2, answer?.elements[0]);

// --- 4. A person picks, and the merge writes the record ---

for (const e of ["tagline", "footer", "home-what", "home-next-step"]) {
  const chosen = approve(v, `copy-${e}`, { by: "Torian", answer: e === "home-what" ? "b" : "a" });
  const written = merge(v, `copy-${e}`, { by: "Torian" });
  if (!chosen.ok || !written.ok) expect(`a person chooses the words for ${e}`, false, { chosen, written });
}
const home = json<MarketingMessage>("marketing/message/home-what.json");
expect("the option the person chose is the record, whole", home.kind === "headline" && home.text.includes("your whole business in one place") && home.cites[0].record === "foundation/problem", home);
expect("the options not chosen stay on the decision", json<{ candidates: unknown[]; answer: string }>("marketing/message/decisions/home-what.decision.json").candidates.length === 2);
const r3 = report(v);
expect("every element now reads approved, with its words", r3.elements.every((e) => e.state === "live" && !!e.text) && r3.unapproved.length === 0, r3.elements.map((e) => [e.element, e.state]));
expect("the copy gate passes once a person stands behind every element", gate(v).ok && gate(v).unapproved.length === 0, gate(v));
const built = build("site", v, { out });
expect("the build runs, and records that the text was approved element by element",
  built.ok && built.copy.approved === true && built.copy.mode === "per-element" && built.copy.unapproved.length === 0, built);

// --- 5. The one-shot path: a person's choice, recorded, and what it builds is unapproved ---

rmSync(join(v, "marketing/message/home-next-step.json"));
expect("one element taken away refuses the build again", !build("site", v, { out }).ok && gate(v).unapproved.join() === "home-next-step", gate(v));
expect("the one-shot path needs a person's name", /a person's choice/.test(oneShot(v).error ?? ""), oneShot(v));
expect("a name that is nobody in this venture is refused: only a person skips approval", /only a person approves/.test(oneShot(v, { by: "Mallory" }).error ?? ""), oneShot(v, { by: "Mallory" }));
const skip = oneShot(v, { by: "Torian", why: "The page has to go up today" });
expect("a person skips approving the text, and the elements skipped are recorded", skip.ok && skip.skipped?.join() === "home-next-step" && skip.approval?.mode === "one-shot", skip);
const oneShotDecision = json<{ status: string; answer: string; note: string; provenance: { approved_by: string; approved_at: string; reasons?: { claim: string }[] } }>("decisions/site-copy-one-shot.decision.json");
expect("it is a decided decision with who chose it, when, why, and what it costs",
  oneShotDecision.status === "decided" && oneShotDecision.answer === "one-shot" && oneShotDecision.provenance.approved_by === "Torian"
  && !!oneShotDecision.provenance.approved_at && oneShotDecision.provenance.reasons?.[0]?.claim === "The page has to go up today"
  && /words no one approved/.test(oneShotDecision.note) && /Reversible/.test(oneShotDecision.note), oneShotDecision);
expect("a refused name left no record of itself", !oneShotDecision.note.includes("Mallory"), oneShotDecision.note);
expect("the report carries the person's own reason", report(v).approval.why === "The page has to go up today", report(v).approval);
expect("the gap report says plainly that the text is not being approved", report(v).approval.chosen_by === "Torian" && report(v).approval.mode === "one-shot", report(v).approval);
const loose = build("site", v, { out });
expect("the build now runs, and marks what it built unapproved, naming the elements",
  loose.ok && loose.copy.approved === false && loose.copy.mode === "one-shot" && loose.copy.unapproved.join() === "home-next-step" && loose.copy.chosen_by === "Torian", loose);
expect("the one-shot choice is in the build record a publish reads", JSON.parse(readFileSync(join(out, "generated/publish-build.site.json"), "utf8")).copy.approved === false);
const back = reopen(v, "site-copy-one-shot", { by: "Torian", why: "We have time after all" });
expect("a person takes the choice back, and the gate asks for the text again", back.ok && !gate(v).ok && gate(v).mode === "per-element", back);

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
