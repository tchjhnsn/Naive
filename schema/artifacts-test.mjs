// Artifacts (schema/check-artifacts.mjs): a view names the records it was built from; it is stale once
// one of them changes, and broken when one is gone.

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artifacts } from "./check-artifacts.mjs";

const dir = mkdtempSync(join(tmpdir(), "artifacts-"));
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "t", parent: null, phase: "discovery", owner: "self", status: "active", layers: {} }));
mkdirSync(join(dir, "foundation"), { recursive: true });
mkdirSync(join(dir, "artifacts"), { recursive: true });
writeFileSync(join(dir, "foundation/problem.json"), '{"statement":"a"}\n');
const sha = createHash("sha256").update(readFileSync(join(dir, "foundation/problem.json"))).digest("hex");
writeFileSync(join(dir, "artifacts/brief.json"), JSON.stringify({ id: "brief", kind: "document", title: "Brief", built_at: "2026-10-30T00:00:00Z", published: true, built_from: [{ record: "foundation/problem.json", sha256: sha }] }));
expect("an artifact built from the current record is fresh", artifacts(dir)[0].state === "fresh");
writeFileSync(join(dir, "foundation/problem.json"), '{"statement":"b"}\n');
expect("once the record changes the artifact is stale, and says which record", artifacts(dir)[0].state === "stale" && artifacts(dir)[0].changed[0] === "foundation/problem.json");
rmSync(join(dir, "foundation/problem.json"));
expect("a record that is gone breaks the artifact", artifacts(dir)[0].state === "broken");
rmSync(dir, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
