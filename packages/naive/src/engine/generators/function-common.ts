// What the three function-module generators share: the decision classes no function may loosen, and the helpers.
import { join } from "node:path";
import { cli, questions, readJson, repo, schemaOf, slug, validate } from "./generate.mjs";

export { cli, slug, validate };
export const describeFrom = (record: string, extra: Record<string, string>) => ({ record, ask: questions(schemaOf(record)), ...extra });
export const personOnly = (): Set<string> => {
  const d = readJson(join(repo, "packages/naive/template/governance/delegation.json")) as { one_way_doors?: string[], never_redelegated?: string[] } | null;
  return new Set([...(d?.one_way_doors ?? []), ...(d?.never_redelegated ?? [])]);
};
