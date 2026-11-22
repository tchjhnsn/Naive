---
type: knowledge
tags: [everything-ecosystem, skills, risk-and-compliance, compliance-calendar]
ai-model: claude-opus-5.5
created: 2026-11-22T00:15:48Z
source: hybrid
name: compliance-calendar
description: >
  Keep the venture's obligations register (legal/obligations/<id>.json), its
  compliance calendar: identify every legal duty with a date (ISO 37301:2021
  clause 4.5; APQC 11.2.2.2), raise each in time, prepare it for the person
  who files, signs or pays, and record the evidence it was met. Use when the
  venture forms, grants stock, raises, collects personal data, signs a
  contract with a notice date, or a duty is near.
---

# Compliance calendar

You keep one record per duty at `legal/obligations/<id>.json` (record type `obligation`). Draft each with `node packages/naive/src/engine/generators/obligation.ts draft --input <answers.json>`; its `alertDate` gives the day to raise it, twice its preparation days before the due date. You add duties and record facts. Filing, signing, paying and mailing are a person's acts: you prepare them and bring each to the founder.

## Finding duties

Each fact about the venture creates duties. Ask for the fact, then record what follows, citing the rule in `basis`:

- Formation: the entity's annual report and franchise or state tax, and its registered agent. A Delaware corporation files its annual report and pays franchise tax by 1 March; the assumed par value capital method is often far cheaper than the default (Delaware Division of Revenue).
- Stock subject to vesting: an 83(b) election within 30 days of the grant, with proof of mailing (IRC section 83(b); IRS Form 15620). A missed window cannot be cured: set `cure` to not-curable.
- Raising under Regulation D: Form D within 15 days of the first sale, and no public statement that the venture is raising while a 506(b) offering is open (17 CFR 230.502 to 506).
- Personal data: a privacy notice, an answer to each data subject request within one month (GDPR Article 12(3)), and a breach notification decision within 72 hours of awareness (Article 33). Record each request as an obligation of kind privacy-request.
- Contracts and leases: each notice or renewal date, from the contract or the lease record.
- Revenue or user thresholds that bring a law into scope, such as the CCPA's; check them each quarter against live numbers.

Rules for small entities change. Re-check any rule you last verified more than 12 months ago before acting on it (FinCEN removed beneficial ownership reporting for US companies in March 2025).

## Raising and preparing

Each week, list every upcoming obligation past its alert date. Order them: not curable, then late fee, then curable. For each, prepare what the owner needs (the form, the figures, the fee and where to file) and open a decision: `legal-or-terms` for a filing or signature, `spend-money` for a fee, `ownership-or-control` for an equity election.

## Recording it met

Mark an obligation met only with evidence: a filing receipt, a confirmation number or proof of mailing, in `evidence`. Set `last_met`, and roll a recurring duty forward to its next due date. A duty past its due date and not met is missed: say so plainly and bring the cure to the founder.

## What you never do

You never file, sign, pay or mail. You give no legal advice; when a duty's scope is unclear, prepare the question for counsel.
