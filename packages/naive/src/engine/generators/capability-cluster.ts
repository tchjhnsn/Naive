// Record generator for the capability cluster catalog (EE-099; lead agents design, "Capability clusters and
// connections"). The catalog is packages/naive/src/functions/it/capability-clusters.json in the framework, so the
// generator adds one cluster to what the file holds now, with an id unique in the file. It is a change to the
// framework (a pull request), not a venture route, and the catalog names no vendor: the schema allows no field for one.
import { join } from "node:path";
import { cli, drop, questions, readJson, repo, schemaOf, slug, validate } from "./generate.mjs";
import type { CapabilityCluster } from "../../records/types/records.d.ts";

export const record = "capability-cluster";
export const FILE = "packages/naive/src/functions/it/capability-clusters.json";
type Cluster = CapabilityCluster["clusters"][number];
export const describe = () => ({ record, ask: questions(schemaOf(record).properties.clusters.items, "clusters[]."),
  derived: { id: "a slug of the title unless given; a cluster already in the file is refused" } });

export function draft(a: Partial<Cluster>, { root = repo }: { root?: string } = {}) {
  if (!a.title || !a.functions?.length || !a.gaps?.length || !a.why) return { ok: false, record, errors: ["a capability cluster needs a title, the functions that depend on it, its gap kinds and why"] };
  const now = (readJson(join(root, FILE)) ?? { version: "0.1.0", gap_kinds: [], clusters: [] }) as CapabilityCluster;
  const id = slug(a.id ?? a.title);
  if (now.clusters.some((c) => c.id === id)) return { ok: false, record, errors: [`the catalog already has a cluster ${id}`] };
  const cluster = drop({ id, title: a.title, functions: a.functions, gaps: a.gaps, why: a.why, thesis: a.thesis }) as Cluster;
  const rec = { ...now, clusters: [...now.clusters, cluster] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, added: id, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
