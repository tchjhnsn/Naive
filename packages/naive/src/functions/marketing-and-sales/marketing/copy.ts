#!/usr/bin/env node
// The site's words before the site (EE-216). A page is built from records, so every element a page shows has a
// record of its own (marketing/message/<id>.json, marketing-message.schema.json) that cites what it comes from,
// and a person approves the words element by element before anything is designed or built.
//
//   node packages/naive/src/functions/marketing-and-sales/marketing/copy.ts <venture dir> gaps [--page <id>] [--json]
//   node packages/naive/src/functions/marketing-and-sales/marketing/copy.ts <venture dir> check [--json]
//   node packages/naive/src/functions/marketing-and-sales/marketing/copy.ts <venture dir> draft [--element <id>] [--propose] [--print] [--json]
//   node packages/naive/src/functions/marketing-and-sales/marketing/copy.ts <venture dir> one-shot --by <person> [--why <text>]
//
//   naive copy gaps      what each page shows, which record holds it, or what is missing and where a draft
//                        would come from, with each upstream record's own state (missing, held, undecided, live)
//   naive copy check     the same gate the build runs: it fails while any element the sitemap plans has no
//                        record a person stands behind, so a workflow step can prove the text is approved
//   naive copy draft     one open decision per missing or undecided element, with two or three candidates
//                        (EE-211) a person picks between. Drafting words needs judgment, so the candidates come
//                        from the agent harness (NAIVE_AGENT_CMD, the same one naive agent run uses). With no
//                        harness it prints the prompt and files each decision with the gap alone, no words.
//   naive copy one-shot  a person's choice to skip approving the text and have the pages built in one pass. It
//                        is recorded as a decided decision (who, when, why, which elements were skipped), the
//                        build marks its output unapproved, and no agent ever chooses it.
//
// The elements come from the venture's own records, never from this file: each section the sitemap plans
// (operations/marketing/sitemap.json, planned by site/plan.ts), plus the chrome the marketing matrix names
// (site/matrix.json copy.chrome), which no section covers. Nothing here asks a model or reaches the network;
// the only model is the one the person's own harness runs for the drafts.
//
// This module is sync, like its neighbours in this folder (publish-build.ts, site/plan.ts) and the decision
// doors it calls (packages/naive/src/engine/decisions.ts).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { addCandidate, approve, decisionFile, propose, refusedPerson, undecidedFor } from "../../../engine/decisions.ts";
import { agentBrief } from "../../../engine/agents/brief.ts";
import { agentPrompt } from "../../../engine/agents/run.ts";
import { envCommand } from "../../../core/runtime.ts";
import { ventureFile } from "../../../core/venture-paths.ts";
import { validateValue } from "../../../records/validate.ts";
import { routes } from "../../../records/routes/routes.ts";
import { MATRIX } from "./site/presence.ts";
import { SITEMAP } from "./site/plan.ts";
import type { MarketingMessage, MarketingSitemap } from "../../../records/types/records.d.ts";

/** The folder and route the message elements live at. */
export const MESSAGES = "marketing/message";
/** The decision a person decides to skip approving the text, and have the pages built in one pass. */
export const ONE_SHOT = "site-copy-one-shot";
/** The answer of that decision that skips approval. The other answer keeps it. */
export const ONE_SHOT_ANSWER = "one-shot";
/** Who the drafts are proposed by: the function's agent, through this command. */
export const DRAFTER = "marketing-and-sales-agent";
/** The role whose brief and harness draft the words. */
export const ROLE = "marketing-and-sales-agent";

/** How settled a record is: live (a person stands behind it), held (an agent's draft waits), undecided (an open decision over it), missing. */
export type State = "live" | "held" | "undecided" | "missing";
/** One record an element's words come from, and how settled it is. */
export type Source = { record: string; file: string | null; field?: string; state: State; decision?: string };
/** One element of a page's words: where it belongs, which record holds it, and what it rests on. */
export type Element = {
  element: string; kind: string; label: string; page: string | null; item: string; chrome: boolean;
  route: string; file: string; state: State; text?: string; decision?: string; candidates?: number; from: Source[];
};
/** How the words get approved: element by element, or in one pass because a person chose that. */
export type Approval = { mode: "per-element" | "one-shot"; decision: string; chosen_by?: string; chosen_at?: string; why?: string; skipped?: string[] };
/** The gap report: every element a page shows, with what holds it and what it is waiting on. */
export type Report = {
  venture: string | null; phase: string | null; sitemap: { file: string; state: State } | null; approval: Approval;
  elements: Element[]; missing: string[]; unapproved: string[];
};
/** What the copy gate says before a page is built or published. */
export type GateResult = { ok: boolean; mode: Approval["mode"]; unapproved: string[]; errors: string[]; approval: Approval };
/** One candidate an agent drafted: the words as a whole record, with why it is worth a look. */
export type Drafted = { id: string; label: string; why?: string; body: MarketingMessage };
/** What the harness answers: candidates per element. */
export type Answer = { elements: { element: string; candidates: Drafted[] }[] };
/** What one element's drafting did. */
export type Proposed = { element: string; decision: string; ok: boolean; error?: string; filed?: "proposed" | "kept"; candidates?: string[] };

const load = <T,>(f: string): T | null => { try { return JSON.parse(readFileSync(f, "utf8")) as T; } catch { return null; } };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
// The router's draft path (packages/naive/src/router/router.ts draftPath): _drafts/<file with / as __>.draft.
const draftOf = (file: string): string => `_drafts/${file.replace(/\//g, "__")}.draft`;
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The element id of a page's section, the one name the records and the report agree on: home-what, about-team. */
export const elementId = (page: string | null | undefined, item: string): string =>
  slug([page && page !== "/" ? page.replace(/^\//, "") : page ? "home" : "", item].filter(Boolean).join("-"));
/** The record file of an element. */
export const elementFile = (id: string): string => `${MESSAGES}/${id}.json`;
/** The decision that settles one element's words. */
export const elementDecision = (id: string): string => `copy-${id}`;

/** The value at a dotted field of a record, or undefined. */
function fieldAt(record: unknown, field: string): unknown {
  let at: unknown = record;
  for (const key of field.split(".")) { if (!isObject(at)) return undefined; at = at[key]; }
  return at;
}

/**
 * How settled the record at a venture-relative file is: live when the file is there, held when an agent's draft
 * waits for a person, undecided when a decision over it is still open, missing when there is nothing. A field
 * makes it narrower: the record is live only when that field holds something, which is how a view of
 * venture.json (foundation/core, the mission and the tagline) says whether the tagline exists.
 */
export function stateOf(dir: string, file: string | null, field?: string): { state: State; decision?: string; candidates?: number } {
  if (!file) return { state: "missing" };
  const record = existsSync(ventureFile(dir, file)) ? load<unknown>(ventureFile(dir, file)) : null;
  const has = record !== null && (!field || fieldAt(record, field) !== undefined);
  const open = undecidedFor(dir, file)[0];
  const decided = open ? { decision: open.decision, candidates: open.candidates.length } : {};
  if (has) return { state: "live", ...decided };
  if (existsSync(ventureFile(dir, draftOf(file)))) return { state: "held", ...decided };
  if (open) return { state: "undecided", decision: open.decision, candidates: open.candidates.length };
  return { state: "missing" };
}

/**
 * The venture-relative files a reference may name, most likely first, and the field it narrows to: a file as
 * written (foundation/icp.json), a route (foundation/problem), or a record type (validation-problem). A view of
 * the venture record (foundation/core, the mission and the tagline) reads venture.json, where the founder's
 * words live. A record type kept under two layouts has a file for each.
 */
export function filesOfRef(ref: string): { files: string[]; field?: string } {
  const [name, field] = ref.split("#");
  const at = field ? { field } : {};
  if (name.endsWith(".json") || name.endsWith(".mdx")) return { files: [name], ...at };
  const r = routes().find((x) => x.kind === "record" && (x.route === name || x.record === name));
  if (!r) return { files: [], ...at };
  if (r.view_of === "venture") return { files: ["venture.json"], ...at };
  return { files: (r.files ?? []).filter((f) => !f.includes("*")), ...at };
}

/** One upstream record of an element, with its own state, so a draft never rests on something that is not there. */
export function sourceOf(dir: string, ref: string): Source {
  const { files, field } = filesOfRef(ref);
  const found = files.find((f) => existsSync(ventureFile(dir, f))) ?? files[0] ?? null;
  return { record: ref, file: found, ...(field ? { field } : {}), ...stateOf(dir, found, field) };
}

/** One element a page shows, before its own record is looked up: where it belongs and what it comes from. */
type Planned = { element: string; kind: string; label: string; page: string | null; item: string; chrome: boolean; from: string[] };

/**
 * Every element the venture's own records say a page shows: the chrome the marketing matrix names, which no
 * section covers, then each section of each page the sitemap plans, in the sitemap's order. A venture with no
 * sitemap has only the chrome, and the report says the sitemap is missing.
 */
export function planned(dir: string): { sitemap: { file: string; state: State } | null; elements: Planned[] } {
  const out: Planned[] = MATRIX.copy.chrome.map((c) => ({ element: slug(c.item), kind: c.kind, label: c.label, page: null, item: c.item, chrome: true, from: c.from }));
  const file = [SITEMAP, "marketing/sitemap.json"].find((f) => existsSync(ventureFile(dir, f))) ?? SITEMAP;
  const map = existsSync(ventureFile(dir, file)) ? load<MarketingSitemap>(ventureFile(dir, file)) : null;
  for (const page of map?.pages ?? []) {
    for (const s of page.sections) {
      const from = [s.source && isObject(s.source) && typeof s.source.file === "string" && s.source.file
        ? String(s.source.file) : isObject(s.source) && typeof s.source.record === "string" ? String(s.source.record) : ""].filter(Boolean);
      out.push({ element: elementId(page.path, s.item), kind: MATRIX.copy.kinds[s.item] ?? "body", label: s.label ?? s.item,
        page: page.path, item: s.item, chrome: false, from });
    }
  }
  return { sitemap: map ? { file, state: stateOf(dir, file).state } : null, elements: out };
}

/** How the words get approved: per element, unless a person decided the one-shot decision. */
export function approval(dir: string): Approval {
  const file = decisionFile(dir, ONE_SHOT);
  const d = file ? load<{ status?: string; answer?: string | null; note?: string; options?: string[];
    provenance?: { approved_by?: string; approved_at?: string; reasons?: { claim?: string; kind?: string }[] } }>(ventureFile(dir, file)) : null;
  if (!d || d.status !== "decided" || d.answer !== ONE_SHOT_ANSWER) return { mode: "per-element", decision: ONE_SHOT };
  // The person's own reason, frozen into the decision's provenance when they chose it.
  const why = d.provenance?.reasons?.find((x) => x.kind === "for")?.claim;
  return { mode: "one-shot", decision: ONE_SHOT, ...(d.provenance?.approved_by ? { chosen_by: d.provenance.approved_by } : {}),
    ...(d.provenance?.approved_at ? { chosen_at: d.provenance.approved_at } : {}), ...(why ? { why } : {}) };
}

/** The gap report: every element, the record that holds it, and what each missing one is waiting on. */
export function report(dir: string, opts: { page?: string } = {}): Report {
  const venture = load<{ id?: string; phase?: string }>(join(dir, "venture.json"));
  const { sitemap, elements } = planned(dir);
  const only = opts.page ? `/${opts.page.replace(/^\//, "")}` : null;
  const want = only ? elements.filter((e) => e.chrome || e.page === only || e.page === opts.page) : elements;
  const out: Element[] = want.map((e) => {
    const file = elementFile(e.element);
    const st = stateOf(dir, file);
    const record = st.state === "live" ? load<MarketingMessage>(ventureFile(dir, file)) : null;
    const from = (record?.cites?.map((c) => c.record + (c.field ? `#${c.field}` : "")) ?? e.from).map((ref) => sourceOf(dir, ref));
    return { element: e.element, kind: record?.kind ?? e.kind, label: record?.label ?? e.label, page: e.page, item: e.item, chrome: e.chrome,
      route: `${MESSAGES}/${e.element}`, file, ...st, ...(record?.text ? { text: record.text } : {}), from };
  });
  return { venture: venture?.id ?? null, phase: venture?.phase ?? null, sitemap, approval: approval(dir), elements: out,
    missing: out.filter((e) => e.state === "missing").map((e) => e.element), unapproved: out.filter((e) => e.state !== "live").map((e) => e.element) };
}

/**
 * The copy gate: text before design (EE-216). A page is built and published only from elements a person stands
 * behind, so an element the sitemap plans whose record is missing, held or undecided refuses the build and is
 * named in the refusal. A person who chose the one-shot decision passes the gate; the output is marked
 * unapproved instead, because they asked for that and know what it costs. A venture with no sitemap plans no
 * page, so there is nothing for this gate to hold and it passes; the gap report still lists the chrome.
 */
export function gate(dir: string): GateResult {
  const r = report(dir);
  const a = r.approval;
  if (a.mode === "one-shot") return { ok: true, mode: a.mode, unapproved: r.unapproved, errors: [], approval: a };
  // No sitemap is no site: the gate holds the elements a page shows, and nothing here plans a page yet.
  if (!r.sitemap) return { ok: true, mode: a.mode, unapproved: r.unapproved, errors: [], approval: a };
  const errors = r.elements.filter((e) => e.state !== "live").map((e) => {
    const where = e.chrome ? "the site's chrome" : `${e.page} ${e.item}`;
    const waiting = e.state === "held" ? `an agent's draft waits for a person (mentura accept ${MESSAGES}/${e.element})`
      : e.state === "undecided" ? `decision ${e.decision} is open with ${e.candidates ?? 0} option(s) (mentura decide ${e.decision} --by <your name> --answer <option>)`
      : `no record (naive copy draft --element ${e.element} --propose)`;
    return `${e.file} (${where}): ${waiting}`;
  });
  return { ok: errors.length === 0, mode: a.mode, unapproved: r.unapproved,
    errors: errors.length ? [`the text is not approved: ${errors.length === 1 ? "one element of this site has" : `${errors.length} elements of this site have`} no record a person stands behind. Approve the text first, or choose the one-shot path yourself (naive copy one-shot --by <your name>), which marks the pages unapproved.`, ...errors] : [],
    approval: a };
}

/** The elements worth drafting now: the ones with no record, and the ones a decision is still open over. */
export const toDraft = (r: Report, element?: string): Element[] =>
  r.elements.filter((e) => (e.state === "missing" || e.state === "undecided") && (!element || e.element === element));

/** The records an element's words may draw on, as the prompt carries them: each source with its state and, when it is live, its content. */
function sourceText(dir: string, s: Source): string {
  if (s.state !== "live" || !s.file) return `- ${s.record}: ${s.state}${s.state === "undecided" && s.decision ? ` (decision ${s.decision})` : ""}`;
  const text = readFileSync(ventureFile(dir, s.file), "utf8");
  return `- ${s.record} (live, ${s.file}):\n\`\`\`json\n${text.length > 4000 ? `${text.slice(0, 4000)}\n...` : text.trim()}\n\`\`\``;
}

/** The task the harness is given: the elements to draft, what each one is, what it may draw on, and the answer's shape. */
export function promptFor(dir: string, elements: Element[]): string {
  const brief = agentBrief(ROLE, dir);
  const task = [
    `Draft the words for ${elements.length} element${elements.length === 1 ? "" : "s"} of this venture's public site, as options for the founder to choose between. You are not writing a page and you are not designing anything: each element becomes one record (marketing/message/<id>.json) that the founder approves on its own.`,
    "For each element give two or three candidates, each a different angle, each short enough to read at a glance. Write only what the records below support: name no customer, number or result that no record holds, and where an element's own records are missing, say so in the candidate's why and keep the words to what is still true. One candidate may be the honest one that claims nothing, such as leaving the element out until a record exists.",
    "Answer with JSON and nothing else, in this shape:",
    "```json",
    JSON.stringify({ elements: [{ element: "<element id>", candidates: [{ id: "a", label: "<the words, or a few words naming the idea>", why: "<why this angle, and what it rests on>",
      body: { version: "0.1.0", id: "<element id>", kind: "<kind>", text: "<the words as a reader sees them>", label: "<what to call this element>", page: "<page path or omit>", item: "<item>",
        cites: [{ record: "<route or file>", why: "<what it contributes>" }] } }] }] }, null, 2),
    "```",
    "Each body is a whole marketing-message record and is checked against packages/naive/src/records/marketing-message.schema.json before it is filed, so keep every field the element below names, and cite at least one record even when it is missing. A cta-primary, a cta-secondary and a contact element need a destination ({ kind: email | url | path | none, value }); use none when the venture has nowhere to send a reader yet.",
    "",
    "## The elements",
    ...elements.map((e) => [
      `### ${e.element} (${e.kind})`,
      `${e.label}. ${e.chrome ? "Part of the site's chrome, on every page." : `On ${e.page}, section ${e.item}.`}`,
      ...(e.state === "undecided" ? [`A decision is already open over it: ${e.decision}. Your candidates join the ones already on the table.`] : []),
      "What it may draw on:",
      ...e.from.map((s) => sourceText(dir, s)),
    ].join("\n")),
  ].join("\n\n");
  return brief instanceof Error ? task : agentPrompt(brief, task, dir);
}

/** Asks the person's own agent harness (NAIVE_AGENT_CMD) for the drafts. Null when no harness is set. */
export function askHarness(dir: string, prompt: string): string | null {
  const harness = envCommand("NAIVE_AGENT_CMD");
  if (!harness) return null;
  const [bin, ...args] = harness.trim().split(/\s+/);
  const p = spawnSync(bin, args, { input: prompt, encoding: "utf8", cwd: dir, env: { ...process.env, MENTURA_ACTOR_ID: ROLE } });
  if (p.error) throw new Error(`NAIVE_AGENT_CMD did not start: ${p.error.message}`);
  if (p.status !== 0) throw new Error(`NAIVE_AGENT_CMD failed: ${(p.stderr || p.stdout || "").trim().slice(0, 400)}`);
  return p.stdout ?? "";
}

/** The candidates in a harness's answer, or an error. A model wraps its JSON in prose, so the outermost object is read. */
export function parseAnswer(text: string): { ok: true; answer: Answer; error?: undefined } | { ok: false; error: string; answer?: undefined } {
  const body = text.replace(/```(?:json)?/g, "");
  const start = body.indexOf("{"), end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, error: "the harness answered no JSON object" };
  let parsed: unknown;
  try { parsed = JSON.parse(body.slice(start, end + 1)); } catch (e) { return { ok: false, error: `the harness's JSON does not parse: ${(e as Error).message}` }; }
  if (!isObject(parsed) || !Array.isArray(parsed.elements)) return { ok: false, error: "the answer has no elements array" };
  const elements: Answer["elements"] = [];
  for (const e of parsed.elements) {
    if (!isObject(e) || typeof e.element !== "string" || !Array.isArray(e.candidates)) return { ok: false, error: "every entry of elements needs an element id and a candidates array" };
    const candidates: Drafted[] = [];
    for (const c of e.candidates) {
      if (!isObject(c) || typeof c.id !== "string" || typeof c.label !== "string" || !isObject(c.body)) return { ok: false, error: `a candidate of ${e.element} has no id, label or body` };
      candidates.push({ id: slug(c.id), label: c.label, ...(typeof c.why === "string" ? { why: c.why } : {}), body: c.body as MarketingMessage });
    }
    elements.push({ element: e.element, candidates });
  }
  return { ok: true, answer: { elements } };
}

/** Why a drafted record is not a message element, or null. The schema answers, so a bad draft is refused, not filed. */
export function schemaError(body: MarketingMessage): string | null {
  const v = validateValue("marketing-message.schema.json", body);
  return v.status === 0 ? null : (v.stdout + v.stderr).trim().split("\n").filter((l) => l && !/checked against/.test(l)).join("; ");
}

/** The question each element's decision asks. */
export const question = (e: Element): string => `Which words for ${e.label.toLowerCase()}${e.chrome ? "" : ` on ${e.page}`}?`;

/** The decision's note: where the element sits, what it rests on, and what is still missing under it. It says
 *  nothing about how many options are on the table, because the decision itself carries those and a note that
 *  counted them would go stale the next time one was added. */
export function note(e: Element): string {
  const missing = e.from.filter((s) => s.state !== "live");
  return [
    `${e.label}: the ${e.kind} ${e.chrome ? "the site shows on every page" : `of section ${e.item} on ${e.page}`}. Its record is ${e.file}.`,
    e.from.length ? `It comes from: ${e.from.map((s) => `${s.record} (${s.state})`).join(", ")}.` : "No record upstream of it is named yet.",
    ...(missing.length ? [`${missing.length} of those record${missing.length === 1 ? " is" : "s are"} not settled yet, so any wording here is a guess until ${missing.map((s) => s.record).join(", ")} ${missing.length === 1 ? "is" : "are"} written. Deciding this element does not settle them.`] : []),
    "Each option on this decision is a whole record: decide with its id and mentura merge writes it, and the ones you do not choose stay here. A decision with no option means no words were drafted, because no agent harness answered; set NAIVE_AGENT_CMD and run naive copy draft again, or write the words yourself.",
    "Only you choose. An agent never picks the words a page shows.",
  ].join(" ");
}

/**
 * One open decision per element to draft, with the candidates the harness drafted. A rerun leaves a decision it
 * already filed, or a person already decided, as it is, so a later run never rewrites the founder's answer; a
 * decision still open takes any new candidate the harness drafts. With no harness, the decision is filed with
 * the gap alone and the prompt is printed, because words are judgment and nothing here invents them.
 */
export function draft(dir: string, opts: { element?: string; propose?: boolean; ask?: (prompt: string) => string | null; print?: boolean } = {}):
  { elements: Element[]; prompt: string; answer?: Answer; error?: string; proposed: Proposed[] } {
  const r = report(dir);
  const elements = toDraft(r, opts.element);
  const prompt = elements.length ? promptFor(dir, elements) : "";
  if (!elements.length) return { elements, prompt, proposed: [] };
  const ask = opts.ask ?? ((p: string) => askHarness(dir, p));
  const said = opts.print ? null : ask(prompt);
  const parsed = said === null ? null : parseAnswer(said);
  const answer = parsed?.ok ? parsed.answer : undefined;
  const error = parsed && !parsed.ok ? parsed.error : undefined;
  if (!opts.propose) return { elements, prompt, ...(answer ? { answer } : {}), ...(error ? { error } : {}), proposed: [] };
  const proposed: Proposed[] = [];
  for (const e of elements) {
    const id = elementDecision(e.element);
    const drafts = (answer?.elements.find((x) => x.element === e.element)?.candidates ?? []).filter((c) => !schemaError(c.body));
    const already = decisionFile(dir, id);
    if (!already) {
      const filed = propose(dir, { id, question: question(e), note: note(e), class: "public-commitment",
        decides: { record: "marketing-message", path: e.file }, at: MESSAGES, name: e.element }, { agentId: DRAFTER, via: "cli" });
      if (!filed.ok) { proposed.push({ element: e.element, decision: id, ok: false, error: filed.error }); continue; }
    }
    const added: string[] = [];
    let failed: string | undefined;
    for (const c of drafts) {
      const put = addCandidate(dir, id, { id: c.id, label: c.label, ...(c.why ? { why: c.why } : {}), file: e.file, body: c.body,
        evidence: (c.body.cites ?? []).map((x) => x.record) }, { agentId: DRAFTER, via: "cli" });
      if (put.ok) added.push(c.id); else failed = put.error;
    }
    proposed.push({ element: e.element, decision: id, ok: !failed, ...(failed ? { error: failed } : {}), filed: already ? "kept" : "proposed", candidates: added });
  }
  return { elements, prompt, ...(answer ? { answer } : {}), ...(error ? { error } : {}), proposed };
}

/**
 * A person skips approving the text and has the pages built in one pass. It is their choice and no one else's:
 * the decision door refuses anyone who is not a person, the answer is recorded with their name, the time and the
 * elements that were unapproved when they chose, and every build from then on marks its output unapproved.
 */
export function oneShot(dir: string, { by, why }: { by?: string; why?: string } = {}): { ok: boolean; error?: string; approval?: Approval; skipped?: string[] } {
  if (!by) return { ok: false, error: "the one-shot path is a person's choice: give your name (--by <person>)" };
  // The person is checked before anything is written, so a refused name leaves no record behind.
  const refused = refusedPerson(dir, by);
  if (refused) return { ok: false, error: `only a person approves building a site from words no one approved: ${refused}` };
  const r = report(dir);
  const skipped = r.unapproved;
  const note = [
    "Two ways to get the site's pages written. per-element: a person approves each element's words as its own record, and the pages are built from the approved records only. one-shot: the pages are built in one pass from whatever the agent drafts, with no approval step.",
    `${skipped.length} element${skipped.length === 1 ? "" : "s"} had no record a person stands behind when this question was asked: ${skipped.join(", ") || "none"}.`,
    "What one-shot costs: the pages carry words no one approved, every build records them as unapproved, and a page may claim what no record holds. Publishing still needs the publication policy and a person's approval.",
    `Reversible: mentura reopen ${ONE_SHOT} --by <your name> puts the question back, and from then on the gate asks for the text again.`,
  ].join(" ");
  const id = ONE_SHOT;
  if (!decisionFile(dir, id)) {
    const filed = propose(dir, { id, question: "Approve the site's text element by element, or build the pages in one pass?",
      note, class: "public-commitment", options: ["per-element", ONE_SHOT_ANSWER] }, { agentId: DRAFTER, via: "cli" });
    if (!filed.ok) return { ok: false, error: filed.error };
  }
  const decided = approve(dir, id, { by, answer: ONE_SHOT_ANSWER, ...(why ? { reasons: [{ claim: why, kind: "for" }] } : {}),
    note: `${by} chose the one-shot path for the site's words${why ? `: ${why}` : ""}`, via: "cli" });
  if (!decided.ok) return { ok: false, error: decided.error };
  return { ok: true, approval: approval(dir), skipped };
}

const MARKS: Record<State, string> = { live: "approved", held: "draft held", undecided: "undecided", missing: "missing" };

function printReport(r: Report): void {
  console.log(`${r.venture ?? "this venture"} (${r.phase ?? "no phase"}): ${r.elements.length} element${r.elements.length === 1 ? "" : "s"} of words, ${r.elements.filter((e) => e.state === "live").length} approved`);
  if (!r.sitemap) console.log(`  no sitemap yet (${SITEMAP}), so only the site's chrome is listed: plan the pages with mentura operations/marketing/sitemap run`);
  if (r.approval.mode === "one-shot") console.log(`  one-shot: ${r.approval.chosen_by ?? "a person"} chose to skip approving the text (decision ${r.approval.decision}). Pages built from here are marked unapproved.`);
  for (const e of r.elements) {
    console.log(`\n${e.element.padEnd(20)} ${MARKS[e.state].padEnd(12)} ${e.kind} ${e.chrome ? "(chrome)" : `on ${e.page} as ${e.item}`}`);
    if (e.text) console.log(`  "${e.text.length > 100 ? `${e.text.slice(0, 100)}...` : e.text}"`);
    if (e.decision) console.log(`  decision ${e.decision} is open with ${e.candidates ?? 0} option(s)`);
    for (const s of e.from) console.log(`  from ${s.record}: ${MARKS[s.state]}${s.decision ? ` (decision ${s.decision})` : ""}`);
  }
  if (r.unapproved.length) console.log(`\n${r.unapproved.length} element${r.unapproved.length === 1 ? "" : "s"} with no approved record: ${r.unapproved.join(", ")}\nDraft options for them with naive copy draft --propose. Nothing is designed or built until a person approves the text, unless you choose naive copy one-shot --by <your name>.`);
  else console.log("\nEvery element has a record a person stands behind: the pages can be built from these records.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const flag = (n: string): string | undefined => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const json = argv.includes("--json");
  const [dir, what = "gaps"] = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
  if (!dir || !existsSync(join(dir, "venture.json")) || !["gaps", "check", "draft", "one-shot"].includes(what)) {
    console.error("usage: node packages/naive/src/functions/marketing-and-sales/marketing/copy.ts <venture dir> [gaps [--page <id>] | check | draft [--element <id>] [--propose] [--print] | one-shot --by <person> [--why <text>]] [--json]");
    process.exit(2);
  }
  if (what === "check") {
    const g = gate(dir);
    if (json) console.log(JSON.stringify(g, null, 2));
    else if (g.ok && g.mode === "one-shot") console.log(`the text is not approved, and ${g.approval.chosen_by ?? "a person"} chose that: ${g.unapproved.length} element(s) are built unapproved (decision ${g.approval.decision})`);
    else if (g.ok) console.log("every element of every page has a record a person stands behind");
    else for (const e of g.errors) console.log(e);
    process.exit(g.ok ? 0 : 1);
  }
  if (what === "gaps") {
    const r = report(dir, { ...(flag("page") ? { page: flag("page") } : {}) });
    if (json) console.log(JSON.stringify(r, null, 2));
    else printReport(r);
    process.exit(0);
  }
  if (what === "draft") {
    const r = draft(dir, { ...(flag("element") ? { element: flag("element") } : {}), propose: argv.includes("--propose"), print: argv.includes("--print") });
    if (json) console.log(JSON.stringify(r, null, 2));
    else if (!r.elements.length) console.log("every element already has a record or an open decision with options: nothing to draft");
    else {
      if (!r.answer) {
        console.log(r.prompt);
        console.error(`\nNo words were drafted${r.error ? `: ${r.error}` : ": no agent harness answered"}. Paste the prompt above into any agent with MENTURA_ACTOR_ID=${ROLE} set, or set NAIVE_AGENT_CMD (for example "claude -p") and run again.`);
      }
      for (const p of r.proposed) console.log(`${p.ok ? "ok  " : "FAIL"} ${p.decision} (${p.filed ?? "not filed"}): ${p.error ?? `${p.candidates?.length ?? 0} option(s)`}`);
      if (r.proposed.length) console.log("\nYou choose: mentura decide <decision> --by <your name> --answer <option>, then mentura merge <decision> writes the record.");
    }
    process.exit(r.proposed.some((p) => !p.ok) ? 1 : 0);
  }
  const r = oneShot(dir, { ...(flag("by") ? { by: flag("by") } : {}), ...(flag("why") ? { why: flag("why") } : {}) });
  if (json) console.log(JSON.stringify(r, null, 2));
  else if (r.ok) console.log(`recorded: ${flag("by")} chose the one-shot path (decision ${ONE_SHOT}). ${r.skipped?.length ?? 0} element(s) were unapproved, and every page built from here is marked unapproved. Reopen it with mentura reopen ${ONE_SHOT} --by ${flag("by")}.`);
  else console.error(r.error);
  process.exit(r.ok ? 0 : 1);
}
