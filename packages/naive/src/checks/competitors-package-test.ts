// Tests the competitors package (signal library build plan item 6; everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md): its open signal types and listeners hold together without the render.
// Each listener hears a type the package ships, each project listener's route is a projection of that type, every
// worked case's props match the type and its parts, each projection writes a record type the package owns with fields
// that record's schema has, the person's master record is the only projection written once, and each case's expected
// record is a valid record once the render fills what it adds (the subject and each entry's signal). Rendering the
// cases is the render's own test (engine/signals/render.ts, not merged yet) and check-signals (item 7, not built).
//
//   node packages/naive/src/checks/competitors-package-test.ts

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Validator, registryOf } from "../records/validate.mjs";
import { readDataModel } from "../records/index.mjs";
import type { Listener, SignalType } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const pkgDir = join(repo, "packages/naive/library/packages/competitors");
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const json = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;

interface Manifest { name: string, layer: string, records: string[], listeners: Listener[] }
interface ModelRecord { id: string, writer?: string, schema?: string, paths?: string[] }
type Obj = Record<string, unknown>;

const manifest = json<Manifest>(join(pkgDir, "package.json"));
const typesDir = join(pkgDir, "signals/types");
const types: SignalType[] = readdirSync(typesDir).flatMap((id) => readdirSync(join(typesDir, id)).map((v) => json<SignalType>(join(typesDir, id, v))));
const typeOf = (range: string): SignalType | undefined => { const [id, r] = range.split("@"); const major = r.replace(/^[\^~]/, "").split(".")[0]; return types.find((t) => t.id === id && t.version.split(".")[0] === major); };
const v = new Validator(registryOf());
const failures = (value: unknown, schema: unknown, base: string): string => v.validate(JSON.parse(JSON.stringify(value)), JSON.parse(JSON.stringify(schema)), base).map((e: { path: string, message: string }) => `${e.path}: ${e.message}`).join("; ");
const model = readDataModel() as { records: ModelRecord[] };
const layer = json<{ records: string[] }>(join(repo, "packages/naive/src/records/layers/purpose/layer.json"));

expect("the package ships organization@1, funding-event@1, competitor-funding@1 and product-launch@1",
  ["organization", "funding-event", "competitor-funding", "product-launch"].every((id) => types.some((t) => t.id === id && t.version.startsWith("1."))), types.map((t) => `${t.id}@${t.version}`).join(", "));
expect("the package owns competitor and competitor-signals, and the purpose layer no longer lists them",
  manifest.records.includes("competitor") && manifest.records.includes("competitor-signals") && !layer.records.includes("competitor") && !layer.records.includes("competitor-signals"));
expect("the upgrade registry lists the package as it does the other data packages",
  manifest.layer === "purpose" && (manifest as Manifest & { kind?: string }).kind === "data" && typeof json<{ packages: Record<string, { version?: string }> }>(join(repo, "packages/naive/src/engine/upgrades.json")).packages.competitors?.version === "string");
expect("competitor-funding composes organization at org and funding-event at round",
  JSON.stringify(typeOf("competitor-funding@^1")?.composes) === JSON.stringify([{ at: "org", type: "organization@^1" }, { at: "round", type: "funding-event@^1" }]));

// Records a projection route writes: competitors/[id] is competitors/*.json, competitors/[id]/signals is competitors/*/signals.json.
const recordAt = (route: string): ModelRecord | undefined => {
  const path = `${route.replace(/\[id\]/g, "*")}.json`;
  return model.records.find((r) => (r.paths ?? []).some((p) => p.endsWith(`/${path}`) || p === path));
};
const schemaOf = (r: ModelRecord): Obj => json<Obj>(join(repo, r.schema as string));
const SUBJECT: Record<string, string> = { competitor: "id", "competitor-signals": "competitor" };
const ADDRESS = "0".repeat(24);

for (const t of types) {
  expect(`${t.id}: has a freshness max_age`, typeof t.freshness?.max_age === "string");
  for (const p of t.projects) {
    const rec = recordAt(p.route);
    expect(`${t.id}: projects into ${p.route}, a record type the package owns`, !!rec && manifest.records.includes(rec.id), rec?.id ?? "no record type");
    if (!rec) continue;
    const props = (schemaOf(rec).properties ?? {}) as Obj;
    expect(`${t.id}: every field it fills in ${p.route} is in ${rec.id}'s schema`, Object.keys(p.fields).every((f) => f in props), Object.keys(p.fields).join(", "));
    expect(`${t.id}: ${p.route} is written once exactly when a person owns it`, Boolean(p.once) === (rec.writer !== "projection"), `once ${p.once}, writer ${rec.writer ?? "any"}`);
  }
  for (const c of t.cases) {
    for (const g of c.given as { props: Obj }[]) {
      const own = failures(g.props, t.props, "signal-type.schema.json");
      const parts = (t.composes ?? []).map((part) => { const pt = typeOf(part.type); return pt ? failures(g.props[part.at], pt.props, "signal-type.schema.json") : `no type ${part.type}`; }).filter(Boolean).join("; ");
      expect(`${t.id}/${c.id}: a given signal's props match the type and its parts`, !own && !parts, own || parts);
    }
    for (const [route, record] of Object.entries(c.expect)) {
      const pattern = t.projects.find((p) => new RegExp(`^${p.route.replace(/\[id\]/g, "[a-z0-9-]+")}$`).test(route));
      expect(`${t.id}/${c.id}: expects ${route}, which one of its projections writes`, !!pattern, route);
      const rec = pattern ? recordAt(pattern.route) : undefined;
      if (!pattern || !rec) continue;
      expect(`${t.id}/${c.id}: the expected record holds only the fields the projection fills`, Object.keys(record).every((k) => k in pattern.fields), Object.keys(record).join(", "));
      // What the render adds: the subject (subject_field, once it merges) and the address each appended entry names.
      const subject = route.split("/")[1];
      const filled: Obj = { [SUBJECT[rec.id]]: subject, ...Object.fromEntries(Object.entries(record as Obj).map(([k, x]) => [k, Array.isArray(x) ? x.map((e) => ({ ...(e as Obj), signal: ADDRESS })) : x])) };
      const bad = failures(filled, schemaOf(rec), rec.schema?.split("/").at(-1) as string);
      expect(`${t.id}/${c.id}: the expected ${rec.id} is a valid record once the render fills its subject and signals`, !bad, bad);
    }
  }
}

const levels = new Set(["project"]);
for (const l of manifest.listeners) {
  const t = typeOf(l.hears);
  expect(`listener ${l.id}: hears ${l.hears}, a type the package ships`, !!t);
  const route = l.consumer && "route" in l.consumer ? l.consumer.route : undefined;
  if (levels.has(l.then)) expect(`listener ${l.id}: projects into ${route}, a projection of ${l.hears}`, !!t && t.projects.some((p) => p.route === route), String(route));
  else expect(`listener ${l.id}: an edge listener (${l.then}) with a consumer`, !!l.consumer);
}
expect("the default listeners are there: name-competitors, track-competitors, track-launches, rival-raised (propose) and launch-revalidates-stance (revalidate)",
  ["name-competitors", "track-competitors", "track-launches"].every((id) => manifest.listeners.find((l) => l.id === id)?.then === "project")
  && manifest.listeners.find((l) => l.id === "rival-raised")?.then === "propose" && manifest.listeners.find((l) => l.id === "launch-revalidates-stance")?.then === "revalidate");

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
