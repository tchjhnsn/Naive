// The connectors through the router (EE-037, EE-042): a venture whose source map keeps one record type
// in another folder, the catalog across both sources, the source-of-truth matrix and attributes
// mastered elsewhere. These evals run routes through the router's call, so they moved here from
// packages/naive/src/store/connectors/eval.mjs in step 4 of the router inversion. The contract suite stays there.
//
//   router     reads come from the mapped source with their version, a write lands there and is
//              logged by address, nothing invalid reaches the source, and every other record stays
//              in the venture
//   catalog    one index across both sources, and a rebuild reads only what changed
//   matrix     the most specific rule picks the system of record, and ties are refused
//   attributes each attribute is read from and written to its own system of record
//
//   node packages/naive/src/interfaces/tests/connectors-router-test.mjs

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { blobSha } from "../../store/connectors/contract.mjs";
import { harness } from "../../store/connectors/suite.mjs";
import { build, FILE, load, search } from "../../store/connectors/catalog.mjs";

const repo = new URL("../../../../..", import.meta.url).pathname;
const h = harness("connectors-router");
const { expect, write, scratch, finish } = h;

// ---- Router --------------------------------------------------------------------------------------
console.log("\n# router over a mapped source");
const ws = join(scratch, "workspace");
cpSync(join(repo, "packages/naive/src/records/examples/workspace"), ws, { recursive: true });
process.env.MENTURA_WORKSPACE = ws;
const tandem = join(ws, "ventures/tandem");
const shared = join(ws, "shared");
const { call } = await import("../../router/router.mjs");
const { entries } = await import("../../core/provenance.mjs");
const kettle = { ...Object.values((await call({ venture: "tandem", route: "purpose/product", action: "read" })).result)[0], id: "kettle", name: "Kettle (in the shared folder)" };
write(shared, { "products/kettle.json": JSON.stringify(kettle, null, 2) + "\n", "notes/launch.md": "# Launch plan\n\nShip the kettle subscription in spring.\n" });
const map = { sources: [{ id: "shared", connector: "filesystem", root: "../../shared" }], records: { product: "shared" } };
write(tandem, { "knowledge/sources.json": JSON.stringify(map, null, 2) + "\n" });
const localProducts = existsSync(join(tandem, "products")) ? spawnSync("ls", [join(tandem, "products")], { encoding: "utf8" }).stdout.trim().split("\n") : [];

const list = await call({ venture: "tandem", route: "purpose/product", action: "read" });
expect("router: a mapped record type is read from its source, not the venture folder", list.ok && JSON.stringify(Object.keys(list.result)) === JSON.stringify(["kettle"]) && localProducts.length > 0, JSON.stringify(list).slice(0, 300));
const one = await call({ venture: "tandem", route: "purpose/product/kettle", action: "read" });
expect("router: a read says which source and version it came from", one.result?.name === "Kettle (in the shared folder)" && one.source?.address === "shared://products/kettle.json"
  && one.source.version === blobSha(JSON.stringify(kettle, null, 2) + "\n"), JSON.stringify(one.source));
const local = await call({ venture: "tandem", route: "purpose/validation/problem", action: "read" });
expect("router: every record type the map does not name stays in the venture folder", local.ok && local.source?.source === "venture" && local.source.version === blobSha(readFileSync(join(tandem, "purpose/validation/problem.json"))));
const teapot = { ...kettle, id: "teapot", name: "Teapot" };
const bad = await call({ venture: "tandem", route: "purpose/product/teapot", action: "write", input: { id: "teapot" } });
expect("router: a write that does not match the schema never reaches the source", !bad.ok && /does not match/.test(bad.error) && !existsSync(join(shared, "products/teapot.json")));
const w = await call({ venture: "tandem", route: "purpose/product/teapot", action: "write", input: teapot, actor: "person", via: "cli", provenance: { note: "add the teapot" } });
expect("router: a write lands in the mapped source, not the venture folder", w.ok && JSON.parse(readFileSync(join(shared, "products/teapot.json"), "utf8")).name === "Teapot" && !existsSync(join(tandem, "products/teapot.json")), JSON.stringify(w));
const e = entries(tandem).at(-1);
expect("router: the write is logged by address, with the source's version", e.entity === "shared://products/teapot.json" && e.source?.connector === "filesystem" && e.source.version === blobSha(readFileSync(join(shared, "products/teapot.json"))), JSON.stringify(e));
const prov = spawnSync("node", [join(repo, "packages/naive/src/checks/check-provenance.mjs"), ws], { encoding: "utf8" });
const srcCheck = (d) => spawnSync("node", [join(repo, "packages/naive/src/checks/check-sources.mjs"), d], { encoding: "utf8" });
expect("router: check-provenance accepts entries for records in another source", prov.status === 0, prov.stderr);
expect("router: check-sources accepts the map", srcCheck(ws).status === 0, srcCheck(ws).stderr);
const valid = spawnSync(process.execPath, [join(repo, "packages/naive/src/records/validate.mjs"), "--schema", "knowledge-sources.schema.json", "--file", join(tandem, "knowledge/sources.json")], { encoding: "utf8" });
expect("router: the map matches its schema", valid.status === 0, valid.stdout + valid.stderr);
write(tandem, { "knowledge/sources.json": JSON.stringify({ sources: [{ id: "team-repo", connector: "notion" }], records: { product: "team-repo", venture: "team-repo" } }) });
const broken = srcCheck(ws);
expect("router: check-sources refuses an unknown connector and a record type that must stay in the folder", broken.status === 1 && /no connector notion/.test(broken.stderr) && /venture stays in the venture folder/.test(broken.stderr), broken.stderr);
const refused = await call({ venture: "tandem", route: "purpose/product", action: "read" });
expect("router: a read through an unknown connector fails and says which connectors exist", !refused.ok && /no connector notion: .*filesystem/.test(refused.error), refused.error);
write(tandem, { "knowledge/sources.json": JSON.stringify({ ...map, sources: [{ ...map.sources[0], writes: "none" }] }) });
const ro = await call({ venture: "tandem", route: "purpose/product/teapot", action: "write", input: teapot, actor: "person" });
expect("router: a write to a read-only source is refused", !ro.ok && /read-only/.test(ro.error));
write(tandem, { "knowledge/sources.json": JSON.stringify(map, null, 2) + "\n" });

// ---- Catalog -------------------------------------------------------------------------------------
console.log("\n# catalog");
const { stats } = await build(tandem);
const cat = load(tandem);
expect("catalog: indexes every item in both sources", cat.items.some((x) => x.source === "shared" && x.path === "notes/launch.md") && cat.items.some((x) => x.source === "venture" && x.path === "purpose/validation/problem.json") && stats.errors.length === 0, JSON.stringify(stats));
expect("catalog: every item has an address and its version", cat.items.every((x) => x.address === `${x.source}://${x.path}` && /^[0-9a-f]{40}$/.test(x.version)));
expect("catalog: records are tied to their routes, wherever they live", cat.items.find((x) => x.address === "shared://products/kettle.json")?.route === "product/kettle" && cat.items.find((x) => x.path === "purpose/validation/problem.json")?.route === "foundation/problem");
const s1 = search(cat, "kettle subscription spring");
expect("catalog: search finds an item in the mapped source", s1[0]?.address === "shared://notes/launch.md" && s1[0].title === "Launch plan", JSON.stringify(s1.slice(0, 2)));
const research = readFileSync(join(tandem, "knowledge/research/pilot-2026-10.md"), "utf8");
expect("catalog: search finds an item in the venture folder", search(cat, "pilot").some((x) => x.address === "venture://knowledge/research/pilot-2026-10.md"));
const raw = readFileSync(join(tandem, FILE), "utf8");
const phrase = research.split("\n").find((l) => l.split(" ").length > 6)?.slice(0, 40);
expect("catalog: keeps no content (no sentence of an item appears in it)", phrase && !raw.includes(phrase) && !raw.includes("Ship the kettle subscription"), phrase);
const again = (await build(tandem)).stats;
expect("catalog: a rebuild with nothing changed reads nothing", again.read === 0 && again.reused === stats.items, JSON.stringify(again));
write(shared, { "notes/later.md": "# Later\n\nAdded after the first build.\n" });
const changed = (await build(tandem)).stats;
expect("catalog: after a change, a rebuild reads only the new item", changed.read === 1 && load(tandem).items.some((x) => x.address === "shared://notes/later.md"), JSON.stringify(changed));

// ---- Matrix (EE-042) ------------------------------------------------------------------------------
console.log("\n# source-of-truth matrix");
const { resolve: resolveRule } = await import("../../store/connectors/resolve.mjs");
const { sourceFor } = await import("../../store/connectors/index.mjs");
const rule = (o) => ({ record: "product", attribute: "*", phase: "*", product: "*", account: "*", actor: "*", owner: "founder", ...o });
const matrix = { sources: map.sources, records: {}, rules: [
  rule({ system_of_record: "venture" }),
  rule({ phase: "validation", system_of_record: "shared" }),
  rule({ product: "kettle", phase: "validation", system_of_record: "venture", note: "the kettle stays in the folder" }),
  rule({ attribute: "price", system_of_record: "shared" }),
] };
expect("matrix: the most specific rule wins", resolveRule(matrix, { record: "product", phase: "validation", product: "kettle" }).rule.note === "the kettle stays in the folder");
expect("matrix: a rule narrowed to a phase holds only in that phase", resolveRule(matrix, { record: "product", phase: "validation" }).rule.system_of_record === "shared" && resolveRule(matrix, { record: "product", phase: "scale" }).rule.system_of_record === "venture");
expect("matrix: a field the query leaves out matches only \"*\"", resolveRule(matrix, { record: "product" }).rule.system_of_record === "venture");
expect("matrix: an attribute rule answers for that attribute, not for whole-record reads", resolveRule(matrix, { record: "product", attribute: "price" }).rule.attribute === "price" && resolveRule(matrix, { record: "product" }).rule.attribute === "*");
expect("matrix: a record type no rule names falls back to the records shorthand, then to nothing", resolveRule({ records: { account: "shared" } }, { record: "account" }).rule.system_of_record === "shared" && resolveRule(matrix, { record: "telos" }) === null);
expect("matrix: two rules that hold at once at the same specificity tie", resolveRule({ rules: [rule({ phase: "validation", system_of_record: "a" }), rule({ actor: "agent", system_of_record: "b" })] }, { record: "product", phase: "validation", actor: "agent" }).ties.length === 2);
write(tandem, { "knowledge/sources.json": JSON.stringify(matrix, null, 2) + "\n" });
expect("matrix: sourceFor reads the venture's phase from venture.json (tandem is in validation)", sourceFor(tandem, "product").id === "shared" && sourceFor(tandem, "product", { product: "kettle" }).id === "venture");
const viaRouter = await call({ venture: "tandem", route: "purpose/product/teapot", action: "read" });
const kettleWrite = await call({ venture: "tandem", route: "purpose/product/kettle", action: "write", input: { ...kettle, name: "Kettle (kept in the folder)" }, actor: "person" });
expect("matrix: the router routes each read and write by its context", viaRouter.source?.source === "shared" && kettleWrite.ok && existsSync(join(tandem, "products/kettle.json")) && JSON.parse(readFileSync(join(shared, "products/kettle.json"), "utf8")).name === "Kettle (in the shared folder)", JSON.stringify([viaRouter.source, kettleWrite]));
expect("matrix: check-sources accepts the matrix", srcCheck(ws).status === 0, srcCheck(ws).stderr);
write(tandem, { "knowledge/sources.json": JSON.stringify({ ...matrix, rules: [...matrix.rules, rule({ actor: "agent", system_of_record: "venture" })] }, null, 2) + "\n" });
const tie = srcCheck(ws);
expect("matrix: check-sources refuses two rules that can tie", tie.status === 1 && /tie at the same specificity/.test(tie.stderr), tie.stderr);
const tieRead = await call({ venture: "tandem", route: "purpose/product", action: "read", actor: "agent" });
expect("matrix: a read that two rules tie on fails and says so", !tieRead.ok && /tie at the same specificity/.test(tieRead.error), tieRead.error);

// Attributes mastered elsewhere: the product's description lives in the shared folder, the rest
// of the product in the venture folder.
const byAttr = { sources: map.sources, records: {}, rules: [rule({ system_of_record: "venture" }), rule({ attribute: "description", system_of_record: "shared" })] };
write(tandem, { "knowledge/sources.json": JSON.stringify(byAttr, null, 2) + "\n" });
write(shared, { "products/shop-app.json": JSON.stringify({ description: "Mastered in the shared folder" }, null, 2) + "\n" });
const shop = await call({ venture: "tandem", route: "purpose/product/shop-app", action: "read" });
expect("attributes: a read fills each attribute from its own system of record and cites it", shop.result?.description === "Mastered in the shared folder" && shop.source?.source === "venture" && shop.source.attributes?.description?.address === "shared://products/shop-app.json", JSON.stringify(shop.source));
const shopList = await call({ venture: "tandem", route: "purpose/product", action: "read" });
expect("attributes: list reads overlay too", shopList.result?.["shop-app"]?.description === "Mastered in the shared folder");
write(shared, { "products/kettle.json": "{}\n" });
const noFrag = await call({ venture: "tandem", route: "purpose/product/kettle", action: "read" });
expect("attributes: a source holding nothing for the attribute leaves the record's own value and says so", noFrag.result?.name === "Kettle (kept in the folder)" && noFrag.result?.description === kettle.description && noFrag.source.attributes?.description?.missing === true, JSON.stringify(noFrag.source));
const shopWrite = await call({ venture: "tandem", route: "purpose/product/shop-app", action: "write", input: { ...shop.result, description: "Changed once, in one place" }, actor: "person", provenance: { note: "new description" } });
const own = JSON.parse(readFileSync(join(tandem, "products/shop-app.json"), "utf8"));
const frag = JSON.parse(readFileSync(join(shared, "products/shop-app.json"), "utf8"));
expect("attributes: a write sends the attribute to its system of record and leaves it out of the record's own file", shopWrite.ok && frag.description === "Changed once, in one place" && !("description" in own) && shopWrite.result.attributes?.[0]?.written === "shared://products/shop-app.json", JSON.stringify(shopWrite));
expect("attributes: the attribute write is logged by address and attribute", entries(tandem).some((x) => x.entity === "shared://products/shop-app.json#description"));
const after = await call({ venture: "tandem", route: "purpose/product/shop-app", action: "read" });
expect("attributes: the next read shows the one value", after.result?.description === "Changed once, in one place");
const badAttr = await call({ venture: "tandem", route: "purpose/product/shop-app", action: "write", input: { id: "shop-app" }, actor: "person" });
expect("attributes: a record that fails its schema writes nothing anywhere", !badAttr.ok && JSON.parse(readFileSync(join(shared, "products/shop-app.json"), "utf8")).description === "Changed once, in one place");
write(tandem, { "knowledge/sources.json": JSON.stringify({ ...byAttr, sources: [{ ...map.sources[0], writes: "none" }] }, null, 2) + "\n" });
const roAttr = await call({ venture: "tandem", route: "purpose/product/shop-app", action: "write", input: after.result, actor: "person" });
expect("attributes: a write whose attribute is mastered in a read-only source is refused before anything lands", !roAttr.ok && /read-only/.test(roAttr.error));
write(tandem, { "knowledge/sources.json": JSON.stringify(map, null, 2) + "\n" });

finish();
