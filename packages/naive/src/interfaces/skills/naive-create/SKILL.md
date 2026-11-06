---
type: knowledge
tags: [everything-ecosystem, naive, skills, interface, create-venture, plugin]
ai-model: claude-opus-5.5
created: 2026-10-29T08:55:00Z
source: hybrid
name: naive-create
description: >
  Create a new Naive venture from conversation: ask what the founder is
  building, their role, who else is founding it and the phase, then run
  create-venture with those answers and hand over to naive-setup (EE-082).
  MANDATORY TRIGGERS: start a venture, create a venture, new venture, start a
  company, start a startup, start a fund, set up a business with naive, use naive.
---

# Create a venture

Interface layer (EE-082). This is how a founder starts with Naive from inside their agent, with no docs and no terminal of their own. You ask the setup questions in conversation, run `create-venture` once with the answers, and then hand over to the `naive-setup` skill.

## 1. Ask, one question at a time

Ask these in order, in plain words, and wait for each answer. Never answer for the founder.

1. **What is the venture called?** This becomes its folder name.
2. **What are you building?** Take their words as they say them. Read the venture types and their roles with `npx -y -p naive-framework@latest naive types`. Say which type their words fit, and ask them to confirm it or pick another: software startup, VC fund or firm, services business, local business, e-commerce or physical product, creator or media, nonprofit, holding company, or side project. Without their confirmation, do not pick a type.
3. **What is your role in it?** Offer only the roles the type has. For example, a VC fund has a general partner, a limited partner, an operator, an advisor and a board member.
4. **What is your name?** It goes in `people/`.
5. **Are you building it alone, or with others?** If with others, ask for their names.
6. **Which phase is it in?** Offer discovery, validation, beachhead, scale or platform. Most new ventures are in discovery.
7. **Where does each function keep its truth?** This is optional, so ask once. Examples: the product's repo and GitHub, Vercel for hosting, Stripe or Shopify for sales, Rho for money. Write down what they name. A function they have not set up yet stays out.

## 2. Show the command, then run it

Put the answers into one command, and show it to the founder before you run it:

```bash
npx -y create-venture@latest <name> --yes --type <type id> --role <role id> --name "<their name>" \
  [--team "<name>, <name>"] --phase <phase> [--source <function>=<system>[:<address>] ...]
```

- `--yes` only skips questions you have already asked. Every flag carries one of the founder's answers.
- `--source` takes a function from the catalog (products, marketing-and-sales, customer-service, finance, legal and the rest) and a system from it: `local-repo`, `github`, `vercel`, `cloudflare`, `stripe`, `square`, `shopify`, `rho`, `google-drive`, `docusign` or `local-folder`. An address can follow a colon, as in `github:acme/app`.
- With `finance=rho`, Rho is synced at once. It reads the founder's account when `RHO_API_TOKEN` is set, and otherwise Rho's sandbox, a fictional company. Say which one it was. Never present sandbox money as the founder's own.

Run it in the folder the founder works in. When it finishes, say what it created: the type, the people and their hats, the sources of truth and whether Rho synced, and what was installed.

## 3. Hand over to setup

Then go straight on with the `naive-setup` skill, inside the new venture. It walks the founder through the foundation and the first decisions, and shows their progress as an artifact.

## Rules

- Never decide for the founder. Every type, role, name and answer is theirs, in their words.
- Never open or print `.env` files or credentials. If a command needs a token, ask the founder to set it themselves.
- If a command fails, show its error as it is, and fix what it names. Do not retry blindly.
