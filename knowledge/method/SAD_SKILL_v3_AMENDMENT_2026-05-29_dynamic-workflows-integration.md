---
type: methodology-amendment-proposal
ai-model: claude
spec-layer: methodology
version: "proposed — number TBD at ratification"
source: hybrid
created: 2026-05-29T13:59:10Z
last-reviewed: 2026-05-29
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[SAD_SKILL_v3]]"
change-class: 2
status: PROPOSED — awaiting trial use + ratification
sections-affected:
  - PART 5 — episodic phases (workflow-per-phase mapping for 0B / 1B / 2 / verification)
  - PART 8 — capability-skills / tooling (dynamic workflows as an execution surface)
  - PART 3 — Campaign / Session / Checkpoint (workflow runs as session artifacts)
  - PART 12 — known failure modes (new: mega-workflow-across-gates, allowlisted-git, ultracode-cost-creep, IP-exposure)
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-14_methodology-evolution]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-06_spec-colocation]]"
related-docs:
  - "[[tool-inventory-2026-05-16]]"
tags: [methodology, sad-v3, amendment-proposal, class-2, tooling-integration, dynamic-workflows, claude-code, 2026-05-29]
---

# SAD Amendment 2026-05-29 — Dynamic Workflows Integration

**Status:** PROPOSED. Class 2 (additive guidance — integrates an external execution tool; does not restructure the Phase 1B spec stack). Pending trial use on a scoped task + the owner ratification before merging into `SAD_SKILL_v3.md`. Final version number assigned at ratification.

**One-paragraph summary:** Anthropic shipped *dynamic workflows* in Claude Code on 2026-05-28 (research preview, alongside Opus 4.8). A dynamic workflow is a JavaScript orchestration script Claude writes and a runtime executes in the background, fanning work across tens-to-hundreds of parallel subagents, with intermediate state held in script variables (outside Claude's context) and an adversarial verify-before-report quality pattern. This amendment defines how the tool slots into SAD: it is an **execution surface for a spec**, not a replacement for one. Each SAD phase gets at most one workflow; phase gates are honored by running each phase as its own workflow; and saved workflows become spec-anchored, rerunnable commands — most naturally a `VERIFICATION_SPEC` compiled into a `/verify-conformance` command.

---

## 1. Provenance

Motivated by a 2026-05-29 research session. The owner asked what dynamic workflows are and how they should fit his existing SAD practice. Primary sources fetched directly:

- Anthropic blog, *Introducing dynamic workflows in Claude Code* (2026-05-28).
- Claude Code docs, *Orchestrate subagents at scale with dynamic workflows* (`code.claude.com/docs/en/workflows`).

No trial run has happened yet. This document is the design of the integration, to be validated against the first scoped workflow run and then ratified or revised.

## 2. What the tool is (load-bearing facts)

- A workflow **moves the plan into code**. With subagents and skills, Claude is the orchestrator and every intermediate result lands in its context. A workflow script holds the loop, the branching, and the intermediate results itself; only the final answer returns to the session.
- It applies a **repeatable quality pattern**, not just more agents: independent agents attack from different angles, adversarial agents try to refute findings, and the run iterates until answers converge.
- **Limits:** up to 16 concurrent agents, 1,000 agents total per run. The workflow script itself **cannot** touch the filesystem or shell — only the agents it spawns read, write, and run commands.
- **No mid-run user input.** Only agent permission prompts can pause a run. For sign-off between stages, the docs direct you to run each stage as its own workflow.
- **Resumable within the same session;** completed agents return cached results on resume. Exiting Claude Code restarts the workflow fresh next session.
- **Invocation:** include the word `workflow` in a prompt, run a bundled command (`/deep-research`), run a saved command, or set `/effort ultracode` to let Claude auto-decide per task.
- **Saving:** a finished run's script can be saved with `s` in `/workflows` to `.claude/workflows/` (project, shared on clone) or `~/.claude/workflows/` (personal, all projects). It then runs as `/<name>`.
- **Cost:** meaningfully more tokens than a normal session. Research preview; needs Claude Code v2.1.154+; Max/Team/API on by default, Enterprise opt-in.

## 3. The core alignment

SAD's premise is that the **spec is the durable artifact** and the conversation is ephemeral. A dynamic workflow is the same move applied to *execution*: the orchestration script is the durable artifact and the run is ephemeral. The two compose cleanly. The governing rule of this amendment:

> **A workflow executes a spec. It does not substitute for one.** Author or identify the SAD spec the workflow is anchored to before the workflow is written. The workflow is the *how-to-run*; the spec remains the *what-and-why*.

## 4. Phase mapping

One workflow per phase, anchored to that phase's spec. Honor the gate between phases by stopping the run at the phase boundary and reviewing before launching the next.

| SAD phase | Workflow use | Anchored to | Notes |
|---|---|---|---|
| **Phase 0B — Research synthesis** | `/deep-research <question>` | feeds `RESEARCH_SYNTHESIS.md` | Lowest-risk entry point. Read-only, cross-checked, cited output. Use this to get a feel for the tool before pointing it at code. |
| **Phase 1B — Spec drafting** | Draft a spec approach from several independent angles; adversarial agents stress-test each before you commit | `VISION_SPEC` / `VERSION_SPEC` | The docs explicitly cite "a hard plan worth drafting from several angles before you commit to one." Reserve for high-stakes specs where a single pass is risky. |
| **Phase 2 — Implementation / Operation** | Large migrations, framework swaps, API deprecations, language ports, codebase-wide hardening passes | `IMPL_SPEC` (`OPERATIONS_SPEC` for service entities) | This is the headline use case (the Bun Zig→Rust port: map → port → fix-loop → review, each its own workflow). Maps onto the `product/implementation/<effort-name>/` campaign pattern. |
| **Verification (cross-cutting)** | Fan agents across the codebase to check implementation against the behavioral contract; independent agents refute each finding | `VERIFICATION_SPEC` (`QUALITY_SPEC` for service entities) / `BEHAVIORAL_SPEC` | Best long-term fit. The spec already defines *what correct means*; the workflow executes that definition at scale. See the template in §6. |

**The `ralph-loop` candidate.** The existing `product/implementation/ralph-loop/` campaign — the open-coded SAD implementation runner prompts — is the obvious thing to rebuild *as* a saved workflow command rather than hand-orchestrated prompts. Track this as a follow-up once the integration is ratified.

## 5. Cautions specific to this operating layer

These are the points where the tool's defaults rub against the cross-project rules in the global `CLAUDE.md`. They are normative.

1. **Phase gates vs. no mid-run input.** Workflows cannot pause for human sign-off mid-run. Therefore: **never build one mega-workflow that spans SAD phases (0B → 1B → 2).** One workflow per phase; the owner reviews at each gate; the next phase's workflow launches only after the gate clears. This is not a workaround — it is the docs' own recommended pattern and it maps exactly onto SAD's gated phases.

2. **Git control is human-only.** Workflow agents write files and run shell/MCP commands, inheriting the session tool allowlist and running in `acceptEdits`. The Bun example "opened a PR." This collides with the rule that Claude never commits, pushes, merges, or force-pushes. Mitigation, mandatory: **keep `git commit`, `git push`, `git merge`, and any PR-opening commands OUT of the allowlist before any long run.** Treat workflow output as staged work for the owner to review and finalize. A workflow may stage and edit; it may never finalize git.

3. **Run against code, anchor in the vault.** Workflows act on code, which lives at `<repos>/<repo>/`, never inside the vault. Run them in the code half. Save reusable workflows to that repo's `.claude/workflows/` (shared, inherits the repo `CLAUDE.md`). The vault holds the anchoring spec plus a session-log / runbook entry pointing at the saved script path.

4. **Session capture.** A workflow run is a substantial session artifact. Capture it in the entity's `SESSION_LOG.md` per the session-capture ritual: the anchoring spec, the saved script path, agent/token counts, and the convergence outcome. The orchestration script is itself worth referencing from `product/implementation/<effort-name>/` as a runbook.

5. **Prefer the keyword over `ultracode` (for now).** `ultracode` auto-plans a workflow for *every* substantive task and burns meaningfully more tokens — it fights SAD's deliberate, ritualized cadence. Until cost is calibrated against real runs, invoke workflows explicitly with the `workflow` keyword or a saved command. Revisit after the first few runs.

6. **IP exposure surface.** Fanning hundreds of agents across a repo is a wide exposure surface. **Do not** point workflows at IP-sensitive or archived/co-authored repos (another project and anything under `projects/_archive/` with `ip-sensitivity: high`) without first consulting the `ip-protection` skill.

7. **Start scoped.** Anthropic's own guidance: the token cost is materially higher, so the first run should be a small, bounded task to calibrate usage before committing to a multi-hour migration.

## 6. Appendix — VERIFICATION_SPEC → saved workflow template

The pattern for compiling a `VERIFICATION_SPEC` into a rerunnable conformance command. The spec stays canonical in the vault; the workflow is its executable shadow in the repo.

**Step 1 — anchor.** Confirm the entity's `VERIFICATION_SPEC.md` (or `QUALITY_SPEC.md`) enumerates concrete, checkable assertions: what each module must do, the invariants, the behavioral contract from `BEHAVIORAL_SPEC.md`.

**Step 2 — prompt for a workflow run.** In the repo (not the vault), with git write commands held out of the allowlist:

```text
Run a workflow to verify the implementation against VERIFICATION_SPEC.md.
For each assertion in the spec, fan a subagent across the relevant files to
check conformance. Have a second, independent agent attempt to refute each
reported violation before it is included. Report only violations that survive
refutation, each citing the file, line, and the spec assertion it breaks.
Do not edit files. Do not run any git command.
```

**Step 3 — review the planned phases** at the approval prompt (`View raw script` / `Ctrl+G` to open in editor). Confirm no phase writes files or calls git.

**Step 4 — save for reuse.** After a satisfactory run, `/workflows` → select → `s` → save to `.claude/workflows/verify-conformance` in the repo. It now runs as `/verify-conformance` on every branch and is shared with anyone who clones the repo half.

**Step 5 — record in the vault.** Add a `SESSION_LOG.md` entry and, if part of a campaign, a runbook note under `product/implementation/<effort-name>/` linking the saved script path, the anchoring `VERIFICATION_SPEC`, and the first run's outcome.

Result: the verification spec and its executor stay in lockstep. When the spec changes, the workflow prompt is re-derived from it; the spec never drifts from what actually runs.

## 7. Ratification criteria

Promote from PROPOSED to RATIFIED when:

- At least one `/deep-research` run has fed a real `RESEARCH_SYNTHESIS.md`, and
- At least one spec-anchored workflow (ideally a `VERIFICATION_SPEC → /verify-conformance`) has run end-to-end on a real repo with git commands held out of the allowlist, and
- Token cost of a representative run has been observed and judged acceptable against the deliberate cadence.

Until then this document is design intent, not ratified methodology.
