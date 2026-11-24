// A Use command is runnable when it is a real program invocation: no angle-bracket
// placeholders, not a question, and every node script it names is a file in the repo.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PLACEHOLDER = /<[^>\n]+>/;

export function commandRunnable(text, repo) {
  const raw = String(text ?? "").trim();
  if (!raw || PLACEHOLDER.test(raw) || raw.includes("~/")) return false;
  if (/\?\s*$/.test(raw) || /^(Is|Are|Do|Does|What|When|Which|How)\b/.test(raw)) return false;
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return false;
  let sawProgram = false;
  for (const line of lines) {
    if (/^(npx|git|curl|claude|pnpm|yarn|bun|grep|test|cd)\b/.test(line) || /\bnode\b/.test(line)) sawProgram = true;
    for (const match of line.matchAll(/(?:^|&&|;)\s*node\s+(\S+)(.*)$/g)) {
      const script = match[1];
      const rest = match[2].trim();
      if (script.startsWith("-")) continue;
      if (!script.includes("/") && !/\.(mjs|js|py)$/.test(script)) continue;
      if (!repo || !existsSync(join(repo, script))) return false;
      if (!rest) {
        const head = readFileSync(join(repo, script), "utf8");
        if (/usage:[^\n]*</i.test(head)) return false;
      }
      sawProgram = true;
    }
  }
  return sawProgram;
}
