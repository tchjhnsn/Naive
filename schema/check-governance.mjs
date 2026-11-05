// Checks each venture's ownership-and-control records (EE-022): governance/ownership.json,
// board.json, founder-agreement.json and exit.json, against each other and against
// venture.json. These are records of legal facts; the check catches records that cannot
// all be true, not bad advice. Rules:
//   ownership: ids unique; grants and instruments name known holders and classes; a
//     preferred class states its issue price; a cliff is no longer than its vesting; a
//     percent split adds up to 100; an S corporation has one class of stock (IRC 1361);
//     an LLC counts units and a corporation shares (warning).
//   founders: two or more founder holders need a founder agreement that lists exactly
//     them; unsigned or IP not assigned is a warning.
//   boards: at most one formal board; reserved matters only on it; a seat is appointed by
//     a known holder or class, or by the board; an investor seat by one holding board-seat.
//   venture: venture-capital funding needs a cap table and a formal board; angel funding
//     a cap table; two or more people in a formalized venture should have one (warning).
//   exit: scenario ids unique, and every scenario's payouts add up to its value.
//
//   node schema/check-governance.mjs <workspace or venture dir>

import { ventureFile } from "../packages/core/venture-paths.mjs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { payouts } from "./payouts.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-governance.mjs <workspace or venture dir>"); process.exit(2); }
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const errors = [], warnings = [];
let checked = 0;

for (const root of walk(dir)) {
  const v = load(ventureFile(root, "venture.json"));
  const g = (f) => { const p = ventureFile(root, `governance/${f}`); return existsSync(p) ? load(p) : null; };
  const own = g("ownership.json"), boards = g("board.json"), fa = g("founder-agreement.json"), exit = g("exit.json");
  const at = (f) => `${v.id}/governance/${f}`;
  const people = (v.members ?? []).filter((m) => typeof m === "string" || m.kind !== "agent").length;
  const form = v.form ?? {};
  if (form.funding === "venture-capital" && (!own || !boards?.boards.some((b) => b.kind === "formal"))) errors.push(`${v.id}: venture-capital funding needs governance/ownership.json and a formal board in governance/board.json`);
  if (form.funding === "angel" && !own) errors.push(`${v.id}: angel funding needs governance/ownership.json`);
  if (!own && people >= 2 && form.legal_form && form.legal_form !== "none") warnings.push(`${v.id}: ${people} people in a ${form.legal_form} but no governance/ownership.json`);
  if (!own) { if (boards || fa || exit) errors.push(`${v.id}: board, founder agreement or exit records need governance/ownership.json`); continue; }
  checked++;

  const holders = new Map(), classes = new Map();
  for (const h of own.holders) { if (holders.has(h.id)) errors.push(`${at("ownership.json")}: duplicate holder ${h.id}`); holders.set(h.id, h); }
  for (const c of own.classes) { if (classes.has(c.id)) errors.push(`${at("ownership.json")}: duplicate class ${c.id}`); classes.set(c.id, c); }
  for (const c of own.classes) if (c.kind === "preferred" && !(c.price_per_share > 0)) errors.push(`${at("ownership.json")}: preferred class ${c.id} needs price_per_share, the basis of its preference`);
  for (const gr of own.grants) {
    if (!holders.has(gr.holder)) errors.push(`${at("ownership.json")}: grant to unknown holder ${gr.holder}`);
    if (!classes.has(gr.class)) errors.push(`${at("ownership.json")}: grant of unknown class ${gr.class}`);
    if (gr.vesting && (gr.vesting.cliff_months ?? 0) > gr.vesting.months) errors.push(`${at("ownership.json")}: ${gr.holder}'s cliff is longer than their vesting`);
  }
  for (const i of own.instruments ?? []) if (!holders.has(i.holder)) errors.push(`${at("ownership.json")}: instrument ${i.id} held by unknown holder ${i.holder}`);
  if (own.unit === "percent") { const sum = own.grants.reduce((n, gr) => n + gr.amount, 0); if (Math.abs(sum - 100) > 0.01) errors.push(`${at("ownership.json")}: a percent split adds up to ${sum}, not 100`); }
  if (form.legal_form === "s-corp" && new Set(own.classes.map((c) => `${c.kind}:${c.price_per_share ?? ""}:${JSON.stringify(c.liquidation ?? {})}`)).size > 1) errors.push(`${at("ownership.json")}: an S corporation may have only one class of stock (classes may differ in votes only)`);
  if (form.legal_form === "llc" && own.unit === "shares") warnings.push(`${at("ownership.json")}: an LLC usually counts units, not shares`);
  if (["c-corp", "s-corp", "benefit-corp"].includes(form.legal_form) && own.unit === "units") warnings.push(`${at("ownership.json")}: a corporation counts shares, not units`);

  const founders = own.holders.filter((h) => h.kind === "founder").map((h) => h.id);
  if (founders.length >= 2 && !fa) errors.push(`${v.id}: ${founders.length} founders share ownership but there is no governance/founder-agreement.json`);
  if (fa) {
    const listed = fa.founders.map((f) => f.holder);
    for (const f of founders) if (!listed.includes(f)) errors.push(`${at("founder-agreement.json")}: founder ${f} is not in the agreement`);
    for (const f of listed) if (!founders.includes(f)) errors.push(`${at("founder-agreement.json")}: ${f} is not a founder holder in ownership.json`);
    if (!fa.signed) warnings.push(`${at("founder-agreement.json")}: not signed yet`);
    for (const f of fa.founders) if (!f.ip_assigned) warnings.push(`${at("founder-agreement.json")}: ${f.holder} has not assigned their IP to the venture`);
    if (!existsSync(ventureFile(root, fa.document))) errors.push(`${at("founder-agreement.json")}: document ${fa.document} not found (paths are relative to the venture folder)`);
  }

  if (boards) {
    if (boards.boards.filter((b) => b.kind === "formal").length > 1) errors.push(`${at("board.json")}: more than one formal board`);
    for (const b of boards.boards) {
      if (b.kind !== "formal" && b.reserved_matters?.length) errors.push(`${at("board.json")}: advisory board ${b.id} has reserved matters; an advisory board decides nothing`);
      for (const s of b.seats) {
        const by = s.appointed_by;
        if (by !== "board" && !holders.has(by) && !classes.has(by)) errors.push(`${at("board.json")}: seat ${s.id} appointed by unknown ${by}`);
        if (s.type === "investor" && b.kind === "formal") {
          const rights = classes.get(by)?.rights ?? (own.instruments ?? []).filter((i) => i.holder === by).flatMap((i) => i.rights ?? []).concat(own.grants.filter((gr) => gr.holder === by).flatMap((gr) => classes.get(gr.class)?.rights ?? []));
          if (!rights.includes("board-seat")) errors.push(`${at("board.json")}: investor seat ${s.id} is appointed by ${by}, which holds no board-seat right`);
        }
      }
    }
  }

  if (exit) {
    const ids = (exit.scenarios ?? []).map((s) => s.id);
    if (new Set(ids).size !== ids.length) errors.push(`${at("exit.json")}: duplicate scenario ids`);
    for (const s of exit.scenarios ?? []) {
      const r = payouts(own, s.value);
      const sum = r.payouts.reduce((n, p) => n + p.amount, 0);
      if (Math.abs(sum - s.value) > 1) errors.push(`${at("exit.json")}: scenario ${s.id} pays out ${sum}, not ${s.value}`);
    }
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${checked} ventures with ownership records: every governance rule holds.`);
