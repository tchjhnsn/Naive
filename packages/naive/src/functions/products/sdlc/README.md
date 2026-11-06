# SDLC catalog

What software work exists, written as knowledge Naive can reason over (requirement R-26). `catalog.json` lists the processes of the software life cycle after ISO/IEC/IEEE 12207:2017, in its four groups (agreement, organizational project-enabling, technical management, technical). Each technical process has three activities (prepare, perform, manage results) and the tasks under them. Every task names:

- the **decision classes** it needs, from the venture's decision rights (`governance/venture-template/decision-rights.json`);
- the **phase it is first needed in** (`needed_from`: discovery, validation, beachhead, scale, platform), so Naive can project which software decisions a venture faces now;
- the **role that owns it**, a role template in `governance/venture-template/roles/`. Product and design lead (alias product manager) owns whether, why and what; architect (alias CTO) owns how and technology (R-24). One person or agent may hold both.

Every process also names its **function**: one of the venture's 13 functions (the APQC categories in `packages/naive/src/functions/departments.json`). Most of the software processes are the products function's. Operating the software, managing infrastructure and managing information are IT's. Risk management is risk and compliance's, human resources is human capital's, acquisition is the supply chain's, and supply is marketing and sales'. Life cycle model, portfolio, quality and knowledge management, and measurement, are capabilities (APQC files process, portfolio, quality and knowledge management there). So functions stay total: a venture with no software still has the products function, just with none of this work in it.

## What is not here

- **How the work is done.** Methods, templates and conventions are MAD's (R-27). Each technical process names the `mad_module` that routes its methods; MAD's own description of each module is in the MAD repository under `processes/<module>/README.md`. Business or mission analysis has no MAD module: whether and why to build is the product function's question (R-21). Disposal has none yet either, because it has no activities so far.
- **Who does it.** The agent router in Naive resolves a task by role, then delegation, then an assignee chosen by capability (R-25). Executors such as pstack, Claude Code, Cursor or a person are never named here (R-28).
- **The standard's text.** Names and wording are Naive's own; clause numbers cite the standard. Clause numbers are from 12207:2017 and should be checked against a licensed copy before anything relies on them.

## How MAD uses it

MAD's `method-request` names a task as `<mad_module>/<activity>/<task>`, for example `implementation/perform/write-code`. `node packages/naive/src/checks/check-sdlc-catalog.ts --refs` prints every such reference, and the check fails if two tasks would share one. The catalog's `version` is the `catalog_version` a request carries, so MAD knows which catalog it was asked against.

A request's `open` list is a projection of this file, never a hand-made list. `node packages/naive/src/checks/check-sdlc-catalog.ts --phase <phase> [--processes a,b]` prints it, where `--processes` takes process ids and fails on an id the catalog does not have: every task a MAD module routes that is needed by that phase, with the `enumeration` block MAD's contract 0.2.0 requires (the catalog file's sha256, the phase, and the count). MAD refuses a request whose `open` list differs in length from the count, so a task can't silently drop out.

Only the technical processes carry activities and tasks so far. The management, enabling and agreement processes are listed with their owning role and the MAD layer whose questions cover them (`mad_layer`); their tasks are added when a venture needs them.

## Checks

- `python3 packages/naive/src/records/validate.py` validates `catalog.json` against `packages/naive/src/records/sdlc-catalog.schema.json`.
- `node packages/naive/src/checks/check-sdlc-catalog.ts` checks what the schema can't: unique process ids, clauses that match their group, decision classes and roles that exist, a function that is one of the 13 departments, a MAD module on every technical process MAD routes, and unique task references.

Nothing sends MAD a method-request yet: the `--phase` projection prints what one would carry, but turning a venture's phase into a request is not built.
