// A raw source is written with its text (EE-192). In a new venture the write then naive check passes.
// A second write, a duplicate text, a linkedin.com url and a logged-in fetch are refused, and nothing new is written.
//
//   node packages/naive/src/interfaces/tests/raw-source-write-test.ts

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ventureFile } from "../../core/venture-paths.ts";

const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
const cli = join(repo, "packages/naive/src/interfaces/cli/naive.ts");
const root = mkdtempSync(join(tmpdir(), "raw-source-"));
const venture = join(root, "acme");
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const run = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const file = (name: string, body: unknown) => { const p = join(root, name); writeFileSync(p, JSON.stringify(body)); return p; };
const sourceDir = (id: string) => ventureFile(venture, `raw/sources/${id}`);

const made = run(root, "new", "acme", "--yes", "--skip-install", "--no-git", "--no-workspace");
expect("naive new scaffolds a venture", made.status === 0, made.stderr);

const text = "Revenue was $10.\n";
const input = file("filing.json", {
  source: { origin: "https://www.sec.gov/Archives/edgar/data/1/filing.htm", title: "Filing", fetched: "2026-11-26", fetched_at: "2026-11-26T15:00:00Z", url: "https://www.sec.gov/Archives/edgar/data/1/filing.htm", archive_of: null, http_status: 200, self_reported: false },
  text,
});
const wrote = run(root, "raw/sources/sec-filing", "write", "--venture", "acme", "--input", input);
expect("the write is accepted", wrote.status === 0, wrote.stderr);
const record = JSON.parse(readFileSync(join(sourceDir("sec-filing"), "source.json"), "utf8")) as { sha256: string; archive_of: string | null };
const textOnDisk = readFileSync(join(sourceDir("sec-filing"), "text.md"), "utf8");
expect("text.md is the text, and sha256 is its hash", textOnDisk === text && record.sha256 === sha(text), record.sha256);
expect("archive_of is null when the source names none", record.archive_of === null);
const lines = readFileSync(ventureFile(venture, "provenance.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { entity?: string });
expect("one provenance line names the source, and text.md is not a second write", lines.filter((l) => l.entity === "raw/sources/sec-filing/source.json").length === 1 && !lines.some((l) => l.entity === "raw/sources/sec-filing/text.md"));

const checked = run(venture, "check");
expect("naive check passes after the write", checked.status === 0, checked.stdout + checked.stderr);

const before = readFileSync(join(sourceDir("sec-filing"), "source.json"), "utf8");
const again = run(root, "raw/sources/sec-filing", "write", "--venture", "acme", "--input", file("again.json", { source: { origin: "https://www.sec.gov/other.htm", url: "https://www.sec.gov/other.htm" }, text: "other\n" }));
expect("a second write is refused", again.status !== 0 && /immutable/.test(again.stderr), again.stderr);
expect("a refused second write changes nothing", readFileSync(join(sourceDir("sec-filing"), "source.json"), "utf8") === before && readFileSync(join(sourceDir("sec-filing"), "text.md"), "utf8") === text);

const dup = run(root, "raw/sources/sec-copy", "write", "--venture", "acme", "--input", file("dup.json", { source: { origin: "https://www.sec.gov/Archives/edgar/data/1/filing.htm", url: "https://www.sec.gov/Archives/edgar/data/1/filing.htm" }, text }));
expect("a duplicate text is refused and names the first source", dup.status !== 0 && /raw\/sources\/sec-filing already holds this text/.test(dup.stderr), dup.stderr);
expect("the duplicate id is not created", !existsSync(sourceDir("sec-copy")));

const linked = run(root, "raw/sources/profile", "write", "--venture", "acme", "--input", file("li.json", { source: { origin: "https://linkedin.com/in/a", url: "https://linkedin.com/in/a" }, text: "A public profile.\n" }));
expect("a linkedin.com url is refused", linked.status !== 0 && /allowed source/.test(linked.stderr), linked.stderr);
expect("a refused linkedin source writes nothing", !existsSync(sourceDir("profile")));

const logged = run(root, "raw/sources/member", "write", "--venture", "acme", "--input", file("in.json", { source: { origin: "https://example.com/page", url: "https://example.com/page" }, text: "Seen while logged in.\n", logged_in: true }));
expect("a logged-in fetch is refused and writes nothing", logged.status !== 0 && /allowed source/.test(logged.stderr) && !existsSync(sourceDir("member")), logged.stderr);

expect("the venture still has only the first source", readdirSync(ventureFile(venture, "raw/sources")).join(",") === "sec-filing");

rmSync(root, { recursive: true, force: true });
console.log(failed ? `${failed} failed` : "raw source write: all pass");
process.exit(failed ? 1 : 0);
