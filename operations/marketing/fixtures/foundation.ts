// A stand-in channel builder for the publish build tests: writes artifact/foundation.html under
// NAIVE_PUBLISH_OUT, the venture's strategic foundation (packages/naive/src/engine/foundation.mjs) with each statement's
// status. A statement's words reach the page only through packages/naive/src/engine/visibility.mjs publicValue; every other
// statement shows as not yet public.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { filesOf, foundation } from "../../../packages/naive/src/engine/foundation.mjs";
import { publicValue } from "../../../packages/naive/src/engine/visibility.mjs";

const venture = process.env.NAIVE_VENTURE, out = process.env.NAIVE_PUBLISH_OUT;
if (!venture || !out) throw new Error("NAIVE_VENTURE and NAIVE_PUBLISH_OUT must be set");
const dir = resolve(venture);

type Statement = { id?: string, status?: string, record?: string, attribute?: string };
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const show = (v: unknown): string => typeof v === "string" ? esc(v) : Array.isArray(v) ? v.map((x) => show(typeof x === "object" && x && "statement" in x ? x.statement : x)).join("; ") : esc(JSON.stringify(v));

// A statement's public words, or null: one record file, one named field, through the gate.
function publicOf(s: Statement): string | null {
  if (!s.record || !s.attribute || s.attribute === ".") return null;
  const files: string[] = filesOf(dir, s.record).filter((f: string) => existsSync(join(dir, f)));
  if (files.length !== 1) return null;
  const p = publicValue(dir, files[0], s.attribute);
  return p ? show(p.value) : null;
}

const questions: { question: string, statements: Statement[] }[] = foundation(dir);
const page = `<title>Strategic foundation</title>
<h1>Strategic foundation</h1>
${questions.map((q) => `<section id="${esc(q.question)}"><h2>${esc(q.question)}</h2>
${q.statements.map((s) => `<h3>${esc(s.id ?? "")} (${esc(s.status ?? "")})</h3><p>${publicOf(s) ?? "Not yet public."}</p>`).join("\n")}
</section>`).join("\n")}
`;
mkdirSync(join(resolve(out), "artifact"), { recursive: true });
writeFileSync(join(resolve(out), "artifact/foundation.html"), page);
