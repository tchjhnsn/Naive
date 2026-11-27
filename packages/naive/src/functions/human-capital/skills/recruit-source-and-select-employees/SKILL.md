---
type: knowledge
tags: [naive, skills, human-capital, apqc-7-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:15Z
source: hybrid
name: recruit-source-and-select-employees
description: >
  Fill a role the team plan holds: open and approve a requisition, source
  candidates from channels that cost what the venture can spend, judge everyone
  against criteria written before anyone was seen, and prepare the offer for the
  founder to send. Load it for the five workflows of APQC process group 7.2, and
  whenever the founder asks "how do we find someone", "how do we interview for
  this", "what do we offer" or "what may we keep about an applicant".
process_group: "7.2"
---

# recruit-source-and-select-employees

You prepare and record: the requisition, the pool, the criteria, the scores, the draft offer and the applicant file. The founder approves the requisition, posts it, talks to every candidate, chooses who is selected, and sends and negotiates the offer. You never contact anyone outside the venture, and you never send an offer or a rejection.

A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not run it.

## The processes

### 7.2.1 Manage employee requisitions

Runs `workflows/7-2-1-manage-employee-requisitions.json`, which waits on `people/team-plan` being live. One role, one requisition, and no search without the founder's recorded approval. Draft the requisition with what the role decides, the work an agent cannot do with the capability register entry behind it, the terms, the fully loaded cost and the date it must be filled by; then put it to the founder with the agent alternative and what the venture stops doing while the role is empty. Good evidence is a requisition that traces to a role in the plan and to a goal; the trap is a search that starts from a conversation and acquires a requisition afterwards, which is how a venture hires for work it did not need. Approving the requisition and posting it are the founder's: the second is a public statement.

### 7.2.2 Recruit/Source candidates

Runs `workflows/7-2-2-recruit-source-candidates.json`. Cost each channel in money and in the founder's hours before using any of it, and recommend at most three. Keep the pool to what the candidate published or sent, with a source and a date for every claim, and carry nothing from one search into another. Good evidence is a channel with counts behind it, how many candidates and how many reached an interview; the trap is paying an agency fee, often a fifth of first-year pay, before the free channels have been tried. Every event, message and conversation is the founder's, and an agency agreement is signed and paid by the founder.

### 7.2.3 Screen and select candidates

Runs `workflows/7-2-3-screen-and-select-candidates.json`. Write the criteria, the questions and the work sample before seeing a single candidate, and ask every candidate the same questions in the same order. The work sample should mirror one real task, be time-boxed, and be paid when it takes real work. Score it against the recorded criteria, blind to whose it is where that is possible. Good evidence is a score sheet filled against criteria that predate the candidate; the trap is a conversation that becomes the decision, after which the criteria are written to fit. The founder holds every interview and makes the selection and the rejections; you draft the rejection note and the founder sends it.

### 7.2.4 Manage new hire/re-hire

Runs `workflows/7-2-4-manage-new-hire-re-hire.json`. Draft the offer from the approved requisition and nothing else: role, start date, cash, any equity with its vesting, assignment of what the person makes, the classification and the notice period, with every number the founder must confirm marked. Before the founder negotiates, give them the room on each term, the yearly cost of each concession and the point past which the offer is worse than an empty role. Good evidence is a signed agreement whose terms match the recorded decision; the trap is a term agreed in conversation that never reaches a record. Making the offer, negotiating it and hiring are all the founder's; your part begins again when they confirm the signature and you write the person into `people`.

### 7.2.5 Manage applicant information

Runs `workflows/7-2-5-manage-applicant-information.json`. Hold only what the applicant gave you and what the work requires; ask the applicant rather than inferring anything, and leave any check needing a third party or the applicant's consent to the founder. Archive each non-hire with the date the search closed and the date their record may be removed, taken from the obligation that sets it. Good evidence is a field list where each field names the work that needs it; the trap is keeping a whole search in a folder forever because nobody decided to remove it. Every removal of a person's data is the founder's decision, because it cannot be undone and the venture may be obliged to keep some of it.

## Records

The workflows read `people`, `people/team-plan`, `people/founders`, `foundation/goals`, `foundation/constraints`, `governance/ownership`, `governance/founder-agreement`, `governance/internal-terms`, `governance/delegation`, `capabilities/processes`, `finance/budget`, `purpose/money/summary`, `legal/obligations`, `legal/risks`, `it/connections`, `operations/handoff` and `decisions`.

They write `people`, `decisions/[id]` and the handoff they run under.

A requisition record and an applicant or candidate record: not built. Naive has no route for either, so a requisition lives in the decision that approves it and the applicant file lives on the handoff, which is also why the archive and removal dates must be written out rather than relied on.

## Standards

- ISO 30405:2016, *Human resource management: Guidelines on recruitment*, for the shape of a search.
- ISO 10667-1 and ISO 10667-2:2011, *Assessment service delivery: Procedures and methods to assess people in work and organizational settings*, for agreeing what an assessment is for and how its results may be used.
- Schmidt and Hunter, "The Validity and Utility of Selection Methods in Personnel Psychology", *Psychological Bulletin*, 1998, for why a work sample and a structured interview predict performance better than an unstructured conversation.
- The Uniform Guidelines on Employee Selection Procedures (29 CFR Part 1607) in the United States, for why selection criteria are recorded before candidates are seen and applied the same way to everyone. This is not legal advice, and the question goes to the founder and counsel.
- The data minimisation principle of the General Data Protection Regulation, Article 5(1)(c), for holding no more about an applicant than the purpose needs.

## What the person decides

- Whether to open the requisition, and whether to post it publicly.
- Which channels the venture pays for, and whether to use an agency.
- Who is interviewed, and every word said to a candidate.
- Who is selected and who is rejected.
- Every term of the offer, and whether to send it.
- Every removal of an applicant's personal data.
