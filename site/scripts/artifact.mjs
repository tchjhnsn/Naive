// Writes the marketing site as one HTML artifact, artifact/index.html, from generated/venture-facts.json
// (run `npm run data` first). Published with Claude's Artifact tool, so a founder can publish before buying a domain.
// Every agent-written section is marked Draft on the page.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { style } from "./artifact-style.mjs";

// NAIVE_PUBLISH_OUT moves both the facts it reads and the page it writes (default site/), for naive publish build.
const site = process.env.NAIVE_PUBLISH_OUT ? resolve(process.env.NAIVE_PUBLISH_OUT) : new URL("../", import.meta.url).pathname;
const facts = JSON.parse(readFileSync(join(site, "generated/venture-facts.json"), "utf8"));
const out = join(site, "artifact");
mkdirSync(out, { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fact = (name) => (typeof facts[name]?.value === "string" ? `${esc(facts[name].value)}` : "");
const term = (name) => (facts.terms?.value?.[name] ? `${esc(facts.terms.value[name])}` : "");
const agent = '<span class="draft" title="Agent-written, needs Torian">Draft</span>';

const pages = [
  { file: "index.html", nav: "Naive", title: "Naive" },
  { file: "why.html", nav: "Why", title: "The problem" },
  { file: "for.html", nav: "Who it is for", title: "Who it is for" },
  { file: "how.html", nav: "How it works", title: "How it works" },
  { file: "about.html", nav: "About", title: "About" },
];



const lifecycle = `<ol class="phases">${(facts.phases?.value ?? []).map((p, i) => `<li><span class="n">${i + 1}</span><b>${esc(p.name)}</b>${esc(p.question)}<small>Gate: ${esc(p.gate)}</small></li>`).join("")}</ol>`;

const bodies = {
  "index.html": `<p class="lede">The AI-native venture development framework.</p>
<p>Run by agents and decided by people, Naive shows solo founders and small teams which phase their venture is in and what it needs next. ${agent}</p>
<h2>You have an idea. Now what? ${agent}</h2>
<p>Starting is easy now. Choosing what to do next is where ideas stall. Naive puts today's most important decision in front of you, holds back what can wait, and keeps a record of why you chose.</p>
<h2>The problem</h2><p>${fact("problem")}</p>
<h2>Who it is for</h2><p>${fact("segment")}</p>
<h2>The venture development lifecycle ${agent}</h2>
<p>Every venture is in one of five phases. Naive shows which phase you are in and what you need to reach the next one, and holds back what can wait.</p>
${lifecycle}
<h2>Publish before you buy a domain ${agent}</h2>
<p>This site is a Claude artifact, built by Naive from the venture's records and published from Claude. A founder can put an idea in front of people the day they write it down, without buying a domain or setting up hosting.</p>
<div class="cta"><a href="how.html">See how it works</a><a href="why.html">Read the problem</a></div>`,
  "why.html": `<p>${fact("problem")}</p>
<h2>The forms it takes</h2>
<ul>${(facts.forms?.value ?? []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
<div class="cta"><a href="for.html">See who it is for</a></div>`,
  "for.html": `<p>${fact("segment")}</p>
<div class="cta"><a href="how.html">See how it works</a></div>`,
  "how.html": `<p>This page explains how Naive divides work between you and your agents, so you can see what you decide and what agents do for you. ${agent}</p>
<h2>People decide by default</h2><p>${term("people decide by default")}</p>
<div class="table"><table><tr><th>Next.js</th><th>Naive</th></tr>
<tr><td>Server Components by default</td><td>People decide by default</td></tr>
<tr><td>Client Components, added where you need interactivity</td><td>Agents, added where you need work done</td></tr>
<tr><td>Server-only code never reaches the client</td><td>Private records and person-only actions never reach an agent</td></tr>
<tr><td>Server Actions called from the client</td><td>Proposals and drafts an agent sends up for a person to accept</td></tr></table></div>
<h2>The venture keeps moving while you decide ${agent}</h2>
<p>The docket ranks the decisions that need you, inside each function and across functions.</p>
<div class="table"><table><tr><th>Next.js</th><th>Naive</th><th>What it means</th></tr>
<tr><td>Prefetching</td><td>Precog</td><td>${term("precog")}</td></tr>
<tr><td>Streaming</td><td>Streaming</td><td>${term("streaming")}</td></tr>
<tr><td>Client-side transitions</td><td>Handoffs</td><td>${term("handoff")}</td></tr></table></div>
<p>Precog drafting on its own, decisions that fill in as evidence arrives, and handoffs between phases are not built yet.</p>
<h2>A venture is folders of records</h2>
<p>${term("record")} Each venture function, such as marketing or finance, is declared once in <code>venture.json</code>. ${term("venture function")}</p>
<h2>Naive and Mentura ${agent}</h2>
<p>Naive is the open framework: conventions, schemas and checks that work offline. Mentura is the platform built on it, with the agents, automations and connections that do the work.</p>`,
  "about.html": `<p class="lede">If you have an idea, you are a founder. ${agent}</p>
<h2>Our mission ${agent}</h2>
<p>Naive helps solo founders and small teams navigate the venture development lifecycle.</p>`,
};

// A one-pager: the landing page with every other page folded in as a section, and the menu jumps to each.
// The viewer keeps a bare #token, so the artifact link plus #how opens at that section.
const noCta = (html) => html.replace(/<div class="cta">[\s\S]*?<\/div>/g, "");
const [hero, ...landing] = noCta(bodies["index.html"]).split("<h2>The problem</h2>");
const problem = landing.join("").split("<h2>Who it is for</h2>");
const forms = noCta(bodies["why.html"]).split("<h2>The forms it takes</h2>")[1];
const how = noCta(bodies["how.html"]).replace(/<h2>/g, "<h3>").replace(/<\/h2>/g, "</h3>");
const single = `<title>Naive</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${style}
h3{font-size:1.1rem;margin:2rem 0 .4rem}section{scroll-margin-top:1rem}</style>
<div class="wrap">
<nav><a href="#top">Naive</a><a href="#problem">Problem</a><a href="#for">Who it is for</a><a href="#lifecycle">Lifecycle</a><a href="#how">How it works</a><a href="#about">About</a></nav>
<section id="top"><h1>Naive</h1>${hero}</section>
<section id="problem"><h2>The problem</h2>${problem[0]}<h3>The forms it takes</h3>${forms}</section>
<section id="for"><h2>Who it is for</h2>${problem[1].split("<h2>The venture development lifecycle")[0]}</section>
<section id="lifecycle"><h2>The venture development lifecycle${problem[1].split("<h2>The venture development lifecycle")[1]}</section>
<section id="how"><h2>How it works</h2>${how}</section>
<section id="about"><h2>About</h2>${noCta(bodies["about.html"]).replace(/<h2>/g, "<h3>").replace(/<\/h2>/g, "</h3>")}</section>
<footer>Every fact on this page is read from the ${esc(facts.venture)} venture's records by Naive. Draft marks wording the founder has not confirmed.</footer>
</div>
`;
writeFileSync(join(out, "index.html"), single);
console.log(`one-pager written to ${join(out, "index.html")}`);
