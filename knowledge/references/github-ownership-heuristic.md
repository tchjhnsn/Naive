---
type: reference
ai-model: claude
source: hybrid
created: 2026-04-23
updated: 2026-04-23
last-reviewed: 2026-04-23
authorship: sole
ip-sensitivity: normal
scope: global
tags: [reference, github, ownership, heuristic, sad-v3]
---

# GitHub Ownership Heuristic

When a vault entity has code, the code lives in a GitHub repo. The question this reference answers: **where on GitHub does the repo belong?** Personal account, an existing org, a new dedicated org, or no repo yet.

Companion to [[SAD_SKILL_v3]] and [[entity-profile-schema]]. Cited from the code-pointer pattern in [[CLAUDE|vault constitution Part II]].

## The rule

**Default to personal. Promote to an org only when concrete friction demands it.**

Personal GitHub handles almost everything a solo operator encounters. Infinite collaborators, infinite repos, high commit volumes, production deployments, open-source projects with community contributions — all fine at a personal account. An organization is not a reward for a repo getting large, popular, or mature. It's a tool that solves specific operational and legal problems. Use it only when those problems actually exist.

This is a **pressure test**, not a threshold. Ask: *is managing this at personal actively causing pain that the org structure would concretely resolve?* If no, stay personal. If yes, consider promotion.

## What's not a trigger

These *feel* like promotion triggers and aren't:

- **Number of contributors.** A personal repo with 50 contributors works fine. GitHub doesn't gate collaborator count by account type.
- **Commit volume.** A personal repo with thousands of commits is fine.
- **Lifecycle stage.** An entity reaching `prototyping`, `active`, or even `maintenance` doesn't require an org.
- **Production deployment.** Deploying from a personal repo is fine. Many successful indie products live at their author's personal account.
- **Having a distinct brand in documentation.** Brand exists in the vault. A surface or a business can have its own brand identity without owning its own GitHub org; the brand lives in the `brand/` pillar of the entity, not in the GitHub URL.
- **Having a co-developer.** Two developers on a personal repo works fine via collaborator access.
- **Being a business (`entity-class: business`).** Businesses under solo management don't need org separation. The business is a vault classification; it doesn't automatically earn org treatment.

## What is a trigger

Concrete operational or legal friction the personal account can't handle:

- **IP / legal ownership needs to rest with a legal entity.** When a business has contracts, investors, licensing terms, or an acquisition posture, personal ownership of the code becomes a real liability. Contracts that name the business as the owner of the code require the repo to live under a namespace that represents the business. This is the strongest trigger.
- **Permissions management has become unwieldy.** A meaningful team with differentiated access — multiple roles, many repos, complex branch protections — crosses the point where personal collaborator lists stop scaling. Org teams are purpose-built for this. Does not apply to teams of 2–3 friendly contributors.
- **Brand identity is being actively confused.** When users, partners, press, or prospective hires keep asking "why is this at your personal account?" the URL is sending a wrong signal that the org would correct. Not hypothetical confusion — actual, observed confusion.
- **Imminent separation.** You're selling, spinning off, or transferring governance. The transfer path is much cleaner through an org than from a personal account.
- **Paid-tier features specifically needing org context.** Rare; most GitHub paid features work on personal. Check the specific feature.

If none of these apply, stay personal.

## Signals skills should watch for

These are conversational or lifecycle signals that should prompt the pressure-test question, not answer it:

- "We're negotiating a contract" / "investors need to see" / "legal asked about the repos"
- "I'm bringing on a co-founder" / "my co-developer wants"
- "We're considering selling / spinning off / open-sourcing under a foundation"
- "Collaborators / users / press keep asking why this is at my personal account"
- An entity reaching a major milestone (v1.0 ship, public launch, first paying customer) — a natural moment to revisit, *not* an automatic promotion

When these signals appear, open the pressure-test: *is there friction? would an org resolve it? or can we continue at personal?* Most of the time the answer is continue at personal.

## The org is not free

Org creation and cross-org repo management carry real operational costs:

- **Context-switching tax.** Every time you work, you have to figure out which account a repo lives under.
- **Permissions drift.** Orgs have team structures, owner roles, outside collaborators, billing contacts. Each is a thing to maintain.
- **URL churn.** Moving between accounts changes URLs, breaks old links, confuses bookmarks.
- **Mental overhead.** An org that exists but doesn't get used is a background cost — it shows up in settings, billing, notifications.

For a solo operator, keeping everything at personal is *strictly cheaper* than orgs + personal, until the triggers above make the personal arrangement strictly more expensive.

## The `development-team` field (code-pointer frontmatter)

New optional field on every code-pointer note:

```yaml
development-team: solo | team-<size> | community
```

- `solo` — single developer (the vault owner). Default for nearly everything.
- `team-<size>` — concrete team count, e.g., `team-3`. Use only when a real committed team exists.
- `community` — open-source project with external contributors. Reflect qualifies once it has a contributor other than the author. Doesn't require an org.

This is descriptive, not prescriptive. Changing the field doesn't automatically change placement; it just makes the current state visible to Dataview queries.

## Current placement snapshot [moved to the private holding area: it lists specific projects]

## Graduation ritual

When a trigger fires and promotion is decided:

1. **Confirm the trigger is concrete.** Run the pressure test: "what specific friction does the org resolve? what does staying at personal cost that the org wouldn't?" Write the answer down.
2. **Revisit all affected entities at once.** If <reference-project>'s main repo needs to move, <reference-project>, <reference-project>, and the six surfaces with code should move together. Piecemeal org adoption creates more URL churn than one coordinated pass.
3. **Update vault pointer files to the new URLs** in the same session as the GitHub transfer. Don't let the pointer and reality drift.
4. **Update local git remotes** on each affected clone.
5. **Log the graduation** in `_meta/github-setup-log.md` with the trigger that caused it and the scope that moved.
6. **Don't de-graduate lightly.** Moving back to personal after org adoption is possible but it's a second wave of churn. Graduate when the trigger is sustained, not a one-off.

## Naming conventions

Once an entity's placement is decided, the repo name should match:

- At personal: the repo name matches the vault entity's folder name. A project file → `<owner>/<repo>`.
- Under an org: drop parent-business prefixes when the repo is fully inside the parent's org. `<org>/ai-lab`, not `<org>/<reference-project>`. Prefixes are for disambiguation on a shared namespace (personal); inside an org the org is the prefix.
- Capitalization: lowercase-kebab-case by default. `<owner>/<repo>` is a legacy mixed-case exception; cosmetically rename to `<owner>/<repo>` when convenient.

## Cross-references

- [[SAD_SKILL_v3]] — session-opening and code-pointer rituals that consume this heuristic.
- [[entity-profile-schema]] — adds `development-team` to code-pointer frontmatter conventions.
- [[CLAUDE|vault constitution Part II]] — code-pointer pattern.
- `_meta/github-setup-log.md` — historical GitHub operations.
- `_meta/project-code-audit-2026-04-23.md` — the audit that surfaced the need for this heuristic.

## Changelog

| Date | Change | Trigger |
|------|--------|---------|
| 2026-04-23 | Created. Default-personal rule with pressure-test for promotion. | SAD v3 Campaign Session 14 (GitHub ownership clarification) |
