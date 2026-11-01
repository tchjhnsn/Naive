#!/usr/bin/env node
// The pitch check for packages/product/playbooks/basecamp-shape-up.md.
// Passes when the cycle brief has the handoff sections check-ready.mjs requires
// (Outcome, Work) and the five pitch sections, and the appetite names six weeks.
// A blank section or any other appetite fails.
//
//   node verification/playbook-basecamp-shape-up/pitch-check.mjs <brief.md>

import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node verification/playbook-basecamp-shape-up/pitch-check.mjs <brief.md>");
  process.exit(2);
}

const brief = readFileSync(file, "utf8");
const section = (name) => {
  const body = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = brief.match(new RegExp(`^##\\s+(?:\\d+\\.\\s*)?${body}\\b[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, "mi"));
  return m ? m[1].trim() : "";
};

const need = ["Outcome", "Work", "Problem", "Appetite", "Solution", "Rabbit holes", "No-gos"];
const missing = need.filter((name) => !section(name));
const six = /six weeks/i.test(section("Appetite"));
if (missing.length || !six) {
  const parts = [];
  if (missing.length) parts.push(`missing ${missing.join(", ")}`);
  if (!six) parts.push("appetite does not name six weeks");
  console.error(parts.join("; "));
  process.exit(1);
}
console.log("pitch check passed");
