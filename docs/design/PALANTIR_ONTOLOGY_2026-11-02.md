<!-- Placement: tchjhnsn/Naive docs/design/PALANTIR_ONTOLOGY_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

# Palantir and its Ontology: deep research for Naive

Prepared Nov 2, 2026 (America/Chicago). Builds on `docs/design/SYMBOLIC_SYSTEM_ONTOLOGY_2026-11-02.md`, `docs/design/AGENT_RUNTIME_2026-11-02.md` and `docs/design/VENTURE_ORG_ONTOLOGY_2026-11-02.md`, and does not repeat them. Most claims come from pages fetched this session: Palantir's docs at palantir.com/docs, its FY2025 10-K, the Q2 2026 press release and the AIP launch letter. Anything seen only in a search snippet is marked **[snippet only]**. Raw page text is saved in a local Palantir page-text checkout not kept in the repo.

Note on timing: Palantir reports Q3 2026 after the market closes today, Nov 2, at 4:00 PM CT, with the webcast at 5 PM ET ([EconoTimes](https://econotimes.com/Palantir-Sets-Nov-2-Q3-Report-Q2-Results-Set-Q3-Revenue-Guidance-at-2-160B-2-164B-1767070), [snippet only]). Those figures are not in this report.

---

## 0. Short answer

- **What Palantir's Ontology is.** It is a typed operational model of an organization. Object types, properties and link types are the "semantic" half. Action types, functions and dynamic security are the "kinetic" half. Data from datasets is indexed into object databases, and every change goes through governed actions. Palantir pitches it as "the decisions in an enterprise, not simply the data" ([Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology/)).
- **Closest match in Naive.** Naive's knowledge graph plus its agent runtime. The biggest difference is the unit. Palantir's unit is the **object**, a current-state row with an edit history. Naive's unit is the **sourced statement**, with judgments as their own records. Naive is closer to a provenance graph, and Palantir is closer to a governed operational database.
- **What Naive already does as well as Palantir or better:** append-only history from day one (in Palantir's newer storage, edit history is opt-in), open RDF/JSON-LD export (Palantir has no open export, which is the core of the lock-in critique), per-person multi-organization membership, and judgments stored as records.
- **What Palantir has that Naive lacks:**
  1. **Mandatory, propagating labels (markings)** that follow data into everything derived from it.
  2. **Typed action types** as the only write path, with parameters and submission criteria.
  3. **A materialized current-state view** over the history.
  4. **Two separate MCP surfaces**, one to use the data and one to change the schema.
  5. **A per-model allowlist** of data labels that can reach an LLM.
  6. **Evals that run in a simulated ontology.**
  7. **A typed agent session model**: sessions, typed context items, events and state transitions.
- **Top lesson.** Palantir's own docs warn that row and column filters "filter what a user can read" and do not carry into function outputs, action edits or an LLM's context. Only mandatory controls propagate ([Access control propagation](https://www.palantir.com/docs/foundry/security/access-control-propagation/)). Naive's declared reads are read-time filters. Without a propagating label, a consent restriction on a puzzle transcript would not follow the statements an agent derives from it.

---

## 1. History, products and business model

**History.**
- Palantir was "founded in 2003 and started building software for the intelligence community in the United States to assist in counterterrorism investigations and operations," and later began working with commercial enterprises ([FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm)). It was "incorporated in Delaware on May 6, 2003" (same filing).
- Wikipedia, citing the WSJ, reports that the CIA-affiliated In-Q-Tel "invested about $2 million" ([Wikipedia](https://en.wikipedia.org/wiki/Palantir_Technologies)). Wikipedia also says Gotham was "Released in 2008."
- Foundry's 2016 launch and Apollo's 2021 commercial availability come from search snippets only, citing [Palantir's Apollo blog post](https://blog.palantir.com/palantir-apollo-powering-saas-where-no-saas-has-gone-before-7be3e565c379) **[snippet only; the blog blocked fetching]**.
- AIP was announced in a CEO letter on April 7, 2023, as "our fourth platform after Gotham, Foundry, and Apollo." The letter said it would be available to strategic partners "no later than the end of May" ([Karp letter](https://www.palantir.com/newsroom/letters/our-new-platform/)). The letter names the Ontology and branching as the reason for the platform: "the imposition on data of what we describe as an ontology, a means of ensuring that such data reflects the structure of and actual objects in the real world, and incorporates branching capabilities that we have developed for the data models themselves."

**Products, per the 10-K** ([FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm)):
- **Foundry** is "our foundational data operations platform, which provides the core capabilities for data management, logic authoring, systemic mapping development through Palantir Ontology ("Ontology"), analytics, and workflow development."
- **AIP** "provides secure connectivity to third-party-provided large language models ("LLMs"), a development toolchain for building AI-powered agents and automations, an array of AI-enabled end user applications, a broad evaluations framework for governing AI workflows in production, and more."
- **Apollo** is "our continuous delivery platform." The Apollo docs say it handles "compliance-aware change management" across "connected and disconnected, air-gapped environments," with controls for "FedRAMP, IL5, and IL6" ([Apollo intro](https://www.palantir.com/docs/apollo/core/introduction/)).
- **Gotham** serves "allied defense and intelligence operations" (10-K).
- On where the Ontology sits: "These platforms, backed by Apollo and with Ontology at their heart, can be deployed in almost any environment" (10-K). The 10-K also says: "Ontology generally refers to the systematic mapping of data to meaningful context. The Palantir Ontology goes far beyond the traditional concept by integrating the elements of a decision" (the data, logic and actions) "into a foundational representation of the organization."

**Scale** ([FY2025 10-K](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm), [annual report PDF](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000021/fy2025palantirars.pdf)):

| Measure | Figure |
|---|---|
| FY2025 revenue | $4.5 billion ($4,475,446 thousand per [edgar.tools](https://app.edgar.tools/companies/PLTR/disclosures/segments), [snippet only]) |
| Government share of revenue | 54% |
| Commercial share of revenue | 46% |
| U.S. share of revenue | 74% |
| Customers on Dec 31, 2025 | 954 |
| Top-20 customers, average revenue | $93.9 million, up 45% from $64.6 million |

[Q2 2026 press release](https://investors.palantir.com/news-details/2026/Palantir-Reports) (quarter ended June 30, 2026):
- Revenue was $1.935 billion, up 93% year over year.
- U.S. commercial revenue was $764 million, up 149%.
- U.S. commercial TCV was $2.132 billion.
- FY2026 revenue guidance was raised to $8.150 to $8.158 billion.

**Business model and pricing.**
- **No public list price.** The 10-K says "the pricing of the Company's contracts is generally fixed; however, it is possible for contracts to include variable consideration." It also lists "subscription-based or usage-based pricing structures" as strategies that may not achieve broad adoption.
- **Low-cost pilots.** Palantir uses "AIP bootcamps, which allow us to deliver real workflows on actual customer data in days," and a "Developer Tier offering, which provides limited access to Foundry and AIP." It also provides platforms "at no or low cost initially to them for evaluation purposes through short-term pilot deployments" (10-K).
- **Metering units** (from the docs):
  - Foundry meters work in "compute-seconds" ([Usage types](https://www.palantir.com/docs/foundry/resource-management/usage-types/)).
  - Ontology storage is "Ontology volume," measured in "gigabyte-months." Objects accrue compute "to index datasets to object types; in other words, the cost of syncing the Ontology" (same page).
  - AIP tokens are converted to compute-seconds "to match the price of the underlying model provider" ([AIP compute usage](https://www.palantir.com/docs/foundry/aip/aip-compute-usage/)).
  - No dollar price per compute-second is published. The AWS Marketplace listing is private-pricing only ([AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-a5m5xespbqyci), [snippet only]).

---

## 2. The Ontology in detail

### 2.1 Semantic elements

- **Ontology.** "An Ontology is a categorization of the world. In Foundry, the Ontology is the digital twin of an organization" ([Core concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts/)). Palantir explicitly maps it onto tables: object type = dataset, object = row, property = column, link type = join (same page).
- **Object type.** "the schema definition of a real-world entity or event." Objects come from "backing datasources" or are created only "through actions," in which case there is no backing datasource ([Object types](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview/)).
- **Property and shared property.** A shared property "can be used on multiple object types... While property metadata is shared across objects, the underlying object data is not" ([Shared properties](https://www.palantir.com/docs/foundry/object-link-types/shared-property-overview/)).
- **Value types.** These are "semantic wrappers around a field type that include metadata and constraints," for example an "email" type with a regex. They are "versioned to handle both breaking and non-breaking edits" and scoped to a space ([Value types](https://www.palantir.com/docs/foundry/object-link-types/value-types-overview/)).
- **Link type.** "the schema definition of a relationship between two object types" ([Core concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts/)).
- **Interfaces.** These give polymorphism: "Object types are concrete... interfaces are abstract; they... are not backed by datasets, and cannot be instantiated directly." Interfaces can extend other interfaces, and support across the platform is still partial ([Interfaces](https://www.palantir.com/docs/foundry/interfaces/interface-overview/)).
- **Object sets** are "static" (a list of primary keys) or "dynamic" (saved filters), and "temporary" (expire within 24 hours) or "permanent" ([Ontology architecture](https://www.palantir.com/docs/foundry/object-backend/overview/)).

### 2.2 Kinetic elements

- **Action types.** "An action is a single transaction that changes the properties of one or more objects, based on a user-defined logic." An action type can carry parameters, rules, side effects such as notifications, and validation of who may run it. Palantir adds: "The data asset grows in richness and value as user decisions and insights are captured in the form of edits to the Ontology" ([Action types](https://www.palantir.com/docs/foundry/action-types/overview/)).
- **Submission criteria** (formerly "validations") "determine whether an action can be submitted" by combining user, parameter and object conditions ([Submission criteria](https://www.palantir.com/docs/foundry/action-types/submission-criteria/)).
- **Action log vs edit history.** These answer different questions ([Action log](https://www.palantir.com/docs/foundry/action-types/action-log/)):
  - The action log answers "What decision was made, by whom, when, and in what context?" It "records successful action submissions only."
  - Edit history "records every edit to an object, regardless of how the edit was made" ([User edit history](https://www.palantir.com/docs/foundry/object-edits/user-edit-history/)).
  - Edit history is a toggle. Changes made "prior to the activation of this feature will not be tracked."
- **Functions** are "code-based logic" in TypeScript or Python, run "on the server side in an isolated environment," with first-class support for reading objects, traversing links and making edits ([Functions](https://www.palantir.com/docs/foundry/functions/overview/)).
- **Semantic vs kinetic.** The overview says the Ontology contains "both the semantic elements (objects, properties, links) and kinetic elements (actions, functions, dynamic security)" ([Overview](https://www.palantir.com/docs/foundry/ontology/overview/)). The "why" page calls data "the nouns" and actions "the verbs," and models every decision as Data, Logic, Action and Security ([Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology/)).

### 2.3 Backend: OMS, OSv1 (Phonograph), OSv2, Funnel, OSS

These come from [Ontology architecture](https://www.palantir.com/docs/foundry/object-backend/overview/) unless noted.

**The services:**
- **Ontology Metadata Service (OMS)** "defines the set of ontological entities that exist."
- **Object databases** store the indexed data. The Object Set Service serves reads.
- **Object Data Funnel** orchestrates indexing in OSv2. Funnel pipelines run in batch or streaming mode, and "direct datasources" give low-latency writes ([Indexing](https://www.palantir.com/docs/foundry/object-indexing/overview/)).

**Object Storage v1 (Phonograph), the legacy store:**
- Writeback datasets were required ([Breaking changes OSv1 to OSv2](https://www.palantir.com/docs/foundry/object-backend/object-storage-v2-breaking-changes/)).
- Unregistering a datasource "removes the history of user data edits" ([OSv1](https://www.palantir.com/docs/foundry/object-databases/object-storage-v1/)).
- It is "unavailable after June 30, 2026," so it is now past its end date.

**Object Storage v2:**
- It "separates dimensions of concern that had been consolidated in Object Storage v1."
- It offers incremental indexing by default, "tens of billions of objects for a single object type," up to "10,000 objects to be edited in a single Action," streaming sources, and "a maximum of 2000 properties per object type."

**Breaking changes between OSv1 and OSv2** ([Breaking changes](https://www.palantir.com/docs/foundry/object-backend/object-storage-v2-breaking-changes/)):
- "OSv2 only supports user edits via Actions."
- Writeback datasets are renamed "materializations" and become optional. Materializations hold "the latest state of each object by combining data from both input datasources and user edits" ([Materializations](https://www.palantir.com/docs/foundry/object-edits/materializations/)).
- Migration did not carry history by default: "the history of user edits (Actions) will not be preserved except for Action Logs" unless the costly preserve option was chosen.

**Highbury.** Palantir's public docs never use this name. A community forum thread titled "Highbury edit log" asks for the OSv2 equivalent of a Phonograph endpoint. A Palantir responder there says OSv2 has no "global edit log for an entire object type," because of "the complexity of the permission system" ([community thread, Dec 2024](https://community.palantir.com/t/highbury-edit-log/2220)). That Highbury is the internal name for OSv2 is an inference from that thread, not a documented fact.

**OSDK.** Typed SDKs for TypeScript, Python and Java, plus OpenAPI, "generated from your Ontology." A token is "scoped only to the ontological entities you want your application to access" ([OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/overview/)).

---

## 3. Governance and multi-tenancy

### 3.1 The tenancy model

| Palantir layer | What the docs say |
|---|---|
| Enrollment | "an instance of the Foundry platform and is made up of one or more Organizations" ([Cross-org collaboration](https://www.palantir.com/docs/foundry/security/cross-organization-collaboration/)) |
| Organization | "strict access requirements"; "Every user is a member of only one organization, but can be a guest member of multiple organizations" ([Orgs and spaces](https://www.palantir.com/docs/foundry/security/orgs-and-spaces/)) |
| Space | "a high-level container of projects, with one common ontology"; a space can carry several organizations |
| Ontology | "mapped 1:1 with a space"; private (one org) or shared (two or more) ([Ontologies](https://www.palantir.com/docs/foundry/ontologies/ontologies-overview/)) |
| Project | "the primary boundary for discretionary role grants"; roles Owner, Editor, Viewer, Discoverer ([Projects and roles](https://www.palantir.com/docs/foundry/security/projects-and-roles/)) |

Two details matter for Naive:
- **Sharing does not expose source data.** "Creating a shared ontology does not by itself make the underlying data visible to every applied organization. A dataset referenced from a private project into a shared project keeps the access requirement of the organization it came from" ([Ontologies](https://www.palantir.com/docs/foundry/ontologies/ontologies-overview/)).
- **Permissions moved to projects.** Ontology resource permissions now follow the project a resource is saved in. This "replaces the previous permission models: ontology roles and datasource-derived permissions" ([Ontology permissions](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions/)).

### 3.2 Mandatory vs discretionary controls

**Mandatory controls: markings, CBAC and organizations.**
- Markings are binary: "Regardless of role, a user cannot access a file in any way unless the user satisfies all marking requirements." They are conjunctive ("boolean AND"). Removing one requires a separate "Expand Access" permission.
- "Unlike role-based access, which is based on where data lives in the platform, markings travel with the data... All resources derived from a marked file... will assume a marking unless the marking is explicitly removed" ([Markings](https://www.palantir.com/docs/foundry/security/markings/)).
- "Mandatory controls propagate through derivation" ([Access control propagation](https://www.palantir.com/docs/foundry/security/access-control-propagation/)).

**Discretionary controls: roles, restricted views, object and property security policies.**
- Object security policies give row-level security, property security policies give column-level security, and together they give "cell-level security" ([Object security policies](https://www.palantir.com/docs/foundry/object-permissioning/object-security-policies/)).
- Restricted views use "granular policies" that compare user attributes to columns. The docs warn against NOT conditions, because "scoped tokens... may lack the attribute the NOT condition checks against, causing the condition to pass and grant more access than intended" ([Restricted views](https://www.palantir.com/docs/foundry/security/restricted-views/)).

**Where discretionary controls stop.** The propagation page lists the leaks plainly ([Access control propagation](https://www.palantir.com/docs/foundry/security/access-control-propagation/)):
- Function return values.
- Action edits.
- "AIP Logic tool calls: A tool call returns Ontology data into the model's context. Once in context, the data can be summarized, transformed, and returned through any of the model's output paths with no remaining association to the source policy."
- OSDK responses, writeback operations, and exports.

### 3.3 Change control, branching, approvals, audit

- **Global Branching** (formerly Foundry Branching) lets you "make modifications across multiple applications on a single branch, test those changes end-to-end... and merge those changes with a single click." You can "run actions on branches without writing back edits to the main branch" ([Global Branching](https://www.palantir.com/docs/foundry/global-branching/overview/)).
- **Ontology branches and proposals.**
  - "An ontology proposal is analogous to a Pull Request." Reviewers approve or reject each resource "task" ([Review proposals](https://www.palantir.com/docs/foundry/ontologies/review-ontology-proposals/)).
  - Protected resources (object, action, link and interface types, and shared properties) must be changed on a branch.
  - Rebase is manual once the ontology changes, and conflicts are resolved per resource ([Branching the ontology](https://www.palantir.com/docs/foundry/ontologies/branching-ontology/)).
  - What gets branched is schema and config, not object data. Data what-ifs are Scenarios, which `docs/design/PRECOG_DEFINITION_2026-11-02.md` already covers.
- **Approvals.** A request is a set of tasks that "must all be approved for the tasks to be invoked." Requests persist "so you can reference them as an audit log of past decisions" ([Approvals](https://www.palantir.com/docs/foundry/approvals/overview/)).
- **Checkpoints.** These prompt a user "to provide a justification for an interaction" and keep a record of who, when, why and what data. They are integrated into "60+ different interactions" ([Checkpoints](https://www.palantir.com/docs/foundry/checkpoints/overview/)).
- **Audit logs.** They answer who, what, when and where. Palantir recommends consuming them in the customer's own SIEM, and the current schema is audit.3 ([Audit logs](https://www.palantir.com/docs/foundry/security/audit-logs-overview/)).
- **Lineage.** The Data Lineage tool shows "how data flows through the Foundry platform" ([Data Lineage](https://www.palantir.com/docs/foundry/data-lineage/overview/)). The "why" page also claims "decision lineage" of "when a given decision was made, atop which version of enterprise data, and through which application" ([Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology/)).

---

## 4. AIP: how agents use the Ontology

**The tools:**
- **AIP Logic** is "a no-code development environment for building, testing, and releasing functions powered by LLMs." Its functions "can also be automated so that Ontology edits can be automatically applied or staged for human review" ([AIP Logic](https://www.palantir.com/docs/foundry/logic/overview/)).
  - The Automate integration advises: "For consequential or ambiguous actions, a privacy best practice is to stage them as proposals. Staging prevents the action from changing data until a reviewer inspects and accepts the proposal" ([Logic + Automate](https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate/)).
  - Automate triggers on time, object-data or dataset conditions ([Automate](https://www.palantir.com/docs/foundry/automate/overview/)).
- **Agent Studio was renamed.** The AIP overview now calls it "AIP Chatbot Studio (formerly known as AIP Agent Studio)" ([AIP overview](https://www.palantir.com/docs/foundry/aip/overview/)).
- **The Agent Stack** is the newer agent layer ([Agent Stack](https://www.palantir.com/docs/foundry/aip/agent-stack/)):
  - "The Agent Stack models each task as a session, with context items representing the information involved and events providing input that drives state transitions."
  - "Sessions can last indefinitely."
  - "Context items are strongly typed."
  - Agents are built in **Agent Builder** (beta) or with the **Agent SDK** or third-party SDKs, and monitored in **Agent Manager**.
- **Agent Builder** ([Agent Builder](https://www.palantir.com/docs/foundry/agent-builder/overview/), [core concepts](https://www.palantir.com/docs/foundry/agent-builder/core-concepts/)):
  - Agents are configured with inputs, "pre-computed variables," prompts and tools. Tools "can call functions, apply Ontology actions, or query Ontology data."
  - Pre-computed variables run before the session starts. One caution: "If a pre-computed variable contains an action, the action runs automatically when the session starts."
  - Published agents are "Compass resources," and "Access to an agent does not automatically grant access to every session" ([Agent Manager](https://www.palantir.com/docs/foundry/agent-manager/overview/)).
- **AIP Evals** creates test cases and evaluation functions and compares versions ([AIP Evals](https://www.palantir.com/docs/foundry/aip-evals/overview/)). Edits are sandboxed: "each test case is executed in an Ontology simulation. This ensures that the actual Ontology remains unchanged" ([Evals and Ontology edits](https://www.palantir.com/docs/foundry/aip-evals/ontology-edits/)).
- **The LLM data gate.** Admins can "Allow only the following markings" for model requests. "AIP rejects the request if the token includes any mandatory Marking outside the allowlist, even when the data included in the request does not have that Marking" ([Control LLM data access with Markings](https://www.palantir.com/docs/foundry/aip/control-llm-data-access-with-markings/)). AIP says third-party providers retain no prompt or completion data ([AIP security](https://www.palantir.com/docs/foundry/aip/aip-security/)).
- **MCP.** There are two separate servers:
  - **Ontology MCP** "is designed for ontology consumers: external AI agents that need to safely write data to your ontology... while restricting which actions the agent can take through application restrictions."
  - **Palantir MCP** "is designed for ontology builders... provides 70+ tools for building and modifying ontology types... but cannot write actual ontology data" ([Ontology MCP](https://www.palantir.com/docs/foundry/ontology-mcp/overview/)).
  - Each action has an "Agent tool description" field that controls what the agent sees ([OMCP tools](https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration/)).
  - Palantir MCP's schema tools write "on a provided branch" ([Palantir MCP tools](https://palantir.com/docs/foundry/palantir-mcp/available-tools/), [snippet only]).

**Palantir's claims for why an ontology matters for AI** (all from [Why create an Ontology?](https://www.palantir.com/docs/foundry/ontology/why-ontology/)):
- "Traditional data architectures do not capture the reasoning that goes into decision-making or the actions that follow, and therefore limit learning and the incorporation of AI."
- "Deterministic functions, algorithms, and conventional statistical processes can serve as operational tools which complement the non-deterministic reasoning of LLMs."
- "Tool usage is dynamically enforced through the same security architecture that governs data access and all forms of memory."
- Actions can be "safely staged as scenarios" before write-back.

The Palantir blog posts "Reducing hallucinations with the Ontology in Palantir AIP" and "Connecting AI to Decisions with the Palantir Ontology" exist, but their hosting site blocked fetching. Their content is not quoted here **[snippet only]**.

---

## 5. Critiques, limits and alternatives

**Lock-in.**
- heise: "there is no option to move the system to another provider once it has been set up. Certain data can be exported, but the actual capital – the semantic structures, logics, interactions – are deeply linked to Palantir's system and only work there" ([heise](https://www.heise.de/en/background/Missing-link-Power-center-Palantir-a-software-controls-organizations-10463503.html)).
- An independent consultant: "The ontology does not [come back out]. Neither do the actions, the Workshop apps, or the AIP logic, and there is no open ontology standard to export to." He advises keeping "Physical data and transformation logic" in open form ([LaRochelle, Aug 2026](https://eriklarochelle.ai/insights/palantir-snowflake-seam/)).

**Cost shape.**
- LaRochelle describes "a committed platform fee sitting on top of consumption" with "three meters" (fee, compute-seconds and tokens, plus infrastructure). He reads Palantir's 157% net dollar retention as rising marginal cost (same source).
- A licensing advisory says "There is no list price" and that the pilot sets the price ([Redress Compliance](https://redresscompliance.com/palantir-aip-foundry-negotiation), [snippet only]).
- The 10-K confirms the no-or-low-cost pilots (section 1).

**The ontology approach itself.**
- A practitioner essay warns that ontologies can be "dangerously prescriptive - imposing a business model - rather than descriptive," and that "an incomplete ontology is not just lagging behind; it's wrong" ([Creative Differences](https://creativedifferences.substack.com/p/interested-in-ontologies-let-me-tell), [snippet only]).
- An analysis contrasts Palantir with academic usage. It cites Gruber's definition, "an explicit specification of a conceptualization," and sums up: "OWL lets machines understand the world, knowledge graphs let machines retrieve the world, and Palantir's ontology lets machines change the world within the rules you've drawn" ([Xinhe Liu](https://xinheliu.github.io/writing/palantir-ontology/)).
- Palantir's docs never mention RDF, OWL or SHACL. In none of the pages fetched did the Ontology show formal inference or an open-world semantics. It is a typed, closed operational schema (our reading).

**Self-admitted limits in Palantir's own docs:**
- Read filters do not propagate (section 3.2).
- OSv2 has no global edit log per object type (forum thread above).
- Edit history is opt-in.
- History was not migrated from OSv1 by default.
- Interfaces are only partially supported.

**Comparisons:**

| System | What it is | Versus Palantir |
|---|---|---|
| RDF/OWL/SHACL knowledge graphs | Open W3C standards for meaning, inference and validation (see `docs/design/SYMBOLIC_SYSTEM_ONTOLOGY_2026-11-02.md`) | Portable and able to reason, but no action layer |
| dbt Semantic Layer | "Semantic models are the foundation for data definition in MetricFlow" ([dbt](https://docs.getdbt.com/docs/build/semantic-models)) | Metrics only; no objects or actions |
| Cube | "Model your metrics, dimensions, joins, and access rules once, in code" for BI and "AI agents" ([Cube](https://cube.dev/use-cases/semantic-layer)) | Metrics plus access rules; open-source core; no actions |
| AtScale | Virtual cubes with metrics, dimensions and relationships ([AtScale docs](https://documentation.atscale.com/container/creating-and-sharing-cubes/creating-cubes/modeling-cube-measures)) | Semantic layer for analytics |
| Microsoft Fabric IQ ontology (preview) | Entity types with "properties, identifiers, metrics, rules, metadata, and relationships," bound to OneLake data, for "people, applications, and AI agents" ([Microsoft Learn](https://learn.microsoft.com/en-us/fabric/iq/ontology/overview)) | Closest direct competitor; actions come through Operations Agent ([Fabric blog](https://community.fabric.microsoft.com/blog/fbc_fabricupdatesblogs/fabric-iq-the-semantic-layer-powering-trusted-ai-agents-at-enterprise-scale/5190739), [snippet only]) |
| Salesforce Data 360 (Data Cloud) | Data Model Objects harmonize raw Data Lake Objects into a Customer 360 model ([Salesforce docs](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-object-model.html), [snippet only]) | Customer-domain model, not general |
| Data catalogs | Index and describe datasets | Palantir: "Far beyond data cataloging or schema design solutions" ([Overview](https://www.palantir.com/docs/foundry/ontology/overview/)) |
| Open alternatives | Open Foundry: "open-source ontology platform for operational digital twins," Apache-2.0, on PostgreSQL, Apache AGE and OpenFGA ([GitHub](https://github.com/syzygyhack/open-foundry)). Bellona and CogniMesh are early ([snippet only]) | Young projects; worth reading, not adopting |

---

## 6. Mapping: Palantir concept vs Naive's decided concept

Each row is marked **Match**, **Gap** (Palantir has it and Naive does not) or **Diff** (a deliberate difference).

| Palantir | Naive (decided) | Verdict | Note and recommendation |
|---|---|---|---|
| Ontology per space, digital twin | Governed knowledge graph per organization; system of record | Match | Both sit under systems of engagement. |
| Object (current-state row) | Sourced statement (a claim with source, status and history) | Diff | Keep statements. **Add a derived current-state view** (Q3). |
| Object type / property | Record classes (Venture, Statement, Decision, Task...) and predicates | Match | Keep the base set small, against the "prescriptive" critique. |
| Shared property | SKOS concepts, framework plus per-organization extensions | Match | |
| Value types (validated, versioned) | SHACL shapes (proposed, not yet decided) | Gap | Decide shapes plus versioning together. |
| Link type | Typed relations (PROV, derived-from, part-of) | Match | |
| Interfaces | `KnowledgeItem` parent class | Partial | Enough for now. |
| Action type + submission criteria | Agents propose; a gate or person accepts; policies as data | Gap | **Make typed action types the only write path** (Q2), with criteria in the one policy engine. |
| OSv2 "edits only via Actions" | Same intent | Match | Confirms Naive's direction. |
| Functions | Jev, gate code, extraction code | Match | |
| Object sets (static/dynamic) | None | Gap (low) | Saved queries later. |
| Action log + opt-in edit history | Append-only history; Run record; Activity and Transaction | Naive stronger | History is on from the first write, never a toggle. Palantir's migration lost history. |
| Writeback dataset / materialization | RDF/JSON-LD export | Diff | Naive's open export answers the lock-in critique. |
| Funnel indexing (copies data in) | Outside sources referenced, statements extracted with links | Diff | Naive avoids a second copy, the "seam" risk LaRochelle names. |
| Organization (one per user, guests) | Person has memberships in many orgs; personal org per account | Diff | Naive's model fits founders in several ventures. |
| Space + shared ontology | Joint venture forms a shared organization; guests for lighter work | Match | Palantir confirms shared schema does not expose source data. Naive's share-by-reference has the same rule. |
| Project (discretionary roles) | Roles across the org or one venture | Match | |
| Markings (mandatory, propagating) | Org scoping, consent records, declared reads | **Gap (top)** | **Add propagating labels** (Q1). |
| Object/property security, restricted views (read-time only) | Declared reads | Match, same limit | Palantir documents the leak into LLM context. Q1 closes it. |
| Global Branching, ontology proposals, protected types | No knowledge branching; draft/accepted; framework PRs | Diff for data, Gap for schema | **Schema changes via reviewed proposals** (Q8). |
| Scenarios (data what-ifs) | Covered in `docs/design/PRECOG_DEFINITION_2026-11-02.md` | Later | |
| Approvals inbox | A person approves outward actions and gate-changing accepts | Match | Store approvals as records. |
| Checkpoints (justification prompts) | None | Gap (low) | Consider for reading raw transcripts. |
| Audit logs (who, what, when, where; SIEM) | Activity and Transaction cover writes | Gap (reads) | Log agent reads against declared reads. |
| AIP Logic / Automate staged proposals | AI SDK functions; Workflow; manual and scheduled triggers first | Match | |
| Agent Stack: session, typed context items, events, states | Run record with trace summary | Gap (shape) | **Type the Run record** (Q7). |
| Agent Builder config | AgentConfiguration (instructions, model, capabilities, reads, role, owner) | Match | Naive adds a named owner and acting on behalf of a person. |
| AIP Evals in Ontology simulation | Jev calibration; draft status | Gap | **Evals in a simulated scope** (Q6). |
| Marking allowlist per model | ZDR via AI Gateway; per-org keys | Gap | **Label allowlist per model** (Q5). |
| Ontology MCP (data via actions) vs Palantir MCP (schema, on branches) | MCP main interface plus REST | Gap (split) | **Two MCP scopes** (Q4). |
| "Agent tool description" per action | Capability descriptions | Match | Store it on the action type. |
| OSDK (typed, scoped token) | REST plus MCP | Gap (later) | Generate a typed client from the schema later. |
| Apollo | Vercel deploys | Not needed | |
| Compute-seconds, GB-months, tokens converted | Per-org AI Gateway key, list-price tokens | Match | Naive's metering is more transparent, which is a selling point. |

**Concrete lessons:**
1. **Labels must travel with derived knowledge.** Palantir learned this and documents it as the core design rule ("Mandatory controls propagate through derivation"). For Naive the first case is the founder puzzle. The private transcript and consent-only Jev scoring must follow any statement an agent derives.
2. **One write path.** Palantir's OSv2 removed every write path except Actions. Naive's "agents only propose" is the same idea. Typing the proposals makes gates and audit simpler.
3. **History is not optional.** Palantir's edit history is a toggle, and its storage migration dropped history by default. Naive's append-only rule should be enforced in the schema, not in configuration.
4. **Separate "use the graph" from "change the graph's shape"** for agents. Palantir ships two MCP servers for this.
5. **Avoid the prescriptive trap.** Critics say a heavy ontology goes stale. Naive's statement-first design, with small base types and per-org SKOS, tolerates change better than object-first schemas.
6. **Openness is a differentiator.** The lock-in critique is entirely about the semantic and action layers not being exportable. Naive's RDF/JSON-LD export and referenced sources are a direct answer worth stating in positioning.

---

## 7. Questions for Torian, in order (one per card)

1. **Should statements and sources carry mandatory labels that propagate to anything derived from them, such as private transcript or consented for scoring?**
   Recommended: yes. Start with 2 or 3 labels. A derived statement takes the union of its inputs' labels, and only a named role can remove one.
2. **Should typed action types (named proposal kinds with parameters, checked by the policy engine) be the only way agents and people write to Naive?**
   Recommended: yes.
3. **Should Naive keep a derived current-state view per subject, built from accepted statements, so apps and agents can read objects and not just raw statements?**
   Recommended: yes. Make it rebuildable from history and never written to directly.
4. **Should Naive's MCP have two scopes: one to read and propose knowledge, and one to change schema, vocabulary or agent configuration through reviewed proposals?**
   Recommended: yes.
5. **Should each model in AI Gateway have an allowlist of data labels it may receive, checked on every call?**
   Recommended: yes. It depends on Q1.
6. **Should evals run in a simulated scope where proposed writes never touch the real record?**
   Recommended: yes. Reuse the run's sandbox and the draft status.
7. **Should the Run record use Palantir's agent shape: a session with typed context items, events and state transitions?**
   Recommended: yes, a lightweight version that maps onto Vercel Workflow steps.
8. **Should changes to record types and vocabulary go through reviewed proposals on protected types, while knowledge branching stays off?**
   Recommended: yes. Schema proposals go through `framework` PRs, and data branching waits until what-if scenarios are needed.

---

## Sources

**Palantir docs (fetched):**
- Ontology:
  - [overview](https://www.palantir.com/docs/foundry/ontology/overview/)
  - [why](https://www.palantir.com/docs/foundry/ontology/why-ontology/)
  - [core concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts/)
  - [object types](https://www.palantir.com/docs/foundry/object-link-types/object-types-overview/)
  - [shared properties](https://www.palantir.com/docs/foundry/object-link-types/shared-property-overview/)
  - [value types](https://www.palantir.com/docs/foundry/object-link-types/value-types-overview/)
  - [interfaces](https://www.palantir.com/docs/foundry/interfaces/interface-overview/)
- Actions and functions:
  - [action types](https://www.palantir.com/docs/foundry/action-types/overview/)
  - [submission criteria](https://www.palantir.com/docs/foundry/action-types/submission-criteria/)
  - [action permissions](https://www.palantir.com/docs/foundry/action-types/permissions/)
  - [action log](https://www.palantir.com/docs/foundry/action-types/action-log/)
  - [functions](https://www.palantir.com/docs/foundry/functions/overview/)
- Storage and edits:
  - [architecture](https://www.palantir.com/docs/foundry/object-backend/overview/)
  - [OSv1](https://www.palantir.com/docs/foundry/object-databases/object-storage-v1/)
  - [OSv2 breaking changes](https://www.palantir.com/docs/foundry/object-backend/object-storage-v2-breaking-changes/)
  - [indexing](https://www.palantir.com/docs/foundry/object-indexing/overview/)
  - [object edits](https://www.palantir.com/docs/foundry/object-edits/overview/)
  - [edit history](https://www.palantir.com/docs/foundry/object-edits/user-edit-history/)
  - [materializations](https://www.palantir.com/docs/foundry/object-edits/materializations/)
  - [OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/overview/)
  - [Ontology Manager](https://www.palantir.com/docs/foundry/ontology-manager/overview/)
- Tenancy and access control:
  - [orgs and spaces](https://www.palantir.com/docs/foundry/security/orgs-and-spaces/)
  - [ontologies](https://www.palantir.com/docs/foundry/ontologies/ontologies-overview/)
  - [cross-org collaboration](https://www.palantir.com/docs/foundry/security/cross-organization-collaboration/)
  - [projects and roles](https://www.palantir.com/docs/foundry/security/projects-and-roles/)
  - [ontology permissions](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions/)
  - [markings](https://www.palantir.com/docs/foundry/security/markings/)
  - [access control propagation](https://www.palantir.com/docs/foundry/security/access-control-propagation/)
  - [object security policies](https://www.palantir.com/docs/foundry/object-permissioning/object-security-policies/)
  - [restricted views](https://www.palantir.com/docs/foundry/security/restricted-views/)
- Change control and audit:
  - [Global Branching](https://www.palantir.com/docs/foundry/global-branching/overview/)
  - [ontology branching](https://www.palantir.com/docs/foundry/ontologies/branching-ontology/)
  - [proposals](https://www.palantir.com/docs/foundry/ontologies/review-ontology-proposals/)
  - [approvals](https://www.palantir.com/docs/foundry/approvals/overview/)
  - [checkpoints](https://www.palantir.com/docs/foundry/checkpoints/overview/)
  - [audit logs](https://www.palantir.com/docs/foundry/security/audit-logs-overview/)
  - [data lineage](https://www.palantir.com/docs/foundry/data-lineage/overview/)
- Usage and pricing units:
  - [usage types](https://www.palantir.com/docs/foundry/resource-management/usage-types/)
  - [AIP compute usage](https://www.palantir.com/docs/foundry/aip/aip-compute-usage/)
- AIP and agents:
  - [AIP overview](https://www.palantir.com/docs/foundry/aip/overview/)
  - [AIP security](https://www.palantir.com/docs/foundry/aip/aip-security/)
  - [LLM markings allowlist](https://www.palantir.com/docs/foundry/aip/control-llm-data-access-with-markings/)
  - [Agent Stack](https://www.palantir.com/docs/foundry/aip/agent-stack/)
  - [Agent Builder](https://www.palantir.com/docs/foundry/agent-builder/overview/)
  - [Agent Builder concepts](https://www.palantir.com/docs/foundry/agent-builder/core-concepts/)
  - [Agent Manager](https://www.palantir.com/docs/foundry/agent-manager/overview/)
  - [AIP Logic](https://www.palantir.com/docs/foundry/logic/overview/)
  - [staged writes](https://www.palantir.com/docs/foundry/logic/staged-writes/)
  - [Logic + Automate](https://www.palantir.com/docs/foundry/logic/aip-logic-integration-automate/)
  - [Automate](https://www.palantir.com/docs/foundry/automate/overview/)
  - [AIP Evals](https://www.palantir.com/docs/foundry/aip-evals/overview/)
  - [Evals and edits](https://www.palantir.com/docs/foundry/aip-evals/ontology-edits/)
  - [Ontology MCP](https://www.palantir.com/docs/foundry/ontology-mcp/overview/)
  - [OMCP tools](https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration/)
  - [Palantir MCP](https://www.palantir.com/docs/foundry/palantir-mcp/overview/)
- Apollo: [Apollo intro](https://www.palantir.com/docs/apollo/core/introduction/)

**Filings and company releases:**
- [FY2025 10-K (SEC)](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000011/pltr-20251231.htm)
- [FY2025 annual report](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000021/fy2025palantirars.pdf)
- [Q2 2026 release](https://investors.palantir.com/news-details/2026/Palantir-Reports)
- [AIP launch letter, Apr 7, 2023](https://www.palantir.com/newsroom/letters/our-new-platform/)

**Community and third party:**
- [Palantir community: Highbury edit log](https://community.palantir.com/t/highbury-edit-log/2220)
- [Wikipedia](https://en.wikipedia.org/wiki/Palantir_Technologies)
- [heise](https://www.heise.de/en/background/Missing-link-Power-center-Palantir-a-software-controls-organizations-10463503.html)
- [LaRochelle](https://eriklarochelle.ai/insights/palantir-snowflake-seam/)
- [Xinhe Liu](https://xinheliu.github.io/writing/palantir-ontology/)
- [Microsoft Fabric IQ ontology](https://learn.microsoft.com/en-us/fabric/iq/ontology/overview)
- [dbt semantic models](https://docs.getdbt.com/docs/build/semantic-models)
- [Cube](https://cube.dev/use-cases/semantic-layer)
- [AtScale](https://documentation.atscale.com/container/creating-and-sharing-cubes/creating-cubes/modeling-cube-measures)
- [Open Foundry](https://github.com/syzygyhack/open-foundry)

**Snippet only (not fetched or blocked):**
- [EconoTimes Q3 date](https://econotimes.com/Palantir-Sets-Nov-2-Q3-Report-Q2-Results-Set-Q3-Revenue-Guidance-at-2-160B-2-164B-1767070)
- [edgar.tools segments](https://app.edgar.tools/companies/PLTR/disclosures/segments)
- [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-a5m5xespbqyci)
- [Redress Compliance](https://redresscompliance.com/palantir-aip-foundry-negotiation)
- [Creative Differences](https://creativedifferences.substack.com/p/interested-in-ontologies-let-me-tell)
- [Salesforce Data 360](https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-object-model.html)
- [Palantir MCP tools](https://palantir.com/docs/foundry/palantir-mcp/available-tools/)
- [Fabric community blog](https://community.fabric.microsoft.com/blog/fbc_fabricupdatesblogs/fabric-iq-the-semantic-layer-powering-trusted-ai-agents-at-enterprise-scale/5190739)
- [Palantir Apollo blog](https://blog.palantir.com/palantir-apollo-powering-saas-where-no-saas-has-gone-before-7be3e565c379)
- Palantir blog posts on hallucinations and decisions (blocked)
