#!/usr/bin/env node
// Faithful author (EE-188). Judges one write: the process kind, the kind written on the provenance
// line, and whether the subject was copied in as the author. It reads no venture, so an old record
// is not failed for a field it does not have. The decision is the faithful-author term.
//
//   node packages/naive/src/checks/check-authorship.ts --process <person|agent|unverified> --written <person|agent|unverified> [--subject-copied] [--unconfirmed]

import { run } from "../terms/engine.ts";
import { authorshipFacts, type AuthorKind } from "../terms/authorship.ts";
import { faithfulAuthor } from "../terms/terms.ts";

const KINDS = ["person", "agent", "unverified"] as const;

export function judgeAuthorship(process: AuthorKind, written: AuthorKind, subjectCopied: boolean, confirmed = true) {
  return run(faithfulAuthor, authorshipFacts(process, written, subjectCopied, confirmed));
}

function isKind(s: string | undefined): s is AuthorKind {
  return (KINDS as readonly string[]).includes(s ?? "");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n: string): string | undefined => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const processKindArg = opt("process");
  const written = opt("written");
  if (!isKind(processKindArg) || !isKind(written)) {
    console.error("usage: node packages/naive/src/checks/check-authorship.ts --process <person|agent|unverified> --written <person|agent|unverified> [--subject-copied] [--unconfirmed]");
    process.exit(2);
  }
  const verdict = judgeAuthorship(processKindArg, written, argv.includes("--subject-copied"), !argv.includes("--unconfirmed"));
  if (verdict.pass) console.log("pass");
  else console.error(`fail: ${verdict.failed.join(", ")}`);
  process.exit(verdict.pass ? 0 : 1);
}
