// Tests scripts/import-scinet.ts (EE-167) on a small made-up SciNet data folder: the chosen subfield's tasks in the
// chosen categories and a named universal task become activities with SciNet's statement, source and scores; a rerun
// writes the same bytes; activities from elsewhere are kept; a dropped statement is left out; and input the script
// cannot use is refused. The committed catalog is also checked to be in the script's own format.
//
//   node scripts/import-scinet-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { format } from "../packages/naive/src/engine/generators/activity-catalog.ts";
import type { ActivityCatalog } from "../packages/naive/src/records/types/records.d.ts";

const repo = new URL("..", import.meta.url).pathname;
const SCRIPT = join(repo, "scripts/import-scinet.ts");
const FILE = "packages/naive/src/functions/activities.json";
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "import-scinet-test-"));

const data = join(tmp, "data");
mkdirSync(data);
const CONSENT = "Obtain ethical approvals and informed consent for studies involving human subjects.";
const SURVEY = "Design survey instruments to measure brand perceptions, purchase intentions, or customer satisfaction.";
const BENCH = "Benchmark a focal country, region, or organization against selected comparators";
const place = "subfield,Social Sciences,Business & Management,Marketing";
writeFileSync(join(data, "tasks.csv"), [
  "task,category,level,domain,field,subfield,expert_input",
  `${CONSENT},Data Gathering,universal,,,,`,
  `"${SURVEY}",Data Gathering,${place},`,
  `"${BENCH}",Data Analysis,${place},`,
  `Formulate hypotheses about consumer choice.,Ideation & Hypothesis Generation,${place},`,
  "Sequence genomes of soil bacteria.,Data Gathering,subfield,Life Sciences,Biology,Microbiology,",
].join("\n") + "\n");
writeFileSync(join(data, "task_dimensions.csv"), [
  "task,level,domain,field,subfield,cognitive_complexity,physical_deployment,regulatory_restriction,rl_verification",
  `${CONSENT},universal,,,,1.5,0.2,2.75,6.1`,
  `"${SURVEY}",${place},2.1,0.0,0.3,5.5`,
  `"${BENCH}",${place},1.9,0.0,0.0,7.0`,
].join("\n") + "\n");
writeFileSync(join(data, "task_ratings.csv"), [
  "task,level,domain,field,subfield,importance,pct_researchers,frequency,classification",
  `"${SURVEY}",${place},4,90,3,Core`,
].join("\n") + "\n");

let n = 0;
const BASE = ["--release", "v9.9.9", "--date", "2026-01-02", "--process-group", "3.1", "--process", "3.1.1"];
const PICK = ["--subfield", "Marketing", "--category", "Data Gathering", "--category", "Data Analysis", "--task", CONSENT];
/** A root holding the repository's catalog, changed by `seed`, with the script run on the made-up data. */
const run = (args: string[], seed: (_c: ActivityCatalog) => void = () => {}, from?: string) => {
  const root = from ?? join(tmp, `r-${++n}`);
  if (!from) {
    mkdirSync(dirname(join(root, FILE)), { recursive: true });
    cpSync(join(repo, FILE), join(root, FILE));
    const c = JSON.parse(readFileSync(join(root, FILE), "utf8")) as ActivityCatalog;
    c.activities = []; seed(c);
    writeFileSync(join(root, FILE), format(c));
  }
  const r = spawnSync(process.execPath, [SCRIPT, data, ...args, "--root", root], { encoding: "utf8" });
  const text = () => readFileSync(join(root, FILE), "utf8");
  return { status: r.status, out: r.stdout + r.stderr, root, text, catalog: () => JSON.parse(text()) as ActivityCatalog };
};
const refused = (name: string, args: string[], says: RegExp) => { const r = run(args); t(name, r.status === 1 && says.test(r.out) && r.catalog().activities.length === 0, r.out); };

const first = run([...BASE, ...PICK]);
const acts = first.status === 0 ? first.catalog().activities : [];
const by = (statement: string) => acts.find((a) => a.statement === statement);
t("the subfield's tasks in the chosen categories and the named universal task are imported, and no other", first.status === 0 && acts.length === 3 && !!by(CONSENT) && !!by(SURVEY) && !!by(`${BENCH}.`), first.out);
t("activities are sorted by id and filed cross-industry under the process group and process", acts.every((a, i) => (i === 0 || (acts[i - 1]?.id ?? "") < a.id) && a.process_group === "3.1" && a.process === "3.1.1" && a.scope.kind === "cross-industry"), acts.map((a) => a.id));
t("an id is a slug of the statement cut at a word, at most 60 characters", acts.every((a) => a.id.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.id)) && by(SURVEY)?.id === "design-survey-instruments-to-measure-brand-perceptions", acts.map((a) => a.id));
const survey = by(SURVEY);
t("a subfield's task carries SciNet's seven scores, its source and who rated it", JSON.stringify(survey?.ratings) === JSON.stringify({ "regulatory-restriction": 0.3, "physical-deployment": 0, "cognitive-complexity": 2.1, verification: 5.5, importance: 4, share: 90, frequency: 3 })
  && survey?.source?.ref === "alamos-althoff-2026-scinet" && /SciNet v9\.9\.9, tasks\.csv: Social Sciences > Business & Management > Marketing, category Data Gathering/.test(survey.source.locator ?? "")
  && survey.rated?.by === "SciNet v9.9.9" && survey.rated.on === "2026-01-02" && /researchers in Marketing/.test(survey.rated.basis) && /Not rated for a business/.test(survey.rated.basis), survey);
const consent = by(CONSENT);
t("a universal task carries the four scores SciNet gives it and no importance, share or frequency", JSON.stringify(Object.keys(consent?.ratings ?? {})) === JSON.stringify(["regulatory-restriction", "physical-deployment", "cognitive-complexity", "verification"]) && /universal task/.test(consent?.source?.locator ?? ""), consent);
const bench = by(`${BENCH}.`);
t("a statement with no period gets one and its source says changed", bench?.source?.changed === true && survey?.source?.changed === undefined, bench);
const again = run([...BASE, ...PICK], undefined, first.root);
t("a rerun writes the same bytes", again.status === 0 && again.text() === first.text(), again.out);

const own = { id: "interview-customers", process_group: "3.1", statement: "Interview prospective customers about the problem.", scope: { kind: "cross-industry" as const } };
const elsewhere = { id: "old-scinet-task", process_group: "3.2", statement: "Review prior studies of pricing.", scope: { kind: "cross-industry" as const }, source: { ref: "alamos-althoff-2026-scinet" } };
const stale = { id: "stale-scinet-task", process_group: "3.1", statement: "Review prior studies of brands.", scope: { kind: "cross-industry" as const }, source: { ref: "alamos-althoff-2026-scinet" } };
const kept = run([...BASE, ...PICK], (c) => { c.activities.push(own, elsewhere, stale); });
const ids = kept.status === 0 ? kept.catalog().activities.map((a) => a.id) : [];
t("an activity that is not SciNet's, and SciNet's in another process group, are kept; SciNet's in this group are replaced", ids.length === 5 && ids[0] === "interview-customers" && ids[1] === "old-scinet-task" && !ids.includes("stale-scinet-task"), ids);

const dropped = run([...BASE, ...PICK, "--drop", SURVEY]);
t("a dropped statement is left out", dropped.status === 0 && dropped.catalog().activities.length === 2 && !dropped.catalog().activities.some((a) => a.statement === SURVEY), dropped.out);

refused("a subfield SciNet does not have", [...BASE, "--subfield", "Alchemy"], /no task in SciNet has the subfield "Alchemy"/);
refused("a category the chosen subfields do not have", [...BASE, "--subfield", "Marketing", "--category", "Mentorship & Teaching"], /no task in the chosen subfields has the category/);
refused("a named task that is not a universal task", [...BASE, "--task", SURVEY], /no universal task in SciNet reads/);
refused("a drop that was not picked", [...BASE, ...PICK, "--drop", "Sequence genomes of soil bacteria."], /--drop names a statement that was not picked/);
refused("a result that fails the schema", ["--release", "v9.9.9", "--date", "2026-01-02", "--process-group", "three", "--subfield", "Marketing"], /process_group/);
t("no release, date or process group is a usage error", run(["--subfield", "Marketing"]).status === 2);

const committed = readFileSync(join(repo, FILE), "utf8");
t("the committed catalog is in the script's format", format(JSON.parse(committed) as ActivityCatalog) === committed);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("import-scinet: SciNet's tasks become activities with their statement, source and scores, and a rerun writes the same bytes");
