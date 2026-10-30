#!/usr/bin/env node
// Replay the hubspot-inbound playbook against the router.
// A check passes here only when the real route does what the playbook says.
//
//   node verification/cursor/playbook-hubspot-inbound/replay.mjs

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, routes } from "../../../interface/router.mjs";

const NAMED = [
  "marketing/sitemap",
  "foundation/icp",
  "foundation/problem",
  "marketing/design-system/inputs",
  "product",
  "product/[id]",
  "marketing/voice",
  "governance/publication-policy",
  "marketing/content",
  "operations/marketing/public",
];

const STAGES = new Set(["awareness", "consideration", "decision", "onboarding", "adoption", "retention", "advocacy"]);
const FLYWHEELS = new Set(["attract", "engage", "delight"]);
const rows = [];
const note = (rule, expect, ok, detail) => {
  rows.push({ rule, expect, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${rule}  expected ${expect}: ${detail}`);
};

const ventureJson = {
  id: "inbound-fixture",
  name: "Inbound fixture",
  parent: null,
  phase: "validation",
  owner: "self",
  status: "active",
  layers: { purpose: true, knowledge: false, operations: true, evidence: false },
};

const problem = {
  venture: "inbound-fixture",
  statement: "Owners of small repair shops lose hours each week moving bookings between separate tools",
  segment: "Independent repair shops with a few employees",
};

const icp = {
  venture: "inbound-fixture",
  id: "shop-owner",
  who: "Owners of independent repair shops",
  jobs: ["See the week's bookings in one place"],
  primary: true,
};

const product = {
  id: "offer",
  name: "Fixture offer",
  description: "One place for a shop's bookings",
  offered_to: ["shop-owner"],
  market: { customer: "b2b", relationship: "customer", segment: "repair shops" },
};

const brand = {
  version: "0",
  venture: "inbound-fixture",
  voice: { rules: [{ id: "no-disrupt", avoid: "disrupt", use: "change" }] },
};

const policy = {
  venture: "inbound-fixture",
  channels: [{
    id: "website",
    name: "Fixture site",
    kind: "website",
    rules: [{ content: "pages", approvers: ["founder"] }],
  }],
};

const sitemap = {
  version: "0",
  venture: "inbound-fixture",
  facts: {},
  offerings: [{ id: "offer", offering: "product", offered_to: ["shop-owner"] }],
  audience: { offered_to: ["shop-owner"], partner_led: false, types: [] },
  pages: [
    {
      path: "/",
      parent: null,
      label: "Home",
      type: "home",
      level: "home",
      sections: [{
        item: "problem",
        component: "Section",
        need: 1,
        for: ["customers"],
        why: ["sitemap hint, not an ICP id"],
        source: { record: "validation-problem", file: "foundation/problem.json" },
        variant: "operations/marketing/content/home/problem.mdx",
      }],
    },
    {
      path: "/guide",
      parent: "/",
      label: "Guide",
      type: "guide",
      level: "linked",
      sections: [{
        item: "approaches",
        component: "Section",
        need: 0.5,
        for: ["customers"],
        why: ["compare approaches"],
        source: { record: "product", file: "product/offer.json" },
        variant: "operations/marketing/content/guide/approaches.mdx",
      }],
    },
  ],
  omitted: [],
  handoff: { to: "engineering" },
};

const GOOD = "A shop owner can see the week on one page.";

function mdx(fields, body) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) lines.push(`${k}: ${v}`);
  lines.push("---", "", body, "");
  return lines.join("\n");
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = Object.fromEntries(m[1].split("\n").map((l) => l.match(/^([a-z_]+):\s*(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.trim()]));
  if (meta.publish) meta.publish = meta.publish === "true";
  return { meta, body: m[2] };
}

function writeJson(dir, rel, value) {
  const p = join(dir, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, JSON.stringify(value, null, 2));
}

function build(dir, opt = {}) {
  writeJson(dir, "venture.json", ventureJson);
  if (opt.sitemap !== false) writeJson(dir, "marketing/sitemap.json", sitemap);
  if (opt.icp !== false) writeJson(dir, `foundation/icp/${icp.id}.json`, icp);
  if (opt.problem !== false) writeJson(dir, "foundation/problem.json", problem);
  if (opt.product !== false) writeJson(dir, "product/offer.json", product);
  if (opt.brand !== false) writeJson(dir, "marketing/brand.json", brand);
  if (opt.policy !== false) writeJson(dir, "governance/publication-policy.json", policy);
  const folder = opt.folder ?? "operations/marketing/content";
  const drafts = opt.drafts ?? "good";
  if (drafts === "none") return;
  const home = {
    variant_of: "foundation/problem.json",
    audience: "shop-owner",
    publish: false,
    page: "/",
    stage: "awareness",
    flywheel: "attract",
    pillar: true,
    links_to: "",
    gated: false,
  };
  const guide = {
    variant_of: "product/offer.json",
    audience: "shop-owner",
    publish: false,
    page: "/guide",
    stage: "consideration",
    flywheel: "engage",
    pillar: false,
    links_to: "/",
    gated: false,
  };
  let homeBody = GOOD;
  let guideBody = "This page lines up two ways to keep a shop's week.";
  if (drafts === "bad-audience") home.audience = "customers";
  if (drafts === "bad-stage") home.stage = "conversion";
  if (drafts === "missing-page") {
    writeFile(dir, `${folder}/home/problem.mdx`, mdx(home, homeBody));
    return;
  }
  if (drafts === "published-no-approver") home.publish = true;
  if (drafts === "published-stranger") { home.publish = true; home.approved_by = "campaign-bot"; }
  if (drafts === "published-founder") { home.publish = true; home.approved_by = "founder"; }
  if (drafts === "voice") homeBody = "This page will disrupt the old booking desk.";
  if (drafts === "no-pillar") home.pillar = false;
  if (drafts === "two-pillars") guide.pillar = true;
  if (drafts === "gated") home.gated = true;
  if (drafts === "private-pillar") {
    writeFile(dir, "operations/marketing/content/_private/pillar.mdx", mdx(home, homeBody));
    writeFile(dir, `${folder}/guide/approaches.mdx`, mdx(guide, guideBody));
    return;
  }
  writeFile(dir, `${folder}/home/problem.mdx`, mdx(home, homeBody));
  writeFile(dir, `${folder}/guide/approaches.mdx`, mdx(guide, guideBody));
}

function writeFile(dir, rel, text) {
  const p = join(dir, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, text);
}

function workspace() {
  const ws = mkdtempSync(join(tmpdir(), "inbound-replay-"));
  const dir = join(ws, "ventures", "inbound-fixture");
  mkdirSync(dir, { recursive: true });
  return { ws, dir };
}

async function read(ws, route) {
  return call({ venture: "inbound-fixture", route, action: "read", workspace: ws, via: "replay", actor: "agent" });
}
async function run(ws, route) {
  return call({ venture: "inbound-fixture", route, action: "run", workspace: ws, via: "replay", actor: "agent" });
}

function contentFiles(res) {
  if (!res?.ok || res.result == null) return [];
  if (typeof res.result === "string") return [{ path: res.source?.address ?? res.source?.path ?? "", text: res.result }];
  return Object.entries(res.result).filter(([, text]) => typeof text === "string").map(([path, text]) => ({ path, text }));
}

function pagePaths(sitemapRes) {
  const pages = sitemapRes?.result?.pages ?? [];
  return pages.map((p) => p.path);
}

function checkCovered(sitemapRes, contentRes) {
  const pages = pagePaths(sitemapRes);
  const got = new Set(contentFiles(contentRes).map((f) => frontmatter(f.text).meta.page));
  const missing = pages.filter((p) => !got.has(p));
  return { ok: pages.length > 0 && missing.length === 0, missing, pages };
}

function checkAudience(icpRes, contentRes) {
  const ids = new Set(Object.keys(icpRes?.result ?? {}));
  const bad = contentFiles(contentRes).filter((f) => !ids.has(frontmatter(f.text).meta.audience));
  return { ok: contentFiles(contentRes).length > 0 && bad.length === 0, bad: bad.map((f) => frontmatter(f.text).meta.audience) };
}

function checkStage(contentRes) {
  const bad = contentFiles(contentRes).filter((f) => {
    const m = frontmatter(f.text).meta;
    return !STAGES.has(m.stage) || !FLYWHEELS.has(m.flywheel);
  });
  return { ok: contentFiles(contentRes).length > 0 && bad.length === 0, bad: bad.map((f) => frontmatter(f.text).meta.stage) };
}

function checkPillar(contentRes) {
  const files = contentFiles(contentRes).map((f) => ({ ...f, meta: frontmatter(f.text).meta }));
  const pillars = files.filter((f) => f.meta.pillar === "true");
  const hidden = files.some((f) => f.path.includes("/_private/"));
  const gated = pillars.some((f) => f.meta.gated === "true");
  const links = files.filter((f) => f.meta.pillar !== "true").every((f) => f.meta.links_to === "/");
  return { ok: pillars.length === 1 && !hidden && !gated && links, pillars: pillars.length, gated, hidden };
}

function gateReport(res) {
  if (res.ok) return res.result ?? {};
  try { return JSON.parse(res.error); } catch { return { files: null, errors: [], raw: res.error }; }
}

function checkApprover(policyRes, contentRes) {
  const approvers = new Set((policyRes?.result?.channels ?? []).flatMap((c) => (c.rules ?? []).flatMap((r) => r.approvers ?? [])));
  const published = contentFiles(contentRes).map((f) => frontmatter(f.text).meta).filter((m) => m.publish === true);
  const bad = published.filter((m) => !approvers.has(m.approved_by));
  return { ok: bad.length === 0, published: published.length, bad: bad.map((m) => m.approved_by ?? "") };
}

async function withVenture(opt, fn) {
  const { ws, dir } = workspace();
  try {
    build(dir, opt);
    return await fn(ws, dir);
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

const table = new Set(routes().map((r) => r.route));
for (const route of NAMED) {
  note("route exists", "present", table.has(route), route);
}

const contentRoute = routes().find((r) => r.route === "marketing/content");
note(
  "content route has no write",
  "write absent",
  contentRoute && !contentRoute.actions.includes("write") && contentRoute.actions.includes("read"),
  `actions: ${(contentRoute?.actions ?? []).join(", ")}`,
);

await withVenture({ drafts: "none" }, async (ws, dir) => {
  const sitemapRes = await read(ws, "marketing/sitemap");
  const icpRes = await read(ws, "foundation/icp");
  const problemRes = await read(ws, "foundation/problem");
  const inputs = await run(ws, "marketing/design-system/inputs");
  const list = await read(ws, "product");
  const id = list.ok && list.result ? Object.keys(list.result)[0] : null;
  const item = id ? await read(ws, `product/${id}`) : { ok: false, error: "no product id" };
  const voiceBefore = await run(ws, "marketing/voice");
  const policyRes = await read(ws, "governance/publication-policy");
  build(dir, { drafts: "good" });
  const contentRes = await read(ws, "marketing/content");
  const voice = await run(ws, "marketing/voice");
  const gate = await run(ws, "operations/marketing/public");
  const write = await call({ venture: "inbound-fixture", route: "marketing/content", action: "write", workspace: ws, via: "replay", actor: "agent", input: {} });

  note("main path sitemap", "2 pages", sitemapRes.ok && sitemapRes.result?.pages?.length === 2, `${sitemapRes.result?.pages?.length ?? 0} pages`);
  note("main path icp", "shop-owner", icpRes.ok && Object.keys(icpRes.result ?? {}).join() === "shop-owner", Object.keys(icpRes.result ?? {}).join() || (icpRes.not_found?.note ?? icpRes.error));
  note("main path problem", "statement", problemRes.ok && typeof problemRes.result?.statement === "string", problemRes.ok ? "statement present" : (problemRes.not_found?.note ?? problemRes.error));
  note("main path inputs", "icp:shop-owner and problem", inputs.ok && inputs.result?.["icp:shop-owner"] && inputs.result?.problem, inputs.ok ? Object.keys(inputs.result).sort().join(", ") : inputs.error);
  note("main path product list", "offer", id === "offer", id ?? list.error);
  note("main path product item", "offer", item.ok && item.result?.id === "offer", item.result?.id ?? item.error);
  note("main path voice before drafts", "runs", voiceBefore.ok, voiceBefore.ok ? `${voiceBefore.result?.files ?? 0} files` : voiceBefore.error);
  note("main path policy", "founder", policyRes.ok && policyRes.result?.channels?.[0]?.rules?.[0]?.approvers?.[0] === "founder", policyRes.result?.channels?.[0]?.rules?.[0]?.approvers?.join(", ") ?? policyRes.error);
  const covered = checkCovered(sitemapRes, contentRes);
  note("check pages covered", "pass", covered.ok, covered.ok ? covered.pages.join(", ") : `missing ${covered.missing.join(", ")}`);
  note("check known audience", "pass", checkAudience(icpRes, contentRes).ok, "audience shop-owner");
  note("check stage named", "pass", checkStage(contentRes).ok, "awareness and consideration");
  const gateBody = gateReport(gate);
  const gateFiles = gateBody.files ?? 0;
  const gateErrors = gateBody.errors?.length ?? -1;
  note("check public gate", "pass", gate.ok && gateFiles === 2 && gateErrors === 0, `${gateFiles} files, ${gateErrors} errors`);
  note("check voice", "pass", voice.ok && (voice.result?.violations?.length ?? 1) === 0, `${voice.result?.violations?.length ?? "?"} violations`);
  note("check pillar", "pass", checkPillar(contentRes).ok, `pillars ${checkPillar(contentRes).pillars}`);
  note("check approver", "pass", checkApprover(policyRes, contentRes).ok, "nothing published");
  note("router refuses content write", "no write action", write.ok === false && /no action write/.test(write.error ?? ""), write.error ?? "write succeeded");
});

await withVenture({ sitemap: false, drafts: "none" }, async (ws) => {
  const sitemapRes = await read(ws, "marketing/sitemap");
  note("missing sitemap", "not found, stop", sitemapRes.ok && sitemapRes.result === null && !!sitemapRes.not_found, sitemapRes.not_found?.note ?? sitemapRes.error ?? "returned a record");
});

await withVenture({ icp: false, drafts: "none" }, async (ws) => {
  const sitemapRes = await read(ws, "marketing/sitemap");
  const icpRes = await read(ws, "foundation/icp");
  note("missing icp", "not found, no invented profile", sitemapRes.ok && sitemapRes.result?.pages?.length === 2 && icpRes.result === null && !!icpRes.not_found, icpRes.not_found?.note ?? "profile was returned");
});

await withVenture({ brand: false, drafts: "good" }, async (ws) => {
  const voice = await run(ws, "marketing/voice");
  note("voice with no brand", "runs, no rule broken", voice.ok && (voice.result?.violations?.length ?? 1) === 0, voice.ok ? `${voice.result.files} files` : voice.error);
});

async function failCase(name, opt, expect, pred) {
  await withVenture(opt, async (ws) => {
    const detail = await pred(ws);
    note(name, expect, detail.ok, detail.detail);
  });
}

await failCase("check pages covered", { drafts: "missing-page" }, "fail", async (ws) => {
  const covered = checkCovered(await read(ws, "marketing/sitemap"), await read(ws, "marketing/content"));
  return { ok: !covered.ok && covered.missing.includes("/guide"), detail: `missing ${covered.missing.join(", ") || "nothing"}` };
});

await failCase("check known audience", { drafts: "bad-audience" }, "fail", async (ws) => {
  const audience = checkAudience(await read(ws, "foundation/icp"), await read(ws, "marketing/content"));
  return { ok: !audience.ok && audience.bad.includes("customers"), detail: `bad ${audience.bad.join(", ") || "none"}` };
});

await failCase("check stage named", { drafts: "bad-stage" }, "fail", async (ws) => {
  const stage = checkStage(await read(ws, "marketing/content"));
  return { ok: !stage.ok && stage.bad.includes("conversion"), detail: `bad ${stage.bad.join(", ") || "none"}` };
});

await failCase("check public gate", { drafts: "published-no-approver" }, "fail", async (ws) => {
  const gate = await run(ws, "operations/marketing/public");
  const body = gateReport(gate);
  const messages = (body.errors ?? []).flatMap((e) => e.errors ?? []);
  return { ok: gate.ok === false && messages.some((m) => /approved_by/.test(m)), detail: messages[0] ?? gate.error ?? "gate passed" };
});

await failCase("check public gate zero files", { folder: "marketing/content" }, "fail", async (ws) => {
  const gate = await run(ws, "operations/marketing/public");
  const content = await read(ws, "marketing/content");
  const seen = contentFiles(content).length;
  const files = gateReport(gate).files;
  return { ok: gate.ok && files === 0 && seen === 2, detail: `gate files ${files}, content read ${seen}` };
});

await failCase("check voice", { drafts: "voice" }, "fail", async (ws) => {
  const voice = await run(ws, "marketing/voice");
  const found = voice.result?.violations?.map((v) => v.found) ?? [];
  return { ok: voice.ok && found.some((f) => /disrupt/i.test(f)), detail: found.join(", ") || voice.error || "no violation" };
});

await failCase("check pillar none", { drafts: "no-pillar" }, "fail", async (ws) => {
  const pillar = checkPillar(await read(ws, "marketing/content"));
  return { ok: !pillar.ok && pillar.pillars === 0, detail: `pillars ${pillar.pillars}` };
});

await failCase("check pillar gated", { drafts: "gated" }, "fail", async (ws) => {
  const pillar = checkPillar(await read(ws, "marketing/content"));
  return { ok: !pillar.ok && pillar.gated, detail: `gated ${pillar.gated}` };
});

await failCase("check pillar hidden", { drafts: "private-pillar" }, "fail", async (ws) => {
  const content = await read(ws, "marketing/content");
  const paths = contentFiles(content).map((f) => f.path);
  const pillar = checkPillar(content);
  return { ok: !paths.some((p) => p.includes("_private")) && !pillar.ok, detail: paths.join(", ") || "no files" };
});

await failCase("check approver", { drafts: "published-stranger" }, "fail", async (ws) => {
  const gate = await run(ws, "operations/marketing/public");
  const approver = checkApprover(await read(ws, "governance/publication-policy"), await read(ws, "marketing/content"));
  const errors = gateReport(gate).errors?.length;
  return { ok: gate.ok && errors === 0 && !approver.ok && approver.bad.includes("campaign-bot"), detail: `gate errors ${errors}, approver ${approver.bad.join(", ")}` };
});

await failCase("check approver on the policy", { drafts: "published-founder" }, "pass", async (ws) => {
  const gate = await run(ws, "operations/marketing/public");
  const approver = checkApprover(await read(ws, "governance/publication-policy"), await read(ws, "marketing/content"));
  const errors = gateReport(gate).errors?.length;
  return { ok: gate.ok && errors === 0 && approver.ok && approver.published === 1, detail: "approved_by founder" };
});

const failed = rows.filter((r) => !r.ok);
console.log(`${rows.length - failed.length}/${rows.length} replay rows passed`);
if (failed.length) process.exit(1);
