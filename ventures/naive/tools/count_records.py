#!/usr/bin/env python3
"""Count venture:naive records per APQC function, with state and null-field counts. Writes runs/<id>/record-counts.json."""
import json, glob, os, sys
HERE=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); REPO=os.path.dirname(os.path.dirname(HERE)); KB=os.path.join(REPO, "instance/naive")
FN=["strategy","products","marketing-and-sales","supply-chain","service-delivery","customer-service","human-capital","it","finance","assets","risk-and-compliance","external-relationships","capabilities"]
def fn(rel):
    r=rel.replace("_drafts/","").replace("__","/")
    for k,f in [("decisions/first-hires","human-capital"),("decisions/venture.team","human-capital"),("decisions/pricing-model","marketing-and-sales"),("decisions/signup-door","marketing-and-sales"),("decisions/data-terms","risk-and-compliance"),
                ("raw/","knowledge (cross-function)"),("product/","products"),("foundation/","strategy"),("decisions/","strategy"),("validation/plan","strategy"),("competitors/","strategy"),("industries/","strategy"),("markets/","strategy"),
                ("product/","products"),("validation/solution","products"),("capabilities","products"),("validation/pricing","marketing-and-sales"),("validation/go-to-market","marketing-and-sales"),("accounts/","marketing-and-sales"),("marketing/","marketing-and-sales"),
                ("service-delivery/","service-delivery"),("people/","human-capital"),("legal/","risk-and-compliance"),("cost-model","finance")]:
        if r.startswith(k) or k in r: return f
    return "unmapped"
def nulls(x):
    if x is None: return 1
    if isinstance(x,dict): return sum(nulls(v) for v in x.values())
    if isinstance(x,list): return sum(nulls(v) for v in x)
    return 0
rows=[]
for p in glob.glob(f"{KB}/**/*",recursive=True):
    if not (p.endswith(".json") or p.endswith(".draft")) or "/raw/sources/" in p and not p.endswith("source.json"): continue
    rel=os.path.relpath(p,KB)
    if rel in ("package.json", "venture.json"): continue
    st="draft" if "_drafts" in rel else "written"
    rows.append((fn(rel),st,nulls(json.load(open(p))),rel))
for p in glob.glob(f"{HERE}/interim/**/*.json",recursive=True):
    rel=os.path.relpath(p,f"{HERE}/interim"); rows.append((fn(rel),"interim",nulls(json.load(open(p))),"interim/"+rel))
out={}
for f in FN+["knowledge (cross-function)","unmapped"]:
    rs=[r for r in rows if r[0]==f]
    out[f]={"records":len(rs),"written":sum(r[1]=="written" for r in rs),"draft":sum(r[1]=="draft" for r in rs),"interim":sum(r[1]=="interim" for r in rs),"null_fields":sum(r[2] for r in rs),"files":sorted(r[3] for r in rs)}
json.dump(out,open(sys.argv[1] if len(sys.argv)>1 else "/dev/stdout","w"),indent=2)
for f,o in out.items(): print(f"{f:28} {o['records']:3}  written {o['written']:2} draft {o['draft']:2} interim {o['interim']:2} nulls {o['null_fields']}")
