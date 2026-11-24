// Tests for the PR review agent (handoff 2026-10-29, items 7 and 12). Offline: content.mjs runs on fixture
// markdown, design.mjs's pure parts run without a browser, and preview hygiene is read from the site's source.
//
//   node site/pr-review/pr-review-test.mjs

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkMarkdown, FALLBACK_PATTERNS, fetchMarkdown, loadPatterns, pagesFromFiles, run } from "./content.mjs";
import { contrast, inspectPage, report as designReport, screenshotMode } from "./design.mjs";
import { naivePath } from "../scripts/naive.ts";

const here = new URL(".", import.meta.url).pathname;
const root = join(here, "../..");
let failed = 0;
const check = (name, ok) => { if (!ok) failed++; console.log(`${ok ? "✓" : "✗ FAIL"} ${name}`); };

// Content, from fixtures.
const result = await run({ fixtures: join(here, "fixtures") });
const byName = Object.fromEntries(result.pages.map((p) => [p.path.split("/").at(-1), p]));
check("both fixture pages read", result.pages.length === 2);
check("a clean page has no findings (example.com email allowed)", byName["clean.md"].findings.length === 0);
const rules = new Set(byName["leaky.md"].findings.map((f) => f.rule));
for (const r of ["codename", "local-path", "private-path", "todo", "secret-aws"]) check(`leaky page flags ${r}`, rules.has(r));
check("findings carry line numbers", byName["leaky.md"].findings.find((f) => f.rule === "secret-aws").line === 7);
check("report gives kind and location, never the matched text", result.markdown.includes("line 7, column 32: AWS access key shape")
  && !/AKIA|mentura|\/Users\/someone/i.test(result.markdown) && !JSON.stringify(result.pages).includes("AKIA"));
check("report names the leaky page only", result.markdown.includes("leaky.md") && !result.markdown.includes("clean.md"));
check("both dictionaries load: Naive's and the founder's", loadPatterns().source.includes("packages/naive/src/engine/internal-terms.json") && loadPatterns().source.includes("site/gate/governance/internal-terms.json"));

// A temporary repo, so the founder's rule below is a made-up term.
const dict = mkdtempSync(join(tmpdir(), "pr-review-dict-"));
mkdirSync(join(dict, "packages/naive/src/engine"), { recursive: true });
mkdirSync(join(dict, "site/gate/governance"), { recursive: true });
writeFileSync(join(dict, "packages/naive/src/engine/internal-terms.json"), JSON.stringify({ patterns: [{ id: "decision-id", regex: "\\b(?:EE|G|D)-\\d{3}\\b", why: "a ledger id" }] }));
writeFileSync(join(dict, "site/gate/governance/internal-terms.json"), JSON.stringify({ patterns: [{ id: "codename-zephyr", regex: "\\bZephyr\\b", why: "Zephyr is unannounced", severity: "warn" }] }));
const loaded = loadPatterns(dict, dict).patterns;
const withoutNaive = loadPatterns(dict, null);
check("without a Naive checkout, Naive's list is skipped and says so; the venture's list still loads", /Naive's list skipped/.test(withoutNaive.source) && withoutNaive.source.includes("site/gate/governance/internal-terms.json") && !withoutNaive.patterns.some((p) => p.id === "decision-id"));
const dictRules = (text) => checkMarkdown(text, loaded).map((f) => f.rule);
check("a dictionary regex is case-sensitive, as in check-leaks", dictRules("see d-100").length === 0 && dictRules("see D-100").includes("decision-id"));
check("a term on the founder's list is found", dictRules("Zephyr ships").includes("venture-term-1"));
check("a founder's rule keeps its severity", checkMarkdown("Zephyr", loaded).find((f) => f.rule === "venture-term-1").severity === "warn");
check("a founder's rule id and reason never name the term", !/zephyr/i.test(JSON.stringify(checkMarkdown("Zephyr", loaded))));
rmSync(dict, { recursive: true });
check("fallback patterns compile", FALLBACK_PATTERNS.every((p) => new RegExp(p.pattern, p.flags)));
check("a literal term becomes a whole-word pattern", checkMarkdown("Project Falcon ships", [{ id: "t", severity: "error", pattern: "\\bfalcon\\b", flags: "i", reason: "x" }]).length === 1);

// Changed files to page paths.
const paths = pagesFromFiles(["site/content/docs/index.mdx", "site/content/docs/guides/cli.mdx", "site/content/(home)/pricing.mdx", "schema/x.mjs"]);
check("changed files map to page paths", JSON.stringify(paths) === JSON.stringify(["/docs", "/docs/guides/cli", "/pricing"]));

// Markdown fetch: Accept header first, then the .md route (stub fetch, no network).
const calls = [];
const stub = async (url, opts) => {
  calls.push([url, opts.headers.accept]);
  if (opts.headers.accept) return { ok: true, status: 200, headers: new Map([["content-type", "text/html"]]), text: async () => "<html>" };
  return { ok: true, status: 200, headers: new Map(), text: async () => "# md" };
};
check("falls back to the .md route when Accept returns html", (await fetchMarkdown("https://p.example", "/docs/a", stub)) === "# md" && calls[1][0] === "https://p.example/docs/a.md");

// Design: screenshots and contrast.
check("screenshots off by default", screenshotMode({ labels: [], config: {} }) === false);
check("screenshots on with the label", screenshotMode({ labels: ["screenshots"], config: {} }) === true);
check("screenshots on when config says always", screenshotMode({ config: { pr_review: { screenshots: "always" } } }) === true);
check("black on white is 21:1", Math.round(contrast([0, 0, 0], [255, 255, 255])) === 21);
check("#777 on white fails 4.5", contrast([119, 119, 119], [255, 255, 255]) < 4.5);

// Design findings from a stub page: a secret in a heading, a contrast failure and an img src must not reach the report.
const fake = "AKIA" + "ABCDEFGHIJKLMNOP";
const heading = (tagName) => ({ tagName, textContent: fake, offsetParent: {}, getClientRects: () => [{}] });
const para = { parentElement: null, getClientRects: () => [{}] };
const headings = [heading("H1"), heading("H3"), heading("H3")];
Object.assign(globalThis, {
  NodeFilter: { SHOW_TEXT: 4 },
  getComputedStyle: () => ({ color: "rgb(200, 200, 200)", backgroundColor: "rgb(255, 255, 255)", fontSize: "16px", fontWeight: "400", visibility: "visible", display: "block" }),
  document: {
    body: {},
    querySelectorAll: (q) => q === "img" ? [{ hasAttribute: () => false, getAttribute: () => `https://x.example/a?key=${fake}` }] : headings,
    createTreeWalker: () => { const nodes = [{ parentElement: para, textContent: fake }]; return { nextNode: () => nodes.shift() ?? null }; },
  },
});
const designFindings = inspectPage();
for (const k of ["document", "getComputedStyle", "NodeFilter"]) delete globalThis[k];
const designMd = designReport([{ path: "/docs/a", findings: designFindings }]);
for (const r of ["heading-skip", "heading-duplicate", "img-alt", "contrast"]) check(`design flags ${r}`, designFindings.some((f) => f.rule === r));
check("design findings carry positions", designMd.includes("at heading 3") && designMd.includes("image 1") && designMd.includes("at text element 1"));
check("design report never prints page text or a src", !designMd.includes(fake) && !JSON.stringify(designFindings).includes(fake));

// Preview hygiene: robots stays noindex, previews send X-Robots-Tag.
const robots = readFileSync(join(root, "site/app/robots.ts"), "utf8");
check("robots.ts disallows everything", /disallow:\s*"\/"/.test(robots) && !/allow:\s*"\/"/.test(robots.replace(/disallow/g, "")));
check("layout metadata keeps index: false", /robots:\s*\{\s*index:\s*false/.test(readFileSync(join(root, "site/app/layout.tsx"), "utf8")));
const next = readFileSync(join(root, "site/next.config.mjs"), "utf8");
check("next.config sends X-Robots-Tag noindex on every path, previews included", /source: "\/:path\*"/.test(next) && /X-Robots-Tag[^\n]*\n?[^\n]*noindex/.test(next));

// Untrusted PR code runs only in pr-review.yml, with no secrets and a read-only token; pr-review-comment.yml holds the
// write token, runs from the default branch and runs no PR code.
const wf = readFileSync(join(root, ".github/workflows/pr-review.yml"), "utf8");
const cw = readFileSync(join(root, ".github/workflows/pr-review-comment.yml"), "utf8");
check("workflows never merge or approve", ![wf, cw].some((t) => /pulls\.merge|createReview|"APPROVE"|gh pr (?:merge|review)|git push/.test(t)));
check("the PR-code workflow reads no secrets and has no write permission", !/secrets\./.test(wf) && !/:\s*write\b/.test(wf) && !/pull_request_target/.test(wf));
check("the comment workflow is workflow_run, checks out nothing and runs no scripts",
  /workflow_run:\s*\n\s*workflows:\s*\[pr-review\]/.test(cw) && !/actions\/checkout|setup-node|npm |node scripts|\brun:/.test(cw) && !/secrets\./.test(cw));
check("the comment workflow only comments on the PR whose head was reviewed", /pr\.head\.sha !== run\.head_sha/.test(cw));
check("the comment workflow rejects pull_request artifacts", /workflow_run\.event != 'pull_request'/.test(cw));
check("the head check has no workflow_dispatch bypass", !/workflow_dispatch/.test(cw));

// Runs the workflow's own read() on a zip whose content.md is a symlink to a file outside the folder.
const zipDir = mkdtempSync(join(tmpdir(), "pr-review-zip-"));
writeFileSync(join(zipDir, "outside.txt"), "CANARY-TEXT");
mkdirSync(join(zipDir, "a"));
writeFileSync(join(zipDir, "a/pr.json"), '{"pr": 1}');
symlinkSync(join(zipDir, "outside.txt"), join(zipDir, "a/content.md"));
execFileSync("zip", ["-q", "-y", join(zipDir, "pr-review.zip"), "pr.json", "content.md"], { cwd: join(zipDir, "a") });
const readLine = cw.split("\n").find((l) => l.includes("const read = ")).trim();
const readInZip = new Function("execFileSync", `${readLine} return read;`)((cmd, args, o) => execFileSync(cmd, args, { ...o, cwd: zipDir }));
check("a symlink in the artifact yields its path as text, not the file", !readInZip("content.md", 30000).includes("CANARY-TEXT"));
check("a regular artifact member reads normally", JSON.parse(readInZip("pr.json", 2000)).pr === 1);
rmSync(zipDir, { recursive: true });

// naive publish routes on the first argument after --venture, wherever the flag sits.
const naive = (...args) => { try { return execFileSync("node", [naivePath("packages/naive/src/interfaces/cli/naive.mjs"), ...args], { encoding: "utf8", stdio: "pipe" }); } catch (e) { return `${e.stdout}${e.stderr}`; } };
// On a copy of Naive's example venture: the check writes .naive in the venture it reads.
const relay = mkdtempSync(join(tmpdir(), "pr-review-relay-"));
cpSync(naivePath("packages/naive/src/records/examples/software/ventures/relay"), relay, { recursive: true });
check("naive publish --venture <dir> check reaches the lint", !naive("publish", "--venture", relay, "check", "no-such-file.md").includes("no channel check"));
rmSync(relay, { recursive: true, force: true });

check("screenshots go into the uploaded artifact", /--shots pr-review-out\/screenshots/.test(wf) && /upload-artifact@v4[\s\S]*path: pr-review-out\//.test(wf));

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
