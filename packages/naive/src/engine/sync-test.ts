// Tests offline sync end to end (packages/naive/src/engine/sync.ts, EE-178, docs/design/OFFLINE_SYNC_2026-11-25.md)
// against a stand-in business store written below with node:http, which implements the sync contract: device
// sign-in, changes since a point, an all-or-none push with base versions, and files by sha256.
//
// Two working copies of one business, as a founder's laptop and a second machine:
//   link       the device flow prints a code, polls at the host's interval, honours slow_down, and keeps the
//              token outside the business folder with mode 0600
//   pull       the store's records land, the sync point moves, and the base of each record is kept
//   offline    both copies edit the same record, one field the same way and one differently
//   push       the first copy's push is accepted
//   409        the second copy's push is refused whole, pulls, merges and is accepted on the retry
//   conflict   the one same-field change is an open decision holding both values; the record keeps the store's
//   files      a file a record names by hash travels once, by hash, in both directions
//   rerun      a pull after a pull writes no file, no provenance line and no state
// and the rules: a private record, a log, a derived file and a .env file never leave the working copy, and every
// command is refused in hosted mode.
//
//   node packages/naive/src/engine/sync-test.ts

import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blobHash, hasBlob, readBlob, writeBlob } from "../core/blobs.ts";
import { pathKind } from "../records/index.ts";
import { entries } from "../core/provenance.ts";
import { HostedRefusal } from "../core/runtime.ts";
import type { Json } from "./merge.ts";
import {
  link, localChanges, provenanceToSend, pull, push, readState, status, syncable, syncablePaths,
  type Http, type PushBody, type SyncState,
} from "./sync.ts";
import { accountFor, credentialsFile, keychainCli, SERVICE } from "./sync-credentials.ts";
import { glob as routeGlob, routes, type RecordRoute } from "../records/routes/routes.ts";

// The store writes every accepted change through its own router, so it refuses a path no record route takes
// writes for. It reads the route table itself, as the real host does, rather than asking the client's filter.
const takesWrites = routes().filter((r): r is RecordRoute => r.kind === "record" && r.actions.includes("write")).flatMap((r) => (r.files ?? []).map(routeGlob));
const routed = (path: string): boolean => takesWrites.some((re) => re.test(path));

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail?: unknown) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Everything this test writes lives under one temporary folder, the credentials file included, so it never
// touches the person's keychain or config.
const root = mkdtempSync(join(tmpdir(), "sync-test-"));
process.env.NAIVE_CONFIG_HOME = join(root, "config");
process.env.NAIVE_CREDENTIALS = "file";
delete process.env.NAIVE_RUNTIME;

// ---------------------------------------------------------------------------------------------------------------
// The stand-in business store.
// ---------------------------------------------------------------------------------------------------------------

type Row = { path: string; version: string; content: Json | null; sha256: string | null; by: string; at: string; seq: number };
type Device = { business: string | null; polls: number };

const text = (c: Json): string => JSON.stringify(c, null, 2) + "\n";

class Store {
  rows = new Map<string, Row>();
  files = new Map<string, Buffer>();
  tokens = new Map<string, string>();
  devices = new Map<string, Device>();
  pushes: PushBody[] = [];
  /** The store's head at each push it refused, so a test can prove a refused push wrote nothing. */
  refusedAt: number[] = [];
  seq = 0;
  interval = 1;
  issued = 0;

  seed(path: string, content: Json, by = "founder"): Row {
    this.seq += 1;
    const row: Row = { path, version: `v${this.seq}`, content, sha256: blobHash(text(content)), by, at: new Date().toISOString(), seq: this.seq };
    this.rows.set(path, row);
    return row;
  }
}

/** The store's HTTP face: the sync contract, and nothing else. */
function serve(store: Store): Promise<{ origin: string; close: () => Promise<void> }> {
  const body = (req: IncomingMessage): Promise<Buffer> => new Promise((ok) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => ok(Buffer.concat(chunks)));
  });
  const send = (res: ServerResponse, status: number, value: unknown) => {
    const out = Buffer.from(JSON.stringify(value));
    res.writeHead(status, { "content-type": "application/json", "content-length": String(out.length) });
    res.end(out);
  };
  const business = (req: IncomingMessage): string | null => {
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    return store.tokens.get(token) ?? null;
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;
    try {
      if (path === "/api/naive/device/code" && req.method === "POST") {
        const asked: unknown = JSON.parse((await body(req)).toString("utf8") || "{}");
        const named = asked && typeof asked === "object" && "business" in asked ? (asked as { business?: string | null }).business ?? null : null;
        const device_code = `dc-${store.devices.size + 1}`;
        store.devices.set(device_code, { business: named, polls: 0 });
        return send(res, 200, {
          device_code, user_code: "WXYZ-1234", verification_uri: `${url.origin}/device`,
          verification_uri_complete: `${url.origin}/device?code=WXYZ-1234`, expires_in: 900, interval: store.interval,
        });
      }
      if (path === "/api/naive/device/token" && req.method === "POST") {
        const asked: unknown = JSON.parse((await body(req)).toString("utf8") || "{}");
        const code = asked && typeof asked === "object" ? (asked as { device_code?: string }).device_code ?? "" : "";
        const device = store.devices.get(code);
        if (!device) return send(res, 400, { error: "expired_token" });
        device.polls += 1;
        // The person is still at their browser on the first poll, and the host asks for more space on the second.
        if (device.polls === 1) return send(res, 400, { error: "authorization_pending" });
        if (device.polls === 2) return send(res, 400, { error: "slow_down" });
        store.issued += 1;
        const token = `tok-${store.issued}`;
        const id = device.business ?? "lumen";
        store.tokens.set(token, id);
        return send(res, 200, { access_token: token, token_type: "Bearer", business: id, expires_in: 3600 });
      }

      const who = business(req);
      if (!who) return send(res, 401, { error: "unauthorized" });

      if (path === "/api/naive/sync/changes" && req.method === "GET") {
        const since = Number(url.searchParams.get("since") ?? 0);
        const records = [...store.rows.values()].filter((r) => r.seq > since).sort((a, b) => a.seq - b.seq)
          .map((r) => ({ path: r.path, version: r.version, sha256: r.sha256, content: r.content, by: r.by, at: r.at }));
        return send(res, 200, { business: who, point: String(store.seq), records });
      }
      if (path === "/api/naive/sync/push" && req.method === "POST") {
        const asked = JSON.parse((await body(req)).toString("utf8")) as PushBody;
        store.pushes.push(asked);
        const unrouted = asked.changes.filter((c) => !routed(c.path));
        if (unrouted.length) return send(res, 422, { error: `no record route takes writes for ${unrouted.map((c) => c.path).join(", ")}` });
        const stale = asked.changes.flatMap((c) => {
          const cur = store.rows.get(c.path);
          return (cur?.version ?? null) === (c.base ?? null) ? [] : [{ path: c.path, current: cur?.version ?? "none" }];
        });
        // All or none: one stale base and nothing is written.
        if (stale.length) { store.refusedAt.push(store.seq); return send(res, 409, { error: "stale", stale }); }
        const before = String(store.seq);
        const accepted = asked.changes.map((c) => {
          store.seq += 1;
          const row: Row = {
            path: c.path, version: `v${store.seq}`, content: c.content,
            sha256: c.content === null ? null : blobHash(text(c.content)),
            by: asked.working_copy, at: new Date().toISOString(), seq: store.seq,
          };
          store.rows.set(c.path, row);
          return { path: c.path, version: row.version };
        });
        return send(res, 200, { point: before, accepted });
      }
      if (path === "/api/naive/sync/files/missing" && req.method === "POST") {
        const asked = JSON.parse((await body(req)).toString("utf8")) as { hashes?: string[] };
        return send(res, 200, { missing: (asked.hashes ?? []).filter((h) => !store.files.has(h)) });
      }
      const file = /^\/api\/naive\/sync\/files\/([0-9a-f]{64})$/.exec(path);
      if (file && req.method === "PUT") {
        const bytes = await body(req);
        const sha = file[1] as string;
        if (blobHash(bytes) !== sha) return send(res, 400, { error: "the bytes do not hash to that name" });
        store.files.set(sha, bytes);
        return send(res, 200, { stored: sha });
      }
      if (file && req.method === "GET") {
        const bytes = store.files.get(file[1] as string);
        if (!bytes) return send(res, 404, { error: "no such file" });
        res.writeHead(200, { "content-type": "application/octet-stream", "content-length": String(bytes.length) });
        return res.end(bytes);
      }
      return send(res, 404, { error: "no such route" });
    } catch (e) {
      return send(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
  });

  return new Promise((ok) => server.listen(0, "127.0.0.1", () => {
    const { port } = server.address() as AddressInfo;
    ok({ origin: `http://127.0.0.1:${port}`, close: () => new Promise<void>((done) => server.close(() => done())) });
  }));
}

// ---------------------------------------------------------------------------------------------------------------
// Two working copies of one business.
// ---------------------------------------------------------------------------------------------------------------

const VENTURE: Json = { id: "lumen", name: "Lumen", type: "software-startup", phase: "discovery" };
const PEOPLE: Json = { venture: "lumen", mode: "solo", people: [{ id: "founder", name: "Founder", role: "founder" }] };
const CONSTRAINTS = "foundation/constraints.json";

function workingCopy(name: string): string {
  const dir = join(root, name);
  mkdirSync(join(dir, "people"), { recursive: true });
  mkdirSync(join(dir, "foundation"), { recursive: true });
  writeFileSync(join(dir, "venture.json"), text(VENTURE));
  writeFileSync(join(dir, "people/people.json"), text(PEOPLE));
  return dir;
}

const read = (dir: string, path: string): Json => JSON.parse(readFileSync(join(dir, path), "utf8")) as Json;
const write = (dir: string, path: string, content: Json) => writeFileSync(join(dir, path), text(content));
const constraint = (c: Json, id: string): { [k: string]: Json } | undefined => {
  const list = (c as { must_not?: { id: string }[] }).must_not ?? [];
  return list.find((x) => x.id === id) as { [k: string]: Json } | undefined;
};
const openConflicts = (dir: string): string[] => status(dir).conflicts ?? [];

const store = new Store();
const { origin, close } = await serve(store);

try {
  // The business starts with one record, written by the founder in the browser.
  store.seed(CONSTRAINTS, { venture: "lumen", must_not: [{ id: "no-ads", statement: "never sell ads", source: "founder" }], updated: "2026-11-01" });

  // --- link: the device flow -------------------------------------------------------------------------------------
  const laptop = workingCopy("laptop");
  const desk = workingCopy("desk");
  const lines: string[] = [];
  const waits: number[] = [];
  const linked = await link(laptop, "lumen", {
    host: origin, log: (l) => lines.push(l), sleep: async (ms) => { waits.push(ms); },
  });
  expect("link prints the user code and the page to open", lines.some((l) => l.includes("WXYZ-1234") && l.includes("/device")), lines);
  expect("link polls at the host's interval and slows down when asked", eq(waits, [1000, 1000, 6000]), waits);
  expect("link names the business and a working copy of its own", linked.business === "lumen" && /^wc-[0-9a-f]{12}$/.test(linked.working_copy), linked);
  expect("the token is kept outside the business folder", !credentialsFile().startsWith(laptop) && existsSync(credentialsFile()));
  expect("the credentials file is readable only by its owner", (statSync(credentialsFile()).mode & 0o777) === 0o600, (statSync(credentialsFile()).mode & 0o777).toString(8));
  expect("no token is written into the working copy", !syncablePaths(laptop).some((p) => readFileSync(join(laptop, p), "utf8").includes("tok-")));
  expect("the sync state names the host, the business and no point yet", eq({ ...readState(laptop), working_copy: "", bases: {} }, { host: origin, business: "lumen", working_copy: "", point: null, bases: {}, provenance_pushed: undefined }), readState(laptop));

  await link(desk, "lumen", { host: origin, log: () => {}, sleep: async () => {} });
  expect("each working copy gets its own id", readState(laptop)?.working_copy !== readState(desk)?.working_copy);

  // --- pull: the store's records land ---------------------------------------------------------------------------
  const first = await pull(laptop, {});
  expect("the first pull writes the store's record", first.written.some((w) => w.path === CONSTRAINTS && w.how === "store"), first.written);
  expect("the record on disk is the store's", eq(read(laptop, CONSTRAINTS), store.rows.get(CONSTRAINTS)?.content), read(laptop, CONSTRAINTS));
  expect("the sync point moved to the store's point", readState(laptop)?.point === String(store.seq), readState(laptop)?.point);
  const base = readState(laptop)?.bases[CONSTRAINTS];
  expect("the base version and the base bytes are kept", base?.version === "v1" && Boolean(base && readBlob(laptop, base.sha256)), base);
  await pull(desk, {});
  expect("the second working copy pulled the same record", eq(read(desk, CONSTRAINTS), read(laptop, CONSTRAINTS)));

  // --- offline: both copies edit, one field the same way and one differently -------------------------------------
  const onLaptop = read(laptop, CONSTRAINTS) as { [k: string]: Json };
  write(laptop, CONSTRAINTS, {
    ...onLaptop,
    must_not: [{ id: "no-ads", statement: "never sell advertising", source: "founder" }, { id: "no-tracking", statement: "never track a reader" }],
  });
  const onDesk = read(desk, CONSTRAINTS) as { [k: string]: Json };
  write(desk, CONSTRAINTS, {
    ...onDesk,
    must_not: [{ id: "no-ads", statement: "no advertising, ever", source: "founder" }],
    updated: "2026-11-25",
  });

  // What must never travel: a secret, a private record, a sensitive record, a log, a derived file, and the
  // records a working copy keeps for itself even though the data model calls them records.
  mkdirSync(join(laptop, "_private"), { recursive: true });
  writeFileSync(join(laptop, "_private/founder.json"), text({ private: true, id: "founder", name: "Founder" }));
  writeFileSync(join(laptop, ".env"), "NAIVE_TOKEN=not-a-real-token\n");
  mkdirSync(join(laptop, ".naive"), { recursive: true });
  writeFileSync(join(laptop, ".naive/triggers.json"), text({ triggers: [] }));
  mkdirSync(join(laptop, "money/_streams/bank"), { recursive: true });
  writeFileSync(join(laptop, "money/_streams/bank/stream.json"), text({ id: "bank", sensitive: true, summary: "the business bank feed" }));
  expect("a .env file is never syncable", !syncable(".env") && !syncable("foundation/.env.local"));
  expect("a log and a derived file are never syncable", !syncable("provenance.jsonl") && !syncable(".naive/sync.json") && !syncable(".naive/decision-index.json"));
  expect("a record the working copy keeps for itself is never syncable, whatever the data model calls it",
    !syncable(".naive/triggers.json") && !syncable(".naive/beta.json") && !syncable("_eval/abc/eval-set.json") && !syncable(".release/records.json"));
  const stream = "money/_streams/bank/stream.json";
  expect("a private folder is never syncable, and a sensitive record is a record the data model owns and still never travels",
    !syncable("_private/founder.json") && pathKind(stream) === "record" && !syncable(stream, read(laptop, stream)), pathKind(stream));
  expect("a file the data model does not name is never syncable", !syncable("package.json") && !syncable("notes/scratch.json"));
  expect("a record is syncable", syncable(CONSTRAINTS) && syncable("people/people.json") && syncable("money/transactions.json"));
  // The host writes each change through its own router, so a path no record route takes writes for would be
  // refused whole. The client reads the same route table and never sends one.
  expect("a record the route table does not take writes for is never syncable",
    !syncable("venture.json") && !syncable("foundation/decisions/sync-conflict-abc.decision.json") && syncable("decisions/d.decision.json"));

  // --- push: the first copy is accepted -------------------------------------------------------------------------
  const pointBefore = String(store.seq);
  const sent = await push(laptop, {});
  expect("the push was accepted with no retry", sent.retries === 0 && sent.pushed.some((p) => p.path === CONSTRAINTS), sent);
  expect("the host now holds the laptop's statement", constraint(store.rows.get(CONSTRAINTS)?.content as Json, "no-ads")?.statement === "never sell advertising");
  expect("the point the host answered is where the pull will start", sent.point === pointBefore, { got: sent.point, pointBefore });
  const headAfterLaptop = store.seq;
  expect("the base version of each accepted record moved", readState(laptop)?.bases[CONSTRAINTS]?.version === store.rows.get(CONSTRAINTS)?.version);
  const body = store.pushes.at(-1) as PushBody;
  expect("the push carried the base version of the record it changed", body.changes.find((c) => c.path === CONSTRAINTS)?.base === "v1", body.changes);
  expect("a record the store has never seen is pushed with no base", body.changes.find((c) => c.path === "people/people.json")?.base === null, body.changes);
  expect("the push sent no secret, no private or sensitive record, no log and nothing the working copy keeps for itself",
    !body.changes.some((c) => /\.env|_private|_streams|provenance\.jsonl|\.naive\/|_eval\//.test(c.path)) && !JSON.stringify(body).includes("not-a-real-token"), body.changes.map((c) => c.path));
  expect("the push carried the working copy's provenance, oldest first", body.provenance.length > 0
    && body.provenance.every((l, i) => i === 0 || Date.parse(l.at) >= Date.parse(body.provenance[i - 1]?.at ?? l.at))
    && body.provenance.every((l) => syncable(l.entity)), body.provenance.map((l) => l.entity));
  expect("a second push with nothing changed sends nothing, and asks the host nothing", (await push(laptop, {})).pushed.length === 0 && store.pushes.length === 1, store.pushes.length);

  // --- 409: the second copy is refused whole, pulls, merges and retries ------------------------------------------
  const retried = await push(desk, {});
  expect("the refused push pulled, merged and was accepted on the retry", retried.retries === 1 && retried.pushed.length > 0, retried);
  const refused = store.pushes.find((p) => p.working_copy === readState(desk)?.working_copy);
  expect("the refused push named the stale base", refused?.changes.find((c) => c.path === CONSTRAINTS)?.base === "v1", refused?.changes);
  expect("the refusal was whole: the store's head did not move for it",
    store.refusedAt.length === 1 && store.refusedAt[0] === headAfterLaptop, { refusedAt: store.refusedAt, headAfterLaptop });

  // --- the conflict is one open decision, and the record keeps the store's value ---------------------------------
  const conflicts = openConflicts(desk);
  expect("the one same-field change is one open decision", conflicts.length === 1, conflicts);
  const decision = read(desk, conflicts[0] as string) as { status?: string; note?: string; options?: Json; sync_conflict?: { file?: string; path?: string[]; local?: Json; store?: Json; base?: Json; working_copy?: string } };
  expect("the decision is open and names the field", decision.status === "open" && decision.sync_conflict?.file === CONSTRAINTS
    && eq(decision.sync_conflict?.path, ["must_not", "[id=no-ads]", "statement"]), decision.sync_conflict);
  expect("the decision holds both values and the base", decision.sync_conflict?.local === "no advertising, ever"
    && decision.sync_conflict?.store === "never sell advertising" && decision.sync_conflict?.base === "never sell ads", decision.sync_conflict);
  expect("the decision names the working copy the local value came from", decision.sync_conflict?.working_copy === readState(desk)?.working_copy, decision.sync_conflict?.working_copy);
  const merged = read(desk, CONSTRAINTS);
  expect("the record keeps the store's value for the conflicted field", constraint(merged, "no-ads")?.statement === "never sell advertising", merged);
  expect("the field only one side changed merged without asking", (merged as { updated?: string }).updated === "2026-11-25" && Boolean(constraint(merged, "no-tracking")), merged);
  expect("the merged record is what the store now holds", eq(store.rows.get(CONSTRAINTS)?.content, merged), store.rows.get(CONSTRAINTS)?.content);

  // The laptop pulls the merge down: its own copy is unchanged since its base, so this is a fast-forward.
  const back = await pull(laptop, {});
  expect("the other copy fast-forwards with no new conflict", back.conflicts.length === 0 && eq(read(laptop, CONSTRAINTS), merged), back);
  // A conflict decision sits in the venture's top-level decisions/, which a route takes, so it travels like any
  // other decision and a person can resolve it at either copy (EE-175).
  expect("the conflict decision travelled as a record", openConflicts(laptop).length === 1 && eq(openConflicts(laptop), openConflicts(desk)), { laptop: openConflicts(laptop), desk: openConflicts(desk) });

  // --- a file travels by hash, both ways ------------------------------------------------------------------------
  const bytes = Buffer.from("the founder's note on advertising\n");
  const sha = writeBlob(desk, bytes);
  const withFile = read(desk, CONSTRAINTS) as { [k: string]: Json };
  write(desk, CONSTRAINTS, { ...withFile, must_not: [...(withFile.must_not as Json[]), { id: "no-dark-patterns", statement: "never use a dark pattern", source: sha }] });
  const withFiles = await push(desk, {});
  expect("the push sent the file the record names, by hash", eq(withFiles.files, [sha]) && store.files.get(sha)?.equals(bytes), withFiles.files);
  expect("the laptop does not have that file yet", !hasBlob(laptop, sha));
  const down = await pull(laptop, {});
  expect("the pull copied the missing file down by hash", eq(down.files, [sha]) && readBlob(laptop, sha)?.equals(bytes), down.files);
  const again = await push(desk, {});
  expect("a file the host already has is not sent again", again.files.length === 0, again);
  // A host may answer a push with the store head as it was before the push, so a write that landed beside this
  // one is not skipped. The next pull then replays this copy's own records, where all three copies agree.
  const replay = await pull(desk, {});
  expect("a pull after a push replays this copy's own records and writes nothing",
    replay.written.length === 0 && replay.conflicts.length === 0 && replay.unchanged.includes(CONSTRAINTS), replay);

  // --- a pull after a pull writes nothing -----------------------------------------------------------------------
  const stateBefore = readFileSync(join(laptop, ".naive/sync.json"), "utf8");
  const recordBefore = readFileSync(join(laptop, CONSTRAINTS), "utf8");
  const linesBefore = entries(laptop).length;
  const rerun = await pull(laptop, {});
  expect("the rerun found nothing to write", rerun.written.length === 0 && rerun.conflicts.length === 0 && rerun.files.length === 0, rerun);
  expect("the rerun left the record, the state and the provenance log alone",
    readFileSync(join(laptop, CONSTRAINTS), "utf8") === recordBefore
    && readFileSync(join(laptop, ".naive/sync.json"), "utf8") === stateBefore
    && entries(laptop).length === linesBefore, { lines: entries(laptop).length, linesBefore });

  // --- status, the CLI, and the refusals ------------------------------------------------------------------------
  const s = status(laptop);
  expect("status says where this copy stands, with no network", s.linked && s.business === "lumen" && s.signed_in === true
    && s.point === String(store.seq) && (s.changed ?? []).length === 0, s);
  expect("status on a copy that was never linked says so", status(workingCopy("fresh")).linked === false);

  // The CLI runs in another process and talks to the server in this one, so it is never waited for with
  // spawnSync: that would block this process's event loop and the server could not answer.
  const run = (script: string, ...a: string[]): Promise<{ status: number; stdout: string; stderr: string }> => new Promise((ok) => {
    const child = spawn(process.execPath, [join(repo, script), ...a], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (c: Buffer) => { stdout += c.toString("utf8"); });
    child.stderr.on("data", (c: Buffer) => { stderr += c.toString("utf8"); });
    child.on("close", (code) => ok({ status: code ?? 1, stdout, stderr }));
  });
  const cli = (dir: string, ...a: string[]) => run("packages/naive/src/interfaces/cli/naive.ts", "sync", ...a, "--venture", dir);
  const ran = await cli(laptop, "status");
  expect("naive sync status runs the engine behind the CLI", ran.status === 0 && ran.stdout.includes("lumen") && ran.stdout.includes(origin), (ran.stdout + ran.stderr).trim());
  const badCommand = await cli(laptop, "fetch");
  expect("naive sync with no such command says what there is", badCommand.status === 2 && /link <business>/.test(badCommand.stderr), badCommand.stderr.trim());
  const json = await cli(laptop, "pull", "--json");
  expect("naive sync pull --json answers one JSON object", json.status === 0 && Array.isArray(JSON.parse(json.stdout).written), (json.stdout + json.stderr).slice(0, 300));

  // Every write a sync made is an ordinary line in the working copy's log, so the log still holds.
  const chain = await run("packages/naive/src/checks/check-provenance.ts", laptop);
  expect("the provenance log a sync wrote passes check-provenance", chain.status === 0 && /chain/.test(chain.stdout + chain.stderr), (chain.stdout + chain.stderr).trim().split("\n").slice(-3).join(" | "));

  // A token the host does not know is said plainly, and nothing is written.
  let refusedToken = "";
  try { await pull(laptop, { token: "tok-not-issued" }); } catch (e) { refusedToken = e instanceof Error ? e.message : String(e); }
  expect("an unknown token is refused with a line that says what to do", /refused this token/.test(refusedToken) && /naive sync link/.test(refusedToken), refusedToken);

  process.env.NAIVE_RUNTIME = "hosted";
  const hosted: string[] = [];
  for (const run of [() => pull(laptop, {}), () => push(laptop, {}), () => link(laptop, "lumen", { host: origin }), async () => status(laptop)]) {
    try { await run(); hosted.push("not refused"); } catch (e) { hosted.push(e instanceof HostedRefusal ? "refused" : `other: ${e instanceof Error ? e.message : String(e)}`); }
  }
  delete process.env.NAIVE_RUNTIME;
  expect("every sync command is refused in hosted mode", hosted.every((h) => h === "refused"), hosted);

  // A host that never approves, driven through the injectable HTTP client with no server and a clock of our own:
  // the client stops at the host's own expiry instead of polling for ever.
  let polls = 0, clock = 0;
  const stalling: Http = async (req) => req.url.endsWith("/device/code")
    ? { status: 200, body: Buffer.from(JSON.stringify({ device_code: "dc", user_code: "AAAA-BBBB", verification_uri: "https://example.test/device", expires_in: 10, interval: 1 })) }
    : (polls += 1, { status: 400, body: Buffer.from(JSON.stringify({ error: "slow_down" })) });
  let expired = "";
  try {
    await link(workingCopy("stalled"), "lumen", { host: "https://example.test", http: stalling, log: () => {}, sleep: async (ms) => { clock += ms; }, now: () => clock });
  } catch (e) { expired = e instanceof Error ? e.message : String(e); }
  expect("a sign-in that is never approved ends at the host's expiry and says to run link again",
    /expired before it was approved/.test(expired) && /naive sync link/.test(expired) && polls > 1, { expired, polls });

  // --- the pieces the flow above does not reach -----------------------------------------------------------------
  const darwin = keychainCli("darwin"), linux = keychainCli("linux");
  expect("macOS uses security and Linux secret-tool, under Naive's own service name",
    darwin?.cli === "security" && linux?.cli === "secret-tool" && darwin?.read("a").includes(SERVICE) && linux?.read("a").includes(SERVICE), { darwin: darwin?.cli, linux: linux?.cli });
  expect("the Linux recipe sends the token on standard input, never in the process list",
    linux?.write("a", "s3cret").input === "s3cret" && !JSON.stringify(linux?.write("a", "s3cret").args).includes("s3cret"), linux?.write("a", "s3cret"));
  expect("a platform with no keychain Naive knows falls back to the file", keychainCli("sunos") === null);
  expect("a token is filed under the business and the host", accountFor("https://example.test", "lumen") === "lumen@https://example.test");

  // A host that offers a path a working copy would never send is ignored, not written.
  store.seed("../escape.json", { bad: true });
  store.seed(".naive/decision-index.json", { bad: true });
  const guarded = await pull(laptop, {});
  expect("a pull writes nothing the push would refuse to send", guarded.skipped.length === 2 && guarded.written.length === 0
    && !existsSync(join(root, "escape.json")) && !existsSync(join(laptop, ".naive/decision-index.json")), guarded);

  // A provenance cursor that the log no longer holds offers every line again, rather than skipping them.
  const copy = readState(laptop) as SyncState;
  expect("a provenance cursor the log does not hold offers every line again",
    provenanceToSend(laptop, "a-hash-that-is-not-in-the-log").length === provenanceToSend(laptop).length
    && provenanceToSend(laptop, entries(laptop).at(-1)?.hash).length === 0, copy.provenance_pushed);

  // A base whose bytes are gone from the blob store is treated as no base, so the merge asks instead of guessing.
  rmSync(join(laptop, ".naive/blobs"), { recursive: true, force: true });
  write(laptop, CONSTRAINTS, { ...(read(laptop, CONSTRAINTS) as { [k: string]: Json }), updated: "2026-11-26" });
  expect("a record whose bytes differ from its base is what a push would send", localChanges(laptop, readState(laptop) as SyncState).some((c) => c.path === CONSTRAINTS));
} finally {
  await close();
  if (!failed) rmSync(root, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} failing (the working copies are at ${root})` : "\nall passing");
process.exit(failed ? 1 : 0);
