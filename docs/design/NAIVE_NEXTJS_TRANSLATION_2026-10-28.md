---
publish: false
type: design-note
source: hybrid
created: 2026-10-28T23:00:00Z
updated: 2026-10-29T00:03:06Z
ai-model: claude-opus-5.5
authority: advisory
status: DRAFT
tags: [everything-ecosystem, naive, nextjs, translation, vocabulary, ai-native]
description: "Next.js App Router Getting Started (chapters 1 to 18), translated concept by concept into Naive: what each builds on, whether it converts, AI-native differences, and the word decided for each term. Exported from the Claude Doc https://claude.ai/artifact/XUWNP7MZ1uTNP4uSY6pwgu on 2026-10-29T00:03:06Z; the doc is the living copy, this file is the snapshot the Grokbot handoff reads."
---

> Copied from everything-ecosystem (docs/design/, main at 2026-11-05) when Naive moved to its own repository (EE-118). This copy is Naive's from now on. Paths it names under site/, platform/, console/ or instance/ stay in everything-ecosystem.

## How to read this ledger

**Objective (Torian, 2026-10-28 23:08Z).** Go through the Next.js App Router docs line by line, in the order they are written, and convert every concept into a concept for Naive. Record what each concept builds on. Where a concept does not convert, mark it and say why. For each term, decide whether Naive adopts Next.js's word or keeps its own. React concepts come in wherever Next.js assumes them. This is a translation of a concept system, not a map of what Naive already has: some rows describe concepts Naive does not have yet.

**Not one to one.** Naive is AI-native and built as AI-powered software in TypeSafe's System 1 sense: code owns the workflow, and models answer atomic judgments through Choice, Noul and Score. Where that changes a concept, the row says so.

**Each row has:**

- **#**: a stable concept id (`I-3` is Installation's third concept), so later chapters can say what they build on.
- **Next.js**: the concept, quoted or paraphrased from the page.
- **Builds on**: earlier concept ids it depends on.
- **Naive**: the converted concept.
- **Status**: `converts`, `converts with changes`, `does not convert` (with why), or `AI-native` (new, because of how Naive uses models).
- **Word**: `adopt` (use Next.js's word), `ours` (keep or coin a Naive word), or `open` (Torian decides).

**Vocabulary already decided** (EE-070, EE-071): project is **venture**; npm package is **package** (Naive, open, schemas, templates, checks); an enhanced package with automations, agent workflows and skills is a **kit** (Mentura); feature folders are **functions**, each with one owner; the build output is a **release**.

**Sources.** Each chapter cites the page it reads, fetched 2026-10-28 from nextjs.org's Markdown versions of the docs.

## Chapter 1: Installation

Source: [Installation](https://nextjs.org/docs/app/getting-started/installation), last updated 2026-10-02. The page creates a project, runs it, and sets up the tools around it. Today Naive does this with `mentura init` (`schema/init-venture.mjs`), which starts a venture from per-phase defaults.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| I-1 | `create-next-app` creates a project and installs what it needs | (none) | A generator that creates a venture: `venture.json`, the phase's packages, `raw/`, `AGENTS.md`. Today `mentura init`; under EE-041 the framework CLI should be `naive` | converts | open: `create-venture`, or `naive create` |
| I-2 | Quick start: create, `cd`, `dev`, open `localhost:3000` | I-1, I-9 | Create the venture, run `naive dev`, open the local board to see the venture and its packages | converts | adopt |
| I-3 | `--yes`: recommended defaults (TypeScript, ESLint, Tailwind, App Router, Turbopack, `@/*`, `AGENTS.md`) | I-1 | Recommended defaults: Discovery phase, founder-led governance, the phase's packages, checks on, `AGENTS.md` | converts | adopt: "recommended defaults" |
| I-4 | `AGENTS.md` included "to guide coding agents to write up-to-date Next.js code" | I-3 | Every venture gets an `AGENTS.md` that points agents at the route table, `layout` and the packages' docs, so they write records by convention instead of from training data | converts, central to Naive | adopt |
| I-5 | System requirements: Node.js 20.9, macOS, Windows, Linux | (none) | Node.js for the CLI; no other dependency (the repo is dependency-free). Founders who never use the CLI need only Mentura | converts | adopt |
| I-6 | Supported browsers | (none) | Does not convert as written: Naive's output is read by people and agents, not rendered in browsers. The AI-native analog is **supported agents**: the MCP clients and coding agents Naive is tested with | AI-native | ours: "supported agents" |
| I-7 | Setup prompts: name, use recommended defaults, reuse previous settings, or customize | I-1, I-3 | Setup questions: venture name, defaults or customize (phase, governance model, packages, include an idea dump now). AI-native option: the founder pastes an idea dump and System 1 answers the setup questions (Choice for phase and governance), asking the founder only where confidence is low | AI-native | adopt |
| I-8 | Customize: TypeScript? | I-7 | Not optional: every record has a schema and every write is validated (EE-030). Naive is always "strict" | converts with changes | ours: "schema" |
| I-9 | Customize: which linter (ESLint, Biome, none) | I-7 | One checker (`node test.mjs`, later `naive check`) with rule sets; no choice of linter | converts with changes | ours: "checks" |
| I-10 | Customize: React Compiler | I-7 | Does not convert: there is no compiled UI. Nearest idea is System 1 doing optimizing work automatically, which is not a setup option | does not convert | (none) |
| I-11 | Customize: Tailwind CSS | I-7 | A styling choice maps to the brand inside the marketing package (voice, visual identity), not to setup | converts with changes | (none) |
| I-12 | Customize: code inside `src/` | I-7 | Optional `venture/` folder, for a venture that lives inside a code repository, so business records sit apart from code and config | converts | open: `venture/` |
| I-13 | Customize: App Router (recommended) versus Pages Router | I-7 | Naive has one router. Its "Pages Router" is the old layer-based layout (EE-030, EE-032); the function-based layout (EE-070) is the new one, and aliases let both work during migration, as Next.js lets `pages/` and `app/` coexist | converts | ours |
| I-14 | Customize: Cache Components | I-7 | Deferred to the Caching chapter | (later) | (later) |
| I-15 | Customize: import alias `@/*` | I-7 | Records refer to each other by route (`foundation/icp`), never by relative file path; route aliases cover renames | converts | ours: "refs" |
| I-16 | Manual install: `next`, `react`, `react-dom` | I-1 | Manual setup: write `venture.json` and list packages. Open: what is Naive's React, the library underneath the framework? Candidate: the record and provenance model, usable without the rest of Naive | converts | open |
| I-17 | Scripts: `dev`, `build`, `start`, `lint` | I-16 | `naive dev` (board and router, live); `naive build` (check every package and write a **release**); `naive start` (serve a release read-only, the handoff view); `naive check` | converts | adopt: dev, build, start; ours: check |
| I-18 | Turbopack is the default bundler; Webpack optional | I-17 | Does not convert: nothing is bundled. The release builder is the only build step | does not convert | (none) |
| I-19 | File-system routing: "routes are determined by how you structure your files" | (none) | Routes are folder paths, first segment the package (EE-032, EE-070) | converts | adopt |
| I-20 | The `app` folder | I-19 | The venture folder itself; packages sit at its top level | converts with changes | (none) |
| I-21 | Root layout, required, holds `<html>` and `<body>`; created for you if missing | I-20 | Root layout: the venture context every agent reads first (`venture.json`, phase, governance, strategic foundation). Required; `naive dev` writes a stub if missing | converts | adopt: "root layout" |
| I-22 | `app/page.tsx`, the home page at `/` | I-20, I-21 | The venture's home view (`system/overview` today): what a person sees first | converts | adopt: "home" |
| I-23 | `public/`: static assets served from `/` | I-20 | Assets that records reference and releases ship as-is (logo, deck PDF, screenshots). Different from `raw/`, which holds inputs | converts | open: `public/` or `assets/` |
| I-24 | Run the dev server, edit, see the change | I-17 | Edit a record and the board updates; package progress moves. AI-native: on save, System 1 checks run (Noul per field) as live feedback, like type errors in the editor | AI-native | adopt |
| I-25 | TypeScript built in; `tsconfig.json` added for you | I-8 | Schemas built in; each record carries `$schema` | converts | (none) |
| I-26 | IDE plugin for type checking and completion | I-25 | JSON Schema gives editor completion; the MCP server gives agents the same routes | converts with changes | (none) |
| I-27 | Editor labels for same-named files, with a prompt to have your coding agent set it up | I-20 | Same need (many `[id].json`). The copyable agent prompt is a docs pattern Naive should adopt on every setup step | converts | adopt |
| I-28 | `next build` no longer runs the linter | I-17 | Deliberately different: `naive build` must run checks and refuses a release that fails them, because the foundation fails closed | does not convert (by design) | (none) |
| I-29 | `next upgrade`; docs bundled in `node_modules/next/dist/docs/` so agents read the installed version | I-17, I-4 | `naive upgrade` updates the framework and packages; each package ships its docs, so agents read the version installed. An agent-run upgrade is a Mentura kit | AI-native | adopt: "upgrade" |

## Chapter 2: Project Structure

Source: [Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure), last updated 2026-07-21. The page lists every folder and file convention, then how to organize a project. One sentence sets the biggest difference: "Next.js is **unopinionated** about how you organize and colocate your project files." Naive is opinionated on purpose (Torian, 21:35Z): one structure, split by function.

### Folder and file conventions

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| P-1 | Top-level folders: `app`, `pages`, `public`, `src` | I-20, I-23, I-12, I-13 | Top level of a venture: package folders, `raw/`, `public/`, optional `venture/`. The old layer folders play the part of `pages/` during migration | converts | adopt the idea; names per row |
| P-2 | `next.config.js` | I-3 | `naive.config.json`: overrides to defaults (checks, thresholds, which System 1 questions run) | converts | open: `naive.config.json` |
| P-3 | `package.json`: dependencies and scripts | I-16, I-17 | `venture.json`: identity, phase, governance, function owners, and the packages and kits the venture uses | converts with changes | ours: `venture.json` |
| P-4 | `instrumentation.ts`: OpenTelemetry and monitoring | I-17 | The hook where every decision, confirm and System 1 call emits an event: provenance today, decision analytics later (see Future concepts). Traces go to LangSmith on the platform | AI-native | open |
| P-5 | `proxy.ts`: runs before a request reaches a route | P-4 | Gates that run before every write: fail-closed decisions hold agent writes as drafts (`holding()` today) | converts with changes | open: "gate" |
| P-6 | `.env` files, never tracked | (none) | Secrets belong to Mentura's connectors only; the framework names none (EE-041). Never tracked | converts | adopt |
| P-7 | `eslint.config.mjs` | I-9 | Check settings live in `naive.config.json` | converts | (none) |
| P-8 | `.gitignore` | (none) | Ships ignoring sensitive streams and full copies of copyrighted sources by default | converts | adopt |
| P-9 | `next-env.d.ts`, `tsconfig.json`, `jsconfig.json` | I-25 | Does not convert: schemas live in the framework and are never copied into a venture (EE-048) | does not convert | (none) |

### Routing files

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| P-10 | `page`: exposes a route | I-19 | A record file (`pricing.json`) is a route; its people-facing view is the Markdown page | converts | ours: "record" |
| P-11 | `layout`: shared UI that wraps children | I-21 | The context an agent receives before acting, nested venture to package to record (EE-032) | converts | adopt |
| P-12 | `template`: a layout that re-renders every time | P-11 | Context recomputed on every action, such as need-now ranking and open decisions, as opposed to stable layout context | converts with changes | adopt |
| P-13 | `loading`: a skeleton while content loads | P-10 | A record waiting on a draft or a confirm reports its state on read (EE-032) | converts | adopt |
| P-14 | `not-found` | P-10 | A missing record answers with its template, schema, skills and need-now status (EE-032) | converts | adopt |
| P-15 | `error`, `global-error` | P-10 | A failed check or write answers with the package's skill and template; a broken `venture.json` answers with recovery steps | converts | adopt |
| P-16 | `route`: an API endpoint | I-19 | Command routes with the `run` action (`validation/assess`) | converts | ours: "command" |
| P-17 | `default`: fallback for a parallel slot | P-21 | What `system/overview` shows for a package with nothing in it | converts | adopt |

### Nested, dynamic and grouped routes

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| P-18 | Folders are segments; layouts wrap descendants; a route is public once it has a `page` or `route` | P-10, P-11 | Package folder, then record; a folder routes only through declared record types | converts | adopt |
| P-19 | `[segment]`, `[...segment]`, `[[...segment]]` | P-18 | `[id]` collections (products, customers); catch-all for nested ventures (`studio/print`, EE-032). Optional catch-all has no use yet | converts | adopt |
| P-20 | `(group)`: organize without changing the URL | P-18 | Phase groups in the route table (EE-032). Also a way to group packages that share context, such as `(go-to-market)` for marketing and sales | converts | adopt |
| P-21 | `@slot`: named slots in a parent layout | P-11 | Slots in `system/overview` and the board's panes | converts | adopt |
| P-22 | `_folder`: private, opted out of routing | P-18 | `_drafts/`, `_notes/`, `_streams/` | converts | adopt |
| P-23 | Intercepting routes `(.)`, `(..)`: show a route as a modal without changing the URL | P-18 | Does not convert in the file system; it is a UI pattern. The board can preview a ref in place, but no file convention is needed | does not convert | (none) |

### Metadata files

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| P-24 | `favicon`, `icon`, `apple-icon` | I-23 | The venture's logo and marks, in the marketing package's brand | converts with changes | (none) |
| P-25 | `opengraph-image`, `twitter-image`: how a link previews | P-24 | The cover card of a release, shown when a release is shared with an investor or partner | converts with changes | open |
| P-26 | `sitemap` | P-18 | The sitemap is a marketing record, not framework metadata (Torian, 21:07Z) | converts with changes | adopt |
| P-27 | `robots` | P-18 | What each role and agent may read and write (EE-032), set by function owners | converts with changes | open |

### Organizing a project

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| P-28 | Component hierarchy: `layout`, `template`, `error`, `loading`, `not-found`, then `page` | P-11 to P-15 | The order the router resolves a read: context, fresh context, failed checks, pending drafts, missing record, then the record. This should be written into the router spec | converts | adopt |
| P-29 | Rendered recursively: a child segment's files nest inside the parent's | P-28 | Venture context wraps package context wraps item context | converts | adopt |
| P-30 | Colocation: files in a segment are safe until a `page` exists | P-18 | Attachments and notes can sit in a package folder without being counted or routed | converts | adopt |
| P-31 | Only the content a `page` returns is sent to the client | P-30 | Only confirmed records enter a release; drafts and notes never ship | converts with changes | (none) |
| P-32 | Uses of private folders: separate logic, group files, avoid clashes with future conventions | P-22 | Same, plus reserved names for future Naive conventions | converts | adopt |
| P-33 | `%5F` to start a URL segment with an underscore | P-22 | No use | does not convert | (none) |
| P-34 | Strategies: files outside `app`, inside `app`, or split by feature or route | P-1 | Naive picks one: split by function (EE-070); shared records live in shared packages (foundation, decisions, evidence) | converts, opinionated | ours: "function" |
| P-35 | `components` and `lib` have no framework meaning | P-34 | Open: does Naive allow folders it does not know in a venture's root? Proposed: yes, never routed or released | converts | open |
| P-36 | Route groups for separate layouts and opt-in layouts | P-20 | A group of packages shares a layout, so they share context | converts | adopt |
| P-37 | A loading skeleton for one route | P-13 | A pending state for one package | converts | adopt |
| P-38 | Multiple root layouts: one app, sections with completely different experiences | P-21, I-21 | Nested ventures: a product that fails the flagship's must-holds becomes its own venture with its own root layout | converts | adopt |

## Chapter 3: Layouts and Pages

Source: [Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages), last updated 2026-08-25. The page builds the first route by hand: a page, a layout around it, nested segments, a dynamic segment, then links between pages. It assumes two React ideas, components and props, so those get rows too (prefix R).

**The main difference.** A Next.js page is UI for a person. A Naive route returns a record and its context, for an agent or a person; turning it into something to look at belongs to the interface layer (a visualization skill in Claude Code, Codex or Cursor, or Mentura's own interface). So "page" splits in two: the record (framework) and its view (interface).

| # | Next.js or React | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| R-1 | React component: a function that returns UI, reused by name | (none) | A record type: a reusable shape (schema, template, checks) that a package defines and a venture fills in. Each file is an instance. The view of a record is a component in the interface layer | converts with changes | ours: "record type" |
| R-2 | Props, and the `children` prop | R-1 | The inputs a route takes (`--value`, `--as`, filters), and for a layout, the records and packages it wraps | converts with changes | adopt: "children" in the docs |
| L-1 | A page is "UI that is rendered on a specific route", made by default-exporting a component from `page` | I-19, R-1 | A record at a route. A read returns its data, status and provenance; the view is the interface layer's | converts with changes | ours: "record" (P-10) |
| L-2 | A layout is UI "shared between multiple pages"; on navigation it keeps state and does not re-render | P-11, R-2 | Context shared by every record under it. AI-native: the router sends a segment's layout to an agent once per session and only the parts that changed after that, as a layout that does not re-render; `template` (P-12) is what is sent fresh every time | AI-native | adopt |
| L-3 | The root layout is required and holds `html` and `body` | I-21 | Covered by I-21 | converts | adopt |
| L-4 | A nested route has a root segment, segments and a leaf segment | I-19 | Venture (root), package (segment), record or `[id]` item (leaf) | converts | adopt: segment, leaf |
| L-5 | Folders define segments; files (`page`, `layout`) create what each segment shows | L-4 | Folders define segments; record files hold data; a layout file holds the founder's own context for agents in that folder. Proposed: a `layout.md` in any folder, read before acting there, the way `AGENTS.md` files nest. The rest of a layout is computed from the package definition (skills, template, gates) | AI-native | open: `layout.md` or `AGENTS.md` |
| L-6 | `/blog` becomes public once `blog/page` exists; it lists the posts | L-5, P-18 | A package's own route (`validation`) returns its records and their state: the package's progress, what moves now and what waits | converts | adopt |
| L-7 | `[slug]` makes one route serve many items from data; `generateStaticParams` lists them | P-19 | `[id]` collections. The release build enumerates the items that exist, which is what `generateStaticParams` does | converts | adopt |
| L-8 | Nested layouts: root wraps blog wraps post | L-2, P-29 | Venture context wraps package context wraps item context | converts | adopt |
| L-9 | `params`: the dynamic segment's value, also given to layouts inside it | L-7 | The item id (`product/kettle`) is passed to the record and to every layout below it, so a product's layout knows which product | converts | adopt: "params" |
| L-10 | `searchParams` for filtering; using it makes the page render dynamically | L-1 | Route inputs that change what a read returns (phase, status, function). Dynamic rendering is deferred to its chapter | converts with changes | (later) |
| L-11 | `useSearchParams` on the client; `URLSearchParams` in handlers | L-10 | Does not convert: Naive has no client. A view in the interface layer may filter what it already has | does not convert | (none) |
| L-12 | `<Link>`: navigation with prefetching and client-side transitions | L-1 | Refs between records (`foundation/icp`) are Naive's links. AI-native prefetching: when an agent reads a record, the router can include a short summary of each ref, so the agent does not spend calls fetching them | AI-native | ours: "ref" |
| L-13 | `useRouter` for programmatic navigation | L-12 | The route table as an API: the router module, MCP tools and the HTTP API (EE-030) | converts | (none) |
| L-14 | `PageProps` and `LayoutProps`: types generated from the route structure (`next typegen`) | L-1, L-2 | Generated from the data model: the route table, `ROUTES.md`, and each MCP tool's input schema, so agents get typed routes. Today `node interface/router.mjs --md`; proposed `naive typegen` | converts | open: `naive typegen` |
| L-15 | Static routes resolve `params` to `{}` | L-9 | Same: a single record has no item id | converts | (none) |

**What this chapter adds to the design.** Three things Naive does not have yet: a `layout.md` a founder can put in any folder (L-5), sending layouts once per session (L-2), and including ref summaries on read (L-12). All three are interface-layer and router work, not new records.

## Chapter 4: Linking and Navigating

Source: [Linking and Navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating), last updated 2026-09-09. The page explains why moving between routes is fast: server rendering, prefetching, streaming and client-side transitions, then what makes it slow. It assumes React Server Components and Suspense (R-3, R-4).

**The main difference.** In Next.js the cost of navigation is waiting: the network and the server. In Naive the one moving between routes is usually an agent, and the cost is calls, tokens and time to a useful answer. Every optimization on this page has an AI-native counterpart aimed at that cost.

| # | Next.js or React | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| N-1 | Routes are rendered on the server by default; the client waits for the response | L-1 | Every read is answered by the router, the one source of answers; the agent waits on the router | converts | adopt |
| R-3 | React Server Components: rendered on the server, sent as a payload | R-1 | Work done in code by the router (layouts, need-now, gates, package state) and sent to the agent as a result. Preview of the Server and Client Components chapter: **server is code, client is the model**, which is TypeSafe's "code owns the workflow" | AI-native | (later) |
| N-2 | Prerendering at build time or on revalidation, cached; dynamic rendering at request time | N-1 | Precomputed answers (the route table, the release, the catalog) against answers computed per call (need-now ranking, the decision docket, gates) | converts | adopt |
| N-3 | Prefetching: loading a route before the user goes there, for links in the viewport | L-12, N-2 | AI-native prefetching: on a read, the router includes short summaries of the routes the agent is likely to need next: the record's refs, its next step, and the records that wait on it (from the `after` links). Code decides what is likely; no model is needed | AI-native | adopt: "prefetch" |
| N-4 | Static routes prefetch in full; dynamic ones are skipped or partly prefetched with `loading` | N-3, P-13 | Confirmed records can be included in full; changing ones (drafts, rankings) send only their state | converts with changes | (none) |
| N-5 | Streaming: send parts of a route as they are ready | N-2 | Long runs (a site scan, the harness, a batch of System 1 questions) send progress as it happens, as MCP progress notifications | converts | adopt |
| R-4 | `<Suspense>` and `loading.tsx`: fallback until content is ready | N-5, P-13 | Already Naive's model for decisions: under an open fail-closed decision, what sits below waits (EE-054). On read, a waiting record answers with its state and what it waits on | converts | adopt: "suspense" in the docs |
| N-6 | Benefits measured as Core Web Vitals (TTFB, FCP, TTI) | N-5 | **Agent vitals**: calls per task, tokens of context per call, time to a useful answer, and time from a decision opening to a person deciding it. Recorded through instrumentation (P-4) and fed to analytics | AI-native | open: "agent vitals" |
| N-7 | Client-side transitions keep shared layouts and swap the page | L-2 | Moving to a sibling route keeps the session's layout and swaps only the record's context | converts | (none) |
| N-8 | Scroll to top; `scroll-padding-top` | N-7 | No use | does not convert | (none) |
| N-9 | Dynamic routes without `loading` feel unresponsive | N-4 | A computed route (assess, need-now) answers at once with its state and streams the rest | converts | (none) |
| N-10 | Dynamic segments without `generateStaticParams` fall back to request time | L-7 | Items known when a release is built are precomputed | converts | (none) |
| N-11 | Slow networks; `useLinkStatus` for a pending hint; experimental `useOffline` | N-3 | The framework works offline by definition (EE-041), so there is no slow network inside Naive; a pending hint is the interface layer's | converts with changes | (none) |
| N-12 | Turn prefetching off for long lists, or prefetch on hover | N-3 | For large collections (500 customers), send counts, not summaries; prefetch in full only when the agent's task names the route | converts | (none) |
| N-13 | Hydration delayed by large bundles; analyze bundles; move logic to the server | R-3 | Naive's bundle is the context an agent receives. A **context budget** per route, measured like bundle size, and the rule to move logic out of prompts into the router's code | AI-native | open: "context budget" |
| N-14 | `pushState` and `replaceState` on the browser's history | N-7 | An agent's moves are recorded in the append-only provenance log (EE-031). Nothing is ever replaced, so there is no `replaceState` | does not convert (by design) | (none) |

**What this chapter adds to the design.** Prefetching from the `after` links (N-3), agent vitals (N-6) and a context budget per route (N-13). The vitals and the budget come from the same instrumentation hook as decision analytics.

## Chapter 5: Server and Client Components

Source: [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), last updated 2026-10-05. The page splits work between two environments with different capabilities, server and client, and draws a declared boundary between them.

**The translation: server is code, client is the model.** Naive's two environments are deterministic code (the router, checks, gates, ranking) and the model (System 1 judgments and drafting). This is TypeSafe's split: code owns the workflow; the model answers atomic judgments over unstructured input. Next.js defaults to the server and layers in the client where it is needed; Naive defaults to code and calls a model only where a judgment is needed. An earlier mapping (framework as server, platform as client) is set aside: the framework and platform split is about vendors and accounts, not about where work runs.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| S-1 | Server Components by default; Client Components layered in for interactivity | R-3 | Code by default; a model only where a judgment over unstructured input is needed ("use code when you can") | AI-native | ours: "code" and "model" |
| S-2 | Use the client for state, event handlers, lifecycle, browser APIs, custom hooks | S-1 | Use a model to classify a fragment, judge fit (Noul), choose among options (Choice), rate (Score), or draft prose. Each call atomic | converts with changes | (none) |
| S-3 | Use the server to fetch data near the source, use secrets, send less JavaScript, paint sooner | S-1 | Use code to read records, compute gates and completeness, combine answers, call connectors that hold secrets (platform), and keep context small | converts | (none) |
| S-4 | A server page fetches the post and passes only `likes` to the client button | S-3, R-2 | The router assembles the state and passes a model only the fields its question needs ("decompose the input state") | AI-native | (none) |
| S-5 | Rendering is split into chunks by segment, slots included | L-4, P-21 | Questions are batched per package and asked together, in parallel ("ask many questions at once") | AI-native | (none) |
| S-6 | The RSC Payload: rendered results, placeholders for client parts, props passed to them | S-4 | The router's answer: what code computed, placeholders where a judgment is pending, and the state each judgment receives | converts with changes | adopt: "payload" |
| S-7 | First load: HTML preview, then reconcile, then hydrate | S-6, N-5 | Code results are shown at once; judgments fill in as they arrive | converts with changes | (none) |
| S-8 | Later navigations: the payload is prefetched and cached | S-6, N-3 | Judgments are cached by their input. System 1 answers are self-consistent, so a cached answer is reused until the state it was asked on changes | AI-native | (none) |
| S-9 | `"use client"` declares the boundary; everything it imports joins the client bundle | S-1 | A package declares which steps use a model. Everything downstream of a model's output carries agent provenance until a person confirms it or its checks pass | AI-native | open: `"use model"` |
| S-10 | Server Components passed as `children` stay on the server | S-9 | A person's confirmed record passed into a model step stays the person's; only the model's output is marked as the agent's | converts | (none) |
| S-11 | Mark only interactive leaves as client to keep bundles small | S-9, N-13 | Keep model calls at the leaves: ask the narrowest question, never hand a whole package to a model | AI-native | (none) |
| S-12 | Props passed to the client must be serializable | S-4 | State given to a model is structured JSON, and questions point at paths in it | converts | (none) |
| S-13 | Interleaving: server-rendered parts inside a client component | S-10 | A model step can contain code-computed parts it must not change: a draft written around computed prices or counts, and a check that confirms they came through unchanged | AI-native | (none) |
| R-5 | React context: share a value with a whole subtree | L-2 | Layout context | converts | (none) |
| S-14 | Render context providers as deep as possible | R-5, N-13 | Give context as low in the tree as it is needed, so other packages do not pay for it in their context budget | converts | (none) |
| S-15 | Wrap third-party components that use client features; library authors add `"use client"` | S-9 | A kit's agent workflow used inside a venture is wrapped with a declared boundary: what it reads, what it writes, which steps use a model. Kit authors declare it in `kit.json` | converts | (none) |
| S-16 | Environment poisoning: server-only code and API keys leaking to the client; `NEXT_PUBLIC_`; the `server-only` package | S-3 | Nothing secret or private enters a model's state. Records and fields can be marked so they never go to a model (health data, sensitive streams), and a check fails the build if one does. Secrets never enter the framework at all (EE-041) | AI-native | open: the marker's name |
| S-17 | The `client-only` package | S-16 | Steps only a model can do (drafting) are marked, so code never expects a deterministic answer from them | converts | (none) |
| S-18 | Streaming data to the client with React's `use` | N-5 | Deferred to Fetching Data | (later) | (later) |

**What this chapter adds to the design.** A declared model boundary in package definitions (S-9), agent provenance flowing from it (S-9, S-10), cached judgments (S-8), and a never-to-a-model marker with a check (S-16). Together they make the code/model split something the framework can check, not only a guideline.

## Chapter 6: Fetching Data

Source: [Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data), last updated 2026-09-01. How server and client code get data, how slow data is streamed, and the sequential, parallel, memoized and preloaded patterns.

**The translation.** Fetching is reading: code reads records from the venture and outside sources through connectors. The model side does not fetch; it is handed state (S-4).

| # | Next.js or React | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| F-1 | Server Components fetch with any async I/O: `fetch`, an ORM, a database | S-3 | Code reads records from the venture's files and outside systems of record through connectors (EE-037); vendor connectors are the platform's | converts | adopt: "read" |
| F-2 | Identical `fetch` calls in one tree are memoized, so each component fetches what it needs | F-1 | Within one action, each record is read once and shared, so every part of the router asks for what it needs without passing it along | converts | (none) |
| F-3 | `fetch` is not cached by default and blocks; use `use cache` or `<Suspense>` | F-1, R-4 | Reads are live by default; caching is its own chapter | converts | (later) |
| F-4 | Log `fetch` calls in development | F-1, P-4 | Instrumentation logs each read and each judgment, which feeds agent vitals | converts | (none) |
| F-5 | Credentials stay on the server; still authenticate and authorize every request | F-1, S-16 | Connector credentials stay in the platform; access rules (P-27) are checked on every read | converts | (none) |
| F-6 | A layout that reads runtime or uncached data blocks navigation; move it into the page or its own `<Suspense>` | L-2, R-4 | Design rule: keep slow computed values (need-now ranking, open decisions) out of layouts. Put them in `template` or in the record, so a slow computation never blocks every action under a folder | converts | (none) |
| F-7 | Bots and crawlers get the full page instead of a stream | N-5 | Clients that cannot take progress events get the full answer once | converts | (none) |
| F-8 | Meaningful loading states: skeletons, or part of the next screen | P-13 | A waiting record says what it waits on and the one step that unblocks it | converts | (none) |
| F-9 | Client Components fetch with React's `use`, SWR or React Query | S-2 | Does not convert for System 1: a judgment is given its state and never fetches. An agent in a kit may read through routes, but those reads are code, logged and checked | does not convert (by design) | (none) |
| F-10 | Sequential fetching: one request needs another's result first | F-1 | The `after` links: a record waits on the records it reads first (EE-069). The waterfall is the venture's real order, not an accident | converts | ours: "waits on" |
| F-11 | Parallel fetching: segments render in parallel; `Promise.all`; `Promise.allSettled` so one failure does not sink the rest | F-10, S-5 | Independent records move at once (the async lane, EE-060); judgments are asked in one batch, and one low-confidence answer goes to the founder without failing the batch | converts | (none) |
| F-12 | `React.cache`: memoize a non-fetch read within one request | F-2 | Computed values (the foundation report, the decision list) are computed once per action and shared | converts | (none) |
| F-13 | Preloading: start a request before blocking work so it runs in parallel | F-11 | Speculative fan-out (a TypeSafe pattern): start the judgments a step will likely need while code is still computing, and discard the ones not used | AI-native | (none) |
| F-14 | `taint`: mark objects and values that must not reach the client | S-16 | The `private` marker | converts | adopt: `private` |

**What this chapter adds.** One design rule (F-6: nothing slow in a layout) and one AI-native pattern (F-13: speculative fan-out of judgments).

## Chapter 7: Mutating Data

Source: [Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data). Server Functions, called Server Actions when they mutate: how to create them, how to invoke them, and what to do after.

**The translation.** Mutating is writing through the router: `write`, `accept`, `decide`, `confirm`, `propose`. The router validates every write, records its provenance, and answers with what changed.

| # | Next.js or React | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| M-1 | A Server Function runs on the server and is called from the client over the network | S-1 | An action runs in the router (code) and is called by an agent or a person through the CLI, MCP or the API | converts | adopt: "action" |
| M-2 | Server Actions handle forms and mutations | M-1 | Writes and decisions. The Decision Docket is a form; `decide` is its action | converts | adopt |
| M-3 | One round trip returns the updated UI and the new data | M-1 | A write answers with the new state and what it changed: package progress, what moves now, what it unlocked | converts | (none) |
| M-4 | Only `POST` invokes an action | M-1 | Reads never write; writes are separate actions | converts | (none) |
| M-5 | Actions are reachable directly, so check authentication and authorization in every one | M-1, P-27 | Every write checks who is acting: an agent's write to a gated record becomes a draft (EE-030), and a person-only action refuses an agent however it is called | converts, critical | (none) |
| M-6 | `"use server"` marks functions or files as Server Functions | M-1 | Actions are declared on routes from the data model; nothing else writes | converts | (none) |
| M-7 | Progressive enhancement: forms submit without JavaScript | M-2 | Actions work without the platform: the CLI, or plain file edits adopted with `baseline` | converts | (none) |
| M-8 | Client Components cannot define Server Functions, only call them | M-6, S-9 | A model cannot define an action, only call a declared one. No model-invented writes | converts (by design) | (none) |
| M-9 | Pass actions to a Client Component as props | M-6, L-2 | A layout lists the actions available in that folder, so an agent knows what it may do there | converts | (none) |
| M-10 | The client dispatches actions one at a time | M-1 | Writes to a venture are serialized: the provenance log is a hash chain and needs an order | converts | (none) |
| M-11 | Forms pass `FormData` | M-2 | A decision's answer is structured input, validated against the decision record's schema | converts | (none) |
| M-12 | Event handlers and `useEffect` trigger actions on events | M-1 | Triggers: an event such as a record confirmed starts the next step. Automations are a kit's (Mentura), and run only once the package they need is complete | converts with changes | adopt: "trigger" |
| M-13 | Pending state with `useActionState`; optimistic UI | M-3 | A draft is an optimistic write: shown as the agent's until a person accepts it; rejecting it is the rollback | converts | (none) |
| M-14 | Experimental `useOffline` keeps an action pending until the network returns | M-1 | No network inside the framework | does not convert | (none) |
| M-15 | `refresh()` after a mutation | M-3 | Derived state (packages, need-now, the docket) is recomputed after every write, automatically | converts | (none) |
| M-16 | `revalidatePath` and `revalidateTag` after a mutation | M-15 | A write marks what read it as stale, as a decision made before its parent changed is stale (EE-057). Detailed in Revalidating | converts | (later) |
| M-17 | `redirect` after a mutation | M-3 | A write answers with the next route to act on | converts | (none) |
| M-18 | `cookies` in actions; setting one re-renders | M-5 | Who is acting and in which role, carried with every action, and re-checked when it changes | converts with changes | (none) |

**What this chapter adds.** M-5 and M-8 are the safety core: every write checks who is acting, and a model can only call declared actions. Triggers (M-12) give automations their place, as kits.

## Chapter 8: Caching

Source: [Caching](https://nextjs.org/docs/app/getting-started/caching), with Cache Components (the default). Storing results so the same work is not done again, the static shell, and where cached content lives.

**The translation.** Naive caches two things: computed answers (package state, the docket) and judgments (System 1 answers). The release is Naive's static shell: confirmed records frozen in, with holes left for what must stay live.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| C-1 | Caching stores the result of fetching and computing so it is not redone | S-8 | Computed answers and judgments are stored and reused | converts | adopt |
| C-2 | Cache Components is on in the recommended defaults | I-3 | Caching is on in Naive's recommended defaults | converts | (none) |
| C-3 | `use cache` at data level (a function) or UI level (a component or page) | C-1 | Judgment level (one System 1 answer) or record level (a derived record such as a package's state) | converts | adopt: `use cache` in package definitions |
| C-4 | Pair every cache with a `cacheLife` | C-3 | Every cached value has a lifetime | converts | (none) |
| C-5 | The cache key is the arguments plus captured values | C-3 | A judgment's key is the exact state it was given, the question, and the model and package versions. Change any of them and it is asked again | AI-native | (none) |
| C-6 | Uncached data streams behind `<Suspense>`; the dev overlay names a blocking route and offers fixes | R-4 | Checks name a blocking computation and answer with the fix, as `error` answers with the package's skill (P-15) | converts | (none) |
| C-7 | Runtime APIs (`cookies`, `headers`, `searchParams`, `params`); `use cache: private` | L-9, M-18 | Results that depend on who is acting are cached per person; a founder's private context is never shared across people | converts | (none) |
| C-8 | Static, cached and streamed content on one page | C-3, N-5 | One answer mixes confirmed records, cached judgments and fresh computation | converts | (none) |
| C-9 | Random values and timestamps must be handled explicitly (`connection()` or cache them) | C-5 | "Now" is an input, never read silently (the decision matrix already takes it), and judgments run so the same input gives the same answer. Results stay reproducible | AI-native | (none) |
| C-10 | Predictable values (imports, synchronous reads, pure computation) are prerendered automatically | C-9 | Reading the venture's files is predictable, so it goes into a release automatically | converts | (none) |
| C-11 | Prerendering makes a static shell with holes that stream (Partial Prerendering) | C-10 | **The release is the static shell**: confirmed records frozen in, with holes for what stays live (open decisions, streams, money) | converts | adopt: "shell" |
| C-12 | A static shell is served straight from a CDN | C-11 | A release is read without the router: `naive start`, or a handoff to an investor | converts | (none) |
| C-13 | Next.js requires every route to produce a static shell and says which does not | C-11 | `naive build` checks every open package can be released, and names the holes | converts | (none) |
| C-14 | Maximize the static shell: move async work deep in the tree | C-11, S-11 | Push live and judgment work to the leaves, so more of a package can be released | converts | (none) |
| C-15 | Instant navigation is validated | C-14, N-6 | Agent vitals are checked, not only measured | converts | (none) |
| C-16 | Partial Prefetching; per-link prefetch costs a server call | N-3 | Prefetch has a cost in the context budget | converts | (none) |
| C-17 | Stores: prerendered HTML, a shared server store, the browser; all scoped to one deployment (the build id is in the key) | C-5 | Stores: the release (in git), a local generated cache (`.naive/`), and the agent's session. Upgrading a package or the model starts the cache fresh | converts | (none) |
| C-18 | Incremental Static Regeneration: unknown params get the shell, then are upgraded in the background | C-11, L-7 | A new item (a new customer, a new product) is added to the release without rebuilding the rest | converts | (none) |
| C-19 | Bots and crawlers get a dynamic render | F-7 | Covered by F-7 | converts | (none) |

## Chapter 9: Revalidating

Source: [Revalidating](https://nextjs.org/docs/app/getting-started/revalidating). Keeping cached data fresh: by time (`cacheLife`) or on demand after a change (`revalidateTag`, `updateTag`, `revalidatePath`).

**The translation, and where Naive goes further.** Next.js revalidates caches. A venture also has to revalidate its *knowledge*: evidence ages, a decision goes stale when what it rests on changes (EE-057), and in Discovery even confirmed statements are tested again each phase. So Naive's revalidation has a business dimension Next.js does not need, and it reuses the same two strategies.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| V-1 | Two strategies: time-based and on-demand | C-4 | Both, applied to records as well as caches: freshness windows by time, and staleness when something a record depends on changes | converts, extended | adopt: "revalidate" |
| V-2 | `cacheLife` profiles: `stale`, `revalidate`, `expire` (seconds to max) | V-1 | **Freshness profiles** for records: for example, customer feedback is stale after 30 days, market research after 90. Plus a profile Next.js has no need for: **per phase**, so a record is revalidated when the venture changes phase | AI-native | ours: "freshness" |
| V-3 | Short-lived caches are left out of the prerender and become holes | V-2, C-11 | Fast-changing records (pipeline, money, streams) are never frozen into a release; they stay live holes | converts | (none) |
| V-4 | `cacheTag`: tag cached data so it can be invalidated by tag | V-1 | Refs and the where-used list: a value is tagged with the records it depends on. The where-used list is the tag index | converts | (none) |
| V-5 | `revalidateTag`: stale-while-revalidate, served stale while fresh content loads | V-4 | When a fact changes (a price), what uses it (site pages, a deck, a pitch) is marked stale and still readable with a stale flag until it is redone. Propagating the change to outside tools is the platform's (MDM where-used) | converts | (none) |
| V-6 | `updateTag`: expire at once, so a user sees their own write | V-4, M-15 | A founder's next read after their own write shows it, never a stale copy | converts | (none) |
| V-7 | `revalidatePath`: invalidate everything under a path | V-1 | Mark a whole folder stale. A pivot is `revalidatePath` on the validation package: every assumption is tested again | converts | (none) |
| V-8 | Prefer tags over paths; they are more precise | V-4, V-7 | Prefer exact dependencies over folder-wide staleness | converts | (none) |
| V-9 | Content from a CMS: long lifetime plus a webhook that calls `revalidateTag` on change | V-4 | A system of record (CRM, Ramp) notifies on change, and the summaries that read it are marked stale. Webhooks are the platform's | converts | (none) |

**What chapters 8 and 9 add.** The release as a static shell with live holes (C-11), judgment cache keys that include the model and package versions (C-5), "now" as an explicit input (C-9), freshness profiles including per-phase revalidation (V-2), and pivot as folder-wide revalidation (V-7).

## Chapter 10: Error Handling

Source: [Error Handling](https://nextjs.org/docs/app/getting-started/error-handling). Two kinds of error, expected and uncaught, and the boundaries that contain them.

**The translation, plus a third kind.** Naive has the same two kinds and one Next.js does not: **uncertain**. A judgment below its confidence threshold is neither a failure nor an answer; it goes to a person (TypeSafe's confidence-gated routing).

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| E-1 | Expected errors (validation, failed requests) and uncaught exceptions (bugs) | M-1 | Expected: an invalid write, a missing record, a gate that holds. Uncaught: a bug, such as a cycle in the decision tree or a broken data model. **Uncertain**: a judgment below threshold, routed to the founder | AI-native | ours: "uncertain" |
| E-2 | Model expected errors as return values, not thrown exceptions (`useActionState`) | E-1, M-13 | A refused write returns a structured answer: what failed, why, and the fix (the package's skill and template) | converts | (none) |
| E-3 | A Server Component renders an error message or redirects on a failed fetch | E-1, F-1 | A read that cannot complete answers with what is wrong and where to go next | converts | (none) |
| E-4 | `notFound()` and `not-found.js` | P-14 | Covered by P-14 | converts | adopt |
| E-5 | Error boundaries: `error.js` catches errors below it, and errors bubble to the nearest boundary | P-15, R-4 | A failing check in one package is contained there: the other packages proceed, and only a venture-level failure reaches the venture. The decision tree already works this way (EE-054) | converts | adopt: "boundary" |
| E-6 | `catchError` for component-level boundaries | E-5 | Per-record containment: one bad record does not fail its whole package's read | converts | (none) |
| E-7 | Boundaries do not catch errors in event handlers or async code; catch and store them yourself | E-5, M-12 | A failed trigger or automation (a kit) is recorded and raised as something for the founder to decide, never lost | converts | (none) |
| E-8 | `global-error.js` replaces the root layout when it fails | P-15, I-21 | A broken `venture.json` or data model answers with recovery steps | converts | (none) |
| E-9 | (no Next.js equivalent) | E-1, S-9 | Model failure modes: typed output means a malformed answer cannot come back; a low-confidence one is uncertain (E-1); when a judgment and a code check disagree, the code wins | AI-native | (none) |

## Chapter 11: CSS

Source: [CSS](https://nextjs.org/docs/app/getting-started/css). Tailwind, CSS Modules, global and external stylesheets, ordering, and development versus production.

**Mostly does not convert, and that is the point.** Styling belongs to the interface layer: the platform's views and the visualization skills used inside other harnesses (Torian, earlier today). What converts is the brand: tokens the marketing package holds, which every interface reads and every agent that writes copy follows.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| Y-1 | Tailwind CSS: utility classes | P-24 | An interface's choice, not the framework's. A visualization skill may use it | does not convert | (none) |
| Y-2 | CSS Modules: class names scoped to one file | Y-1 | The styling does not convert. The scoping idea does: a package's own terms stay local unless its glossary exports them | converts with changes | (none) |
| Y-3 | Global CSS imported in the root layout, applied to every route | P-11 | Brand tokens in the marketing package (colors, type, voice rules), read by every view and every agent. Voice rules are the global stylesheet for words | converts with changes | ours: "brand tokens" |
| Y-4 | External stylesheets imported from a package | Y-3 | An outside design system is a reference index, linked and not copied | converts | (none) |
| Y-5 | Ordering and merging: import order decides precedence | Y-3, P-29 | Nearer context wins: an item's own rule over its package's, the package's over the venture brand. The same rule as the `AGENTS.md` chain | converts | adopt |
| Y-6 | Development (Fast Refresh) versus production (minified chunks) | I-24, I-28 | A release contains no CSS. How a release looks is the interface's job | does not convert | (none) |

## Chapter 12: Images

Source: [Image Optimization](https://nextjs.org/docs/app/getting-started/images). `next/image` sizes, lazy loads and prevents layout shift; local images live in `public/`; remote images need an allowlist.

**What converts is rights, not pixels.** Optimization is rendering work, so it belongs to the interface. The framework's part is where an image lives, who made it and whether the venture may use it, the same questions raw sources answer.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| J-1 | `next/image`: size optimization, no layout shift, lazy loading | Y-6 | Rendering work for the interface | does not convert | (none) |
| J-2 | Local images in `public/`, referenced from the base URL | I-23 | Assets in `public/` carry a source and a license, because brand images and photos have rights like raw sources do | converts with changes | adopt |
| J-3 | Remote images need `remotePatterns`, an allowlist of hosts | J-2 | A remote image is a link with a note in `raw/`; a full copy stays private unless the license allows it. The allowlist converts as the list of hosts an agent may fetch from, a Mentura connector setting | converts with changes | (none) |
| J-4 | Static imports supply width and height automatically | J-1 | Asset facts (dimensions, alt text, credit) are filled in by code at check time so agents never guess them. Alt text written by an agent carries agent provenance until a person confirms it; a missing credit fails the check | AI-native | (none) |
| J-5 | Dynamic image paths need a static prefix | J-2 | No equivalent | does not convert | (none) |

## Chapter 13: Fonts

Source: [Font Optimization](https://nextjs.org/docs/app/getting-started/fonts). `next/font` self-hosts fonts, scopes them to a component, and applies them app-wide from the root layout.

**Fonts are brand tokens.** Nothing here needs a new concept.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| T-1 | `next/font` self-hosts fonts, so the browser makes no outside request | Y-3 | Typefaces are brand tokens, recorded with their license | converts with changes | (none) |
| T-2 | A font is scoped to the component that uses it; the root layout applies it everywhere | Y-5 | Same precedence as Y-5 | converts | (none) |
| T-3 | Google Fonts and local font files | T-1 | Nothing beyond T-1 | does not convert | (none) |

## Chapter 14: Metadata and OG images

Source: [Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images). A static `metadata` object or `generateMetadata`, default fields, streaming metadata, memoized reads, file-based icons and OpenGraph images, and generated images.

**Converts strongly.** Every record already carries metadata (the frontmatter fields `type`, `source`, `created`, `ai-model`, `tags`) and every venture has an identity in `venture.json`. The AI-native addition is a header that lets an agent stop reading early.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| O-1 | A static `metadata` object exported from a layout or page | P-10, P-11 | Record frontmatter plus the venture identity in `venture.json` | converts | adopt: "metadata" |
| O-2 | `generateMetadata` for metadata that depends on data | O-1 | Fields derived by code from the record (counts, phase, owner, state), never written by a model | converts | (none) |
| O-3 | Default fields added to every route (charset, viewport) | O-1 | Fields the framework adds to every record without being asked: id, created, and provenance (person or agent) | converts | (none) |
| O-4 | Streaming metadata, but blocking for bots that read only the head | C-11 | Header first: a record's header (what it is, its state, its owner) is returned before its body, so an agent can decide to stop reading. This spends less of the context budget (N-13) | AI-native | (none) |
| O-5 | `React.cache` so metadata and page share one fetch | C-5 | A read happens once per action and is shared by the layout and the record | converts | (none) |
| O-6 | File-based metadata (favicon, `opengraph-image`); nested files take precedence | P-24, P-25 | Covered by P-24 and P-25; nested precedence follows Y-5 | converts | (none) |
| O-7 | Generated images with `ImageResponse` | P-25 | The release card is assembled by code from the release's records: venture name, phase, the headline numbers, and who confirmed them. Drawing it is the interface's job | converts with changes | "release card" (decided) |

## Chapter 15: Route Handlers

Source: [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers). `route.js` handles requests with the Web Request and Response APIs, by HTTP method, optionally cached.

**The venture's API.** A route handler is how other programs use a route without a view. Naive's router already works this way: each route has actions (`run`, `layout`, and others in `interface/router.mjs`). The AI-native step is that the same actions become an agent's tools.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| H-1 | `route.js`: a custom request handler for a route | P-10 | The actions on a route, which the router exposes today | converts | ours: "action" |
| H-2 | Supported methods; an unsupported one gets 405 | H-1 | Each route lists its actions; an unsupported action is refused with the list of the ones that exist | converts | (none) |
| H-3 | Not cached by default; `GET` can opt in | C-5 | Reads may use the judgment cache; writes never do | converts | (none) |
| H-4 | With Cache Components, a `GET` is prerendered unless it reads runtime data | C-11 | A read that touches no model and no live stream is part of the release; one that does is a live hole | converts | (none) |
| H-5 | Special handlers (sitemap, OG image) are static by default | O-7, P-26 | Covered by O-7 and P-26 | converts | (none) |
| H-6 | `route.js` and `page.js` cannot share a segment | P-10 | A record has both a file and actions, and they never collide, because actions are verbs on the record rather than a second file | does not convert (by design) | (none) |
| H-7 | `RouteContext` types, generated by `next typegen` | I-25 | `naive typegen` generates the types of each route's actions and parameters, so agent tool definitions come from the schema instead of being written by hand | AI-native | `naive typegen` (decided) |
| H-8 | Backend for Frontend: Next.js as the backend | H-1, H-7 | A venture served as an MCP server: every route's actions become tools that Claude Code, Codex or Cursor can call. Hosting it is Mentura's | AI-native | (none) |

## Chapter 16: Proxy

Source: [Proxy](https://nextjs.org/docs/app/getting-started/proxy). Formerly Middleware: code that runs before a request completes, to rewrite, redirect, change headers or respond.

**Proxy is the gate (P-5).** This chapter fixes the gate's rules. The most important carries over directly: Next.js says not to use proxy for slow work or as the whole authorization story, and the gate must not call a model.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| X-1 | Runs before a request completes: rewrite, redirect, set headers, or respond | P-5 | The gate runs before every write: hold it as a draft, send it to the function owner, or refuse it | converts | "gate" (decided) |
| X-2 | Use cases: headers, A/B rewrites, redirects from request data | X-1 | Route an agent's write to its function owner. An A/B rewrite becomes two drafts of one decision held side by side for the founder | converts with changes | (none) |
| X-3 | Prefer the `redirects` config for simple cases | X-1 | Static rules (which functions fail closed) live in `naive.config.json`; the gate is for rules that read the write itself (who wrote it, its confidence) | converts | (none) |
| X-4 | Not for slow fetching, and not a full authorization solution | X-1, P-27 | The gate is fast and never calls a model; confidence-gated routing reads a score already computed. Access (P-27) is checked again at the record, not only at the gate | AI-native | (none) |
| X-5 | One proxy file per project, with logic split into modules | X-1 | One gate per venture, with each package's rules imported from its package definition | converts | adopt |
| X-6 | `matcher` limits which paths it runs on | X-1 | A rule declares the routes it covers with the router's own path patterns | converts | (none) |

## Chapter 17: Deploying

Source: [Deploying](https://nextjs.org/docs/app/getting-started/deploying). Node.js server, Docker, static export, and adapters, with different feature support.

**Deploying a venture is publishing a release.** Next.js's table of options maps closely: run it yourself with everything except hosted features, export it static, or run it on a platform through an adapter.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| Z-1 | A Node.js server supports every feature | I-17 | The CLI on the founder's machine supports every framework feature; platform features (connectors, monitoring, hosted agents) need Mentura | converts | (none) |
| Z-2 | Docker containers | Z-1 | Nothing for the founder. The platform may containerize hosted agents | does not convert | (none) |
| Z-3 | Static export, with limited features | C-11 | A release exported as files (Markdown and JSON, or a PDF or site drawn by an interface): no live holes, and every number frozen with its date | converts | adopt: "export" |
| Z-4 | Adapters let platforms customize build and deploy; verified adapters pass the Next.js test suite | Z-1 | Mentura is Naive's first adapter, as Vercel is for Next.js. Claude Code, Codex and Cursor adapt the framework through `AGENTS.md` and skills. An adapter is verified when it passes the framework's tests | converts with changes | adopt: "adapter" |
| Z-5 | Deploy templates per host | Z-4, I-1 | Starter ventures for `npx create-venture` | converts | (none) |

## Chapter 18: Upgrading

Source: [Upgrading](https://nextjs.org/docs/app/getting-started/upgrading). `next upgrade`, codemods for older versions, an agent-run upgrade, the canary channel, and version guides.

**Next.js already went AI-native here** (`--agent`). Naive's version adds the rule that the checks decide and a person confirms.

| # | Next.js | Builds on | Naive | Status | Word |
| --- | --- | --- | --- | --- | --- |
| U-1 | `next upgrade` | I-29 | `naive upgrade` updates the framework and its packages | converts | adopt |
| U-2 | Codemods rewrite code for older versions | U-1 | Migrations rewrite records when a package's schema changes, with aliases for renamed folders. The kit-to-package rename is the first one | converts | (none) |
| U-3 | `--agent`: a coding agent performs and verifies the upgrade | U-1 | An agent runs the upgrade and then the checks; its changes stay drafts until the checks pass and the founder confirms. A Mentura kit (I-29) | AI-native | (none) |
| U-4 | Manual upgrade: install the latest versions | U-1 | Package versions are pinned in `naive.config.json` | converts | (none) |
| U-5 | Canary channel, with features not yet stable | U-1 | Experimental packages, and the option (agreed earlier) to adopt a later phase's packages early | converts with changes | (none) |
| U-6 | A guide for each major version | U-2 | A guide for each framework version, bundled with the docs (I-29) | converts | (none) |

## What Getting Started adds to the design

Chapters 1 to 18 are done. These are the design additions they produced, in the order they would be built after the deadline.

1. **Layout as the `AGENTS.md` chain** plus what the package definition supplies (P-11, P-29, Y-5).
2. **The `"use model"` boundary**: a package declares which steps use a model, and everything downstream carries agent provenance until confirmed (S-9).
3. **The `private` marker** and a check that fails the build if a private record or field could reach a model (S-16).
4. **Three kinds of error**: expected, uncaught, and uncertain, the last routed to a person (E-1).
5. **The gate's rules**: fast, no model calls, one per venture, per-package rules imported (X-1 to X-6).
6. **The release as a static shell with live holes**, freshness profiles including per-phase revalidation, and pivot as folder-wide revalidation (C-11, V-2, V-7). Static export freezes it (Z-3).
7. **The judgment cache**, keyed by model and package versions (C-5), with "now" as an explicit input (C-9).
8. **Header-first reads** to save the context budget (O-4, N-13), and **agent vitals** recorded through instrumentation (N-6, P-4).
9. **`naive typegen`** generating agent tool definitions, and a venture served as an MCP server (H-7, H-8).
10. **Adapters**: Mentura first, then harnesses through `AGENTS.md` and skills, verified by the framework's tests (Z-4).
11. **Agent-run upgrades and record migrations** (U-2, U-3).

**Decided (Torian, 23:54Z):** "uncertain" (E-1), "brand tokens" (Y-3), "action" (H-1), "export" (Z-3) and "adapter" (Z-4). Still open: what plays React's role under Naive.

## What builds on what so far

Two chains run through the first two chapters. Later chapters (Layouts and Pages, Linking, Fetching Data and on) all hang off the routing chain.

**The routing chain.** File-system routing (I-19) → the venture folder (I-20) → the root layout (I-21) → the home view (I-22) → records as routes (P-10) and nested context (P-11, P-18) → dynamic segments, groups and private folders (P-19 to P-22) → the special files (P-12 to P-17) → the order the router resolves them (P-28) → colocation and what ships in a release (P-30, P-31) → the organizing strategy, split by function (P-34).

**The tooling chain.** The generator (I-1) → recommended defaults and `AGENTS.md` (I-3, I-4) → setup questions (I-7) → the scripts (I-17) → the edit loop with live checks (I-24) → building a release that must pass checks (I-28) → upgrading with bundled docs (I-29).

**Where Naive differs most so far.** It is opinionated about structure (P-34); checks block a release instead of being optional (I-28); and three concepts are AI-native rather than translated: supported agents (I-6), setup answered from an idea dump (I-7), and live System 1 checks on save (I-24).

**Chapter 3 on the routing chain.** Record types (R-1) and their inputs (R-2) → records at routes (L-1) → shared context (L-2) → root, segment and leaf (L-4) → per-folder `layout.md` (L-5) → a package's own route (L-6) → `[id]` items and their params (L-7, L-9) → refs as links (L-12) → generated route types (L-14). Linking and Navigating, the next chapter, picks up from refs.

**Chapter 4 on the routing chain.** Router-answered reads (N-1) and code-side work (R-3) → precomputed against per-call answers (N-2) → prefetching from refs and `after` links (N-3, N-4) → streaming and suspense (N-5, R-4) → agent vitals and the context budget (N-6, N-13). Server and Client Components will settle R-3: server is code, client is the model.

**Chapter 5 settles R-3.** Code by default (S-1) → the payload with placeholders for judgments (S-6) → the declared model boundary (S-9) → provenance across it (S-10) → narrow questions at the leaves (S-11) → cached judgments (S-8) → nothing private to a model (S-16). Fetching Data comes next and builds on the payload and streaming.

## Vocabulary decisions for this batch

Marked `open` above. My recommendation is first; change any of them.

| Concept | Next.js word | Options | Recommendation |
| --- | --- | --- | --- |
| I-1 the generator | `create-next-app` | `create-venture`, `naive create`, `naive init` | `npx create-venture`, mirroring `create-next-app`, with `naive init` for an existing folder |
| The CLI | `next` | `naive`, `mentura` | `naive` for the framework; `mentura` only for platform commands (EE-041) |
| I-12 source folder | `src/` | `venture/`, `business/` | `venture/` |
| I-16 the library under the framework | React | the record model, "records" | Open; the record and provenance model is the candidate, worth its own discussion |
| I-23 shipped assets | `public/` | `public/`, `assets/` | `public/`: same meaning, familiar |
| P-2 config | `next.config.js` | `naive.config.json` | `naive.config.json` |
| P-4 instrumentation | `instrumentation.ts` | `instrumentation`, "events" | `instrumentation`: same idea, and it sets up analytics |
| P-5 before-write checks | `proxy` | `gate`, `proxy` | `gate`: the word already used across the decisions work |
| P-25 share preview | `opengraph-image` | "cover card", "release card" | "release card" |
| P-27 access rules | `robots` | `robots`, `access` | `access`: `robots` means crawlers to most people |
| P-35 unknown folders | (none) | allowed, refused | Allowed, never routed or released |

Words adopted as they are: recommended defaults, layout, template, loading, not-found, error, default, root layout, route groups, private folders, dynamic segments, slots, colocation, dev, build, start, upgrade.

**Decided (Torian, 23:18Z).** Every recommendation above is adopted, except what plays React's part under Naive, which stays open. Recorded in EE-072.

**Views (Torian, 23:21Z).** A page that renders Naive data is the platform's (Mentura). Inside another harness (Claude Code, Codex, Cursor) it is a visualization skill. The framework produces data and routes only.

**Open from Chapter 3.** (1) A founder's per-folder context file: `layout.md` (my pick, since it matches the concept and reads plainly) or `AGENTS.md` (familiar to coding agents, but it means repo instructions to most people). (2) The route-types generator: `naive typegen` (my pick, the same word as Next.js). Adopted as they are: segment, leaf, children, params.

**Decided (Torian, 23:33Z):** `naive typegen`.

**AGENTS.md or layout.md (L-5), weighed.** Source: [agents.md](https://agents.md/), read 2026-10-28. AGENTS.md is "a simple, open format for guiding coding agents", plain Markdown with no required fields, stewarded by the Agentic AI Foundation under the Linux Foundation, read by Codex, Cursor, Copilot's coding agent, Gemini CLI, Jules, Windsurf, Zed and others, and used by over 60,000 projects. Nested files are part of the format: "the closest one takes precedence", and a user's chat prompt overrides everything.

|  | `AGENTS.md` | `layout.md` |
| --- | --- | --- |
| Reaches agents that never call Naive's router (an agent editing files directly) | Yes: harnesses read it on their own | No: only through the router |
| Nesting | Built in: the nearest file wins, which is how layouts nest | Ours to define and teach |
| Familiar to | Every coding agent, and developers | Next.js users, as a concept |
| Fit for a business folder | Named for coding agents, but its readers here are agents of any kind | Matches the concept exactly |
| Inside a code repository | Can collide with the repo's own coding instructions in the same folder | No collision |
| Claude Code | Reads `CLAUDE.md`; a one-line `@AGENTS.md` import covers it, as this repo already does | Needs the router or a skill |

**Recommendation: `AGENTS.md` for the file, "layout" for the concept.** The file is what the founder writes for agents in a folder; the layout is what the router assembles for an action: the chain of `AGENTS.md` files from the venture root down, plus what the package definition supplies (skills, template, gates). The collision risk is small because a venture's business folders are not code folders; where a venture sits inside a code repo, its records live under `venture/` (I-12), so its `AGENTS.md` files never share a folder with the code's.

**Decided (Torian, 23:35Z):** `AGENTS.md` is the file and "layout" is the concept. In any folder of a venture, the founder writes `AGENTS.md` for agents; the router's layout is the chain of those files from the root down plus what the package definition supplies.

**Decided (Torian, 23:39Z):** "agent vitals" (N-6) and "context budget" (N-13).

**Decided (Torian, 23:43Z):** `"use model"` for the declared model boundary (S-9), and `private` for the marker that keeps a record or field away from every model (S-16), the standard data-classification word.

## Future concepts noted along the way

**Decision analytics** (Torian, 23:08Z and 23:11Z: build it if there is time, otherwise foreshadow it). Next.js has `instrumentation` in the framework and Analytics and Speed Insights on Vercel. Naive's split is the same:

- **Framework (Naive):** the instrumentation hook (P-4) records each decision with its type, function, owner, phase, projected outcome and due date. Decision records already carry provenance, outcomes and unlocks (EE-058), so most of the data exists.
- **Platform (Mentura):** decision analytics, like Vercel Analytics: how many decisions of each type each function has made; projected versus actual outcomes; the highest-impact decisions over time (a Score of impact combined in code with outcomes); and how long decisions survive.

**For the demo.** A first version is small: counts of decisions by type and function, and open versus decided, read from the `decisions/` records on the board. Outcome tracking and impact ranking can be shown as the next view. I can build that first version after this review if you want it in the demo.
