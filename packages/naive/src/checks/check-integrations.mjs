// Checks every layer's tooling/integrations.json for the rules one entry's schema cannot
// state: ids are unique within a layer, each entry's layer matches its folder, and every
// entry under interface/ is an interface: it names its kind and reaches at least three of
// the five other layers in one session (four of six before execution folded into operations, EE-038). A tool that serves one or two layers is an
// integration of those layers (Obsidian under knowledge), however good its screen is.
//
//   node packages/naive/src/checks/check-integrations.mjs

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// EE_ROOT points the check at another copy of the repository (used by packages/naive/src/checks/test.mjs).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
const MIN_REACH = 3;
const errors = [];
let count = 0;
for (const layer of readdirSync(root)) {
  const f = join(root, layer, "tooling/integrations.json");
  if (!existsSync(f)) continue;
  const ids = new Set();
  for (const t of JSON.parse(readFileSync(f, "utf8"))) {
    count++;
    if (ids.has(t.id)) errors.push(`${layer}: duplicate id ${t.id}`);
    ids.add(t.id);
    if (t.layer !== layer) errors.push(`${layer}/${t.id}: layer says ${t.layer}`);
    if (layer === "interface") {
      if (!t.interface_kind) errors.push(`interface/${t.id}: no interface_kind`);
      if ((t.reach ?? []).length < MIN_REACH) errors.push(`interface/${t.id}: reaches ${(t.reach ?? []).length} layers; an interface reaches at least ${MIN_REACH}, so list it under the layers it serves`);
    } else if (t.reach || t.interface_kind) errors.push(`${layer}/${t.id}: reach and interface_kind belong to interface entries only`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${count} integrations: every interface reaches at least ${MIN_REACH} layers.`);
