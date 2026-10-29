#!/usr/bin/env node
// Draws a release card (P-25, O-7). The card's data is assembled by code from the release's records
// (schema/releases.mjs cardOf, written to <venture>/.release/card.json); drawing it is the interface's
// job, so the picture lives here and never in the release. It is a 1200 by 630 SVG, the size link
// previews use, with the venture's name, phase, headline numbers with their dates, and who confirmed them.
//
//   node interface/release-card.mjs <venture dir>     prints the SVG

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const day = (t) => (t ? String(t).slice(0, 10) : "");

/** The card as SVG text. */
export function svg(card) {
  const nums = card.headline.filter((h) => h.label !== "Live holes").slice(0, 4);
  const cell = (h, i) => {
    const x = 60 + i * 275;
    return `<text x="${x}" y="330" font-size="64" font-weight="700" fill="#111">${esc(h.value)}${h.unit ? `<tspan font-size="24"> ${esc(h.unit)}</tspan>` : ""}</text>
  <text x="${x}" y="370" font-size="22" fill="#333">${esc(h.label)}</text>
  <text x="${x}" y="400" font-size="18" fill="#666">as of ${esc(day(h.as_of))}</text>`;
  };
  const by = card.confirmed_by.length ? `Confirmed by ${card.confirmed_by.join(", ")}` : "Nothing confirmed yet";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="system-ui, sans-serif" role="img" aria-label="${esc(card.name)} release card">
  <rect width="1200" height="630" fill="#fafaf7"/>
  <rect x="0" y="0" width="1200" height="12" fill="#1f6f5c"/>
  <text x="60" y="120" font-size="64" font-weight="700" fill="#111">${esc(card.name)}</text>
  <text x="60" y="175" font-size="28" fill="#333">Phase: ${esc(card.phase)}</text>
  ${nums.map(cell).join("\n  ")}
  <text x="60" y="520" font-size="22" fill="#333">${esc(by)}</text>
  <text x="60" y="560" font-size="18" fill="#666">Release ${esc(card.release)}, built ${esc(day(card.built_at))}</text>
</svg>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  const f = dir && join(dir, ".release/card.json");
  if (!f || !existsSync(f)) { console.error("usage: node interface/release-card.mjs <venture dir> (after node schema/build-release.mjs)"); process.exit(2); }
  process.stdout.write(svg(JSON.parse(readFileSync(f, "utf8"))));
}
