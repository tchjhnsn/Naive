#!/usr/bin/env node
// Replays the apple-launch playbook against the router on fixture ventures.
//   node verification/playbook-apple-launch/replay.mjs
//
// A check fails the process. The playbook's own checks are run the way the template states them.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { call, routes } from "../../interface/router.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../..");
const playbook = join(repo, "packages/marketing/playbooks/apple-launch.md");
const text = readFileSync(playbook, "utf8");
let failed = 0;
const expect = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail == null ? "" : `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

const steps = [...text.matchAll(/^route: (\S+) action: (\S+)$/gm)].map((m) => ({ route: m[1], action: m[2] }));
const table = routes();
const row = (route) => table.find((r) => r.route === route);
for (const s of steps) {
  const r = row(s.route);
  expect(`route exists: ${s.route} ${s.action}`, !!r && r.actions.includes(s.action), r ? r.actions : "missing");
}
const distinct = [...new Set(steps.map((s) => `${s.route} ${s.action}`))];
expect("nine distinct route actions, each one the router offers", distinct.length === 9, distinct);

const content = row("marketing/content");
expect("marketing/content has no write action", content && !content.actions.includes("write"), content?.actions);

function venture() {
  const dir = mkdtempSync(join(tmpdir(), "apple-launch-"));
  const p = spawnSync("node", [join(repo, "schema/init-venture.mjs"), dir, "launch", "--phase", "beachhead"], { encoding: "utf8" });
  if (p.status !== 0) throw new Error(p.stderr || p.stdout);
  return dir;
}
const go = (dir, route, action, input) => call({
  venture: "launch", route, action, actor: "person", workspace: dir,
  input: action === "run" ? { ...(input ?? {}), cache: "no-store" } : input,
});

const product = {
  id: "kettle",
  name: "Kettle",
  description: "A small tool that boils water for one person who wants tea now.",
  job: "Boil water for tea without watching a pot",
  technology: "An electric kettle with a switch that clicks off",
  offering: "product",
  status: "building",
  market: { customer: "b2c", relationship: "customer", segment: "home cooks" },
  offered_to: ["home-cooks"],
};
const thin = { id: "kettle", name: "Kettle", description: "A kettle with no job yet." };

const narrative = (body, extra = {}) => `---
variant_of: product/kettle.json
audience: ${extra.audience ?? "home-cooks"}
publish: ${extra.publish ?? false}
${extra.approved_by ? `approved_by: ${extra.approved_by}\n` : ""}---
${body}
`;
const cleanNarrative = narrative(`Kettle heats water for tea and shuts itself off.

You are already in the room and you want a cup.

Fill it, flip its switch, and leave it. The switch ends the boil.

It is still being built, so there is nothing to buy yet.
`);
const cleanDemo = narrative(`# Show the product doing its job
job: Fill it and start it, so the room sees water heat for tea.
technology: Flip the switch. The room hears it end the boil on its own.
status: Say it is still being built, so nothing is for sale today.
job: If the live switch fails, play the recorded take of the same fill and stop.
`);

function putContent(dir, name, body) {
  const rel = `operations/marketing/content/${name}`;
  mkdirSync(join(dir, "operations/marketing/content"), { recursive: true });
  writeFileSync(join(dir, rel), body);
  return rel;
}

const BEAT = /^(job|technology|description|offering|status|market|name|pricing): \S/;
const MARK = /\b(Apple|iPhone|iPod)\b|\bThink different\b/i;
function beats(body) {
  const m = body.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  const text = m ? m[1] : body;
  return text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("# "));
}
function support(card, demoBody, pricingFound) {
  const allowed = new Set(["job", "technology", "description", "offering", "status", "market", "name"].filter((k) => {
    const v = card[k];
    return v != null && v !== "" && !(Array.isArray(v) && !v.length);
  }));
  if (pricingFound) allowed.add("pricing");
  const lines = beats(demoBody);
  const bad = lines.filter((l) => {
    const field = l.match(/^([a-z_]+): /)?.[1];
    return !field || !BEAT.test(l) || !allowed.has(field);
  });
  return { pass: lines.length > 0 && bad.length === 0, bad };
}
function marks(bodies) {
  return bodies.filter((b) => MARK.test(b.replace(/^---\n[\s\S]*?\n---\n?/, "")));
}

function launchPage(id) {
  const file = `product/${id}.json`;
  const section = (item, component, variant) => ({
    item, component, need: 1, for: ["home-cooks"],
    why: [`This section is drawn from product/${id}.`],
    source: { record: "product", file, route: `product/${id}` },
    variant,
  });
  return {
    path: "/launch", parent: "/", label: "Launch", type: "launch", level: "linked",
    sections: [
      section("launch-narrative", "LaunchNarrative", "operations/marketing/content/launch-narrative.mdx"),
      section("launch-demo", "DemoScript", "operations/marketing/content/launch-demo.mdx"),
    ],
  };
}
function sitemap(pages) {
  return {
    version: "0", venture: "launch", facts: {},
    offerings: [{ id: "kettle", name: "Kettle", offering: "product", status: "building", offered_to: ["home-cooks"], from: "product/kettle" }],
    audience: { offered_to: ["home-cooks"], partner_led: false, types: [] },
    pages, omitted: [],
    handoff: {
      to: "engineering",
      note: "The launch page is part of the marketing package handed to engineering.",
      variants: ["operations/marketing/content/launch-narrative.mdx", "operations/marketing/content/launch-demo.mdx"],
    },
  };
}
const homePage = {
  path: "/", parent: null, label: "Home", type: "home", level: "home",
  sections: [{
    item: "home-intro", component: "Prose", need: 1, for: ["home-cooks"],
    why: ["The home page was already on the sitemap."],
    source: { record: "product", file: "product/kettle.json", route: "product/kettle" },
    variant: "operations/marketing/content/home.mdx",
  }],
};

const brand = {
  version: "0", venture: "launch",
  voice: { tone: ["plain"], rules: [{ id: "no-synergy", avoid: "synergy", use: "work together", why: "the venture does not say synergy" }] },
};
const pricing = {
  venture: "launch", product: "kettle", model: "one-time", buyer: "home cooks",
  points: [{ name: "kettle", amount: 40, currency: "USD", period: "once" }],
  evidence: [],
};

// --- routes the playbook must not pretend to write ---
{
  const dir = venture();
  const refused = await go(dir, "marketing/content", "write", { text: "no" });
  expect("a router write of marketing/content is refused", refused.ok === false && /no action|has no action|write/.test(refused.error ?? ""), refused.error);
  rmSync(dir, { recursive: true, force: true });
}

// --- no card, thin card, ready card ---
{
  const dir = venture();
  const missing = await go(dir, "product/no-such", "read");
  expect("a missing product read is not-found and invents nothing", missing.ok && missing.result == null && missing.not_found, missing.error ?? missing.not_found);
  const thinWrite = await go(dir, "product/kettle", "write", thin);
  expect("a card with no job can be written", thinWrite.ok, thinWrite.error);
  const thinRead = await go(dir, "product/kettle", "read");
  expect("the thin card has no job, so the template stops", thinRead.ok && !thinRead.result?.job, thinRead.result);
  rmSync(dir, { recursive: true, force: true });
}

// --- main path, and each check both ways ---
{
  const dir = venture();
  const wrote = await go(dir, "product/kettle", "write", product);
  expect("the ready product card writes", wrote.ok, wrote.error);
  const card = await go(dir, "product/kettle", "read");
  expect("product/[id] read returns the job", card.ok && card.result?.job === product.job, card.error);

  const inputs = await go(dir, "marketing/design-system/inputs", "run");
  expect("design-system inputs run", inputs.ok, inputs.error);
  expect("inputs expose market:kettle and do not copy the description", inputs.result?.["market:kettle"]?.route === "product/kettle" && !JSON.stringify(inputs.result).includes(product.description), inputs.result);

  const noBrand = await go(dir, "marketing/brand", "read");
  expect("brand read is not-found when the venture has none", noBrand.ok && noBrand.result == null && noBrand.not_found, noBrand.error);

  const noPrice = await go(dir, "validation/pricing", "read");
  expect("pricing read is not-found when the venture has none", noPrice.ok && noPrice.result == null && noPrice.not_found, noPrice.error);

  // Wrong folder: the public gate cannot fail a file it does not see.
  mkdirSync(join(dir, "marketing/content"), { recursive: true });
  writeFileSync(join(dir, "marketing/content/bad.mdx"), "just some words with no frontmatter\n");
  const blind = await go(dir, "operations/marketing/public", "run");
  expect("public gate passes a broken file that sits in marketing/content", blind.ok && blind.result?.files === 0, blind.error ?? blind.result);
  rmSync(join(dir, "marketing/content/bad.mdx"));

  putContent(dir, "launch-narrative.mdx", narrative("Heat the water.\n", { audience: "" }).replace("audience: \n", ""));
  const noAudience = await go(dir, "operations/marketing/public", "run");
  expect("public gate fails a narrative with no audience", noAudience.ok === false && /audience/.test(noAudience.error ?? ""), noAudience.error);

  putContent(dir, "launch-narrative.mdx", narrative(product.description + "\n"));
  const leak = await go(dir, "operations/marketing/public", "run");
  expect("public gate fails a narrative that copies the product description", leak.ok === false && /copies/.test(leak.error ?? ""), leak.error);

  putContent(dir, "launch-narrative.mdx", narrative("Heat the water.\n", { publish: true }));
  const noApprover = await go(dir, "operations/marketing/public", "run");
  expect("public gate fails a published narrative with no approver", noApprover.ok === false && /approved_by/.test(noApprover.error ?? ""), noApprover.error);

  putContent(dir, "launch-narrative.mdx", cleanNarrative);
  putContent(dir, "launch-demo.mdx", cleanDemo);
  const gate = await go(dir, "operations/marketing/public", "run");
  expect("public gate passes the clean narrative and demo", gate.ok && gate.result?.errors?.length === 0 && gate.result?.files === 2, gate.error ?? gate.result);

  const seen = await go(dir, "marketing/content", "read");
  const seenText = JSON.stringify(seen.result ?? "");
  expect("marketing/content read shows both files", seen.ok && /Fill it and start it/.test(seenText) && /shuts itself off/.test(seenText), seen.error ?? Object.keys(seen.result ?? {}));

  const voiceBare = await go(dir, "marketing/voice", "run");
  expect("voice with no brand record: the call succeeds and result.ok is true", voiceBare.ok && voiceBare.result?.ok === true && (voiceBare.result?.violations ?? []).length === 0, voiceBare.error ?? voiceBare.result);

  const brandWrite = await go(dir, "marketing/brand", "write", brand);
  expect("a person can write the brand voice rule", brandWrite.ok, brandWrite.error);
  putContent(dir, "launch-narrative.mdx", narrative("This launch promises synergy across the kitchen.\n"));
  const voiceBad = await go(dir, "marketing/voice", "run");
  expect("voice call still exits ok when a phrase is avoided badly", voiceBad.ok === true, voiceBad.error);
  expect("voice result.ok is false and names the file", voiceBad.result?.ok === false && (voiceBad.result?.violations ?? []).some((v) => /launch-narrative/.test(v.file) && v.found?.toLowerCase() === "synergy"), voiceBad.result);

  putContent(dir, "launch-narrative.mdx", cleanNarrative);
  const voiceGood = await go(dir, "marketing/voice", "run");
  expect("voice result.ok is true once the avoid-phrase is gone", voiceGood.ok && voiceGood.result?.ok === true, voiceGood.result);

  const priceBeat = narrative(`# Show the product doing its job
pricing: Name the price the pricing record holds.
job: Fill it and start it, so the room sees water heat for tea.
`);
  putContent(dir, "launch-demo.mdx", priceBeat);
  const supportMissing = support(card.result, priceBeat, false);
  expect("a pricing beat fails support when validation/pricing was not found", supportMissing.pass === false, supportMissing.bad);

  const priceWrite = await go(dir, "validation/pricing", "write", pricing);
  expect("a pricing record writes", priceWrite.ok, priceWrite.error);
  const priceRead = await go(dir, "validation/pricing", "read");
  const supportPriced = support(card.result, priceBeat, priceRead.ok && priceRead.result != null);
  expect("the same pricing beat passes support once the record is there", priceRead.ok && priceRead.result?.points?.[0]?.amount === 40 && supportPriced.pass, priceRead.error ?? supportPriced);

  const warranty = narrative(`# Show the product doing its job
warranty: Promise a guarantee the card does not hold.
`);
  expect("a beat on a field the card lacks fails support", support(card.result, warranty, true).pass === false);

  putContent(dir, "launch-demo.mdx", cleanDemo);
  expect("the clean demo passes support", support(card.result, cleanDemo, false).pass === true, support(card.result, cleanDemo, false));

  const marked = narrative("Think different about boiling water.\n");
  expect("Think different fails the mark check", marks([marked]).length === 1);
  expect("the clean files pass the mark check", marks([cleanNarrative, cleanDemo]).length === 0);

  putContent(dir, "launch-narrative.mdx", cleanNarrative);
  const gateAgain = await go(dir, "operations/marketing/public", "run");
  expect("public gate still passes after the bad drafts are replaced", gateAgain.ok, gateAgain.error);

  const emptyMap = await go(dir, "marketing/sitemap", "read");
  expect("sitemap read is not-found on a new venture", emptyMap.ok && emptyMap.result == null, emptyMap.error);
  const created = await go(dir, "marketing/sitemap", "write", sitemap([launchPage("kettle")]));
  expect("sitemap write of the launch page succeeds", created.ok, created.error);
  const mapped = await go(dir, "marketing/sitemap", "read");
  const pages = mapped.result?.pages ?? [];
  expect("the new sitemap has /launch and both variants", mapped.ok && pages.some((p) => p.path === "/launch" && p.sections?.every((s) => s.source?.file === "product/kettle.json") && p.sections?.map((s) => s.variant).join() === "operations/marketing/content/launch-narrative.mdx,operations/marketing/content/launch-demo.mdx"), mapped.error ?? pages);

  rmSync(dir, { recursive: true, force: true });
}

// --- an existing sitemap keeps its pages ---
{
  const dir = venture();
  await go(dir, "product/kettle", "write", product);
  const first = await go(dir, "marketing/sitemap", "write", sitemap([homePage]));
  expect("a home page sitemap writes", first.ok, first.error);
  const before = await go(dir, "marketing/sitemap", "read");
  const kept = [...(before.result?.pages ?? []), launchPage("kettle")];
  const second = await go(dir, "marketing/sitemap", "write", sitemap(kept));
  expect("adding the launch page writes", second.ok, second.error);
  const after = await go(dir, "marketing/sitemap", "read");
  const paths = (after.result?.pages ?? []).map((p) => p.path).sort();
  expect("the home page is still there beside /launch", after.ok && paths.join() === "/,/launch", paths);
  rmSync(dir, { recursive: true, force: true });
}

console.log(failed ? `${failed} replay check(s) failed` : "replay: every check passed");
process.exit(failed ? 1 : 0);
