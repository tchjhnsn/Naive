---
type: knowledge
tags: [everything-ecosystem, skills, hardware-product]
ai-model: claude
created: 2026-05-15
source: hybrid
name: hardware-product
description: >
  Provide context for hardware product work — Tier 2 deliverables for hardware
  products (consumer device, industrial / B2B equipment, peripheral, IoT device).
  Different shape than software / content / service: bill-of-materials +
  manufacturing plan + supplier qualification + certification dominate.
  Hardware product methodology is more nascent in SAD than software; this skill
  scaffolds the known shape. Auto-loads when a project's product-type is
  hardware. Per SAD v3.3+ amendment §33.
  MANDATORY TRIGGERS: hardware product, physical product, device, IoT,
  consumer hardware, industrial hardware, peripheral, BOM, manufacturing,
  supplier, certification, unboxing, field service, warranty.
---

# Hardware Product Skill

The Tier 2 deliverable context for hardware products.

## What this skill provides

Hardware products are products whose canonical artifact is physical. Different from software (digital + infinite-distribution), content (digital + serial-production), and service (human delivery). Hardware adds: physical manufacturing, supply chain, certification, distribution logistics, returns + repairs.

The methodology variant for hardware is less developed than for software (SAD was authored from software). This skill captures the known shape; the variant will mature as more hardware projects accumulate.

### Tier 2 deliverables for hardware products

- **Industrial design specs** — form, materials, finishes
- **Mechanical / engineering specs** — load-bearing structures, tolerances, environmental ratings
- **Electrical / electronics specs** (if applicable) — schematic, PCB, firmware boundary
- **Firmware spec** (if applicable) — sits at the hardware / software boundary; SAD's software spec stack applies
- **Bill of Materials (BOM)** — every component, supplier, cost, lead time
- **Manufacturing plan** — assembly steps, quality control, capacity ramp
- **Supplier qualification** — vetted suppliers for each BOM line; backups
- **Certification roadmap** — FCC, CE, UL, FDA, etc. depending on category + geography
- **Tooling investment** — molds, jigs, fixtures
- **Packaging design** + materials
- **Unboxing + setup experience** (overlap with Brand on first-touch)
- **Field service / warranty model** — how returns, repairs, replacements work
- **End-of-life policy** — sustainability, recycling, take-back
- **Inventory + logistics plan** — warehousing, fulfillment, distribution channels
- **Regulatory compliance** (overlap with Business / Legal)
- **Cost model** — landed cost, channel margins, retail pricing
- **Documentation** — user manual, quick-start guide, online support content

### Type-specific specializations

#### Consumer hardware

- **Retail presence** — packaging that sells off-shelf
- **Returns rate planning** — consumer hardware has higher returns; design for it
- **Customer support volume planning**
- **Influencer / reviewer outreach** — getting unboxing videos
- **Accessory ecosystem** strategy

#### Industrial / B2B hardware

- **Compliance certifications** specific to industry (medical, aerospace, automotive)
- **Field installation requirements**
- **Service contracts + SLAs**
- **Spare parts strategy**
- **Long product lifecycle support** (10+ year availability)

#### Peripheral / accessory

- **Compatibility matrix** — which host devices, which OS versions
- **Driver development** + maintenance commitment
- **Cross-platform considerations**

#### IoT device

- **Connectivity model** — WiFi, BLE, cellular, LoRa
- **Cloud / app integration** (the software companion is its own product under Product pillar)
- **Security + firmware update infrastructure**
- **Data privacy + telemetry policy** (overlap with Brand + Legal)
- **Battery life / power management**

## What this skill emphasizes

When loaded, the AI should keep in mind:

1. **Hardware decisions are sticky in a way software decisions aren't.** Changing a BOM line mid-production costs orders of magnitude more than changing a function signature. Articulation rigor matters even more here.

2. **Certification timelines drive the schedule.** FCC, CE, UL etc. have multi-month timelines and can re-trigger on design changes. Plan certification as a milestone, not a checkbox.

3. **Supplier relationships are long-cycle.** Qualifying a supplier takes months; switching suppliers is risky. Make supplier choices deliberately; have backups.

4. **The unboxing is the first product experience.** Brand-pillar overlap. Underweight this and the rest of the product experience starts at a deficit.

5. **Returns + repairs are deliverables, not afterthoughts.** Design for serviceability. Plan field service. Hardware that can't be repaired is hardware that becomes e-waste — a brand + business risk.

6. **The companion software (if any) follows software-product Tier 2.** Don't try to treat firmware or companion apps as part of the hardware Tier 2. They're software products that compose with the hardware.

## What's similar to software products

- Audience definition
- Brand voice (especially in packaging, documentation, unboxing)
- Roadmap discipline (per-version foreshadowing — hardware versions are very visible to customers)
- Articulation closure (with hardware-specific verification deliverables)

## What's different

- Bill-of-materials replaces data-model-spec as the load-bearing deliverable
- Manufacturing plan replaces deploy workflow
- Certification roadmap is a hard gate
- Supplier qualification is a relationship-management deliverable
- Inventory / logistics replace deploy-and-scale
- Cost model is more constrained (physical goods have hard margins)

## Backfill / missing assets

Follow [[../_patterns/gate-backfill|gate-backfill]]. Skill-specific notes:

1. **Detect** — certification, supplier, BOM, serviceability docs vs spend already made.
2. **Triage** — cert and safety-critical BOM = blocker before next tooling/fab;
   packaging/unboxing may queue.
3. **Order** — cert roadmap + BOM before cosmetic Tier 2; companion software uses
   software-product + contract-first backfill separately.
4. **Freeze** — no irreversible manufacturing commitment while cert path unknown.
5. **Exit** — named cert path, BOM revision, supplier primary/backup recorded.

## Relationship to other skills

- [[../product-pillar/SKILL|product-pillar]] — auto-loads alongside
- [[../template-generation/SKILL|template-generation]] — generates hardware-product Tier 2 stubs
- [[../articulation-closure/SKILL|articulation-closure]] — hardware articulation closure is harder + more important than software (irreversibility cost)
- [[../foreshadowing-audit/SKILL|foreshadowing-audit]] — hardware versions are visible (v1 vs v2 model numbers); foreshadowing-audit applies

## Methodology maturity

Hardware product methodology in SAD is less developed than software:

- Software has the full spec stack pattern (VISION → VERIFICATION)
- Hardware has a known deliverable inventory but no equivalent spec-stack pattern yet
- Future methodology work: author a hardware-specific spec stack (perhaps ID-SPEC, MECH-SPEC, ELEC-SPEC, BOM-SPEC, MANUFACTURING-SPEC) parallel to software's stack

This skill describes the *current* state; the methodology family roadmap names hardware variants as a future direction.

## Status

- **2026-05-14:** Initial authoring. Hardware variant is less developed than software; this skill captures known shape; spec-stack equivalent queued for future methodology work.
