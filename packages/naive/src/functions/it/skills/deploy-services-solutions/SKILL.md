---
type: knowledge
tags: [naive, skills, it, apqc-8-6]
ai-model: claude-opus-5-5
created: 2026-11-27T03:45:06Z
source: hybrid
name: deploy-services-solutions
process_group: "8.6"
description: >
  Put a change in front of customers without breaking what already works: one
  written deployment procedure, a dated plan with a roll-back that has been tried,
  the founder's approval before anything goes out, and a record of what actually
  happened. Load it for the five workflows of APQC process group 8.6 and when the
  founder asks "is this safe to deploy", "how do we undo it", "who approved this"
  or "what went out last week".
---

# deploy-services-solutions

You prepare the deployment, carry out the steps the plan names, check the result and write down what happened. The founder approves what goes out, sends what customers are told, and authorises any step that cannot be undone.

Three rules hold across all five processes. Nothing reaches a customer without the founder's yes. Nothing goes out without a way back that has actually been run, not merely written. Every step taken is logged with its time and its result, so a failed deployment can be read afterwards instead of reconstructed.

## The processes

### 8.6.1 Develop and manage service/solution deployment strategy

Runs `workflows/8-6-1-develop-and-manage-service-solution-deployment.json`.

Write the rule once and keep it short enough to follow. Order: what a deployment can break here, the rules it obeys, the procedure as ordered steps, what a release has to carry, who approves what. The test of the procedure is whether someone who has never deployed this venture could follow it without asking a question; if not, it is notes, not a procedure.

The outcomes step is where the rule improves. Count how many deployments needed a roll-back and which step of the procedure failed each time, because the same step usually fails twice. Who approves which deployment is the founder's to set, checked against `governance/delegation` and `governance/decision-rights`; an agent never grants itself that right.

### 8.6.2 Plan service and solution implementation

Runs `workflows/8-6-2-plan-service-and-solution-implementation.json`.

Sequence by reversibility: the part that is easiest to undo goes first, the part that touches money or customer data goes last. List the prerequisites and mark each present or missing with who can supply it, because a deployment stopped halfway by a missing credential is the commonest failure in a small venture. Name the point of no return in the roll-back and say what happens to data written after the change went out.

Run the roll-back in a scratch copy and record the result. A roll-back that has never been run is a hope. Drafts of what customers are told go to the founder to send.

### 8.6.3 Manage change deployment control

Runs `workflows/8-6-3-manage-change-deployment-control.json`.

This is the gate. For each waiting change, write what it touches, check it against the venture's own rules, `legal/obligations` and `governance/publication-policy` for anything a customer will read, rate its risk by cost and reversibility, then gather the ones that pass into one release with a version and a list of what changed. Hold back what failed a check and say which changes must go out together.

Then stop. The release goes to the founder as one decision carrying what is in it, its risk rating, its window, its way back and what failed a check, and nothing is deployed until the founder has said yes. Afterwards, record what went out, when, who approved it, what the checks said, whether it was rolled back and what customers saw.

### 8.6.4 Implement technology solutions

Runs `workflows/8-6-4-implement-technology-solutions.json`.

Check before touching: the targets are up and at the expected versions, the services the release depends on are reachable and inside their quotas, credentials are valid, and a current backup exists. Then work the plan step by step, doing nothing it does not name, and log each step as you go. Test against the live system with the real tasks a person would do, not only a health endpoint, and end with a plain verdict: succeeded, succeeded in part, failed, or rolled back.

The roll-back step runs only when a check failed, stops at the point of no return and waits for the founder there, because it changes or discards data customers may already have used.

### 8.6.5 Perform service and solution rollout

Runs `workflows/8-6-5-perform-service-and-solution-rollout.json`.

Deployment puts the change in place; rollout is what makes it usable. Switch groups in order, smallest and most forgiving first, and record the date and size of each. Write down every question asked during training, because a question asked twice belongs in the guide. Watch the first days and answer only what the written answers already cover; anything needing a judgment, a refund or a promise goes to the founder.

The trap is to roll out faster than the venture can answer. Before the second group, say who answers, in what hours and through which channel, and name the gap when there is none.

## Records

The workflows read `product`, `product/capabilities`, `product/bugs`, `customers`, `support/cases`, `support/policy`, `people/team`, `people/team-plan`, `it/connections`, `assets/register`, `legal/obligations`, `governance/publication-policy`, `governance/delegation`, `governance/decision-rights`, `capabilities/processes` and `operations/handoff`.

They write `it/connections/[id]` for the state of the systems a release lands on and their quotas and credentials; `operations/handoff/[id]` for the deployment rule, the procedure, the plan, the log, the check results, the release notes and the rollout record; and `decisions/[id]` for the approval of each release and for every roll-back that passes the point of no return.

There is no record type for a release, a change request, a deployment window or a rollout group: those are not built, so the release and its outcome are carried on the handoff and the approval lives in the decision the founder settles.

## Standards

- ITIL 4 separates change enablement, release management and deployment management, which is why the approval of a change (8.6.3) is kept apart from putting it in place (8.6.4) and from making it usable (8.6.5).
- ISO/IEC 20000-1 requires that changes be recorded, assessed for risk and authorised before deployment, and that the outcome be recorded afterwards.
- The four delivery measures from the DevOps Research and Assessment program, deployment frequency, lead time for changes, change failure rate and time to restore service, are the ones to count in the outcomes step; of the four, change failure rate and time to restore are the ones a small venture can act on.

## What the person decides

- Whether a release goes out, every time.
- Who may approve which kind of deployment.
- What customers are told, and who says it.
- Whether to pass the point of no return in a roll-back.
- Whether to carry on to the next rollout group, hold, or roll the change back.
