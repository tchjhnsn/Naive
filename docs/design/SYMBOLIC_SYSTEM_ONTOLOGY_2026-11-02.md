<!-- Placement: tchjhnsn/Naive docs/design/SYMBOLIC_SYSTEM_ONTOLOGY_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# Naive as a symbolic system: analogs, ontology, capabilities

Prepared Nov 2, 2026 for Torian. Research only. Nothing in the repo has changed.
Builds on `docs/design/VENTURE_ORG_ONTOLOGY_2026-11-02.md`. Every outside claim links its source. Lines marked "Naive reading" are my interpretation, not a source's words.

Torian's framing: Naive is less a place where organizations build, and more a symbolic system that stores their knowledge base and agent configuration, and maybe other things.

---

## 1. What it is akin to, ranked

### 1. A governed knowledge graph of sourced statements (Wikibase, nanopublications, Palantir Ontology). Closest analog.
- Wikibase (the software behind Wikidata) stores items whose statements each consist of a claim (property and value), "Qualifiers (additional property-value pairs)", "References (each consisting of one or more property-value pairs)" and a "Rank". Ranks decide which statements a query returns: "if preferred statements exist, these statements are returned in response to a query." ([Wikibase data model primer](https://www.mediawiki.org/wiki/Wikibase/DataModel/Primer))
- Nanopublications package one claim with its provenance: "A nanopublication consists of an assertion, the provenance of the assertion... and the provenance of the whole nanopublication (called 'publication info')." They are meant to carry "hypotheses, claims, negative results, and opinions." ([Nanopublication guidelines](https://nanopub.net/guidelines/working_draft/))
- Palantir: "The Palantir Ontology is an operational layer for the organization... In many settings, the Ontology serves as a digital twin of the organization, containing both the semantic elements (objects, properties, links) and kinetic elements (actions, functions, dynamic security)." ([Palantir Ontology overview](https://www.palantir.com/docs/foundry/ontology/overview/)) "An object type defines an entity or event in an organization... A link type defines the relationship between two object types. An action type defines how an object type can be modified." ([Palantir core concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts/))
- Commercial semantic layers make the same pitch for agents. Stardog: its "ontology-driven approach captures your organization's logic in a reusable semantic layer, so every model, application, and agent can reason from the same trusted context." ([Stardog](https://www.stardog.com/)). TopBraid EDG is positioned for ontology and taxonomy governance with SHACL validation ([TopQuadrant EDG](https://www.topquadrant.com/topbraid-edg/); comparison in [OvalEdge](https://www.ovaledge.com/blog/ontology-management-tools)).
- Neo4j: "A knowledge graph is a design pattern for storing, organizing, and accessing interrelated data entities, including their semantic relationships." ([Neo4j](https://neo4j.com/use-cases/knowledge-graph/))

**Where Naive differs:** Naive also *judges* knowledge (Jev scores, Torian's accepts) and uses those judgments to move ventures through gates. Wikibase ranks and nanopublication provenance come close but have no lifecycle gates.

### 2. A system of record, under systems of engagement (Geoffrey Moore)
- Moore's 2011 AIIM paper contrasts systems of record ("financial transactions to human resources to order processing...") with systems of engagement, which, as AIIM's summary puts it, "overlay and complement the organization's deep investments in systems of record." ([Moore, AIIM white paper PDF](https://info.aiim.org/hs-fs/file-2314261840-pdf/Inbound_Assets/Systems-of-Engagement.pdf); [AIIM summary](https://info.aiim.org/aiim-blog/newaiimo/2011/01/19/new-geoffrey-moore-white-paper-on-future-of-enterprise-it))
- A system of record is "the authoritative data source for a given data element or piece of information." ([Wikipedia: System of record](https://en.wikipedia.org/wiki/System_of_record))

**Naive reading:** Naive is the system of record for an organization's knowledge, decisions and agent setup. Chats, IDEs, Slack and agent runtimes are the systems of engagement that read from it and write back to it.

### 3. A registry of configuration items for agents (CMDB, Backstage, MLflow, A2A Agent Cards)
- CMDB: "an ITIL term for a database used by an organization to store information about hardware and software assets (commonly referred to as configuration items)... also stores information regarding the relationships among its assets." ([Wikipedia: CMDB](https://en.wikipedia.org/wiki/Configuration_management_database)). ITIL defines a configuration item as "Any component that needs to be managed in order to deliver an IT service" (quoted in [TalTech thesis](https://digikogu.taltech.ee/et/Download/d7147b0a-027e-42f2-a11c-0dd03e6a9efd)).
- Backstage: "a centralized system that keeps track of ownership and metadata for all the software in your ecosystem," with metadata YAML stored with the code as source of truth. ([Backstage docs](https://backstage.io/docs/features/software-catalog/))
- MLflow Model Registry: "a centralized model store... It provides lineage..., versioning, aliasing, metadata tagging and annotation support." ([MLflow](https://mlflow.org/docs/latest/ml/model-registry/)) MLflow Prompt Registry: "Prompt versions in MLflow are immutable," with aliasing for rollbacks. ([MLflow Prompt Registry](https://mlflow.org/docs/latest/genai/prompt-registry/))
- A2A Agent Card: "A JSON metadata document published by an A2A Server, describing its identity, capabilities, skills, service endpoint, and authentication requirements." Cards can be found through "Registries/Catalogs." ([A2A specification](https://raw.githubusercontent.com/a2aproject/A2A/main/docs/specification.md))

**Where Naive differs:** these registries track software or models. Naive's agents act *for a named person through a role* with declared reads, which none of them model.

### 4. An immutable, time-aware fact store (Datomic, event sourcing, Dolt, TerminusDB)
- Datomic: "A datom is an immutable atomic fact that represents the addition or retraction of a relation between an entity, an attribute, a value, and a transaction." It is "indelible and chronological... 'removing' occurs not by taking something away, but by adding a retraction," and supports as-of views. ([Datomic data model](https://docs.datomic.com/whatis/data-model.html))
- Event sourcing "ensures that all changes to application state are stored as a sequence of events... we can also use the event log to reconstruct past states." ([Fowler](https://martinfowler.com/eaaDev/EventSourcing.html))
- Dolt "is a SQL database you can fork, clone, branch, merge, push and pull just like a Git repository." ([Dolt docs](https://docs.dolthub.com/introduction/what-is-dolt)) TerminusDB "is a knowledge graph database with built-in version control... tracks every change as an immutable commit, and supports branching, merging, and time travel queries." ([TerminusDB docs](https://terminusdb.org/docs/))

### 5. A policy decision point (OPA, OpenFGA/Zanzibar)
- "OPA decouples policy decision-making from policy enforcement. When your software needs to make policy decisions it queries OPA and supplies structured data (e.g., JSON) as input." ([OPA docs](https://www.openpolicyagent.org/docs))
- OpenFGA, "Inspired by Google's Zanzibar," relies on relationship-based access control. ([OpenFGA](https://openfga.dev/docs/fga))

**Naive reading:** declared reads and gate rules are policies. Gates "read facts, not text" is exactly a policy evaluated over structured input.

### 6. A context layer for AI (MCP servers, Glean)
- MCP servers expose three primitives: "Prompts: Pre-defined templates or instructions that guide language model interactions", "Resources: Structured data or content that provides additional context to the model", "Tools: Executable functions that allow models to perform actions or retrieve information." ([MCP spec, server overview](https://modelcontextprotocol.io/specification/2025-06-18/server))
- Glean's model: "Permission mirroring: Mirror source-system permissions so users never see data they shouldn't" and "Traceability: Make every sensitive operation auditable." AI answers are generated "only from content the querying user is authorized to access." ([Glean security principles](https://docs.glean.com/security/security-principles)). Its knowledge graph "identifies high value entities such as projects, people, customers, and products." ([Glean](https://www.glean.com/product/knowledge-graph))

**Where Naive differs:** Glean indexes other systems. Naive is meant to be the source itself, then served out over MCP.

### 7. Weaker analogs
- **Enterprise architecture repositories (ArchiMate):** "a common language for describing the construction and operation of business processes, organizational structures, information flows, IT systems, and technical infrastructure." ([The Open Group](https://www.opengroup.org/archimate-forum/archimate-overview)). Models structure, not claims or judgments.
- **Knowledge management theory (Nonaka SECI):** explains "how tacit and explicit knowledge are converted into organizational knowledge" through Socialization, Externalization, Combination, Internalization. ([Wikipedia: SECI](https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions)). Naive reading: Naive mostly does Externalization (the puzzle turns tacit founder knowledge into records) and Combination (linking and judging records); agents help with Internalization by feeding it back.
- **Decision records (Nygard ADRs):** title, status, context, decision, consequences; a later ADR can mark an earlier one "deprecated" or "superseded with a reference to its replacement." ([Nygard 2011](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions))

### One-line answer
Naive reading: Naive is closest to **a governed knowledge graph that is the system of record for an organization's knowledge and agent configuration, served to agents as a context layer.** Think Wikibase-style sourced statements, plus an MLflow/A2A-style agent registry, plus OPA-style policies, on a Datomic-style append-only history, exposed through MCP.

---

## 2. Proposed top-level ontology

Standards to align with, not adopt wholesale:
- W3C ORG for organizations, membership and roles ([W3C ORG](https://www.w3.org/TR/vocab-org/)).
- PROV-O for provenance: "Provenance is information about entities, activities, and people involved in producing a piece of data or thing" ([PROV overview](https://www.w3.org/TR/prov-overview/)); "An activity is something that occurs over a period of time and acts upon or with entities"; "An agent is something that bears some form of responsibility for an activity" ([PROV-O](https://www.w3.org/TR/prov-o/)).
- SKOS for vocabularies: "a common data model for sharing and linking knowledge organization systems... thesauri, taxonomies, classification schemes" ([SKOS](https://www.w3.org/TR/skos-reference/)).
- SHACL for validation: "a language for validating RDF graphs against a set of conditions" ([SHACL](https://www.w3.org/TR/shacl/)).
- RDF as the export shape: "sets of subject-predicate-object triples" ([RDF 1.1](https://www.w3.org/TR/rdf11-concepts/)).

### Core classes (Naive reading, with alignment)

**Parties**
- `Person` (foaf:Person, prov:Agent). `UserAccount` (one per person).
- `Organization` (org:Organization). The tenant. `LegalEntity` links to it (org:FormalOrganization).
- `Membership` (org:Membership): person, organization, roles, interval.
- `Role` (org:Role): framework base roles plus organization roles.
- `Agent` (prov:SoftwareAgent): a non-human actor registered in an organization.

**Agent configuration**
- `AgentConfiguration`: an immutable, versioned bundle for one agent (instructions, model choice, capabilities, declared reads, role). Aliases such as `current` point at versions (MLflow precedent).
- `Capability`: something an agent can do (A2A skill, MCP tool).
- `ReadDeclaration`: the record types and fields an agent or function may read.

**Undertakings**
- `Venture`: an undertaking owned by one organization.
- `Phase` (skos:Concept in a framework scheme, such as Discovery).
- `Gate`: a rule set that decides a phase transition. `GateEvaluation`: one run of a gate, with its result.

**Knowledge**
- `KnowledgeItem` (prov:Entity): the abstract parent.
- `Statement`: one assertion about a subject, with qualifiers and status (Wikibase claim, nanopublication assertion). "Claim" is a status of a Statement, not a separate class.
- `Source`: where a statement came from, whether external document, interview, puzzle answer or GitHub artifact.
- `Evidence`: a link saying a source supports or contradicts a statement.
- `Judgment`: an assessment of a statement or venture by a named agent using a named method (Jev score, Torian's accept). It is a statement about a statement.
- `Decision`: an ADR-shaped record (context, decision, status, consequences, supersedes).
- `Concept` (skos:Concept): controlled vocabulary terms, framework plus organization extensions.

**Provenance and history**
- `Activity` (prov:Activity): every write is one.
- `Transaction`: the atomic commit that groups the facts one activity asserted or retracted (Datomic precedent).

**Links and governance**
- `ArtifactLink`: pointer plus synced metadata for a GitHub repo, PR, check or file. No code stored.
- `Policy`: a rule evaluated at read or write time (declared reads, gate rules, retention).
- `Share`: a revocable grant giving another organization read access to specific items by reference.
- `Consent`: a person's permission for a specific use of their items (for example Jev scoring of puzzle answers).

### Core relations
- Person `hasMembership` Membership `in` Organization `withRole` Role. (org:member, org:organization, org:role)
- Organization `owns` Venture. Venture `inPhase` Phase. Gate `guards` Phase transition. GateEvaluation `evaluated` Gate `over` Statements and Judgments (facts only).
- Agent `configuredBy` AgentConfiguration `declares` ReadDeclaration, `grants` Capability, `actsAs` Role.
- Activity `wasAssociatedWith` Agent, which `actedOnBehalfOf` Person. (PROV-O)
- KnowledgeItem `wasGeneratedBy` Activity, `wasAttributedTo` Agent or Person, `wasDerivedFrom` Source. (PROV-O)
- Statement `about` Venture or Organization or Concept. Evidence `supports` or `contradicts` Statement. Judgment `assesses` Statement.
- Decision `supersedes` Decision. Statement `retractedBy` Transaction.
- Share `grants` Organization read `of` KnowledgeItem. Consent `permits` Use `of` KnowledgeItem.
- Every record `scopedTo` exactly one Organization.

---

## 3. Ideal capabilities, grouped, with precedent

**Storage and versioning**
- Append-only facts with retraction instead of delete or overwrite. ([Datomic](https://docs.datomic.com/whatis/data-model.html), [event sourcing](https://martinfowler.com/eaaDev/EventSourcing.html))
- Immutable versions with movable aliases for agent configurations and prompts. ([MLflow Prompt Registry](https://mlflow.org/docs/latest/genai/prompt-registry/))
- Optional branch and merge for proposed changes. ([Dolt](https://docs.dolthub.com/introduction/what-is-dolt), [TerminusDB](https://terminusdb.org/docs/))

**Provenance**
- Every write records who, on whose behalf, by what activity, from what source. ([PROV-O](https://www.w3.org/TR/prov-o/))
- Provenance travels with the item when shared or exported. ([Nanopublications](https://nanopub.net/guidelines/working_draft/))

**Temporal queries**
- "As of" reads: what was known, and what a gate saw, at a past transaction. ([Datomic as-of](https://docs.datomic.com/whatis/data-model.html), [TerminusDB time travel](https://terminusdb.org/docs/))

**Access, declared reads and policy**
- Tenant isolation by organization. ([AWS SaaS Lens](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html))
- Relationship-based grants for shares and roles. ([OpenFGA](https://openfga.dev/docs/fga))
- Policy decisions separated from enforcement, so declared reads and gates are data, not scattered code. ([OPA](https://www.openpolicyagent.org/docs))
- Permission-aware retrieval for AI answers. ([Glean](https://docs.glean.com/security/security-principles))

**Querying and retrieval**
- Structured queries over typed entities and links. ([Palantir core concepts](https://www.palantir.com/docs/foundry/ontology/core-concepts/))
- Ranked statements so the preferred value wins by default. ([Wikibase ranks](https://www.mediawiki.org/wiki/Wikibase/DataModel/Primer))
- Text and semantic search for agents, always behind the access check. ([Glean](https://docs.glean.com/security/security-principles))

**Reasoning and validation**
- Shape validation on every write, for example that a Statement must have a Source and an Activity. ([SHACL](https://www.w3.org/TR/shacl/))
- Controlled vocabularies with broader and narrower terms. ([SKOS](https://www.w3.org/TR/skos-reference/))
- Gate rules evaluated over facts. ([OPA](https://www.openpolicyagent.org/docs))

**Agent configuration management**
- Registry of agents with identity, capabilities and skills, discoverable by other agents. ([A2A Agent Card](https://raw.githubusercontent.com/a2aproject/A2A/main/docs/specification.md))
- Lineage from configuration version to the outputs it produced. ([MLflow Model Registry](https://mlflow.org/docs/latest/ml/model-registry/))

**Interoperability**
- An MCP server exposing knowledge as Resources, saved instructions as Prompts, and writes as Tools. ([MCP spec](https://modelcontextprotocol.io/specification/2025-06-18/server))
- Agent Cards for agent-to-agent discovery. ([A2A](https://raw.githubusercontent.com/a2aproject/A2A/main/docs/specification.md))
- A REST API for non-AI clients.

**Import and export**
- Export to RDF or JSON-LD with W3C ORG, PROV-O and SKOS terms so knowledge is portable. ([RDF 1.1](https://www.w3.org/TR/rdf11-concepts/))
- Import from external sources as Source plus extracted Statements, with links back instead of full copies. (Naive reading, consistent with code-stays-in-GitHub. [Backstage](https://backstage.io/docs/features/software-catalog/) keeps metadata with its source in Git as a precedent.)

**Audit**
- Every sensitive read and write is traceable. ([Glean traceability](https://docs.glean.com/security/security-principles))
- Decisions keep their history through supersession, not edits. ([Nygard ADRs](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions))

---

## 4. Gaps Torian should define, in order (one per card)

1. **Is Naive the system of record for knowledge and agent configuration, while chats, IDEs and agent runtimes are systems of engagement?** Recommended: yes. It matches his framing and Moore's split, and it settles that Naive does not run the work itself.
2. **Is the atomic unit a sourced statement rather than a document?** Recommended: statements, with documents kept as Sources. Gates read facts, and Wikibase and nanopublications show provenance attaches cleanly at the statement level.
3. **Is history append-only, with retractions instead of edits or deletes?** Recommended: yes. It gives as-of reads and audit for free (Datomic). The exception is legal deletion of personal data, which needs a separate redaction path.
4. **What is in an agent configuration?** Recommended: instructions, model choice, capabilities, declared reads, role and owner, stored as immutable versions with aliases (MLflow). Reason: an agent's behavior must be reproducible from one version id.
5. **Does Naive run agents, or only store and serve their configuration?** Recommended: only store and serve. Runtimes such as Cursor, Claude or the AI Gateway pull configuration and context. That is what makes it a symbolic system rather than a build platform.
6. **Is MCP the primary interface, with REST beside it?** Recommended: yes. MCP's resources, prompts and tools map directly onto knowledge, saved instructions and writes.
7. **Are policies (declared reads, gate rules, retention) stored as data and evaluated by one engine?** Recommended: yes, OPA-style. Reason: the same rules then apply to every agent and surface and can be audited.
8. **Is a Judgment its own class, separate from Statements?** Recommended: yes. Judgments have an assessor and method, gates depend on them, and the earlier decision keeps them after a share is revoked.
9. **Internal model: relational in Postgres with an exported RDF view, or a native graph store?** Recommended: Postgres with typed tables and JSON-LD/RDF export. It keeps the one-database decision while still being standards-portable.
10. **Does each organization get its own controlled vocabulary on top of the framework's?** Recommended: yes, SKOS concept schemes, mirroring the base-roles-plus-org-roles decision.
11. **Do external sources get copied in, or referenced with extracted statements?** Recommended: referenced, with statements and links, like code staying in GitHub. Copies widen the privacy and retention surface.
12. **What else is "maybe some other stuff"?** Recommended starting set: decisions (ADRs), policies and metrics as facts. Leave out task tracking, chat history and code, which belong to systems of engagement and GitHub.
13. **Is branch and merge needed now?** Recommended: not yet. Use draft and accepted statuses on statements and configurations, and add Dolt-style branching only if review flows demand it.

---

## Source list
- Wikibase data model primer: https://www.mediawiki.org/wiki/Wikibase/DataModel/Primer
- Nanopublication guidelines: https://nanopub.net/guidelines/working_draft/
- Palantir Ontology: https://www.palantir.com/docs/foundry/ontology/overview/ ; core concepts: https://www.palantir.com/docs/foundry/ontology/core-concepts/
- Stardog: https://www.stardog.com/ ; TopBraid EDG: https://www.topquadrant.com/topbraid-edg/ ; OvalEdge comparison: https://www.ovaledge.com/blog/ontology-management-tools
- Neo4j knowledge graph: https://neo4j.com/use-cases/knowledge-graph/
- Geoffrey Moore, Systems of Engagement (AIIM): https://info.aiim.org/hs-fs/file-2314261840-pdf/Inbound_Assets/Systems-of-Engagement.pdf ; AIIM summary: https://info.aiim.org/aiim-blog/newaiimo/2011/01/19/new-geoffrey-moore-white-paper-on-future-of-enterprise-it
- System of record: https://en.wikipedia.org/wiki/System_of_record
- CMDB: https://en.wikipedia.org/wiki/Configuration_management_database ; ITIL CI definition quoted in: https://digikogu.taltech.ee/et/Download/d7147b0a-027e-42f2-a11c-0dd03e6a9efd
- Backstage software catalog: https://backstage.io/docs/features/software-catalog/
- MLflow Model Registry: https://mlflow.org/docs/latest/ml/model-registry/ ; Prompt Registry: https://mlflow.org/docs/latest/genai/prompt-registry/
- A2A specification: https://raw.githubusercontent.com/a2aproject/A2A/main/docs/specification.md
- Datomic data model: https://docs.datomic.com/whatis/data-model.html
- Fowler, Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- Dolt: https://docs.dolthub.com/introduction/what-is-dolt ; TerminusDB: https://terminusdb.org/docs/
- OPA: https://www.openpolicyagent.org/docs ; OpenFGA: https://openfga.dev/docs/fga
- MCP server spec: https://modelcontextprotocol.io/specification/2025-06-18/server
- Glean security principles: https://docs.glean.com/security/security-principles ; Glean knowledge graph: https://www.glean.com/product/knowledge-graph
- ArchiMate: https://www.opengroup.org/archimate-forum/archimate-overview
- SECI model: https://en.wikipedia.org/wiki/SECI_model_of_knowledge_dimensions
- Nygard ADRs: https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- W3C ORG: https://www.w3.org/TR/vocab-org/ ; PROV overview: https://www.w3.org/TR/prov-overview/ ; PROV-O: https://www.w3.org/TR/prov-o/ ; SKOS: https://www.w3.org/TR/skos-reference/ ; SHACL: https://www.w3.org/TR/shacl/ ; RDF 1.1: https://www.w3.org/TR/rdf11-concepts/
- AWS SaaS Lens tenant isolation: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html
