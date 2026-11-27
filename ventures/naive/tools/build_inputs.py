#!/usr/bin/env python3
"""Write the input JSON for every venture:naive record this run proposes, plus write-plan.tsv.
Every factual claim cites a URL (checked 2026-11-26) or a Naive repo path at SHA. Proposals are marked as proposals.
Unknowns are null or omitted. Run: python3 tools/build_inputs.py runs/<run-id>"""
import json, sys, os
RUN = sys.argv[1]; INP = os.path.join(RUN, "inputs"); os.makedirs(INP, exist_ok=True)
SHA = "134d2d35063b8b232389b0fb254d152ae40639a1"; D = "2026-11-26"; V = "naive"
def gh(p): return f"https://github.com/tchjhnsn/Naive/blob/{SHA}/{p}"
def ev(i, kind, summary, url, audience="unknown", spec="specific", title=None, supports=True, **kw):
    e = {"id": i, "kind": kind, "summary": summary, "source": {"url": url, "checked": D}, "audience": audience, "specificity": spec, "collected": D}
    if title: e["source"]["title"] = title
    if not supports: e["supports"] = False
    e.update(kw); return e
plan = []
def put(route, name, obj, why):
    p = os.path.join(INP, name + ".json"); json.dump(obj, open(p, "w"), indent=2, ensure_ascii=False); plan.append((route, "inputs/" + name + ".json", why))

# ---------- sources (raw/sources) ----------
SOURCES = [
 ("sba-faq-2026", "https://advocacy.sba.gov/2026/02/03/advocacy-releases-frequently-asked-questions-about-small-businesses-2026/", "SBA Office of Advocacy, Frequently Asked Questions About Small Business 2026", False),
 ("cnbc-solo-2026", "https://www.cnbc.com/2026/11/07/americas-new-no-employee-small-business-owners-start-hot-in-ai-era.html", "CNBC, America's newest small business owners with no employees (2026-11-07)", False),
 ("census-bfs", "https://www.census.gov/econ/bfs/current/index.html", "Census Business Formation Statistics", False),
 ("host0-pricing-2026", "https://host0.ai/blog/ai-pricing-2026", "host0, AI pricing in 2026: census of 71 AI apps' pricing pages", False),
 ("credyt-hybrid", "https://credyt.ai/blog/tokens-vs-credits-vs-hybrid-pricing", "Credyt, Tokens vs credits vs hybrid", False),
 ("claude-pricing", "https://claude.com/pricing", "Anthropic, Claude plans and pricing", True),
 ("claude-code-plans", "https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-max-or-ultra-plan", "Anthropic Help, Claude Code with Pro, Max or Ultra", True),
 ("epoch-price-of-thought", "https://epoch.ai/publications/the-plunging-price-of-thought", "Epoch AI, The plunging price of thought", False),
 ("epoch-price-trends", "https://epoch.ai/data-insights/llm-inference-price-trends", "Epoch AI, LLM inference prices have fallen rapidly but unequally", False),
 ("strategyzer-test-card", "https://www.strategyzer.com/library/validate-your-ideas-with-the-test-card", "Strategyzer, Test Card", False),
 ("strategyzer-validated", "https://www.strategyzer.com/library/business-testing-is-your-hypothesis-really-validated", "Strategyzer, Is your hypothesis really validated?", False),
 ("blank-custdev", "https://steveblank.com/2009/09/17/", "Steve Blank, The Customer Development Model (2009-09-17)", False),
 ("nngroup-homepage", "https://www.nngroup.com/articles/homepage-design-principles/", "NN/g, Homepage Design: 5 Fundamental Principles", False),
 ("nngroup-show-price", "https://www.nngroup.com/articles/show-price/", "NN/g, Pricing information gives B2B sites a competitive advantage", False),
 ("a16z-context", "https://a16z.com/context-is-king/", "a16z, Context is King (2025-08-18)", False),
 ("fc-services-as-software", "https://foundationcapital.com/ideas/the-4-6t-services-as-software-opportunity-lessons-from-the-first-year", "Foundation Capital, The $4.6T Services-as-Software opportunity", False),
 ("finray-agent-payments", "https://finray.tech/intelligence/agent-payment-protocols-tracker/", "Finray, Agent payment protocols tracker (AP2, x402, ACP)", False),
 ("usenaive-tc", "https://techcrunch.com/2026/08/06/naive-raises-28-5m-to-automate-the-grunt-work-of-setting-up-and-running-a-company/", "TechCrunch, Naive raises $28.5M (2026-08-06)", False),
 ("usenaive-pricing-archive", "https://web.archive.org/web/20261110181531/https://usenaive.ai/pricing", "usenaive.ai pricing, Internet Archive capture 2026-11-10", True),
 ("usenaive-yc", "https://www.ycombinator.com/companies/naive", "Y Combinator company page: Naive (usenaive.ai)", True),
 ("npm-usenaive-cli", "https://registry.npmjs.org/@usenaive-sdk/cli", "npm registry: @usenaive-sdk/cli", False),
 ("npm-naive-framework", "https://registry.npmjs.org/naive-framework", "npm registry: naive-framework", False),
 ("naive-dev", "https://naive.dev", "nAIVE Engine (naive.dev), an AI-native game engine", True),
 ("polsia", "https://polsia.com/", "Polsia home page", True),
 ("spacex-careers", "https://www.spacex.com/Careers", "SpaceX careers", True),
 ("mentura-sign-in", "https://mentura.xyz/sign-in", "Mentura sign-in and account creation page", True),
 ("datafield-co", "https://datafield.co/", "Datafield (datafield.co) home page", True),
 ("datafield-usa", "https://datafieldusa.com/", "DataField Technology Services home page", True),
 ("datafield-intel", "https://www.datafieldintelligence.com/", "Datafield Intelligence home page", True),
 ("naive-repo", f"https://github.com/tchjhnsn/Naive/tree/{SHA}", "tchjhnsn/Naive at main HEAD", True),
]
for sid, url, title, selfrep in SOURCES:
    put("raw/sources/[id]", f"source-{sid}", {"id": sid, "origin": "web", "title": title, "fetched": D, "url": url, "self_reported": selfrep}, "research source cited by this run's records")
SRC = {s[0]: s[1] for s in SOURCES}

# ---------- foundation ----------
put("foundation/core", "foundation-core", {
  "promise": "Naive helps solo founders and small teams navigate the venture development lifecycle.",
  "competence": "A venture kept as plain records, with the decision that needs a person put first. Agents propose, and people decide.",
  "tagline": "If you have an idea, you are a founder."
}, "ethos and mission: Torian's words per site/content/marketing/about.mdx (comment: 'The ethos and the mission are Torian's words'); competence restates site/content/marketing/index.mdx features (agent draft)")

put("foundation/problem", "foundation-problem", {
  "venture": V, "updated": D,
  "statement": "Starting a venture is easy now; choosing what to do next is where ideas stall, and a solo founder's knowledge is scattered across tools that agents cannot read as one picture.",
  "segment": "Solo founders and small founding teams, including people who do not yet call themselves founders",
  "why_now": "AI tools let one person run work that used to need a team, and solo business formation in AI-exposed industries is rising (desk research; not yet confirmed by Naive's own interviews).",
  "forms": [
    {"id": "what-next", "statement": "The founder does not know which decision matters most today.", "status": "open"},
    {"id": "scattered-context", "statement": "The venture's facts sit in separate tools, so agents work without the whole picture.", "status": "open"},
    {"id": "no-record-of-why", "statement": "Decisions are made but the reasons and evidence are not kept.", "status": "open"}
  ],
  "evidence": [
    ev("solo-formation-rise", "desk-research", "In AI-exposed industries, business applications without early hiring signs rose 26.8% from Q1 2024 to Q1 2026 (about 222,000 to 281,000 a quarter); the researcher says this is descriptive and does not show AI caused it.", SRC["cnbc-solo-2026"], audience="adjacent", assumption="why-now"),
    ev("smb-count", "desk-research", "36,207,130 US small businesses; 99.9% of businesses are small (SBA Advocacy, Feb 2026).", SRC["sba-faq-2026"], audience="adjacent", assumption="exists"),
    ev("framework-premise", "opinion", "Naive's README states the premise: central data beats separate tools for one founder or a few, and agents reason better with the whole picture. This is the builder's own claim, not customer evidence.", gh("README.md"), audience="wrong", spec="general", assumption="hurts")
  ]
}, "problem statement; evidence is desk research and the builder's own premise only, so it should grade low")

put("foundation/telos", "foundation-telos", {
  "statement": "PROPOSED (Torian, t23u, paraphrased): become the default platform on which small businesses choose to operate and scale.",
  "end_state": "PROPOSED: a founder with an idea can sign up, run the venture's records, decisions and agents in one place, and keep running it there as it grows. Earlier recorded end: 'more people realize that they are founders' (preserve/merged-ledger.public.md N-197, box copy).",
  "horizon": None,
  "measures": [
    {"id": "ventures-run", "statement": "Ventures run on Naive (mode run) that had a person decide at least one decision in the last 30 days", "kind": "usage_or_adoption", "primary": True},
    {"id": "dogfood", "statement": "venture:naive itself is run on Naive, and its public site is generated from its records", "kind": "learning"},
    {"id": "main-street", "statement": "Small businesses (not only software startups) running on Naive", "kind": "impact"}
  ],
  "owner_outcome": {"path": None, "why": "TBD by Torian. No source states an intended owner outcome."}
}, "vision; owner_outcome.path has no unknown value, so this may be refused (see GAPS)")

put("foundation/constraints", "foundation-constraints", {
  "venture": V, "updated": D,
  "must_not": [
    {"id": "no-own-models-now", "statement": "Do not train or host our own models in the current phase.", "why": "Focus on what Naive is today; compute and model questions come later.", "source": "Torian, t22u (parent conversation)"},
    {"id": "no-symbolic-side-checks", "statement": "Do not add a symbolic check that bypasses the EE-095 term engine and the Lean proofs.", "why": "Torian's standing technical strategy.", "source": gh("docs/decisions/decisions.json") + " (EE-095)"},
    {"id": "agents-do-not-decide", "statement": "Agents do not settle decisions of escalated classes; they propose drafts for a person.", "why": "People decide by default.", "source": gh("docs/decisions/decisions.json") + " (EE-030, EE-179)"},
    {"id": "no-paid-data-no-scraping", "statement": "Do not use paid data or scrape LinkedIn for research; person data is public-role facts only.", "why": "Reference-library rules Torian approved on 2026-11-26.", "source": "/workspace/dogfood-modeled/usenaive/DOSSIER.md (Policy row), box"},
    {"id": "no-second-line-on-customer-data", "statement": "PROPOSED: do not use identifiable run-venture records for a second business line.", "why": "The January 2024 Carta and Linear case.", "source": "/workspace/reference-library/RESEARCH-DATA-RIGHTS.md section 5, box"}
  ]
}, "constraints; the last one is a proposal")

GOALS = [
 ("dogfood-naive", "Run venture:naive on Naive, so its strategy, offers and site come from its own records.", "venture", "Torian, t25u: build Naive's own venture as Naive records"),
 ("public-signup", "Anyone can sign up from the public site and reach a working venture without help.", "product", "Torian, t24u: 'the website would be evidence that it works because the call to action would be clear and anyone could easily sign up'"),
 ("first-accounts", "PROPOSED: a first set of early accounts (DataField first, then Torian's network) use Naive weekly; the count is TBD by Torian.", "venture", "Torian, t23u: early accounts list"),
 ("settle-bets", "PROPOSED: settle the open hypotheses in validation/plan with tests, not opinions.", "learning", "Torian, t21u: we are in discovery")
]
for gid, st, kind, why in GOALS:
    put("foundation/goals/[id]", f"goal-{gid}", {"id": gid, "venture": V, "statement": st, "kind": kind, "why": why, "updated": D, "measures": []}, "goal")

ICPS = [
 ("ai-native-solo-founder", "Technical solo founders who already work in an agent harness (Claude Code, Cursor)", "Solo AI-native founder", True, "b2c",
  ["works alone or with one or two others", "already pays for an AI subscription", "keeps code in GitHub"],
  ["decide what to do next", "keep the venture's facts where agents can read them"],
  ["Claude Code plugin marketplace", "GitHub", "Torian's LinkedIn network (placeholder: names TBD by Torian)"],
  "Naive ships as a Claude Code plugin today (README.md, EE-084), so this is the segment the shipped door already reaches."),
 ("main-street-operator", "Owners of small service businesses run online, such as online fitness coaching", "Main Street operator", False, "b2c",
  ["non-technical", "runs the business alone or with a few people"],
  ["know which decision matters this week", "keep customers, offers and money in one place"],
  ["Torian's friends running businesses (placeholders: names TBD by Torian)"],
  "Torian named online fitness coaching as a friend's business (t23u). These people have no terminal, which is what Mentura's web console is for (docs/design/HOSTED_WORKING_COPY_2026-11-07.md)."),
 ("venture-studio", "Venture studios and operators who start several ventures and want one method across them", "Venture studio", False, "b2b",
  ["runs a portfolio of ventures"], ["compare ventures by phase", "reuse playbooks"],
  ["introductions from potential partners (TBD by Torian)"],
  "Ventures can hold ventures (EE-011) and Mentura has teams that own several businesses (tchjhnsn/reflect README)."),
 ("small-business-data-owner", "Small businesses whose operating data has value, the segment Datafield (datafield.co) serves", "Data-owning small business", False, "b2b",
  ["has years of operating records"], ["know what their records are worth", "keep control of who uses them"], ["DataField (which DataField is TBD by Torian)"],
  "Only relevant if Torian's DataField is datafield.co, which licenses de-identified small-business data to AI labs (datafield.co, self-reported).")
]
for iid, who, short, primary, ctype, traits, jobs, where, note in ICPS:
    put("foundation/icp/[id]", f"icp-{iid}", {"venture": V, "updated": D, "id": iid, "who": who, "short": short, "primary": primary, "customer": ctype,
        "phases": ["discovery"], "traits": traits, "jobs": jobs, "where_to_find": where, "not": [], "customer_type": note}, "ideal customer profile (proposed segment; no interviews yet)")

# Discovery exit criteria from the framework's own discovery gate items
GATE = [("customer", "A named customer segment, with interviews behind it"), ("problem", "The problem is confirmed by the segment, not only by the builder"),
        ("alternatives", "What they use today instead is known"), ("solution-fit", "People in the segment tried the solution and it addressed the problem"),
        ("channel", "A channel that reaches the segment is known"), ("economic-signal", "Someone put money or time at stake"),
        ("validation-plan", "The next tests are written with pass thresholds"), ("decision", "A person decided to move on, with reasons")]
put("foundation/exit-criteria/[id]", "exit-discovery", {"phase": "discovery", "venture": V, "updated": D, "framework": "Naive discovery gate items (packages/naive/src/phases/gate-policies.json); Strategyzer say/do evidence; Blank customer discovery",
    "criteria": [{"id": g, "statement": s, "serves": [], "met": None} for g, s in GATE]}, "discovery exit criteria; none met")

# ---------- products (capability-bearing product cards) ----------
put("product/[id]", "product-naive-framework", {"id": "naive-framework", "name": "Naive framework", "description": "The venture development framework: record schemas, routes, checks, the CLI and MCP server, term engine and Lean proofs. Works offline with no account.",
    "job": "Keep a venture as checkable records and show the decision that needs a person", "ai": "agent-harness", "offering": "product", "status": "live", "software": True,
    "repo": "https://github.com/tchjhnsn/Naive", "offered_to": ["ai-native-solo-founder"],
    "features": [{"id": "create-venture", "name": "Create a venture", "job": "npx create-venture or naive new scaffolds a venture"},
                 {"id": "docket", "name": "Decision docket", "job": "Rank the decisions that need a person"},
                 {"id": "gate", "name": "The gate", "job": "Hold agent writes of escalated classes as drafts"},
                 {"id": "provenance", "name": "Provenance", "job": "Record who wrote each record, from what"},
                 {"id": "phases", "name": "Phases and gates", "job": "Five phases, each with a gate and exit evidence"},
                 {"id": "mcp", "name": "MCP server", "job": "Any MCP client reads and writes the venture"},
                 {"id": "term-engine", "name": "Term engine and Lean", "job": "Admit terms as checked properties with Lean theorems"},
                 {"id": "publish-lint", "name": "Publish lint", "job": "Check public text for leaks, marks and claims"},
                 {"id": "offline-sync", "name": "Offline sync", "job": "Sync a working copy with a hosted store"}]},
    "product card; status live is from the public repo and npm (naive-framework 0.6.0)")
put("product/[id]", "product-naive-plugin", {"id": "naive-plugin", "name": "Naive for Claude Code", "description": "The same repository as a Claude Code plugin: naive-create and naive-setup skills and the MCP server.",
    "job": "Start and run a venture from inside Claude Code", "ai": "agent-harness", "offering": "product", "status": "live", "software": True,
    "repo": "https://github.com/tchjhnsn/naive-plugins", "offered_to": ["ai-native-solo-founder"], "part_of": ["naive-framework"]}, "product card (README.md 'The Claude Code plugin', EE-084)")
put("product/[id]", "product-mentura", {"id": "mentura", "name": "Mentura (hosted Naive)", "description": "Naive hosted for people without a filesystem: sign in, open a business, work it in the business console. Agent runs do not run in Mentura yet.",
    "job": "Run a venture on Naive from a browser", "ai": "feature", "offering": "platform", "status": "building", "software": True,
    "repo": "https://github.com/tchjhnsn/reflect", "offered_to": ["main-street-operator", "venture-studio", "ai-native-solo-founder"]},
    "product card (tchjhnsn/reflect README and web/README.md: 'Not built in B1: agent runs ... none of them runs in Mentura yet')")

# ---------- validation ----------
put("validation/solution", "validation-solution", {"venture": V, "updated": D, "product": "naive-framework",
  "statement": "A venture kept as one set of plain, checked records, with a ranked docket of the decisions a person owes and agents that may only propose, so one founder can run what used to need a team.",
  "alternatives": ["Separate tools (CRM, wiki, finance app, tracker) plus a chat assistant", "Autonomous company builders such as Naive (usenaive.ai) and Polsia", "Doing nothing: a notes file and the founder's memory"],
  "difference": "People decide by default; every record has provenance and a gate; definitions are checked by a term engine and Lean. Competitors sell autonomy; Naive sells judgment kept on record. (Positioning is a proposal.)",
  "evidence": [ev("competitor-autonomy", "desk-research", "Polsia markets 'AI That Runs Your Company While You Sleep'; Naive (usenaive.ai) describes itself as 'an AI research lab building autonomous companies'.", SRC["polsia"], audience="wrong"),
               ev("no-customer-trial", "opinion", "No person outside the builder has used Naive in a recorded trial; the beta checkpoints in beta/capabilities.json exist but no feedback records were found.", gh("beta/capabilities.json"), audience="wrong", supports=False)]
}, "solution and alternatives")

put("validation/pricing", "validation-pricing", {"venture": V, "updated": D, "product": "naive-framework", "model": "freemium",
  "buyer": "The founder (self-serve)",
  "points": [{"name": "Naive framework and Claude Code plugin (MIT; the founder's own AI subscription pays for model use)", "amount": 0, "currency": "USD", "period": "month"}],
  "evidence": [
    ev("mit-public", "desk-research", "The repository is public under the MIT licence and naive-framework 0.6.0 is on npm.", SRC["npm-naive-framework"], audience="wrong"),
    ev("usenaive-credits", "desk-research", "usenaive.ai charged $20 a month per company (Standard) or $200 (Pro), each returning its price as usage credits, with a 7-day trial and $10 credit (capture of 2026-11-10).", SRC["usenaive-pricing-archive"], audience="adjacent"),
    ev("hybrid-shift", "desk-research", "Of 71 AI apps, hybrid pricing (subscription plus usage) went from 1% (Oct 2024) to 20% (Oct 2026); 9 of 15 coding tools are now hybrid.", SRC["host0-pricing-2026"], audience="adjacent"),
    ev("founder-subscription", "desk-research", "Claude Pro is $20 a month, Max $100, Ultra $200; Claude Code is included and draws on the plan's usage limits.", SRC["claude-pricing"], audience="adjacent")]
}, "current price point is a fact (free/MIT); proposed paid tiers live in decision pricing-model")

put("validation/go-to-market", "validation-go-to-market", {"venture": V, "updated": D, "path": "build-first", "motion": "product-led",
  "channels": [{"id": "plugin-marketplace", "kind": "Claude Code plugin marketplace (tchjhnsn/naive-plugins)"},
               {"id": "founder-network", "kind": "Torian's network and friends' businesses (direct, founder-led)"},
               {"id": "open-source", "kind": "Public repository and npm package"},
               {"id": "public-site-signup", "kind": "Public site with one sign-up call to action into Mentura"}],
  "evidence": [ev("built-first", "behavior", "The framework was built before any customer: 125+ pages of commits on main and no account or interview records.", gh("docs/decisions/decisions.json"), audience="wrong"),
               ev("plg-practice", "desk-research", "Homepage guidance: say who you are, what you do and what visitors can do there, in plain words.", SRC["nngroup-homepage"], audience="adjacent", spec="general")]
}, "go-to-market; motion product-led is a proposal")

H = [  # (id, statement, item, test, pass)
 ("h-term-engine-marketed", "Founders value checked definitions (the term engine and Lean) enough that it should be marketed, not only used inside.", "solution", "Show 5 target founders the docket with and without term-checked labels; ask them to explain a decision record back.", "3 of 5 name the checked terms unprompted as a reason to trust the record"),
 ("h-term-engine-needed", "The term engine is needed at all: without it, definition drift would cause wrong agent writes that tests would not catch.", "solution", "Count, over one month of dogfooding, writes the term engine refused that schema checks alone would have let through.", "At least one refused write a person agrees was wrong"),
 ("h-byo-subscription", "Early users will run agents on their own AI subscription (Claude Code, MCP) rather than buy credits from us.", "pricing", "Of the first 10 sign-ups, record which door they use and whether they ask for hosted agents.", "7 of 10 run through their own subscription"),
 ("h-hybrid-credits", "Mentura users without an AI subscription will pay a monthly plan that includes model credits.", "pricing", "Offer a priced plan with included credits to 10 Main Street operators.", "3 of 10 pay or pre-pay"),
 ("h-main-street", "Non-technical small business owners (e.g. online fitness coaching) will run their business's decisions in Mentura weekly.", "product-market-fit", "Onboard 5 such owners by hand; observe 4 weeks.", "3 of 5 decide at least one decision a week for 4 weeks"),
 ("h-solo-ai-founder", "AI-native solo founders adopt the plugin and keep using it after the first week.", "product-market-fit", "Track plugin installs from Torian's network; ask at day 7 and day 30.", "40% still active at day 30"),
 ("h-studio", "Venture studios will pay to run several ventures under one method.", "pricing", "Pitch 3 studios a paid pilot.", "1 signed pilot"),
 ("h-services", "A done-with-you venture setup service is a faster first revenue than software.", "pricing", "Offer the setup service to 5 early accounts at a stated price.", "2 accept"),
 ("h-marketplace", "Founders will buy or share templates, kits and playbooks built on Naive.", "go-to-market", "Publish 3 free templates; measure installs and requests for more.", "TBD by Torian"),
 ("h-data-benchmarks", "Pooled, anonymised benchmarks from run ventures become a product investors want.", "pricing", "Not before data terms exist and a minimum group size is decided; then ask 5 investors.", "TBD by Torian; blocked until data terms exist"),
 ("h-data-broker", "Licensing observed-venture profiles outward is a viable line (the PitchBook model).", "pricing", "Legal review first: it would likely make Naive a registered data broker in California.", "Default: do not pursue unless counsel and Torian approve"),
 ("h-platform", "Others will build on Naive (kits, connectors, frameworks), the Platform phase gate.", "go-to-market", "Publish the kit and connector contract; count outside contributions.", "First outside kit or connector"),
 ("h-agentic-commerce", "Agents that buy and sell for a venture (agent payment protocols) become a capability small businesses expect within the planning horizon.", "go-to-market", "Watch protocol adoption (ACP, AP2, MPP) and ask early accounts.", "TBD by Torian"),
 ("h-partner-led", "Small business programs and partners (studios, accelerators, local business centres) are a cheaper channel than direct.", "go-to-market", "Approach 2 partners with a pilot cohort.", "1 cohort of 5+ ventures"),
 ("h-phase-per-premise", "A phase belongs to each premise or function, not only to the whole venture, because real ventures loop back.", "operations-readiness", "Dogfood venture:naive for a month and log every time a single venture phase was wrong for part of it.", "3+ logged mismatches means per-premise phases are needed"),
 ("h-website-as-proof", "A site generated from the venture's own records, with a working sign-up, persuades partners more than a deck.", "go-to-market", "Show the generated site and sign-up to Jon and Oleena and the first accounts; record their questions.", "They sign up or ask to bring someone")
]
put("validation/plan", "validation-plan", {"venture": V, "updated": D, "assumptions": [
    {"id": i, "statement": s, "item": it, "test": t, "pass": p, "by": "2026-12-31", "status": "open"} for i, s, it, t, p in H]},
  "hypotheses register; every 'by' date is a placeholder (the schema requires one) for Torian to set")

# ---------- decisions (proposed, open, for Torian) ----------
def dec(i, q, options, rec, reasons, needed="discovery"):
    return {"id": i, "question": q, "status": "open", "needed_in": needed, "options": options, "answer": None, "decided_by": None, "decided_at": None,
            "proposed": {"answer": rec, "options": options, "drafted_by": {"kind": "agent", "id": "chief-of-staff"}, "proposed_at": D + "T12:00:00-06:00"},
            "reasons": reasons}
def rs(claim, kind, ref): return {"claim": claim, "kind": kind, "citations": [{"ref": ref}]}
DECS = [
 dec("pricing-model", "How do people pay for Naive, and who pays for model use?",
     ["Free framework; founders bring their own AI subscription (today)", "Hybrid: free framework plus a Mentura plan that includes model credits at cost plus a stated margin, with bring-your-own-key at no markup", "Credits only", "Per seat"],
     "Hybrid: keep the framework free; sell Mentura as a monthly plan per business that includes model credits and allows bring-your-own-key with no token markup. Price points TBD after the h-hybrid-credits test.",
     [rs("Agents run today on the founder's own subscription through the plugin and MCP; Mentura does not run agents yet.", "context", "https://github.com/tchjhnsn/reflect (web/README.md)"),
      rs("The repo's own runtime design recommends pass-through metered cost per organization first, BYOK later.", "for", gh("docs/design/AGENT_RUNTIME_2026-11-02.md") + " section 5 question 10"),
      rs("Hybrid pricing is the fastest-growing model among AI apps (1% to 20% of 71 apps, Oct 2024 to Oct 2026).", "for", SRC["host0-pricing-2026"]),
      rs("The closest competitor priced $20/$200 per company per month with the price returned as credits.", "context", SRC["usenaive-pricing-archive"]),
      rs("Token cost dominates infrastructure cost; a runaway loop spends real money, so budgets per organization are needed.", "against", gh("docs/design/AGENT_RUNTIME_2026-11-02.md") + " section 4")]),
 dec("term-engine-position", "Is the EE-095 term engine and Lean a marketed capability or an internal guarantee?",
     ["Market it as a headline capability", "Keep it under the hood; market the outcome (records you can trust)", "Retire it"],
     "Keep it, and market the outcome, not the mechanism: 'every definition is checked'. Name the term engine and Lean on the technical-bets and careers pages, where researchers and engineers read.",
     [rs("Torian treats EE-095 and Lean as firm strategy.", "context", gh("docs/decisions/decisions.json") + " EE-095"),
      rs("Admission does not yet check that a named theorem proves the current properties, only that it exists.", "against", gh("docs/decisions/decisions.json") + " EE-095 'Not built yet'"),
      rs("182 theorems in lean/Naive with no sorry, and terms such as observed and sourced/estimated/synthetic/gold already ride on it (EE-191, EE-199).", "for", gh("packages/naive/lean/Naive")),
      rs("Buyers judge outcomes; homepage guidance says to state the user benefit in plain words.", "for", SRC["nngroup-homepage"])]),
 dec("signup-door", "What is the one call to action on the public site?",
     ["Create a Mentura account (web)", "Install the Claude Code plugin", "Join the waitlist"],
     "One primary action, 'Start your venture', into Mentura account creation, with the plugin install as the secondary link for terminal users. Retire the waitlist once sign-up works end to end.",
     [rs("mentura.xyz/sign-in already offers 'Create your account'.", "for", SRC["mentura-sign-in"]),
      rs("The current marketing pages' only CTA is a waitlist that creates no account.", "context", "https://github.com/tchjhnsn/Naive/blob/" + SHA + "/site/content/marketing/waitlist.mdx"),
      rs("In Mentura, agent runs, turning a function on for a real business and most venture screens on real data are not built yet.", "against", "https://github.com/tchjhnsn/reflect (web/README.md 'Not built')")]),
 dec("first-hires", "Which roles come first?",
     ["Founding engineer (TypeScript, Effect, Lean)", "Founding GTM and growth lead", "Design engineer", "Applied AI and evals engineer", "Counsel (contract) for data terms"],
     "First: a founding engineer who can own Mentura's hosted agent runs, and a growth lead who can run the early-accounts tests. Contract counsel before the first paying customer. Design engineer and evals engineer next.",
     [rs("Hosted agent runs are the main missing piece between the site's sign-up and a working product.", "for", "https://github.com/tchjhnsn/reflect (web/README.md)"),
      rs("Data terms must exist before the first paying customer.", "for", "/workspace/reference-library/RESEARCH-DATA-RIGHTS.md section 5 (box)")]),
 dec("owner-outcome", "What outcome do the owners intend for the venture (telos owner_outcome)?",
     ["hold", "acquisition", "ipo", "other"], "No recommendation: an owner's call.", []),
 dec("scale-ambition", "Does venture:naive have a scale target? The earlier recorded end said 'no scale target, by choice'; t23u speaks of a platform for all small businesses.",
     ["No scale target; work the most immediate issues", "Platform scale as the stated vision, with phase-by-phase targets"],
     "State platform scale as the vision, and keep targets per phase only, so the immediate-issues rule still holds.",
     [rs("Earlier ends record: no scale target, by choice.", "context", "/workspace/preserve/sources-bundle/artifacts/RrM6rsuXAGjk8Wvh9Lv33i.md (box)")]),
 dec("data-terms", "What do Naive's terms say about venture data before the first paying customer?",
     ["Customer owns data; narrow service licence; separate aggregate clause with CCPA tests; opt-out; minimum group size; AI-training clause", "Defer"],
     "Adopt the first option as the drafting brief for counsel.",
     [rs("Gusto separates the service licence from aggregate use; Carta publishes benchmarks only with 10+ companies.", "for", "/workspace/reference-library/RESEARCH-DATA-RIGHTS.md (box)")])
]
for d in DECS: put("decisions/[id]", f"decision-{d['id']}", d, "decision proposed for Torian; open")

# ---------- competitors ----------
put("purpose/competitor/[id]", "competitor-usenaive", {"id": "usenaive", "name": "Naive (usenaive.ai, 'naïve, Inc')", "domain": "usenaive.ai", "kind": "competitor", "basis": "public-source",
  "offering": "Agent-native company platform: incorporation, payments, email, phone, hosting behind one API, plus company templates", "for": "Builders who want agents to run a company",
  "price": {"text": "$20/month per company (Standard) or $200 (Pro), price returned as credits", "url": SRC["usenaive-pricing-archive"], "read": D},
  "does": ["Raised about $28.5M (TechCrunch, 2026-08-06)", "Ships a CLI on npm that installs a command named naive"], "does_not": [],
  "sources": [{"url": SRC["usenaive-tc"], "read": D}, {"url": SRC["usenaive-yc"], "read": D}, {"url": SRC["npm-usenaive-cli"], "read": D}],
  "stance": "Same name, opposite thesis: they sell autonomy, Naive keeps people deciding. Full dossier: /workspace/dogfood-modeled/usenaive/DOSSIER.md (box).",
  "notes": "usenaive.ai answered HTTP 402 on 2026-11-26 (DOSSIER.md)."}, "competitor")
put("purpose/competitor/[id]", "competitor-polsia", {"id": "polsia", "name": "Polsia", "domain": "polsia.com", "kind": "competitor", "basis": "public-source",
  "offering": "An AI that plans, codes, runs ads, replies to customers and closes deals for a solo founder", "for": "Solo founders",
  "does": ["Markets 'AI That Runs Your Company While You Sleep' and 'NEVER HIRE AGAIN'"], "does_not": [],
  "sources": [{"url": SRC["polsia"], "read": D}], "stance": "Autonomy pitch; no public pricing read this run."}, "competitor")

# ---------- accounts (early accounts: placeholders, no invented people) ----------
put("purpose/account/[id]", "account-datafield", {"id": "datafield", "name": "DataField (which company: TBD by Torian)", "relationship": "other", "status": "prospect",
  "note": "Candidates from public sources, 2026-11-26: (1) Datafield, datafield.co: licenses small businesses' de-identified operating data to AI labs (self-reported); (2) DataField Technology Services, datafieldusa.com: telecom engineering and staffing, Worthington, Ohio; (3) Datafield Intelligence, datafieldintelligence.com: veteran-owned AI and SIGINT for defense. Relationship (customer, partner) TBD by Torian."}, "early account; identity ambiguous")
for aid, nm, note in [("network-placeholder", "Torian's LinkedIn network (names TBD by Torian)", "Placeholder for named accounts Torian adds. No scraping or enrichment."),
                      ("fitness-coaching-placeholder", "A friend's online fitness coaching business (name TBD by Torian)", "Torian named this business type in t23u.")]:
    put("purpose/account/[id]", f"account-{aid}", {"id": aid, "name": nm, "relationship": "customer", "status": "prospect", "note": note}, "early account placeholder")

# ---------- people / hiring ----------
put("people/team-plan", "team-plan", {"venture": V, "updated": D, "note": "PROPOSED hiring plan. No hire is made or promised. Order and roles are recommendations for Torian.",
  "roles": [
    {"id": "founder", "name": "Founder", "occupant": "person", "needed_by": "discovery", "status": "filled", "why": "Decides strategy, money, legal terms and public commitments (governance/roles/agent-roles.json)."},
    {"id": "chief-of-staff", "name": "Chief of Staff (agent)", "occupant": "agent", "needed_by": "discovery", "status": "filled", "why": "Intake, routing and register upkeep (agents/chief-of-staff/AGENTS.md)."},
    {"id": "founding-engineer", "name": "Founding engineer: hosted agents", "occupant": "person", "needed_by": "discovery", "status": "open", "why": "Unlocks hosted agent runs in Mentura, the gap between a sign-up and a working product."},
    {"id": "growth-lead", "name": "Founding growth and GTM lead", "occupant": "person", "needed_by": "discovery", "status": "open", "why": "Unlocks the early-accounts tests and the public site's proof."},
    {"id": "counsel", "name": "Counsel (contract): data terms and naming", "occupant": "person", "needed_by": "discovery", "status": "open", "why": "Data terms before the first paying customer; trademark review given the usenaive.ai clash."},
    {"id": "design-engineer", "name": "Design engineer", "occupant": "person", "needed_by": "validation", "status": "planned", "why": "Unlocks a console non-technical owners can use without help."},
    {"id": "evals-engineer", "name": "Applied AI and evals engineer", "occupant": "person", "needed_by": "validation", "status": "planned", "why": "Unlocks measured agent quality from gold records and accept/edit/reject data."},
    {"id": "formal-methods", "name": "Formal methods engineer (Lean)", "occupant": "person", "needed_by": "beachhead", "status": "planned", "why": "Closes EE-095's gap: theorems that prove the current properties, not only exist."}],
  "recruiting": [
    {"role": "founding-engineer", "kind": "cofounder", "brief": "Make agents run for people who have no terminal: durable runs, budgets per business, every run kept as a record.", "channels": ["Torian's network"]},
    {"role": "growth-lead", "kind": "hire", "brief": "Find the first ten ventures that run on Naive every week, and prove it on the site.", "channels": ["Torian's network"]},
    {"role": "counsel", "kind": "contractor", "brief": "Draft data terms (ownership, aggregate use, AI training, opt-out) and clear the name risk.", "channels": []}]}, "hiring plan (proposal)")

# ---------- services ----------
put("service-delivery/offers/[id]", "offer-venture-setup", {"id": "venture-setup", "name": "Venture setup, done with you", "outcome": "Your venture's foundation, docket and first decisions in Naive, and the next three tests written.",
  "includes": ["a working session to capture the idea", "foundation records drafted by agents for you to accept", "a validation plan with pass thresholds"], "excludes": ["deciding for you"],
  "price_model": "fixed", "price": None, "currency": "USD", "product": "naive-framework", "status": "draft", "note": "Hypothesis h-services. Price TBD by Torian."}, "service offer draft")

# ---------- risks ----------
RISKS = [
 ("name-clash-usenaive", "Name clash with usenaive.ai ('naïve, Inc')", "A funded company uses the same name, and its CLI installs a command named naive", "Search confusion, trademark exposure, and a CLI command collision", "legal"),
 ("name-clash-naive-dev", "Name clash with nAIVE Engine (naive.dev)", "An AI-native game engine uses the name and holds naive.dev", "Search confusion and domain unavailability", "reputational"),
 ("data-broker", "Becoming a data broker without meaning to", "Observed ventures hold facts about people who are not customers", "Licensing them out may require California data-broker registration", "regulatory"),
 ("inference-cost", "Model cost exposure once Mentura runs agents", "Token cost dominates infrastructure cost and loops can run away", "Unbounded spend per business", "financial"),
 ("subscription-dependence", "Dependence on founders' AI subscriptions", "Today agents run on the founder's own plan, whose limits the provider sets", "Usage limits or terms changes cap what Naive can do", "strategic"),
 ("visibility-mismatch", "Repository visibility does not match the docs", "README says 'Private for now (G-035)', yet the repository clones without sign-in and is MIT", "Unintended disclosure of internal designs", "strategic")]
for rid, t, c, cons, cat in RISKS:
    put("legal/risks/[id]", f"risk-{rid}", {"id": rid, "title": t, "cause": c, "consequence": cons, "category": cat, "owner": "founder",
        "likelihood": None, "impact": None, "treatment": "reduce", "status": "open", "review_date": "2026-12-31", "note": "Likelihood and impact unknown; not estimated."}, "risk")

# ---------- industries / markets ----------
put("industries/[id]", "industry-software", {"venture": V, "id": "software-publishers", "name": "Software publishers", "naics": "513210", "updated": D, "cells": {}}, "industry (NAICS 2022 513210 Software Publishers; mapping is ours)")
put("markets/[id]", "market-solo-founders", {"venture": V, "id": "solo-ai-founders", "segment": "AI-native solo founders and small teams", "icp": "ai-native-solo-founder", "primary": True, "industry": "software-publishers", "updated": D, "cells": {}}, "market")
put("markets/[id]", "market-main-street", {"venture": V, "id": "main-street", "segment": "US small businesses (36.2M, SBA 2026)", "icp": "main-street-operator", "primary": False, "industry": "software-publishers", "updated": D, "cells": {}}, "market")

# ---------- marketing ----------
put("marketing/design-system", "design-system", {"venture": V, "updated": D,
  "ethos": {"statement": "If you have an idea, you are a founder.", "traits": ["plain", "confident", "on the founder's side"], "avoid": ["autonomous", "never hire again", "AI fluff"],
            "from": ["foundation/core", "site/content/marketing/about.mdx (Torian's words)"]},
  "audiences": ["ai-native-solo-founder", "main-street-operator"],
  "choices": [{"area": "voice", "choice": "Short, plain sentences. Name the decision, the record and the person. Say what is built and what is not.", "why": "The docs' 'What's built' habit and the ethos: founders are trusted with the truth.", "from": ["site/content/docs/get-started/whats-built.mdx"]}]}, "design system: voice only; visual choices are left to the existing site/brand/tokens.json")

open(os.path.join(RUN, "write-plan.tsv"), "w").write("".join(f"{r}\t{i}\t{w}\n" for r, i, w in plan))
print(len(plan), "inputs")
