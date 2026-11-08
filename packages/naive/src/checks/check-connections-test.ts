// Breaks check-connections on copies (lead agents design, build plan item 7). Each case writes a small venture with one
// connection into a temporary folder, breaks one rule, and expects the check to name it; the catalog cases break a copy
// of the catalog in a small EE_ROOT. The clean venture and the repository pass. It also shows that the it package gives
// the it function its first write route, it/connections/[id].
//
//   node packages/naive/src/checks/check-connections-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { PACKAGE_FUNCTION } from "../core/venture-paths.mjs";
import { routes } from "../records/routes/routes.mjs";
import type { CapabilityCluster, Connection } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-connections.ts");
const CATALOG = "packages/naive/src/functions/it/capability-clusters.json";
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-connections-test-"));
const put = (f: string, v: unknown) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 2) + "\n"); };
const run = (args: string[], env: Record<string, string> = {}) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};

/** A connection that keeps every rule: a send, a payment and a signature with their classes, authority over one field the source map gives to its source. */
const good = (): Connection => ({
  id: "mailer", title: "Product email", cluster: "messaging-delivery", system: "the venture's email provider", integration: "filesystem", source: "mail-sync", status: "planned",
  authoritative_for: [{ record: "customer", attribute: "email" }],
  sync: { direction: "tool-to-repo", references_only: true },
  access: { reads: [{ what: "delivery status", scope: "messages:read" }], writes: [{ what: "send a message", scope: "messages:send" }] },
  events: [{ name: "delivered", signature: { method: "hmac-sha256", secret: "MAILER_WEBHOOK_SECRET" } }],
  external_id: { field: "message_id", provenance: true, last_synced: null },
  actions: [
    { id: "send-update", kind: "send", approval: "public-commitment" },
    { id: "pay-invoice", kind: "payment", approval: "spend-money" },
    { id: "sign-dpa", kind: "signature", approval: "legal-or-terms" },
    { id: "add-contact", kind: "create", approval: null },
  ],
  idempotency: { key: "venture id, route and record version", retries: { max: 3, backoff: "exponential" }, reconciliation: { cadence: "daily", compares: "messages sent against the outbox" } },
  exit: { deletion: "delete contacts on request through the provider's API", export: "export contacts and events as CSV", disconnect: "revoke the key and stop the webhook" },
  failure: { stale: ["customers/<id>.json email"], blocks: ["sending product email"], degrades: ["delivery status"] },
});
const RULE = { phase: "*", product: "*", account: "*", actor: "*", owner: "it-agent" };
const sourceMap = (owner = "mail-sync") => ({
  sources: [{ id: "mail-sync", connector: "filesystem", root: "sync/mail", writes: "none" }, { id: "crm-sync", connector: "filesystem", root: "sync/crm", writes: "none" }],
  records: {},
  rules: [{ record: "customer", attribute: "email", ...RULE, system_of_record: owner }, { record: "customer", attribute: "phone", ...RULE, system_of_record: "crm-sync" }],
});

let n = 0;
/** A venture with one connection, after change, and its source map. */
function venture(change: (_c: Connection) => void = () => {}, map: unknown = sourceMap(), file = "mailer.json"): string {
  const v = join(tmp, `v-${++n}`);
  put(join(v, "venture.json"), { id: `v-${n}` });
  put(join(v, "knowledge/sources.json"), map);
  const c = good(); change(c);
  put(join(v, "it/connections", file), c);
  return v;
}
const fails = (name: string, v: string, re: RegExp) => { const r = run([v]); t(name, r.status === 1 && re.test(r.out), r); };

try {
  const clean = run([venture()]);
  t("a connection that keeps every rule passes", clean.status === 0 && /1 connections in 1 ventures/.test(clean.out), clean);
  const here = run([join(repo, "packages/naive/src/records/examples")]);
  t("the repository's catalog and example ventures pass", here.status === 0 && /6 capability clusters/.test(here.out), here);

  // Contract point 6: a send, a payment and a signature each name their class.
  fails("a send with no approval class is refused", venture((c) => { c.actions[0].approval = null; }), /send-update: a send names no approval class; it needs public-commitment/);
  fails("a send with its approval left out is refused", venture((c) => { delete c.actions[0].approval; }), /send-update: a send names no approval class/);
  fails("a payment that names public-commitment is refused", venture((c) => { c.actions[1].approval = "public-commitment"; }), /pay-invoice: a payment names approval public-commitment; it needs spend-money/);
  fails("a signature with no approval class is refused", venture((c) => { c.actions[2].approval = null; }), /sign-dpa: a signature names no approval class; it needs legal-or-terms/);
  fails("a signature that names spend-money is refused", venture((c) => { c.actions[2].approval = "spend-money"; }), /sign-dpa: a signature names approval spend-money; it needs legal-or-terms/);
  fails("an action naming a class decision rights does not define is refused", venture((c) => { c.actions[3].approval = "send-anything"; }), /add-contact: approval send-anything is not a decision class/);
  const own = venture((c) => { c.actions[3].approval = "custom-class"; });
  put(join(own, "governance/decision-rights.json"), { classes: [{ id: "custom-class" }, { id: "public-commitment" }, { id: "spend-money" }, { id: "legal-or-terms" }] });
  t("a class the venture's own decision rights define is accepted", run([own]).status === 0, run([own]));

  // Contract point 1: authority comes from the source map, never from the connection.
  fails("authority over a field another source owns is refused", venture((c) => { c.authoritative_for.push({ record: "customer", attribute: "phone" }); }), /claims customer\.phone, which knowledge\/sources\.json gives to crm-sync, not mail-sync/);
  fails("authority over a field the repository owns is refused", venture(() => {}, sourceMap("venture")), /claims customer\.email, which knowledge\/sources\.json gives to venture, not mail-sync/);
  fails("authority over a field no rule names is refused", venture((c) => { c.authoritative_for = [{ record: "customer", attribute: "name" }]; }), /claims customer\.name, but no rule in knowledge\/sources\.json names it/);
  fails("authority with no source named is refused", venture((c) => { delete c.source; }), /names no source/);
  fails("a source the source map does not list is refused", venture((c) => { c.source = "elsewhere"; }), /source elsewhere is not a source in knowledge\/sources\.json/);
  const tie = sourceMap(); tie.rules.push({ record: "customer", attribute: "email", ...RULE, owner: "finance-agent", system_of_record: "mail-sync" });
  fails("authority over a field whose rules tie is refused", venture(() => {}, tie), /claims customer\.email, but the rules in knowledge\/sources\.json for it tie/);
  t("a connection that claims no authority needs no source", run([venture((c) => { c.authoritative_for = []; delete c.source; })]).status === 0);

  // References and shape.
  fails("an unknown cluster is refused", venture((c) => { c.cluster = "telepathy"; }), /cluster telepathy is not in packages\/naive\/src\/functions\/it\/capability-clusters\.json/);
  fails("an unknown integration is refused", venture((c) => { c.integration = "no-such-tool"; }), /integration no-such-tool is not an integration id/);
  fails("an event with no signature check fails the schema", venture((c) => { (c.events[0] as Partial<Connection["events"][number]>).signature = undefined; }), /mailer\.json/);
  fails("a send action with an unknown kind fails the schema", venture((c) => { (c.actions[0] as { kind: string }).kind = "broadcast"; }), /mailer\.json/);
  fails("a connection with no exit plan fails the schema", venture((c) => { delete (c as Partial<Connection>).exit; }), /mailer\.json/);
  fails("a connection whose id is not its file name is refused", venture(() => {}, sourceMap(), "other.json"), /id mailer is not its file name/);

  // The catalog, broken in a small EE_ROOT copy.
  const catalogCopy = (change: (_c: CapabilityCluster & Record<string, unknown>) => void) => {
    const r = join(tmp, `root-${++n}`);
    for (const f of ["packages/naive/src/functions/departments.json", "packages/naive/template/governance/decision-rights.json", "packages/naive/src/records/layers"]) cpSync(join(repo, f), join(r, f), { recursive: true });
    const c = JSON.parse(readFileSync(join(repo, CATALOG), "utf8")) as CapabilityCluster & Record<string, unknown>;
    change(c); put(join(r, CATALOG), c);
    return run([], { EE_ROOT: r });
  };
  const same = catalogCopy(() => {});
  t("the catalog copy passes unchanged", same.status === 0, same);
  const vendor = catalogCopy((c) => { (c.clusters[0] as Record<string, unknown>).vendor = "Acme Identity"; });
  t("a vendor field in a cluster fails the schema", vendor.status === 1 && /capability-clusters\.json/.test(vendor.out), vendor);
  const tool = catalogCopy((c) => { c.tools = ["Acme Mail"]; });
  t("a tool list at the top of the catalog fails the schema", tool.status === 1, tool);
  const fn = catalogCopy((c) => { c.clusters[1].functions.push("legal"); });
  t("a cluster naming a function departments.json does not list is refused", fn.status === 1 && /messaging-delivery names function legal/.test(fn.out), fn);
  const dup = catalogCopy((c) => { c.clusters.push({ ...c.clusters[0] }); });
  t("a cluster listed twice is refused", dup.status === 1 && /cluster identity-and-secrets is listed twice/.test(dup.out), dup);
  const gap = catalogCopy((c) => { c.gap_kinds = c.gap_kinds.filter((g) => g.id !== "runtime"); });
  t("a cluster naming a gap kind the catalog does not list is refused", gap.status === 1 && /names gap runtime, which is not one of its gap_kinds/.test(gap.out), gap);

  // The it package gives the it function its first write route.
  t("PACKAGE_FUNCTION gives it/ to the it function", (PACKAGE_FUNCTION as Record<string, string>).it === "it");
  const item = routes().find((r: { route: string }) => r.route === "it/connections/[id]");
  t("it/connections/[id] is a write route of the it package", !!item && item.actions.includes("write") && item.package === "it" && item.record === "connection", item);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("check-connections holds on every broken copy.");
