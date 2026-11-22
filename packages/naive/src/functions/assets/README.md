# assets

Up: [functions](../README.md)

## What this is

The assets and facilities function (APQC 10.0, Acquire, Construct, and Manage Assets). Its governance side is purchase approval; its operations side is equipment, property and leases. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The function's manifest: purpose, intake workflow, measures and capability clusters |
| [agent.md](./agent.md) | The assets agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's equipment and space |
| [workflows/monthly-asset-review.json](./workflows/monthly-asset-review.json) | Workflow: review equipment custody and lease dates each month |
| [skills/asset-register](./skills/asset-register) | Skill: keep the asset register (`assets/register/[id]`): what to register, custody and disposal |
| [skills/lease-review](./skills/lease-review) | Skill: abstract a lease into `assets/leases/[id]`, flag hard-to-exit terms and raise notice dates in time |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/assets.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |
