#!/usr/bin/env node
// ladder-census — inventory a component tree and propose fidelity ladders.
//
// Usage:
//   node ladder-census.mjs <components-dir> [--objects a,b,c] [--json out.json]
//
// Emits, for each domain object in the lexicon, the components that render it,
// bucketed into fidelity tiers by their representation suffix. Components that
// name an object but carry no representation suffix are reported separately —
// they are the ambiguous middle where ladders usually go wrong.
//
// This is a *proposal* generator, not an authority. It reads names and prop
// shapes; it cannot see what a component actually renders. Every candidate it
// emits is a question for a human, and the field matrix is always hand-built.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { ventureFile } from "../../../packages/naive/src/core/venture-paths.mjs";

// ---------------------------------------------------------------- lexicons

// Representation suffixes, ordered richest to thinnest. The tier number is the
// rung on the ladder; L1 is always the canonical full rendering.
const TIERS = [
  { tier: 1, name: "page", match: /(Page|View|Screen|Detail|Article|Profile)$/ },
  { tier: 2, name: "panel", match: /(Panel|Sheet|Modal|Drawer|Dialog|Section|Block)$/ },
  { tier: 3, name: "card", match: /(Card|Tile|Cell)$/ },
  { tier: 4, name: "row", match: /(Row|Item|ListItem|Entry|Line)$/ },
  { tier: 5, name: "glyph", match: /(Chip|Pill|Badge|Tag|Marker|Avatar|Portrait|Dot|Icon)$/ },
  { tier: 6, name: "preview", match: /(Preview|Tooltip|Hover|Popover|Summary|Snippet)$/ },
];

// Components that are infrastructure, not renderings of a domain object.
const NON_REPRESENTATION = /(Filters?|Provider|Context|Boundary|Shell|Nav|Menu|Form|Manager|Controls?|Handler|Wrapper|Layout|Skeleton|Loader|Portal|Toggle|Switch|Selector|Picker|Search|Pagination|Breadcrumb)$/;

const DEFAULT_OBJECTS = [
  "Officeholder", "Bill", "Address", "Position", "Citation", "Source",
  "Committee", "Chamber", "District", "Person", "Office", "Body", "Vote",
  "Term", "Party", "Election", "Court", "Race", "Measure", "Candidate",
  "Agency", "Jurisdiction",
];

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const root = argv.find((a) => !a.startsWith("--"));
if (!root) {
  console.error("usage: node ladder-census.mjs <components-dir> [--objects a,b] [--json out.json]");
  process.exit(1);
}
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};
const objects = (flag("objects")?.split(",").map((s) => s.trim()).filter(Boolean)) ?? DEFAULT_OBJECTS;
const jsonOut = flag("json");

// ---------------------------------------------------------------- traversal

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = ventureFile(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (extname(entry) === ".tsx" && !/\.(test|spec|stories)\.tsx$/.test(entry)) acc.push(full);
  }
  return acc;
}

// Pull prop names off the component's props type. Deliberately shallow: this is
// a signal for comparing siblings on one ladder, not a type checker.
function extractProps(src, componentName) {
  const patterns = [
    new RegExp(`(?:interface|type)\\s+${componentName}Props\\s*=?\\s*\\{([\\s\\S]*?)\\n\\}`),
    /(?:interface|type)\s+Props\s*=?\s*\{([\s\S]*?)\n\}/,
  ];
  for (const re of patterns) {
    const m = src.match(re);
    if (!m) continue;
    return [...m[1].matchAll(/^\s*(?:readonly\s+)?([a-zA-Z_][\w]*)\??\s*:/gm)].map((x) => x[1]);
  }
  return [];
}

function classify(name) {
  for (const t of TIERS) if (t.match.test(name)) return t;
  return null;
}

// ---------------------------------------------------------------- census

const files = walk(root);
const components = files.map((f) => {
  const name = basename(f, ".tsx");
  const src = readFileSync(f, "utf8");
  return {
    name,
    file: f.replace(root, "").replace(/^\//, ""),
    props: extractProps(src, name),
    lines: src.split("\n").length,
    tier: classify(name),
    infra: NON_REPRESENTATION.test(name),
  };
});

const ladders = {};
const unsuffixed = {};

for (const obj of objects) {
  const owned = components.filter((c) => c.name.toLowerCase().includes(obj.toLowerCase()));
  if (!owned.length) continue;
  const rungs = owned.filter((c) => c.tier && !c.infra);
  const loose = owned.filter((c) => !c.tier && !c.infra);
  if (rungs.length) {
    ladders[obj] = rungs
      .sort((a, b) => a.tier.tier - b.tier.tier)
      .map((c) => ({ tier: `L${c.tier.tier}`, kind: c.tier.name, component: c.name, file: c.file, props: c.props }));
  }
  if (loose.length) unsuffixed[obj] = loose.map((c) => ({ component: c.name, file: c.file, props: c.props }));
}

// A component carrying a representation suffix but matching no object in the
// lexicon is either a generic primitive or an object the lexicon is missing.
const unclaimed = components
  .filter((c) => c.tier && !c.infra)
  .filter((c) => !objects.some((o) => c.name.toLowerCase().includes(o.toLowerCase())))
  .map((c) => ({ tier: `L${c.tier.tier}`, component: c.name, file: c.file }));

// ---------------------------------------------------------------- shared-field analysis

// Where a ladder has two or more rungs, the props common to every rung are the
// candidate kernel; props on exactly one rung are candidate context fields.
for (const [obj, rungs] of Object.entries(ladders)) {
  const withProps = rungs.filter((r) => r.props.length);
  if (withProps.length < 2) continue;
  const common = withProps
    .map((r) => new Set(r.props))
    .reduce((a, b) => new Set([...a].filter((x) => b.has(x))));
  ladders[obj].kernelCandidate = [...common];
}

// ---------------------------------------------------------------- report

const pad = (s, n) => String(s).padEnd(n);
const out = [];
out.push(`ladder census · ${root}`);
out.push(`${files.length} components scanned · ${Object.keys(ladders).length} candidate ladders\n`);

out.push("CANDIDATE LADDERS");
out.push("-".repeat(72));
for (const [obj, rungs] of Object.entries(ladders)) {
  out.push(`\n${obj}  (${rungs.length} rung${rungs.length > 1 ? "s" : ""})`);
  for (const r of rungs) {
    out.push(`  ${pad(r.tier, 4)} ${pad(r.kind, 8)} ${pad(r.component, 30)} ${r.props.length ? r.props.join(", ") : "—"}`);
  }
  if (rungs.kernelCandidate?.length) out.push(`  kernel candidate: ${rungs.kernelCandidate.join(", ")}`);
  const present = new Set(rungs.map((r) => r.tier));
  const missing = TIERS.filter((t) => !present.has(`L${t.tier}`)).map((t) => `L${t.tier}/${t.name}`);
  if (missing.length) out.push(`  absent rungs: ${missing.join("  ")}`);
}

out.push(`\n\nOBJECT-NAMED, NO REPRESENTATION SUFFIX`);
out.push("-".repeat(72));
out.push("Named for an object but not declaring a fidelity. Each is a question:");
out.push("is it a rung that should be renamed, or not a rendering at all?\n");
for (const [obj, list] of Object.entries(unsuffixed)) {
  out.push(`${obj}: ${list.map((c) => c.component).join(", ")}`);
}

out.push(`\n\nREPRESENTATION SUFFIX, NO OBJECT`);
out.push("-".repeat(72));
out.push("Generic primitives, or objects missing from the lexicon.\n");
out.push(unclaimed.map((c) => `${c.tier} ${c.component}`).join("\n"));

console.log(out.join("\n"));

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ root, scanned: files.length, ladders, unsuffixed, unclaimed }, null, 2));
  console.error(`\nwrote ${jsonOut}`);
}
