// Record generator for a connection (EE-099; lead agents design, "Capability clusters and connections"). The agent asks
// for the id, the capability cluster, the outside system and the eight contract points. The generator fills the
// thesis's defaults the agent left out: sync tool to repo with references only, provenance on the external id, no
// last sync yet, a daily reconciliation, status planned, and for a send, payment or signature action with no approval
// the class it needs (APPROVAL_CLASS). It never changes an approval a person gave: a wrong one stays, and
// packages/naive/src/checks/check-connections.ts refuses it. The draft goes to the write chain for it/connections/<id>.json.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Connection } from "../../records/types/records.d.ts";

export const record = "connection";

/** The decision class each outside act needs before it happens (the thesis's contract point 6, lead agents design):
 * a send is a public commitment, a payment spends money, a signature binds the venture to legal terms. All three are
 * one-way doors or never re-delegated in the delegation template, so naming the class is enough for delegation to
 * make a person approve. */
export const APPROVAL_CLASS: Readonly<Record<string, string>> = { send: "public-commitment", payment: "spend-money", signature: "legal-or-terms" };

type Action = Connection["actions"][number];
type Idempotency = Connection["idempotency"];
/** What the agent answers: any field may be missing, and the defaults the generator fills may be left out. */
export type Answers = Partial<Omit<Connection, "sync" | "external_id" | "idempotency">> & {
  sync?: Partial<Connection["sync"]>;
  external_id?: Partial<Connection["external_id"]>;
  idempotency?: Partial<Omit<Idempotency, "reconciliation">> & { reconciliation?: Partial<Idempotency["reconciliation"]> };
};
const DERIVED = ["sync", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { sync: "tool-to-repo, references only, unless given", "external_id.provenance": "true", "external_id.last_synced": "null before the first sync",
    "idempotency.reconciliation.cadence": "daily unless given", status: "planned unless given", "actions[].approval": "the class a send, payment or signature needs when none is given" } });

export function draft(a: Answers) {
  if (!a.id || !a.cluster || !a.access || !a.external_id?.field || !a.idempotency?.key || !a.idempotency.retries || !a.idempotency.reconciliation?.compares || !a.exit || !a.failure) {
    return { ok: false, record, errors: ["a connection needs an id, a cluster, access, an external id field, an idempotency key with retries and what reconciliation compares, an exit plan and its failure effects"] };
  }
  const id = slug(a.id);
  const actions = (a.actions ?? []).map((x: Action) => drop({ ...x, approval: x.approval ?? APPROVAL_CLASS[x.kind] }) as Action);
  const rec = drop({ id, title: a.title, cluster: a.cluster, system: a.system, integration: a.integration, source: a.source, status: a.status ?? "planned",
    authoritative_for: a.authoritative_for ?? [], sync: { direction: "tool-to-repo", references_only: true, ...a.sync },
    access: a.access, events: a.events ?? [], external_id: { field: a.external_id.field, provenance: true, last_synced: a.external_id.last_synced ?? null },
    actions, idempotency: { key: a.idempotency.key, retries: a.idempotency.retries,
      reconciliation: { cadence: a.idempotency.reconciliation.cadence ?? "daily", compares: a.idempotency.reconciliation.compares } }, exit: a.exit, failure: a.failure, note: a.note }) as Connection;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `it/connections/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
