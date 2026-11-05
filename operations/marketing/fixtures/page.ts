// A stand-in channel builder for the publish build tests: writes artifact/index.html under
// NAIVE_PUBLISH_OUT from generated/venture-facts.json alone (run facts.ts first), the way an app's
// one-page artifact reads only the compiled facts and never a venture record.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const out = process.env.NAIVE_PUBLISH_OUT;
if (!out) throw new Error("NAIVE_PUBLISH_OUT must be set");
const root = resolve(out);
const facts: Record<string, { value?: unknown } | undefined> = JSON.parse(readFileSync(join(root, "generated/venture-facts.json"), "utf8"));
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fact = (name: string): string => {
  const v = facts[name]?.value;
  return typeof v === "string" ? `<p>${esc(v)}</p>` : Array.isArray(v) ? `<ul>${v.map((x) => `<li>${esc(String(x))}</li>`).join("")}</ul>` : "";
};

const page = `<title>Venture</title>
<h1>The problem</h1>${fact("problem")}
<h2>Who it is for</h2>${fact("segment")}${fact("forms")}
<h2>The promise</h2>${fact("promise")}${fact("tagline")}
`;
mkdirSync(join(root, "artifact"), { recursive: true });
writeFileSync(join(root, "artifact/index.html"), page);
