// Command routes contributed by the function modules in schema/ (brand, the lint suites, the cache).
// They are data: a route, the script that runs it, a note and options. They live here, below schema/,
// so that the route table can list them without importing schema/; each module re-exports its list.

export const BRAND_ROUTES = { "marketing-brand": "marketing/brand", "marketing-design-system": "marketing/design-system", "public-assets": "public/assets", glossary: "glossary" };

/** packages/naive/src/engine/brand.mjs: its command routes, built with the route table's cmd(). */
export const brandCommands = (cmd) => [
  cmd("marketing/brand/tokens", "packages/naive/src/engine/brand.mjs", "The venture's brand tokens (Y-3): colors and typefaces as W3C design tokens, the CSS custom properties and @font-face rules an interface loads, each scope as its own selector, and the head links for the venture's marks (P-24)", { args: ["tokens"] }),
  cmd("marketing/brand/resolve", "packages/naive/src/engine/brand.mjs", "The brand at one route (Y-5, T-2): the venture brand with every scope that covers the route applied, nearer last, and which scope set each value; input value is the route", { value_flag: "--for" }),
  cmd("marketing/design-system/inputs", "packages/naive/src/engine/design-system.mjs", "What the design system inherits from other functions, by key: the mission, the problem and segment, each ICP profile, the alignment principles, each product's market and each founder. A design choice's from names these keys", { args: ["inputs"] }),
  cmd("marketing/design-system/check", "packages/naive/src/engine/design-system.mjs", "Every design choice rests on inputs that still exist: a retired ICP or a new mission names the brand choices to revisit", { args: ["check"] }),
  cmd("marketing/brand-lint", "packages/naive/src/engine/brand-lint.mjs", "Brand alignment lint: decision records and marketing content against the design system (avoid words, jargon, unknown audiences, unsourced choices); fail-open unless naive.config.json brand_lint.rules.<id>.mode is fail-closed", { args: [] }),
  cmd("marketing/voice", "packages/naive/src/engine/brand.mjs", "Marketing content held to the voice rules, the global stylesheet for words (Y-3): each phrase to avoid, where it is and what to use instead; and terms another package keeps local (Y-2)", { args: ["voice"] }),
  cmd("glossary/terms", "packages/naive/src/engine/brand.mjs", "The terms one package sees (Y-2): its own glossary and the terms other packages export; their local terms stay with them. Input value is the package", { value_flag: "--package" }),
  cmd("marketing/sitemap/xml", "packages/naive/src/engine/brand.mjs", "sitemap.xml rendered from the marketing sitemap record (P-26), for a release; input value is the site's base URL", { value_flag: "--base" }),
  cmd("public/assets/facts", "packages/naive/src/engine/assets.mjs", "What code reads from each file in public/ (J-4): type from the bytes, width and height, icon sizes, bytes and sha256. Agents copy these, never guess them", { args: ["facts"] }),
];

/** packages/naive/src/checks/lint-investors.mjs: its command routes, built with the route table's cmd(). */
export const investorsLintCommands = (cmd) => [
  cmd("investors/lint", "packages/naive/src/checks/lint-investors.mjs", "Investors lint: a raise decision with no use of funds, terms that conflict with an alignment principle, and an investor update with unconfirmed numbers; fail-open unless naive.config.json investors_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

/** packages/naive/src/checks/lint-product.mjs: its command routes, built with the route table's cmd(). */
export const productCommands = (cmd) => [
  cmd("product/lint", "packages/naive/src/checks/lint-product.mjs", "Product alignment lint: a product offered to no ICP, a feature that serves no job of those ICPs, or a business model with no pricing record. Fail-open unless naive.config.json product_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

/** packages/naive/src/checks/lint-money.mjs: its command routes, built with the route table's cmd(). */
export const moneyCommands = (cmd) => [
  cmd("money/lint", "packages/naive/src/checks/lint-money.mjs", "Money lint: a transfer decision with no named approver, and an account with no owner. Fail-open unless naive.config.json money_lint.rules.<id>.mode is fail-closed. Reads records through ventureFile and does not move money.", { args: [] }),
];

/** packages/naive/src/checks/lint-customers.mjs: its command routes, built with the route table's cmd(). */
export const customersLintCommands = (cmd) => [
  cmd("customers/lint", "packages/naive/src/checks/lint-customers.mjs", "Customers lint: a customer that matches no ICP, and a promise to a customer that the product record, read by key, does not keep. Fail-open unless naive.config.json customers_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

/** packages/naive/src/checks/lint-validation.mjs: its command routes, built with the route table's cmd(). */
export const validationCommands = (cmd) => [
  cmd("validation/lint", "packages/naive/src/checks/lint-validation.mjs", "Validation alignment lint: a claim with no evidence, evidence past its shelf life, an assumption graded only by an agent, and a decision made in Validation on Discovery-grade evidence; fail-open unless naive.config.json validation_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

/** packages/naive/src/checks/lint-finance.mjs: its command routes, built with the route table's cmd(). */
export const financeCommands = (cmd) => [
  cmd("finance/lint", "packages/naive/src/checks/lint-finance.mjs", "Finance lint: a spend decision with no runway impact, a price below cost, and a metric with no target for the current phase. Fail-open unless naive.config.json finance_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

/** packages/naive/src/checks/lint-legal.mjs: its command routes, built with the route table's cmd(). */
export const legalCommands = (cmd) => [
  cmd("legal/lint", "packages/naive/src/checks/lint-legal.mjs", "Legal lint, not legal advice: a public claim with no source, and an agreement with no counterparty record. Fail-open unless naive.config.json legal_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

/** packages/naive/src/checks/lint-people.mjs: its command routes, built with the route table's cmd(). */
export const peopleLintCommands = (cmd) => [
  cmd("people/lint", "packages/naive/src/checks/lint-people.mjs", "People alignment lint: a role with no function it owns, a hire before the team plan names the role, and a decision owned by no person. Fail-open unless naive.config.json people_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

/** packages/naive/src/checks/lint-foundation.mjs: its command routes, built with the route table's cmd(). */
export const foundationLintCommands = (cmd) => [
  cmd("foundation/lint", "packages/naive/src/checks/lint-foundation.mjs", "Foundation lint: a mission that names no ICP, an ICP with no jobs, an alignment principle with no check, and a problem form no ICP has. Fail-open unless naive.config.json foundation_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

/** packages/naive/src/engine/caching.mjs: its command routes, built with the route table's cmd(). */
export function cacheRoutes(cmd) {
  return [
    cmd("system/cache", null, "The venture's cache (C-1, C-17): entries by level, what is private to you, what has expired, and which routes are cached for how long; input value list, prune or clear", { internal: "cache" }),
    cmd("system/judge", null, "Ask System 1 a typed request ({ state, model, questions }) through the judgment cache (S-8, C-5): reused answers are not asked again; the rest go to NAIVE_JUDGE_CMD in one request", { internal: "judge" }),
    cmd("system/answer", null, "One answer from several routes (C-8): each part says whether it is a confirmed record, an agent's record, a draft, a cached result or judgment, or fresh computation; input routes (a list, or value a,b) and judge (a request)", { internal: "answer" }),
  ];
}
