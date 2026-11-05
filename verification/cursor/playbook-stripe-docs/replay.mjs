#!/usr/bin/env node
// Replays the stripe-docs playbook against the router on a fixture venture.
//   node verification/cursor/playbook-stripe-docs/replay.mjs
// Prints one PASS or FAIL line per rule. Exit 1 if any rule fails.
// The fixture is a temporary venture. This script does not write into instance/.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../../..");
const cli = join(repo, "interface/cli/mentura.mjs");
const router = join(repo, "interface/router.mjs");
const init = join(repo, "schema/init-venture.mjs");

const rows = [];
const note = (rule, ok, detail) => {
  rows.push({ rule, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${rule}`);
  console.log(`      ${detail}`);
};

const SPEC_KEYS = ["objects", "retry-writes", "error-shape", "versions", "changelog"];
const HABIT_KEYS = ["date", "difference", "previous-wording", "product"];

function linesOf(answer) {
  const out = {};
  for (const line of String(answer ?? "").split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}
const filled = (value) => typeof value === "string" && value.length > 0 && !value.includes("<") && !value.includes(">");
const statusOk = (rec) => rec && (rec.status === "open" || (rec.status === "decided" && typeof rec.provenance?.approved_by === "string" && rec.provenance.approved_by.length > 0));
const keysOk = (rec, keys) => {
  const lines = linesOf(rec?.answer);
  return keys.every((k) => filled(lines[k]));
};
function check2(rec) {
  return statusOk(rec) && keysOk(rec, SPEC_KEYS);
}
function check4(rec) {
  return statusOk(rec) && keysOk(rec, HABIT_KEYS);
}
function objectsOf(rec) {
  return linesOf(rec?.answer).objects.split(",").map((s) => s.trim()).filter(Boolean);
}
function check1(card, icp) {
  const ids = new Set(Object.keys(icp ?? {}));
  return Array.isArray(card?.offered_to) && card.offered_to.length > 0 && card.offered_to.every((id) => ids.has(id));
}
function check3(glossary, spec) {
  const objects = new Set(objectsOf(spec));
  const terms = glossary?.terms ?? [];
  return terms.length > 0 && terms.every((t) => objects.has(t.term));
}
function check5(entry, products) {
  if (!check4(entry)) return false;
  const id = linesOf(entry.answer).product;
  return Object.prototype.hasOwnProperty.call(products ?? {}, id);
}

const root = mkdtempSync(join(tmpdir(), "stripe-docs-replay-"));
const venture = join(root, "docs-probe");
const scratch = join(root, "scratch");
spawnSync("mkdir", ["-p", scratch]);

function node(script, args) {
  return spawnSync("node", [script, ...args], { encoding: "utf8", cwd: repo });
}
function mentura(args, file) {
  const cmd = ["--venture", "docs-probe", "--workspace", root, "--json"];
  if (file) cmd.push("--input", file);
  const r = node(cli, [...args, ...cmd]);
  let json = null;
  for (const text of [r.stdout, r.stderr]) {
    try { json = JSON.parse(text); break; } catch { json = null; }
  }
  return { status: r.status ?? 1, json, stdout: r.stdout, stderr: r.stderr };
}
function writeJson(name, value) {
  const path = join(scratch, name);
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
  return path;
}
const fullSpec = {
  id: "docs-spec",
  question: "What does a caller read before this product changes?",
  decides: { record: "product", path: "product/ledger.json" },
  layer: "purpose",
  boundary: "fail-open",
  needed_in: "validation",
  answer: [
    "objects: transfer",
    "retry-writes: recording a transfer may be repeated; the caller sends a new token; a second try with different inputs is refused",
    "error-shape: a code, the field when there is one, and a sentence a person can read",
    "versions: an addition does not force a caller to change; a rename, a removal, or a new shape does",
    "changelog: date, what the caller sees differently, whether the previous wording still works, product id",
  ].join("\n"),
};
const thinSpec = { ...fullSpec, answer: fullSpec.answer.replace("versions: an addition does not force a caller to change; a rename, a removal, or a new shape does", "versions: <which changes force a new wording>") };
const habit = {
  id: "changelog-habit",
  question: "What does a caller read when this product changes?",
  decides: { record: "product", path: "product/ledger.json" },
  layer: "purpose",
  boundary: "fail-open",
  needed_in: "validation",
  answer: [
    "date: the day the caller can see the change",
    "difference: what the caller sees differently",
    "previous-wording: whether a caller on the previous wording must change",
    "product: ledger",
  ].join("\n"),
};
const entry = (product) => ({
  id: "changelog-first-change",
  question: "What does a caller see differently in this change?",
  decides: { record: "product", path: "product/ledger.json" },
  layer: "purpose",
  boundary: "fail-open",
  needed_in: "validation",
  answer: [
    "date: 2026-10-29",
    "difference: a transfer now carries a note the caller can read back",
    "previous-wording: the previous wording still works",
    `product: ${product}`,
  ].join("\n"),
});

try {
  const tableRun = node(router, []);
  const table = JSON.parse(tableRun.stdout);
  const names = new Set(table.map((r) => r.route));
  const wanted = ["foundation/icp", "product", "product/[id]", "decisions", "decisions/[id]", "glossary/[id]"];
  const missing = wanted.filter((r) => !names.has(r));
  note("RouteReal", missing.length === 0, missing.length ? `missing from node interface/router.mjs: ${missing.join(", ")}` : `all ${wanted.length} template routes are in the route table (${table.length} routes)`);

  const made = node(init, [venture, "docs-probe", "--phase", "validation"]);
  if (made.status !== 0) throw new Error(made.stderr || made.stdout || "init failed");

  const noIcp = mentura(["foundation/icp", "read"]);
  note("No reader yet", noIcp.json?.ok === true && noIcp.json?.result === null && noIcp.json?.not_found, `foundation/icp read before any record: result ${JSON.stringify(noIcp.json?.result)}, not_found ${JSON.stringify(noIcp.json?.not_found?.note)}`);

  const icpFile = writeJson("icp.json", { id: "builders", who: "People who call the product from their own software.", primary: true });
  const icpWrite = mentura(["foundation/icp/builders", "write", "--as", "person", "--note", "replay reader"], icpFile);
  const icpRead = mentura(["foundation/icp", "read"]);
  const profileIds = Object.keys(icpRead.json?.result ?? {});
  note("Venture provides the reader", icpWrite.status === 0 && profileIds.includes("builders"), `person write status ${icpWrite.status}; read profiles ${profileIds.join(", ") || "(none)"}`);

  const emptyList = mentura(["product", "read"]);
  note("Empty product list is a real read", emptyList.json?.ok === true && emptyList.json?.result === null, `product read before any card: result ${JSON.stringify(emptyList.json?.result)}, note ${JSON.stringify(emptyList.json?.not_found?.note)}`);

  const unlinked = writeJson("unlinked.json", { id: "ledger", name: "Ledger", description: "A caller records a transfer and reads it back." });
  mentura(["product/ledger", "write", "--note", "replay card with no reader"], unlinked);
  const unlinkedRead = mentura(["product/ledger", "read"]);
  note("Check 1 fails when the card names no reader", check1(unlinkedRead.json?.result, icpRead.json?.result) === false, `offered_to ${JSON.stringify(unlinkedRead.json?.result?.offered_to ?? null)}`);

  const linked = writeJson("linked.json", { id: "ledger", name: "Ledger", description: "A caller records a transfer and reads it back.", offered_to: ["builders"] });
  const linkedWrite = mentura(["product/ledger", "write", "--note", "replay card"], linked);
  const linkedRead = mentura(["product/ledger", "read"]);
  note("Check 1 passes when offered_to is the profile id", linkedWrite.status === 0 && check1(linkedRead.json?.result, icpRead.json?.result) === true, `offered_to ${JSON.stringify(linkedRead.json?.result?.offered_to)}`);

  const unknown = writeJson("unknown.json", { id: "ledger", name: "Ledger", description: "A caller records a transfer and reads it back.", offered_to: ["no-such-profile"] });
  const unknownWrite = mentura(["product/ledger", "write", "--note", "replay unknown profile"], unknown);
  const unknownRead = mentura(["product/ledger", "read"]);
  note("Check 1 fails when offered_to is not a profile, and the schema still accepts the write", unknownWrite.status === 0 && check1(unknownRead.json?.result, icpRead.json?.result) === false, `write status ${unknownWrite.status}; offered_to ${JSON.stringify(unknownRead.json?.result?.offered_to)}`);
  mentura(["product/ledger", "write", "--note", "restore linked card"], linked);

  const thinWrite = mentura(["propose"], writeJson("thin.json", thinSpec));
  const thinRead = mentura(["decisions/docs-spec", "read"]);
  note("Check 2 fails when a section is still a placeholder", thinWrite.status === 0 && check2(thinRead.json?.result) === false, `status ${thinRead.json?.result?.status}; versions line ${JSON.stringify(linesOf(thinRead.json?.result?.answer).versions)}`);

  const specWrite = mentura(["propose"], writeJson("spec.json", fullSpec));
  const specRead = mentura(["decisions/docs-spec", "read"]);
  const drafted = specRead.json?.result?.provenance?.drafted_by?.kind;
  note("Check 2 passes on an open proposal with five filled lines", specWrite.status === 0 && specRead.json?.result?.status === "open" && drafted === "agent" && check2(specRead.json?.result) === true, `status ${specRead.json?.result?.status}; drafted_by ${drafted}`);

  const forced = writeJson("forced.json", {
    id: "docs-spec-forced",
    question: "Can an agent mark this decided?",
    status: "decided",
    answer: fullSpec.answer,
    provenance: { drafted_by: { kind: "agent", id: "replay" } },
  });
  const forcedWrite = mentura(["decisions/docs-spec-forced", "write", "--note", "replay decided"], forced);
  const forcedRead = mentura(["decisions/docs-spec-forced", "read"]);
  note("An agent's direct write of decided is held as a draft, so check 2 fails", forcedWrite.json?.result?.draft === true && forcedRead.json?.result === null && !check2(forcedRead.json?.result), `draft ${forcedWrite.json?.result?.draft}; read result ${JSON.stringify(forcedRead.json?.result)}`);

  const personForced = mentura(["decisions/docs-spec-forced", "write", "--as", "person", "--note", "replay decided"], forced);
  note("A person's direct write of decided with no approved_by is refused", personForced.status !== 0 && `${personForced.stdout}${personForced.stderr}`.includes("approved_by"), `write status ${personForced.status}`);

  const refused = mentura(["propose"], writeJson("refused.json", { ...fullSpec, id: "docs-spec-refused", status: "decided" }));
  note("propose refuses a decided status", refused.status !== 0, `propose status ${refused.status}; ${((refused.stderr || refused.stdout) || "").trim().split("\n")[0]}`);

  const nested = mentura(["propose"], writeJson("nested.json", { id: "docs-spec-nested", at: "product", question: "Does a nested file come back on the route?", answer: fullSpec.answer }));
  const nestedRead = mentura(["decisions/docs-spec-nested", "read"]);
  note("A decision filed with at=product is not on decisions/[id]", nested.status === 0 && nested.json?.file === "product/decisions/docs-spec-nested.decision.json" && nestedRead.json?.result === null, `file ${nested.json?.file}; read result ${JSON.stringify(nestedRead.json?.result)}`);

  const badTerms = writeJson("bad-glossary.json", { package: "product", terms: [{ term: "charge", meaning: "Not an object on this spec.", export: false }] });
  mentura(["glossary/product", "write", "--as", "person", "--note", "replay bad term"], badTerms);
  const badGlossary = mentura(["glossary/product", "read"]);
  note("Check 3 fails when a term is not on the objects line", check3(badGlossary.json?.result, specRead.json?.result) === false, `term ${badGlossary.json?.result?.terms?.[0]?.term}`);

  const goodTerms = writeJson("glossary.json", { package: "product", terms: [{ term: "transfer", meaning: "One movement a caller records and reads back.", export: false }] });
  const glossaryWrite = mentura(["glossary/product", "write", "--as", "person", "--note", "replay terms"], goodTerms);
  const glossaryRead = mentura(["glossary/product", "read"]);
  note("Check 3 passes when each term is an object on the spec", glossaryWrite.status === 0 && check3(glossaryRead.json?.result, specRead.json?.result) === true, `terms ${(glossaryRead.json?.result?.terms ?? []).map((t) => t.term).join(", ")}`);

  const habitMissing = mentura(["decisions/changelog-habit", "read"]);
  note("Check 4 fails when the habit is not on file", !check4(habitMissing.json?.result), `result ${JSON.stringify(habitMissing.json?.result)}`);

  const habitWrite = mentura(["propose"], writeJson("habit.json", habit));
  const habitRead = mentura(["decisions/changelog-habit", "read"]);
  note("Check 4 passes on an open habit with four filled lines", habitWrite.status === 0 && habitRead.json?.result?.status === "open" && check4(habitRead.json?.result) === true, `status ${habitRead.json?.result?.status}`);

  const badEntryWrite = mentura(["propose"], writeJson("bad-entry.json", entry("no-such-product")));
  const badEntry = mentura(["decisions/changelog-first-change", "read"]);
  const products = mentura(["product", "read"]);
  note("Check 5 fails when product is not an id on the product list", badEntryWrite.status === 0 && check5(badEntry.json?.result, products.json?.result) === false, `product line ${JSON.stringify(linesOf(badEntry.json?.result?.answer).product)}; list keys ${Object.keys(products.json?.result ?? {}).join(", ")}`);

  const entryWrite = mentura(["propose"], writeJson("entry.json", entry("ledger")));
  const entryRead = mentura(["decisions/changelog-first-change", "read"]);
  const productsAgain = mentura(["product", "read"]);
  note("Check 5 passes when product is a card id", entryWrite.status === 0 && check5(entryRead.json?.result, productsAgain.json?.result) === true, `product line ${JSON.stringify(linesOf(entryRead.json?.result?.answer).product)}`);

  const list = mentura(["decisions", "read"]);
  const keys = (list.json?.decisions ?? []).map((d) => d.id);
  note("decisions list returns the habit, the entry and the at=product decision", keys.includes("changelog-habit") && keys.includes("changelog-first-change") && keys.includes("docs-spec-nested"), `${keys.length} ids; nested on the list ${keys.includes("docs-spec-nested")}`);

  const decided = mentura(["decide", "docs-spec", "--by", "Ada Founder", "--confirm", "docs-spec"]);
  const decidedRead = mentura(["decisions/docs-spec", "read"]);
  note("Check 2 still passes after the founder decides", decided.status === 0 && decidedRead.json?.result?.status === "decided" && decidedRead.json?.result?.provenance?.approved_by === "Ada Founder" && check2(decidedRead.json?.result) === true, `decide status ${decided.status}; approved_by ${JSON.stringify(decidedRead.json?.result?.provenance?.approved_by ?? null)}`);

  const cardCheck = mentura(["product/ledger", "check"]);
  const cardPassed = cardCheck.json?.ok === true && (cardCheck.json?.result ?? []).every((c) => c.passed === true);
  note("product/ledger check passes on this fixture", cardPassed, `ok ${cardCheck.json?.ok}; ${(cardCheck.json?.result ?? []).map((c) => `${c.check} ${c.passed}`).join("; ")}`);

  const soft = writeJson("soft.json", { id: "ledger-soft", name: "Ledger Soft", description: "A software card with no repository.", software: true, offered_to: ["builders"] });
  const softWrite = mentura(["product/ledger-soft", "write", "--note", "replay software without a repo"], soft);
  const softCheck = mentura(["product/ledger", "check"]);
  const softText = `${softCheck.stdout}\n${softCheck.stderr}`;
  const softFailed = softWrite.status === 0 && softCheck.status !== 0 && softText.includes("ledger-soft") && softText.includes("repository");
  note("product/[id] check runs on the whole venture, so another card can fail it", softFailed, `ledger check status ${softCheck.status}; ${softText.replace(/\s+/g, " ").trim().slice(0, 320)}`);
} catch (error) {
  note("replay", false, error.stack || error.message);
} finally {
  rmSync(root, { recursive: true, force: true });
}

const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} passed`);
process.exit(failed.length ? 1 : 0);
