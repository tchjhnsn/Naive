// Data packages and raw (EE-070). Builds a small venture in a temp folder. No network.

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../../../..", import.meta.url).pathname;
const check = join(root, "packages/naive/src/checks/check-data-packages.mjs");
let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const venture = () => {
  const d = mkdtempSync(join(tmpdir(), "data-"));
  mkdirSync(join(d, "customers"), { recursive: true });
  writeFileSync(join(d, "venture.json"), JSON.stringify({ id: "kept" }));
  return d;
};
const run = (d) => spawnSync("node", [check, d], { encoding: "utf8" });

t("an empty data package passes", () => {
  const d = venture();
  mkdirSync(join(d, "customers/_streams/visits"), { recursive: true });
  writeFileSync(join(d, "customers/ada.json"), JSON.stringify({ id: "ada", name: "Ada" }));
  writeFileSync(join(d, "customers/_streams/visits/stream.json"), JSON.stringify({ id: "visits", sensitive: false }));
  const r = run(d);
  ok(r.status === 0, r.stderr);
});

t("a sensitive stream with an event file fails", () => {
  const d = venture();
  mkdirSync(join(d, "customers/_streams/visits"), { recursive: true });
  writeFileSync(join(d, "customers/_streams/visits/stream.json"), JSON.stringify({ id: "visits", sensitive: true }));
  writeFileSync(join(d, "customers/_streams/visits/events.jsonl"), "{}\n");
  const r = run(d);
  ok(r.status !== 0 && /sensitive stream/.test(r.stderr), r.stderr);
});

t("a sensitive stream versions only its summary", () => {
  const d = venture();
  mkdirSync(join(d, "customers/_streams/visits"), { recursive: true });
  writeFileSync(join(d, "customers/_streams/visits/stream.json"), JSON.stringify({ id: "visits", sensitive: true }));
  writeFileSync(join(d, "customers/_streams/visits/summary.md"), "Ada visited twice.\n");
  const r = run(d);
  ok(r.status === 0, r.stderr);
});

t("original.* under raw stays out of git", () => {
  const d = venture();
  mkdirSync(join(d, "raw/sources/blog"), { recursive: true });
  writeFileSync(join(d, "raw/sources/blog/source.json"), JSON.stringify({ id: "blog", origin: "founder-supplied" }));
  writeFileSync(join(d, "raw/sources/blog/text.md"), "The post.\n");
  writeFileSync(join(d, "raw/sources/blog/original.pdf"), "bytes");
  const r = run(d);
  ok(r.status !== 0 && /original\./.test(r.stderr), r.stderr);
});

t("an idea map cites the raw ids the venture has", () => {
  const d = venture();
  mkdirSync(join(d, "raw/dump"), { recursive: true });
  writeFileSync(join(d, "raw/dump/capture.md"), "words\n");
  mkdirSync(join(d, "ideas"), { recursive: true });
  writeFileSync(join(d, "ideas/map.mdx"), `<Idea id="i-01">\nwords\n</Idea>\n`);
  const bad = run(d);
  ok(bad.status !== 0 && /cites no raw id/.test(bad.stderr), bad.stderr);
  writeFileSync(join(d, "ideas/map.mdx"), `<Idea id="i-01" raw="capture">\nwords\n</Idea>\n`);
  const good = run(d);
  ok(good.status === 0, good.stderr);
});

if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log("all data package tests pass");
