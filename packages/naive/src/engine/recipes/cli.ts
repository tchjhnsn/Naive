// naive recipes plan and check (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The eval
// plan", build plan item 5).
//
//   node packages/naive/src/engine/recipes/cli.ts <venture dir> plan <pattern> --by <person> [--weights uniform|cited] [--gap <duration>] [--min-gain <n>] [--json]
//   node packages/naive/src/engine/recipes/cli.ts <venture dir> check <pattern> [--json]
//
// plan is a person's: it refuses when an agent is acting (MENTURA_ACTOR, MENTURA_MODEL or a MENTURA_ACTOR_ID other
// than --by). It writes <pattern>.plan.json and freezes the eval set at <venture>/_eval/<sha>/. check runs the
// recipe on the plan's training rows and prints each row's loss and field losses, the settled loss beside the plain
// fold's, and every noise disagreement. Exit codes: 0 done, 1 refused or failed, 2 usage.
import { checkRecipe, planRecipe } from "./eval-set.ts";

const [dir, cmd, pattern, ...rest] = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const json = rest.includes("--json");
const round = (x: number) => Math.round(x * 1e4) / 1e4;

if (!dir || !pattern || (cmd !== "plan" && cmd !== "check")) {
  console.error("usage: naive recipes plan <pattern> --by <person> [--weights uniform|cited] [--gap <duration>] [--min-gain <n>] | naive recipes check <pattern> [--json]");
  process.exit(2);
}

if (cmd === "plan") {
  const weights = opt("weights");
  if (weights !== undefined && weights !== "uniform" && weights !== "cited") { console.error("--weights is uniform or cited"); process.exit(2); }
  const gain = opt("min-gain");
  const r = await planRecipe(dir, pattern, { by: opt("by"), weights: weights as "uniform" | "cited" | undefined, gap: opt("gap"), min_gain: gain === undefined ? undefined : Number(gain) });
  if (json) console.log(JSON.stringify(r, null, 2));
  else if (r.ok) console.log(`wrote ${r.file} (plan ${r.plan.sha}) and froze ${r.eval_set}: ${r.rows.training} training, ${r.rows.dev} dev and ${r.rows.holdout} holdout rows; read_cut ${r.plan.read_cut}`);
  else for (const e of r.errors) console.error(`refused: ${e}`);
  if (!json && r.ok) for (const p of r.problems) console.error(`left out: ${p}`);
  process.exit(r.ok ? 0 : 1);
}

const c = await checkRecipe(dir, pattern);
if (json) console.log(JSON.stringify(c, null, 2));
else if (c.ok) {
  console.log(`plan ${c.plan}: training loss ${round(c.score)} (plain fold ${round(c.baseline_score)}) over ${c.rows.length} rows`);
  for (const r of c.rows) console.log(`  ${r.key}  ${round(r.loss)}  ${Object.entries(r.fields).map(([f, l]) => `${f} ${round(l)}`).join(", ")}`);
  for (const d of c.disagreements) console.log(`  noise that is not: ${d.row} ${d.signal} (the record changes without it)`);
} else console.error(`check failed: ${c.reason}`);
process.exit(c.ok && c.disagreements.length === 0 ? 0 : 1);
