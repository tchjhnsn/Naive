// Tests scripts/reference-methods.ts (EE-233): a reference with no method gets the one its id or kind gives, written
// after kind; a method already named is kept; a rerun writes nothing; a kind that gives no method fails and leaves its
// file as it was; and every committed reference already names a method.
//
//   node scripts/reference-methods-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { referenceFiles } from "./reference-methods.ts";

const repo = new URL("..", import.meta.url).pathname;
const SCRIPT = join(repo, "scripts/reference-methods.ts");
const MODEL = "packages/naive/src/records/data-model.json";
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "reference-methods-test-"));

const ref = (id: string, kind: string, extra: object = {}) => ({ id, title: id, authors: ["A"], year: 2020, kind, ...extra, summary: "s", informs: [], stance: { is: "adopted", why: "w" } });
const LAYER = "packages/naive/src/records/layers/purpose/references/references.json";
const KIT = "packages/naive/src/functions/strategy/kits/validation/references/references.json";

/** A copy of the repository holding only the data model and the given reference files. */
const rootWith = (name: string, files: Record<string, object>) => {
  const root = join(tmp, name);
  mkdirSync(dirname(join(root, MODEL)), { recursive: true });
  cpSync(join(repo, MODEL), join(root, MODEL));
  for (const [f, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), JSON.stringify(body, null, 2) + "\n");
  }
  return root;
};
const run = (root: string) => {
  const r = spawnSync(process.execPath, [SCRIPT, "--json", "--root", root], { encoding: "utf8" });
  return { status: r.status, out: JSON.parse(r.stdout || "{}") as { counts: Record<string, number>; written: string[]; errors: string[] } };
};
const read = (root: string, f: string) => JSON.parse(readFileSync(join(root, f), "utf8")) as { references: Record<string, unknown>[] };

const root = rootWith("fill", {
  [LAYER]: { layer: "purpose", references: [ref("a-book", "book"), ref("naics", "standard"), ref("onet-online", "dataset"), ref("kept", "book", { method: "stakeholder" })] },
  [KIT]: { layer: "purpose", references: [ref("a-paper", "paper")] },
});
t("finds the layer and kit files the data model names", referenceFiles(root).join() === [LAYER, KIT].join(), referenceFiles(root));
const first = run(root);
const layer = read(root, LAYER).references;
t("fills each missing method from the kind or the id", first.status === 0 && layer.map((r) => r.method).join() === "practitioner,standards,standards,stakeholder", layer);
t("writes method right after kind", Object.keys(layer[0]).indexOf("method") === Object.keys(layer[0]).indexOf("kind") + 1, Object.keys(layer[0]));
t("keeps a method already named", layer[3].method === "stakeholder");
t("counts references per method", first.out.counts.standards === 2 && first.out.counts.practitioner === 1 && first.out.counts.scientific === 1 && first.out.counts.stakeholder === 1 && first.out.counts.organizational === 0, first.out.counts);
const again = run(root);
t("a rerun writes nothing", again.status === 0 && again.out.written.length === 0, again.out);

const unknown = rootWith("unknown", { [LAYER]: { layer: "purpose", references: [ref("a-book", "book"), ref("some-data", "dataset")] } });
const before = readFileSync(join(unknown, LAYER), "utf8");
const refused = run(unknown);
t("a kind that gives no method fails and names the reference", refused.status === 1 && refused.out.errors.some((e) => e.includes("some-data")), refused.out);
t("a file with a reference it cannot place is left as it was", readFileSync(join(unknown, LAYER), "utf8") === before);

const committed = rootWith("committed", {});
for (const f of referenceFiles(repo)) { mkdirSync(dirname(join(committed, f)), { recursive: true }); cpSync(join(repo, f), join(committed, f)); }
const own = run(committed);
t("every committed reference names a method and is formatted as the script writes it", own.status === 0 && own.out.written.length === 0, own.out);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.log(`${failed} failed`); process.exit(1); }
