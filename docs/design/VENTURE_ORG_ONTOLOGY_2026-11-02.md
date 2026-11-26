<!-- Placement: tchjhnsn/Naive docs/design/VENTURE_ORG_ONTOLOGY_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# Venture vs organization: a sourced ontology for Naive

Prepared Nov 2, 2026 for Torian. Research only. Nothing in the repo has changed.

Question: today's 11 decisions used "venture" for the tenant. Torian says a venture is not an org. This note defines venture, organization and related terms from real sources, shows how the sources relate them, and proposes how Naive should use them.

Every definition below is quoted or closely paraphrased from the linked source. Where I add Naive's own reading, it is marked "Naive reading".

---

## 1. Sourced glossary

### Venture
- Merriam-Webster: "an undertaking involving chance, risk, or danger; especially a speculative business enterprise." ([FindLaw copy of Merriam-Webster](https://dictionary.findlaw.com/definition/venture.html), [MW Collegiate mirror](https://mwc.en-academic.com/91751/venture))
- Gartner (1985) describes new venture creation along four dimensions: "the individual(s) who start the venture, the organization which they create, the environment surrounding the new venture, and the process by which the new venture is started." The organization is something the venture *creates*. ([Academy of Management Review abstract](https://journals.aom.org/doi/10.5465/amr.1985.4279094))
- Shane and Venkataraman (2000) define entrepreneurship as the study of "how, by whom, and with what effects opportunities to create future goods and services are discovered, evaluated, and exploited," and they criticize defining an entrepreneur as "a person who establishes a new organization" because it ignores the opportunity. ([paper PDF](https://effectuation.org/hubfs/Journal%20Articles/2017/06/The-Promise-of-Entrepreneurship-as-a-field-of-research.pdf))
- Eisenmann (HBR, 2013), adopting Howard Stevenson: entrepreneurship is "the pursuit of opportunity beyond resources controlled." ([HBR](https://hbr.org/2013/01/what-is-entrepreneurship))
- Steve Blank: "a startup is an organization formed to search for a repeatable and scalable business model"; elsewhere "a temporary organization." ([steveblank.com, 2010](https://steveblank.com/2010/01/25/whats-a-startup-first-principles/))
- Eric Ries: "A startup is a human institution designed to create a new product or service under conditions of extreme uncertainty." ([Lean Startup summary](https://leanstartup.co/resources/articles/lean-startup-method/))
- W3C ORG lists "Venture" as an alternative name for `org:OrganizationalCollaboration`: "A collaboration between two or more Organizations such as a project... neither a formally recognized legal entity nor a sub-unit within some larger organization. Might typically have a shorter lifetime than the Organizations within it." ([W3C ORG 5.5.1](https://www.w3.org/TR/vocab-org/#org:OrganizationalCollaboration))
- Joint venture (law): "a combination of two or more parties that seek the development of a single enterprise or project for profit, sharing the risks associated with its development... there is no statutory definition." ([Cornell LII Wex](https://www.law.cornell.edu/wex/joint_venture))

Sources disagree: the dictionary, Shane and Venkataraman, Gartner and Eisenmann treat a venture as an undertaking or pursuit. Blank, Ries and W3C ORG treat a startup or venture as a kind of organization. See section 2.

**Proposed Naive definition:** A venture is an undertaking to discover, evaluate and exploit one opportunity under uncertainty, with a lifecycle (Naive's phases and gates). It is carried out by people acting for an organization. It is not itself the group of people.

### Organization
- W3C ORG `org:Organization`: "a collection of people organized together into a community or other social, commercial or political structure. The group has some common purpose or reason for existence which goes beyond the set of people belonging to it and can act as an Agent." ([W3C ORG 5.2.1](https://www.w3.org/TR/vocab-org/#org:Organization))
- W3C ORG `org:FormalOrganization`: an Organization "recognized in the world at large, in particular in legal jurisdictions, with associated rights and responsibilities. Examples include a corporation, charity, government or church." (same source, 5.2.2)
- schema.org `Organization`: "An organization such as a school, NGO, corporation, club, etc." Subtypes include Corporation and Project. ([schema.org/Organization](https://schema.org/Organization))
- gist `Organization`: "A structured entity formed to achieve specific goals, typically involving members with defined roles." ([gistCore.ttl](https://raw.githubusercontent.com/semanticarts/gist/refs/heads/develop/ontologies/gistCore.ttl))

**Proposed Naive definition:** An organization is a durable group of people with a shared purpose, recorded in Naive as the tenant. It may or may not be a legal entity.

### Business
- "A business involves a natural person or entity performing an activity or trade with the intent of making a profit." ([Cornell LII Wex: business](https://www.law.cornell.edu/wex/business))
- Blank: a business model "describes how your company creates, delivers and captures value." ([steveblank.com](https://steveblank.com/2010/01/25/whats-a-startup-first-principles/))

**Naive reading:** "business" is an activity (trade for profit), not a separate record. A venture becomes a business when it is operating a repeatable model rather than searching for one.

### Enterprise
The word has at least four meanings in the sources:
- Census Bureau: "An enterprise (or 'company') is a business organization consisting of one or more domestic establishments that were specified under common ownership or control." ([Census SUSB glossary](https://www.census.gov/programs-surveys/susb/about/glossary.html))
- US law (RICO): "'enterprise' includes any individual, partnership, corporation, association, or other legal entity, and any union or group of individuals associated in fact although not a legal entity." ([18 U.S.C. 1961(4), LII](https://www.law.cornell.edu/uscode/text/18/1961))
- An undertaking: schema.org defines Project as "An enterprise (potentially individual but typically collaborative), planned to achieve a particular aim." ([schema.org/Project](https://schema.org/Project)); Merriam-Webster's venture definition also uses it this way (above).
- SaaS tier above organizations: GitHub "An enterprise account is the central point of administration for your business on GitHub" ([GitHub Docs](https://docs.github.com/en/enterprise-cloud@latest/admin/overview/about-enterprise-accounts)); Slack "An Enterprise organization is a network of two or more Slack workspace instances." ([Slack developer docs](https://docs.slack.dev/enterprise/))

**Naive reading:** too overloaded to be a core noun. Reserve it, if ever needed, for a future admin tier above several organizations (the GitHub and Slack meaning).

### Company
- "A company is any form of business organization that engages in a business or commercial activity for profit. Commonly, companies are incorporated as separate legal entities from their owners... The most common forms... Corporations, Limited liability companies, Partnerships, Sole proprietorship." ([Cornell LII Wex: company](https://www.law.cornell.edu/wex/company))
- Census treats "company" and "enterprise" as the same thing (above).

**Naive reading:** a company is an organization classified as a for-profit business. A classification on an organization, not a separate record.

### Legal entity
- "An entity refers to a person or organization possessing separate and distinct legal rights... can, among other things, own property, engage in business, enter into contracts, pay taxes, sue and be sued... A legal entity corresponds to the notion of a legal person." ([Cornell LII Wex: entity](https://www.law.cornell.edu/wex/entity))
- "A legal person is a human or a non-human legal entity that is treated as a person for legal purposes." ([Wex: legal person](https://www.law.cornell.edu/wex/legal_person))
- FIBO LegalEntity, as summarized from the FIBO spec: a legal person that is a partnership, corporation or other organization able to negotiate contracts, assume financial obligations and pay debts, organized under the law of a jurisdiction; a subclass of LegalPerson and FormalOrganization. ([FIBO LegalEntity](https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/LegalEntity), summary via [search](https://bankontology.com/entity-definitions-list-report/)). I could not extract the exact FIBO sentence from the page, so treat this as a paraphrase.
- GLEIF: an LEI "enables anyone... to access clear, unique identification data about a legal entity... Every LEI is unique and can represent only one entity." ([GLEIF](https://www.gleif.org/en/about-lei/introducing-the-legal-entity-identifier-lei))

**Naive reading:** a legal entity is a registration in a jurisdiction (EIN, LEI, state filing). It is linked to an organization; it is not the organization record itself, and many organizations never have one.

### Team
- GitHub: "Teams are groups of organization members that reflect your company or group's structure with cascading access permissions and mentions." ([GitHub Docs](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams))
- Linear: "A workspace is composed of one or several teams. Teams typically represent groups of people who work together frequently." ([Linear Docs: Teams](https://linear.app/docs/teams))
- W3C ORG `org:OrganizationalUnit`: "a department or support unit which is part of some larger Organization and only has full recognition within the context of that Organization... not... a legal entity in its own right." ([W3C ORG 5.2.3](https://www.w3.org/TR/vocab-org/#org:OrganizationalUnit))

**Naive reading:** a team is a group inside an organization. A standalone team (no parent) is just an organization.

### Project
- PMI: "A project is a temporary endeavor undertaken to create a unique product, service, or result." ([PMI](https://www.pmi.org/about/what-is-a-project))
- Linear: "A project is a grouping of issues that have a clear outcome or planned completion date... They can be shared across multiple teams." ([Linear Docs: Projects](https://linear.app/docs/projects))
- gist: "A task, usually of longer duration, made up of other tasks." ([gistCore.ttl](https://raw.githubusercontent.com/semanticarts/gist/refs/heads/develop/ontologies/gistCore.ttl))
- schema.org makes Project a subtype of Organization (above), a modeling choice the other sources do not share.

**Naive reading:** a project has a known deliverable and an end date. A venture has an uncertain outcome and, if it succeeds, does not end but becomes an operating business. A venture contains projects.

### Product
- schema.org: "Any offered product or service. For example: a pair of shoes; a concert ticket; the rental of a car; a haircut." ([schema.org/Product](https://schema.org/Product))
- Ries frames the startup's job as creating "a new product or service" (above).

**Naive reading:** a product is what a venture offers. One venture may have several products; a product is not a venture.

### Portfolio
- PMI: a portfolio is "projects, programs, subsidiary portfolios, and operations managed as a group to achieve strategic objectives." ([PMI Standard for Portfolio Management, 4th ed. preview](https://api.pageplace.de/preview/DT0400.9781628253986_A31969866/preview-9781628253986_A31969866.pdf))

**Naive reading:** the set of ventures one organization runs or backs (a studio, an accelerator, a founder with several ideas).

### Workspace
- Linear: "A workspace is the home for all data in an organization." ([Linear Docs: Workspaces](https://linear.app/docs/workspaces))
- Slack: "Each Slack workspace has its own ID, directory of members, channels, conversations, and files." ([Slack developer docs](https://docs.slack.dev/enterprise/))
- Notion distinguishes personal and team workspaces; in personal workspaces "newly created pages will be private by default." ([Notion Help](https://www.notion.com/help/intro-to-workspaces))
- Clerk names Slack workspaces, Linear teams and Vercel projects as examples of what its Organizations model. ([Clerk Docs](https://clerk.com/docs/guides/organizations/overview))

**Naive reading:** in most SaaS, "workspace" is a tenant. Naive decided it is only a person's view. That is a valid choice, but it differs from common usage (see question 9).

### Tenant
- AWS: "A tenant is the most fundamental construct of a SaaS environment... Any customer that you sign up to use your SaaS environment is one of the tenants... Each one of these companies would be viewed as a tenant." ([AWS SaaS Lens: Tenant](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant.html))
- Tenant isolation: "each tenant is prevented from accessing another tenant's resources." ([AWS SaaS Lens: Tenant isolation](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html))
- WorkOS: "If you are modeling a multi-tenant SaaS app, an organization will usually represent one of your customers." ([WorkOS blog](https://workos.com/blog/model-your-b2b-saas-with-organizations))
- Auth0: "Each organization will usually map directly to one of your business customers or partners, but users can be members of multiple organizations." ([Auth0 Docs](https://auth0.com/docs/manage-users/organizations/organizations-overview))

**Naive reading:** tenant is a technical term for the isolation boundary. In Naive, tenant = organization.

### Account
- GitHub: "Every person who uses GitHub signs in to a user account. Your user account is your identity on GitHub and has a username and profile." Organization accounts "are shared accounts... However, you cannot sign in to an organization." ([GitHub Docs: Types of accounts](https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts))
- Stripe uses "account" for a business: an organization "acts as a container structure to view and manage the operation of its separate businesses," each of which is an account. ([Stripe Docs](https://docs.stripe.com/get-started/account/orgs/setup))

**Naive reading:** "account" is ambiguous across products. Naive's decision (only a person holds one) matches GitHub's user account. Say "user account" to be unambiguous.

### Member and membership
- W3C ORG `org:Membership`: "Represents an n-ary relationship between an Agent, an Organization and a Role," and can carry `memberDuring` (an interval). ([W3C ORG 5.3.4](https://www.w3.org/TR/vocab-org/#org:Membership))
- W3C ORG `org:memberOf`: an agent "(person or other organization) is a member of the Organization." Organizations can be members of organizations. (same source, 5.3.1)
- Clerk: "Users can belong to multiple Organizations, and Clerk provides the Organization context (memberships, Roles, and the Active Organization) in each session." ([Clerk Docs](https://clerk.com/docs/guides/organizations/overview))

### Role
- W3C ORG `org:Role`: "a role that a Person or other Agent can take in an organization. Instances of this class describe the abstract role; to denote a specific instance of a person playing that role in a specific organization use an instance of org:Membership." ([W3C ORG 5.3.5](https://www.w3.org/TR/vocab-org/#org:Role))
- W3C ORG says it "does not provide category structures for... roles" and expects domain profiles to add them, which matches Naive's "framework base roles plus organization roles." ([W3C ORG section 1](https://www.w3.org/TR/vocab-org/))
- Clerk: "Organizations let you group users with Roles and Permissions." ([Clerk Docs](https://clerk.com/docs/guides/organizations/overview))

---

## 2. How the sources relate these things

1. **Person, account, organization are separate.** GitHub: a person always signs into a personal account, and organizations are joined, never signed into. W3C ORG: Agent, Organization and Role meet only in a Membership record. ([GitHub](https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts), [W3C ORG](https://www.w3.org/TR/vocab-org/))
2. **Organization and legal entity are separate.** W3C ORG makes FormalOrganization (legally recognized) a subclass of Organization, so every legal entity's organization is an organization but not every organization is a legal entity. RICO and Wex both cover groups "associated in fact although not a legal entity." ([W3C ORG](https://www.w3.org/TR/vocab-org/), [18 USC 1961](https://www.law.cornell.edu/uscode/text/18/1961))
3. **A venture comes before the organization it creates.** Gartner frames the organization as an output of new venture creation. Shane and Venkataraman put the opportunity, not the organization, at the center. ([Gartner](https://journals.aom.org/doi/10.5465/amr.1985.4279094), [Shane and Venkataraman](https://effectuation.org/hubfs/Journal%20Articles/2017/06/The-Promise-of-Entrepreneurship-as-a-field-of-research.pdf))
4. **But the startup literature calls the venture an organization.** Blank's "temporary organization" and Ries's "human institution" describe the group doing the search. W3C ORG and schema.org also model a venture or project as a kind of organization. This is the main disagreement. Naive can honor both by separating the undertaking (venture) from the group carrying it (organization), and linking them.
5. **Ventures can span organizations.** A joint venture is by definition two or more parties pursuing one enterprise. W3C ORG's OrganizationalCollaboration ("alternative names: Project, Venture") has organizations as members. ([Wex](https://www.law.cornell.edu/wex/joint_venture), [W3C ORG 5.5.1](https://www.w3.org/TR/vocab-org/#org:OrganizationalCollaboration))
6. **Organizations nest and group.** Teams sit inside organizations (GitHub, Linear, W3C OrganizationalUnit). Enterprise tiers sit above organizations (GitHub enterprise account, Slack Enterprise organization, Stripe Organizations over separate businesses). The Census "enterprise" groups establishments under common control.
7. **The tenant is almost always the organization.** AWS, WorkOS, Auth0 and Clerk all map one customer organization to one tenant, with users in many organizations.
8. **Personal space is usually a one-person organization.** Vercel converted personal accounts into a "Hobby team" named "{username}s-projects" ([Vercel changelog](https://vercel.com/changelog/2024-01-account-changes)). GitHub lets a user account own repositories directly ([GitHub](https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts)). Notion has personal workspaces next to team ones ([Notion](https://www.notion.com/help/intro-to-workspaces)).
9. **Work moves between tenants by transfer.** Vercel's project transfer moves deployments, env vars and domains to another team ([Vercel transferring projects](https://vercel.com/docs/projects/transferring-projects)).

---

## 3. Proposed Naive model

### Nouns
| Noun | Kind | Notes |
|---|---|---|
| Person | identity | A human. |
| User account | record | One per person. Sign-in identity. |
| Organization | record, **the tenant** | Durable group with a purpose. Kinds: personal (one member, auto-created) or shared. Optional link to a legal entity. |
| Legal entity | record linked to an organization | Jurisdiction, form (LLC, C corp...), identifiers (EIN, LEI). Optional, added when the founders incorporate. |
| Membership | record | Person + organization + roles + interval (W3C ORG shape). |
| Role | record | Framework base roles, plus roles an organization defines. |
| Team | record inside an organization | Optional sub-group for granting access. |
| Venture | record inside one organization | The undertaking. Has phase, gates, Discovery records, products, linked repos. |
| Project | record inside a venture | Bounded work with a deliverable and end date. |
| Product | record inside a venture | What the venture offers. |
| Portfolio | a view or record on an organization | The ventures that organization runs or backs. |
| Workspace | view only | A person's view across the organizations they belong to. |
| Business, company, enterprise | classifications | Labels on an organization or venture state, not records. |

### Today's 11 decisions, restated
| # | As decided (with "venture") | Proposed wording | Change |
|---|---|---|---|
| 1 | Only a person holds an account; companies and teams are ventures | Only a person holds an account; companies and teams are **organizations** | rename |
| 2 | A person joins a venture through a membership holding roles | A person joins an **organization** through a membership holding roles. Access to a specific venture is a grant within that organization (role on the venture or via a team) | rename + clarify |
| 3 | Each venture is its own tenant | Each **organization** is its own tenant. Ventures are isolated from other organizations by their organization | rename |
| 4 | Framework base roles; each venture adds its own | Framework base roles; each **organization** adds its own; roles can be granted organization-wide or on one venture | rename + scope |
| 5 | Each account gets a personal venture, sole member | Each account gets a **personal organization**, sole member. Ideas and puzzle answers live in ventures inside it | rename |
| 6 | Person shares specific items; other venture gets a readable reference | Person shares specific items; the receiving **organization** (or one venture in it) gets a readable reference, not a copy | rename |
| 7 | Revoke ends access; recorded judgments stay | Unchanged. The judgments belong to the receiving organization | none |
| 8 | Workspace is a view, not a boundary | Unchanged | none |
| 9 | Agent gets access through a role in the venture, for a named person, with declared reads | Agent gets access through a role in the **organization**, usually scoped to one venture, acting for a named person, with declared reads | rename + scope |
| 10 | One database, every row scoped by venture id | One database, every row scoped by **organization id** (the tenant key). Venture-level rows also carry venture id | rekey |
| 11 | Code in GitHub, linked and synced as metadata; knowledge base in our DB; agents use worktree branches and gated PRs | Unchanged, except repos link to a **venture**, and the organization may link to a GitHub organization | clarify |

The four earlier puzzle decisions read the same with one change: "answers belong to the founder's own venture record" becomes "answers belong to a venture in the founder's personal organization." Naive's own organization keeps only a reference plus its judgments.

### Open structural points, with alternatives
**Can a venture exist before any shared organization or legal entity?** Yes in all options. It lives in the creator's personal organization (Vercel Hobby team pattern). No legal entity is needed (Gartner, RICO "associated in fact"). When co-founders join or the company forms, the venture is **transferred** to a shared organization (Vercel transfer pattern), and the legal entity is linked to that organization later.

**Can one venture span organizations?**
- A. One home organization; others participate through shared references (decision 6) and guest memberships in the home organization (like GitHub outside collaborators). Keeps tenant isolation simple. **Recommended.**
- B. A real joint venture forms a new shared organization whose members include the partner organizations (W3C OrganizationalCollaboration, schema.org/W3C allow organizations as members). Use when partners co-own the venture.
- C. A venture belongs to several tenants at once. Breaks "one tenant key per row." Not recommended.

**Is a venture a kind of organization?**
- A. No. A venture is an undertaking owned by one organization (dictionary, Shane and Venkataraman, Gartner, PMI). **Recommended**, and matches Torian's statement.
- B. Yes, a subtype (Blank, Ries, schema.org Project, W3C collaboration). Simpler data model but it is exactly the conflation Torian flagged, and a studio with ten ventures would need ten tenants.

**When does a venture get its own organization?** When it gains members beyond its creator or a legal entity. A studio may keep many early ventures in one organization (portfolio) and spin each out by transfer later.

---

## 4. Questions for Torian, in order (one per card)

1. **Is a venture an undertaking owned by an organization, rather than a kind of organization?** Recommended: yes. It matches your statement, the dictionary and entrepreneurship research, and lets one organization run many ventures.
2. **Rename the tenant from "venture" to "organization" in today's decisions?** Recommended: yes. AWS, WorkOS, Auth0, Clerk and GitHub all use organization for the tenant, so outside developers and tools will read it correctly.
3. **Does every venture belong to exactly one home organization?** Recommended: yes. One tenant key per row keeps isolation provable; other organizations take part through references and guest memberships.
4. **Is a legal entity a separate, optional record linked to an organization?** Recommended: yes. Most early ventures have no entity, and W3C ORG and the law both treat legal recognition as a property some organizations have.
5. **Rename "personal venture" to "personal organization," holding the person's early ventures?** Recommended: yes. It is the Vercel Hobby team pattern, and the puzzle answers then sit in a venture inside it.
6. **Move a venture between organizations by transfer?** Recommended: yes, transfer (not copy), so its history, gates and judgments move with it, like a Vercel project transfer.
7. **How should a true joint venture work?** Recommended: form a new shared organization whose members include the partner organizations; use guest access for lighter collaboration.
8. **Are memberships at the organization level, with roles grantable on one venture?** Recommended: yes. This is the GitHub organization plus repo permission model and supports agents scoped to one venture.
9. **Keep "workspace" as only a person's view, even though Linear and Slack use it for the tenant?** Recommended: keep it, and never use "workspace" as a stored noun, so the term cannot drift back into meaning tenant.
10. **Treat business, company and enterprise as classifications, not records, and reserve "enterprise" for a possible tier above organizations?** Recommended: yes. "Enterprise" has four conflicting meanings in the sources.
11. **Is a team a sub-group inside an organization, and a project a bounded piece of work inside a venture?** Recommended: yes, matching GitHub, Linear and W3C OrganizationalUnit for teams and PMI for projects.

## Source list
- W3C Organization Ontology: https://www.w3.org/TR/vocab-org/
- schema.org Organization: https://schema.org/Organization ; Project: https://schema.org/Project ; Product: https://schema.org/Product
- gist core ontology: https://raw.githubusercontent.com/semanticarts/gist/refs/heads/develop/ontologies/gistCore.ttl
- FIBO LegalEntity: https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalPersons/LegalEntity
- GLEIF LEI: https://www.gleif.org/en/about-lei/introducing-the-legal-entity-identifier-lei
- Cornell LII Wex: business https://www.law.cornell.edu/wex/business ; company https://www.law.cornell.edu/wex/company ; entity https://www.law.cornell.edu/wex/entity ; legal person https://www.law.cornell.edu/wex/legal_person ; joint venture https://www.law.cornell.edu/wex/joint_venture
- 18 U.S.C. 1961: https://www.law.cornell.edu/uscode/text/18/1961
- Census SUSB glossary: https://www.census.gov/programs-surveys/susb/about/glossary.html
- Merriam-Webster venture (via FindLaw): https://dictionary.findlaw.com/definition/venture.html
- Gartner 1985: https://journals.aom.org/doi/10.5465/amr.1985.4279094
- Shane and Venkataraman 2000: https://effectuation.org/hubfs/Journal%20Articles/2017/06/The-Promise-of-Entrepreneurship-as-a-field-of-research.pdf
- Eisenmann 2013: https://hbr.org/2013/01/what-is-entrepreneurship
- Steve Blank 2010: https://steveblank.com/2010/01/25/whats-a-startup-first-principles/
- Eric Ries (Lean Startup summary): https://leanstartup.co/resources/articles/lean-startup-method/
- PMI project: https://www.pmi.org/about/what-is-a-project ; PMI portfolio standard preview: https://api.pageplace.de/preview/DT0400.9781628253986_A31969866/preview-9781628253986_A31969866.pdf
- GitHub accounts: https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts ; organizations: https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/about-organizations ; teams: https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams ; enterprise: https://docs.github.com/en/enterprise-cloud@latest/admin/overview/about-enterprise-accounts
- Slack Enterprise organizations: https://docs.slack.dev/enterprise/
- Linear workspaces: https://linear.app/docs/workspaces ; teams: https://linear.app/docs/teams ; projects: https://linear.app/docs/projects
- Notion workspaces: https://www.notion.com/help/intro-to-workspaces
- Stripe Organizations: https://docs.stripe.com/get-started/account/orgs/setup
- Clerk Organizations: https://clerk.com/docs/guides/organizations/overview
- WorkOS organizations: https://workos.com/blog/model-your-b2b-saas-with-organizations
- Auth0 Organizations: https://auth0.com/docs/manage-users/organizations/organizations-overview
- AWS SaaS Lens tenant: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant.html ; isolation: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html
- Vercel Hobby team change: https://vercel.com/changelog/2024-01-account-changes ; project transfer: https://vercel.com/docs/projects/transferring-projects
