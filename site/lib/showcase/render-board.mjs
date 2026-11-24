// Writes site/public/showcase/<id>.svg from site/content/showcase/entries.ts.
// Run from the repo root: node site/lib/showcase/render-board.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../../..");
// Every entry's sources are Naive's example ventures and frameworks, in the installed naive-framework package.
const naive = [join(repo, "node_modules/naive-framework"), join(repo, "site/node_modules/naive-framework")].find((d) => existsSync(join(d, "package.json"))) ?? join(repo, "node_modules/naive-framework");
const source = readFileSync(join(here, "../../content/showcase/entries.ts"), "utf8");
const data = JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf("}") + 1));
const outDir = join(here, "../../public/showcase");

const PHASE = {
  discovery: "Discovery",
  validation: "Validation",
  beachhead: "Beachhead",
  scale: "Scale",
  platform: "Platform",
};

const esc = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function assertPath(path) {
  if (!existsSync(join(naive, path))) throw new Error(`missing source: ${path}`);
}

function shortPath(path) {
  const parts = path.split("/");
  if (parts.length <= 3) return path;
  return `…/${parts.slice(-3).join("/")}`;
}

function board(entry) {
  const pieces = entry.pieces.map((piece) => piece.name);
  const chips = [];
  let x = 88;
  let y = 470;
  for (const label of pieces) {
    const width = Math.max(92, label.length * 13 + 36);
    if (x + width > 1112) {
      x = 88;
      y += 48;
    }
    chips.push(`<g><rect x="${x}" y="${y}" width="${width}" height="34" rx="17" fill="#e8eef5"/><text x="${x + width / 2}" y="${y + 22}" text-anchor="middle" fill="#1d4e89" font-size="15" font-family="ui-sans-serif, system-ui, sans-serif">${esc(label)}</text></g>`);
    x += width + 12;
  }
  const stamp = entry.example
    ? `<rect x="88" y="196" width="132" height="32" rx="16" fill="#f4efe4"/><text x="154" y="217" text-anchor="middle" fill="#6b4e16" font-size="13" font-family="ui-sans-serif, system-ui, sans-serif" letter-spacing="1.2">EXAMPLE</text>`
    : `<rect x="88" y="196" width="196" height="32" rx="16" fill="#d5e3f4"/><text x="186" y="217" text-anchor="middle" fill="#1d4e89" font-size="13" font-family="ui-sans-serif, system-ui, sans-serif" letter-spacing="1.2">THIS REPOSITORY</text>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750" role="img" aria-label="${esc(`Record board for ${entry.name}`)}">
  <rect width="1200" height="750" fill="#e7eef6"/>
  <rect x="40" y="36" width="1120" height="678" rx="28" fill="#ffffff"/>
  <rect x="40" y="36" width="1120" height="248" rx="28" fill="#1d4e89"/>
  <rect x="40" y="240" width="1120" height="44" fill="#1d4e89"/>
  <text x="88" y="92" fill="#d5e3f4" font-size="14" font-family="ui-sans-serif, system-ui, sans-serif" letter-spacing="2.4">FROM THE RECORDS</text>
  <text x="88" y="164" fill="#ffffff" font-size="52" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="650">${esc(entry.name)}</text>
  ${stamp}
  <text x="1040" y="217" text-anchor="end" fill="#d5e3f4" font-size="18" font-family="ui-sans-serif, system-ui, sans-serif">${esc(PHASE[entry.phase] ?? entry.phase)}</text>
  <text x="88" y="340" fill="#3f3f46" font-size="16" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">${esc(shortPath(entry.source))}</text>
  <text x="88" y="420" fill="#141416" font-size="22" font-family="ui-sans-serif, system-ui, sans-serif">On the records</text>
  ${chips.join("\n  ")}
  <text x="88" y="668" fill="#3f3f46" font-size="15" font-family="ui-sans-serif, system-ui, sans-serif">Record board. Not a product screenshot.</text>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
for (const entry of data.entries) {
  assertPath(entry.source);
  if (entry.directory) assertPath(entry.directory);
  for (const citation of entry.citations) assertPath(citation.path);
  for (const piece of entry.pieces) assertPath(piece.source);
  const file = join(outDir, `${entry.id}.svg`);
  writeFileSync(file, board(entry));
  console.log(file);
}
assertPath("packages/naive/library/packages/finance/frames/fund-without-ceding-control.frame.json");
console.log(`${data.entries.length} boards`);
