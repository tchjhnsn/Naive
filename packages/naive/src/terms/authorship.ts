// The process that writes a record (EE-187). The people and roles inside the venture are subjects.
// This module reads the process and builds the provenance agent. It never copies a subject in as the author.
//
// MENTURA_ACTOR, MENTURA_ACTOR_ID, MENTURA_MODEL, MENTURA_SESSION and MENTURA_HARNESS name the process.
// An agent process is kind agent with that id. A person process is kind person. --by may name a person
// only when the process is a person and MENTURA_ACTOR_ID is unset. An agent ignores --by.

import { agentFromEnv, type EntryAgent } from "../core/provenance.ts";
import { run } from "./engine.ts";
import type { Authorship } from "./levels.ts";
import { faithfulAuthor } from "./terms.ts";

export type AuthorKind = "person" | "agent" | "unverified";

export type AuthorRequest = {
  via: string;
  /** A person named with --by. Used only when the kind is person and MENTURA_ACTOR_ID is unset. */
  by?: string;
  /** An account a door checked. Kept only on a person. */
  account?: string;
  /**
   * The kind to use when MENTURA_ACTOR does not name the process.
   * Ignored when MENTURA_ACTOR is agent or person. The CLI door passes person. A door with no
   * sign-in passes unverified.
   */
  claim?: AuthorKind;
};

/** The kind MENTURA_ACTOR names, or unverified when it names neither person nor agent. */
export function processKind(): AuthorKind {
  const said = process.env.MENTURA_ACTOR?.trim().toLowerCase();
  if (said === "agent") return "agent";
  if (said === "person") return "person";
  return "unverified";
}

/** Facts for one write. Names stay out of them. */
export function authorshipFacts(process: AuthorKind, written: AuthorKind, subjectCopied: boolean, confirmed = true): Authorship {
  return {
    confirmed,
    processPerson: process === "person",
    processAgent: process === "agent",
    processUnverified: process === "unverified",
    writtenPerson: written === "person",
    writtenAgent: written === "agent",
    writtenUnverified: written === "unverified",
    subjectCopied,
  };
}

/**
 * The provenance agent for this process. The subject of the record is not an argument: it is not
 * the author. The faithful-author term judges the result, and a process that is not exactly one
 * matching kind is refused.
 */
export function authorFromProcess(input: AuthorRequest): EntryAgent {
  const envKind = processKind();
  const kind: AuthorKind = envKind === "unverified" ? (input.claim ?? "unverified") : envKind;
  const extra: Record<string, unknown> = {};
  if (kind === "person" && !process.env.MENTURA_ACTOR_ID && input.by) extra.id = input.by;
  if (kind === "person" && input.account) extra.account = input.account;
  const agent = agentFromEnv(kind, input.via, extra);
  const verdict = run(faithfulAuthor, authorshipFacts(kind, kind, false));
  if (!verdict.pass) throw new Error(`faithful author refused this process: ${verdict.failed.join(", ")}`);
  return agent;
}
