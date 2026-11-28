<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## This site

Naive's developer docs and marketing pages, one Next.js app on Nextra 4 (docs theme, App Router) (EE-088, which supersedes the Fumadocs sentence of EE-080). Docs live in `content/docs/` and templates live under `app/(site)/templates/`. Public requests for those routes, their Markdown and llms exports, and docs Open Graph images redirect to `/waitlist` (R-45). Marketing pages are at `/`. The Blog and the Showcase were removed on 2026-11-27 at the founder's request. The problem (`/why`) and Who it is for (`/for`) were removed the same day because they rendered no content, and both redirect to `/`. No page links to GitHub, because the repository is private. Unpublished: `robots` stays `noindex` until the owner approves a channel (EE-025, EE-034). The site lives in the Naive repository (moved from Mentura's repository on 2026-11-23) and is its own npm project: it is not a workspace of the root, so installing Naive never installs Next.js.

- Naive is this repository. `package.json` depends on it as `naive-framework` (`file:..`), so `npm ci` here links the repository root into `node_modules/naive-framework`. Install the root first (`npm ci` at the root builds `dist/`), then `npm ci` here. Site code imports Naive by package name, and `scripts/naive.ts` gives the paths of Naive's files (routes, nouns, packages, frames, skills, example ventures).
- Kits belong to Mentura, and Naive never names an app's module (`check-boundary`), so the templates catalog lists no kits. A Get Started block that runs a kit through `$MENTURA_DIR` is tested only when `MENTURA_DIR` names a Mentura checkout, and skipped otherwise.
- Vercel installs with `vercel.json`'s install command (the root, then the site) and builds from `site/`.
- `npm run data` writes `generated/` before every dev or build. `scripts/data.mjs` reads Naive's method-level records only. `scripts/venture-facts.mjs` writes `generated/venture-facts.json` and is the one script that reads a venture's marketing facts: from `NAIVE_VENTURE` when it is set, else from `facts/venture-facts.json`, the company venture's last public facts (its records live in the tenant's store, not here). Naive's phases are always read fresh. `NAIVE_VENTURE=<dir> node scripts/venture-facts.mjs --freeze` rewrites the snapshot. `scripts/foundation.mjs` needs `NAIVE_VENTURE`.
- The site's publish channels (site, artifact, foundation) are named in the company venture's `naive.config.json` under `publish_build`, so Naive's publish build runs `scripts/venture-facts.mjs`, `scripts/artifact.mjs` and `scripts/foundation.mjs` with `NAIVE_VENTURE` and `NAIVE_PUBLISH_OUT`.
- Tests of the site's own code: `scripts/gate-pages-test.ts` (with a made-up gate, plus the committed `gate/` loading), `scripts/docs-commands-test.mjs` (every Get Started sh block, run from a copy of Naive), `scripts/venture-facts-test.mjs`, `scripts/canaries-test.mjs` (with `known-leaks.json`), `scripts/publish-build-test.mjs`, `lib/waitlist-store-test.ts`, `verification/site-templates/replay.mjs` and the PR review agent's `pr-review/pr-review-test.mjs`. The PR review agent (`pr-review/`, workflows `pr-review.yml` and `pr-review-comment.yml`) reads each preview of this site and comments on the pull request; see `pr-review/README.md`. CI's `site` job runs them, `npm run check:content` and `npm run build`; the root `node test.ts` runs the Next.js translation status against `content/docs` and the leak checks on `content/marketing`. The canaries and the publish build run on a copy of Naive's example software venture (relay). The site's models are in `verification/`.
- `npm run check:content` enforces the content contract. `npm run build` builds the site.
- Request-time routing uses `proxy.ts` (Next.js 16). It redirects the gated routes to `/waitlist`. Do not add `middleware.ts`.
- `/waitlist` posts to `/waitlist/enroll`. That route records an email as interest in Postgres named by `NAIVE_WAITLIST_DATABASE_URL` (database `mentura_waitlist`, not the identity database). A repeat stays one row. The page does not create an account and does not send mail. When the variable is unset, or names a reserved database, the form says it cannot record interest. The SQL is in `waitlist/`. The site does not apply it to a hosted database.

## Content contract

Agents read this before writing any page. The build and `scripts/check-content.mjs` enforce everything marked *(checked)*. Components are registered in `useMDXComponents` in `mdx-components.tsx`. Nextra reads `_meta.js`, which `scripts/nextra-meta.mjs` writes from each `meta.json` before dev and build. Do not edit `_meta.js` by hand.

### Collections

| Collection | Folder | URL | Purpose |
| --- | --- | --- | --- |
| docs | `content/docs/` | `/docs/...` (redirects to `/waitlist`) | Naive's developer docs, in Diátaxis sections: `get-started/`, `guides/`, `concepts/`, `reference/`, plus `changelog.mdx`. Public requests redirect to `/waitlist` |
| marketing | `content/marketing/` | `/`, `/how`, ... | Naive's marketing pages. Prose from the founder, components and facts from code and records |

### File naming

- Use lowercase kebab-case `.mdx` files. The path is the URL, and `index.mdx` is the folder's URL.
- Never rename a published file without adding a redirect in `next.config.mjs`.
- Each folder has a `meta.json` with `title` and an explicit `pages` array. A page that is in no `meta.json` fails the check *(checked)*.

### Frontmatter *(checked by `scripts/check-content.mjs`)*

Docs pages:

```yaml
title: Install Naive
description: 40 to 160 characters; used for SEO and llms.txt.
type: tutorial
status: draft
lastReviewed: 2026-10-28
owner: builder
sources: []
```

`type` is `tutorial`, `how-to`, `reference` or `explanation`. `status` is `draft`, `beta`, `stable` or `deprecated`. Every page stays `draft` until Torian has read it.

Marketing pages use `title`, `description`, `status`, `lastReviewed`, plus `audience` (optional). The marketing schema has no Diátaxis `type`.

### Body rules

- Don't put an H1 in the body; the title comes from frontmatter. Start at `##` and don't skip levels *(checked)*. The one exception is the marketing home page (`content/marketing/index.mdx`), whose `Hero` renders the h1; the page template drops the title h1 there.
- The `.md` and `Accept: text/markdown` responses may include the body's `##` headings and don't have to start with `#`. The MDX body still has no H1.
- The first paragraph says what the page helps the reader do.
- Use one Diátaxis type per page, and link to a concepts page rather than explaining inline.
- Every code fence has a language *(checked)*, a `title="path"` when it is a file, and runs as written from the repo root unless it says otherwise. Commands come from `AGENTS.md`; don't invent flags.
- Every image is in `public/images/<section>/<page>/` and has alt text *(checked)*. Use SVG or Mermaid for diagrams.
- Use relative links for internal pages and absolute URLs only for external ones. Internal links and anchors are validated *(checked)*.
- Facts about outside systems (versions, limits, prices) get a link or a `sources:` entry.
- Never copy repository data into a page. Routes, nouns, kits, decisions and venture facts are rendered by components from `generated/`.

### Components *(checked: allowlist; no `import` or `export` in content)*

Components are registered once in `mdx-components.tsx`. New ones arrive by a code PR, never inline.

- **Docs UI** (the same names as before, mapped onto Nextra where it has them): `Callout` (info, warn, error, idea), `Cards`/`Card`, `Steps`/`Step`, `Tabs`/`Tab` (`groupId` and `persist` still work), `Accordions`/`Accordion`, `Files`/`Folder`/`File`, `TypeTable`.
- **Repository data:** `RouteTable`, `Groups`, `Glossary`, `Kits`, `Decisions` (from `generated/*.json`, written by `scripts/data.mjs`).
- **Marketing:** `Hero` (home page only, *checked*; `title`, optional `command`, `href`, `action`, and the lede as children), `Statement`, `Section` (`wide` for the home page's full-width sections), `Features`/`Feature` (`title`, optional `href`, `highlight`; no `href` means the block is text, not a link), `Closing`, `CTA` (`secondary` for the outlined button), `Lifecycle`, `FactList`, `Fact` (`<Fact name="problem" />`, from `generated/venture-facts.json`, which `scripts/venture-facts.mjs` writes; `tagline` renders nothing until Torian confirms a field for it).

### Claims and provenance

- Only Torian can accept a claim about what Naive does, who it is for, or why it matters. An agent-written claim stays wrapped in a `{/* DRAFT: agent-written, needs Torian */}` comment until he accepts it, and the PR lists it.
- Don't invent customers, numbers, testimonials, logos or prices.

### Style

Docs follow the Google developer documentation style: second person, active voice, present tense, imperative steps, sentence-case headings, and no "simply", "just" or "easy". Spell out acronyms on first use and write for a global audience. Prose is linted by Vale (Google package) at `warning` (`.vale.ini`). Vale is not a required CI job.

### Names

"Naive" is the framework and "Mentura" the platform (EE-043). The offline boundary and the import rule are EE-041. The docs describe Naive, and Mentura appears only where a page marks something as platform. Say "SAD" or "MAD", never "methodology site".

In page prose, use Torian's terms from 2026-10-28. A package is Naive's open definition: schemas, templates and checks. A kit is Mentura's enhanced package: it adds automations, agent workflows, skills and connectors. A release is the versioned deliverable. A venture is the equivalent of a Next.js project. Do not rename files, paths or routes such as `kit.json` in a docs edit. The component `Kits` still renders the current `kit.json` manifests.

## Publishing gate

`npm run build` ends with `scripts/gate-pages.ts`, which scans every prerendered page the way the publish build scans a channel. A plain build leaves those files under `.next/server/app`. The Vercel build writes them under `.next/server/route-cache`, and the gate and the search index read both. The marketing pages, Blog and Showcase fail on any internal term. Every page fails on a record's internal wording or a draft marker. A marketing page also fails when its rendered file links to or names a gated route (`/docs`, `/templates`, `/llms.txt`, `/llms-full.txt`, `/md/docs`, `/og/docs`). A blog post is listed only with `publish: true` and `approved_by`. Showcase holds example fixtures only, and Templates reads no venture record. Internal terms in Docs and Templates are counted until Torian sets a policy. What the gate looks for is frozen in `gate/`: `gate/internal-wording.json` (every non-public string the company venture's records hold) and `gate/governance/internal-terms.json` (the founder's internal-terms list). `node scripts/export-gate.ts <venture dir>` rewrites both from a venture folder, such as one exported from the store, so the build reads no venture records. The gate fails closed: a missing, malformed or empty gate file stops it. `/waitlist` records an email as interest in early access. It does not create an account and it does not send mail. Docs and templates still redirect there, and joining does not make those pages available. Account sign-up is the console, not this page.
