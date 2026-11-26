<!-- Placement: tchjhnsn/Naive docs/design/AGENT_RUNTIME_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# Naive runs agents: runtime research and proposal

Prepared Nov 2, 2026 for Torian. Research only. Nothing in the repo or on Vercel has changed.
Builds on `docs/design/VENTURE_ORG_ONTOLOGY_2026-11-02.md` and `docs/design/SYMBOLIC_SYSTEM_ONTOLOGY_2026-11-02.md`. Every outside claim links its source. Lines marked "Naive reading" are my interpretation.

Torian's decision: Naive will also run agents, not only store and serve their configuration. "A bet we have to make."

---

## 1. Runtime patterns, ranked by fit for Naive

### 1. Record as control plane, durable workflow as the run, sandbox for untrusted work. Best fit.
The pattern: the system of record holds configuration and results. A durable workflow engine runs each agent run step by step. Risky execution happens in a disposable microVM.
- **Vercel Workflow:** "runs multi-step logic as durable code that can retry failed steps, wait for external events, and resume across crashes and deployments... Vercel Functions execute your workflow and step code. Vercel Queues enqueue and execute those routes." ([Vercel Workflows](https://vercel.com/docs/workflow)) Features include "Sleep and hooks: Pause for minutes to months, or wait for external events." ([Vercel Workflows](https://vercel.com/docs/workflows)) Its docs list "Worlds" (Local, Postgres, Vercel or custom) for where run state lives. ([Workflow pricing page cross-links](https://vercel.com/docs/workflows/pricing))
- **Vercel Queues** "is the lower-level primitive that powers Vercel Workflows," with "at-least-once delivery." ([Vercel Queues](https://vercel.com/docs/queues))
- **Vercel Sandbox** runs code "in isolated Linux microVMs... Run AI agent output, user uploads, or third-party scripts without exposing your production systems." ([Vercel Sandbox](https://vercel.com/docs/vercel-sandbox)) Its firewall "runs on the host, outside the microVM, where code inside the sandbox cannot modify or disable it," and credential brokering means "The credential never enters the microVM." ([Vercel blog](https://vercel.com/blog/a-sandbox-without-a-network-boundary-is-only-half-a-sandbox), [Sandbox firewall docs](https://vercel.com/docs/sandbox/concepts/firewall))
- **The same pattern elsewhere:** Temporal "guarantees the Durable Execution of your application code" ([Temporal](https://docs.temporal.io/temporal)). Inngest "runs each step, saves its result" ([Inngest](https://www.inngest.com/docs)). Firecracker is "purpose-built for creating and managing secure, multi-tenant container and function-based services" ([Firecracker](https://firecracker-microvm.github.io/)). E2B "provides isolated sandboxes that let agents safely execute code" ([E2B](https://e2b.dev/docs)).

Why it fits: Naive already owns the record, and the team is on Vercel Pro. Runs become one more kind of write into the record.

### 2. Managed agent runtimes from model or cloud vendors
- **AWS Bedrock AgentCore:** "an agentic platform for building, deploying, and operating highly effective agents securely at scale using any framework and foundation model." Its managed loop is described this way: "Each session runs in an isolated microVM with filesystem and shell access." ([AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html))
- **Google Vertex AI Agent Engine:** "a set of services that enables developers to deploy, manage, and scale AI agents in production," with Runtime, Sessions, Memory Bank, Code Execution "in a secure, isolated, and managed sandbox," and observability through "Cloud Trace (supporting OpenTelemetry)." ([Agent Engine overview](https://docs.cloud.google.com/agent-builder/agent-engine/overview))
- **Anthropic:** the Claude Agent SDK "spawns and supervises a claude CLI subprocess that owns a shell, a working directory, and session files on disk... Every running agent is a long-lived process tied to local state." For hosted use, "Managed Agents" means "Anthropic hosts the agent loop... Tool execution runs in an Anthropic-managed cloud sandbox or a self-hosted sandbox." ([Hosting the Agent SDK](https://docs.claude.com/en/docs/agent-sdk/hosting))
- **OpenAI Agents SDK:** "a very small set of primitives: Agents, which are LLMs equipped with instructions and tools," plus handoffs, guardrails and sessions, with "built-in tracing, collecting a comprehensive record of events during an agent run." ([Agents SDK](https://openai.github.io/openai-agents-python/), [Tracing](https://openai.github.io/openai-agents-python/tracing/))
- **LangGraph / LangSmith Deployment:** an Agent Server with a control plane and a data plane ([LangChain docs](https://docs.langchain.com/langgraph-platform)). "Interrupts allow you to pause graph execution at specific points and wait for external input... LangGraph saves the graph state using its persistence layer." ([Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts))
- **Letta:** "The platform for building stateful agents." ([Letta](https://docs.letta.com/))

Why second: each one is strong, but each wants to own sessions, memory and traces. That competes with Naive being the system of record. They work as *targets* behind an adapter.

### 3. Hosted coding agents (Cursor Cloud Agents, Devin)
- Cursor Cloud Agents "run in isolated VMs in the cloud with full development environments... cloned repos, installed dependencies, secrets, startup commands, and network access." ([Cursor Cloud Agents](https://cursor.com/docs/cloud-agent))
- Devin "is an autonomous AI software engineer that can write, run and test code." ([Devin docs](https://docs.devin.ai/))

Why third: they fit code work, which by earlier decision stays in GitHub. Naive should dispatch to them and record the outcome, not rebuild them.

---

## 2. Proposed architecture for Naive (plain words)

**Two planes.**
- The *record* (control plane) is Naive's Postgres. It holds agent configurations, policies, statements, judgments, and one Run record per run.
- *Execution* (data plane) runs on Vercel: Workflow for the run, Functions for steps, Sandbox for untrusted code, AI Gateway for models.

Execution never writes to the record directly. It submits proposals through the same gate every other writer uses.

**What happens in one run**
1. **Trigger.** A person asks through MCP, chat or the app. Or a schedule fires ([Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)). Or a record event, such as a statement being accepted, is put on a queue. Each trigger creates a Run record naming the agent, the configuration version, the acting person and the organization.
2. **Resolve the principal.** The run acts as *agent X, version V, in role R, for person P, in organization O*. PROV-O already has the shape: `actedOnBehalfOf` ([PROV-O](https://www.w3.org/TR/prov-o/)). Token exchange for delegation is standardized in [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693).
3. **Pin the configuration.** Load the immutable version, not the alias, so the run is reproducible.
4. **Build context from declared reads only.** A read service checks the policy and returns just the fields the configuration declared, scoped to O. Gates still get facts, not text.
5. **Think.** The agent loop (AI SDK) calls models through AI Gateway. Each request carries tags for org, venture, agent and run, and uses the org's own Gateway API key, so budgets and reporting split by org (see section 3).
6. **Act through tools.**
   - Naive's own tools (read more, propose a statement) go through Naive's MCP server.
   - External tools use credentials that never enter the agent. Inside Sandbox they are injected at the network boundary. For user-owned services (Gmail, GitHub), use per-person OAuth tokens kept in a vault and keyed by agent and person, the pattern AgentCore Identity uses ([AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-oauth.html)).
   - MCP's rules apply: servers "MUST validate that access tokens were issued specifically for them," and token passthrough "is explicitly forbidden." ([MCP authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization))
7. **Pause for people when needed.** Side effects outside Naive (send, post, merge, spend) and accepts that affect a gate wait on a Workflow hook until a person approves. OpenAI's SDK and LangGraph both make this a first-class pause and resume. ([OpenAI HITL](https://openai.github.io/openai-agents-python/human_in_the_loop/), [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts))
8. **Write back through the gate.** The run submits *proposed* statements and judgments. Each carries provenance: run id, agent version, person, model, tokens, cost and sources used. Shape validation and policy run first. Then a gate rule or a person accepts or rejects.
9. **Close the run.** Copy the trace summary (steps, tool calls, model usage, errors) into the Run record. This is needed because Vercel keeps Workflow run payloads only "7 days after the run finishes" on Pro ([Workflow data retention](https://vercel.com/docs/workflows/retention)). Naive's record must outlive the runtime's logs.

**Where code work goes.** For a venture's repo, the run dispatches a Cursor Cloud Agent or similar against the linked GitHub repo, waits on its PR, and records the PR as an ArtifactLink plus the outcome. Code stays in GitHub.

**Isolation rules.**
- One sandbox per run, never shared across organizations.
- No agent memory files on shared disks. Anthropic warns that in a shared container, settings and memory files "can leak one tenant's context into another tenant's session." ([Hosting the Agent SDK](https://docs.claude.com/en/docs/agent-sdk/hosting))
- Credentials stay outside the agent. Anthropic's guidance: "keep tool credentials out of the agent environment. Route outbound calls through a proxy that injects API keys." (same source)

**Adapter boundary.** The runtime sits behind one interface: start run, stream events, approve, cancel, collect result. Then AgentCore, Claude Managed Agents or Vertex can be added later as alternate executors without changing the record.

---

## 3. Build vs buy on the current stack

Figures below are only those quoted by sources. Token spend is not estimated.

| Option | What it is | Sourced cost drivers |
|---|---|---|
| **A. Build on Vercel (recommended)** | AI SDK agent loop + Workflow + Queues + Sandbox + AI Gateway, Postgres record | **Workflow:** "$0.02 per 1K events" ($20 per 1M), "$0.50 per GB" written, "$0.50 per GB-month" retained; "a normal step function execution produces three events" ([Workflow pricing](https://vercel.com/docs/workflows/pricing)). **Sandbox (Pro):** Active CPU $0.128/hour, Provisioned Memory $0.0212/GB-hour, Creations $0.60/1M, Max Session Duration 24 hours, 10,000 concurrent ([Sandbox pricing](https://vercel.com/docs/vercel-sandbox/pricing)). **Functions (Pro):** 300s default and 800s max duration; "Pay for active CPU time and provisioned memory time" ([Function limits](https://vercel.com/docs/functions/limitations)). **AI Gateway:** "no markup and no platform fee on tokens. You pay the provider's list price" ([Gateway pricing](https://vercel.com/docs/ai-gateway/pricing)). |
| **B. Naive control plane + vendor runtime** | Dispatch runs to Claude Managed Agents, AgentCore or Vertex Agent Engine | Vendor pricing not researched here. Each brings its own sessions and traces, which Naive must copy back. |
| **C. Self-run durable engine** | Temporal or Inngest instead of Vercel Workflow | Not priced here. Adds a service to operate outside Vercel. |
| **D. Delegate code work** | Cursor Cloud Agents for repo tasks | Already in use. Not priced here. |

**Cost reality from a source:** "Anthropic token cost typically dominates container infrastructure cost by an order of magnitude or more. A minimally provisioned container runs roughly $0.05 per hour, while a single long agent session can spend dollars in tokens." ([Hosting the Agent SDK](https://docs.claude.com/en/docs/agent-sdk/hosting)) So per-org budgets on model spend matter more than compute tuning.

**Per-org budgets with what exists today.**
- AI Gateway can "Give your team, a single project, or an individual API key a budget... AI Gateway checks the budget before each request and stops further requests once the limit is reached." ([Gateway observability and spend](https://vercel.com/docs/ai-gateway/observability-and-spend))
- Requests can carry `user` and `tags`, and the reporting API can `group_by` user or tag (Pro and Enterprise). ([Custom reporting](https://vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting))
- Gateway "user budgets" mean members of the *Vercel team*, not Naive's customers. ([Budgets](https://vercel.com/docs/ai-gateway/observability-and-spend/budgets))
- Naive reading: one Gateway API key per Naive organization, with a key budget, plus tags for venture, agent and run. Naive also keeps its own ledger in the Run records.

---

## 4. Risks of the bet

1. **Cost exposure.** Model tokens dominate (Anthropic hosting doc). A runaway loop spends real money before anyone looks. Mitigation: org key budgets, per-run step and token caps, and stop on budget.
2. **Prompt injection with real permissions.** Running agents means acting with people's credentials. Vercel's own framing is that brokered credentials leave "nothing to exfiltrate." ([Vercel changelog](https://vercel.com/changelog/safely-inject-credentials-in-http-headers-with-vercel-sandbox)) Mitigation: brokering, deny-by-default egress, approvals for side effects.
3. **Cross-tenant leakage.** Shared disks, caches or memory files leak context (Anthropic hosting doc). Mitigation: one sandbox per run, scoped reads, no shared agent memory.
4. **Record drift.** Runtimes keep their own traces and expire them (Vercel Pro: 7 days of payload access). If Naive does not copy provenance in at run end, the record is incomplete.
5. **Liability for acting on behalf of people.** Delegated tokens need consent and audit. AgentCore's design binds each token to a user with explicit consent "from user authentication through to agent action." ([AWS blog](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-amazon-bedrock-agentcore-identity-on-amazon-ecs/))
6. **Operating burden and focus.** Running agents is a product of its own (AgentCore, Agent Engine and Managed Agents are whole platforms). It can pull the team away from the record and gates, which are Naive's distinctive part.
7. **Platform coupling.** Workflow, Sandbox and Gateway are Vercel products. Mitigation: the adapter boundary in section 2. Workflow also offers a Postgres "World."
8. **Limits.** Pro functions max out at 800s (1800s in beta), and sandboxes at 24 hours per session. Long runs must be split into durable steps.

---

## 5. Questions for Torian, in order (one per card)

1. **What do Naive-run agents do first: knowledge work (research, Jev scoring, drafting statements), with code work handed to Cursor Cloud Agents?** Recommended: yes. Knowledge work is where Naive is the system of record. Code already has a good runtime and stays in GitHub.
2. **Build the runtime on Vercel Workflow, AI SDK, Sandbox and AI Gateway?** Recommended: yes. It is the team's existing stack and has durable steps, pauses for approval, microVM isolation and per-key budgets.
3. **Is every run a Run record in Naive, with the trace summary copied in at the end?** Recommended: yes. Vercel keeps run payloads 7 days on Pro, and the record must outlive the runtime.
4. **Do agents only propose statements, with a gate or a person accepting them?** Recommended: yes. One write path for people and agents keeps provenance and gates uniform.
5. **Which triggers come first?** Recommended: manual and scheduled first, record events second, outside webhooks last. Fewer triggers make runaway loops less likely.
6. **Per-org spend control by one Gateway API key per organization, with a budget and tags?** Recommended: yes. Gateway enforces key budgets before each request today, and Naive keeps its own ledger.
7. **Credentials never enter the agent: brokered at the sandbox edge, and per-person OAuth tokens held in a vault keyed by agent and person?** Recommended: yes. It removes the main exfiltration path and matches AgentCore's model.
8. **Which actions always need a human approval?** Recommended: anything leaving Naive (send, post, merge, purchase), and any accept that changes a gate outcome. These are irreversible or decide a venture's phase.
9. **Default agent loop: AI SDK in Workflow steps, with the Claude Agent SDK inside a Sandbox only for shell or computer tasks?** Recommended: yes. The AI SDK stays model-agnostic through the Gateway, and the Claude harness needs a long-lived process and disk.
10. **Who pays for tokens: pass-through metered cost per organization, with bring-your-own-key later?** Recommended: pass-through first, since Gateway charges list price with no markup and supports BYOK when an organization wants its own contracts.
11. **Hard isolation rule: one sandbox per run, never reused across organizations?** Recommended: yes. It is the simplest rule that prevents cross-tenant leakage.
12. **Keep the runtime behind an adapter so vendor runtimes can be added?** Recommended: yes. It makes the bet reversible: if running agents costs too much focus, Naive can hand execution to AgentCore, Managed Agents or Vertex and keep the record.

---

## Source list
- Vercel Workflows: https://vercel.com/docs/workflow ; https://vercel.com/docs/workflows ; pricing: https://vercel.com/docs/workflows/pricing ; retention: https://vercel.com/docs/workflows/retention
- Vercel Queues: https://vercel.com/docs/queues ; Cron Jobs: https://vercel.com/docs/cron-jobs
- Vercel Sandbox: https://vercel.com/docs/vercel-sandbox ; pricing: https://vercel.com/docs/vercel-sandbox/pricing ; firewall: https://vercel.com/docs/sandbox/concepts/firewall ; blog: https://vercel.com/blog/a-sandbox-without-a-network-boundary-is-only-half-a-sandbox ; changelog: https://vercel.com/changelog/safely-inject-credentials-in-http-headers-with-vercel-sandbox
- Vercel Functions limits: https://vercel.com/docs/functions/limitations
- Vercel AI Gateway: https://vercel.com/docs/ai-gateway ; pricing: https://vercel.com/docs/ai-gateway/pricing ; spend: https://vercel.com/docs/ai-gateway/observability-and-spend ; budgets: https://vercel.com/docs/ai-gateway/observability-and-spend/budgets ; reporting: https://vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting
- AWS Bedrock AgentCore: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html ; Identity OAuth: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-oauth.html ; AWS blog: https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-amazon-bedrock-agentcore-identity-on-amazon-ecs/
- Vertex AI Agent Engine: https://docs.cloud.google.com/agent-builder/agent-engine/overview
- Claude Agent SDK hosting: https://docs.claude.com/en/docs/agent-sdk/hosting ; permissions: https://docs.claude.com/en/docs/agent-sdk/permissions
- OpenAI Agents SDK: https://openai.github.io/openai-agents-python/ ; HITL: https://openai.github.io/openai-agents-python/human_in_the_loop/ ; tracing: https://openai.github.io/openai-agents-python/tracing/
- LangGraph / LangSmith Deployment: https://docs.langchain.com/langgraph-platform ; interrupts: https://docs.langchain.com/oss/python/langgraph/interrupts
- Letta: https://docs.letta.com/
- Temporal: https://docs.temporal.io/temporal ; Inngest: https://www.inngest.com/docs
- Firecracker: https://firecracker-microvm.github.io/ ; E2B: https://e2b.dev/docs
- Cursor Cloud Agents: https://cursor.com/docs/cloud-agent ; Devin: https://docs.devin.ai/
- MCP authorization: https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
- RFC 8693 Token Exchange: https://datatracker.ietf.org/doc/html/rfc8693
- PROV-O: https://www.w3.org/TR/prov-o/
