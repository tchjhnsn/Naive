// A stand-in money sync command for Naive's tests (packages/naive/src/core/sync.mjs). An app names its real one, such as
// a bank's connector, in NAIVE_SYNC_<SYSTEM>; the tests name this one. It replays a saved answer: the money
// package of the acme-labs example venture (accounts, the summary and the transactions stream's declaration),
// plus one transaction event, so the check that a sensitive stream stays out of git has something to check.
//
//   node packages/naive/src/records/examples/money-sync/sync.ts --venture <dir>

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../../../core/venture-paths.mjs";

const argv = process.argv.slice(2);
const at = argv.indexOf("--venture");
const venture = at >= 0 ? argv[at + 1] : undefined;
if (!venture || !existsSync(join(venture, "venture.json"))) { console.error("usage: node packages/naive/src/records/examples/money-sync/sync.ts --venture <dir>"); process.exit(2); }

const saved = new URL("../workspace/ventures/acme-labs/money", import.meta.url).pathname;
const money: string = ventureFile(venture, "money");
cpSync(saved, money, { recursive: true });
const event = join(money, "_streams/transactions/2026/06/2026-06-27-example-0001.json");
mkdirSync(join(event, ".."), { recursive: true });
writeFileSync(event, `${JSON.stringify({ id: "example-0001", at: "2026-06-27T12:00:00Z", amount: { amount: -1200, currency: "USD" }, counterparty: "Example supplier", type: "card", status: "posted", account: "example:account:30000000-0000-4000-8000-000000000001", source: "example:transaction:example-0001", fields: [] }, null, 2)}\n`);
console.log(JSON.stringify({ address: "saved answer", fixture: true, said: "from a saved answer (a fixture, not a live account) into money/" }));
