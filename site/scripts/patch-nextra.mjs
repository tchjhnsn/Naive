// Two guards for Nextra 4.6.1, applied after install until a release includes them.
//
// 1. A code fence whose info string contains title="…" makes rehype-pretty-code emit
//    a figure whose first child has no properties. The theme plugin then throws.
// 2. LayoutPropsSchema requires children, but Layout parses the props after removing
//    children, so Zod 4 rejects every docs page. Pass children through.
//
//   node scripts/patch-nextra.mjs

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// The repository is an npm workspace, so a dependency may be hoisted to the root node_modules.
// Find the package in the nearest node_modules that has it, walking up from the site.
function packageFile(name, file) {
  for (let dir = join(import.meta.dirname, ".."); ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name, file);
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) throw new Error(`${name} is not installed`);
  }
}

function replaceOnce(fileUrl, from, to, label) {
  const source = readFileSync(fileUrl, "utf8");
  if (source.includes(to)) {
    console.log(`${label} already applied`);
    return;
  }
  if (!source.includes(from)) {
    console.error(`${label} target not found`);
    process.exit(1);
  }
  writeFileSync(fileUrl, source.replace(from, to));
  console.log(`patched ${label}`);
}

replaceOnce(
  packageFile("nextra", "dist/server/rehype-plugins/rehype.js"),
  "delete node.children[0].properties.className;",
  "if (node.children[0]?.properties) delete node.children[0].properties.className;",
  "nextra code-fence highlighting",
);

replaceOnce(
  packageFile("nextra-theme-docs", "dist/layout.js"),
  "LayoutPropsSchema.safeParse(themeConfig)",
  "LayoutPropsSchema.safeParse({ ...themeConfig, children })",
  "nextra layout children",
);
