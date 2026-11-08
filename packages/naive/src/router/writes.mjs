// What a write answers, what a layout offers, and the wrapper the router puts around every call
// (Next.js translation M-3, M-9, M-17; it also wires in packages/naive/src/router/reads.mjs, packages/naive/src/router/boundaries.mjs
// and packages/naive/src/router/package-routes.mjs).
//
//   changed   M-3   one round trip: a write answers with the new state and what it changed: the
//                   record's state before and after, each package whose progress or state moved,
//                   the records that move now because of it, what it unlocked (a package that
//                   completed and what that opens, a decision that no longer waits) and the
//                   need-now rows it settled
//   next      M-17  a write answers with the next route to act on: accept the draft it made, else
//                   the next record in the same package that moves now, else what it unlocked,
//                   else what need-now suggests, else the decision that matters most
//   actions   M-9   a layout lists the actions available in its folder to the actor asking: each
//                   route's actions, which of them this actor may take now, and whether a write
//                   lands as the record, as a draft, or is locked or refused, with why
//
// around() runs before and after the router's own call: the framework and venture global errors
// first (E-8), then package, group and venture routes (L-6, P-36, P-3), then the call, then what
// reads and layouts add (L-9, L-10, O-1 to O-3, P-28) and what writes answer (M-3, M-17). It never
// calls a model.

import { allowed, draftOf, gateOf, resolve, routes, ventureDir } from "./router.mjs";
import { frameworkHealth, globalError, ventureHealth } from "./boundaries.mjs";
import { groupLayout, packageOfRecord, routeOfType, specialCall } from "./package-routes.mjs";
import { filterRead, hierarchy, metadataFor, resolvedBy, withParams } from "./reads.mjs";

/** The state a write can change, taken before and after it. */
export async function snapshot(dir) {
  const safe = async (f) => { try { return await f(); } catch { return null; } };
  const { venturePackage } = await import("./orchestration/venture-package.mjs");
  const { needNow } = await import("../engine/need-now.mjs");
  const { decisions } = await import("../engine/decisions.mjs");
  return { packages: await safe(() => venturePackage(dir)), need: await safe(() => needNow(dir)), decisions: await safe(() => decisions(dir)) };
}

const pkgMap = (s) => new Map([...(s?.packages?.core ?? []), ...(s?.packages?.handoff ?? [])].map((p) => [p.id, p]));
const rowOf = (s, type) => (s?.packages?.core ?? []).flatMap((p) => p.records).find((x) => x.record === type && x.role !== "reads") ?? null;

/** What a write changed (M-3), from the state before and after it. */
export async function changed(before, after, { record }) {
  const b = pkgMap(before), a = pkgMap(after);
  const packages = [...a.values()].filter((p) => { const o = b.get(p.id); return !o || o.progress !== p.progress || o.state !== p.state; })
    .map((p) => ({ package: p.id, title: p.title, progress: { from: b.get(p.id)?.progress ?? null, to: p.progress }, state: { from: b.get(p.id)?.state ?? null, to: p.state } }));
  const was = new Map((before?.packages?.core ?? []).flatMap((p) => p.records.map((x) => [`${p.id}:${x.record}`, x])));
  const moves = [];
  for (const p of after?.packages?.core ?? []) for (const x of p.records) {
    const o = was.get(`${p.id}:${x.record}`);
    if (x.role !== "reads" && x.moves === "now" && o?.moves === "waits" && !moves.some((m) => m.record === x.record)) moves.push({ record: x.record, package: p.id, route: await routeOfType(x.record) });
  }
  const unlocked = [...a.values()].filter((p) => p.state === "complete" && b.get(p.id)?.state !== "complete").map((p) => ({ package: p.id, unlocks: p.unlocks ?? [] }));
  const dBefore = new Map((before?.decisions?.decisions ?? []).map((d) => [d.id, d.render]));
  const freed = (after?.decisions?.decisions ?? []).filter((d) => ["waiting", "later"].includes(dBefore.get(d.id)) && ["now", "overdue"].includes(d.render)).map((d) => ({ decision: d.id, question: d.question ?? null }));
  const nBefore = new Map((before?.need?.rows ?? []).map((x) => [x.type, x.status]));
  const need = (after?.need?.rows ?? []).filter((x) => nBefore.has(x.type) && nBefore.get(x.type) !== x.status).map((x) => ({ record: x.type, from: nBefore.get(x.type), to: x.status }));
  return {
    record: { type: record, from: rowOf(before, record)?.status ?? null, to: rowOf(after, record)?.status ?? null, package: packageOfRecord(record) },
    packages, moves_now: moves, unlocked: [...unlocked, ...freed], need_now: need,
  };
}

const commandFor = (route, venture) => route?.endsWith("[id]") ? `mentura ${route.replace("[id]", "<id>")} write --venture ${venture} --input <file>` : `mentura ${route} write --venture ${venture} --input <file>`;

/** The next route to act on after a write (M-17). */
export async function next(after, { record, route, draft, venture, change }) {
  if (draft) return { route, action: "accept", who: "a person", command: `mentura accept ${route} --venture ${venture}`, why: "the write is held as a draft until a person accepts it" };
  const home = packageOfRecord(record);
  const p = (after?.packages?.core ?? []).find((x) => x.id === home);
  const missing = (p?.records ?? []).filter((x) => x.role !== "reads" && x.record !== record && x.moves === "now" && x.status === "missing");
  const required = missing.find((x) => x.role === "required");
  if (required) { const rt = await routeOfType(required.record); return { route: rt, action: "write", command: commandFor(rt, venture), why: `the next required record in ${p.title} that moves now` }; }
  // An agent's write waits for a person before what reads it can move.
  const review = (p?.records ?? []).filter((x) => x.role !== "reads" && x.status === "agent");
  if (review.length) { const rt = await routeOfType(review[0].record); return { route: rt, action: "review", who: "a person", command: `mentura ${rt} read --venture ${venture}`, why: `${review[0].title} was written by an agent: a person confirms it by writing it with --as person, and what reads it moves then` }; }
  const freed = change?.moves_now?.[0];
  if (freed) return { route: freed.route, action: "write", command: commandFor(freed.route, venture), why: `this write let ${freed.record} move` };
  if (missing.length) { const rt = await routeOfType(missing[0].record); return { route: rt, action: "write", command: commandFor(rt, venture), why: `the next ${missing[0].role} record in ${p.title} that moves now` }; }
  const suggest = (after?.need?.rows ?? []).filter((x) => x.status === "suggest now" && x.type !== record).sort((a, b) => b.now - a.now)[0];
  if (suggest) { const rt = await routeOfType(suggest.type); if (rt) return { route: rt, action: "write", command: commandFor(rt, venture), why: `need-now suggests it now: ${suggest.why}` }; }
  const { rank } = await import("../engine/decisions.mjs");
  const ds = after?.decisions ? rank(after.decisions.decisions, after.decisions.phase).filter((d) => d.rank != null && d.source === "file") : [];
  if (ds.length) return { route: "governance/decisions", action: "decide", who: "a person", command: `mentura decide ${ds[0].id} --venture ${venture} --by <your name>`, why: ds[0].question };
  return { route: null, action: null, why: "nothing waits on this write" };
}

/** The actions available in a route's folder to one actor (M-9). */
export async function actionsIn({ dir, r, route, actor = "agent", actor_id, venture }) {
  const { holding, locked } = await import("../engine/decisions.mjs");
  const { configOf, hold } = await import("../engine/gate.mjs");
  const folder = r.collection === "item" ? r.route.slice(0, -"/[id]".length) : route.includes("/") ? route.slice(0, route.lastIndexOf("/")) : route;
  const rs = routes().filter((x) => x.route === folder || x.route.startsWith(`${folder}/`));
  const list = [];
  for (const x of rs) {
    const concrete = x.route === r.route ? route : x.route;
    const entry = { route: concrete, kind: x.kind, actions: x.actions };
    if (!dir) { list.push(entry); continue; }
    const reads = allowed(dir, actor_id, "read", concrete);
    const avail = x.actions.filter((a) => !["write", "run"].includes(a) && (reads || a === "template" || a === "layout"));
    if (x.actions.includes("run")) {
      const lock = actor !== "person" ? locked(dir, concrete, actor_id) : null;
      if (reads && !lock) avail.push("run");
      entry.run = lock ? { runs: false, why: `locked until decision ${lock.id} is made` } : reads ? { runs: true } : { runs: false, why: "the team plan does not let this role reach it" };
    }
    if (x.actions.includes("write")) {
      let w;
      if (!allowed(dir, actor_id, "write", concrete)) w = { lands: null, why: `${actor_id} may not write it (team plan routes)` };
      else {
        const lock = actor !== "person" ? locked(dir, concrete, actor_id) : null;
        if (lock) w = { lands: null, why: `locked until decision ${lock.id} is made: ${lock.question}` };
        else if (actor === "person") w = { lands: "record", why: "a person's write goes straight to the record" };
        else {
          const gate = gateOf(x, dir);
          const d = !concrete.includes("[id]") ? draftOf(concrete, venture, undefined) : null;
          const held = d ? holding(dir, d.file) : null;
          const cfg = hold(configOf(dir), x.route, actor);
          w = gate?.drafts ? { lands: "draft", why: `${x.record} is a ${gate.class} decision (${gate.level})` } : held ? { lands: "draft", why: `decision ${held.id} ${held.why}` } : cfg ? { lands: "draft", why: `${cfg.rule} fails closed in naive.config.json` } : { lands: "record", why: "no gate holds it" };
        }
      }
      if (w.lands) avail.push("write");
      entry.write = w;
    }
    entry.available = avail;
    list.push(entry);
  }
  return { folder, actor: { kind: actor, ...(actor_id ? { id: actor_id } : {}) }, routes: list };
}

// The venture-relative file behind a read's source address (venture://path), for local sources only.
const fileOfAddress = (a) => a?.startsWith("venture://") ? a.slice("venture://".length) : null;

/**
 * The wrapper around the router's call (see the top of this file). inner is the router's own call;
 * args are what call takes. Returns what call returns, with the additions above.
 */
export async function around(inner, args) {
  const { venture, route, action, input, actor = "agent", workspace } = args;
  const actor_id = args.actor_id ?? process.env.MENTURA_ACTOR_ID;
  // E-8: a broken framework file stops every route, with its recovery steps.
  const fw = frameworkHealth();
  if (fw) return globalError(fw);
  let res;
  try { res = resolve(route); } catch (e) { return globalError({ scope: "framework", file: "packages/naive/src/records/data-model.json", problem: `the route table cannot be built: ${String(e.message ?? e).split("\n")[0]}`, recovery: ["Check the data model and the manifests: node packages/naive/src/checks/check-data-model.mjs", "Restore the file it names from git"] }); }
  const dir = venture ? ventureDir(venture, workspace) : null;
  // E-8: a broken venture.json answers with recovery steps, before anything reads it.
  if (dir) { const h = ventureHealth(dir); if (h) return globalError(h, venture); }
  // L-6, P-36, P-3: package, group and venture routes are answered here, outside the route table.
  if (!res.r && actor === "public") return { ok: false, error: `the public reader reads only record routes; ${route} is a package, group or venture route` };
  if (!res.r) return (await specialCall(args)) ?? inner(args);
  const r = res.r, params = res.params;
  const concrete = r.recipe ? `recipes/${params.pattern}` : r.collection === "item" ? r.route.replace("[id]", params.id) : r.route;
  const before = action === "write" && dir && r.kind === "record" ? await snapshot(dir) : null;
  let out;
  try { out = await inner(args); }
  catch (e) {
    // E-6: a record that cannot be read is that record's error, not a crash.
    if (action !== "read") throw e;
    // The parser's message quotes the record's bytes, so a public reader gets none of it.
    const detail = actor === "public" ? "" : `: ${String(e.message ?? e).split("\n")[0]}`;
    return { ok: false, outcome: "error", error: `${concrete}: the record does not parse${detail}`, fix: { schema: r.schema ?? null, template: r.template ?? null }, resolved_by: "error" };
  }

  if (action === "read" && dir && r.kind === "record") {
    if (out.ok) {
      const items = r.collection === "list" ? Object.fromEntries(Object.entries(out.sources ?? {}).map(([id, s]) => [id, fileOfAddress(s.address)]).filter(([, f]) => f))
        : out.source && fileOfAddress(out.source.address) ? { [params.id ?? r.record]: fileOfAddress(out.source.address) } : {};
      // Metadata is built from the unprojected record, so a public reader gets none of it. It is computed from the live
      // provenance log, so an as-of read (packages/naive/src/router/reads-as-of.mjs) gets none of it either.
      out = { ...out, params, ...(actor === "public" || out.as_of ? {} : { metadata: await metadataFor({ dir, r, route: concrete, params, result: out.result, items }) }) };
      out = filterRead(out, input?.where, r);
    }
    out.resolved_by = resolvedBy(out);
    if (input?.hierarchy && actor !== "public" && !out.as_of) {
      const { layout } = await import("./router.mjs");
      const pkg = packageOfRecord(r.record);
      const lay = withParams(layout(r, dir), { dir, params, file: draftOf(concrete, venture, workspace)?.file, group: pkg ? groupLayout(pkg, dir) : null });
      out.hierarchy = hierarchy({ answer: out, layout: lay }).levels;
    }
    return out;
  }

  if (action === "layout" && out.ok) {
    const pkg = r.kind === "record" ? packageOfRecord(r.record) : null;
    const file = dir && r.kind === "record" && r.collection !== "list" && !concrete.includes("[id]") ? draftOf(concrete, venture, workspace)?.file : null;
    const result = withParams(out.result, { dir, params, file, group: pkg ? groupLayout(pkg, dir) : null });
    result.actions = await actionsIn({ dir, r, route: concrete, actor, actor_id, venture: venture ?? null });
    return { ...out, result };
  }

  if (action === "write" && before && out.ok && out.result?.written) {
    const after = await snapshot(dir);
    const change = await changed(before, after, { record: r.record });
    out.result.changed = change;
    out.result.next = await next(after, { record: r.record, route: concrete, draft: out.result.draft, venture, change });
  }
  return out;
}
