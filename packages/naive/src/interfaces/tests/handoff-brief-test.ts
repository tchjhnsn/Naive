// Tests writing a handoff's brief through the router (handoff contract v2, packages/naive/src/functions/capabilities/handoff-v2.md):
// a write of operations/handoff/<id> may carry the Markdown brief as brief_text beside the record's fields. The router
// writes the record, then the brief to the file the record's brief names, each with a provenance line, so a lead makes
// a handoff ready (check-ready.ts) without editing files. brief_text is never stored in the record; a brief outside the
// handoff's folder, an empty one, one sent after a claim, and one whose handoff the gate would hold are refused with
// nothing written. The venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/handoff-brief-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.ts";
import { entries } from "../../core/provenance.ts";
import { ventureFile } from "../../core/venture-paths.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const show = (r: unknown): string => String(JSON.stringify(r)).slice(0, 400);
const ws = mkdtempSync(join(tmpdir(), "handoff-brief-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_SESSION", "MENTURA_MODEL", "MENTURA_PERSON"]) { delete env[k]; delete process.env[k]; }
const node = (...a: string[]) => spawnSync(process.execPath, a.map((x, i) => i === 0 ? join(repo, x) : x), { encoding: "utf8", env });

interface Reply { ok: boolean, error?: string, result?: { written?: string, draft?: boolean, provenance?: string, brief?: { written?: string, provenance?: string } } }

const V = "briefs";
const made = node("packages/naive/src/interfaces/cli/mentura.ts", "init", join(ws, `ventures/${V}`), "--id", V, "--layers", "purpose");
if (made.status !== 0) throw new Error(made.stderr);
const dir = join(ws, `ventures/${V}`);

const LEAD = "architect", HOLDER = "builder";
const handoff = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  id, title: `Handoff ${id}`, venture: V, role: HOLDER, brief: `${id}.md`, decision_classes: ["implementation-detail"],
  done_criteria: [
    { id: "holds", kind: "conformance", check: "node packages/naive/src/checks/check-execution.ts ." },
    { id: "proof", kind: "self-proof", check: "node packages/naive/src/checks/check-ready.ts ." },
    { id: "fit", kind: "review", reviewer: LEAD, check: "Does it answer the question the lead asked?" },
  ],
  status: "draft", attempts: 0, max_attempts: 3, run_cap: "2h", requested_by: LEAD, ...extra,
});
const BRIEF = "# Spend review\n\n## Outcome\n\nEvery tool the venture pays for has a spend record.\n\n## Work\n\nList the connections, then write one spend record per paid tool.\n";
const write = async (id: string, input: Record<string, unknown>, actor_id = LEAD): Promise<Reply> =>
  await call({ venture: V, workspace: ws, route: `operations/handoff/${id}`, action: "write", input, actor: "agent", actor_id }) as Reply;
const ready = (id: string) => node("packages/naive/src/checks/check-ready.ts", dir, id);
const briefOnDisk = (id: string) => ventureFile(dir, `operations/handoffs/${id}.md`);

try {
  // Without a brief the handoff cannot be made ready: check-ready.ts finds none.
  const bare = await write("spend", handoff("spend"));
  expect("a lead writes a draft handoff through the router", bare.ok && !bare.result?.brief, show(bare));
  const before = ready("spend");
  expect("without its brief, check-ready.ts says the handoff is not ready", before.status === 1 && /FAIL\s+brief exists/.test(before.stdout), before.stdout);

  // With brief_text the brief is written beside the record, with its own provenance line.
  const w = await write("spend", { ...handoff("spend"), brief_text: BRIEF });
  expect("the write with brief_text lands the record and the brief", w.ok && w.result?.written === "operations/handoffs/spend.json" && w.result?.brief?.written === "operations/handoffs/spend.md", show(w));
  expect("the brief holds the text given", existsSync(briefOnDisk("spend")) && readFileSync(briefOnDisk("spend"), "utf8") === BRIEF);
  const stored = JSON.parse(readFileSync(ventureFile(dir, "operations/handoffs/spend.json"), "utf8")) as Record<string, unknown>;
  expect("brief_text is not stored in the record", !("brief_text" in stored) && stored.brief === "spend.md", show(stored));
  const line = entries(dir).find((e) => e.hash === w.result?.brief?.provenance);
  expect("the brief's provenance line names the brief, the route, the requester and the record it belongs to", line?.entity === "operations/handoffs/spend.md" && line.route === "operations/handoff/spend" && line.agent?.id === LEAD && (line.derived_from ?? []).includes("operations/handoffs/spend.json"), show(line));
  const after = ready("spend");
  expect("check-ready.ts now finds the brief and says the handoff is ready", after.status === 0 && /pass\s+brief exists/.test(after.stdout) && /pass\s+brief has its Outcome section/.test(after.stdout), after.stdout);
  const made2 = await write("spend", { ...handoff("spend"), status: "ready" });
  expect("the lead then makes it ready through the router", made2.ok, show(made2));

  // Refusals write nothing.
  const outside = await write("escape", { ...handoff("escape", { brief: "../../foundation/problem.md" }), brief_text: BRIEF });
  expect("a brief outside the handoff's folder is refused", !outside.ok && /beside the handoff/.test(String(outside.error)) && !existsSync(ventureFile(dir, "operations/handoffs/escape.json")), show(outside));
  const notMd = await write("plain", { ...handoff("plain", { brief: "plain.txt" }), brief_text: BRIEF });
  expect("a brief that is not Markdown is refused", !notMd.ok, show(notMd));
  const empty = await write("empty", { ...handoff("empty"), brief_text: "  " });
  expect("an empty brief_text is refused", !empty.ok && !existsSync(ventureFile(dir, "operations/handoffs/empty.json")), show(empty));

  const claimed = await call({ venture: V, workspace: ws, route: "operations/handoff/spend", action: "claim", actor: "agent", actor_id: HOLDER }) as Reply;
  expect("the holder claims the ready handoff", claimed.ok, show(claimed));
  const late = await write("spend", { ...JSON.parse(readFileSync(ventureFile(dir, "operations/handoffs/spend.json"), "utf8")), brief_text: "# Changed\n\n## Outcome\n\nSomething else.\n\n## Work\n\nOther work.\n" }, LEAD);
  expect("after a claim the brief stays as it was claimed", !late.ok && /claimed/.test(String(late.error)) && readFileSync(briefOnDisk("spend"), "utf8") === BRIEF, show(late));

  // The gate holds the handoff: the brief cannot wait with it, so nothing is written.
  writeFileSync(ventureFile(dir, "naive.config.json"), JSON.stringify({ gate: { rules: [{ id: "hold-handoffs", routes: ["operations/handoff/[id]"], then: "draft" }] } }, null, 2));
  const held = await write("held", { ...handoff("held"), brief_text: BRIEF });
  expect("a handoff the gate holds refuses its brief, and nothing is written", !held.ok && /draft/.test(String(held.error)) && !existsSync(briefOnDisk("held")) && !existsSync(ventureFile(dir, "operations/handoffs/held.json")), show(held));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
