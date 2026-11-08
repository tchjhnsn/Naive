// The seam sensors (docs/design/LEAD_AGENTS_2026-11-08.md, "Seam detectors", build plan item 6). A seam is where two
// functions' records should agree and can drift. Each seam is a detector (docs/design/SIGNAL_DETECTION_2026-11-07.md)
// whose sensor is a small check here: a pure function over the records of both functions that scores each subject (a
// record on either side) by how many ways it disagrees with the other side. No model, no network, no write.
//
//   node packages/naive/src/checks/check-seams.ts <venture dir> [--json]
//
// Built, one seam:
//   seam-tools-spend (it and finance): IT's connection records (it/connections/<id>.json) against the spend register
//   (finance/spend/<id>.json). A connection scores one when it is connected and no active spend line pays for it
//   (names it in connection). An active spend line scores one when it names a connection that does not exist or is
//   disconnected, and one more when its approval names no connection record, the IT record the access matrix makes
//   the system of record for approval. A cancelled or cancel-requested line and a planned or disconnected connection
//   score nothing for being unpaid.
//
// Not built, each because a record it compares has no record type or no field yet: NOT_BUILT below.
//
// The command prints each subject that disagrees and exits 0: drift is a call for a lead, not a failure. It exits 1
// only when a record cannot be read as JSON with a string id, and 2 on a bad argument. The calls, trials and decisions
// are packages/naive/src/router/orchestration/seams.ts.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { ventureFile } from "../core/venture-paths.mjs";
import type { Connection, SpendRegister } from "../records/types/records.d.ts";

export type FindingCode = "unpaid-connection" | "missing-connection" | "disconnected-connection" | "unapproved-spend";
export type Finding = { code: FindingCode; text: string };
/** One record on either side of a seam, scored: the number of findings is its score. */
export type Subject = { kind: string; id: string; record: string; path: string; score: number; findings: Finding[] };
export type ConnectionFacts = Pick<Connection, "id" | "status">;
export type SpendFacts = Pick<SpendRegister, "id" | "status" | "connection" | "approval">;
export type Seam = {
  /** The detector id, governance/detectors/<id>.json. */
  detector: string;
  title: string;
  functions: [string, string];
  /** The venture folders the sensor reads, one per side. */
  reads: string[];
  /** Reads the records from a venture folder and scores every subject. */
  sense: (dir: string) => { subjects: Subject[]; problems: string[] };
};

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * Tools against spend: every connection and every spend line, each with its findings. Pure.
 * @param connections IT's connection records (id and status are read)
 * @param spend the spend register's lines (id, status, connection and approval are read)
 */
export function toolsAgainstSpend(connections: readonly ConnectionFacts[], spend: readonly SpendFacts[]): Subject[] {
  const byId = new Map(connections.map((c) => [c.id, c]));
  const active = spend.filter((s) => s.status === "active");
  const out: Subject[] = [];
  for (const c of connections) {
    const findings: Finding[] = [];
    const status = c.status ?? "planned";
    if (status === "connected" && !active.some((s) => s.connection === c.id)) {
      findings.push({ code: "unpaid-connection", text: `connection ${c.id} is connected, but no active spend line names it in connection` });
    }
    out.push({ kind: "connection", id: c.id, record: "connection", path: `it/connections/${c.id}.json`, score: findings.length, findings });
  }
  for (const s of spend) {
    const findings: Finding[] = [];
    if (s.status === "active") {
      const c = s.connection ? byId.get(s.connection) : undefined;
      if (s.connection && !c) findings.push({ code: "missing-connection", text: `spend line ${s.id} pays for connection ${s.connection}, which has no record in it/connections` });
      else if (c && (c.status ?? "planned") === "disconnected") findings.push({ code: "disconnected-connection", text: `spend line ${s.id} is active, but connection ${c.id} is disconnected` });
      if (!s.approval) findings.push({ code: "unapproved-spend", text: `spend line ${s.id} is active and cites no approval from an IT record` });
      else if (!byId.has(s.approval)) findings.push({ code: "unapproved-spend", text: `spend line ${s.id} cites approval ${s.approval}, which is not a connection record in it/connections` });
    }
    out.push({ kind: "spend", id: s.id, record: "spend-register", path: `finance/spend/${s.id}.json`, score: findings.length, findings });
  }
  return out;
}

/** Every record in one venture folder (<folder>/<id>.json), read through ventureFile so a structured venture works. */
export function recordsIn(dir: string, folder: string): { records: Record<string, unknown>[]; problems: string[] } {
  const at = ventureFile(dir, folder);
  if (!existsSync(at)) return { records: [], problems: [] };
  const records: Record<string, unknown>[] = [], problems: string[] = [];
  for (const f of readdirSync(at).filter((n) => n.endsWith(".json")).sort()) {
    try {
      const r: unknown = JSON.parse(readFileSync(`${at}/${f}`, "utf8"));
      if (isObj(r) && typeof r.id === "string") records.push(r);
      else problems.push(`${folder}/${f}: not a record with a string id`);
    } catch (e) { problems.push(`${folder}/${f}: not JSON (${e instanceof Error ? e.message : String(e)})`); }
  }
  return { records, problems };
}

const str = (x: unknown): string | undefined => (typeof x === "string" ? x : undefined);

/** The seams that are built, by detector id. */
export const SEAMS: readonly Seam[] = [
  {
    detector: "seam-tools-spend",
    title: "Tools against spend",
    functions: ["it", "finance"],
    reads: ["it/connections", "finance/spend"],
    sense(dir) {
      const c = recordsIn(dir, "it/connections"), s = recordsIn(dir, "finance/spend");
      const connections = c.records.map((r) => ({ id: String(r.id), status: str(r.status) as ConnectionFacts["status"] }));
      const spend = s.records.map((r) => ({ id: String(r.id), status: str(r.status) as SpendFacts["status"], connection: str(r.connection), approval: str(r.approval) }));
      return { subjects: toolsAgainstSpend(connections, spend), problems: [...c.problems, ...s.problems] };
    },
  },
];

/** The seams the lead agents design names that are not built, and the record or field each one is missing. */
export const NOT_BUILT: readonly { seam: string; functions: [string, string]; lead: string; missing: string }[] = [
  { seam: "Headcount against runway", functions: ["human-capital", "finance"], lead: "finance-lead", missing: "a cost per role in the team plan (people/team-plan has open roles and money/_summary has runway_months, but no record says what an open role costs)" },
  { seam: "Discounts against the price", functions: ["marketing-and-sales", "finance"], lead: "finance-lead", missing: "a sales deal record with its discount, to compare with validation-pricing (deals/<id>.json is a fund's investment pipeline, not a sales deal)" },
  { seam: "Promised against planned", functions: ["marketing-and-sales", "products"], lead: "growth-lead or product-lead, by measure", missing: "a sales deal record with its promises, and a product roadmap record" },
  { seam: "Pipeline against focus", functions: ["marketing-and-sales", "strategy"], lead: "strategy-lead", missing: "a sales deal record with its segment, to compare with the ICP primary" },
  { seam: "Claims against approved claims", functions: ["marketing-and-sales", "risk-and-compliance"], lead: "growth-lead", missing: "an approved claims record" },
];

/** Scores every built seam for one venture. */
export function sense(dir: string): { seam: Seam; subjects: Subject[]; problems: string[] }[] {
  return SEAMS.map((seam) => ({ seam, ...seam.sense(dir) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir || !existsSync(`${dir}/venture.json`)) {
    console.error("usage: node packages/naive/src/checks/check-seams.ts <venture dir> [--json]");
    process.exit(2);
  }
  const out = sense(dir);
  const problems = out.flatMap((s) => s.problems);
  if (args.includes("--json")) {
    console.log(JSON.stringify({ seams: out.map((s) => ({ detector: s.seam.detector, functions: s.seam.functions, subjects: s.subjects.filter((x) => x.score > 0), clean: s.subjects.filter((x) => x.score === 0).length, problems: s.problems })), not_built: NOT_BUILT }, null, 2));
  } else {
    for (const s of out) {
      const drift = s.subjects.filter((x) => x.score > 0);
      console.log(`${s.seam.detector} (${s.seam.functions.join(" and ")}): ${drift.length} disagree, ${s.subjects.length - drift.length} clean`);
      for (const x of drift) for (const f of x.findings) console.log(`  ${x.path}: ${f.text}`);
      for (const p of s.problems) console.log(`  problem: ${p}`);
    }
    for (const n of NOT_BUILT) console.log(`not built: ${n.seam} (${n.functions.join(" and ")}): missing ${n.missing}`);
  }
  process.exit(problems.length ? 1 : 0);
}
