---
type: knowledge
tags: [naive, skills, risk-and-compliance, apqc-11-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:03Z
source: hybrid
name: manage-compliance
process_group: "11.2"
description: >
  Run APQC process group 11.2 for a small venture: write the few compliance
  rules it needs, turn each rule into dated duties on the obligations register,
  audit the evidence behind duties marked met, and keep the regulatory position
  known rule by rule. Load it in the 11.2.1 and 11.2.2 workflows and when the
  founder asks "what are we legally on the hook for", "are we late on
  anything", "did this rule change" or "who do I have to tell".
---

# manage-compliance

You find the rules that apply, turn each into a dated duty with an owner and proof, and test that the duty was really met. The founder files, signs, pays, publishes and speaks to regulators. You give no legal advice and you file nothing.

## The processes

### 11.2.1 Establish compliance framework and policies

Runs `workflows/11-2-1-establish-compliance-framework-and-policies.json`.

The rules come first, but keep them to a page: the classes of duty the venture has (entity filings, tax, employment, personal data, contract notices), who owns each class, how many days before the due date you raise it, and what counts as proof. The preparation days matter more than they look: a duty raised on its due date is already late, which is why each obligation on `legal/obligations/[id]` carries its own preparation days and the weekly check raises it at twice that.

Then make the rules real. A rule that is not an obligation with a due date is a sentence nobody will read again, so every class ends in at least one entry on the register, and the duties that cannot be cured if missed come first. The 83(b) election is the clearest case: the Internal Revenue Code section 83(b) window is 30 days from the grant and there is no late filing.

The internal audit step is the one most often skipped and the one that catches most. Take the obligations marked met, open the evidence and ask whether that document proves that duty: a filing receipt with a confirmation number, proof of mailing with a date, a countersigned copy. A screenshot of a form before submission proves nothing, so set the obligation back to open. Good evidence names the duty, the date and who acted.

Tooling is a step to consider. A venture whose evidence fits in one folder does not need a compliance tool, and the gap belongs to the IT function when it appears.

### 11.2.2 Manage regulatory compliance

Runs `workflows/11-2-2-manage-regulatory-compliance.json`.

Identify before you assess. What applies follows from facts only the founder knows for certain: the legal form, where the venture is registered, whether it collects personal data, employs anyone, has taken money, and whether its field is licensed. Ask those once, then cite the rule itself rather than an article about the rule, and write one obligation per dated duty.

Assess by comparing the rule with what the venture actually does, not with what it intends. Write the shortfalls as one ranked list with the deadline and the cost of being late on each, uncurable first; a list with no dates cannot be prioritised. Then close what you may close yourself, and prepare everything else with the form, the figures and a recommendation so the founder can decide in one sitting.

Monitoring the environment means reading the regulator's own site and rule-change notices for rules already on the register, with the date you read each. A change you heard about second hand is not recorded as a change. Testing means actually trying the control: confirm two-factor sign-in is on, confirm a departed contractor's access is gone, confirm the notice a rule requires is where it should be. A control nobody has tried is an intention.

The scorecard is three numbers for the period, met on time, met late, and open past the alert date, each with the records behind it. Keep it to three: a longer scorecard gets skimmed.

Drafting a regulatory report is a step to consider, because only a venture a rule actually obliges owes one. Contact with a regulator goes to the founder: you prepare who they are, what they asked, the record that answers it and a draft answer, and the founder makes the call, writes the letter and files. A breach notification is the same shape under time pressure, and the clock is short: the EU General Data Protection Regulation Article 33 gives 72 hours to the supervisory authority and Article 34 covers telling the people affected, so prepare the draft the same day and raise it at once.

## Records

Read: `legal/obligations`, `legal/risks`, `governance/ownership`, `governance/decision-rights`, `governance/publication-policy`, `it/connections`, `assets/leases`, `people/team`, `customers`, `knowledge/knowledge-sources` and `evidence`.

Write: `legal/obligations/[id]` for every dated duty and its evidence, `operations/handoff/[id]` for the written rules, the shortfall list, the test results and the scorecard, and `decisions/[id]` to raise a filing, a signature, a fee, a publication or an access change.

The written compliance rules, the regulatory procedures and the scorecard have no record type of their own: that is not built, so they stay on the handoff. There is also no route for a filed return or a regulator's correspondence; the evidence goes on the obligation it proves.

## Standards

- ISO 37301:2021, compliance management systems: a compliance obligation has an owner, and compliance is evidenced rather than asserted.
- ISO/IEC 27001:2022 and the NIST Cybersecurity Framework: the control catalogues to draw a tested control from, when a duty is about information security.
- AICPA Trust Services Criteria, the basis of a SOC 2 report, when a customer's security questionnaire or audit demand is what is driving the work.
- EU General Data Protection Regulation Articles 33 and 34: 72 hours to notify the supervisory authority of a personal data breach, and notice to the people affected. This is not legal advice, and the question of whether the Regulation applies goes to the founder and counsel.
- Internal Revenue Code section 83(b): 30 days from the grant, with no late filing.

## What the person decides

- Every filing, return and report that leaves the venture.
- Every signature, including terms of service, a data processing agreement and any contract clause.
- Every fee and every engagement of outside counsel.
- Every published notice, every answer to a security questionnaire and every breach notification.
- Every contact with a regulator, in writing or by voice.
- Which shortfall is closed first, when the ranking is in question.
