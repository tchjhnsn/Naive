---
title: The docs live in this repository
date: 2026-10-28
authors:
  - Torian
summary: EE-034 put the developer docs in site/. EE-080 records the move from Nextra to Fumadocs, and the app stays noindex.
tags:
  - docs
image: /blog/docs-site/image
---

<!-- DRAFT: agent-written, needs Torian -->

The developer docs are a Next.js app in `site/` of this repository, so docs and code can change in one pull request (EE-034). EE-034 chose a Nextra 4 docs theme. EE-080, dated 2026-10-28, says the developer docs move from Nextra to Fumadocs in `site/`, and that this supersedes the Nextra sentence of EE-034.

## What EE-080 records

EE-080 is proposed in `docs/decisions/decisions.json`. It also says:

- Marketing pages live in the same app. They may read only the facts named in the Naive docs handoff, written by `site/scripts/venture-facts.mjs` to `site/generated/venture-facts.json`. `site/scripts/data.mjs` still reads no instance venture.
- `test.mjs` and the site CI job run `npm run check:content` instead of `site/scripts/check-mdx.mjs`.
- The zod 4.1.12 pin may be removed once Nextra is gone and the build passes.
- These marketing pages are added to the existing docs app and do not start from a Vercel template. The template stays the default for a later standalone marketing site.

The changelog at `site/content/docs/changelog.mdx` (published at [the changelog](/docs/changelog)) says the site in `site/` uses Fumadocs, docs URLs live under `/docs`, and `/` is the marketing page. It lists marketing pages at `/`, `/why`, and `/for`, plus `/llms.txt` and `/llms-full.txt`. The changelog page status is draft.

## Names, and where the preview is hosted

EE-043 names the platform Mentura and the framework Naive. The docs page [Naive and Mentura](/docs/concepts/naive-and-mentura) says these docs describe Naive, and that Mentura is the platform. The fallback site URL in `site/lib/layout.shared.tsx` is `https://mentura-docs-tchjhnsns-projects.vercel.app`. The handoff `instance/ventures/everything-ecosystem/operations/handoffs/naive-docs-and-marketing-site.md` says that Vercel project is for previews and is not to be renamed.

## Still noindex

EE-034 says the site stays unpublished (noindex, no deploy) until the owner accepts the developer-docs channel in the venture's publication policy. `site/app/layout.tsx` sets robots to noindex and nofollow. `site/app/robots.ts` disallows `/` for every user agent.

## Where this is written

- EE-034, EE-043, and EE-080 in `docs/decisions/decisions.json`
- `site/content/docs/changelog.mdx`
- `site/content/docs/concepts/naive-and-mentura.mdx`
- `site/lib/layout.shared.tsx`
- `site/app/layout.tsx` and `site/app/robots.ts`
- `instance/ventures/everything-ecosystem/operations/handoffs/naive-docs-and-marketing-site.md`
