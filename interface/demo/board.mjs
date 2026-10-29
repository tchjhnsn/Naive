#!/usr/bin/env node
// The decision board (EE-054, EE-058): a live page of one venture's decisions, by what renders now,
// with provenance as it happens, at /map the founder's idea map on one canvas (EE-059), at /graph the
// idea graph (EE-060), at /kanban the ideas routed into the framework and the docket as boards (EE-061), at /site
// site presence and the sitemap planner (EE-062 to EE-064), and at /package the venture package (EE-067). Local
// only: it binds to 127.0.0.1 and reads the workspace in
// MENTURA_WORKSPACE (the default is this repository's instance/). No dependencies: the map's React
// Flow is fetched once from unpkg and cached in ~/.cache/naive-board.
//
//   node interface/demo/board.mjs [--venture <id>] [--port 4331]

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { routes, ventureDir, ventures } from "../router.mjs";
import { decisions } from "../../schema/decisions.mjs";
import { CONVENTIONS, MAP, parse, summary } from "../../purpose/frameworks/idea-map/ideamap.mjs";
import { GRAPH } from "../../purpose/frameworks/idea-map/graph.mjs";
import { route } from "../../purpose/frameworks/idea-map/route.mjs";
import { scan } from "../harness/site.mjs";
import { MATRIX } from "../../operations/marketing/site/presence.mjs";
import { plan } from "../../operations/marketing/site/plan.mjs";
import { packages, write as writePackage, OUT as PACKAGE } from "../../schema/packages.mjs";
import { ventureFile } from "../../schema/venture-paths.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const port = Number(arg("port", 4331));
const venture = arg("venture", ventures()[0]?.id);

function state(id) {
  const dir = ventureDir(id);
  if (!dir) return { error: `no venture ${id}` };
  const log = existsSync(join(ventureFile(dir, "provenance.jsonl"))) ? readFileSync(join(ventureFile(dir, "provenance.jsonl")), "utf8").trim().split("\n").filter(Boolean).slice(-8).map((l) => JSON.parse(l)).reverse() : [];
  // The kit for now (EE-028): what need-now says this venture needs in its phase, and which kit holds it.
  const nn = spawnSync("node", [new URL("../../schema/need-now.mjs", import.meta.url).pathname, dir, "--json"], { encoding: "utf8" });
  const kitOf = new Map(routes().filter((r) => r.record).map((r) => [r.record, { kit: r.kit, route: r.route.replace(/\/\[id\]$/, "") }]));
  const rows = nn.status === 0 ? JSON.parse(nn.stdout).rows : [];
  const kit = rows.filter((r) => r.now >= 0.5 || r.status === "coming soon").map((r) => ({ type: r.type, status: r.status, now: r.now, next: r.next, why: r.why, ...(kitOf.get(r.type) ?? {}) }));
  // Money (EE-070): only the summary, never the transactions stream; the source stays the system of record.
  const money = existsSync(join(ventureFile(dir, "money/_summary.json"))) ? JSON.parse(readFileSync(join(ventureFile(dir, "money/_summary.json")), "utf8")) : null;
  return { ...decisions(dir), kit, money, log: log.map((e) => ({ at: e.at, activity: e.activity, entity: e.entity, who: `${e.agent?.kind ?? "?"}${e.agent?.id ? ` ${e.agent.id}` : ""}`, via: e.agent?.via })) };
}

// The idea map (EE-059): the founder's ideas on one canvas, by pillar and department.
function ideas(id) {
  const dir = ventureDir(id);
  if (!dir) return { error: `no venture ${id}` };
  if (!existsSync(ventureFile(dir, MAP))) return { venture: id, waiting: "no idea dump yet" };
  const v = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
  const map = parse(readFileSync(ventureFile(dir, MAP), "utf8"));
  return { venture: id, name: v.name, phase: v.phase, meta: map.meta, ideas: map.ideas, summary: summary(map, v.phase), pillars: CONVENTIONS.pillars, departments: CONVENTIONS.departments };
}

const MAP_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Idea map</title><link rel="stylesheet" href="/vendor/reactflow@11.11.4/dist/style.css">
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
<script src="/vendor/react@18.3.1/umd/react.production.min.js"></script>
<script src="/vendor/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="/vendor/reactflow@11.11.4/dist/umd/index.js"></script>
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
    });
    // Ideas spread evenly across the pillar's sector, in department order, on two alternating rings,
    // so a crowded department never stacks its cards on a neighbour's.
    const mine=depts.flatMap((d)=>(byDept[d]||[]).map((i)=>[d,i])),n=mine.length;
    mine.forEach(([d,i],k)=>{
      const ia=a-60+(k+.5)*120/Math.max(1,n),ip=P(ia,760+(k%2)*230);
      nodes.push({id:i.id,position:{x:ip.x-110,y:ip.y-30},data:{label:h("div",{className:"node idea",style:{borderColor:col},title:i.text},
        h("span",{className:"t"},i.text.length>110?i.text.slice(0,107)+"...":i.text),
        i.exists?h("span",{className:"chip ex"},"exists"):null,...(i.records||[]).map((r)=>h("span",{className:"chip",key:r},r.replace(/^validation-/,""))))},style:{border:"none",background:"transparent",padding:0,width:"auto"}});
      edges.push({type:"straight",id:"e-"+i.id,source:"d-"+d,target:i.id,style:{stroke:col,strokeOpacity:.5}});
      (i.departments||[]).slice(1).forEach((d2)=>edges.push({type:"straight",id:"e-"+i.id+"-"+d2,source:i.id,target:"d-"+d2,style:{stroke:col,strokeOpacity:.25,strokeDasharray:"2 4"}}));
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
  '<h2>Next</h2><div><a href="/graph'+location.search+'">The idea graph</a> orders the ideas by what builds on what. <a href="/'+location.search+'">The decision board</a> ranks what the founder decides first.</div>';
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

// The idea graph (EE-060): the structured form of the map, left to right by dependency, lanes and
// ideas top down by signal.
function graph(id) {
  const dir = ventureDir(id);
  if (!dir) return { error: `no venture ${id}` };
  if (!existsSync(ventureFile(dir, GRAPH))) return { venture: id, waiting: "no idea graph yet" };
  return { venture: id, name: JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).name, ...JSON.parse(readFileSync(ventureFile(dir, GRAPH), "utf8")) };
}

const GRAPH_PAGE = MAP_PAGE.replace("<title>Idea map</title>", "<title>Idea graph</title>").replace(/<script>\nconst h=React[\s\S]*<\/script><\/body>/, `<script>
const h=React.createElement, RF=window.ReactFlow, Flow=RF.default||RF.ReactFlow;
const esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const COLW=300,ROWH=118,GAP=46;
function layout(g){
  const nodes=[],edges=[],at={};let y=0;
  const byId=Object.fromEntries(g.nodes.map((n)=>[n.id,n]));
  g.lanes.forEach((l)=>{
    const cols={};l.ideas.map((i)=>byId[i]).sort((a,b)=>b.signal-a.signal).forEach((n)=>{(cols[n.depth]=cols[n.depth]||[]).push(n);});
    const rows=Math.max(...Object.values(cols).map((c)=>c.length));
    nodes.push({id:l.id,position:{x:-250,y:y},data:{label:h("div",{className:"node lane "+l.mode},h("b",null,l.mode==="sync"?"In order":"On its own"),h("span",{className:"t"},(l.department||"").replace(/-/g," ")+" · signal "+l.signal))},style:{border:"none",background:"transparent",padding:0,width:"auto"},draggable:false,selectable:false});
    Object.entries(cols).forEach(([d,ns])=>ns.forEach((n,k)=>{at[n.id]=1;
      const col=getComputedStyle(document.documentElement).getPropertyValue("--"+(n.pillar||"business")).trim();
      nodes.push({id:n.id,position:{x:d*COLW,y:y+k*ROWH},data:{label:h("div",{className:"node idea",style:{borderColor:col},title:n.text+"\\nhash "+n.hash},
        h("span",{className:"sig",style:{width:Math.round(n.signal*100)+"%",background:col}}),
        h("span",{className:"t"},n.text.length>100?n.text.slice(0,97)+"...":n.text),
        h("span",{className:"chip"},n.id+" · "+n.signal),h("span",{className:"chip mono"},n.hash.slice(0,7)),n.exists?h("span",{className:"chip ex"},"exists"):null)},
        sourcePosition:"right",targetPosition:"left",style:{border:"none",background:"transparent",padding:0,width:"auto"}});
    }));
    y+=rows*ROWH+GAP;
  });
  g.edges.forEach((e)=>edges.push({id:e.from+">"+e.to,source:e.from,target:e.to,type:"smoothstep",animated:false,markerEnd:{type:"arrowclosed"},style:{strokeWidth:1+2*e.p}}));
  return {nodes,edges};
}
function side(g){
  const top=g.nodes.slice(0,5);
  return '<h1>'+esc(g.name)+': idea graph</h1><div class="meta">'+g.nodes.length+' ideas · '+g.edges.length+' dependencies judged by '+esc(g.judged_by)+' · Merkle root <code>'+esc(g.root)+'</code></div>'+
  '<h2>Develop next (highest signal, nothing before it)</h2><ul>'+g.next.map((id)=>{const n=g.nodes.find((x)=>x.id===id);return '<li>'+esc(id)+' <span class="n">'+n.signal+'</span>: '+esc(n.text)+'</li>';}).join("")+'</ul>'+
  '<h2>Lanes</h2><ul>'+g.lanes.map((l)=>'<li><b>'+(l.mode==="sync"?"In order":"On its own")+'</b> '+esc((l.department||"").replace(/-/g," "))+' <span class="n">'+l.ideas.length+' ideas, signal '+l.signal+'</span></li>').join("")+'</ul>'+
  '<h2>Highest signal</h2><ul>'+top.map((n)=>'<li>'+esc(n.id)+' <span class="n">'+n.signal+' = need '+n.parts.need+', unblocks '+n.parts.unblocks+', concrete '+n.parts.concrete+', emphasis '+n.parts.emphasis+'</span></li>').join("")+'</ul>'+
  '<h2>How to read it</h2><div class="meta">Left to right: an idea builds on the ideas to its left. Top down: higher signal first. A lane in order moves step by step; a lane on its own can move any time, beside the others. Each idea\\'s hash covers its text and everything it builds on.</div>'+
  '<h2>Next</h2><div><a href="/map'+location.search+'">The idea map</a> · <a href="/kanban'+location.search+'">The idea routes</a> · <a href="/'+location.search+'">The decision board</a></div>';
}
let last="";
function App(){
  const [g,setG]=React.useState({nodes:[],edges:[]});
  React.useEffect(()=>{const tick=async()=>{try{const s=await (await fetch("graph.json"+location.search,{cache:"no-store"})).json();
    if(s.waiting||s.error){document.querySelector("#side .meta").textContent=s.waiting||s.error;return;}
    if(s.root===last)return;last=s.root;document.getElementById("side").innerHTML=side(s);setG(layout(s));}catch(e){}};tick();const t=setInterval(tick,2000);return()=>clearInterval(t);},[]);
  return h(Flow,{nodes:g.nodes,edges:g.edges,fitView:true,minZoom:.1,key:g.nodes.length},h(RF.Background,{gap:24,size:1}),h(RF.Controls,null));
}
ReactDOM.createRoot(document.getElementById("flow")).render(h(App));
</script></body>`).replace(".react-flow__attribution{display:none}", ".react-flow__attribution{display:none}.node.idea{width:240px}.sig{display:block;height:3px;border-radius:2px;margin-bottom:6px}.chip.mono{font-family:ui-monospace,monospace}.node.lane{width:200px;border-style:dashed}.node.lane b{display:block}.node.lane.sync{border-color:var(--product)}.node.lane .t{color:var(--muted);font-size:11px}");

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
</style></head><body><header><h1 id="title">Decision board</h1><span class="meta" id="meta"></span><a class="meta" href="/map">Idea map</a><a class="meta" href="/graph">Idea graph</a><a class="meta" href="/kanban">Idea routes</a><a class="meta" href="/site">Site presence</a></header><div class="kit"><section><h2>The kit for this phase (from need-now)</h2><ul id="kit"></ul></section><section id="money" hidden><h2 id="money-h">Money</h2><ul id="money-l"></ul></section></div><main id="cols"></main>
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
    const m=s.money,box=document.getElementById("money");box.hidden=!m;
    if(m){const $=(x)=>(x.amount/100).toLocaleString(undefined,{style:"currency",currency:x.currency,maximumFractionDigits:0});
      document.getElementById("money-h").textContent="Money, from "+(m.source==="rho"?"Rho":"Rho's sandbox")+(m.business?" ("+m.business+")":"")+": the system of record";
      document.getElementById("money-l").innerHTML=[["Cash",$(m.cash)],["Monthly in",$(m.monthly_inflow)],["Monthly out",$(m.monthly_outflow)],["Monthly net",$(m.monthly_net)],["Runway",m.runway_months!=null?m.runway_months+" months":"not limited by burn"],["As of",new Date(m.as_of).toLocaleDateString()+" · synced "+new Date(m.synced_at).toLocaleString()]].map(([k,v])=>'<li><b>'+esc(k)+'</b>'+esc(v)+'</li>').join("");}
    document.getElementById("cols").innerHTML=COLS.map(([k,label])=>{const xs=ds.filter((d)=>d.render===k);return xs.length?'<section><h2>'+label+' ('+xs.length+')</h2>'+xs.map((d)=>
      '<div class="card '+k+'">'+(d.rank!=null?'<span class="rank">#'+(ranked.indexOf(d.id)+1)+'</span>':'')+'<div class="q">'+esc(d.question)+'</div><div class="id">'+esc(d.id)+' · '+esc(d.layer)+' · '+esc(d.boundary)+'</div>'+
      (d.awaiting?'<span class="tag ask">agent wording, awaiting approval</span>':'')+
      (d.lane==="async"&&k!=="done"?'<span class="tag">can move on its own</span>':'')+
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


// The routes (EE-061): where each idea went in the framework, and the decision docket, as two Kanban
// boards. Plain columns, not React Flow: a board is a list per stage, and the canvas is for structure.
function routesOf(id) {
  const dir = ventureDir(id);
  if (!dir) return { error: `no venture ${id}` };
  return route(dir);
}

const PACKAGE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Venture package</title><style>
:root{--bg:#fbfaf7;--fg:#1d1c1a;--muted:#6b675f;--line:#e4e0d8;--card:#fff;--col:#f2efe9;--accent:#1f6feb;--ok:#1a7f37;--low:#9a6700;--miss:#cf222e}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ecebe6;--muted:#a19d94;--line:#2e2d2a;--card:#1c1b19;--col:#191917;--accent:#58a6ff;--ok:#56d364;--low:#e3b341;--miss:#ff7b72}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:18px 24px;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:baseline;flex-wrap:wrap}h1{font-size:20px;margin:0}.meta{color:var(--muted);font-size:13px}a{color:var(--accent)}
.pipe{display:flex;gap:6px;padding:14px 24px;flex-wrap:wrap;align-items:stretch}.step{background:var(--col);border-radius:8px;padding:7px 10px;min-width:118px;border-top:3px solid var(--line)}.step.done{border-top-color:var(--ok)}.step.part{border-top-color:var(--low)}.step .n{font-size:11px;color:var(--muted)}.step .l{font-weight:600}.step .d{font-size:12px;color:var(--muted)}.arrow{align-self:center;color:var(--muted)}
.wrap{display:grid;grid-template-columns:1fr 320px;gap:16px;padding:0 24px 28px}@media (max-width:900px){.wrap{grid-template-columns:1fr}}
h2{font-size:15px;margin:16px 0 4px}.sub{color:var(--muted);font-size:13px;margin:0 0 8px}.cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.pkg{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--line);border-radius:10px;padding:10px 12px}.pkg.complete{border-top-color:var(--ok)}.pkg.review{border-top-color:var(--accent)}.pkg.building{border-top-color:var(--low)}.pkg.held,.pkg.next{opacity:.65}
.t{font-weight:600}.for{font-size:12px;color:var(--muted)}.bar{height:6px;background:var(--col);border-radius:3px;margin:8px 0 4px}.bar span{display:block;height:100%;background:var(--accent);border-radius:3px}
.rec{font-size:12.5px;display:flex;gap:6px;align-items:baseline;margin-top:5px}.dot{width:8px;height:8px;border-radius:50%;flex:none;transform:translateY(-1px)}.dot.confirmed{background:var(--ok)}.dot.agent,.dot.draft{background:var(--accent)}.dot.missing{background:transparent;border:1.5px solid var(--miss)}
.opt{color:var(--muted)}.nx{font-size:11.5px;color:var(--muted);margin-left:14px}.tag{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:99px;padding:1px 7px;margin-left:6px;color:var(--muted)}.tag.now{border-color:var(--ok);color:var(--ok)}
.un{font-size:12px;margin-top:8px;padding-top:6px;border-top:1px dashed var(--line);color:var(--muted)}
aside{background:var(--col);border-radius:10px;padding:12px;align-self:start}.qq{font-size:12.5px;margin:0 0 8px}.qq b{font-weight:600}.big{font-size:34px;font-weight:700}button{font:inherit;padding:7px 12px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:#fff;cursor:pointer}
</style></head><body><header><h1 id="title">Venture package</h1><span class="meta" id="meta"></span><a class="meta" href="/map">Idea map</a><a class="meta" href="/kanban">Idea routes</a><a class="meta" href="/">Decision board</a><a class="meta" href="/site">Site presence</a></header>
<div class="pipe" id="pipe"></div>
<div class="wrap"><main>
<h2>Core packages open now</h2><p class="sub">Where the venture's records live. A package is complete when you have confirmed its records and everything it reads; then its automation may run.</p><div class="cols" id="now"></div>
<h2>Handoff packages</h2><p class="sub">Snapshots of core packages for one receiver. Ready when every package they draw on is complete.</p><div class="cols" id="handoff"></div>
<h2>Next phase and held</h2><div class="cols" id="later"></div></main><aside id="side"></aside></div>
<script>
const esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ST={complete:"complete",review:"waiting for your review",building:"still being written"};
const MK={confirmed:"confirmed",agent:"agent draft, to review",draft:"draft, to accept",missing:"not written"};
let T={};
const pct=(x)=>Math.round(x*100)+"%";
function rec(r){
  const move=r.role==="reads"?'<span class="tag">read from '+esc(T[r.home]||r.home)+'</span>':r.moves==="now"?'<span class="tag now">moves now</span>':r.moves==="waits"?'<span class="tag">waits on '+esc((r.waits_on_titles||r.waits_on).join(", "))+'</span>':'';
  return '<div class="rec"><span class="dot '+r.status+'"></span><span class="'+(r.role==="optional"||r.role==="reads"?'opt':'')+'">'+esc(r.title)+(r.role==="optional"?' (optional)':'')+' <span class="opt">· '+MK[r.status]+'</span>'+move+'</span></div>'+(r.role!=="reads"&&r.status!=="confirmed"&&r.moves==="now"&&r.route&&r.route.next?'<div class="nx">Next: '+esc(r.route.next.do)+'</div>':'');
}
function core(p,written){
  if(p.in!=="now")return '<div class="pkg '+p.in+'"><div class="t">'+esc(p.title)+'<span class="tag">'+(p.in==="next"?'next phase':'held')+' · fit '+p.fit+'</span></div><div class="for">'+esc(p.why)+'</div></div>';
  return '<div class="pkg '+p.state+'"><div class="t">'+esc(p.title)+'<span class="tag">'+ST[p.state]+'</span></div><div class="for">'+esc(p.purpose)+'</div><div class="bar"><span style="width:'+pct(p.progress)+'"></span></div><div class="for">'+pct(p.progress)+' · fit '+p.fit+(written&&written.includes(p.id)?' · <a href="package/'+p.id+'.md" target="_blank">read the document</a>':'')+'</div>'+
    p.records.map(rec).join("")+'<div class="un">Unlocks: '+esc(p.unlocks.join(", "))+(p.planned.length?'<br>Not in Naive yet: '+esc(p.planned.join(", ")):'')+'</div></div>';
}
function handoff(p){
  return '<div class="pkg '+(p.in==="now"?p.state:p.in)+'"><div class="t">'+esc(p.title)+'<span class="tag">'+(p.in==="now"?(p.state==="complete"?'ready':'waits on '+esc(p.waits_on.join(", "))):(p.in==="next"?'next phase':'held')+' · fit '+p.fit)+'</span></div><div class="for">For '+esc(p.for)+'. Draws on '+esc(p.from.map((x)=>T[x]||x).join(", "))+'.</div>'+
    (p.in==="now"?'<div class="bar"><span style="width:'+pct(p.progress)+'"></span></div>':'<div class="for" style="margin-top:4px">'+esc(p.why)+'</div>')+'<div class="un">Unlocks: '+esc(p.unlocks.join(", "))+'</div></div>';
}
async function load(){
  const r=await (await fetch("package.json"+location.search,{cache:"no-store"})).json();
  if(r.error){document.getElementById("meta").textContent=r.error;return;}
  T={};r.core.forEach((p)=>T[p.id]=p.title);r.not_modeled.forEach((p)=>T[p.id]=p.title);
  document.getElementById("title").textContent="Venture package: "+r.name;
  document.getElementById("meta").textContent=r.phase+" phase · "+pct(r.progress)+" across the open packages"+(r.versions&&r.versions.length?" · v"+r.versions.at(-1).version:"");
  document.getElementById("pipe").innerHTML=r.pipeline.map((s,i)=>(i?'<span class="arrow">&rarr;</span>':'')+'<div class="step '+s.state+'"><div class="n">'+(i+1)+'</div><div class="l">'+(s.href?'<a href="'+s.href+'">'+esc(s.label)+'</a>':esc(s.label))+'</div><div class="d">'+esc(s.detail)+'</div></div>').join("");
  document.getElementById("now").innerHTML=r.core.filter((p)=>p.in==="now").map((p)=>core(p,r.written)).join("")||'<div class="meta">None.</div>';
  document.getElementById("handoff").innerHTML=r.handoff.filter((p)=>p.in!=="held").map(handoff).join("")||'<div class="meta">None fits yet: '+esc(r.handoff.map((p)=>p.title).join(", "))+' are held.</div>';
  document.getElementById("later").innerHTML=r.core.filter((p)=>p.in!=="now").map((p)=>core(p)).join("")+r.handoff.filter((p)=>p.in==="held").map(handoff).join("");
  document.getElementById("side").innerHTML='<div class="big">'+Math.round(r.progress*100)+'<small style="font-size:14px">%</small></div><div class="meta">Complete, so their automation may run: '+(r.complete.length?esc(r.complete.join(", ")):"none yet")+'</div>'+
    '<p><button id="w">'+(r.written?'Write a new view':'Write the package view')+'</button></p>'+
    '<h2>What decided this</h2>'+r.situation.questions.map((q)=>'<div class="qq">'+esc(q.ask)+' <b>'+(q.value==null?'open, yours to answer':q.value?'yes':'no')+'</b><br><span class="meta">'+(q.by==="records"?'from the records':q.by==="jev"?'Jev, '+q.p:'the records do not say')+'</span></div>').join("")+
    (r.versions&&r.versions.length?'<h2>Versions</h2>'+r.versions.slice().reverse().map((v)=>'<div class="qq"><b>v'+v.version+'</b> '+esc(v.phase)+': '+esc(v.why)+'<br><span class="meta">'+esc(v.at)+' · tag '+esc(v.tag)+'</span></div>').join(""):'')+
    '<h2>Assumed</h2><div class="qq">'+esc(r.assumes.note)+'</div>'+
    '<h2>Not included</h2><div class="qq">Agents. '+esc(r.enhancements.agents)+'</div>'+r.not_modeled.map((x)=>'<div class="qq">'+esc(x.title)+'. '+esc(x.why)+'</div>').join("");
  document.getElementById("w").onclick=async()=>{await fetch("package/write"+location.search,{method:"POST"});load();};
}
load();
</script></body></html>`;

const KANBAN_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Idea routes</title><style>
:root{--bg:#fbfaf7;--fg:#1d1c1a;--muted:#6b675f;--line:#e4e0d8;--card:#fff;--col:#f2efe9;--routed:#6b675f;--drafted:#1f6feb;--yours:#bf3989;--waiting:#9a6700;--done:#1a7f37}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ecebe6;--muted:#a19d94;--line:#2e2d2a;--card:#1c1b19;--col:#191917;--routed:#a19d94;--drafted:#58a6ff;--yours:#f778ba;--waiting:#e3b341;--done:#56d364}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:18px 24px;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:baseline;flex-wrap:wrap}h1{font-size:20px;margin:0}.meta{color:var(--muted);font-size:13px}a{color:var(--drafted)}
h2.board{font-size:15px;margin:20px 24px 4px}.sub{margin:0 24px 10px;color:var(--muted);font-size:13px;max-width:760px}
.cols{display:grid;grid-template-columns:repeat(5,minmax(220px,1fr));gap:12px;padding:0 24px 8px;overflow-x:auto}
.col{background:var(--col);border-radius:10px;padding:10px;min-height:120px}.col h3{font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px;display:flex;justify-content:space-between}
.card{background:var(--card);border:1px solid var(--line);border-top:3px solid var(--line);border-radius:8px;padding:9px 10px;margin-bottom:8px}
.card.routed{border-top-color:var(--routed)}.card.drafted{border-top-color:var(--drafted)}.card.yours{border-top-color:var(--yours)}.card.waiting{border-top-color:var(--waiting)}.card.done{border-top-color:var(--done)}
.t{font-weight:600}.r{font:11px ui-monospace,monospace;color:var(--muted)}.q{font-size:13px}
.chip{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:99px;padding:1px 6px;margin:4px 3px 0 0;color:var(--muted);font-family:ui-monospace,monospace}
.tag{display:inline-block;font-size:11px;border-radius:99px;padding:1px 6px;margin:4px 3px 0 0;border:1px solid var(--line);color:var(--muted)}.tag.async{border-color:var(--done);color:var(--done)}
.next{font-size:12px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)}.next b{color:var(--muted);font-weight:600}code{font-size:11px;word-break:break-all}
.foot{padding:4px 24px 28px;color:var(--muted);font-size:13px}
.pk{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:0 24px 6px}.pb{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.pb .bar{height:8px;background:var(--col);border-radius:4px;margin:6px 0 3px;overflow:hidden}.pb .bar span{display:block;height:100%;background:var(--done);border-radius:4px;transition:width .6s}.pb.next{opacity:.6}
</style></head><body><header><h1 id="title">Idea routes</h1><span class="meta" id="meta"></span><a class="meta" href="/map">Idea map</a><a class="meta" href="/graph">Idea graph</a><a class="meta" href="/site">Site presence</a><a class="meta" href="/package">Venture package</a><a class="meta" href="/">Decision board</a></header>
<h2 class="board">The packages taking shape</h2><p class="sub">Your ideas land in the venture's packages. Each bar climbs as records are written and you confirm them; at 100% the package is complete and its automation may run. <a href="/package">Open the venture package</a></p><div class="pk" id="pkgs"></div>
<h2 class="board">From ideas to the framework</h2><p class="sub">Each card is a record the founder's ideas feed. It moves left to right as an agent drafts it and the founder settles it; the next step comes from the framework, not from a guess.</p><div class="cols" id="dest"></div>
<div class="foot" id="loose"></div>
<h2 class="board">The decision docket</h2><p class="sub">Every open decision, by what moves it next, traced to the ideas it comes from. Ranked ones show their place in line.</p><div class="cols" id="docket"></div>
<script>
const esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let text={},PK={};const chip=(id)=>'<span class="chip" title="'+esc(text[id])+'">'+esc(id)+'</span>';
const laneTag=(x)=>x.lane==="async"?'<span class="tag async">on its own</span>':'<span class="tag">in order'+(x.order?' #'+x.order:'')+'</span>';
const board=(el,stages,items,card)=>{document.getElementById(el).innerHTML=stages.map(([k,l])=>{const xs=items.filter((x)=>x.stage===k);return '<div class="col"><h3><span>'+esc(l)+'</span><span>'+xs.length+'</span></h3>'+xs.map(card).join("")+'</div>';}).join("");};
async function tick(){
  try{
    const s=await (await fetch("routes.json"+location.search,{cache:"no-store"})).json();
    if(s.error||s.waiting){document.getElementById("meta").textContent=s.error||s.waiting;return;}
    text={};s.destinations.forEach((d)=>d.ideas.forEach((i)=>text[i.id]=i.text));s.loose.forEach((i)=>text[i.id]=i.text);
    document.getElementById("title").textContent="Idea routes: "+(s.name||s.venture);
    document.getElementById("meta").textContent=s.phase+" phase · "+s.destinations.length+" destinations · updated "+new Date().toLocaleTimeString();
    try{const k=await (await fetch("package.json"+location.search,{cache:"no-store"})).json();if(k.core){PK={};k.core.forEach((p)=>PK[p.id]=p.title);document.getElementById("pkgs").innerHTML=k.core.filter((p)=>p.in!=="held").map((p)=>'<div class="pb '+p.in+'"><div class="t">'+esc(p.title)+'</div><div class="bar"><span style="width:'+Math.round(p.progress*100)+'%"></span></div><div class="r">'+(p.in==="now"?Math.round(p.progress*100)+'% · '+(p.moving.length?p.moving.length+' moving now':'nothing can move yet'):'opens next phase')+'</div></div>').join("");}}catch(e){}
    board("dest",s.stages,s.destinations,(x)=>'<div class="card '+x.stage+'"><div class="t">'+esc(x.title)+'</div><div class="r">'+(x.package?esc(PK[x.package]||x.package)+' package · ':'')+esc(x.route)+(x.signal!=null?' · signal '+x.signal:'')+'</div>'+laneTag(x)+'<div>'+x.ideas.map((i)=>chip(i.id)).join("")+'</div>'+
      (x.next?'<div class="next"><b>Next, '+esc(x.next.by||"nobody yet")+':</b> '+esc(x.next.do)+(x.next.command?'<br><code>'+esc(x.next.command)+'</code>':'')+'</div>':'')+'</div>');
    document.getElementById("loose").innerHTML=(s.loose.length?'Loose, on the map only: '+s.loose.map((i)=>chip(i.id)).join(""):'')+(s.gaps.length?' · Nothing in the dump feeds: '+esc(s.gaps.map((g)=>g.title).join(", ")):'');
    const ranked=s.docket.filter((d)=>d.rank!=null).sort((a,b)=>b.rank-a.rank).map((d)=>d.id);
    board("docket",s.stages,s.docket.slice().sort((a,b)=>(b.rank??-1)-(a.rank??-1)),(d)=>'<div class="card '+d.stage+'">'+(d.rank!=null?'<span class="r" style="float:right">#'+(ranked.indexOf(d.id)+1)+'</span>':'')+'<div class="q">'+esc(d.question)+'</div><div class="r">'+esc(d.id)+(d.destination?' · '+esc(d.destination):'')+'</div>'+
      (d.lane==="async"&&d.stage!=="done"?'<span class="tag async">on its own</span>':'')+(d.held_by?'<span class="tag">held by '+esc(d.held_by)+'</span>':'')+(d.awaiting?'<span class="tag">agent wording</span>':'')+
      (d.ideas.length?'<div>'+(d.cited?'':'<span class="tag">via its destination</span>')+d.ideas.map(chip).join("")+'</div>':'')+'</div>');
  }catch(e){document.getElementById("meta").textContent="Lost the board's server.";}
}
tick();setInterval(tick,2000);
</script></body></html>`;

// Site presence (EE-062, EE-063): a founder pastes their website and sees its sitemap, each route
// rated on what the audiences it must speak to need from it, with the reasons. Local, like the rest of the board.
const SITE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Site presence</title><link rel="stylesheet" href="/vendor/reactflow@11.11.4/dist/style.css"><style>
:root{--bg:#fbfaf7;--fg:#1d1c1a;--muted:#6b675f;--line:#e4e0d8;--card:#fff;--col:#f2efe9;--accent:#1f6feb;--miss:#c4321f;--low:#9a6700;--ok:#1a7f37}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#ecebe6;--muted:#a19d94;--line:#2e2d2a;--card:#1c1b19;--col:#191917;--accent:#58a6ff;--miss:#ff7b6b;--low:#e3b341;--ok:#56d364}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:16px 24px;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:baseline;flex-wrap:wrap}h1{font-size:20px;margin:0}.meta{color:var(--muted);font-size:13px}a{color:var(--accent)}
form{padding:14px 24px;display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:start}@media (max-width:860px){form{grid-template-columns:1fr}}
input[type=url],textarea{width:100%;font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}textarea{height:40px;resize:vertical}
.flags{display:flex;gap:12px;flex-wrap:wrap;align-items:center}button{font:inherit;font-weight:600;padding:9px 16px;border:0;border-radius:8px;background:var(--accent);color:#fff;cursor:pointer}button:disabled{opacity:.5}label{color:var(--muted);font-size:13px}
#main{display:grid;grid-template-columns:1fr 380px;border-top:1px solid var(--line);height:78vh}@media (max-width:860px){#main{grid-template-columns:1fr;height:auto}#flow{height:60vh}}
#flow{min-height:0}aside{border-left:1px solid var(--line);padding:14px 16px;overflow:auto}aside h2{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}
.score{font-size:48px;font-weight:700;line-height:1}.score small{font-size:16px;color:var(--muted)}
.aud{display:grid;grid-template-columns:130px 1fr 32px;gap:3px 8px;align-items:center;font-size:12px}.bar{height:7px;background:var(--col);border-radius:4px;overflow:hidden}.bar span{display:block;height:100%;background:var(--accent)}.dim{opacity:.45}
.node{background:var(--card);color:var(--fg);border:1px solid var(--line);border-top:4px solid var(--line);border-radius:8px;padding:7px 9px;width:170px;font-size:13px;text-align:left;cursor:pointer}
.node.home{width:230px;border-width:2px}.node .p{font:11px ui-monospace,monospace;color:var(--muted);word-break:break-all}.node .t{font-weight:600}.node.unread{opacity:.6}.node.ghost{border-style:dashed;background:transparent}
.node .rt{float:right;font-weight:700}.node.r-ok{border-top-color:var(--ok)}.node.r-low{border-top-color:var(--low)}.node.r-miss{border-top-color:var(--miss)}.node.ghost{border-color:var(--miss)}
.band{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);background:transparent;border:none}
.it{border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:0 0 8px;background:var(--card)}.it .t{font-weight:600}.it.miss{border-left:4px solid var(--miss)}.it.low{border-left:4px solid var(--low)}.it.ok{border-left:4px solid var(--ok)}
.why{font-size:12px;color:var(--muted);margin-top:4px}.why b{color:var(--fg);font-weight:600}.fix{display:inline-block;font-size:11px;border-radius:99px;padding:1px 6px;border:1px solid var(--miss);color:var(--miss);margin-left:6px}
.icp{font-size:12px;background:var(--col);border-radius:8px;padding:8px 10px}.chip{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:99px;padding:1px 6px;margin:3px 3px 0 0}
.node.planned{border-top-color:var(--accent)}
.react-flow__attribution{display:none}.react-flow__handle{opacity:0;pointer-events:none}
</style></head><body><header><h1>Site presence</h1><span class="meta">Your sitemap, each route rated on what your audiences need from it, with the reasons</span><a class="meta" href="/kanban">Idea routes</a><a class="meta" href="/">Decision board</a></header>
<form id="f"><div><input type="url" id="url" placeholder="https://your-site.com" required><div class="flags" style="margin-top:8px"><label><input type="checkbox" id="raising"> raising</label><label><input type="checkbox" id="hiring"> hiring</label><label><input type="checkbox" id="contributors"> inviting contributors</label></div></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button id="go">Read my site</button><button type="button" id="plan" style="background:transparent;color:var(--accent);border:1px solid var(--accent)">Plan from my venture</button></div></form>
<div id="main"><div id="flow"></div><aside id="side"><div class="meta">Paste a link to your marketing site or your product.</div></aside></div>
<script src="/vendor/react@18.3.1/umd/react.production.min.js"></script>
<script src="/vendor/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="/vendor/reactflow@11.11.4/dist/umd/index.js"></script>
<script>
const h=React.createElement, RF=window.ReactFlow, Flow=RF.default||RF.ReactFlow;
const esc=(s)=>String(s??"").replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LABEL=__LABELS__;let R=null,setG=null;
const cls=(n)=>n.ghost?"ghost":n.rating==null?"unread":n.rating>=80?"r-ok":n.rating>=50?"r-low":"r-miss";
const itemOf=(id)=>R.items.find((x)=>x.id===id);
function evidence(x){return x.evidence.map((e)=>'<div class="why"><b>'+esc(LABEL[e.audience])+'</b> need '+e.need+' (weight '+e.weight+' x importance '+e.importance+'): '+esc(e.why)+'</div>').join("");}
function itemCard(x){return '<div class="it '+(x.score===1?'ok':x.score?'low':'miss')+'"><div class="t">'+esc(x.label)+(R.fix_first.includes(x.id)?'<span class="fix">fix first</span>':'')+'</div><div class="why">'+esc(x.note)+'</div>'+evidence(x)+'<div class="why">From the '+esc(x.record)+' record · needs to be '+esc(x.required)+'</div></div>';}
function overview(){
  const aud=Object.entries(R.audiences).sort((a,b)=>b[1].weight-a[1].weight).map(([k,v])=>'<span class="'+(v.weight<0.5?'dim':'')+'">'+esc(LABEL[k])+'</span><div class="bar '+(v.weight<0.5?'dim':'')+'"><span style="width:'+(v.score??0)+'%"></span></div><span class="'+(v.weight<0.5?'dim':'')+'">'+(v.score??"")+'</span>').join("");
  const t=R.icp.types.map((x)=>'<span class="chip">'+esc(x.label)+(x.p!=null?' '+x.p:'')+'</span>').join("");
  return '<div class="score">'+R.score+'<small>/100</small></div><div class="meta">'+esc(R.site)+' · '+R.pages.length+' pages read via '+esc(R.read_via)+', judged by '+esc(R.judged_by)+'</div>'+
    '<h2>Who the site is for</h2><div class="icp">'+(R.icp.says&&R.icp.says.length?R.icp.says.slice(0,4).map((x)=>'&ldquo;'+esc(x)+'&rdquo;').join("<br>"):esc(R.icp.text.slice(0,240)))+'<div class="meta">Read from the site: '+esc(R.icp.cite)+'</div>'+t+'</div>'+
    '<h2>By audience</h2><div class="aud">'+aud+'</div><div class="meta" style="margin-top:4px">Faded audiences are not a priority now, so they count little.</div>'+
    '<h2>Fix first</h2>'+(R.fix_first.length?R.fix_first.map((id)=>itemCard(itemOf(id))).join(""):'<div class="meta">Nothing urgent.</div>')+
    '<h2>Every item</h2>'+R.items.filter((x)=>!R.fix_first.includes(x.id)).map(itemCard).join("")+'<div class="meta">Click a route on the sitemap to see what belongs there.</div>';
}
function routePanel(n){
  const list=(ids,none)=>ids.length?ids.map((id)=>itemCard(itemOf(id))).join(""):'<div class="meta">'+none+'</div>';
  return '<a href="#" onclick="document.getElementById(\\'side\\').innerHTML=overview();return false">Back to the overview</a><h2>'+esc(n.ghost?'Suggested page':'Route')+'</h2><div class="t" style="font-weight:600">'+esc(n.label)+'</div><div class="meta">'+esc(n.path)+' · '+esc(n.type)+' page · '+esc(n.level)+(n.read?'':' · not read')+(n.rating!=null?' · rating '+n.rating:'')+'</div>'+
    (n.ghost?'<div class="why">Your priorities call for this page and the site has none.</div>':'')+
    '<h2>Belongs here, missing</h2>'+list(n.missing,n.read||n.ghost?'Nothing missing.':'Not read in this scan.')+
    '<h2>Belongs here, present</h2>'+list(n.expected.filter((id)=>n.found.includes(id)),'None.')+
    '<h2>Also found here</h2>'+list(n.found.filter((id)=>!n.expected.includes(id)),'None.');
}
// A sitemap, not a canvas of ideas: the home page on top, the pages in its navigation in one row,
// the pages linked elsewhere from it (the footer) in a row below, and each page's own routes listed
// under it. Unread routes of no known type fold into one "more" node per parent.
function layout(r){
  const nodes=[],edges=[],W=190,GAP=20,ROW=130;
  const kids={};r.sitemap.forEach((n)=>{if(n.parent!=null)(kids[n.parent]=kids[n.parent]||[]).push(n);});
  const keep=(n)=>n.read||n.ghost||n.planned||n.type!=="other";
  const card=(n)=>h("div",{className:"node "+(n.planned?"planned":cls(n))+(n.path==="/"?" home":"")},n.rating!=null?h("span",{className:"rt"},n.rating):null,h("div",{className:"t"},n.label.slice(0,40)),h("div",{className:"p"},n.path),
    n.planned?n.sections.map((x)=>h("div",{key:x.item,className:"p"},"<"+x.component+">"+(x.when?" *":""))):n.missing.length?h("div",{className:"p"},"missing: "+n.missing.join(", ")):null);
  const put=(n,x,y)=>{nodes.push({id:n.path,position:{x,y},data:{label:card(n),n},style:{border:"none",background:"transparent",padding:0,width:"auto"}});};
  const home=r.sitemap.find((n)=>n.path==="/");
  const top=(kids["/"]||[]);
  const col=(n,x,y)=>{put(n,x,y);let yy=y+ROW*0.75;const ks=(kids[n.path]||[]);const shown=ks.filter(keep).slice(0,4),more=ks.length-shown.length;
    shown.forEach((k)=>{put(k,x+16,yy);edges.push({id:n.path+">"+k.path,source:n.path,target:k.path,type:"smoothstep"});yy+=ROW*0.62;});
    if(more>0){nodes.push({id:n.path+"+more",position:{x:x+16,y:yy},data:{label:h("div",{className:"node unread"},"+"+more+" more routes")},style:{border:"none",background:"transparent",padding:0,width:"auto"}});edges.push({id:n.path+">more",source:n.path,target:n.path+"+more",type:"smoothstep"});yy+=ROW*0.62;}
    return yy;};
  const bands=[["nav","In the navigation"],["linked","Linked from the home page"]];
  let y=ROW*1.2;
  bands.forEach(([lvl,title])=>{
    let xs=top.filter((n)=>n.level===lvl||(lvl==="linked"&&n.level==="anywhere"));
    const shown=xs.filter(keep),hidden=xs.length-shown.length;
    if(!shown.length&&!hidden)return;
    nodes.push({id:"band-"+lvl,position:{x:0,y:y-34},data:{label:h("div",{className:"band"},title+" ("+xs.length+")")},style:{border:"none",background:"transparent",padding:0,width:"auto"},selectable:false});
    // Rated and suggested pages first; rows of at most seven, so a long footer wraps instead of stretching.
    shown.sort((a,b)=>(b.ghost?2:b.read?1:0)-(a.ghost?2:a.read?1:0));
    const cells=[...shown,...(hidden>0?[{more:hidden}]:[])];
    for(let k=0;k<cells.length;k+=7){let x=0,maxY=y+ROW*0.7;
      cells.slice(k,k+7).forEach((n)=>{
        if(n.more){nodes.push({id:"more-"+lvl,position:{x,y},data:{label:h("div",{className:"node unread"},"+"+n.more+" more routes, not read")},style:{border:"none",background:"transparent",padding:0,width:"auto"}});edges.push({id:"/>more-"+lvl,source:"/",target:"more-"+lvl,type:"smoothstep"});}
        else{maxY=Math.max(maxY,col(n,x,y));edges.push({id:"/>"+n.path,source:"/",target:n.path,type:"smoothstep",style:n.ghost?{strokeDasharray:"4 4"}:{}});}
        x+=W+GAP;});
      y=maxY+ROW*0.3;}
    y+=ROW*0.4;
  });
  const width=Math.max(...nodes.map((n)=>n.position.x))+W;put(home,width/2-115,0);
  return {nodes,edges};
}
function App(){const [g,sg]=React.useState({nodes:[],edges:[]});setG=sg;
  return h(Flow,{nodes:g.nodes,edges:g.edges,fitView:true,minZoom:.1,key:g.nodes.length+":"+(R?R.site:P?"plan":""),onNodeClick:(e,n)=>{if(n.data&&n.data.n)document.getElementById("side").innerHTML=n.data.n.planned?plannedPanel(n.data.n):routePanel(n.data.n);}},h(RF.Background,{gap:24,size:1}),h(RF.Controls,null));}
ReactDOM.createRoot(document.getElementById("flow")).render(h(App));
// The planned site (EE-064): the same tree, planned from the venture's records instead of read.
let P=null;
function planOverview(){
  const o=P.offerings.map((x)=>'<div class="it"><div class="t">'+esc(x.name)+' <span class="chip">'+esc(x.offering)+'</span></div><div class="why">Offered to '+esc(x.offered_to.join(", ")||"nobody yet")+(x.serves.length?', serving '+esc(x.serves.join(", ")):'')+' (from the '+esc(x.from)+')</div></div>').join("");
  return '<div class="t" style="font-weight:600;font-size:16px">Planned site for '+esc(P.name)+'</div><div class="meta">Planned from the venture\\'s records by '+esc(P.planned_by)+'. The product decides the audience.</div>'+
    '<h2>Offerings</h2>'+(o||'<div class="meta">No live or building products yet.</div>')+
    '<h2>Who the site is for</h2><div class="icp">'+(P.audience.offered_to.map((p)=>esc(p.who)).join("<br>")||'No accepted ICP yet: planned for customers in general.')+'<div class="meta">'+esc(P.audience.note)+'</div>'+P.audience.types.map((x)=>'<span class="chip">'+esc(x.label)+'</span>').join("")+'</div>'+
    (P.omitted.length?'<h2>Not now</h2>'+P.omitted.map((o)=>'<div class="why"><b>'+esc(o.label)+'</b>: '+esc(o.why)+(o.when?'; '+esc(o.when):'')+'</div>').join(""):'')+
    '<h2>Handoff</h2><div class="why">'+esc(P.handoff.note)+'</div><div class="meta" style="margin-top:6px">Click a page to see its sections, components and reasons. * shows only under a condition.</div>';
}
function plannedPanel(n){
  return '<a href="#" onclick="document.getElementById(\\'side\\').innerHTML=planOverview();return false">Back to the plan</a><h2>Planned page</h2><div class="t" style="font-weight:600">'+esc(n.label)+'</div><div class="meta">'+esc(n.path)+' · '+esc(n.type)+' page · '+esc(n.level)+'</div><h2>Sections, in order</h2>'+
    n.sections.map((x)=>'<div class="it"><div class="t">&lt;'+esc(x.component)+'&gt; '+esc(x.label)+'</div><div class="why">Need '+x.need+' for '+esc(x.for.map((a)=>LABEL[a]).join(", "))+(x.when?' · shown '+esc(x.when):'')+'</div>'+x.why.map((w)=>'<div class="why">'+esc(w)+'</div>').join("")+
      '<div class="why">Draws on '+esc(x.source.record)+(x.source.exists?'':' (not written yet)')+'; the public variant goes to <code>'+esc(x.variant)+'</code></div></div>').join("");
}
function showPlan(p){
  if(p.error){document.getElementById("side").innerHTML='<p>'+esc(p.error)+'</p>';return;}
  P=p;R=null;document.getElementById("side").innerHTML=planOverview();
  const nodes=p.pages.map((x)=>({path:x.path,parent:x.parent,label:x.label,type:x.type,level:x.level,read:true,rating:null,expected:[],found:[],missing:[],planned:true,sections:x.sections}));
  if(setG)setG(layout({sitemap:nodes,site:"plan"}));
}
document.getElementById("plan").onclick=async()=>{const q=new URLSearchParams();["raising","hiring","contributors"].forEach((k)=>{if(document.getElementById(k).checked)q.set(k,"1");});
  try{showPlan(await (await fetch("site/plan.json?"+q,{cache:"no-store"})).json());}catch(err){showPlan({error:"The plan failed: "+err.message});}};
function show(r){
  if(r.error){document.getElementById("side").innerHTML='<p>'+esc(r.error)+'</p>';return;}
  R=r;document.getElementById("side").innerHTML=overview();if(setG)setG(layout(r));
}
document.getElementById("f").onsubmit=async(e)=>{e.preventDefault();const b=document.getElementById("go");b.disabled=true;b.textContent="Reading...";
  const q=new URLSearchParams({url:document.getElementById("url").value});
  ["raising","hiring","contributors"].forEach((k)=>{if(document.getElementById(k).checked)q.set(k,"1");});
  try{show(await (await fetch("site/scan?"+q,{method:"POST"})).json());}catch(err){show({error:"The scan failed: "+err.message});}b.disabled=false;b.textContent="Read my site";};
fetch("site.json"+location.search).then((r)=>r.json()).then((r)=>{if(r&&r.site&&r.sitemap){document.getElementById("url").value=r.site;["raising","hiring","contributors"].forEach((k)=>{document.getElementById(k).checked=!!(r.facts||{})[k];});setTimeout(()=>show(r),50);}}).catch(()=>{});
</script></body></html>`.replace("__LABELS__", JSON.stringify(Object.fromEntries(Object.entries(MATRIX.audiences).map(([k, v]) => [k, v.label]))));

// The map's three libraries, pinned, fetched from unpkg once and kept on disk, so the canvas works
// offline after its first load. Only these paths are served.
const VENDOR = new Set(["react@18.3.1/umd/react.production.min.js", "react-dom@18.3.1/umd/react-dom.production.min.js", "reactflow@11.11.4/dist/umd/index.js", "reactflow@11.11.4/dist/style.css"]);
const cache = join(homedir(), ".cache", "naive-board");
async function vendor(path) {
  const f = join(cache, path.replace(/\//g, "__"));
  if (existsSync(f)) return readFileSync(f);
  const r = await fetch(`https://unpkg.com/${path}`);
  if (!r.ok) throw new Error(`unpkg answered ${r.status}`);
  const body = Buffer.from(await r.arrayBuffer());
  mkdirSync(cache, { recursive: true });
  writeFileSync(f, body);
  return body;
}

// The venture package (EE-067), with the pipeline that led to it: each step's state, from the dump on.
function packageOf(dir, writeIt = false) {
  const r = packages(dir);
  if (writeIt) writePackage(dir, r);
  const has = (f) => existsSync(ventureFile(dir, f));
  let rt = null; try { rt = route(dir); } catch {}
  const d = decisions(dir).decisions;
  const settled = d.filter((x) => ["decided", "accepted"].includes(x.status)).length;
  const open = r.core.filter((p) => p.in === "now");
  const recs = [...new Map(open.flatMap((p) => p.records.filter((x) => x.role !== "optional")).map((x) => [x.record, x])).values()];
  const written = has(join(PACKAGE, "venture-package.json")) ? open.filter((p) => has(join(PACKAGE, `${p.id}.md`))).map((p) => p.id) : null;
  const manifest = has(join(PACKAGE, "venture-package.json")) ? JSON.parse(readFileSync(join(dir, PACKAGE, "venture-package.json"), "utf8")) : null;
  const n = (f) => recs.filter(f).length;
  const routedTo = rt?.destinations ? new Set(rt.destinations.filter((x) => x.ideas.length && x.package).map((x) => x.package)) : new Set();
  // The founder's pipeline (EE-069): seven stages by what the founder does, not by the files they produce.
  const pipeline = [
    { label: "Capture", state: has("purpose/ideas/dump.md") ? "done" : "", detail: has("purpose/ideas/dump.md") ? "ideas kept verbatim" : "write the idea dump" },
    { label: "Understand", href: "/map", state: rt?.understood ? "done" : has(MAP) ? "part" : "", detail: rt?.understood ? "you confirmed the reading" : has(MAP) ? "check and correct the map" : "not yet" },
    { label: "Route", href: "/kanban", state: rt?.destinations ? "done" : "", detail: rt?.destinations ? `ideas reach ${routedTo.size} packages` : "after Understand" },
    { label: "Decide", href: "/", state: settled ? "part" : "", detail: `${settled} settled, ${d.filter((x) => x.rank != null).length} waiting for you` },
    { label: "Write", state: recs.length && !n((x) => x.status === "missing") ? "done" : n((x) => x.status !== "missing") ? "part" : "", detail: `${n((x) => x.status !== "missing")} of ${recs.length} records written` },
    { label: "Confirm", state: recs.length && n((x) => x.status === "confirmed") === recs.length ? "done" : n((x) => x.status === "confirmed") ? "part" : "", detail: `${n((x) => x.status === "confirmed")} of ${recs.length} confirmed` },
    { label: "Package", state: open.length && r.complete.length >= open.length ? "done" : r.complete.length ? "part" : "", detail: `${r.complete.length} of ${open.length} open packages complete` },
  ];
  return { ...r, versions: writeIt ? r.versions : manifest?.versions ?? [], pipeline, written };
}

export function serve(p = port, id = venture) {
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname.startsWith("/vendor/") && VENDOR.has(u.pathname.slice(8))) {
      try { const b = await vendor(u.pathname.slice(8)); res.writeHead(200, { "content-type": u.pathname.endsWith(".css") ? "text/css" : "text/javascript", "cache-control": "max-age=86400" }); res.end(b); }
      catch (e) { res.writeHead(502); res.end(String(e.message)); }
      return;
    }
    if (u.pathname === "/state.json") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(state(u.searchParams.get("venture") ?? id))); return; }
    if (u.pathname === "/ideas.json") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(ideas(u.searchParams.get("venture") ?? id))); return; }
    if (u.pathname === "/graph.json") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(graph(u.searchParams.get("venture") ?? id))); return; }
    if (u.pathname === "/routes.json") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(routesOf(u.searchParams.get("venture") ?? id))); return; }
    if (u.pathname === "/site") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(SITE_PAGE); return; }
    if (u.pathname === "/site.json") {
      const dir = ventureDir(u.searchParams.get("venture") ?? id), f = dir && join(ventureFile(dir, "operations/marketing/site-presence.json"));
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(f && existsSync(f) ? readFileSync(f) : "{}"); return;
    }
    if (u.pathname === "/site/plan.json") {
      const dir = ventureDir(u.searchParams.get("venture") ?? id);
      let body;
      try { body = dir ? plan(dir, { flags: Object.fromEntries(["raising", "hiring", "contributors"].map((k) => [k, u.searchParams.get(k) === "1"])) }) : { error: `no venture ${id}` }; } catch (e) { body = { error: e.message }; }
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); return;
    }
    if (u.pathname === "/site/scan" && req.method === "POST") {
      const dir = ventureDir(u.searchParams.get("venture") ?? id);
      const flags = Object.fromEntries(["raising", "hiring", "contributors"].map((k) => [k, u.searchParams.get(k) === "1"]));
      let body;
      try { body = await scan(u.searchParams.get("url") ?? "", { venture: dir, flags }); } catch (e) { body = { error: e.message }; }
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); return;
    }
    if (u.pathname === "/package.json" || (u.pathname === "/package/write" && req.method === "POST")) {
      const dir = ventureDir(u.searchParams.get("venture") ?? id);
      let body;
      try { body = dir ? packageOf(dir, u.pathname === "/package/write") : { error: `no venture ${id}` }; } catch (e) { body = { error: e.message }; }
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); return;
    }
    if (/^\/package\/[a-z-]+\.md$/.test(u.pathname)) {
      const dir = ventureDir(u.searchParams.get("venture") ?? id), f = dir && join(dir, PACKAGE, u.pathname.slice("/package/".length));
      if (f && existsSync(f)) { res.writeHead(200, { "content-type": "text/markdown; charset=utf-8" }); res.end(readFileSync(f)); } else { res.writeHead(404); res.end(); }
      return;
    }
    if (u.pathname === "/package") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PACKAGE_PAGE); return; }
    if (u.pathname === "/kanban") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(KANBAN_PAGE); return; }
    if (u.pathname === "/graph") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(GRAPH_PAGE); return; }
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
