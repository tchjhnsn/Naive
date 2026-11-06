// Record generators (EE-099): the script beside a schema. A generator has two jobs.
//   describe  what the agent must ask or fill, read from the schema (required fields, enums, descriptions)
//   draft     one record that passes the schema, built from the answers and the record's current state
// It never stores anything: the draft goes to the write chain (mentura <route> write), which keeps the gate,
// provenance and the person's say in one place. Each generator in this folder imports this module.
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { readDataModel, recordPath } from "../../records/index.mjs";

export const repo = new URL("../../../../..", import.meta.url).pathname;
const model = () => readDataModel();
export const recordType = (id) => { const r = model().records.find((x) => x.id === id); if (!r) throw new Error(`no record type ${id}`); return r; };
export const schemaOf = (id) => JSON.parse(readFileSync(recordPath(recordType(id).schema), "utf8"));
export const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// The questions for one object schema: every property, required first, with its allowed values and meaning.
export function questions(obj, prefix = "") {
  const req = new Set(obj.required ?? []);
  return Object.entries(obj.properties ?? {}).map(([k, p]) => ({
    field: prefix + k, required: req.has(k), type: p.enum ? "choice" : p.type ?? (p.items ? "array" : "any"),
    ...(p.enum ? { choices: p.enum } : {}), ...(p.description ? { says: p.description } : {}),
  })).sort((a, b) => Number(b.required) - Number(a.required));
}

// Validate with the same validator the write chain uses (packages/naive/src/records/validate.py), on a scratch copy.
export function validate(id, record) {
  const r = recordType(id), dir = mkdtempSync(join(tmpdir(), "naive-gen-")), f = join(dir, `${id}.json`);
  writeFileSync(f, JSON.stringify(record, null, 2) + "\n");
  const v = spawnSync("python3", [join(repo, "packages/naive/src/records/validate.py"), "--schema", basename(r.schema), "--file", f], { encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  return { ok: v.status === 0, errors: v.status === 0 ? [] : (v.stdout + v.stderr).trim().split("\n").filter((l) => !/checked against/.test(l)) };
}

export const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
export const readJson = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null);

// The command line every generator shares:
//   node packages/naive/src/engine/generators/<type>.mjs describe
//   node packages/naive/src/engine/generators/<type>.mjs draft --input <answers.json|-> [--venture <dir>]
export async function cli(gen, argv = process.argv.slice(2)) {
  const [cmd] = argv, opt = (n) => { const i = argv.indexOf(`--${n}`); return i < 0 ? undefined : argv[i + 1]; };
  if (cmd === "describe") { console.log(JSON.stringify(gen.describe(), null, 2)); return 0; }
  if (cmd === "draft") {
    const src = opt("input"); if (!src) { console.error("draft needs --input <answers.json|->"); return 2; }
    let text = ""; if (src === "-") { for await (const c of process.stdin) text += c; } else text = readFileSync(src, "utf8");
    const out = gen.draft(JSON.parse(text), { venture: opt("venture") });
    console.log(JSON.stringify(out, null, 2)); return out.ok ? 0 : 1;
  }
  console.error(`usage: ${gen.record} generator: describe | draft --input <answers.json|-> [--venture <dir>]`); return 2;
}
