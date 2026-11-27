#!/usr/bin/env python3
"""Emit the public site's page content as Markdown from venture:naive's records.

Reads only records: instance/naive (written records first, then _drafts),
then ventures/naive/interim/ (records Naive refused; see GAPS.md). Writes site-content/*.md.
Every page carries front matter naming its source records and whether any is a
draft, proposed or interim, so nothing ships before Torian decides.
Usage: python3 tools/gen_site.py   (from ventures/naive)
"""
import json, os, glob, datetime
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.dirname(os.path.dirname(HERE))
KB = os.path.join(REPO, "instance/naive")
INTERIM = os.path.join(HERE, "interim")
OUT = os.path.join(HERE, "site-content")
TBD = "_TBD by Torian_"

def rec(route):
    """Return (record, where, state) for a route like foundation/core."""
    for path, state in [(f"{KB}/{route}.json", "written"),
                        (f"{KB}/_drafts/{route.replace('/', '__')}.json.draft", "draft"),
                        (f"{INTERIM}/{route}.json", "interim")]:
        if os.path.exists(path):
            return json.load(open(path)), os.path.relpath(path, REPO), state
    return None, None, "missing"

def decision(id_):
    p = f"{KB}/decisions/{id_}.decision.json"
    if not os.path.exists(p): return None, None, "missing"
    d = json.load(open(p))
    return d, os.path.relpath(p, REPO), ("decided" if d.get("answer") else "proposed")

def many(prefix):
    out = []
    for p in sorted(glob.glob(f"{KB}/{prefix}/*.json")):
        out.append((json.load(open(p)), os.path.relpath(p, REPO), "written"))
    for p in sorted(glob.glob(f"{KB}/_drafts/{prefix.replace('/', '__')}__*.json.draft")):
        out.append((json.load(open(p)), os.path.relpath(p, REPO), "draft"))
    return out

def page(name, title, srcs, body):
    states = sorted({s for _, _, s in srcs})
    ready = all(s in ("written", "decided") for s in states) and srcs
    fm = ["---", f"title: {title}", f"status: {'ready-for-review' if ready else 'not-publishable'}",
          f"source_states: [{', '.join(states)}]", "sources:"]
    fm += [f"  - {w}" for _, w, _ in srcs if w] + [f"generated: {datetime.date.today()}", "---", ""]
    os.makedirs(OUT, exist_ok=True)
    open(f"{OUT}/{name}.md", "w").write("\n".join(fm) + body.strip() + "\n")
    return name

v = lambda x: x if x not in (None, "", []) else TBD
pages = []

core = rec("foundation/core"); problem = rec("foundation/problem"); telos = rec("foundation/telos")
icps = many("foundation/icp"); caps = rec("capabilities"); ds = rec("marketing/design-system")
signup = decision("signup-door"); pricing = decision("pricing-model"); vpr = rec("validation/pricing")
term = decision("term-engine-position"); team = rec("people/team-plan"); hires = decision("first-hires")
plan = rec("validation/plan"); cost = rec("cost-model")

def prop(d): return (d[0] or {}).get("answer") or ((d[0] or {}).get("proposed") or {}).get("answer")

c = core[0] or {}
prim = [i for i in icps if i[0].get("primary")] or icps
shipped = [x for x in (caps[0] or {}).get("capabilities", []) if x["status"] == "shipped"]
pages.append(page("home", "Home", [core, problem, *prim, caps, signup], f"""
# {v(c.get('tagline'))}

{v(c.get('promise'))}

## Who it's for
{chr(10).join('- ' + i[0].get('who', TBD) for i in prim) or TBD}

## The problem
{v((problem[0] or {}).get('statement'))}

## How it works
{v(c.get('competence'))}

## What works today
{chr(10).join(f"- {x['name']}" for x in shipped[:6]) or TBD}

## Next step
{v(prop(signup))}
"""))

rows = "\n".join(f"| {x['name']} | {x['status']} | {x['note']} | {x['evidence']} |" for x in (caps[0] or {}).get("capabilities", []))
pages.append(page("capabilities", "What's built", [caps], f"""
# What's built

Shipped, partial or planned. Each line links its evidence.

| Capability | Status | Note | Evidence |
|---|---|---|---|
{rows or TBD}
"""))

pages.append(page("how-it-works", "How it works", [core, term, caps], f"""
# How it works

{v(c.get('competence'))}

## Checked definitions
{v(prop(term))}

Status: see the term engine line on [What's built](capabilities.md).
"""))

pts = (vpr[0] or {}).get("points", [])
cm = (cost[0] or {})
pages.append(page("pricing", "Pricing", [vpr, pricing, cost], f"""
# Pricing

## Today
{chr(10).join(f"- {p['name']}: {p['amount']} {p['currency']}/{p['period']}" for p in pts) or TBD}

## Proposed (not decided)
{v(prop(pricing))}

## Who pays for model use
- Framework and plugin: {v((cm.get('who_pays') or {}).get('framework_and_plugin'))}
- Mentura (proposed): {v((cm.get('who_pays') or {}).get('mentura_recommended'))}

Plan price: {TBD}
"""))

eth = (ds[0] or {}).get("ethos", {})
pages.append(page("about", "About", [core, ds], f"""
# About

> {v(eth.get('statement'))}

## Mission
{v(c.get('promise'))}

## How we sound
{chr(10).join('- ' + t for t in eth.get('traits', [])) or TBD}
"""))

t = telos[0] or {}
pages.append(page("vision", "Vision", [telos, plan], f"""
# Vision

{v(t.get('statement'))}

{v(t.get('end_state'))}

## How we'll know
{chr(10).join('- ' + m['statement'] for m in t.get('measures', [])) or TBD}

## What we're testing now
{chr(10).join(f"- {a['statement']} ({a['status']})" for a in (plan[0] or {}).get('assumptions', [])) or TBD}
"""))

roles = [r for r in (team[0] or {}).get("roles", []) if r.get("occupant") == "person" and r.get("status") in ("open", "planned")]
pages.append(page("careers", "Careers", [team, hires], f"""
# Careers

No role below is open for applications until Torian decides the hiring plan.

{chr(10).join(f"## {r['name']}{chr(10)}Needed by: {r.get('needed_by', TBD)} phase. {r.get('why', TBD)}{chr(10)}" for r in roles) or TBD}
"""))

pages.append(page("start", "Start", [signup, core], f"""
# Start your venture

{v(c.get('tagline'))}

{v(prop(signup))}

Link target: {TBD}
"""))

sm = os.path.join(KB, "marketing/sitemap.json")
if os.path.exists(sm):
    s = json.load(open(sm))
    lines = [f"- `{p['path']}` {p['label']}: " + ", ".join(x['item'] for x in p['sections']) for p in s["pages"]]
    om = ", ".join(o.get("item", "?") for o in s.get("omitted", []))
    open(f"{OUT}/_naive-sitemap.md", "w").write("# Naive's own site plan (operations/marketing/sitemap)\n\n" + "\n".join(lines) + f"\n\nOmitted by Naive: {om}\n")
print("wrote", len(pages), "pages to", os.path.relpath(OUT, REPO), ":", ", ".join(pages))
