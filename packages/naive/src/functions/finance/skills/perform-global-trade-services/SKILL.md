---
type: knowledge
tags: [naive, skills, finance, apqc-9-11]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: perform-global-trade-services
process_group: "9.11"
description: >
  Everything the venture must know before value crosses a border, for the
  finance agent: screening the parties it deals with, export and import
  controls, tariff classification and origin, conversion cost, duty and landed
  cost, the documents, the preferences, reclaims and letters of credit. Load it
  for the ten workflows of APQC 9.11 and whenever the founder asks "can we sell
  to this country", "what duty will this cost" or "what do I need to ship this".
---

# perform-global-trade-services

You find the rules that apply, assemble the facts and the documents, calculate the cost, and say plainly what the evidence cannot support. The founder, with a licensed customs broker or counsel, confirms every classification, files every declaration, claims every preference, instructs every bank and answers every authority. Nothing here is legal advice. You never file, never claim, never release a shipment and never contact an authority or a screened party.

Party screening and conversion cost apply to any venture that takes money from abroad. The rest exists only once physical goods or controlled technology move, so most steps are ones to consider.

## The processes

### 9.11.1 Screen sanctioned party list

Runs `workflows/9-11-1-screen-sanctioned-party-list.json`.

This applies whether the venture ships anything or not: a software sale, a payment and an investment all count. Name the lists that apply from the countries the venture is established in, sells into and pays from, then screen every customer, supplier, payee and investor, and record the list, its version and the date for each check so the screening can be proved later. Keep the negative results, not only the hits. On a possible match, stop and hand it over: clearing a near match wrongly is far worse than holding a good transaction for a day. Good evidence is a dated screening record naming the list version. The trap is screening once at onboarding; the lists change, and a party that was clear last year may not be.

### 9.11.2 Control exports and imports

Runs `workflows/9-11-2-control-exports-and-imports.json`.

Controls attach to software and technical data as well as to goods, which catches ventures that think they ship nothing. Establish for each item what the control is and which authority sets it, then map where it may go, to whom and for what use, naming the licence or exemption each permitted route relies on. Check destination, end use and party before anything moves, because a release cannot be recalled. Good evidence is a control determination citing the authority's own classification. The trap is assuming a control is a property of the product; it is a rule about destination, end use and party.

### 9.11.3 Classify products

Runs `workflows/9-11-3-classify-products.json`.

Classification drives duty, licences and preferences, so it comes before all three. Work from the facts, what the thing is made of, what it does and how it is packed, and propose a code with the reasoning and the published source. Mark it a proposal until a broker or the founder confirms it, and record who confirmed it and when. Review it when the product, its materials or the tariff schedule changes. Good evidence is a classification whose reasoning cites the schedule's own wording. The trap is copying a code from a supplier's invoice, which was chosen for their country and their product.

### 9.11.4 Perform currency conversion

Runs `workflows/9-11-4-perform-currency-conversion.json`.

Build the effective rate from the statement, the amount sent against the amount received, rather than from the rate that was quoted. Compare it with the published mid-market rate for the same day and with the other routes available, and record the whole cost in `finance/spend/[id]` as its own line. Over a year this is often one of the larger costs nobody has a line for. Good evidence is an effective rate computed from two statement figures. The trap is comparing providers on their advertised fee while ignoring the spread.

Moving to another provider or account is the founder's decision.

### 9.11.5 Calculate duty

Runs `workflows/9-11-5-calculate-duty.json`.

Calculate before the shipment moves, not when it is held. Assemble the basis first, classification, customs value, origin, delivery term, freight and insurance, and name the document each figure came from; the value duty is charged on is usually more than the purchase price. Record the rate and where it was published, show the working, and then push the duty into the landed cost so margin is calculated on what the product really costs. Good evidence is a calculation anyone can repeat from the published tariff. The trap is pricing from the purchase price and discovering the margin at the border.

### 9.11.6 Communicate with customs

Runs `workflows/9-11-6-communicate-with-customs.json`.

A declaration is a statement to a government, and every field in it must come from a document. Assemble it, list the fields nothing supports, and hand it over: in most places only the importer of record or a licensed broker may file. For a query, hold or audit, assemble the facts, the documents and a dated timeline, and say what cannot be produced. Good evidence is a declaration pack with its gaps listed rather than filled. The trap is answering a query from recollection; the first reply frames everything after it.

The founder or the broker files, signs and replies. Always.

### 9.11.7 Document trade

Runs `workflows/9-11-7-document-trade.json`.

The work is agreement, not collection: the description, quantity, value, origin and parties must match across the commercial invoice, the packing list, the transport document, the origin statement, the licence and the insurance certificate. A disagreement between two documents is the commonest reason goods are held or a payment refused. Retain the full set with the date it must be kept until in each country involved, because an audit arrives years later. Good evidence is a checked set with the disagreements listed before the goods moved. The trap is treating the invoice as the only document that has to be right.

### 9.11.8 Process trade preferences

Runs `workflows/9-11-8-process-trade-preferences.json`.

Find the agreements that cover the venture's routes, write down each one's origin rule and the evidence it requires, then test the product against the rule from the bill of materials and the suppliers' own origin statements. Say which of proves, suggests or cannot support applies, and recommend declining a claim the evidence only suggests. Good evidence is a supplier's own origin statement held on file. The trap is claiming a preference because the goods shipped from a country in the agreement; origin is about where value was added, not where a container was loaded.

Only the founder or their broker claims a preference.

### 9.11.9 Handle restitution

Runs `workflows/9-11-9-handle-restitution.json`.

Overpaid duty is reclaimable only inside a window nobody is reminded of, so review the period's customs payments against the shipments and the returns and list every ground with its deadline. Assemble the original declaration, the payment and the proof of what happened next, and say what cannot be produced. Record what was recovered against the account once the statement shows it. Good evidence is a claim with a ground, a deadline and the original declaration attached. The trap is chasing a small reclaim whose paperwork costs more than the duty.

### 9.11.10 Prepare letter of credit

Runs `workflows/9-11-10-prepare-letter-of-credit.json`.

A letter of credit pays against documents, so its wording is what matters and not the shipment's quality. List every document, date, quantity and form of words it requires, name who in the venture can produce each exactly as worded and by the date required, and name every term it could not meet so an amendment can be asked for before anything is agreed. Good evidence is a term-by-term table of what the venture can and cannot produce. The trap is accepting a term that sounds reasonable and finding at presentation that a single word does not match.

The founder agrees the terms and instructs the bank; the agent never opens or amends a credit.

## Records

Read: `product/[id]`, `customers/[id]`, `deals/[id]`, `supply-chain/suppliers`, `supply-chain/purchase-orders`, `investors`, `money/[id]`, `finance/spend/[id]`, `finance/budget/[id]`, `purpose/money/summary`, `legal/obligations`, `legal/risks`, `markets`, `industries`, `people/team`.

Write: `finance/spend/[id]` for conversion cost, duty and landed cost, `money/[id]` for a balance or a recovery the statement proves, `decisions/[id]` to put a classification, a licence, a claim or a credit term in front of the founder, and `operations/handoff/[id]` for the screening records, the control determinations, the classifications, the duty workings, the document sets and the credit reviews.

Not built: Naive has no record for a screening result, an export control determination, a tariff classification, a shipment, a customs declaration, a duty calculation, a preference claim, a reclaim or a letter of credit. All of them live on the handoff as evidence, with the money consequences in `finance/spend/[id]` and `money/[id]`, and a continuing obligation such as a retention period or a licence condition belongs in `legal/obligations`, which the legal side owns.

## Standards

- The Harmonized System of the World Customs Organization gives the tariff classification its first six digits, which countries extend further in their own schedules. A code is confirmed against the destination country's schedule, not another country's.
- Incoterms, published by the International Chamber of Commerce, are the standard delivery terms, and which one applies decides who pays freight, insurance and duty and where risk passes.
- Customs value is usually built on the transaction value under the World Trade Organization's valuation agreement, with freight and insurance treated according to the destination's rules, which is why the basis is assembled before any rate is applied.
- Rules of origin in a free trade agreement decide whether a preferential rate may be claimed, and they turn on where value was added rather than where goods shipped from.
- Restricted-party screening is done against each authority's own published list, such as the Office of Foreign Assets Control's Specially Designated Nationals and Blocked Persons list in the United States, the European Union's consolidated list and the United Kingdom's consolidated list of financial sanctions targets. Which apply follows from where the venture is established, sells and pays.
- In the United States most commercial exports fall under the Export Administration Regulations, and defence articles under the International Traffic in Arms Regulations. Whether an item is controlled is a determination the founder makes with counsel or a broker.
- Documentary credits follow the International Chamber of Commerce's Uniform Customs and Practice for Documentary Credits, UCP 600, under which a bank pays against documents that comply exactly.

## What the person decides

- Which restricted-party lists apply, and whether a possible match is cleared, with counsel.
- Whether an item is controlled, and whether to seek a licence for a destination or an end use.
- Every tariff classification and country of origin, confirmed by them or a customs broker.
- Which provider or route the venture converts and transfers money through.
- Whether a shipment goes ahead once duty, freight and fees are in the landed cost.
- Every customs filing, query reply, preference claim and reclaim.
- Whether to settle by letter of credit, on what terms, and every instruction to the bank.
