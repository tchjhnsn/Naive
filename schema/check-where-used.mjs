// Checks each venture's where-used list (EE-042): every parent route and child source exists, and
// every live child shows its parent's value. A child that disagrees is drift: the parent changed
// and the change has not reached it. Frozen children are history and are not checked. Children in
// a source that is not on the file system are listed as not checked here: reading them needs the
// network, which is the platform's.
//
//   node schema/check-where-used.mjs <workspace or venture dir> [--json]

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { connect, sourceFor, sourcesOf } from "../knowledge/connectors/index.mjs";
import { resolve } from "../interface/router.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-where-used.mjs <workspace or venture dir> [--json]"); process.exit(2); }
const FILE = "knowledge/where-used.json";
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const at = (obj, pointer) => pointer.split("/").slice(1).map((k) => k.replace(/~1/g, "/").replace(/~0/g, "~")).reduce((o, k) => o == null ? undefined : o[k], obj);

const errors = [], drift = [], unchecked = [];
let lists = 0, checked = 0;
for (const v of walk(dir)) {
  if (!existsSync(join(v, FILE))) continue;
  lists++;
  const id = JSON.parse(readFileSync(join(v, "venture.json"), "utf8")).id;
  const ids = new Map(sourcesOf(v).sources.map((s) => [s.id, s]));
  for (const fact of JSON.parse(readFileSync(join(v, FILE), "utf8")).facts) {
    const where = `${id}: ${fact.id}`;
    const { r, params } = resolve(fact.parent.route);
    if (!r || r.kind !== "record" || r.collection === "list") { errors.push(`${where}: parent ${fact.parent.route} is not a record route`); continue; }
    const context = r.collection === "item" && (r.record === "product" || r.record === "account") ? { [r.record]: params.id } : {};
    const src = sourceFor(v, r.record, context);
    const path = r.collection === "item" ? r.files[0].replace("*", params.id) : r.files[0];
    if (src.connector !== "filesystem") { unchecked.push(`${where}: parent is in ${src.id}`); continue; }
    const parent = await (await connect(src, v)).read(path);
    const value = parent && at(JSON.parse(parent.content), fact.parent.pointer);
    if (value === undefined || value === null) { errors.push(`${where}: ${fact.parent.route} has no value at ${fact.parent.pointer}`); continue; }
    for (const child of fact.children) {
      const cw = `${where} -> ${child.source}://${child.path}`;
      const s = ids.get(child.source);
      if (!s) { errors.push(`${cw}: ${child.source} is not one of the venture's sources`); continue; }
      if (child.status === "frozen") continue;
      if (s.connector !== "filesystem") { unchecked.push(`${cw}: needs the network (the platform checks it)`); continue; }
      const got = await (await connect(s, v)).read(child.path);
      if (!got) { errors.push(`${cw}: no such file`); continue; }
      checked++;
      const ok = child.match.kind === "json"
        ? JSON.stringify(at(JSON.parse(got.content), child.match.pointer)) === JSON.stringify(value)
        : got.content.includes(child.match.template.replaceAll("{value}", String(value)));
      if (!ok) drift.push(`${cw}: does not show ${JSON.stringify(value)} (${child.match.kind === "json" ? child.match.pointer : child.match.template}); deliver by ${child.deliver}`);
    }
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify({ lists, checked, drift, unchecked, errors }, null, 2));
if (errors.length || drift.length) { for (const e of [...errors, ...drift]) console.error(e); process.exit(1); }
if (!process.argv.includes("--json")) console.log(`${lists} where-used lists: ${checked} live children show their parent's value${unchecked.length ? `; ${unchecked.length} need the platform to check` : ""}.`);
