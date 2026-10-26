---
type: methodology-amendment
spec-layer: methodology
version: 3.0.15
source: hybrid
ai-model: composer-2.5
created: 2026-10-25
authorship: hybrid
authors: [Torian, Composer]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[DOMAIN_AND_SYSTEMS_DESIGN_METHOD]]"
authority: constitutional
decision-status: in-force
status: APPLIED
change-class: 1
governed-by:
  - "[[SAD_SKILL_v3]]"
  - "[[DOMAIN_AND_SYSTEMS_DESIGN_METHOD]]"
sections-affected:
  - "DOMAIN_AND_SYSTEMS_DESIGN_METHOD §4a — placement across file systems"
  - "design-documents.registry.json — schema note points at §4a; document count in the method corrected to 56 documents and 237 questions"
tags: [methodology, sad-v3, amendment, design-schema, file-placement, domain-design, systems-design]
description: "Records where the five design layers live. Registry IDs are questions, not folders. Domain, product, experience, and interface stay in the vault. Systems design for the phase being built stays in the code repo, with a vault pointer. One index on each side maps IDs to files."
---

# SAD v3.0.15: the design schema across file systems

## Why

The registry lists 56 documents. The files that answer them were never given a place. A reader of the wiki could not tell that domain and product sit in the vault, experience and interface sit in a design folder named with the IDs, and systems design sits in the code repo, several IDs to a file. The method's opening count (34 documents, 140 questions) was also behind registry v1.2.0.

## The rule

Applied in [[DOMAIN_AND_SYSTEMS_DESIGN_METHOD]] §4a.

Registry IDs are not directories. Each scope keeps one set of files on two file systems, and an index maps each ID to the file that answers it.

| Layer | File system | Path |
|---|---|---|
| Domain DD-01–DD-12 | Vault | `<entity>/product/spec/` |
| Product PA-01–PA-03 | Vault | `<entity>/product/spec/` |
| Experience XD-01–XD-10 and interface UI-01–UI-08 | Vault | `<entity>/product/design/<scope>/` |
| Systems SD-01–SD-23 | Code repo | `<repo>/docs/design/` and `<repo>/docs/adrs/` |

A variation inside the domain, including a level of government, stays in DD-08. It does not get a second tree. The reference layout is Polity OS, named in §4a.
