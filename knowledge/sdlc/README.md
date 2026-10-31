# SDLC catalog

What software work exists, written as knowledge Naive can reason over (requirement R-26). `catalog.json` lists the processes of the software life cycle after ISO/IEC/IEEE 12207:2017, in its four groups (agreement, organizational project-enabling, technical management, technical). Each technical process has three activities (prepare, perform, manage results) and the tasks under them. Every task names:

- the **decision classes** it needs, from the venture's decision rights (`governance/venture-template/decision-rights.json`);
- the **phase it is first needed in** (`needed_from`: discovery, validation, beachhead, scale, platform), so Naive can project which software decisions a venture faces now;
- the **role that owns it**, a role template in `governance/venture-template/roles/`. Product and design lead (alias product manager) owns whether, why and what; architect (alias CTO) owns how and technology (R-24). One person or agent may hold both.

## What is not here

- **How the work is done.** Methods, templates and conventions are MAD's (R-27). Each technical process names the `mad_module` that routes its methods; MAD's own description of each module is in the MAD repository under `processes/<module>/README.md`. Business or mission analysis has no MAD module: whether and why to build is the product function's question (R-21).
- **Who does it.** The agent router in Naive resolves a task by role, then delegation, then an assignee chosen by capability (R-25). Executors such as pstack, Claude Code, Cursor or a person are never named here (R-28).
- **The standard's text.** Names and wording are Naive's own; clause numbers cite the standard. Clause numbers are from 12207:2017 and should be checked against a licensed copy before anything relies on them.

## How MAD uses it

MAD's `method-request` names a task as `<mad_module>/<activity>/<task>`, for example `implementation/perform/write-code`. `node schema/check-sdlc-catalog.ts --refs` prints every such reference, and the check fails if two tasks would share one. The catalog's `version` is the `catalog_version` a request carries, so MAD knows which catalog it was asked against.

Only the technical processes carry activities and tasks so far. The management, enabling and agreement processes are listed with their owning role and the MAD layer whose questions cover them (`mad_layer`); their tasks are added when a venture needs them.

## Checks

- `python3 schema/validate.py` validates `catalog.json` against `schema/sdlc-catalog.schema.json`.
- `node schema/check-sdlc-catalog.ts` checks what the schema can't: unique process ids, clauses that match their group, decision classes and roles that exist, a MAD module on every technical process MAD routes, and unique task references.

Nothing reads the catalog yet: projecting a venture's software decisions from it, and sending MAD a method-request, are not built.
