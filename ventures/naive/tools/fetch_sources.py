#!/usr/bin/env python3
"""Fetch each source once (curl), keep body sha256, HTTP status and plain text; rewrite each raw/sources input as {source, text} (EE-192)."""
import json, os, sys, glob, subprocess, hashlib, re, html, datetime
RUN = sys.argv[1]; SD = os.path.join(RUN, "sources"); os.makedirs(SD, exist_ok=True)
for p in sorted(glob.glob(os.path.join(RUN, "inputs", "source-*.json"))):
    obj = json.load(open(p)); src = obj.get("source", obj); sid = src["id"]
    body = os.path.join(SD, sid + ".body")
    r = subprocess.run(["curl", "-sL", "-m", "25", "-A", "Mozilla/5.0 (research; naive-self run)", "-o", body, "-w", "%{http_code}", src["url"]], capture_output=True, text=True)
    code = int(r.stdout or 0) if (r.stdout or "0").isdigit() else 0
    raw = open(body, "rb").read() if os.path.exists(body) else b""
    t = raw.decode("utf-8", "replace")
    if "<html" in t[:2000].lower() or "<!doctype" in t[:200].lower():
        t = re.sub(r"(?is)<(script|style|noscript).*?</\1>", " ", t); t = re.sub(r"(?s)<[^>]+>", "\n", t); t = html.unescape(t)
    t = "\n".join(l.strip() for l in t.splitlines() if l.strip())[:60000]
    if not t: t = f"(no text captured; HTTP {code})"
    src.update({"fetched_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"), "http_status": code or None, "sha256": hashlib.sha256(raw).hexdigest()})
    open(os.path.join(SD, sid + ".txt"), "w").write(t)
    json.dump({"source": src, "text": t}, open(p, "w"), indent=2, ensure_ascii=False)
    print(code, sid, len(t))
