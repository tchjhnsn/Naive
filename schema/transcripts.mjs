// Reading agent session transcripts: the transcript files under a folder, and the human's own words in one
// transcript line, and the folder walk under both. schema/activity.mjs and scripts/diagnose-transcripts.mjs both read transcripts this way.
// It moved here from scripts/diagnose-transcripts.mjs in step 4b of the router inversion, so that
// schema/activity.mjs no longer imports scripts/; the diagnosis script imports it and re-exports both.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function* walk(dir, depth = 0) {
  if (depth > 6 || !existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".naive", "raw"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, depth + 1);
    else yield p;
  }
}
export function* transcriptFiles(dir) {
  for (const p of [...walk(dir)].filter((p) => p.endsWith(".jsonl")).sort()) yield p;
}

// The human's own words in one transcript line, or null: no tool results, meta lines, commands or reminders.
export function humanText(entry) {
  if (entry?.type !== "user" || entry.isMeta || entry.isSidechain || entry.isCompactSummary || entry.isVisibleInTranscriptOnly || entry.message?.role !== "user") return null;
  const c = entry.message.content;
  const parts = typeof c === "string" ? [c] : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text) : [];
  const text = parts.join("\n")
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<(command-[a-z-]+|local-command-[a-z-]+|bash-[a-z-]+|task-notification|user-prompt-submit-hook|ide_[a-z_]+)>[\s\S]*?<\/\1>/g, "")
    .trim();
  return text || null;
}
