# external-relationships

Up: [functions](../README.md)

## What this is

The external relationships function (APQC 12.0, Manage External Relationships). Its governance side is who may speak for the venture; its operations side is investor relations, partners, press and government affairs. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The external relationships agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's investors and raise. It waits on a live problem record, live goals and a meeting that walked `strategy/intake` and closed with its goal reached (EE-217), so nobody is asked for money before the venture can say what it is for. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/monthly-investor-update.json](./workflows/monthly-investor-update.json) | Workflow: draft the monthly investor update |
| [workflows/weekly-raise-review.json](./workflows/weekly-raise-review.json) | Workflow: review an open raise each week |
| [skills/fundraise](./skills/fundraise) | Skill: Run a fundraise as a bounded project in a raise record: the ask and milestone, start and stop dates, the securities exemption, materials, target investors and every meeting with its follow-up |
| [skills/stakeholder-update](./skills/stakeholder-update) | Skill: Compose a stakeholder update tailored to audience + cadence. |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/external-relationships.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

## APQC processes

Every level 3 process of APQC category 12.0 (Manage External Relationships) has one workflow, named by its hierarchy id and carrying it in its `process` field, and every level 2 process group has one skill. These workflows run on request, and each waits on a meeting that walked [workflows/intake.json](./workflows/intake.json) and closed with its goal reached (EE-217).

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 12.1.1 | Plan, build, and manage lender relations | [12-1-1-plan-build-and-manage-lender-relations.json](./workflows/12-1-1-plan-build-and-manage-lender-relations.json) | [build-investor-relationships](./skills/build-investor-relationships) |
| 12.1.2 | Plan, build, and manage analyst relations | [12-1-2-plan-build-and-manage-analyst-relations.json](./workflows/12-1-2-plan-build-and-manage-analyst-relations.json) | [build-investor-relationships](./skills/build-investor-relationships) |
| 12.1.3 | Communicate with shareholders | [12-1-3-communicate-with-shareholders.json](./workflows/12-1-3-communicate-with-shareholders.json) | [build-investor-relationships](./skills/build-investor-relationships) |
| 12.2.1 | Manage government relations | [12-2-1-manage-government-relations.json](./workflows/12-2-1-manage-government-relations.json) | [manage-government-and-industry-relationships](./skills/manage-government-and-industry-relationships) |
| 12.2.2 | Manage relations with quasi-government bodies | [12-2-2-manage-relations-with-quasi-government-bodies.json](./workflows/12-2-2-manage-relations-with-quasi-government-bodies.json) | [manage-government-and-industry-relationships](./skills/manage-government-and-industry-relationships) |
| 12.2.3 | Manage relations with trade or industry groups | [12-2-3-manage-relations-with-trade-or-industry-groups.json](./workflows/12-2-3-manage-relations-with-trade-or-industry-groups.json) | [manage-government-and-industry-relationships](./skills/manage-government-and-industry-relationships) |
| 12.2.4 | Manage lobby activities | [12-2-4-manage-lobby-activities.json](./workflows/12-2-4-manage-lobby-activities.json) | [manage-government-and-industry-relationships](./skills/manage-government-and-industry-relationships) |
| 12.3.1 | Report financial results | [12-3-1-report-financial-results.json](./workflows/12-3-1-report-financial-results.json) | [manage-relations-with-board-of-directors](./skills/manage-relations-with-board-of-directors) |
| 12.3.2 | Report audit findings | [12-3-2-report-audit-findings.json](./workflows/12-3-2-report-audit-findings.json) | [manage-relations-with-board-of-directors](./skills/manage-relations-with-board-of-directors) |
| 12.4.1 | Create ethics policies | [12-4-1-create-ethics-policies.json](./workflows/12-4-1-create-ethics-policies.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.4.2 | Manage corporate governance policies | [12-4-2-manage-corporate-governance-policies.json](./workflows/12-4-2-manage-corporate-governance-policies.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.4.3 | Develop and perform preventive law programs | [12-4-3-develop-and-perform-preventive-law-programs.json](./workflows/12-4-3-develop-and-perform-preventive-law-programs.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.4.4 | Ensure compliance | [12-4-4-ensure-compliance.json](./workflows/12-4-4-ensure-compliance.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.4.5 | Manage outside counsel | [12-4-5-manage-outside-counsel.json](./workflows/12-4-5-manage-outside-counsel.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.4.6 | Protect intellectual property | [12-4-6-protect-intellectual-property.json](./workflows/12-4-6-protect-intellectual-property.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.4.7 | Resolve disputes and litigations | [12-4-7-resolve-disputes-and-litigations.json](./workflows/12-4-7-resolve-disputes-and-litigations.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.4.8 | Provide legal advice/counseling | [12-4-8-provide-legal-advice-counseling.json](./workflows/12-4-8-provide-legal-advice-counseling.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.4.9 | Negotiate and document agreements/contracts | [12-4-9-negotiate-and-document-agreements-contracts.json](./workflows/12-4-9-negotiate-and-document-agreements-contracts.json) | [manage-legal-and-ethical-issues](./skills/manage-legal-and-ethical-issues) |
| 12.5.1 | Manage community relations | [12-5-1-manage-community-relations.json](./workflows/12-5-1-manage-community-relations.json) | [manage-public-relations-program](./skills/manage-public-relations-program) |
| 12.5.2 | Manage media relations | [12-5-2-manage-media-relations.json](./workflows/12-5-2-manage-media-relations.json) | [manage-public-relations-program](./skills/manage-public-relations-program) |
| 12.5.3 | Promote political stability | [12-5-3-promote-political-stability.json](./workflows/12-5-3-promote-political-stability.json) | [manage-public-relations-program](./skills/manage-public-relations-program) |
| 12.5.4 | Create press releases | [12-5-4-create-press-releases.json](./workflows/12-5-4-create-press-releases.json) | [manage-public-relations-program](./skills/manage-public-relations-program) |
| 12.5.5 | Issue press releases | [12-5-5-issue-press-releases.json](./workflows/12-5-5-issue-press-releases.json) | [manage-public-relations-program](./skills/manage-public-relations-program) |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
