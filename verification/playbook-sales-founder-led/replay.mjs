// Replay the sales-founder-led playbook against the router.
//   node verification/playbook-sales-founder-led/replay.mjs
// Uses a temporary venture. Prints PASS or FAIL for each playbook check, and for the two model rules
// that are about routes and missing records. Exits 1 if a replay does not do what it should.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../interface/router.mjs";

const root = new URL("../..", import.meta.url).pathname;
const ws = mkdtempSync(join(tmpdir(), "founder-led-"));
mkdirSync(join(ws, "ventures"), { recursive: true });
const init = spawnSync("node", [join(root, "schema/init-venture.mjs"), join(ws, "ventures/fixture"), "fixture", "--phase", "validation"], { encoding: "utf8" });
if (init.status !== 0) {
  console.error(init.stderr || init.stdout);
  process.exit(1);
}
process.env.MENTURA_WORKSPACE = ws;

const lines = [];
const expect = (name, ok, detail = "") => {
  lines.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};
let failed = 0;

const read = async (route) => call({ venture: "fixture", route, action: "read", actor: "person" });
const write = async (route, input) => call({ venture: "fixture", route, action: "write", input, actor: "person" });

const sentence = "ICP shop-owner. Reach: people I already know. Yes: they pay an amount written in notes. Let go: they will not pay.";
const customer = (extra) => ({
  id: extra.id,
  name: extra.name ?? "A person I can contact",
  icp: extra.icp ?? "shop-owner",
  buying_stage: extra.buying_stage ?? "named",
  summary: extra.summary ?? sentence,
  notes: extra.notes ?? "",
});

const evidence = (id, summary) => ({
  id,
  kind: "stated",
  summary,
  source: { path: "foundation/problem.json" },
  audience: "target",
  collected: "2026-10-29",
});

const profiles = (icp) => icp && typeof icp === "object" ? Object.keys(icp) : [];
const records = (result) => result && typeof result === "object" ? Object.values(result) : [];
const founderIds = (result) => result && typeof result === "object" ? Object.keys(result) : [];

function evaluate(list, icpIds, streamExists, founders) {
  const stages = new Set(["named", "aware", "trying", "paying", "gone"]);
  const later = new Set(["aware", "trying", "paying", "gone"]);
  const anyNotes = list.some((r) => String(r.notes ?? "").trim() !== "");
  const amount = (notes) => /\d+(?:\.\d+)?\s*[A-Z]{3}/.test(String(notes ?? ""));
  const callerId = (notes) => String(notes ?? "").match(/caller:\s*([a-z0-9-]+)/)?.[1] ?? null;
  const paying = list.filter((r) => r.buying_stage === "paying" && amount(r.notes));
  return {
    "list-started": list.length >= 1,
    "icp-cited": list.every((r) => icpIds.includes(r.icp)),
    "buying-stage-known": list.every((r) => stages.has(r.buying_stage)),
    "named-is-only-a-list": list.every((r) => r.buying_stage !== "named" || String(r.notes ?? "") === ""),
    "notes-for-a-later-stage": list.every((r) => !later.has(r.buying_stage) || String(r.notes ?? "").trim() !== ""),
    "stream-before-notes": !anyNotes || streamExists,
    "caller-written": list.every((r) => !later.has(r.buying_stage) || callerId(r.notes) !== null),
    "caller-is-a-founder": founders.length === 0 || list.every((r) => {
      if (!later.has(r.buying_stage)) return true;
      const id = callerId(r.notes);
      return id !== null && founders.includes(id);
    }),
    "trying-names-the-next-ask": list.every((r) => r.buying_stage !== "trying" || /ask:\s*\d{4}-\d{2}-\d{2}/.test(String(r.notes ?? ""))),
    "paying-names-an-amount": list.every((r) => r.buying_stage !== "paying" || amount(r.notes)),
    "first-ten": paying.length >= 10,
    "playbook-sentence": list.every((r) => ["ICP ", "Reach:", "Yes:", "Let go:"].every((part) => String(r.summary ?? "").includes(part))),
  };
}

async function snapshot() {
  const customers = await read("customers");
  const icp = await read("foundation/icp");
  const stream = await read("purpose/data-stream/conversations");
  const founders = await read("people/founders");
  const list = customers.result ? records(customers.result) : [];
  return evaluate(list, profiles(icp.result), stream.result != null, founderIds(founders.result));
}

const fake = await read("sales/pipeline");
expect("rule routes: a route the router does not have is refused", !fake.ok && /no route/.test(fake.error ?? ""), fake.error ?? "");

const before = await read("customers");
const icpMissing = await read("foundation/icp");
const problemMissing = await read("foundation/problem");
const productMissing = await read("product/shop");
expect("rule reads: foundation/icp is missing until the venture provides it", icpMissing.ok && icpMissing.result === null);
expect("rule reads: foundation/problem is missing until the venture provides it", problemMissing.ok && problemMissing.result === null);
expect("rule reads: product/shop is missing until the venture provides it", productMissing.ok && productMissing.result === null);
expect("rule reads: no customer is written while those records are missing", before.ok && before.result === null);

const sources = await read("knowledge/knowledge-sources");
expect("step 1: knowledge/knowledge-sources can be absent", sources.ok && sources.result === null);

const icpWrite = await write("foundation/icp/shop-owner", { id: "shop-owner", who: "Owners of small shops", primary: true });
expect("step 2: write foundation/icp/shop-owner", icpWrite.ok, icpWrite.error ?? "");
const icpListWrite = await write("foundation/icp", { id: "shop-owner", who: "Owners of small shops" });
expect("rule routes: foundation/icp is a list and refuses a write", !icpListWrite.ok && /no action write/.test(icpListWrite.error ?? ""), icpListWrite.error ?? "");
const problemWrite = await write("foundation/problem", {
  venture: "fixture",
  statement: "Weekly admin takes hours they would spend on the work",
  segment: "Owners of small shops",
  evidence: [evidence("fixture-note", "A fixture sentence so the schema accepts the record. Not a market finding.")],
});
expect("step 2: write foundation/problem", problemWrite.ok, problemWrite.error ?? "");
const productWrite = await write("product/shop", {
  id: "shop",
  name: "Shop",
  description: "A fixture product so the route can be read.",
});
expect("step 2: write product/shop", productWrite.ok, productWrite.error ?? "");
const icpRead = await read("foundation/icp");
expect("step 2: the profile id is shop-owner", profiles(icpRead.result)[0] === "shop-owner");

const priceMissing = await read("validation/pricing");
expect("step 3: validation/pricing can be absent, so no price is copied", priceMissing.ok && priceMissing.result === null);

const foundersMissing = await read("people/founders");
expect("step 2: people/founders can be absent", foundersMissing.ok && foundersMissing.result === null);
const founderWrite = await write("people/founders/ada", {
  id: "ada",
  name: "Ada",
  role: "founder",
  joined: "2026-10-29",
});
expect("step 2: write people/founders/ada", founderWrite.ok, founderWrite.error ?? "");

const named = await write("customers/ada-shop", customer({ id: "ada-shop", name: "Ada Shop" }));
expect("step 4: write customers/ada-shop at named", named.ok, named.error ?? "");

let got = await snapshot();
expect("check list-started passes with one record", got["list-started"]);
expect("check icp-cited passes when the id is on foundation/icp", got["icp-cited"]);
expect("check buying-stage-known passes for named", got["buying-stage-known"]);
expect("check named-is-only-a-list passes with empty notes", got["named-is-only-a-list"]);
expect("check playbook-sentence passes", got["playbook-sentence"]);
expect("check first-ten fails before anyone has paid", !got["first-ten"]);

const earlyNotes = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  notes: "2026-10-29. caller: ada. Wrote this before the log.",
}));
expect("the route accepts notes before the stream", earlyNotes.ok, earlyNotes.error ?? "");
got = await snapshot();
expect("check named-is-only-a-list fails when named has notes", !got["named-is-only-a-list"]);
expect("check stream-before-notes fails when notes exist and the stream does not", !got["stream-before-notes"]);

const streamWrite = await write("purpose/data-stream/conversations", {
  id: "conversations",
  sensitive: true,
  summary: "What was said on calls. The short facts stay on the customer record.",
});
expect("step 5: write purpose/data-stream/conversations", streamWrite.ok, streamWrite.error ?? "");
const restored = await write("customers/ada-shop", customer({ id: "ada-shop", name: "Ada Shop", notes: "" }));
expect("notes cleared after the stream exists", restored.ok, restored.error ?? "");
got = await snapshot();
expect("check stream-before-notes passes when no notes are filled", got["stream-before-notes"]);
expect("check named-is-only-a-list passes again", got["named-is-only-a-list"]);

const aware = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  buying_stage: "aware",
  notes: "2026-10-29. caller: ada. They already pay three vendors for the same weekly admin.",
}));
expect("step 6: write aware", aware.ok, aware.error ?? "");
got = await snapshot();
expect("check notes-for-a-later-stage passes", got["notes-for-a-later-stage"]);
expect("check caller-written passes", got["caller-written"]);
expect("check caller-is-a-founder passes for ada", got["caller-is-a-founder"]);
expect("check stream-before-notes passes once the stream exists", got["stream-before-notes"]);

const noCaller = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  buying_stage: "aware",
  notes: "2026-10-29. They already pay three vendors.",
}));
expect("the route accepts aware notes with no caller", noCaller.ok, noCaller.error ?? "");
got = await snapshot();
expect("check caller-written fails when the line is missing", !got["caller-written"]);

const wrongCaller = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  buying_stage: "aware",
  notes: "2026-10-29. caller: someone-else. They already pay three vendors.",
}));
expect("the route accepts a caller who is not a founder", wrongCaller.ok, wrongCaller.error ?? "");
got = await snapshot();
expect("check caller-is-a-founder fails for someone-else", !got["caller-is-a-founder"]);

const tryingBare = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  buying_stage: "trying",
  notes: "2026-10-29. caller: ada. They are using it on this week's admin.",
}));
expect("step 7: the route accepts trying with no ask date", tryingBare.ok, tryingBare.error ?? "");
got = await snapshot();
expect("check trying-names-the-next-ask fails without the date", !got["trying-names-the-next-ask"]);

const trying = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  buying_stage: "trying",
  notes: "2026-10-29. caller: ada. They are using it on this week's admin. ask: 2026-11-12",
}));
expect("step 7: write trying with ask: 2026-11-12", trying.ok, trying.error ?? "");
got = await snapshot();
expect("check trying-names-the-next-ask passes", got["trying-names-the-next-ask"]);
expect("check first-ten still fails while the record is trying", !got["first-ten"]);

const payingBare = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  buying_stage: "paying",
  notes: "2026-10-29. caller: ada. They paid. Set up with them on the call.",
}));
expect("the route accepts paying with no numeral", payingBare.ok, payingBare.error ?? "");
got = await snapshot();
expect("check paying-names-an-amount fails with no numeral", !got["paying-names-an-amount"]);
expect("check first-ten fails when the paying notes have no numeral", !got["first-ten"]);

const paying = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  buying_stage: "paying",
  notes: "2026-10-29. caller: ada. They paid 40 USD. Set up with them on the call.",
}));
expect("step 7: write paying with 40 USD", paying.ok, paying.error ?? "");
got = await snapshot();
expect("check paying-names-an-amount passes", got["paying-names-an-amount"]);
expect("check first-ten fails with one paying record", !got["first-ten"]);

const priceWrite = await write("validation/pricing", {
  venture: "fixture",
  product: "shop",
  model: "subscription",
  buyer: "The owner",
  points: [{ name: "Shop", amount: 49, currency: "USD", period: "month" }],
  evidence: [evidence("price-fixture", "A fixture price so the route can be read. Not evidence that anyone paid 49.")],
});
expect("step 3: write validation/pricing after the customer amount is already 40", priceWrite.ok, priceWrite.error ?? "");
const priceRead = await read("validation/pricing");
const customerRead = await read("customers/ada-shop");
expect("rule reads: the price record is 49 USD", priceRead.result?.points?.[0]?.amount === 49);
expect("rule reads: the customer notes still say 40, not the price record", /40/.test(customerRead.result?.notes ?? "") && !/49/.test(customerRead.result?.notes ?? ""));

const badIcp = await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  icp: "not-a-profile",
  buying_stage: "paying",
  notes: "2026-10-29. caller: ada. They paid 40 USD. Set up with them on the call.",
}));
expect("the route accepts an icp id the profile record does not have", badIcp.ok, badIcp.error ?? "");
got = await snapshot();
expect("check icp-cited fails for not-a-profile", !got["icp-cited"]);
await write("customers/ada-shop", customer({
  id: "ada-shop",
  name: "Ada Shop",
  buying_stage: "paying",
  notes: "2026-10-29. caller: ada. They paid 40 USD. Set up with them on the call.",
}));

const badStage = await write("customers/bad-stage", customer({
  id: "bad-stage",
  buying_stage: "closed-won",
  notes: "2026-10-29. caller: ada. They paid 40 USD.",
}));
expect("the route accepts buying_stage closed-won", badStage.ok, badStage.error ?? "");
got = await snapshot();
expect("check buying-stage-known fails for closed-won", !got["buying-stage-known"]);
await write("customers/bad-stage", customer({
  id: "bad-stage",
  buying_stage: "gone",
  notes: "2026-10-29. caller: ada. Let go: they will not pay.",
}));
got = await snapshot();
expect("check buying-stage-known passes once the extra record is gone", got["buying-stage-known"]);

const goneNoCaller = await write("customers/bad-stage", customer({
  id: "bad-stage",
  buying_stage: "gone",
  notes: "2026-10-29. Let go: they will not pay.",
}));
expect("the route accepts gone notes with no caller", goneNoCaller.ok, goneNoCaller.error ?? "");
got = await snapshot();
expect("check caller-written fails on gone notes with no caller", !got["caller-written"]);
await write("customers/bad-stage", customer({
  id: "bad-stage",
  buying_stage: "gone",
  notes: "2026-10-29. caller: ada. Let go: they will not pay.",
}));

const emptyAware = await write("customers/empty-notes", customer({
  id: "empty-notes",
  buying_stage: "aware",
  notes: "",
}));
expect("the route accepts aware with empty notes", emptyAware.ok, emptyAware.error ?? "");
got = await snapshot();
expect("check notes-for-a-later-stage fails on empty notes", !got["notes-for-a-later-stage"]);
await write("customers/empty-notes", customer({
  id: "empty-notes",
  buying_stage: "gone",
  notes: "2026-10-29. caller: ada. They declined the conversation.",
}));

for (let n = 2; n <= 10; n++) {
  const id = `pay-${String(n).padStart(2, "0")}`;
  const w = await write(`customers/${id}`, customer({
    id,
    name: `Person ${n}`,
    buying_stage: "paying",
    notes: `2026-10-29. caller: ada. They paid ${40 + n} USD. Set up with them on the call.`,
  }));
  if (!w.ok) expect(`write customers/${id}`, false, w.error ?? "");
}
got = await snapshot();
expect("check first-ten passes with ten paying records that name an amount", got["first-ten"]);
expect("check list-started still passes", got["list-started"]);
expect("main path: the other checks pass with the ten", [
  "icp-cited", "buying-stage-known", "named-is-only-a-list", "notes-for-a-later-stage",
  "stream-before-notes", "caller-written", "caller-is-a-founder", "trying-names-the-next-ask",
  "paying-names-an-amount", "playbook-sentence",
].every((id) => got[id]), JSON.stringify(got));

const listed = await read("customers");
const ids = listed.result ? Object.keys(listed.result) : [];
expect("step 8: customers lists the pipeline", ids.includes("ada-shop") && ids.includes("pay-10"), ids.join(","));

console.log(lines.join("\n"));
console.log(failed ? `${failed} replay assertion(s) failed` : "replay ok");
process.exit(failed ? 1 : 0);
