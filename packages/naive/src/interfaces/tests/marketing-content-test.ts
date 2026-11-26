// Tests writing marketing content through the router (EE-064): marketing/content/[id] takes one public variant, its id
// the path below marketing/content without .mdx (home/what), so the marketing agent writes the variants the site
// planner names. The text lands where the venture's layout keeps it, with provenance; an agent's variant that names who
// approved it is held as a draft for a person; another function's agent is refused; and the public gate checks what
// was written. The venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/marketing-content-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, routes } from "../../router/router.ts";
import { entries } from "../../core/provenance.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { check } from "../../engine/check-public.ts";
import { plan } from "../../functions/marketing-and-sales/marketing/site/plan.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "marketing-content-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL"]) { delete process.env[k]; delete env[k]; }

interface Reply { ok: boolean, error?: string, gate_rule?: string, result?: unknown }
const ask = async (a: { route: string, action?: string, input?: unknown, actor?: string, actor_id?: string }): Promise<Reply> =>
  await call({ venture: "lab", workspace: ws, action: "read", ...a }) as Reply;
const result = (r: Reply) => (r.result ?? {}) as { written?: string, draft?: boolean, provenance?: string };
const variant = (extra = "") => `---\nvariant_of: venture.json\naudience: customers\npublish: false\n${extra}---\n<Hero>Lab, for people who test ideas before they build them.</Hero>\n`;
const agent = { actor: "agent", actor_id: "marketing-and-sales-agent" };

try {
  const made = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/init-venture.ts"), join(ws, "ventures/lab"), "lab", "--type", "side-project"], { encoding: "utf8", env });
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  const dir = join(ws, "ventures/lab");

  const item = (routes() as { route: string, actions: string[] }[]).find((r) => r.route === "marketing/content/[id]");
  expect("marketing/content/[id] is a route that writes", !!item?.actions.includes("write"), JSON.stringify(item));

  // The planner names the variant; the marketing agent writes it at that route.
  const hero = plan(dir).pages.find((p) => p.path === "/")?.sections.find((s) => s.item === "what");
  expect("the planner names the hero's variant at marketing/content/home/what.mdx", hero?.variant === "marketing/content/home/what.mdx", JSON.stringify(hero?.variant));
  const w = await ask({ route: "marketing/content/home/what", action: "write", input: { text: variant() }, ...agent });
  expect("the marketing agent's write lands live", w.ok && result(w).draft === false && result(w).written === "marketing/content/home/what.mdx", JSON.stringify(w));
  const onDisk = ventureFile(dir, "marketing/content/home/what.mdx");
  expect("the text sits where the venture's layout keeps marketing content", existsSync(onDisk) && readFileSync(onDisk, "utf8") === variant(), onDisk);
  const line = entries(dir).find((e) => e.hash === result(w).provenance);
  expect("its provenance line names the file, the route and the agent's role", line?.entity === "marketing/content/home/what.mdx" && line.route === "marketing/content/home/what" && line.agent?.id === "marketing-and-sales-agent", JSON.stringify(line));
  const back = await ask({ route: "marketing/content/home/what" });
  expect("a read of the item returns its text", back.ok && back.result === variant(), JSON.stringify(back));
  expect("the public gate checks what was written", check(dir).results.some((x) => x.file.endsWith("marketing/content/home/what.mdx") && !x.errors.length), JSON.stringify(check(dir).results));

  // Only a person approves: an agent's variant that names who approved it waits as a draft, and the live text stays.
  const approved = variant("approved_by: Sam\n").replace("publish: false", "publish: true");
  const held = await ask({ route: "marketing/content/home/what", action: "write", input: { text: approved }, ...agent });
  expect("an agent's variant naming approved_by is held as a draft", held.ok && result(held).draft === true && readFileSync(onDisk, "utf8") === variant(), JSON.stringify(held));
  const byPerson = await ask({ route: "marketing/content/home/what", action: "write", input: { text: approved }, actor: "person" });
  expect("a person's approved variant lands live", byPerson.ok && result(byPerson).draft === false && readFileSync(onDisk, "utf8") === approved, JSON.stringify(byPerson));

  // Reach and ids.
  const other = await ask({ route: "marketing/content/home/team", action: "write", input: { text: variant() }, actor: "agent", actor_id: "finance-agent" });
  expect("another function's agent is refused", !other.ok && other.gate_rule === "agent-reach" && !existsSync(ventureFile(dir, "marketing/content/home/team.mdx")), JSON.stringify(other));
  const bad = await ask({ route: "marketing/content/home/../secret", action: "write", input: { text: variant() }, ...agent });
  expect("an id that leaves the content folder is refused", !bad.ok && /not a valid id/.test(String(bad.error)), JSON.stringify(bad));
  const empty = await ask({ route: "marketing/content/home/empty", action: "write", input: { text: " " }, ...agent });
  expect("an empty text is refused", !empty.ok, JSON.stringify(empty));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
