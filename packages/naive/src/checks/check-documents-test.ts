// Breaks check-documents on copies, and renders a document from a copy of an example venture (EE-218).
//
//   node packages/naive/src/checks/check-documents-test.ts
//
// Each catalog case copies the catalog and the files it cites into a small EE_ROOT, breaks one rule, and expects the
// check to name it. The ladder cases build a venture's artifact records by hand and expect the check to refuse a rung
// whose rung below is missing or unapproved. The render cases run naive render against a copy of the software example.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Artifact, DocumentCatalog } from "../records/types/records.d.ts";
import { readDataModel } from "../records/index.ts";
import { ARTIFACT_SCHEMA, CATALOG, DATA_MODEL, DEPARTMENTS, FUNCTIONS } from "./check-documents.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-documents.ts");
const RENDER = join(repo, "packages/naive/src/engine/render-document.ts");
const EXAMPLE = join(repo, "packages/naive/src/records/examples/software/ventures/relay");
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-documents-test-"));
const run = (script: string, args: string[] = [], env: Record<string, string> = {}) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};
const original = JSON.parse(readFileSync(join(repo, CATALOG), "utf8")) as DocumentCatalog;

// The brand schemas a kind's style names (EE-230), at the paths the data model gives them, as the check reads them.
const STYLE_SCHEMAS = ["marketing-brand", "marketing-design-system"].flatMap((id) => {
  const schema = readDataModel().records.find((r) => r.id === id)?.schema;
  return typeof schema === "string" ? [schema] : [];
});
/** A small copy of the repository: the catalog, what it cites, and every function's decisions.json for the classes a rung may require. */
function copyRoot(root: string) {
  for (const f of [CATALOG, DEPARTMENTS, DATA_MODEL, ARTIFACT_SCHEMA, ...STYLE_SCHEMAS]) { mkdirSync(dirname(join(root, f)), { recursive: true }); cpSync(join(repo, f), join(root, f)); }
  cpSync(join(repo, FUNCTIONS), join(root, FUNCTIONS), { recursive: true, filter: (src) => !/\/(skills|templates|frameworks|workflows)(\/|$)/.test(src) });
}

let n = 0;
/** A copy of the repository's files with the catalog changed, run through the check. */
function broken(change: (_c: DocumentCatalog) => void, ventures: string[] = []) {
  const root = join(tmp, `c-${++n}`);
  copyRoot(root);
  const c = structuredClone(original); change(c);
  writeFileSync(join(root, CATALOG), JSON.stringify(c, null, 2) + "\n");
  return run(CHECK, ventures, { EE_ROOT: root });
}
const fails = (name: string, change: (_c: DocumentCatalog) => void, says: RegExp) => {
  const r = broken(change);
  t(name, r.status === 1 && says.test(r.out), r);
};
const kind = (c: DocumentCatalog, id: string) => {
  const k = c.kinds.find((x) => x.id === id);
  if (!k) throw new Error(`no kind ${id}`);
  return k;
};
const rung = (c: DocumentCatalog, id: string) => {
  const r = c.ladder.rungs.find((x) => x.id === id);
  if (!r) throw new Error(`no rung ${id}`);
  return r;
};

// The catalog Naive ships.
const ok = run(CHECK);
t("the repository's catalog passes", ok.status === 0 && /document kinds/.test(ok.out) && /a person decides/.test(ok.out), ok);
const json = JSON.parse(run(CHECK, ["--json"]).out) as { ok: boolean; kinds: number };
t("--json gives the kind count", json.ok && json.kinds === original.kinds.length, json);

fails("two rungs with no rung below them", (c) => { rung(c, "slides").after = null; }, /has 2 rungs with no rung below them, not one/);
fails("a rung that comes after no rung", (c) => { rung(c, "slides").after = "nowhere"; }, /comes after nowhere, which is not a rung/);
fails("a cycle in the ladder", (c) => { rung(c, "reading-copy").after = "live"; }, /does not reach the first rung|rungs with no rung below/);
fails("a format on a rung that does not list it", (c) => { rung(c, "slides").formats = ["html"]; }, /format pptx says it sits on slides, which does not list it/);
fails("a rule that names a format the catalog lacks and rules it out too", (c) => { c.rules[0].then = ["md"]; c.rules[0].not = ["md"]; }, /both points to md and rules it out/);
fails("a kind whose function is not a department", (c) => { kind(c, "one-pager").function = "accounting"; }, /function accounting, which .* does not list/);
// The schema's own enum catches a kind the catalog invents, so the cross-file rule is tested the way it can really
// break: the two files drifting apart, with artifact.schema.json no longer listing a kind the catalog uses.
{
  const root = join(tmp, "drift");
  copyRoot(root);
  const schema = JSON.parse(readFileSync(join(root, ARTIFACT_SCHEMA), "utf8")) as { properties: { kind: { enum: string[] } } };
  schema.properties.kind.enum = schema.properties.kind.enum.filter((k) => k !== "deck");
  writeFileSync(join(root, ARTIFACT_SCHEMA), JSON.stringify(schema, null, 2) + "\n");
  const r = run(CHECK, [], { EE_ROOT: root });
  t("an artifact kind the artifact schema no longer lists", r.status === 1 && /artifact of kind deck, which .*artifact\.schema\.json does not list/.test(r.out), r);
}
fails("a kind that climbs to no rung", (c) => { kind(c, "one-pager").highest_rung = "billboard"; }, /climbs to billboard, which is not a rung/);
fails("a kind with a format off its climb", (c) => { kind(c, "one-pager").formats = ["md", "pptx"]; }, /is made as pptx, which sits on slides, a rung off its climb/);
fails("a kind that skips the reading copy", (c) => { const k = kind(c, "pitch-deck"); k.formats = ["pptx"]; }, /no format on the first rung, so it would skip the reading copy/);
fails("a section that reads a path no record type matches", (c) => { kind(c, "one-pager").sections[0].from = "made/up.json"; }, /reads made\/up\.json, which no venture record type/);
fails("a rung that requires a decision class no function has", (c) => { rung(c, "live").requires = { records: [], meetings: [], decisions: ["vibes"] }; }, /class vibes, which no function's decisions\.json has/);
fails("a rung that requires a record no record type matches", (c) => { rung(c, "live").requires = { records: ["nowhere/at-all.json"], meetings: [], decisions: [] }; }, /requires the record nowhere\/at-all\.json/);
fails("a kind listed twice", (c) => { c.kinds.push(structuredClone(kind(c, "one-pager"))); }, /kind one-pager is listed twice/);
fails("a style field the brand schema does not define", (c) => { kind(c, "one-pager").style[0].field = "colours"; }, /one-pager is styled by marketing-brand colours, which is not a field of the marketing-brand schema/);
fails("a nested style field the brand schema does not define", (c) => { kind(c, "memo").style[0].field = "voice.loudness"; }, /memo is styled by marketing-brand voice\.loudness, which is not a field/);
fails("a token name is not a brand field: colors is a free map", (c) => { kind(c, "one-pager").style[0].field = "colors.primary"; }, /styled by marketing-brand colors\.primary, which is not a field/);
fails("a design-system field the schema does not define", (c) => { kind(c, "pitch-deck").style.push({ record_type: "marketing-design-system", field: "palette" }); }, /pitch-deck is styled by marketing-design-system palette, which is not a field/);
{
  // The record types a style names drift out of the data model: the check says so instead of passing.
  const root = join(tmp, "style-drift");
  copyRoot(root);
  const model = JSON.parse(readFileSync(join(root, DATA_MODEL), "utf8")) as { records: { id: string }[] };
  model.records = model.records.filter((r) => r.id !== "marketing-design-system");
  writeFileSync(join(root, DATA_MODEL), JSON.stringify(model, null, 2) + "\n");
  const r = run(CHECK, [], { EE_ROOT: root });
  t("a style record type the data model no longer has", r.status === 1 && /styled by marketing-design-system, which no record type in .*data-model\.json names with a schema/.test(r.out), r);
}
fails("a first rung with no format Naive renders itself", (c) => { const f = c.formats.find((x) => x.id === "md"); if (f) f.renderer = "harness"; }, /has no format Naive renders itself/);

// A venture's own documents against the ladder.
let v = 0;
function venture(artifacts: Artifact[]) {
  const dir = join(tmp, `v-${++v}`);
  mkdirSync(join(dir, "artifacts"), { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", phase: "discovery" }) + "\n");
  for (const a of artifacts) writeFileSync(join(dir, "artifacts", `${a.id}.json`), JSON.stringify(a, null, 2) + "\n");
  return dir;
}
const artifact = (id: string, document_kind: string, format: Artifact["format"], approved_by?: string): Artifact =>
  ({ id, kind: "document", title: id, document_kind, format, approved_by, built_at: "2026-11-26T00:00:00Z", built_from: [{ record: "venture.json" }] });

const rightOrder = venture([
  artifact("site-copy-reading-copy", "site-copy", "md", "Torian"),
  artifact("site-copy-interactive", "site-copy", "html"),
]);
const good = run(CHECK, [rightOrder]);
t("a venture whose html sits on an approved reading copy passes", good.status === 0 && /2 rendered documents/.test(good.out), good);

const noCopy = venture([artifact("site-copy-interactive", "site-copy", "html")]);
const missing = run(CHECK, [noCopy]);
t("html with no reading copy rendered is refused", missing.status === 1 && /with no reading-copy of site-copy rendered/.test(missing.out), missing);

const unapproved = venture([
  artifact("site-copy-reading-copy", "site-copy", "md"),
  artifact("site-copy-interactive", "site-copy", "html"),
]);
const notYet = run(CHECK, [unapproved]);
t("html over an unapproved reading copy is refused", notYet.status === 1 && /has no approved_by: a person approves each rung before the next/.test(notYet.out), notYet);

const liveFirst = venture([artifact("site-copy-live", "site-copy", "site", "Torian")]);
const live = run(CHECK, [liveFirst]);
t("a live site with neither rung below it names both", live.status === 1 && /no reading-copy of site-copy rendered/.test(live.out) && /no interactive of site-copy rendered/.test(live.out), live);

// naive render against a copy of the software example venture.
const copy = join(tmp, "relay");
cpSync(EXAMPLE, copy, { recursive: true });
const rendered = run(RENDER, [copy, "one-pager"]);
const md = existsSync(join(copy, "artifacts/one-pager-reading-copy.md")) ? readFileSync(join(copy, "artifacts/one-pager-reading-copy.md"), "utf8") : "";
t("render writes the reading copy and its artifact record", rendered.status === 0 && md.includes("# One-pager") && existsSync(join(copy, "artifacts/one-pager-reading-copy.json")), rendered);
t("every section cites the record it came from", /Source: `foundation\/problem\.json` \(`statement`\)/.test(md) && /Source: `venture\.json` \(`core\.promise`\)/.test(md), md.slice(0, 400));
t("the reading copy says it is a view and not a record", /not a record/.test(md), md.slice(0, 400));
const record = JSON.parse(readFileSync(join(copy, "artifacts/one-pager-reading-copy.json"), "utf8")) as Artifact;
t("the artifact record names its kind, format and every record with a hash", record.document_kind === "one-pager" && record.format === "md"
  && record.built_from.length === 2 && record.built_from.every((b) => typeof b.sha256 === "string"), record);
t("the render does not approve anything: that is a person's", record.approved_by === undefined, record);
const adr = run(RENDER, [copy, "adr"]);
const adrMd = existsSync(join(copy, "artifacts/adr-reading-copy.md")) ? readFileSync(join(copy, "artifacts/adr-reading-copy.md"), "utf8") : "";
t("a hole section is always shown as a hole, naming the record that would hold it (EE-230)",
  adr.status === 0 && /## Consequences\n\n_Not recorded: What becomes easier or harder because of this decision\. No record type holds consequences yet/.test(adrMd), adr.out + adrMd.slice(0, 400));

const again = run(RENDER, [copy, "site-copy", "--format", "html"]);
t("an interactive page before the reading copy is refused, naming the ladder", again.status === 1 && /ladder-order/.test(again.out) && /site-copy-reading-copy\.json is missing/.test(again.out), again);
run(RENDER, [copy, "site-copy"]);
const beforeApproval = run(RENDER, [copy, "site-copy", "--format", "html"]);
t("an interactive page over an unapproved reading copy is refused", beforeApproval.status === 1 && /has no approved_by/.test(beforeApproval.out), beforeApproval);
const file = join(copy, "artifacts/site-copy-reading-copy.json");
writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, "utf8")), approved_by: "Torian" }, null, 2) + "\n");
const afterApproval = run(RENDER, [copy, "site-copy", "--format", "html"]);
t("once a person approved it, the html rung hands the work to the harness and renders nothing here",
  afterApproval.status === 0 && /the harness's to render, not Naive's/.test(afterApproval.out) && !existsSync(join(copy, "artifacts/site-copy-interactive.html")), afterApproval);
t("the harness is told which brand fields style the kind, by the records that hold them (EE-230)",
  /using only these fields: marketing\/brand\.json \(name, voice, fonts, typefaces, colors, marks, scopes\); marketing\/design-system\.json \(ethos, choices, components\)/.test(afterApproval.out), afterApproval);
// The live rung: its records, the rung below approved, and a decided public-commitment decision naming this document.
const approve = (id: string) => { const f = join(copy, `artifacts/${id}.json`); writeFileSync(f, JSON.stringify({ id, kind: "site", title: "Site copy", audience: "customers", document_kind: "site-copy", format: "html", built_at: "2026-11-01T00:00:00Z", built_from: [{ record: "venture.json" }], ...(existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}), approved_by: "Torian" }, null, 2) + "\n"); };
approve("site-copy-interactive");
mkdirSync(join(copy, "governance"), { recursive: true });
if (!existsSync(join(copy, "governance/publication-policy.json"))) writeFileSync(join(copy, "governance/publication-policy.json"), "{}\n");
const noDecision = run(RENDER, [copy, "site-copy", "--format", "site"]);
t("the live rung is refused with no decided public-commitment decision for this document",
  noDecision.status === 1 && /no decided decision of class public-commitment names an artifact of site-copy/.test(noDecision.out), noDecision);
mkdirSync(join(copy, "decisions"), { recursive: true });
const decision = (name: string, body: object) => writeFileSync(join(copy, "decisions", `${name}.decision.json`), JSON.stringify({ id: name, question: "Publish?", class: "public-commitment", ...body }, null, 2) + "\n");
decision("publish-other", { status: "decided", applies_to: [{ file: "artifacts/one-pager-reading-copy.json" }] });
decision("publish-site-open", { status: "open", applies_to: [{ file: "artifacts/site-copy-interactive.json" }] });
const otherDoc = run(RENDER, [copy, "site-copy", "--format", "site"]);
t("a decision about another document, or one still open, unlocks nothing", otherDoc.status === 1 && /no decided decision of class public-commitment/.test(otherDoc.out), otherDoc);
decision("publish-site", { status: "decided", applies_to: [{ file: "artifacts/site-copy-interactive.json" }] });
const liveRung = run(RENDER, [copy, "site-copy", "--format", "site"]);
t("with the decision decided, the live rung is reachable and handed to the publishing gate", liveRung.status === 0 && /naive publish/.test(liveRung.out), liveRung);

const wrongFormat = run(RENDER, [copy, "spec", "--format", "pdf"]);
t("a format the kind is not made in is refused with why", wrongFormat.status === 1 && /format-not-for-kind/.test(wrongFormat.out) && /made as md only/.test(wrongFormat.out), wrongFormat);
const unknown = run(RENDER, [copy, "brochure"]);
t("a kind the catalog lacks is refused and points at the catalog", unknown.status === 1 && /no document kind brochure/.test(unknown.out) && /pull request/.test(unknown.out), unknown);

console.log(failed ? `${failed} failed` : "all passed");
process.exitCode = failed ? 1 : 0;
