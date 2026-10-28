#!/usr/bin/env node
// The decision board (EE-054, EE-058): a live page of one venture's decisions, by what renders now,
// with provenance as it happens, and at /map the founder's idea map on one canvas (EE-059). Local
// only: it binds to 127.0.0.1 and reads the workspace in
// MENTURA_WORKSPACE (the default is this repository's instance/). No dependencies.
//
//   node interface/demo/board.mjs [--venture <id>] [--port 4331]

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { routes, ventureDir, ventures } from "../router.mjs";
import { decisions } from "../../schema/decisions.mjs";
import { CONVENTIONS, MAP, parse, summary } from "../../purpose/frameworks/idea-map/ideamap.mjs";

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

// The idea map (EE-059): the founder's ideas on one canvas, by pillar and department.
function ideas(id) {
  const dir = ventureDir(id);
  if (!dir) return { error: `no venture ${id}` };
  if (!existsSync(join(dir, MAP))) return { venture: id, waiting: "no idea dump yet" };
  const v = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
  const map = parse(readFileSync(join(dir, MAP), "utf8"));
  return { venture: id, name: v.name, phase: v.phase, meta: map.meta, ideas: map.ideas, summary: summary(map, v.phase), pillars: CONVENTIONS.pillars, departments: CONVENTIONS.departments };
}

const MAP_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Idea map</title><link rel="stylesheet" href="https://unpkg.com/reactflow@11.11.4/dist/style.css">
<style>
:root{--bg:#fbfaf7;--fg:#1d1c1a;--muted:#6b675f;--line:#e4e0d8;--card:#fff;--product:#1f6feb;--brand:#bf3989;--business:#1a7f37;--gap:#9a6700}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ecebe6;--muted:#a19d94;--line:#2e2d2a;--card:#1c1b19;--product:#58a6ff;--brand:#f778ba;--business:#56d364;--gap:#e3b341}}
*{box-sizing:border-box}html,body,#app{height:100%;margin:0}body{background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
#app{display:grid;grid-template-columns:1fr 320px}@media (max-width:800px){#app{grid-template-columns:1fr;grid-template-rows:60vh auto}}
aside{border-left:1px solid var(--line);padding:16px;overflow:auto}h1{font-size:18px;margin:0 0 4px}h2{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:16px 0 6px}
.meta{color:var(--muted);font-size:12px}.bar{display:flex;height:10px;border-radius:5px;overflow:hidden;margin:6px 0}.bar span{display:block}
ul{margin:0;padding-left:18px}li{margin:2px 0}.n{color:var(--muted);font-variant-numeric:tabular-nums}a{color:var(--product)}
.node{background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12px;max-width:230px}
.node.venture{font-size:16px;font-weight:700;padding:12px 16px;border-width:2px}.node.pillar{font-weight:700;text-transform:capitalize;color:#fff;border:none}
.node.dept{font-weight:600}.node.dept.empty{border-style:dashed;color:var(--muted);background:transparent}.node.idea .t{display:block}
.chip{display:inline-block;font-size:10px;border:1px solid var(--line);border-radius:99px;padding:1px 6px;margin:4px 3px 0 0;color:var(--muted)}.chip.ex{border-color:var(--business);color:var(--business);font-weight:600}
.react-flow__attribution{display:none}.react-flow__handle{opacity:0;pointer-events:none}
</style></head><body><div id="app"><div id="flow"></div><aside id="side"><h1>Idea map</h1><div class="meta">Waiting for the idea dump...</div></aside></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/reactflow@11.11.4/dist/umd/index.js"></script>
<script>
const h=React.createElement, RF=window.ReactFlow, Flow=RF.default||RF.ReactFlow;
const css=(v)=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ANG={product:-90,brand:30,business:150};
function layout(s){
  const nodes=[],edges=[],P=(a,r)=>({x:Math.cos(a*Math.PI/180)*r,y:Math.sin(a*Math.PI/180)*r});
  nodes.push({id:"v",position:{x:-60,y:-20},data:{label:h("div",{className:"node venture"},s.name)},type:"default",style:{border:"none",background:"transparent",padding:0,width:"auto"}});
  const byDept={};s.ideas.forEach((i)=>{const d=(i.departments||[])[0]||"unmapped";(byDept[d]=byDept[d]||[]).push(i);});
  for(const [p,depts] of Object.entries(s.pillars)){
    const a=ANG[p],col=css("--"+p),pp=P(a,170);
    nodes.push({id:"p-"+p,position:{x:pp.x-50,y:pp.y-16},data:{label:h("div",{className:"node pillar",style:{background:col}},p+" · "+s.summary.by_pillar[p])},style:{border:"none",background:"transparent",padding:0,width:"auto"}});
    edges.push({type:"straight",id:"e-v-"+p,source:"v",target:"p-"+p,style:{stroke:col,strokeWidth:3}});
    const span=92,step=span/Math.max(1,depts.length-1);
    depts.forEach((d,k)=>{
      const da=a-span/2+k*step,dp=P(da,400),n=s.summary.by_department[d];
      nodes.push({id:"d-"+d,position:{x:dp.x-70,y:dp.y-16},data:{label:h("div",{className:"node dept"+(n?"":" empty"),style:n?{borderColor:col,borderWidth:Math.min(6,1+n)}:{},title:s.departments[d]},d.replace(/-/g," ")+(n?" · "+n:""))},style:{border:"none",background:"transparent",padding:0,width:"auto"}});
      edges.push({type:"straight",id:"e-"+p+"-"+d,source:"p-"+p,target:"d-"+d,style:{stroke:col,strokeOpacity:n?.8:.25,strokeDasharray:n?"":"4 4"}});
      (byDept[d]||[]).forEach((i,j,all)=>{
        const ia=da+(j-(all.length-1)/2)*Math.min(13,56/all.length),ip=P(ia,720+(j%2)*210);
        nodes.push({id:i.id,position:{x:ip.x-110,y:ip.y-30},data:{label:h("div",{className:"node idea",style:{borderColor:col},title:i.text},
          h("span",{className:"t"},i.text.length>110?i.text.slice(0,107)+"...":i.text),
          i.exists?h("span",{className:"chip ex"},"exists"):null,...(i.records||[]).map((r)=>h("span",{className:"chip",key:r},r.replace(/^validation-/,""))))},style:{border:"none",background:"transparent",padding:0,width:"auto"}});
        edges.push({type:"straight",id:"e-"+i.id,source:"d-"+d,target:i.id,style:{stroke:col,strokeOpacity:.5}});
        (i.departments||[]).slice(1).forEach((d2)=>edges.push({type:"straight",id:"e-"+i.id+"-"+d2,source:i.id,target:"d-"+d2,style:{stroke:col,strokeOpacity:.25,strokeDasharray:"2 4"}}));
      });
    });
  }
  return {nodes,edges};
}
function side(s){
  const tot=s.summary.ideas||1,sm=s.summary;
  return '<h1>'+esc(s.name)+'</h1><div class="meta">'+esc(s.phase)+' phase · '+sm.ideas+' ideas · tagged by '+esc(s.meta.tagged_by)+' with Naive conventions</div>'+
  '<div class="bar">'+Object.entries(sm.by_pillar).map(([p,n])=>'<span title="'+p+' '+n+'" style="width:'+(100*n/tot)+'%;background:var(--'+p+')"></span>').join("")+'</div>'+
  '<div class="meta">'+Object.entries(sm.by_pillar).map(([p,n])=>'<b style="color:var(--'+p+')">'+p+'</b> '+n).join(" · ")+'</div>'+
  '<h2>Where the ideas cluster</h2><ul>'+sm.strengths.map((x)=>'<li>'+esc(x.department.replace(/-/g," "))+' <span class="n">'+x.ideas+' ideas, '+Math.round(x.share*100)+'%</span></li>').join("")+'</ul>'+
  '<h2>Never mentioned</h2><ul>'+(sm.unasked.length?sm.unasked.map((x)=>'<li>'+esc(x.record)+': '+esc(x.about)+'</li>').join(""):'<li>Every founder record has at least one idea</li>')+'</ul>'+
  '<h2>Departments with no ideas</h2><div class="meta">'+Object.entries(sm.by_department).filter(([,n])=>!n).map(([d])=>esc(d.replace(/-/g," "))).join(", ")+'</div>'+
  (sm.gaps.length?'<h2>Needed this phase, not in the dump</h2><ul>'+sm.gaps.map((g)=>'<li>'+esc(g.department)+'</li>').join("")+'</ul>':'')+
  '<h2>Does a product exist?</h2><div>'+esc(sm.product.reading)+'</div><ul>'+sm.product.exists.map((x)=>'<li>'+esc(x.id)+': '+esc(x.text)+'</li>').join("")+'</ul>'+
  '<h2>Next</h2><div><a href="/'+location.search+'">The decision board</a> ranks what the founder decides first.</div>';
}
let last="";
function App(){
  const [g,setG]=React.useState({nodes:[],edges:[]});
  React.useEffect(()=>{const tick=async()=>{try{const s=await (await fetch("ideas.json"+location.search,{cache:"no-store"})).json();
    if(s.waiting||s.error){document.querySelector("#side .meta").textContent=s.waiting||s.error;return;}
    const key=JSON.stringify(s.ideas);if(key===last)return;last=key;document.getElementById("side").innerHTML=side(s);setG(layout(s));}catch(e){}};tick();const t=setInterval(tick,2000);return()=>clearInterval(t);},[]);
  return h(Flow,{nodes:g.nodes,edges:g.edges,fitView:true,minZoom:.1,nodesDraggable:true,key:g.nodes.length},h(RF.Background,{gap:24,size:1}),h(RF.Controls,null));
}
ReactDOM.createRoot(document.getElementById("flow")).render(h(App));
</script></body></html>`;

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
</style></head><body><header><h1 id="title">Decision board</h1><span class="meta" id="meta"></span><a class="meta" href="/map">Idea map</a></header><div class="kit"><section><h2>The kit for this phase (from need-now)</h2><ul id="kit"></ul></section></div><main id="cols"></main>
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
      (d.why&&d.why.length?'<div class="why">Why now: '+esc(d.why.join("; "))+'</div>':'')+
      (d.rank!=null&&d.action?'<div class="why">'+(d.action.kind==="write"?'To do: ':'Settle: <code>')+esc(d.action.command)+(d.action.kind==="write"?'':'</code>')+'</div>':'')+'</div>').join("")+'</section>':"";}).join("");
    document.getElementById("log").innerHTML=s.log.map((e)=>'<tr><td>'+esc(new Date(e.at).toLocaleTimeString())+'</td><td>'+esc(e.activity)+'</td><td>'+esc(e.entity)+'</td><td>'+esc(e.who)+' via '+esc(e.via)+'</td></tr>').join("");
  }catch(e){document.getElementById("meta").textContent="Lost the board's server.";}
}
tick();setInterval(tick,1500);
</script></body></html>`;

export function serve(p = port, id = venture) {
  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/state.json") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(state(u.searchParams.get("venture") ?? id))); return; }
    if (u.pathname === "/ideas.json") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(ideas(u.searchParams.get("venture") ?? id))); return; }
    if (u.pathname === "/map") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(MAP_PAGE); return; }
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
