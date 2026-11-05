// Record generator for a bug (EE-099). The agent asks for a title, severity, the version it was found in and the
// steps; the generator derives the id from the title (unique among the venture's bugs), opens it, and leaves
// fixed_in empty until a release fixes it. The draft goes to: mentura product/bugs/<id> write --venture <id> --input -
import { existsSync, readdirSync } from "node:fs";
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import { ventureFile } from "../../packages/core/venture-paths.mjs";

export const record = "bug";
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q) => !["id", "venture", "status", "fixed_in"].includes(q.field)),
  derived: { id: "from the title, unique among product/bugs", status: "open", fixed_in: "null until a release fixes it" } });

/** @param {any} a @param {{ venture?: string }} [o] */
export function draft(a, { venture } = {}) {
  if (!a.title) return { ok: false, record, errors: ["a bug needs a title"] };
  const taken = venture && existsSync(ventureFile(venture, "product/bugs")) ? new Set(readdirSync(ventureFile(venture, "product/bugs")).map((f) => f.replace(/\.json$/, ""))) : new Set();
  let id = a.id ?? slug(a.title), n = 2; while (taken.has(id)) id = `${slug(a.title)}-${n++}`;
  const rec = drop({ id, venture: a.venture, title: a.title, severity: a.severity, status: a.status ?? "open", found_in: a.found_in,
    repro: typeof a.repro === "string" ? [a.repro] : a.repro, fixed_in: a.fixed_in ?? null, feedback: a.feedback });
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `product/bugs/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
