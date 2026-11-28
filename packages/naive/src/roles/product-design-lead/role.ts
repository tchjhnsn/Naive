// The product and design lead's program (EE-237): each product capability says which goals it serves (EE-228), so a
// feature report can tie the work to an outcome. A capability that is not retired and names no goal is a design
// finding (a warning); a goal it names that the venture does not hold is a protocol finding (an error). A category
// groups capabilities and is not asked for goals.

import { Effect } from "effect";
import { recordsOf, type RoleFinding, type RoleProgram } from "../../checks/role-program.ts";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const program: RoleProgram = {
  id: "product-design-lead",
  checks: [{
    id: "capability-goals",
    description: "Every live or building product capability names a goal, and every goal it names exists",
    run: (ctx) => Effect.gen(function* () {
      const out: RoleFinding[] = [];
      if (!ctx.venture) return out;
      const goals = new Set((yield* recordsOf(ctx.venture, "goal")).flatMap((g) => (isObject(g.body) && typeof g.body.id === "string" ? [g.body.id] : [])));
      for (const { path, body } of yield* recordsOf(ctx.venture, "product-capability")) {
        if (!isObject(body) || body.kind !== "capability" || body.status === "retired") continue;
        const named = Array.isArray(body.goals) ? body.goals.filter((g): g is string => typeof g === "string") : [];
        const at = { artifact: path, kind: "product-capability" };
        if (!named.length) out.push({ ...at, rule: "capability-names-goal", family: "design", severity: "warn", message: `${path} names no goal it serves (goals)` });
        for (const g of named) if (!goals.has(g.split("/")[0])) out.push({ ...at, rule: "capability-goal-exists", family: "protocol", severity: "error", message: `${path} serves the goal ${g}, which is not in foundation/goals` });
      }
      return out;
    }),
  }],
};

export default program;
