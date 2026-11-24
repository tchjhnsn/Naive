// Build-time catalog for /templates. Every card is read from a file: Naive's own files (packages, frames,
// playbooks, skills, frameworks) from the installed naive-framework package, and the site's pages and
// Mentura's kits from this repository. Nothing here is a hand-written template list.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { docsLinks } from "../../content/templates/docs-links.mjs";
import { commandRunnable } from "./commands.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const siteContent = join(repo, "site/content");
// The installed Naive package: the workspace hoists it to the root node_modules, or the site has its own.
// A plain path, not import.meta.resolve, because Next bundles this file.
const naive = [join(repo, "node_modules/naive-framework"), join(repo, "site/node_modules/naive-framework")].find((d) => existsSync(join(d, "package.json")));
if (!naive) throw new Error("catalog: naive-framework is not installed (npm install at the repository root)");
// A source path names a file in this repository (site/, platform/) or in Naive (everything else).
const OWN = new Set(["site", "platform"]);
// A module converted to TypeScript keeps its .mjs name here: the source is read as .ts, else the compiled copy in dist/ (EE-159).
const inNaive = (rel) => [join(naive, rel), join(naive, rel.replace(/\.mjs$/, ".ts")), join(naive, "dist", rel.replace(/\.(ts|mjs)$/, ".mjs")), join(naive, "dist", rel)].find((p) => existsSync(p)) ?? join(naive, rel);
const abs = (rel) => (OWN.has(rel.split("/")[0]) ? join(repo, rel) : inNaive(rel));
const relOf = (path) => relative(path.startsWith(naive + "/") ? naive : repo, path);

const read = (rel) => readFileSync(abs(rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const exists = (rel) => existsSync(abs(rel));

function plain(text) {
  return String(text ?? "")
    .replace(/\*\*/g, "")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text, max = 48) {
  const t = plain(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 24 ? cut.slice(0, sp) : cut).trim()}...`;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { data: {}, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return { data: {}, body: text };
  const raw = text.slice(4, end);
  const body = text.slice(end + 5);
  const data = {};
  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || /^\s/.test(line)) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const rest = match[2];
    if (rest === ">" || rest === "|" || rest === ">-" || rest === "|-") {
      const folded = [];
      for (i += 1; i < lines.length; i++) {
        if (lines[i] !== "" && !/^\s/.test(lines[i])) { i -= 1; break; }
        folded.push(lines[i].trim());
      }
      data[key] = folded.join(" ").replace(/\s+/g, " ").trim();
    } else if ((rest.startsWith('"') && rest.endsWith('"')) || (rest.startsWith("'") && rest.endsWith("'"))) {
      data[key] = rest.slice(1, -1).replace(/\\"/g, '"');
    } else {
      data[key] = rest.trim();
    }
  }
  return { data, body };
}

function tagsOf(value) {
  if (!value) return [];
  const text = String(value).trim();
  if (text.startsWith("[")) return [...text.matchAll(/[A-Za-z0-9_-]+/g)].map((m) => m[0]);
  return text.split(/[,\s]+/).filter(Boolean);
}

function firstParagraph(body) {
  const parts = [];
  let started = false;
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!started) {
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(">") || trimmed.startsWith("```")) continue;
      started = true;
    }
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("```")) break;
    parts.push(trimmed.replace(/^>\s?/, ""));
  }
  return plain(parts.join(" "));
}

function firstBlockquote(body) {
  const parts = [];
  for (const line of body.split("\n")) {
    if (line.startsWith(">")) parts.push(line.replace(/^>\s?/, ""));
    else if (parts.length) break;
  }
  return plain(parts.join(" "));
}

function headings(body, limit = 5) {
  return body.split("\n")
    .map((line) => line.match(/^#{2,3}\s+(.+)$/))
    .filter(Boolean)
    .map((match) => plain(match[1]))
    .filter(Boolean)
    .slice(0, limit);
}

function shellFences(body, limit = 4) {
  const out = [];
  const re = /```(?:sh|bash|shell|txt)\n([\s\S]*?)```/g;
  let match;
  while ((match = re.exec(body)) && out.length < limit) {
    const text = match[1].replace(/\s*#.*$/gm, "").trim();
    if (text && /^(node|npx|pnpm|yarn|bun|git|claude|curl|cd|export|cat)\b/m.test(text)) out.push(text);
  }
  return out;
}

function inlineCommands(body, limit = 3) {
  const out = [];
  for (const match of body.matchAll(/`((?:node|npx|claude) [^`\n]+)`/g)) {
    const text = match[1].trim();
    if (!out.includes(text)) out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

// The npm package is naive-framework. The bare name `naive` is a different package.
function publishNaive(text) {
  return text.replace(/(^|\n)([ \t]*)npx naive\b/g, "$1$2npx -p naive-framework naive");
}

function triggersOf(description) {
  const text = plain(description);
  const match = text.match(/MANDATORY TRIGGERS:\s*(.+)$/i) || text.match(/(?:^|\s)Triggers:\s*(.+)$/i);
  if (!match) return "";
  return match[1].replace(/\s*Do not trigger[\s\S]*$/i, "").replace(/\.$/, "").trim();
}

function descriptionWithoutTriggers(description) {
  return plain(description)
    .replace(/\s*MANDATORY TRIGGERS:[\s\S]*$/i, "")
    .replace(/\s*Triggers:[\s\S]*$/i, "")
    .trim();
}

function extractLiteral(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`catalog: ${marker} is not in schema/init-venture.mjs`);
  const start = at + marker.length;
  const open = source[start];
  if (open !== "[" && open !== "{") throw new Error(`catalog: ${marker} is not a literal`);
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "[" || ch === "{") depth += 1;
    else if (ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0 && ch === close) {
        const literal = source.slice(start, i + 1);
        return Function(`"use strict"; return (${literal});`)();
      }
    }
  }
  throw new Error(`catalog: ${marker} did not close`);
}

function walk(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, predicate, acc);
    else if (predicate(path)) acc.push(path);
  }
  return acc;
}

function docsFile(href) {
  const rest = href.replace(/^\/docs\/?/, "");
  return join(siteContent, rest ? `docs/${rest}.mdx` : "docs/index.mdx");
}

function loadDocsMap() {
  const map = docsLinks;
  const keep = (links) => (links ?? []).filter((link) => existsSync(docsFile(link.href)));
  return {
    byCategory: Object.fromEntries(Object.entries(map.byCategory ?? {}).map(([key, links]) => [key, keep(links)])),
    bySlug: Object.fromEntries(Object.entries(map.bySlug ?? {}).map(([key, links]) => [key, keep(links)])),
  };
}

function docsFor(docsMap, item) {
  const seen = new Set();
  const links = [];
  for (const link of [...(docsMap.bySlug[item.slug] ?? []), ...(docsMap.byCategory[item.category] ?? [])]) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    links.push(link);
  }
  return links;
}

function itemBase(partial) {
  return {
    kinds: partial.kinds ?? [partial.kind],
    framework: partial.framework ?? null,
    useCases: partial.useCases ?? [],
    sources: partial.sources ?? [{ path: partial.source, note: "Record" }],
    commands: partial.commands ?? [],
    prompts: partial.prompts ?? [],
    badges: partial.badges ?? [],
    facts: partial.facts ?? [],
    sections: partial.sections ?? [],
    body: partial.body ?? null,
    diagram: partial.diagram ?? [],
    related: [],
    ...partial,
  };
}

function decisionSets(initSource) {
  if (!initSource.includes('product.${d.id.replace(/^product-/, "")}.decision.json')) {
    throw new Error("catalog: product decision filenames in schema/init-venture.mjs changed");
  }
  if (!initSource.includes('d.id === "first-close" ? "terms.first-close" : d.id.replace(/^fund-/, "")')) {
    throw new Error("catalog: fund decision filenames in schema/init-venture.mjs changed");
  }
  const product = extractLiteral(initSource, "const productFoundation = ");
  const fund = extractLiteral(initSource, "const fundFoundation = ");
  const teamQuestion = initSource.match(/id: "founding-team", question: "([^"]+)"/);
  const teamOptions = initSource.match(/id: "founding-team"[\s\S]*?options: \[([^\]]+)\]/);
  if (!teamQuestion || !teamOptions) throw new Error("catalog: founding-team decision is not in schema/init-venture.mjs");
  const options = [...teamOptions[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const comment = (needle) => {
    const at = initSource.indexOf(needle);
    const before = initSource.slice(0, at);
    const lines = before.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("//"));
    const block = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      block.unshift(lines[i].replace(/^\/\/\s?/, ""));
      if (lines[i].startsWith("// The ") || lines[i].startsWith("// A ")) break;
    }
    return plain(block.join(" "));
  };
  return {
    product,
    fund,
    team: { id: "founding-team", question: teamQuestion[1], options },
    comments: {
      product: comment("const productFoundation = "),
      fund: comment("const fundFoundation = "),
      team: comment('id: "founding-team"'),
    },
  };
}

function productFile(id) {
  return `products/decisions/product.${id.replace(/^product-/, "")}.decision.json`;
}

function fundFile(id) {
  const name = id === "first-close" ? "terms.first-close" : id.replace(/^fund-/, "");
  return `fund/decisions/${name}.decision.json`;
}

function createCommand(typeId) {
  return `npx create-venture@latest my-venture --type ${typeId} --yes`;
}

const CREATE_SOURCE = "packages/create-venture/index.mjs";
const CREATE_NOTE = "Non-interactive create-venture needs a directory. my-venture is the directory name on the installation page. --type selects the venture type. --yes answers the remaining questions with the defaults (discovery, and the type's default role). --yes does not replace a type passed with --type.";

function build() {
  const typesDoc = readJson("packages/naive/src/engine/venture-types.json");
  const types = typesDoc.types;
  const departments = readJson("packages/naive/src/functions/departments.json").departments;
  const deptLabel = new Map(departments.map((dept) => [dept.id, dept.label]));
  const packages = new Map();
  for (const name of readdirSync(join(naive, "packages/naive/library", "packages"))) {
    const rel = `packages/naive/library/packages/${name}/package.json`;
    if (exists(rel)) packages.set(name, { ...readJson(rel), _path: rel });
  }
  const registry = readJson("packages/naive/src/engine/upgrades.json");
  const catalogMeta = readJson("packages/naive/library/packages/catalog.json");
  const order = [...(catalogMeta.order?.core ?? []), ...(catalogMeta.order?.handoff ?? [])];
  const docsMap = loadDocsMap();
  const initSource = read("packages/naive/src/engine/init-venture.ts");
  const sets = decisionSets(initSource);
  const installPage = exists("site/content/docs/get-started/install.mdx") ? read("site/content/docs/get-started/install.mdx") : "";
  const setupPage = exists("site/content/docs/get-started/setup.mdx") ? read("site/content/docs/get-started/setup.mdx") : "";
  const quickPrompt = "Create a new Naive venture named my-venture with create-venture and the recommended defaults, start it with npm run dev, and tell me the board's address.";
  const setupPrompt = "Set up my venture acme with Naive.";
  const items = [];

  const deptCase = (id) => ({ id: `dept:${id}`, label: deptLabel.get(id) ?? id, group: "Department" });
  const typeCase = (type) => ({ id: `type:${type.id}`, label: type.label, group: "Venture type" });

  for (const type of types) {
    const missing = (type.packages ?? []).filter((name) => !packages.has(name));
    const slug = `type-${type.id}`;
    items.push(itemBase({
      slug,
      kind: "template",
      category: "Venture type",
      title: type.label,
      description: type.description,
      framework: "Naive",
      useCases: [typeCase(type), ...(type.departments ?? []).map(deptCase)],
      source: "packages/naive/src/engine/venture-types.json",
      sources: [
        { path: "packages/naive/src/engine/venture-types.json", note: `types[id=${type.id}]` },
        { path: CREATE_SOURCE, note: "create-venture --type" },
        { path: "site/content/docs/get-started/install.mdx", note: "npx create-venture@latest" },
      ],
      commands: [
        {
          label: "Create this venture type",
          text: createCommand(type.id),
          source: `${CREATE_SOURCE}; site/content/docs/get-started/install.mdx`,
          note: CREATE_NOTE,
        },
        ...(type.id === "software-startup" && installPage.includes("npx create-venture@latest my-venture --yes")
          ? [{
            label: "Recommended defaults",
            text: "npx create-venture@latest my-venture --yes",
            source: "site/content/docs/get-started/install.mdx",
            note: "The installation page. With no --type, --yes selects software-startup.",
          }]
          : []),
      ],
      prompts: type.id === "software-startup" && installPage.includes(quickPrompt)
        ? [{ label: "Prompt from the installation page", text: quickPrompt, source: "site/content/docs/get-started/install.mdx" }]
        : [],
      badges: [],
      facts: [
        { label: "id", value: type.id },
        { label: "default role", value: type.default_role },
        { label: "roles", value: (type.roles ?? []).join(", ") },
        { label: "departments", value: (type.departments ?? []).map((id) => deptLabel.get(id) ?? id).join(", ") },
        { label: "packages", value: (type.packages ?? []).join(", ") },
        { label: "decisions", value: type.decisions },
        ...(type.funding ? [{ label: "funding", value: type.funding }] : []),
        ...(type.examples?.length ? [{ label: "examples", value: type.examples.join(", ") }] : []),
        ...(missing.length ? [{ label: "named, no package file", value: missing.join(", ") }] : []),
      ],
      diagram: (type.packages ?? []).slice(0, 6),
      _packages: type.packages ?? [],
      _decisions: type.decisions,
    }));
  }

  const packageList = [...packages.values()].sort((a, b) => {
    const ai = order.indexOf(a.name);
    const bi = order.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  for (const pkg of packageList) {
    const reg = registry.packages?.[pkg.name] ?? null;
    const included = types.filter((type) => (type.packages ?? []).includes(pkg.name));
    const commands = [];
    if (included.length) {
      commands.push({
        label: "Start a venture whose type lists this package",
        text: createCommand(included[0].id),
        source: "packages/naive/src/engine/venture-types.json; packages/create-venture/index.mjs",
        note: `${CREATE_NOTE} Types that list ${pkg.name}: ${included.map((type) => type.id).join(", ")}.`,
      });
    }
    if (reg?.channel === "experimental") {
      commands.push({
        label: "Adopt it on the canary channel",
        text: `npx -p naive-framework naive upgrade my-venture --canary\nnpx -p naive-framework naive upgrade my-venture --adopt ${pkg.name}`,
        source: "packages/naive/src/engine/upgrade-venture.ts; schema/upgrades.mjs; schema/upgrades.json",
        note: `${reg.note ?? "Experimental."} An experimental package needs the canary channel before --adopt. The venture directory must already exist.`,
      });
    } else if (reg) {
      commands.push({
        label: "Adopt it before its phase",
        text: `npx -p naive-framework naive upgrade my-venture --adopt ${pkg.name}`,
        source: "packages/naive/src/engine/upgrade-venture.ts; schema/upgrades.mjs",
        note: "Adopts a package before its phase. If it already fits this phase, the command reports that there is nothing to adopt. The venture directory must already exist.",
      });
    }
    const badges = [];
    if (reg?.channel) badges.push(reg.channel);
    if (pkg.not_modeled) badges.push("not modeled");
    const useCases = [
      ...(pkg.department ? [deptCase(pkg.department)] : []),
      ...included.map(typeCase),
      { id: `kind:${pkg.kind}`, label: pkg.kind, group: "Package kind" },
    ];
    items.push(itemBase({
      slug: `package-${pkg.name}`,
      // A package no venture type lists and the registry does not name has no command to start it, so it is read, not run.
      kind: commands.length ? "template" : "playbook",
      category: "Package",
      title: pkg.title || pkg.name,
      description: pkg.purpose,
      framework: "Naive",
      useCases,
      source: pkg._path,
      sources: [
        { path: pkg._path, note: "package definition" },
        ...(reg ? [{ path: "packages/naive/src/engine/upgrades.json", note: `packages.${pkg.name}` }] : []),
      ],
      commands,
      badges,
      facts: [
        { label: "name", value: pkg.name },
        { label: "kind", value: pkg.kind },
        ...(pkg.department ? [{ label: "department", value: deptLabel.get(pkg.department) ?? pkg.department }] : []),
        ...(pkg.for ? [{ label: "for", value: pkg.for }] : []),
        ...(pkg.why ? [{ label: "why", value: pkg.why }] : []),
        ...(pkg.required?.length ? [{ label: "required", value: pkg.required.join(", ") }] : []),
        ...(pkg.optional?.length ? [{ label: "optional", value: pkg.optional.join(", ") }] : []),
        ...(pkg.refs?.length ? [{ label: "reads", value: pkg.refs.join(", ") }] : []),
        ...(pkg.planned?.length ? [{ label: "planned", value: pkg.planned.join(", ") }] : []),
        ...(pkg.not_modeled ? [{ label: "not_modeled", value: pkg.not_modeled }] : []),
        ...(reg ? [{ label: "channel", value: reg.channel }, { label: "version", value: reg.version }] : []),
        ...(reg?.note ? [{ label: "registry note", value: reg.note }] : []),
        ...(included.length ? [{ label: "listed by", value: included.map((type) => type.id).join(", ") }] : [{ label: "listed by", value: "no venture type" }]),
      ],
      diagram: (pkg.required?.length ? pkg.required : [pkg.kind, pkg.department].filter(Boolean)).slice(0, 6),
    }));
  }

  const docket = (id, title, description, decisions, fileFor, typeIds) => itemBase({
    slug: `docket-${id}`,
    kind: "template",
    category: "Decision docket",
    title,
    description,
    framework: "Naive",
    useCases: typeIds.map((typeId) => typeCase(types.find((type) => type.id === typeId))).filter((entry) => entry.label),
    source: "packages/naive/src/engine/init-venture.ts",
    sources: [
      { path: "packages/naive/src/engine/init-venture.ts", note: id },
      { path: "packages/naive/src/engine/venture-types.json", note: "decisions field" },
    ],
    commands: typeIds.length
      ? [{
        label: "Create a venture that writes this set",
        text: createCommand(typeIds[0]),
        source: CREATE_SOURCE,
        note: `${CREATE_NOTE} Types with decisions ${id === "founding-team" ? "of any id" : id}: ${typeIds.join(", ")}.`,
      }]
      : [],
    facts: decisions.map((decision) => ({ label: decision.id, value: decision.question })),
    sections: decisions.map((decision) => ({
      heading: decision.id,
      text: [
        decision.question,
        decision.options?.length ? `Options: ${decision.options.join(" | ")}` : "",
        fileFor ? `File create-venture writes: ${fileFor(decision.id)}` : "",
      ].filter(Boolean).join("\n"),
    })),
    diagram: decisions.map((decision) => decision.id),
    _types: typeIds,
  });

  const productTypes = types.filter((type) => type.decisions === "product-foundation").map((type) => type.id);
  const fundTypes = types.filter((type) => type.decisions === "fund-foundation").map((type) => type.id);
  items.push(docket("product-foundation", "Product foundation", sets.comments.product, sets.product, productFile, productTypes));
  items.push(docket("fund-foundation", "Fund foundation", sets.comments.fund, sets.fund, fundFile, fundTypes));
  items.push(docket(
    "founding-team",
    "Founding team",
    sets.comments.team,
    [{ id: "founding-team", question: sets.team.question, options: sets.team.options }],
    () => "decisions/venture.team.decision.json",
    types.map((type) => type.id),
  ));

  for (const path of walk(join(naive, "packages/naive/library", "packages"), (file) => file.endsWith(".frame.json"))) {
    const rel = relOf(path);
    const frame = readJson(rel);
    const quote = frame.triggers?.[0];
    const docsCommand = 'npx naive frame "I need investors to scale, but I don\'t want to give up control"';
    const decisionPage = exists("site/content/docs/get-started/decision-library.mdx") ? read("site/content/docs/get-started/decision-library.mdx") : "";
    items.push(itemBase({
      slug: `frame-${frame.id}`,
      kind: "template",
      kinds: ["template", "playbook"],
      category: "Frame",
      title: frame.title,
      description: quote || frame.dichotomy || frame.title,
      framework: "Naive",
      useCases: (frame.functions ?? []).map((id) => ({ id: `fn:${id}`, label: deptLabel.get(id) ?? id, group: "Function" })),
      source: rel,
      sources: [
        { path: rel, note: "frame" },
        { path: "packages/naive/src/interfaces/cli/naive.ts", note: "naive frame" },
        { path: "site/content/docs/get-started/decision-library.mdx", note: "documented command" },
      ],
      commands: [
        ...(decisionPage.includes(docsCommand) ? [{
          label: "Run the frame on a venture",
          text: publishNaive(docsCommand),
          source: "site/content/docs/get-started/decision-library.mdx; interface/cli/naive.mjs",
          note: "The docs print npx naive. The package that provides the naive command is naive-framework. Run it inside a venture.",
        }] : []),
        {
          label: "Run it by id",
          text: `npx -p naive-framework naive frame --frame ${frame.id}`,
          source: "packages/naive/src/interfaces/cli/naive.ts",
          note: "naive frame passes --frame through to schema/frames.mjs. Run it inside a venture, or pass --venture.",
        },
      ],
      prompts: quote ? [{ label: "Trigger recorded on the frame", text: quote, source: rel }] : [],
      facts: [
        { label: "id", value: frame.id },
        ...(frame.functions?.length ? [{ label: "functions", value: frame.functions.join(", ") }] : []),
        ...(frame.dichotomy ? [{ label: "dichotomy", value: frame.dichotomy }] : []),
        ...(frame.reframe ? [{ label: "reframe", value: frame.reframe }] : []),
        ...(frame.goal ? [{ label: "goal", value: frame.goal }] : []),
        ...(frame.composes?.length ? [{ label: "composes", value: frame.composes.join(", ") }] : []),
        { label: "subcommands", value: "list, match, check, eval" },
      ],
      sections: [
        ...(frame.premises ?? []).map((premise) => ({ heading: premise.id, text: `${premise.claim} Attack: ${premise.attack}.` })),
        ...(frame.reasoning?.length ? [{ heading: "Reasoning", text: frame.reasoning.join("\n") }] : []),
        ...(frame.emits ?? []).map((emit) => ({ heading: emit.id, text: emit.question })),
      ],
      diagram: (frame.premises ?? []).map((premise) => premise.id).slice(0, 6),
    }));
  }

  // Skills sit in the function modules (EE-118 step 7): each function's skills/ and kits/, and the interfaces' own skills.
  const functionsDir = join(naive, "packages/naive/src/functions");
  const skillRoots = [...readdirSync(functionsDir).flatMap((f) => ["skills", "kits"].map((k) => `packages/naive/src/functions/${f}/${k}`)), "packages/naive/src/interfaces/skills"];
  for (const root of skillRoots) {
    for (const path of walk(join(naive, root), (file) => file.endsWith("/SKILL.md") || file.endsWith("SKILL.md"))) {
      const rel = relOf(path);
      const text = read(rel);
      const { data, body } = parseFrontmatter(text);
      const name = data.name || rel.split("/").at(-2);
      const layer = rel.startsWith("packages/naive/src/functions/") ? rel.split("/")[4] : "interfaces";
      const inKit = rel.includes("/kits/");
      const description = descriptionWithoutTriggers(data.description || firstParagraph(body) || name);
      const triggers = triggersOf(data.description || "");
      const fences = shellFences(body, 3);
      const inlines = fences.length ? [] : inlineCommands(body, 2);
      const commands = [];
      if (name === "naive-setup") {
        commands.push({
          label: "Read setup state",
          text: "npx -p naive-framework naive setup",
          source: "packages/naive/src/interfaces/cli/naive.ts",
          note: "With no subcommand, naive setup runs packages/naive/src/router/orchestration/setup.ts with state. Run it inside a venture, or pass --venture.",
        });
        if (setupPage.includes("npx naive setup confirm")) {
          commands.push({
            label: "Confirm the answers",
            text: "npx -p naive-framework naive setup confirm",
            source: "site/content/docs/get-started/setup.mdx; packages/naive/src/interfaces/cli/naive.ts",
            note: "The setup page prints npx naive setup confirm. The package that provides the naive command is naive-framework.",
          });
        }
      }
      for (const fence of fences) {
        commands.push({ label: "Command recorded in the skill", text: publishNaive(fence), source: rel });
      }
      for (const inline of inlines) {
        commands.push({ label: "Command recorded in the skill", text: publishNaive(inline), source: rel });
      }
      items.push(itemBase({
        slug: `skill-${name}`,
        kind: "playbook",
        category: "Skill",
        title: name,
        description: description || name,
        framework: inKit || name === "install-mentura" ? "Mentura" : "Naive",
        useCases: [{ id: `layer:${layer}`, label: layer, group: "Layer" }],
        source: rel,
        commands,
        prompts: [
          ...(name === "naive-setup" && setupPage.includes(setupPrompt)
            ? [{ label: "Prompt from the setup page", text: setupPrompt, source: "site/content/docs/get-started/setup.mdx" }]
            : []),
          ...(triggers ? [{ label: "Triggers recorded on the skill", text: triggers, source: rel }] : []),
        ],
        facts: [
          { label: "name", value: name },
          { label: "layer", value: layer },
          ...(data.type ? [{ label: "type", value: data.type }] : []),
        ],
        body,
        diagram: headings(body).slice(0, 5).map((heading) => clip(heading, 40)),
      }));
    }
  }

  if (exists("packages/naive/src/functions/capabilities/handoff-v2.md")) {
    const rel = "packages/naive/src/functions/capabilities/handoff-v2.md";
    const { body } = parseFrontmatter(read(rel));
    items.push(itemBase({
      slug: "handoff-contract",
      kind: "playbook",
      category: "Handoff",
      title: "Handoff contract v2",
      description: firstBlockquote(body) || firstParagraph(body),
      framework: "Naive",
      useCases: [{ id: "layer:operations", label: "operations", group: "Layer" }],
      source: rel,
      sources: [
        { path: rel, note: "contract" },
        { path: "packages/naive/src/records/handoff.schema.json", note: "record shape" },
        { path: "AGENTS.md", note: "check-ready and run-handoff" },
      ],
      commands: [
        {
          label: "Check a handoff is ready",
          text: "node schema/check-ready.mjs <venture dir> <handoff id>",
          source: "packages/naive/src/functions/capabilities/handoff-v2.md; AGENTS.md",
          note: "The contract and AGENTS.md use these placeholders. Record a passing check with --record --by <who>.",
        },
        {
          label: "Run its done-criteria",
          text: "node schema/run-handoff.mjs <venture dir> <handoff id>",
          source: "AGENTS.md",
        },
      ],
      body,
      diagram: ["check-ready", "run-handoff"],
    }));
  }

  const guideDir = join(siteContent, "docs/guides");
  if (existsSync(guideDir)) {
    for (const name of readdirSync(guideDir).filter((file) => file.endsWith(".mdx") && file !== "index.mdx").sort()) {
      const rel = `site/content/docs/guides/${name}`;
      const { data, body } = parseFrontmatter(read(rel));
      const id = name.replace(/\.mdx$/, "");
      const fences = shellFences(body, 2);
      const ask = (body.match(/Ask the agent to call[^\n.]+/) || [])[0];
      items.push(itemBase({
        slug: `guide-${id}`,
        kind: "playbook",
        category: "Guide",
        title: data.title,
        description: data.description,
        framework: "Naive",
        useCases: [{ id: "layer:docs", label: "docs", group: "Layer" }],
        source: rel,
        commands: fences.map((text) => ({ label: "Command from the guide", text: publishNaive(text), source: rel })),
        prompts: ask ? [{ label: "Prompt from the guide", text: plain(ask), source: rel }] : [],
        badges: data.status ? [data.status] : [],
        facts: [
          ...(data.type ? [{ label: "type", value: data.type }] : []),
          ...(data.status ? [{ label: "status", value: data.status }] : []),
        ],
        body,
        diagram: headings(body).slice(0, 4).map((heading) => clip(heading, 40)),
      }));
    }
  }

  // Playbooks other branches add at library/packages/<function>/playbooks/. None are on this
// branch yet. A JSON file uses id, title, purpose, when, and steps. A Markdown file
// uses a heading. The directory name is the venture function.
for (const name of readdirSync(join(naive, "packages/naive/library", "packages"))) {
  const dir = join(naive, "packages/naive/library", "packages", name, "playbooks");
  if (!existsSync(dir)) continue;
  for (const file of walk(dir, (entry) => entry.endsWith(".json") || entry.endsWith(".md"))) {
    const rel = relOf(file);
    const base = rel.split("/").at(-1);
    if (base === "README.md") continue;
    if (file.endsWith(".json")) {
      const playbook = readJson(rel);
      if (!playbook.id || !playbook.title || !(playbook.purpose || playbook.when)) continue;
      const fn = playbook.function || name;
      items.push(itemBase({
        slug: `playbook-${fn}-${playbook.id}`,
        kind: "playbook",
        category: "Playbook",
        title: playbook.title,
        description: playbook.purpose || playbook.when,
        framework: "Naive",
        useCases: [{ id: `fn:${fn}`, label: deptLabel.get(fn) ?? fn, group: "Function" }],
        source: rel,
        commands: typeof playbook.command === "string"
          ? [{ label: "Command recorded on the playbook", text: playbook.command, source: rel }]
          : [],
        prompts: playbook.when ? [{ label: "When to offer it", text: playbook.when, source: rel }] : [],
        facts: [
          { label: "id", value: playbook.id },
          { label: "function", value: fn },
          ...(playbook.phase ? [{ label: "phase", value: playbook.phase }] : []),
          ...(playbook.steps?.length ? [{ label: "steps", value: String(playbook.steps.length) }] : []),
        ],
        sections: (playbook.steps ?? []).map((step) => ({
          heading: step.title || step.id,
          text: [step.goal, step.done_when ? `Done when: ${step.done_when}` : "", ...(step.conversation ?? [])].filter(Boolean).join("\n"),
        })),
        diagram: (playbook.steps ?? []).map((step) => step.title || step.id).slice(0, 5),
      }));
    } else {
      const { data, body } = parseFrontmatter(read(rel));
      const title = data.title || (body.match(/^#\s+(.+)$/m) || [])[1];
      if (!title) continue;
      const id = (data.name || base.replace(/\.md$/, "")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      items.push(itemBase({
        slug: `playbook-${name}-${id}`,
        kind: "playbook",
        category: "Playbook",
        title: plain(title),
        description: data.description || firstParagraph(body) || plain(title),
        framework: "Naive",
        useCases: [{ id: `fn:${name}`, label: deptLabel.get(name) ?? name, group: "Function" }],
        source: rel,
        commands: shellFences(body, 3).map((text) => ({ label: "Command recorded in the playbook", text, source: rel })),
        prompts: data.when ? [{ label: "When to offer it", text: String(data.when), source: rel }] : [],
        body,
        diagram: headings(body).slice(0, 5),
      }));
    }
  }
}

for (const path of readdirSync(join(naive, "packages/naive/src/functions")).flatMap((f) => walk(join(naive, "packages/naive/src/functions", f, "frameworks"), (file) => file.endsWith(".md")))) {
    const rel = relOf(path);
    const { data, body } = parseFrontmatter(read(rel));
    const tags = tagsOf(data.tags);
    if (!tags.includes("playbook") && !tags.includes("handoff")) continue;
    const category = tags.includes("playbook") ? "Playbook" : "Handoff";
    const title = (body.match(/^#\s+(.+)$/m) || [])[1];
    items.push(itemBase({
      slug: `${category === "Playbook" ? "playbook" : "framework"}-${rel.split("/").at(-1).replace(/\.md$/, "")}`,
      kind: "playbook",
      category,
      title: plain(title || rel),
      description: firstParagraph(body) || plain(title),
      framework: null,
      useCases: tags.filter((tag) => !["playbook", "handoff", "methodology"].includes(tag)).slice(0, 4).map((tag) => ({ id: `tag:${tag}`, label: tag, group: "Tag" })),
      source: rel,
      commands: shellFences(body, 3).map((text) => ({ label: "Command recorded in the file", text, source: rel })),
      badges: data.status ? [String(data.status)] : [],
      facts: [
        ...(data.status ? [{ label: "status", value: String(data.status) }] : []),
        { label: "tags", value: tags.join(", ") },
      ],
      body,
      diagram: headings(body).slice(0, 5).map((heading) => clip(heading, 40)),
    }));
  }

  const slugs = new Map();
  for (const entry of items) {
    if (!entry.title || !entry.description || !entry.source || !entry.slug) {
      throw new Error(`catalog: incomplete record ${entry.slug || entry.source}`);
    }
    if (slugs.has(entry.slug)) throw new Error(`catalog: duplicate slug ${entry.slug}`);
    slugs.set(entry.slug, entry);
    entry.commands = entry.commands.filter((command) => commandRunnable(command.text, naive));
    if (entry.kind === "template" && !entry.commands.length && !entry.prompts.length) {
      throw new Error(`catalog: template ${entry.slug} has no command and no prompt`);
    }
    if (!exists(entry.source)) throw new Error(`catalog: ${entry.slug} names a missing file ${entry.source}`);
    entry.docs = docsFor(docsMap, entry);
    entry.diagram = (entry.diagram.length ? entry.diagram : [entry.category]).map((line) => clip(line, 42));
  }

  const bySlug = (slug) => slugs.get(slug);
  for (const entry of items) {
    if (entry.category === "Venture type") {
      entry.related = [
        ...(entry._packages ?? []).filter((name) => bySlug(`package-${name}`)).map((name) => ({ slug: `package-${name}`, label: bySlug(`package-${name}`).title })),
        ...(entry._decisions && entry._decisions !== "none" && bySlug(`docket-${entry._decisions}`)
          ? [{ slug: `docket-${entry._decisions}`, label: bySlug(`docket-${entry._decisions}`).title }]
          : []),
        { slug: "docket-founding-team", label: "Founding team" },
      ];
    }
    if (entry.category === "Package") {
      const name = entry.facts.find((fact) => fact.label === "name")?.value;
      entry.related = items
        .filter((other) => other.category === "Venture type" && (other._packages ?? []).includes(name))
        .map((other) => ({ slug: other.slug, label: other.title }));
    }
    if (entry.category === "Decision docket") {
      entry.related = (entry._types ?? [])
        .map((id) => bySlug(`type-${id}`))
        .filter(Boolean)
        .map((other) => ({ slug: other.slug, label: other.title }));
    }
    if (entry.category === "Frame") {
      const finance = bySlug("package-finance");
      entry.related = finance ? [{ slug: finance.slug, label: finance.title }] : [];
    }
    if (entry.category === "Kit") {
      const extended = entry.facts.find((fact) => fact.label === "extends package")?.value;
      const pkg = extended && bySlug(`package-${extended}`);
      entry.related = pkg ? [{ slug: pkg.slug, label: pkg.title }] : [];
    }
    delete entry._packages;
    delete entry._decisions;
    delete entry._types;
    for (const link of entry.related) {
      if (!slugs.has(link.slug)) throw new Error(`catalog: ${entry.slug} links to a missing detail page ${link.slug}`);
    }
  }

  const categoryOrder = ["Venture type", "Package", "Decision docket", "Frame", "Kit", "Skill", "Handoff", "Guide", "Playbook"];
  items.sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category);
    const bi = categoryOrder.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return a.title.localeCompare(b.title);
  });

  return {
    items,
    sources: [
      "packages/naive/src/engine/venture-types.json",
      "packages/naive/library/packages/*/package.json",
      "packages/naive/library/packages/catalog.json",
      "packages/naive/src/engine/upgrades.json",
      "packages/naive/src/engine/init-venture.ts",
      "packages/naive/library/packages/*/frames/*.frame.json",
      "packages/naive/library/packages/*/playbooks/*",
      "**/SKILL.md",
      "packages/naive/src/functions/capabilities/handoff-v2.md",
      "site/content/docs/guides/*.mdx",
      "packages/naive/src/functions/*/frameworks/*.md",
    ],
  };
}

let memo;
export function loadCatalog() {
  if (!memo) memo = build();
  return memo;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { items } = loadCatalog();
  const counts = {};
  for (const entry of items) counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  console.log(JSON.stringify({ total: items.length, counts, missingDocs: items.filter((entry) => !entry.docs.length).map((entry) => entry.slug) }, null, 2));
}
