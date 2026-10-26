---
type: methodology-amendment
ai-model: claude
source: hybrid
amendment-number: 2026-05-20
amendment-name: SAD for Service Businesses
status: RATIFIED
proposed-by: The owner + Claude
proposed-during: 2026-05-20 first customer consultancy session
ratified-on: 2026-05-20T23:00:00Z
ratified-by: The owner
ratification-rationale: Survived first customer engagement. The spec-stack abstraction (SERVICE_SPEC / OPERATIONS_SPEC / CLIENT_MODEL_SPEC / CUSTOMER_EXPERIENCE_SPEC / QUALITY_SPEC) felt natural in application; the providers → vendors rename held; the shipped-definition values for service businesses (first-paying-client, first-month-profitable, first-hire, first-physical-presence, legal-formation-complete) accurately described where the first customer sits.
created: 2026-05-20T...
last-updated: 2026-05-20T23:00:00Z
tags: [methodology, sad, amendment, service-business, abstraction, anything-factory, ratified]
related-ideas:
  - "[[idea-187]]"
---

# SAD Amendment 2026-05-20 — SAD for Service Businesses

## Background

SAD v3 accumulated software-shaped microstructure as it matured against software entities (several software products and plugins). The macrostructure (pillars, lifecycle stages, entity classes, sessions, initiatives, cycles, BASED, SMART) is general-purpose. The microstructure — particularly the Phase 1B spec stack — is software-shaped.

The first non-software consultancy customer (a pet-sitting service) forced the surfacing of this gap. The methodology's "anything factory" promise requires the spec stack to abstract from software into the operational substrate of *any* business.

## The amendment

Replace the software-shaped Phase 1B specs with abstracted versions that retain the same *function* while fitting the actual business domain.

### Spec stack abstraction map

| Software-shaped name | Abstracted name | Function | Service-business example |
|---|---|---|---|
| `PRODUCT_SPEC.md` | `SERVICE_SPEC.md` | What the entity offers | The service catalog: Drop-in / Overnight / Constant Care, with Bronze/Silver/Gold tiers and pricing |
| `DATA_MODEL_SPEC.md` | `CLIENT_MODEL_SPEC.md` | What data the entity captures and operates on | A pet-sitting service tracks: clients, pets (allergies, meds, vet info), bookings, visits, sitters, schedules, payments |
| `IMPL_SPEC.md` | `OPERATIONS_SPEC.md` | How the entity executes day-to-day | Its SOPs: intake flow, booking flow, visit flow, payment flow, sitter onboarding, emergency protocols |
| `BEHAVIORAL_SPEC.md` | `CUSTOMER_EXPERIENCE_SPEC.md` | How the entity presents and behaves to its audience | Its tone, touchpoints, communication cadence, photo updates during visits, welcome rituals, follow-up |
| `VERIFICATION_SPEC.md` | `QUALITY_SPEC.md` | What defines correct/successful execution | Its KPIs per service: visit-completed-on-time, photo-update-delivered, no incidents, client-NPS, repeat-booking-rate |

### Phase 2 abstraction

| Software-shaped | Abstracted | Meaning |
|---|---|---|
| Phase 2: Implementation (write code) | Phase 2: Operation (run the business) | The doing-it phase. For software: ship code. For services: serve clients. |

### Shipped-definition values

The `shipped-definition` field in entity-profile frontmatter, originally proposed in SAD v3.0.6 (PROPOSED 2026-05-17), gets new values for service businesses:

| Original software values | New service-business values |
|---|---|
| `public-deployment` | `first-paying-client` |
| `first-useful-run` | `first-month-profitable` |
| `first-ci-cd-loop` | `first-hire` |
| | `first-physical-presence` (if applicable) |
| | `legal-formation-complete` (LLC + EIN + license + insurance bound) |

### Providers → Vendors

The `providers:` frontmatter field becomes `vendors:` for service businesses. Both refer to *external service dependencies the entity relies on*. For software: GitHub Actions, Cloudflare, Figma. For a pet-sitting service: a design tool, an accounting tool, an outside accountant, a candle supplier, an insurance carrier, a scheduling tool, etc.

### Code-pointer → Document-pointer

The `code-pointer` pattern (a markdown note pointing to a code repo at `<repos>/<name>/`) generalizes to `document-pointer` for service businesses. A document-pointer note references an authoritative document that lives outside the vault — LLC formation papers in a physical drawer, insurance policy PDF in Google Drive, contracts in DocuSign, etc.

```yaml
---
type: document-pointer
document-name: "Example LLC Formation Papers"
document-location: "Physical filing cabinet — main office"
document-format: paper
last-verified: 2026-05-20
authoritative: true
---
```

### Pillars (no change)

Three pillars hold. For service businesses:
- **Product** is named "Product / Service" — for a pet-sitting service, the service offerings
- **Brand** is unchanged
- **Business** is unchanged

### Lifecycle stages (no change)

Seven stages hold for any entity type. Service businesses pass through them differently (no `prototyping` stage in the software-prototype sense — but `prototyping` becomes "running a pilot with a few clients"), but the stages themselves are unchanged.

### BASED + SMART (no change)

Both apply unchanged. BASED is even more naturally applied at the human level for service businesses (a service owner can have a clearly BASED ambition). SMART scopes any version of any entity.

### What does NOT get abstracted (because it doesn't apply)

| Concept | Status for service business |
|---|---|
| Version categorization (baseline/mainline/frontier/future/legacy) | Generally overweight for a service business; use only if there are explicitly versioned offerings. A pet-sitting service has package tiers but not platform-version semantics. |
| Pre-ship / post-ship boundary | Less stark for services — first-paying-client is the transition. |
| HITL detection skill (idea-185) | Service businesses have HITL constantly (human owner makes decisions); the methodology layer doesn't need to flag it specifically. |
| Code-pointer | Replaced by document-pointer as above. |

## Compatibility with software entities

This amendment does not invalidate any existing software-entity application of SAD. The original spec names remain valid for software entities; the abstracted names are *alternative* names for service-business entities. An entity declares its spec naming via the `spec-naming-convention` frontmatter field on the entity-profile:

```yaml
spec-naming-convention: software   # PRODUCT_SPEC / DATA_MODEL_SPEC / IMPL_SPEC / etc.
# OR
spec-naming-convention: service    # SERVICE_SPEC / CLIENT_MODEL_SPEC / OPERATIONS_SPEC / etc.
```

The plugin (a command-center project) reads this field to determine which spec names to look for in `<entity>/product/spec/`.

## Templates

Both naming conventions get template files in `_meta/templates/`. The function of each spec is identical; only the name and the examples differ.

## Status

**PROPOSED 2026-05-20.** Ratification pending the owner's review after first application (2026-05-20).

This is the first methodology amendment driven by external customer work rather than internal methodology evolution. That's significant — the methodology is leaving the lab and meeting the world.

## Related

- Idea 187 (`_ideas/idea-187-methodology-as-a-service-and-anything-factory.md`) — the anything-factory thread that anticipated this work
