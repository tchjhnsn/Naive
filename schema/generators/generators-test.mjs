// Record generators (EE-099): each pilot describes its questions and drafts a record that passes its schema.
//   node schema/generators/generators-test.mjs
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as bug from "./bug.mjs";
import * as glossary from "./glossary.mjs";
import * as reference from "./reference.mjs";

let fails = 0;
const t = (name, ok) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}`); if (!ok) fails++; };
const v = mkdtempSync(join(tmpdir(), "gen-test-"));
writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "kettle" }));
mkdirSync(join(v, "product/bugs"), { recursive: true });
writeFileSync(join(v, "product/bugs/save-loses-draft.json"), "{}");

for (const g of [bug, glossary, reference]) t(`${g.record}: describe asks at least one required field`, g.describe().ask.some((q) => q.required));

const b = bug.draft({ title: "Save loses draft", severity: "P1", found_in: "0.6.0", repro: "open, type, save" }, { venture: v });
t("bug: draft passes the schema", b.ok);
t("bug: id is unique among the venture's bugs", b.draft.id === "save-loses-draft-2");
t("bug: opens with no fix", b.draft.status === "open" && b.draft.fixed_in === null);
t("bug: a bad severity fails the schema", !bug.draft({ title: "x", severity: "P9", found_in: "1" }).ok);
t("bug: no title is refused before the schema", !bug.draft({ severity: "P1" }).ok);

mkdirSync(join(v, "glossary"), { recursive: true });
writeFileSync(join(v, "glossary/brand.json"), JSON.stringify({ package: "brand", terms: [{ term: "kettle", meaning: "the product" }] }));
const g1 = glossary.draft({ package: "brand", term: "pour", meaning: "one use" }, { venture: v });
t("glossary: adds a term to the current file", g1.ok && g1.draft.terms.length === 2);
t("glossary: a second meaning for a defined term is refused", !glossary.draft({ package: "brand", term: "Kettle", meaning: "a pot" }, { venture: v }).ok);
t("glossary: the same meaning again adds nothing", glossary.draft({ package: "brand", term: "kettle", meaning: "the product" }, { venture: v }).added === false);

mkdirSync(join(v, "purpose/references"), { recursive: true });
writeFileSync(join(v, "purpose/references/references.json"), JSON.stringify({ layer: "purpose", references: [{ id: "minsky-1974-framework", title: "x", authors: ["M"], year: 1974, kind: "paper", summary: "s", informs: [], stance: { is: "adopted", why: "w" } }] }));
const r = reference.draft({ layer: "purpose", title: "A Framework for Representing Knowledge", authors: ["Marvin Minsky"], year: 1974, kind: "paper", summary: "frames", stance: { is: "adapted", why: "Naive's frame record" } }, { root: v });
t("reference: draft passes the schema", r.ok);
t("reference: id is unique in the file", r.added === "minsky-1974-framework-2");
t("reference: checked without a url is dropped", !("checked" in r.draft.references[1]));

console.log(fails ? `${fails} failed` : "record generators: all pass");
process.exitCode = fails ? 1 : 0;
