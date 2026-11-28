// The architect's program (EE-237): what the default checks cannot see in an ADR. An architecture decision record is
// the reading copy of one decision, so each adr artifact the architect made must be built from a venture decision
// record (decisions/<id>.decision.json) that still exists. The adr kind's sections read that record
// (packages/naive/src/functions/documents.json); an ADR built from none has nothing its sections can cite.

import { Effect } from "effect";
import { readJson, VentureFs } from "../../core/effect/fs.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import type { RoleFinding, RoleProgram } from "../../checks/role-program.ts";

const DECISION = /^decisions\/[^/]+\.decision\.json$/;

const program: RoleProgram = {
  id: "architect",
  checks: [{
    id: "adr-cites-decision",
    description: "Every adr artifact is built from a decision record that exists in the venture",
    run: (ctx) => Effect.gen(function* () {
      const fs = yield* VentureFs;
      const out: RoleFinding[] = [];
      if (!ctx.venture) return out;
      for (const a of ctx.artifacts.filter((x) => x.ref.document_kind === "adr")) {
        const body = yield* readJson(ventureFile(ctx.venture, a.path)).pipe(Effect.orElseSucceed(() => null));
        const from = typeof body === "object" && body !== null && "built_from" in body && Array.isArray(body.built_from) ? body.built_from : [];
        const decisions = from.flatMap((b: unknown) => (typeof b === "object" && b !== null && "record" in b && typeof b.record === "string" && DECISION.test(b.record) ? [b.record] : []));
        const at = { artifact: a.path, kind: "adr", family: "protocol", severity: "error" } as const;
        if (!decisions.length) { out.push({ ...at, rule: "adr-cites-decision", message: `${a.path} is an ADR built from no decision record (decisions/<id>.decision.json in built_from)` }); continue; }
        for (const d of decisions) if (!(yield* fs.exists(ventureFile(ctx.venture, d)))) out.push({ ...at, rule: "adr-cites-decision", message: `${a.path} is built from ${d}, which the venture does not have` });
      }
      return out;
    }),
  }],
};

export default program;
