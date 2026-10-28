#!/usr/bin/env node
// The decision board (EE-054, EE-058): a live page of one venture's decisions, by what renders now,
// with provenance as it happens. Local only: it binds to 127.0.0.1 and reads the workspace in
// MENTURA_WORKSPACE (the default is this repository's instance/). No dependencies.
//
//   node interface/demo/board.mjs [--venture <id>] [--port 4331]

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { routes, ventureDir, ventures } from "../router.mjs";
import { decisions } from "../../schema/decisions.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const port = Number(arg("port", 4331));
const venture = arg("venture", ventures()[0]?.id);

function state(id) {
  const dir = ventureDir(id);
  if (!dir) return { error: `no venture ${id}` };
  const log = existsSync(join(dir, "provenance.jsonl")) ? readFileSync(join(dir, "provenance.jsonl"), "utf8").trim().split("\n").filter(Boolean).slice(-8).map((l) => JSON.parse(l)).reverse() : [];
  // The kit for now (EE-028): what need-now says this venture needs in its phase, and which kit holds it.
  const nn = spawnSync("node", [new URL("../../schema/need-now.mjs", import.meta.url).pathname, dir, "--json"], { encoding: "utf8" });
  const kitOf = new Map(routes().filter((r) => r.record).map((r) => [r.record, { kit: r.kit, route: r.route.replace(/\/\[id\]$/, "") }]));
  const rows = nn.status === 0 ? JSON.parse(nn.stdout).rows : [];
  const kit = rows.filter((r) => r.now >= 0.5 || r.status === "coming soon").map((r) => ({ type: r.type, status: r.status, now: r.now, next: r.next, why: r.why, ...(kitOf.get(r.type) ?? {}) }));
  return { ...decisions(dir), kit, log: log.map((e) => ({ at: e.at, activity: e.activity, entity: e.entity, who: `${e.agent?.kind ?? "?"}${e.agent?.id ? ` ${e.agent.id}` : ""}`, via: e.agent?.via })) };
}

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Decision board</title><style>
:root{--bg:#fbfaf7;--fg:#1d1c1a;--muted:#6b675f;--line:#e4e0d8;--card:#fff;--now:#1f6feb;--over:#c4321f;--wait:#9a6700;--done:#1a7f37}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ecebe6;--muted:#a19d94;--line:#2e2d2a;--card:#1c1b19;--now:#58a6ff;--over:#ff7b6b;--wait:#e3b341;--done:#56d364}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:20px 24px;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:baseline;flex-wrap:wrap}
h1{font-size:20px;margin:0}.meta{color:var(--muted);font-size:13px}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;padding:20px 24px}
section h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:8px}
.card.overdue{border-left-color:var(--over)}.card.now{border-left-color:var(--now)}.card.waiting,.card.stale{border-left-color:var(--wait)}.card.done{border-left-color:var(--done)}
.q{font-weight:600}.id{font:12px ui-monospace,monospace;color:var(--muted)}.tag{display:inline-block;font-size:11px;padding:2px 6px;border-radius:99px;border:1px solid var(--line);margin:4px 4px 0 0;color:var(--muted)}
.tag.ask{border-color:var(--now);color:var(--now)}.tag.lock{border-color:var(--wait);color:var(--wait)}
.why{font-size:12px;color:var(--muted);margin-top:4px}.rank{float:right;font:12px ui-monospace,monospace;color:var(--now)}
.kit{padding:0 24px 8px}.kit ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}.kit li{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:13px;max-width:320px}
.kit li b{display:block;margin-bottom:2px}.tag.start{border-color:var(--now);color:var(--now);font-weight:600}.tag.soon{opacity:.6}.tag.has{color:var(--done);border-color:var(--done)}
.log{padding:0 24px 24px}.log table{width:100%;border-collapse:collapse;font-size:13px}.log td{padding:4px 8px;border-top:1px solid var(--line)}.log td:first-child{color:var(--muted);white-space:nowrap}
</style></head><body><header><h1 id="title">Decision board</h1><span class="meta" id="meta"></span></header><div class="kit"><section><h2>The kit for this phase (from need-now)</h2><ul id="kit"></ul></section></div><main id="cols"></main>
<div class="log"><section><h2>Provenance, latest first</h2><table id="log"></table></section></div>
<script>
const COLS=[["overdue","Overdue"],["now","Now"],["waiting","Waiting"],["stale","Stale"],["later","Later"],["deferred","Deferred"],["done","Done"]];
const esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
async function tick(){
  try{
    const s=await (await fetch("state.json"+location.search,{cache:"no-store"})).json();
    if(s.error){document.getElementById("meta").textContent=s.error;return;}
    document.getElementById("title").textContent="Decisions: "+s.venture;
    document.getElementById("meta").textContent=s.phase+" phase · "+s.kind+" · updated "+new Date().toLocaleTimeString();
    const ds=s.decisions.filter((d)=>d.source!=="root"||d.id==="foundation");
    const ranked=ds.filter((d)=>d.rank!=null).map((d)=>d.id);
    const kits={};(s.kit||[]).forEach((r)=>{(kits[r.kit||"other"]=kits[r.kit||"other"]||[]).push(r);});
    const mark={"held":["has","has"],"suggest now":["start now","start"],"coming soon":["next phase","soon"]};
    document.getElementById("kit").innerHTML=Object.entries(kits).sort((a,b)=>b[1].filter((r)=>r.status==="suggest now").length-a[1].filter((r)=>r.status==="suggest now").length).map(([k,rs])=>'<li><b>'+esc(k)+'</b>'+rs.map((r)=>'<span class="tag '+(mark[r.status]||["",""])[1]+'" title="'+esc(r.why)+'">'+esc(r.type.replace(/^validation-/,""))+' · '+esc((mark[r.status]||[r.status])[0])+'</span>').join("")+'</li>').join("");
    document.getElementById("cols").innerHTML=COLS.map(([k,label])=>{const xs=ds.filter((d)=>d.render===k);return xs.length?'<section><h2>'+label+' ('+xs.length+')</h2>'+xs.map((d)=>
      '<div class="card '+k+'">'+(d.rank!=null?'<span class="rank">#'+(ranked.indexOf(d.id)+1)+'</span>':'')+'<div class="q">'+esc(d.question)+'</div><div class="id">'+esc(d.id)+' · '+esc(d.layer)+' · '+esc(d.boundary)+'</div>'+
      (d.awaiting?'<span class="tag ask">agent wording, awaiting approval</span>':'')+
      (d.held_by?'<span class="tag lock">held by '+esc(d.held_by)+'</span>':'')+
      (d.due&&k!=="done"?'<span class="tag">due '+esc(d.due)+' ('+d.due_in_hours+'h)</span>':'')+
      (d.provenance&&d.provenance.approved_by?'<span class="tag">approved by '+esc(d.provenance.approved_by)+' in '+esc(d.provenance.phase)+'</span>':'')+
      (d.unlocks?'<span class="tag">unlocks: '+esc(d.unlocks.join(", "))+'</span>':'')+
      (d.outcomes?'<span class="tag">outcomes '+(d.outcomes.total-d.outcomes.pending)+'/'+d.outcomes.total+'</span>':'')+
      (d.why&&d.why.length?'<div class="why">Why now: '+esc(d.why.join("; "))+'</div>':'')+'</div>').join("")+'</section>':"";}).join("");
    document.getElementById("log").innerHTML=s.log.map((e)=>'<tr><td>'+esc(new Date(e.at).toLocaleTimeString())+'</td><td>'+esc(e.activity)+'</td><td>'+esc(e.entity)+'</td><td>'+esc(e.who)+' via '+esc(e.via)+'</td></tr>').join("");
  }catch(e){document.getElementById("meta").textContent="Lost the board's server.";}
}
tick();setInterval(tick,1500);
</script></body></html>`;

export function serve(p = port, id = venture) {
  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/state.json") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(state(u.searchParams.get("venture") ?? id))); return; }
    if (u.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGE); return; }
    res.writeHead(404); res.end();
  });
  server.listen(p, "127.0.0.1");
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  serve();
  console.log(`decision board for ${venture}: http://127.0.0.1:${port}/`);
}
