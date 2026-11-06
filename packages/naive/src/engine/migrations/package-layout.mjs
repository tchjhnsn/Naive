// Migration package-layout (framework 0.2.0, EE-070): moves a venture from the layer layout onto
// the package folder layout, like a Next.js codemod. Files move with git mv when git tracks them and
// with a plain rename otherwise. A file with no clear new home is archived under _private/ and
// escalated for a person, never guessed. Old routes keep resolving through packages/naive/src/router/route-aliases.json.
//
// Every change goes through ctx (packages/naive/src/engine/upgrades.mjs), so a dry run (--check) reports the same moves
// without touching anything, and the upgrader records each one in provenance.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../../core/venture-paths.mjs";
import { layoutOf } from "../../core/venture-paths.mjs";

export const id = "package-layout";
export const describe = "Moves records from the layer folders (purpose/, pillars/, products/, knowledge/) into package folders (foundation/, validation/, product/, marketing/, people/, decisions/)";

export function apply(dir, ctx) {
  // A venture in the structured layout (EE-086) is already past this layout: nothing to move.
  if (layoutOf(dir) !== "flat") return;
  const load = (p) => JSON.parse(readFileSync(p, "utf8"));
  // A decision file infers its target from the folder it sits in. Stamp that path before the file
  // moves, so the decision still points at the same record.
  const stampDecisions = (folder) => {
    const d = ventureFile(dir, folder);
    if (!existsSync(d)) return;
    for (const f of readdirSync(d).filter((x) => x.endsWith(".decision.json"))) {
      const rec = load(join(d, f));
      if (rec.decides?.path) continue;
      const at = folder.split("/").slice(0, -1).join("/");
      const base = f.split(".")[0];
      rec.decides = { ...(rec.decides ?? {}), path: at ? `${at}/${base}.json` : `${base}.json` };
      ctx.write(`${folder}/${f}`, JSON.stringify(rec, null, 2) + "\n", { note: "stamped the record it decides before the move (EE-070)", log: false });
    }
  };

  const pairs = [
    ["purpose/validation/problem.json", "foundation/problem.json"],
    ["purpose/icp.json", "foundation/icp.json"],
    ["purpose/alignment.json", "foundation/alignment.json"],
    ["purpose/telos.draft.md", "foundation/telos.draft.md"],
    ["purpose/validation/solution.json", "validation/solution.json"],
    ["purpose/validation/go-to-market.json", "validation/go-to-market.json"],
    ["operations/team-plan.json", "people/team-plan.json"],
    ["pillars/brand.md", "marketing/brand.md"],
    // A venture made since init writes a root AGENTS.md keeps it; the old README becomes the knowledge layout.
    ["knowledge/README.md", existsSync(join(dir, "AGENTS.md")) ? "knowledge/AGENTS.md" : "AGENTS.md"],
    ["purpose/anatomy.answers.reasoned.json", "product/anatomy.answers.reasoned.json"],
    ["purpose/anatomy.matrix.md", "product/anatomy.matrix.md"],
  ];
  for (const [a, b] of pairs) ctx.mv(a, b);

  const list = (rel, ext) => existsSync(ventureFile(dir, rel)) ? readdirSync(ventureFile(dir, rel)).filter((f) => f.endsWith(ext)) : [];
  for (const f of list("products", ".json")) ctx.mv(`products/${f}`, `product/${f}`);
  for (const f of list("purpose/anatomy", ".json")) ctx.mv(`purpose/anatomy/${f}`, `product/anatomy/${f}`);

  for (const folder of ["purpose/decisions", "purpose/anatomy/decisions", "operations/decisions"]) {
    stampDecisions(folder);
    for (const f of list(folder, ".decision.json")) ctx.mv(`${folder}/${f}`, `decisions/${f}`);
  }

  for (const f of ["product.md", "business.md"]) {
    if (existsSync(join(ventureFile(dir, "pillars"), f))) {
      ctx.mv(`pillars/${f}`, `_private/pillars/${f}`);
      ctx.escalate(`${f.replace(".md", "")} pillar: the brief names a home only for brand (marketing/). Archived at _private/pillars/${f} rather than guessed.`);
    }
  }
  for (const f of list("purpose/research", "")) {
    ctx.mv(`purpose/research/${f}`, `_private/research/${f}`);
    ctx.escalate(`purpose/research/${f}: no package home in the route table. Archived at _private/research/${f}.`);
  }

  for (const gone of ["purpose", "pillars", "knowledge", "products"]) ctx.removeEmpty(gone);

  const policy = "governance/publication-policy.json";
  if (existsSync(ventureFile(dir, policy))) {
    const text = readFileSync(ventureFile(dir, policy), "utf8");
    if (text.includes("pillars/brand.md")) ctx.write(policy, text.replaceAll("pillars/brand.md", "marketing/brand.md"), { note: "the brand pillar moved to marketing/brand.md (EE-070)" });
  }

  for (const sub of ["raw/dump", "raw/sources", "ideas", "finance", "customers", "investors", "money", "public"]) ctx.keep(sub);

  // The layout release, as before: the moves this migration made and what it escalated.
  if (ctx.moved.length || ctx.escalated.length) ctx.write(".release/layout.json", JSON.stringify({
    version: 1,
    at: ctx.at,
    note: "Moved onto the package folder layout (EE-070). Old routes stay as aliases for one release.",
    moves: ctx.moved.map(([from, to]) => ({ from, to })),
    escalated: ctx.escalated,
  }, null, 2) + "\n", { activity: "release", note: "package folder layout", derived_from: ctx.moved.map(([, to]) => to) });
}
