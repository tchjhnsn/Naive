#!/usr/bin/env python3
"""Write every planned record through the Naive CLI (tools/nv.sh), one call per record, logging to writes.jsonl.
Run from /workspace/naive-self: python3 tools/write_records.py runs/<run-id> [route-prefix-filter]"""
import json, os, subprocess, sys
RUN = sys.argv[1]; FILT = sys.argv[2] if len(sys.argv) > 2 else ""
RID = os.path.basename(RUN.rstrip("/")); B = "/workspace/naive-self"
out = open(os.path.join(RUN, "writes.jsonl"), "a")
for line in open(os.path.join(RUN, "write-plan.tsv")):
    route, inp, why = line.rstrip("\n").split("\t")
    if FILT and not route.startswith(FILT): continue
    obj = json.load(open(os.path.join(RUN, inp)))
    oid = obj.get("id") or (obj.get("source") or {}).get("id") or obj.get("phase") or ""; r = route.replace("[id]", str(oid))
    p = subprocess.run([f"{B}/tools/nv.sh", r, "write", "--venture", "naive", "--input", os.path.abspath(os.path.join(RUN, inp))],
                       cwd=f"{B}/workspace", env={**os.environ, "RUN_ID": RID}, capture_output=True, text=True)
    rec = {"route": r, "input": inp, "why": why, "exit": p.returncode, "output": (p.stdout + p.stderr)[-3000:]}
    out.write(json.dumps(rec) + "\n"); out.flush()
    print(p.returncode, r, (p.stdout + p.stderr).strip().splitlines()[-1][:160] if (p.stdout + p.stderr).strip() else "")
