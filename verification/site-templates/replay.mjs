// Replay the templates rules against this checkout. No TLC rule broke, so this
// walks the same steps the chart draws: read a file, list the card, filter, open
// the detail page, and run a Use command.
//
//   node verification/site-templates/replay.mjs [--http http://127.0.0.1:3456]

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCatalog } from "../../site/lib/templates/catalog.mjs";
import { commandRunnable } from "../../site/lib/templates/commands.mjs";
import { applyFilters } from "../../site/lib/templates/filter.mjs";

const repo = new URL("../..", import.meta.url).pathname.replace(/\/?$/, "");
const http = process.argv.includes("--http") ? process.argv[process.argv.indexOf("--http") + 1] : "";
const failures = [];
const fail = (rule, message) => failures.push(`${rule}: ${message}`);

const { items } = loadCatalog();

for (const item of items) {
  if (!existsSync(join(repo, item.source))) fail("CardHasPath", `${item.slug} names ${item.source}, which is not in the repository`);
  for (const command of item.commands) {
    if (!commandRunnable(command.text, repo)) fail("CommandRunnable", `${item.slug} shows a command that cannot be run: ${command.text.split("\n")[0]}`);
  }
  for (const link of item.related ?? []) {
    if (!items.some((other) => other.slug === link.slug)) fail("DetailExists", `${item.slug} links to ${link.slug}, which has no detail page`);
  }
  for (const useCase of item.useCases ?? []) {
    if (useCase.id.includes(",")) fail("FilterValid", `${item.slug} has a filter id with a comma: ${useCase.id}`);
  }
}

const kinds = [[], ["template"], ["playbook"], ["template", "playbook"]];
const categories = ["", ...new Set(items.map((item) => item.category))];
const frameworks = ["", "Naive", "Mentura", "Naive,Mentura"];
const useIds = ["", ...new Set(items.flatMap((item) => item.useCases.map((useCase) => useCase.id)))];
let combinations = 0;
for (const kind of kinds) {
  for (const category of categories) {
    for (const framework of frameworks) {
      for (const use of useIds) {
        for (const q of ["", "zzzz-no-match", "foundation"]) {
          combinations += 1;
          const shown = applyFilters(items, {
            q,
            kinds: kind,
            categories: category ? [category] : [],
            frameworks: framework ? framework.split(",") : [],
            uses: use ? [use] : [],
          });
          if (!Array.isArray(shown)) fail("FilterValid", "a filter did not return a list");
          for (const item of shown) {
            if (kind.length && !kind.some((value) => item.kinds.includes(value))) fail("FilterValid", `${item.slug} stayed in a kind filter it does not match`);
            if (category && item.category !== category) fail("FilterValid", `${item.slug} stayed in the ${category} filter`);
            if (framework && !framework.split(",").includes(item.framework ?? "")) fail("FilterValid", `${item.slug} stayed in a framework filter it does not match`);
            if (use && !item.useCases.some((useCase) => useCase.id === use)) fail("FilterValid", `${item.slug} stayed in a use-case filter it does not match`);
          }
        }
      }
    }
  }
}

if (http) {
  for (const item of items) {
    const response = await fetch(`${http}/templates/${item.slug}`);
    if (response.status !== 200) fail("DetailExists", `${item.slug} returned ${response.status}`);
    const html = await response.text();
    if (!html.includes(item.title)) fail("DetailExists", `${item.slug} did not include its title`);
    if (item.commands[0]) {
      const needle = item.commands[0].text.split("\n")[0].split('"')[0].trim();
      if (!html.includes(needle)) fail("CommandRunnable", `${item.slug} detail page omitted its Use command`);
    }
  }
  const missing = await fetch(`${http}/templates/not-a-real-record`);
  if (missing.status !== 404) fail("DetailExists", `an unknown slug returned ${missing.status}`);
}

const base = mkdtempSync(join(tmpdir(), "templates-replay-"));
const created = spawnSync("node", [
  "interface/create-venture/index.mjs", join(base, "my-venture"),
  "--type", "software-startup", "--yes", "--skip-install", "--no-git", "--name", "Replay Founder",
], { cwd: repo, encoding: "utf8", timeout: 30000 });
if (created.status !== 0) fail("CommandRunnable", `create-venture --type software-startup --yes failed: ${(created.stderr || created.stdout).slice(0, 400)}`);
else {
  const setup = spawnSync("node", [join(repo, "interface/cli/naive.mjs"), "setup"], { cwd: join(base, "my-venture"), encoding: "utf8", timeout: 20000 });
  if (setup.status !== 0) fail("CommandRunnable", `naive setup failed: ${(setup.stderr || setup.stdout).slice(0, 400)}`);
  const frame = spawnSync("node", ["interface/cli/naive.mjs", "frame", "list"], { cwd: repo, encoding: "utf8", timeout: 20000 });
  if (frame.status !== 0) fail("CommandRunnable", `naive frame list failed: ${(frame.stderr || frame.stdout).slice(0, 400)}`);
}

const ready = spawnSync("node", ["schema/check-ready.mjs", "instance/ventures/everything-ecosystem", "anatomy-json-output"], { cwd: repo, encoding: "utf8", timeout: 20000 });
if (ready.status !== 0 && ready.status !== 1) fail("CommandRunnable", `check-ready exited ${ready.status}`);
if (ready.error) fail("CommandRunnable", `check-ready did not start: ${ready.error.message}`);

console.log(`${items.length} cards, ${combinations} filter combinations, create-venture ${created.status === 0 ? "ran" : "failed"}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("replay: every rule held");
