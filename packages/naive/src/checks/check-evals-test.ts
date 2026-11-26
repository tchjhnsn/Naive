// Breaks check-evals on copies (EE-198). A held-out id copied into an exemplar fails.
// A missing canary fails. A Dogfood path in derived_from fails. A label an agent set fails.
// The repository passes, and a label a person set passes.
//
//   node packages/naive/src/checks/check-evals-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-evals.ts");
const FILES = [
  "packages/naive/evals/discovery-subscription.json",
  "packages/naive/exemplars/synthetic/discovery-subscription/exemplar.json",
  "packages/naive/founder-templates/discovery/cross-industry/subscription/template.json",
];

let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`);
  if (!ok) failed++;
};
const tmp = mkdtempSync(join(tmpdir(), "check-evals-"));
const run = (root: string) => {
  const r = spawnSync(process.execPath, [CHECK, root], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
};

function copy(): string {
  const root = join(tmp, `c-${failed}-${Math.random().toString(16).slice(2)}`);
  for (const rel of FILES) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    cpSync(join(repo, rel), join(root, rel));
  }
  return root;
}

function edit(root: string, rel: string, change: (_value: Record<string, unknown>) => void): void {
  const file = join(root, rel);
  const value = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  change(value);
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

const clean = run(repo);
t("the repository passes", clean.status === 0, clean);

{
  const root = copy();
  const evalFile = JSON.parse(readFileSync(join(root, FILES[0]), "utf8")) as { items: { id: string; split: string }[] };
  const id = evalFile.items.find((item) => item.split === "held-out")?.id ?? "";
  edit(root, FILES[1], (exemplar) => { exemplar.note = id; });
  const r = run(root);
  t("a held-out id in an exemplar file fails", r.status === 1 && r.out.includes(id) && r.out.includes("held-out-item"), r);
}

{
  const root = copy();
  edit(root, FILES[0], (file) => { delete file.canary; });
  const r = run(root);
  t("a missing canary fails", r.status === 1 && /canary is missing/.test(r.out), r);
}

{
  const root = copy();
  edit(root, FILES[1], (exemplar) => {
    const cites = exemplar.derived_from;
    if (Array.isArray(cites)) cites.push({ url: null, archive_of: null, logged_in: false, path: "dogfood/exemplars/gold/acme/problem.json" });
  });
  const r = run(root);
  t("a synthetic exemplar citing a Dogfood path fails", r.status === 1 && /private seed/.test(r.out) && /dogfood/.test(r.out), r);
}

{
  const root = copy();
  edit(root, FILES[0], (file) => {
    const items = file.items;
    if (!Array.isArray(items)) return;
    const held = items.find((item) => (item as { split?: string }).split === "held-out") as Record<string, unknown> | undefined;
    if (!held) return;
    held.label = "accept";
    held.labelled_by = { kind: "agent", id: "strategy-agent" };
  });
  const r = run(root);
  t("an agent-set label fails", r.status === 1 && /person-label/.test(r.out), r);
}

{
  const root = copy();
  edit(root, FILES[0], (file) => {
    const items = file.items;
    if (!Array.isArray(items)) return;
    const held = items.find((item) => (item as { split?: string }).split === "held-out") as Record<string, unknown> | undefined;
    if (!held) return;
    held.label = "accept";
    held.labelled_by = { kind: "person", id: "torian" };
  });
  const r = run(root);
  t("a label a person set passes", r.status === 0, r);
}

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `${failed} failed` : "eval checks: all pass");
process.exit(failed ? 1 : 0);
