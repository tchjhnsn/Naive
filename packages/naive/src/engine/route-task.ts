// The routing rule for a classified task (lead agents design, "Routing a task", rules 2 to 5; default 11 puts the code
// in Naive so every harness routes the same way). A model labels the task with the functions it touches, the telos
// measure it serves if it can and the decision classes it names (rule 1); this code picks the target. It is pure: no
// I/O and no model. The caller passes the venture's lead role templates (roles with a portfolio), its lead plans, its
// telos measures and its delegation lists.
//
//   rule 2  a one-way door or a never-redelegated class goes to a person; no agent takes it
//   rule 3  one function goes straight to that function's agent, <function>-agent (EE-123)
//   rule 4  several functions, all in one lead's portfolio, go to that lead
//   rule 5  functions across portfolios go to the lead accountable for the measure the task serves: the one lead
//           plan that binds it (default 1), else the one lead whose default measure kinds hold its kind. With no
//           measure, or no single accountable lead, a person decides (default 6)
//
// A task labelled with no function, or with one the venture does not know, fails rule 1 and goes to a person.

export type Task = { functions: readonly string[]; measure?: string | null; classes?: readonly string[] };
export type LeadTemplate = { id: string; portfolio: readonly string[]; default_measure_kinds?: readonly string[] };
export type LeadPlanBinding = { lead: string; measures: readonly string[] };
export type Measure = { id: string; kind: string; primary?: boolean };
export type Context = {
  leads: readonly LeadTemplate[];
  plans?: readonly LeadPlanBinding[];
  measures?: readonly Measure[];
  one_way_doors?: readonly string[];
  never_redelegated?: readonly string[];
  /** The known function ids (departments.json); left out, any id is taken as known. */
  functions?: readonly string[];
};
export type Target = "person" | "function-agent" | "lead";
export type Routed = { to: Target; role: string | null; rule: 1 | 2 | 3 | 4 | 5; why: string };

const person = (rule: Routed["rule"], why: string): Routed => ({ to: "person", role: null, rule, why });

/** The function agent's role for a function (EE-123). */
export const functionAgent = (fn: string): string => `${fn}-agent`;

/** The lead accountable for a measure: the one plan that binds it, else the one lead whose defaults hold its kind. */
export function accountableLead(measure: string, ctx: Context): { lead: string | null; why: string } {
  const bound = [...new Set((ctx.plans ?? []).filter((p) => p.measures.includes(measure)).map((p) => p.lead))];
  if (bound.length === 1) return { lead: bound[0], why: `the lead plan of ${bound[0]} binds measure ${measure}` };
  if (bound.length > 1) return { lead: null, why: `measure ${measure} is bound by more than one lead plan (${bound.join(", ")}); one lead is accountable for a measure` };
  const m = (ctx.measures ?? []).find((x) => x.id === measure);
  if (!m) return { lead: null, why: `measure ${measure} is not a telos measure and no lead plan binds it` };
  const byKind = ctx.leads.filter((l) => (l.default_measure_kinds ?? []).some((k) => k === m.kind || (k === "primary" && m.primary === true))).map((l) => l.id);
  if (byKind.length === 1) return { lead: byKind[0], why: `no lead plan binds measure ${measure}, and only ${byKind[0]}'s default measure kinds hold ${m.primary ? `the primary measure or ${m.kind}` : m.kind}` };
  return { lead: null, why: `no lead plan binds measure ${measure}, and ${byKind.length ? `several leads' defaults hold its kind (${byKind.join(", ")})` : "no lead's defaults hold its kind"}` };
}

export function routeTask(task: Task, ctx: Context): Routed {
  const fns = [...new Set(task.functions)];
  if (fns.length === 0) return person(1, "the task is labelled with no function");
  const known = ctx.functions ? new Set(ctx.functions) : null;
  const unknown = known ? fns.filter((f) => !known.has(f)) : [];
  if (unknown.length) return person(1, `the task names ${unknown.join(", ")}, which is not a function`);

  const held = new Set([...(ctx.one_way_doors ?? []), ...(ctx.never_redelegated ?? [])]);
  const reserved = (task.classes ?? []).filter((c) => held.has(c));
  if (reserved.length) return person(2, `the task names ${reserved.join(", ")}, a one-way door or a never-redelegated class`);

  if (fns.length === 1) return { to: "function-agent", role: functionAgent(fns[0]), rule: 3, why: `the task touches one function, ${fns[0]}` };

  const owners = new Set(fns.map((f) => ctx.leads.find((l) => l.portfolio.includes(f))?.id ?? null));
  if (owners.size === 1 && !owners.has(null)) {
    const lead = [...owners][0] as string;
    return { to: "lead", role: lead, rule: 4, why: `${fns.join(", ")} are all in ${lead}'s portfolio` };
  }
  if (!task.measure) return person(5, `${fns.join(", ")} cross portfolios and the task names no measure, so a person decides who leads it`);
  const a = accountableLead(task.measure, ctx);
  return a.lead ? { to: "lead", role: a.lead, rule: 5, why: `${fns.join(", ")} cross portfolios; ${a.why}` } : person(5, `${fns.join(", ")} cross portfolios; ${a.why}`);
}
